import { describe, it, expect, vi } from 'vitest';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadScript, evalIn, dispatchMessage, makeElementStub, SANDBOX_ORIGIN } from './helpers/loadScript.js';

// Gefahrenzone (Einstellungen): "DOGS-Schlösser entfernen" und "DTS Drone-Status zurücksetzen".
// Die Funktionen liegen im Tool-Fenster, brauchen aber Player/LZString/… aus dem BC-TAB. Früher liefen sie im
// Tool-Fenster und meldeten immer "Nicht mit BC verbunden". Jetzt: EXEC in den Spiel-Tab + Ergebnis zurück.

const LZString = createRequire(import.meta.url)('lz-string');
const GAME = 'https://game.test';

function boot({ verbunden = true } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const timer = [];
  const els = {};
  const el = (id) => (els[id] ||= makeElementStub());
  const ctx = loadScript(['items.js'], {
    opener,
    setTimeout: (fn, ms) => { timer.push({ fn, ms }); return timer.length; },
    clearTimeout: () => {},
  });
  ctx.document.getElementById = (id) => el(id);
  evalIn(ctx, `_bcOrigin = '${GAME}'; _connected = ${verbunden}`);
  opener.postMessage.mockClear();
  return { ctx, opener, els, el, timer };
}

// Fake-BC-Tab: führt den gesendeten Code aus und sammelt, was zurück ans Tool geht
function laufImSpiel(code, player, { imRaum = true } = {}) {
  const z = { antworten: [], sync: [], refresh: 0, raum: 0 };
  const sandbox = {
    Player: player, LZString,
    ServerPlayerExtensionSettingsSync: (k) => z.sync.push(k),
    CharacterRefresh: () => { z.refresh++; },
    ServerPlayerIsInChatRoom: () => imRaum,
    ChatRoomCharacterUpdate: () => { z.raum++; },
  };
  sandbox.window = sandbox;
  sandbox.__BCK_popupRef = { postMessage: (msg, origin) => z.antworten.push({ msg, origin }) };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return z;
}

const item = (grp, name, prop) => ({ Asset: { Name: name, Group: { Name: grp } }, Property: prop });
const dogsProp = (extra = {}) => ({ Name: 'DeviousPadlock', LockedBy: 'ExclusivePadlock', LockMemberNumber: 5, LockMemberName: 'Yuuki',
  Effect: ['Lock', 'Block'], RemoveTimer: 5, Difficulty: 3, ...extra });
const dogsSpeicher = (itemGroups) => LZString.compressToBase64(JSON.stringify({ deviousPadlock: { state: true, itemGroups }, anderes: 1 }));
const gesendet = (opener) => opener.postMessage.mock.calls.map((c) => c[0]);
const letzterCode = (opener) => gesendet(opener).filter((m) => m.type === 'EXEC').pop().code;

describe('Vor dem Senden', () => {
  it('nicht verbunden: Hinweis im Status, nichts wird gesendet', () => {
    const { ctx, opener, el } = boot({ verbunden: false });
    ctx.removeAllDOGSLocks();
    ctx.dtsResetDrone();
    expect(el('dogsLockStatus').textContent).toMatch(/Nicht mit BC verbunden/);
    expect(el('dtsResetStatus').textContent).toMatch(/Nicht mit BC verbunden/);
    expect(opener.postMessage).not.toHaveBeenCalled();
  });

  it('verbunden: sendet EXEC an das Spiel, Status zeigt "wird ausgeführt"', () => {
    const { ctx, opener, el } = boot();
    ctx.removeAllDOGSLocks();
    const m = gesendet(opener);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ app: 'BCKonfigurator', type: 'EXEC' });
    expect(el('dogsLockStatus').textContent).toMatch(/^⏳/);
  });

  it('bcSend scheitert (Fenster zu): Fehler sofort sichtbar statt ewig "⏳"', () => {
    const { ctx, opener, el } = boot();
    opener.closed = true;
    ctx.dtsResetDrone();
    expect(el('dtsResetStatus').textContent).toMatch(/^❌/);
  });

  it('keine Antwort vom Spiel: nach Ablauf der Wartezeit steht ein Hinweis da', () => {
    const { ctx, el, timer } = boot();
    ctx.removeAllDOGSLocks();
    const t = timer.find((x) => x.ms === 8000);
    expect(t).toBeTruthy();
    t.fn();
    expect(el('dogsLockStatus').textContent).toMatch(/Keine Antwort/);
  });

  it('beide EXEC-Codes sind gültiges JavaScript, enthalten den Tool-Origin und kein "*" als Ziel', () => {
    const { ctx, opener } = boot();
    ctx.removeAllDOGSLocks();
    ctx.dtsResetDrone();
    for (const m of gesendet(opener)) {
      expect(() => new Function(m.code)).not.toThrow();
      expect(m.code).toContain('"' + SANDBOX_ORIGIN + '"');
      expect(m.code).not.toMatch(/,\s*['"]\*['"]\)/);
    }
  });
});

