import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Screenshot-Durchläufe (Profile und Outfit-Scan-Bilder):
//  - Bleibt ein Outfit knieend zurück, sahen die nächsten Bilder ebenfalls so aus → vor jedem Bild lokal auf
//    "stehend", am Ende des Durchlaufs die Pose von vorher zurück.
//  - BC setzt nach 5 Minuten ohne Eingabe im BC-Tab das AFK-Symbol (AfkTimerSetIsAfk); beim Durchlauf arbeitet man
//    im Tool → AfkTimerReset() vor jedem Bild.
//  - Items lösen beim Anlegen Gesichtsausdrücke aus (InventoryExpressionTriggerApply → ChatRoomCharacterExpressionUpdate
//    an den Raum) → für die Dauer des Anlegens abgeschaltet; Emoticons fliegen aus dem Bild.

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function tool() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, execs };
}

const bausteine = () => {
  const { ctx } = tool();
  return {
    vorbereiten: evalIn(ctx, '_SHOT_VORBEREITEN'),
    zurueck: evalIn(ctx, '_SHOT_POSE_ZURUECK'),
    afk: evalIn(ctx, '_SHOT_AFK'),
    umhuellen: (teil) => { ctx.__t = teil; return evalIn(ctx, '_shotApplyUmhuellen(__t)'); },
    ctx,
  };
};

// Nachgebautes BC (nur was die Bausteine anfassen)
function bc(extra = {}) {
  const z = { afk: 0, poseAufrufe: [], refresh: [] };
  const window = {};
  const Player = {
    ActivePoseMapping: { BodyFull: 'Kneel' },
    Appearance: [],
  };
  const g = {
    window, Player, JSON, Array,
    AfkTimerReset() { z.afk++; },
    PoseSetActive(C, name, force, dialog) {
      z.poseAufrufe.push([name, force, dialog]);
      C.ActivePoseMapping = { BodyLower: 'BaseLower', BodyUpper: 'BaseUpper' };
    },
    CharacterRefresh(C, push, dialog) { z.refresh.push([push, dialog]); },
    ...extra,
  };
  g.window = g; // window === globale Umgebung wie im Browser
  const ctx = vm.createContext(g);
  return { z, Player, g, lauf: (code) => vm.runInContext(code, ctx) };
}

describe('Vor jedem Bild: AFK-Uhr zurück, Pose auf stehend', () => {
  it('AfkTimerReset wird aufgerufen, die Pose geht lokal auf stehend, die Ausgangspose wird gemerkt', () => {
    const { vorbereiten } = bausteine();
    const s = bc();
    s.lauf(vorbereiten);
    expect(s.z.afk).toBe(1);
    expect(s.z.poseAufrufe).toEqual([[null, false, false]]);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyLower: 'BaseLower', BodyUpper: 'BaseUpper' });
    expect(s.g.__BCU_poseOrig.m).toEqual({ BodyFull: 'Kneel' });
  });

  it('beim zweiten Bild wird die Ausgangspose NICHT durch "stehend" überschrieben', () => {
    const { vorbereiten, zurueck } = bausteine();
    const s = bc();
    s.lauf(vorbereiten);
    s.lauf(vorbereiten);
    s.lauf(vorbereiten);
    expect(s.g.__BCU_poseOrig.m).toEqual({ BodyFull: 'Kneel' });
    s.lauf(zurueck);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyFull: 'Kneel' });
  });

  it('kein Absturz, wenn BC die Funktionen nicht kennt (alte Version / Tab nicht bereit)', () => {
    const { vorbereiten } = bausteine();
    const s = bc();
    delete s.g.AfkTimerReset; delete s.g.PoseSetActive;
    s.Player.ActivePoseMapping = undefined;
    expect(() => s.lauf(vorbereiten)).not.toThrow();
  });

  it('alte BC-Version mit ActivePose-Liste: leeren und später wiederherstellen', () => {
    const { vorbereiten, zurueck } = bausteine();
    const s = bc();
    delete s.g.PoseSetActive;
    s.Player.ActivePoseMapping = undefined;
    s.Player.ActivePose = ['Kneel'];
    s.lauf(vorbereiten);
    expect(s.Player.ActivePose).toEqual([]);
    s.lauf(zurueck);
    expect(s.Player.ActivePose).toEqual(['Kneel']);
  });

  it('nur AFK-Reset (Aufnahme ohne Outfit): die Pose bleibt unberührt', () => {
    const { afk } = bausteine();
    const s = bc();
    s.lauf('(function(){' + afk + '})();');
    expect(s.z.afk).toBe(1);
    expect(s.z.poseAufrufe).toEqual([]);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyFull: 'Kneel' });
  });
});

