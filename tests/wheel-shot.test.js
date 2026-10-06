import vm from 'node:vm';
import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// MBS-Wheel-Bilder (Serie "Alle erstellen" und Einzelaufnahme): wie die Profil-Screenshots.
//  - ein EXEC pro Outfit, keine festen Wartezeiten (die Antwort löst das nächste Outfit aus)
//  - stehend, AFK-Uhr zurück, keine Schlösser, keine Gesichtsausdrücke durch das Anlegen
//  - nie etwas zum Server, solange das Test-Outfit hängt (Sync-Sperre); danach ist dein Aussehen wieder da

const LZString = createRequire(import.meta.url)('lz-string');
const APP = 'BCKonfigurator';
const BC = 'https://bc.test';
const MN = 5;

function tool({ withTimers = false } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const timers = [];
  const ctx = loadScript(['items.js'], {
    opener,
    confirm: () => true,
    setTimeout: withTimers ? (fn, ms) => { timers.push({ fn, ms }); return timers.length; } : () => 0,
    clearTimeout: () => {},
    Image: class { set src(v) { this._s = v; } },
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, els, execs, timers };
}

const OUTFIT = { name: 'Wheel 1', items: [{ group: 'ItemArms', asset: 'Armbinder', colors: 'Default', property: { LockedBy: 'MetalPadlock', LockMemberNumber: 9, Effect: ['Lock'] } }] };
const setzeWheel = (ctx, outfits = [OUTFIT]) => {
  ctx.__o = outfits;
  evalIn(ctx, `_mbsWheelData = [{ memberNumber: ${MN}, name: 'Mia', outfits: __o }]; _connected = true;`);
};

// ── Nachgebautes BC ──────────────────────────────────────────────────────────
function leinwand(get) {
  return {
    width: 8, height: 16,
    getContext: () => ({
      drawImage() {}, fillRect() {}, fillStyle: '',
      getImageData: (x, y, w, h) => { const d = new Uint8ClampedArray(w * h * 4); d.fill(get() * 10 + 1); return { data: d }; },
    }),
    toDataURL: () => 'data:image/jpeg;base64,AAAA',
  };
}

function bc({ serverSend = true, standard = null } = {}) {
  const z = { gesendet: [], antworten: [], afk: 0, pose: [], ausdruck: 0, gesperrt: 0, bilder: [], sync: 0 };
  const timers = [];
  let version = 0;
  const namen = (C) => C.Appearance.map((i) => i.Asset.Name);
  const item = (grp, name) => ({ Asset: { Name: name, Group: { Name: grp } }, Property: {} });
  const Player = {
    OnlineID: 7, MemberNumber: 100, AssetFamily: 'Female3DCG',
    ActivePose: ['Kneel'],
    Appearance: [item('Cloth', 'ORIG'), item('Emoticon', 'Afk')],
  };
  const g = {
    Player, JSON, Array, Object, Math, Date, Error, Set, LZString, Uint8ClampedArray, performance: { now: () => 1 },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    CharacterRefresh() { version++; },
    AfkTimerReset() { z.afk++; },
    PoseSetActive(C) { z.pose.push('stehend'); C.ActivePose = []; },
    AssetGet: (fam, grp, name) => ({ Name: name, Group: { Name: grp } }),
    InventoryWear(C, name, grp) {
      if (typeof g.InventoryExpressionTriggerApply === 'function') g.InventoryExpressionTriggerApply();
      const it = item(grp, name);
      C.Appearance = C.Appearance.filter((a) => a.Asset.Group.Name !== grp).concat([it]);
      return it;
    },
    InventoryLock() { z.gesperrt++; },
    InventoryExpressionTriggerApply() { z.ausdruck++; },
    ServerPlayerAppearanceSync() { z.sync++; g.ServerSend('AccountUpdate', { AssetFamily: 'Female3DCG', Appearance: namen(Player) }); },
    ChatRoomCharacterUpdate(C) { g.ServerSend('ChatRoomCharacterUpdate', { ID: C.OnlineID, Appearance: namen(C) }); },
    ServerPlayerIsInChatRoom: () => true,
    document: { createElement: () => leinwand(() => version) },
  };
  Player.Canvas = leinwand(() => version);
  if (serverSend) {
    g.ServerSend = function (typ, daten) {
      z.gesendet.push({ typ, daten: daten === undefined ? undefined : JSON.parse(JSON.stringify(daten)), aussehen: namen(Player) });
    };
  }
  // Was beim Fotografieren an dir hängt, wird beim Auslesen des Bildes festgehalten
  const alt = Player.Canvas.toDataURL;
  Player.Canvas.toDataURL = alt;
  g.document.createElement = () => {
    const c = leinwand(() => version);
    c.toDataURL = () => {
      z.bilder.push({ aussehen: namen(Player), pose: Player.ActivePose.slice(), eigenschaften: Object.fromEntries(Player.Appearance.map((i) => [i.Asset.Name, { ...i.Property }])) });
      return 'data:image/jpeg;base64,AAAA';
    };
    return c;
  };
  g.__BCK_popupRef = { postMessage: (m, origin) => z.antworten.push({ m, origin }) };
  g.window = g;
  const ctx = vm.createContext(g);
  return {
    z, Player, g, standard,
    lauf: (code) => vm.runInContext(code, ctx),
    zeit: (zwischendurch) => { if (zwischendurch) zwischendurch(); let n = 0; while (timers.length && n++ < 100) timers.shift()(); },
  };
}

function aufnahme({ serie = true, beiJoin = false, outfits, standard = null, vorher } = {}) {
  const t = tool();
  setzeWheel(t.ctx, outfits);
  if (standard) evalIn(t.ctx, `CURSE_DEFAULT_OUTFIT_CODE = ${JSON.stringify(standard)}`);
  t.ctx.__serie = serie;
  const code = evalIn(t.ctx, `_wheelShotCode('wss_1', _mbsWheelData[0].outfits[0].items, __serie)`);
  const env = bc();
  if (vorher) vorher(env);
  env.lauf(code);
  env.zeit(() => {
    if (beiJoin) {   // Raum-Beitritt mitten im Test-Outfit: BC und ein Mod senden dein Aussehen
      env.g.ServerPlayerAppearanceSync();
      env.g.ChatRoomCharacterUpdate(env.Player);
    }
  });
  return { ...t, env, code };
}

const STANDARD = LZString.compressToBase64(JSON.stringify([{ Group: 'Cloth', Name: 'BASIS', Color: 'Default' }]));
const namenVon = (env) => env.Player.Appearance.map((i) => i.Asset.Name);

describe('Wheel-Bild: der gesendete Code', () => {
  it('ist gültiges JavaScript, antwortet nur an den Tool-Origin und nie an "*"', () => {
    const { code, env } = aufnahme();
    expect(() => new Function(code)).not.toThrow();
    expect(code).not.toMatch(/,\s*['"]\*['"]\)/);
    expect(env.z.antworten.length).toBe(1);
    expect(env.z.antworten[0].origin).toBe('https://tool.test');
    expect(env.z.antworten[0].m).toMatchObject({ app: APP, type: 'SCREENSHOT_DATA', reqId: 'wss_1' });
    expect(env.z.antworten[0].m.data).toMatch(/^data:image\/jpeg/);
  });

  it('beim Aufnehmen: stehend, AFK-Uhr zurück, Standard-Outfit als Basis UND das Wheel-Outfit, ohne Schloss', () => {
    const { env } = aufnahme({ standard: STANDARD });
    expect(env.z.bilder.length).toBe(1);
    const bild = env.z.bilder[0];
    expect(bild.pose).toEqual([]);                                   // vorher kniete der Charakter
    expect(env.z.afk).toBeGreaterThan(0);
    expect(bild.aussehen).toContain('BASIS');
    expect(bild.aussehen).toContain('Armbinder');
    expect(bild.eigenschaften.Armbinder.LockedBy).toBeUndefined();   // das Schloss des Outfits wurde weggelassen
    expect(env.z.gesperrt).toBe(0);                                  // und es wurde kein Schloss angelegt
  });

  it('ohne Standard-Outfit: nur das Wheel-Outfit', () => {
    const { env } = aufnahme();
    expect(env.z.bilder[0].aussehen).toContain('Armbinder');
    expect(env.z.bilder[0].aussehen).not.toContain('BASIS');
  });

  it('die Gesichtsausdrücke, die Items beim Anlegen auslösen, werden unterdrückt – danach geht es wieder', () => {
    const { env } = aufnahme();
    expect(env.z.ausdruck).toBe(0);
    env.g.InventoryExpressionTriggerApply();
    expect(env.z.ausdruck).toBe(1);   // die echte Funktion ist zurück
  });

  it('ein Emoticon (z. B. AFK) kommt nicht ins Bild', () => {
    const { env } = aufnahme();
    expect(env.z.bilder[0].aussehen).not.toContain('Afk');
  });
});

describe('Wheel-Bild: danach ist alles wieder da', () => {
  it('Serie: dein Aussehen ist zurück, die Pose bleibt stehend bis zum Ende der Serie', () => {
    const { env } = aufnahme({ serie: true });
    expect(namenVon(env)).toEqual(['ORIG', 'Afk']);
    expect(env.Player.ActivePose).toEqual([]);
  });

  it('Einzelaufnahme: Aussehen UND Pose (kniend) sind zurück', () => {
    const { env } = aufnahme({ serie: false });
    expect(namenVon(env)).toEqual(['ORIG', 'Afk']);
    expect(env.Player.ActivePose).toEqual(['Kneel']);
  });

  it('Serie: die Ausgangslage kommt aus __BCU_wheelOrig, nicht aus dem, was gerade an dir hängt', () => {
    const { env } = aufnahme({
      serie: true,
      vorher: (e) => {
        const ausgang = e.Player.Appearance.slice();
        e.Player.Appearance = [{ Asset: { Name: 'RESTMUELL', Group: { Name: 'Cloth' } }, Property: {} }];
        e.g.__BCU_wheelOrig = ausgang;
      },
    });
    expect(namenVon(env)).toEqual(['ORIG', 'Afk']);
  });

  it('Einzelaufnahme ignoriert eine alte __BCU_wheelOrig (die könnte von einer abgebrochenen Serie stammen)', () => {
    const { env } = aufnahme({
      serie: false,
      vorher: (e) => { e.g.__BCU_wheelOrig = [{ Asset: { Name: 'ALT', Group: { Name: 'Cloth' } }, Property: {} }]; },
    });
    expect(namenVon(env)).toEqual(['ORIG', 'Afk']);
  });
});

describe('Wheel-Bild: Sync-Sperre', () => {
  const mitAussehen = (m) => m.typ === 'ChatRoomCharacterUpdate' || (m.typ === 'AccountUpdate' && m.daten && 'Appearance' in m.daten);
  const traegtTest = (m) => m.aussehen.includes('Armbinder') || JSON.stringify(m.daten ?? '').includes('Armbinder');

  it('Raum-Beitritt mitten im Test-Outfit: nichts mit dem Test-Outfit geht zum Server', () => {
    const { env } = aufnahme({ beiJoin: true });
    // Beim Beitritt hängt das Outfit an dir (Hilfsfunktion zeit(): Join passiert im ersten Timer-Durchlauf)
    expect(env.z.gesendet.filter(mitAussehen).some(traegtTest)).toBe(false);
  });

  it('danach geht EIN frischer Sync mit deinem echten Aussehen raus', () => {
    const { env } = aufnahme({ beiJoin: true });
    const aussehen = env.z.gesendet.filter(mitAussehen);
    expect(aussehen.filter((m) => m.typ === 'AccountUpdate').length).toBe(1);
    expect(aussehen.filter((m) => m.typ === 'ChatRoomCharacterUpdate').length).toBe(1);
    for (const m of aussehen) expect(m.aussehen).toEqual(['ORIG', 'Afk']);
    expect(env.g.__BCU_sperreBis).toBe(0);
  });

  it('ohne Beitritt: kein überflüssiger Sync', () => {
    const { env } = aufnahme({ beiJoin: false });
    expect(env.z.sync).toBe(0);
    expect(env.z.gesendet).toEqual([]);
  });

  it('Anlegen scheitert (kaputtes Standard-Outfit): Aussehen zurück, Sperre gelöst, APPLY_FAIL ans Tool – kein Bild', () => {
    const { env } = aufnahme({ standard: LZString.compressToBase64('{kaputt') });
    expect(env.z.bilder.length).toBe(0);
    expect(env.z.antworten.length).toBe(1);
    expect(env.z.antworten[0].m.err).toMatch(/^APPLY_FAIL/);
    expect(namenVon(env)).toEqual(['ORIG', 'Afk']);
    expect(env.g.__BCU_sperreBis).toBe(0);
  });
});

describe('Serie: ein EXEC pro Outfit, die Antwort löst das nächste aus', () => {
  function serieLaeuft(ctx, outfits = [OUTFIT, { name: 'Wheel 2', items: [{ group: 'Cloth', asset: 'Kleid', colors: 'Default' }] }]) {
    setzeWheel(ctx, outfits);
    evalIn(ctx, `_wheelGenRunning = true; _wheelGenTotal = 2; _wheelGenQueue = [{ mn: ${MN}, oi: 0 }, { mn: ${MN}, oi: 1 }]; _dcJobStart('wheelGen');`);
  }

  it('ein Schritt sendet genau EIN EXEC (Basis + Outfit + Foto) und wartet auf die Antwort', () => {
    const { ctx, execs, timers } = tool({ withTimers: true });
    serieLaeuft(ctx);
    timers.length = 0;   // Timer aus dem Laden von items.js zählen nicht
    ctx._wheelGenStep();
    expect(execs().length).toBe(1);
    expect(execs()[0]).toContain('Armbinder');
    expect(evalIn(ctx, '_wheelGenShotReq')).toMatch(/^wss_/);
    expect(evalIn(ctx, 'Object.keys(_pendingWheelShot).length')).toBe(1);
    // keine festen Wartezeiten mehr (früher 800 / 2500 / 1200 ms vor dem nächsten Outfit): nur der Antwort-Wächter mit 12 s + bis zu 15 s Ruhe-Wartezeit
    // im Spiel-Tab (_shotMitRuhe: bei viel Sendelast wartet die Aufnahme dort kurz, das zählt nicht zur Antwortzeit).
    // (Der 1200-ms-Timer hier ist das Speichern des EXEC-Protokolls, nicht die Serie.)
    const ms = timers.map((t) => t.ms);
    expect(ms).toContain(27000);
    expect(ms).not.toContain(800);
    expect(ms).not.toContain(2500);
    expect(timers.some((t) => t.fn === ctx._wheelGenStep)).toBe(false);
  });

  it('die Antwort startet das nächste Outfit nach SLIDESHOW_GAP_MS', () => {
    const { ctx, opener, timers } = tool({ withTimers: true });
    serieLaeuft(ctx);
    ctx._wheelGenStep();
    const reqId = evalIn(ctx, '_wheelGenShotReq');
    timers.length = 0;
    dispatchMessage(ctx, { app: APP, type: 'SCREENSHOT_DATA', reqId, data: 'data:image/jpeg;base64,AAAA' }, { origin: BC, source: opener });
    expect(evalIn(ctx, '_wheelGenShotReq')).toBeNull();
    expect(timers.some((t) => t.ms === evalIn(ctx, 'SLIDESHOW_GAP_MS') && t.fn === ctx._wheelGenStep)).toBe(true);
    expect(evalIn(ctx, '_wheelGenStat.n')).toBe(1);
  });

  it('auch ein Fehler ("Canvas leer") hält die Serie nicht auf', () => {
    const { ctx, opener, timers } = tool({ withTimers: true });
    serieLaeuft(ctx);
    ctx._wheelGenStep();
    const reqId = evalIn(ctx, '_wheelGenShotReq');
    timers.length = 0;
    dispatchMessage(ctx, { app: APP, type: 'SCREENSHOT_DATA', reqId, err: 'Canvas leer' }, { origin: BC, source: opener });
    expect(timers.some((t) => t.fn === ctx._wheelGenStep)).toBe(true);
    expect(evalIn(ctx, '_wheelGenRunning')).toBe(true);
  });

  it('eine verspätete Antwort (anderes Foto als das laufende) startet nichts', () => {
    const { ctx, opener, timers } = tool({ withTimers: true });
    serieLaeuft(ctx);
    ctx._wheelGenStep();
    evalIn(ctx, "_pendingWheelShot['wss_alt'] = 'fp'");
    timers.length = 0;
    dispatchMessage(ctx, { app: APP, type: 'SCREENSHOT_DATA', reqId: 'wss_alt', err: 'x' }, { origin: BC, source: opener });
    expect(timers.some((t) => t.fn === ctx._wheelGenStep)).toBe(false);
    expect(evalIn(ctx, '_wheelGenShotReq')).toMatch(/^wss_\d/);
  });

  it('keine Antwort nach 27 s (12 s Antwortzeit + 15 s Ruhe-Wartezeit): die Serie pausiert, das Outfit kommt zurück in die Queue (nichts wird übersprungen)', () => {
    const { ctx, timers } = tool({ withTimers: true });
    serieLaeuft(ctx);
    timers.length = 0;
    ctx._wheelGenStep();
    const wachter = timers.find((t) => t.ms === 27000);
    wachter.fn();
    expect(evalIn(ctx, '_wheelGenPaused')).toBe(true);
    expect(evalIn(ctx, '_wheelGenQueue.map(j => j.oi)')).toEqual([0, 1]);
  });

  it('Start: Ausgangslage merken + AFK-Uhr zurück; keine Undo-Sicherung, die den Undo-Knopf verbiegt', () => {
    const { ctx, execs } = tool({ withTimers: true });
    setzeWheel(ctx, [OUTFIT]);
    ctx.mbsWheelGenerateAll();
    expect(evalIn(ctx, '_wheelGenRunning')).toBe(true);
    const start = execs().join('\n');
    expect(start).toContain('__BCU_wheelOrig=Player.Appearance.slice()');
    expect(start).toContain('AfkTimerReset');
    expect(start).not.toContain('__BCU_UNDO');
    execs().forEach((c) => expect(() => new Function(c)).not.toThrow());
  });

  it('Ende: Aussehen und Pose zurück, DANN ein Sync; die gemerkte Ausgangslage wird gelöscht', () => {
    const { ctx, execs } = tool({ withTimers: true });
    setzeWheel(ctx, [OUTFIT]);
    evalIn(ctx, '_wheelGenRunning = true; _wheelGenTotal = 1; _wheelGenQueue = [];');
    ctx._wheelGenFinish();
    const code = execs().at(-1);
    expect(() => new Function(code)).not.toThrow();
    const pose = code.indexOf('__BCU_poseOrig');
    const zurueck = code.indexOf('__BCU_wheelOrig.forEach');
    const sync = code.indexOf('ServerPlayerAppearanceSync();', zurueck);
    expect(pose).toBeGreaterThan(-1);
    expect(zurueck).toBeGreaterThan(pose);
    expect(sync).toBeGreaterThan(zurueck);
    expect(code).toContain('window.__BCU_wheelOrig=null');
    expect(evalIn(ctx, '_wheelGenRunning')).toBe(false);
  });

  it('läuft die Serie, startet eine Einzelaufnahme nicht dazwischen', () => {
    const { ctx, execs } = tool({ withTimers: true });
    serieLaeuft(ctx);
    ctx.mbsWheelCaptureShot(MN, 0);
    expect(execs().length).toBe(0);
  });

  it('Einzelaufnahme: ein EXEC mit dem Outfit (stehend, ohne Schloss, Pose danach zurück)', () => {
    const { ctx, execs } = tool({ withTimers: true });
    setzeWheel(ctx, [OUTFIT]);
    ctx.mbsWheelCaptureShot(MN, 0);
    expect(execs().length).toBe(1);
    expect(execs()[0]).toContain('Armbinder');
    expect(execs()[0]).not.toContain('__BCU_wheelOrig');   // Einzelaufnahme hängt nicht an einer Serie
    expect(() => new Function(execs()[0])).not.toThrow();
  });
});

describe('Wheel: nach einem Bild nur die Karten dieses Bildes tauschen', () => {
  function karte(fp, mn, oi) {
    return { dataset: { fp, mn: String(mn), oi: String(oi) }, outerHTML: 'ALT' };
  }
  function mitKarten(karten) {
    const t = tool();
    setzeWheel(t.ctx, [OUTFIT, { name: 'Wheel 2', items: [{ group: 'Cloth', asset: 'Kleid', colors: 'Default' }] }]);
    const body = makeElementStub();
    body.querySelectorAll = () => karten;
    t.els.wheelOutfitBody = body;
    t.ctx.__bauer = (mn, o, oi) => 'NEU:' + mn + ':' + oi;
    evalIn(t.ctx, '_wheelKartenBauer = __bauer');
    return t;
  }
  const fp0 = (ctx) => evalIn(ctx, '_mbsOutfitFp(_mbsWheelData[0].outfits[0])');

  it('tauscht nur die Karten mit diesem Fingerabdruck aus', () => {
    const k0 = karte('ItemArms:Armbinder', MN, 0);
    const k1 = karte('Cloth:Kleid', MN, 1);
    const { ctx } = mitKarten([k0, k1]);
    expect(fp0(ctx)).toBe('ItemArms:Armbinder');
    expect(ctx._wheelBildAktualisieren('ItemArms:Armbinder')).toBe(true);
    expect(k0.outerHTML).toBe('NEU:5:0');
    expect(k1.outerHTML).toBe('ALT');
  });

  it('zeigt keine Karte dieses Bild (Filter, noch nicht gezeichnet): nichts zu tun, kein Neuzeichnen nötig', () => {
    const { ctx } = mitKarten([karte('Cloth:Kleid', MN, 1)]);
    expect(ctx._wheelBildAktualisieren('ItemArms:Armbinder')).toBe(true);
  });

  it('passen die Daten nicht mehr zur Karte (verschoben), wird sicherheitshalber komplett neu gezeichnet', () => {
    const { ctx } = mitKarten([karte('ItemArms:Armbinder', MN, 1)]);
    expect(ctx._wheelBildAktualisieren('ItemArms:Armbinder')).toBe(false);
  });

  it('noch nie gezeichnet (kein Karten-Bauer): komplett neu zeichnen', () => {
    const { ctx } = mitKarten([]);
    evalIn(ctx, '_wheelKartenBauer = null');
    expect(ctx._wheelBildAktualisieren('x')).toBe(false);
  });
});