describe('DOGS-Schlösser entfernen (Code im Spiel-Tab)', () => {
  function lauf(player, opt) {
    const { ctx, opener } = boot();
    ctx.removeAllDOGSLocks();
    return laufImSpiel(letzterCode(opener), player, opt);
  }
  const spieler = () => ({
    MemberNumber: 100,
    Appearance: [
      item('ItemArms', 'Armbinder', dogsProp()),
      item('ItemLegs', 'Seil', { LockedBy: 'MetalPadlock', LockMemberNumber: 9, Effect: ['Lock'] }),
      item('ItemFeet', 'Fessel', {}),
      item('ItemNeck', 'Halsband', { LockedBy: 'ExclusivePadlock', Name: 'DeviousPadlock', Effect: ['Lock'] }),
      item('ItemTorso', 'Korsett', { LockedBy: 'ExclusivePadlock', LockMemberNumber: 5, Effect: ['Lock'] }),
      item('ItemHead', 'Haube', { LockedBy: 'MetalPadlock', Effect: ['Lock'] }),
    ],
    ExtensionSettings: { DOGS: dogsSpeicher({ ItemArms: {}, ItemHead: {}, ItemBoots: {} }) },
  });

  it('entfernt DOGS-Schlösser, lässt normale Schlösser, fremde Exclusive-Schlösser und andere Items unangetastet', () => {
    const p = spieler();
    lauf(p);
    const prop = (g) => p.Appearance.find((i) => i.Asset.Group.Name === g).Property;
    expect(prop('ItemArms').LockedBy).toBeUndefined();
    expect(prop('ItemArms').Name).toBeUndefined();
    expect(prop('ItemArms').RemoveTimer).toBeUndefined();
    expect(prop('ItemArms').Effect).toEqual(['Block']);
    expect(prop('ItemArms').Difficulty).toBe(3);
    expect(prop('ItemNeck').LockedBy).toBeUndefined();
    expect(prop('ItemLegs').LockedBy).toBe('MetalPadlock');
    expect(prop('ItemHead').LockedBy).toBe('MetalPadlock'); // Gruppe steht in DOGS, das Schloss ist aber normal
    expect(prop('ItemTorso').LockedBy).toBe('ExclusivePadlock'); // Exclusive, aber nicht von DOGS
    expect(Object.keys(prop('ItemFeet'))).toHaveLength(0);
  });

  it('leert DOGS\' Liste (übrige DOGS-Daten bleiben), sendet Einstellung und Aussehen je einmal, aktualisiert den Raum', () => {
    const p = spieler();
    const z = lauf(p);
    const dogs = JSON.parse(LZString.decompressFromBase64(p.ExtensionSettings.DOGS));
    expect(dogs.deviousPadlock.itemGroups).toEqual({});
    expect(dogs.deviousPadlock.state).toBe(true);
    expect(dogs.anderes).toBe(1);
    expect(z.sync).toEqual(['DOGS']);
    expect(z.refresh).toBe(1);
    expect(z.raum).toBe(1);
  });

  it('meldet Erfolg mit geaendert=true an das Tool-Fenster (Origin = Tool, nicht "*")', () => {
    const z = lauf(spieler());
    expect(z.antworten).toHaveLength(1);
    const { msg, origin } = z.antworten[0];
    expect(origin).toBe(SANDBOX_ORIGIN);
    expect(msg).toMatchObject({ app: 'BCKonfigurator', type: 'GEFAHR_ERGEBNIS', id: 'dogs', ok: true, geaendert: true });
    expect(msg.text).toMatch(/2 DOGS-Schl.*ItemArms, ItemNeck/); // gezählt werden entfernte Schlösser, nicht DOGS' Listeneinträge (3)
    expect(msg.text).toMatch(/neu laden/);
  });

  it('nicht im Raum: kein Raum-Update', () => {
    expect(lauf(spieler(), { imRaum: false }).raum).toBe(0);
  });

  it('keine DOGS-Daten und keine DOGS-Schlösser: freundliche Meldung, nichts gesendet, geaendert=false', () => {
    const z = lauf({ MemberNumber: 1, Appearance: [item('ItemArms', 'A', {})], ExtensionSettings: {} });
    expect(z.sync).toEqual([]);
    expect(z.refresh).toBe(0);
    expect(z.antworten[0].msg).toMatchObject({ ok: true, geaendert: false });
  });

  it('nur Einträge in DOGS\' Liste (Item schon ohne Schloss): Liste wird trotzdem geleert', () => {
    const p = { MemberNumber: 1, Appearance: [item('ItemArms', 'A', {})], ExtensionSettings: { DOGS: dogsSpeicher({ ItemArms: {} }) } };
    const z = lauf(p);
    expect(JSON.parse(LZString.decompressFromBase64(p.ExtensionSettings.DOGS)).deviousPadlock.itemGroups).toEqual({});
    expect(z.antworten[0].msg).toMatchObject({ ok: true, geaendert: true });
    expect(z.antworten[0].msg.text).toMatch(/Liste geleert \(1 Eintr/);
  });

  it('Fehler im Spiel (z. B. Player fehlt) wird als ok=false gemeldet statt still zu schlucken', () => {
    const z = lauf(null);
    expect(z.antworten[0].msg).toMatchObject({ id: 'dogs', ok: false, geaendert: false });
    expect(z.antworten[0].msg.text).toMatch(/^❌ Fehler/);
  });
});

describe('DTS Drone-Status zurücksetzen (Code im Spiel-Tab)', () => {
  function lauf(player) {
    const { ctx, opener } = boot();
    ctx.dtsResetDrone();
    return laufImSpiel(letzterCode(opener), player);
  }

  it('setzt Drone-Status, Besitzer und Rolle zurück und synchronisiert', () => {
    const p = { ExtensionSettings: { DTSbyZajucd: { isDrone: true, ownerId: 5, isOwner: true, rest: 1 } } };
    const z = lauf(p);
    expect(p.ExtensionSettings.DTSbyZajucd).toEqual({ isDrone: false, ownerId: -1, isOwner: false, rest: 1 });
    expect(z.sync).toEqual(['DTSbyZajucd']);
    expect(z.antworten[0].msg).toMatchObject({ id: 'dts', ok: true, geaendert: true });
  });

  it('war keine Drone: Erfolg ohne Änderung (Knopf bleibt benutzbar)', () => {
    const p = { ExtensionSettings: { DTSbyZajucd: { isDrone: false, ownerId: -1, isOwner: false } } };
    expect(lauf(p).antworten[0].msg).toMatchObject({ ok: true, geaendert: false });
  });

  it('kein DTS-Eintrag: Erfolg ohne Änderung, nichts gesendet', () => {
    const z = lauf({ ExtensionSettings: {} });
    expect(z.sync).toEqual([]);
    expect(z.antworten[0].msg).toMatchObject({ ok: true, geaendert: false });
  });

  it('unbekanntes Format (Text statt Objekt): keine falsche Erfolgsmeldung, nichts gesendet', () => {
    const z = lauf({ ExtensionSettings: { DTSbyZajucd: 'komprimierter text' } });
    expect(z.sync).toEqual([]);
    expect(z.antworten[0].msg).toMatchObject({ ok: false, geaendert: false });
    expect(z.antworten[0].msg.text).toMatch(/unbekannt/);
  });
});

describe('Antwort des Spiel-Tabs im Tool-Fenster', () => {
  function antwort(ctx, opener, daten) {
    return dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'GEFAHR_ERGEBNIS', ...daten }, { origin: GAME, source: opener });
  }

  it('schreibt den Text in das Statusfeld und sperrt den Knopf nur nach echter Änderung', () => {
    const { ctx, opener, el } = boot();
    antwort(ctx, opener, { id: 'dogs', ok: true, geaendert: true, text: '✅ 2 entfernt' });
    expect(el('dogsLockStatus').textContent).toBe('✅ 2 entfernt');
    expect(el('dogsLockRemoverBtn').disabled).toBe(true);

    antwort(ctx, opener, { id: 'dts', ok: true, geaendert: false, text: '✅ War bereits keine Drone' });
    expect(el('dtsResetStatus').textContent).toBe('✅ War bereits keine Drone');
    expect(el('dtsResetBtn').disabled).not.toBe(true);
  });

  it('Fehlerantwort sperrt den Knopf nicht', () => {
    const { ctx, opener, el } = boot();
    antwort(ctx, opener, { id: 'dogs', ok: false, geaendert: true, text: '❌ Fehler: x' });
    expect(el('dogsLockStatus').textContent).toBe('❌ Fehler: x');
    expect(el('dogsLockRemoverBtn').disabled).not.toBe(true);
  });

  it('unbekannte ID wird ignoriert (kein Schreiben in beliebige Elemente)', () => {
    const { ctx, opener, els } = boot();
    expect(() => antwort(ctx, opener, { id: 'connStatus', ok: true, text: 'böse' })).not.toThrow();
    antwort(ctx, opener, { id: '__proto__', ok: true, text: 'böse' });
    expect(els.connStatus).toBeUndefined();
  });

  it('Antworttext wird als Text gesetzt (kein HTML) und gekürzt', () => {
    const { ctx, opener, el } = boot();
    antwort(ctx, opener, { id: 'dogs', ok: true, text: '<img src=x onerror=alert(1)>' + 'a'.repeat(500) });
    const e = el('dogsLockStatus');
    expect(e.innerHTML ?? '').not.toContain('<img');
    expect(e.textContent.length).toBe(300);
  });

  it('Antwort von fremder Quelle wird nicht angenommen', () => {
    const { ctx, el } = boot();
    dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'GEFAHR_ERGEBNIS', id: 'dogs', ok: true, geaendert: true, text: 'gefälscht' },
      { origin: 'https://fremd.test', source: {} });
    expect(el('dogsLockStatus').textContent).not.toBe('gefälscht');
  });
});