describe('Ende des Durchlaufs: Pose von vorher zurück', () => {
  it('stellt die Ausgangspose wieder her, lokal ohne Server, und räumt die Merkstelle weg', () => {
    const { vorbereiten, zurueck } = bausteine();
    const s = bc();
    s.lauf(vorbereiten);
    s.z.refresh.length = 0;
    s.lauf(zurueck);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyFull: 'Kneel' });
    expect(s.g.__BCU_poseOrig).toBeNull();
    expect(s.z.refresh).toEqual([[false, false]]); // CharacterRefresh(Player, false, false): kein Push
  });

  it('ohne gemerkte Pose (Durchlauf kam nie zum Zug) passiert nichts', () => {
    const { zurueck } = bausteine();
    const s = bc();
    s.lauf(zurueck);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyFull: 'Kneel' });
    expect(s.z.refresh).toEqual([]);
  });

  it('zweimal hintereinander ist harmlos', () => {
    const { vorbereiten, zurueck } = bausteine();
    const s = bc();
    s.lauf(vorbereiten);
    s.lauf(zurueck);
    s.Player.ActivePoseMapping = { BodyFull: 'Hogtied' };
    s.lauf(zurueck);
    expect(s.Player.ActivePoseMapping).toEqual({ BodyFull: 'Hogtied' });
  });
});

describe('Beim Anlegen: keine Gesichtsausdrücke, keine Emoticons im Bild', () => {
  const item = (grp) => ({ Asset: { Name: 'X' + grp, Group: { Name: grp } } });

  it('InventoryExpressionTriggerApply läuft während des Anlegens ins Leere und ist danach wieder das Original', () => {
    const { umhuellen } = bausteine();
    const aufrufe = [];
    const original = (...a) => aufrufe.push(a);
    const s = bc({ InventoryExpressionTriggerApply: original });
    s.lauf(umhuellen('InventoryExpressionTriggerApply(Player,[{Group:"Eyes"}]);'));
    expect(aufrufe).toEqual([]);                                  // während des Anlegens abgeschaltet
    expect(s.g.InventoryExpressionTriggerApply).toBe(original);   // danach exakt das Original (Mod-Wrapper bleiben)
  });

  it('Original kommt auch zurück, wenn das Anlegen wirft oder per return endet', () => {
    const { umhuellen } = bausteine();
    const original = () => 'orig';
    const s = bc({ InventoryExpressionTriggerApply: original });
    expect(() => s.lauf('(function(){' + umhuellen('throw new Error("boom");') + '})();')).toThrow('boom');
    expect(s.g.InventoryExpressionTriggerApply).toBe(original);
    s.lauf('(function(){' + umhuellen('return;') + '})();');
    expect(s.g.InventoryExpressionTriggerApply).toBe(original);
  });

  it('existiert die Funktion nicht, wird auch nichts angelegt', () => {
    const { umhuellen } = bausteine();
    const s = bc();
    s.lauf(umhuellen('var x = 1;'));
    expect('InventoryExpressionTriggerApply' in s.g).toBe(false);
  });

  it('Emoticon (AFK, Schlafen …) wird aus dem Bild entfernt, alles andere bleibt', () => {
    const { umhuellen } = bausteine();
    const s = bc();
    s.Player.Appearance = [item('Cloth'), item('Emoticon'), item('Eyes'), item('ItemArms')];
    s.lauf(umhuellen('var y = 2;'));
    expect(s.Player.Appearance.map((i) => i.Asset.Group.Name)).toEqual(['Cloth', 'Eyes', 'ItemArms']);
  });

  it('ein vom Outfit mitgebrachtes Emoticon wird nach dem Anlegen ebenfalls entfernt', () => {
    const { umhuellen } = bausteine();
    const s = bc();
    s.Player.Appearance = [item('Cloth')];
    s.lauf(umhuellen('Player.Appearance.push({Asset:{Name:"Afk",Group:{Name:"Emoticon"}}});'));
    expect(s.Player.Appearance.map((i) => i.Asset.Group.Name)).toEqual(['Cloth']);
  });
});

describe('Die Aufnahme-Pfade bauen die Bausteine in der richtigen Reihenfolge ein', () => {
  it('Profil mit Outfit: Vorbereiten → Ausgangslage sichern → Anlegen (umhüllt); gültiges JavaScript', () => {
    const { ctx, execs } = tool();
    evalIn(ctx, "PROFILES['A - B'] = { items: [] }");
    ctx.captureProfileViaCanvas('A - B', null, 'var raw = 1;');
    const code = execs()[0];
    expect(() => new Function(code)).not.toThrow();
    const iPrep = code.indexOf('AfkTimerReset');
    const iPose = code.indexOf('PoseSetActive');
    const iOrig = code.indexOf('var origApp=');
    const iHuelle = code.indexOf('window.InventoryExpressionTriggerApply=function(){}');
    const iRaw = code.indexOf('var raw = 1;');
    expect(iPrep).toBeGreaterThan(-1);
    expect(iPrep).toBeLessThan(iOrig);
    expect(iPose).toBeLessThan(iOrig);
    expect(iOrig).toBeLessThan(iHuelle);
    expect(iHuelle).toBeLessThan(iRaw);
    expect(code).toContain('if(!window.__BCU_slideshowOrig){');           // Einzelaufnahme stellt die Pose selbst zurück
  });

  it('Profil ohne Outfit (nur das aktuelle Aussehen): AFK-Reset ja, Pose bleibt', () => {
    const { ctx, execs } = tool();
    ctx.captureProfileViaCanvas('A - B', null, null);
    const code = execs()[0];
    expect(code).toContain('AfkTimerReset');
    expect(code).not.toContain('PoseSetActive');
  });

  it('Outfit-Scan-Bild mit Code: Vorbereiten → Ausgangslage → Anlegen; ohne Code nur AFK-Reset', () => {
    const { ctx, execs } = tool();
    ctx.__code = 'BUNDLE';
    evalIn(ctx, "LSCG_DB['1001'] = { name: 'Alice', versions: [{ code: __code, fingerprint: 'fpA' }, { fingerprint: 'fpB' }] }");
    ctx.captureOsScreenshot('1001', 0);
    ctx.captureOsScreenshot('1001', 1);
    const [mit, ohne] = execs();
    expect(mit.indexOf('PoseSetActive')).toBeGreaterThan(-1);
    expect(mit.indexOf('PoseSetActive')).toBeLessThan(mit.indexOf('var origApp='));
    expect(mit.indexOf('var origApp=')).toBeLessThan(mit.indexOf('window.InventoryExpressionTriggerApply=function(){}'));
    expect(() => new Function(mit)).not.toThrow();
    expect(ohne).toContain('AfkTimerReset');
    expect(ohne).not.toContain('PoseSetActive');
  });

  it('Auto-Screenshot: Start räumt AFK vor dem Sichern weg, Stop stellt die Pose zurück', () => {
    const { ctx, execs } = tool();
    evalIn(ctx, "PROFILES['A - B'] = { items: [], _outfitCode: 'X' }; _slideshowRunning = true; _slideshowQueue = []; _slideshowTotal = 1;");
    ctx._stopProfileSlideshow();
    const stop = execs().find((c) => c.includes('__BCU_slideshowOrig=null'));
    expect(stop).toBeTruthy();
    expect(stop.indexOf('__BCU_poseOrig')).toBeGreaterThan(-1);
    expect(stop.indexOf('__BCU_poseOrig')).toBeLessThan(stop.indexOf('ServerPlayerAppearanceSync'));
    expect(() => new Function(stop)).not.toThrow();
  });

  it('Auto-Screenshot-Start: AFK-Reset steht vor dem Sichern der Ausgangslage', () => {
    const { ctx, execs } = tool();
    evalIn(ctx, "PROFILES['A - B'] = { items: [], _outfitCode: 'X' }");
    ctx._startProfileSlideshow();
    const start = execs().find((c) => c.includes('window.__BCU_slideshowOrig=Player.Appearance.slice()'));
    expect(start).toBeTruthy();
    expect(start.indexOf('AfkTimerReset')).toBeGreaterThan(-1);
    expect(start.indexOf('AfkTimerReset')).toBeLessThan(start.indexOf('__BCU_slideshowOrig='));
  });
});
