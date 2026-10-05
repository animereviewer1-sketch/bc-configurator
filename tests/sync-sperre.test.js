import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Sync-Sperre: Solange für ein Screenshot ein Test-Outfit an dir hängt, geht dein Aussehen NIE zum Server.
// Betritt man währenddessen einen Raum, sendet BC (und manche Mods) das Aussehen – das würde der Server speichern
// und der ganze Raum sähe es. Die Sperre fängt es ab und löst sich erst NACH dem Wiederherstellen; dann geht
// ein frischer Sync mit dem echten Aussehen raus (BC berechnet das Aussehen beim Aufruf, nicht beim Senden).

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function tool() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {},
    Image: class { set src(v) { this._s = v; } } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, els, execs };
}

const bausteine = () => {
  const { ctx } = tool();
  return {
    ctx,
    install: evalIn(ctx, '_SHOT_SPERRE_INSTALL'),
    an: (token, ms, fehler) => { ctx.__a = [token, ms, fehler]; return evalIn(ctx, '_shotSperreAn(__a[0], __a[1], __a[2])'); },
    aus: (token) => { ctx.__t = token; return evalIn(ctx, '_shotSperreAus(__t)'); },
  };
};

// Nachgebautes BC: ServerSend merkt sich, WAS gesendet wurde und wie dein Aussehen in dem Moment war
function bc({ modsdk = false, serverSend = true, extra = {} } = {}) {
  const z = { gesendet: [], sync: 0, raumUpdate: 0, hooks: [], registriert: [] };
  const timers = [];
  const namen = (C) => C.Appearance.map((i) => i.Asset.Name);
  const Player = {
    OnlineID: 7, MemberNumber: 100, AssetFamily: 'Female3DCG',
    Appearance: [{ Asset: { Name: 'ORIG', Group: { Name: 'Cloth' } } }],
  };
  const g = {
    Player, JSON, Array, Object, Math, Date, Error,
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    ServerPlayerAppearanceSync() { z.sync++; g.ServerSend('AccountUpdate', { AssetFamily: 'Female3DCG', Appearance: namen(Player) }); },
    ChatRoomCharacterUpdate(C) { z.raumUpdate++; g.ServerSend('ChatRoomCharacterUpdate', { ID: C.OnlineID, Appearance: namen(C) }); },
    ServerPlayerIsInChatRoom: () => true,
    ...extra,
  };
  if (serverSend) {
    g.ServerSend = function (typ, daten) {
      z.gesendet.push({ typ, daten: daten === undefined ? undefined : JSON.parse(JSON.stringify(daten)), aussehen: namen(Player) });
    };
  }
  if (modsdk) {
    g.bcModSdk = {
      registerMod(info) {
        z.registriert.push(info);
        return { hookFunction(fn, prio, cb) { z.hooks.push({ fn, prio, cb }); } };
      },
    };
  }
  g.window = g;
  const ctx = vm.createContext(g);
  return {
    z, Player, g,
    lauf: (code) => vm.runInContext(code, ctx),
    // läuft die gemerkten Timer ab; vorher optional etwas, das "zwischendurch" passiert (z. B. Raum-Beitritt)
    zeit: (zwischendurch) => { if (zwischendurch) zwischendurch(); let n = 0; while (timers.length && n++ < 100) timers.shift()(); },
  };
}

// Die Sperre ist aktiv: gleich über _shotSperreAn setzen (wie die Aufnahme-Pfade)
function sperreAn(env, b, token = 7, ms = 30000) {
  env.lauf(b.an(String(token), ms, 'window.__FEHLER__=1;'));
}

describe('Sync-Sperre: der Hook', () => {
  it('ohne aktive Sperre geht alles unverändert durch', () => {
    const b = bausteine();
    const env = bc();
    env.lauf(b.install);
    env.g.ServerSend('AccountUpdate', { Appearance: ['X'], AssetFamily: 'F' });
    env.g.ServerSend('ChatRoomCharacterUpdate', { ID: 7, Appearance: ['X'] });
    expect(env.z.gesendet.map((m) => m.typ)).toEqual(['AccountUpdate', 'ChatRoomCharacterUpdate']);
    expect(env.z.gesendet[0].daten).toEqual({ Appearance: ['X'], AssetFamily: 'F' });
  });

  it('mit Sperre: Aussehen im AccountUpdate wird abgefangen, die übrigen Felder gehen durch', () => {
    const b = bausteine();
    const env = bc();
    sperreAn(env, b);
    env.g.ServerSend('AccountUpdate', { AssetFamily: 'F', Appearance: ['TEMP'] });                       // nur Aussehen → ganz weg
    env.g.ServerSend('AccountUpdate', { AssetFamily: 'F', Appearance: ['TEMP'], 'ExtensionSettings.AFC_Data': 'daten' }); // Rest bleibt
    env.g.ServerSend('AccountUpdate', { 'ExtensionSettings.EmeryBC': 'x' });                             // ohne Aussehen → unverändert
    expect(env.z.gesendet.map((m) => m.daten)).toEqual([
      { 'ExtensionSettings.AFC_Data': 'daten' },
      { 'ExtensionSettings.EmeryBC': 'x' },
    ]);
    expect(env.g.__BCU_sperreAcc).toBe(true);
  });

  it('mit Sperre: ChatRoomCharacterUpdate und ChatRoomCharacterItemUpdate für DICH werden abgefangen', () => {
    const b = bausteine();
    const env = bc();
    sperreAn(env, b);
    env.g.ServerSend('ChatRoomCharacterUpdate', { ID: 7, Appearance: ['TEMP'] });
    env.g.ServerSend('ChatRoomCharacterItemUpdate', { Target: 100, Group: 'ItemArms', Name: 'TEMP' });
    expect(env.z.gesendet).toEqual([]);
    expect(env.g.__BCU_sperreRaum).toBe(true);
  });

  it('Aktionen an ANDEREN Spielern und alles andere gehen weiter durch', () => {
    const b = bausteine();
    const env = bc();
    sperreAn(env, b);
    env.g.ServerSend('ChatRoomCharacterUpdate', { ID: 99, Appearance: ['FREMD'] });
    env.g.ServerSend('ChatRoomCharacterItemUpdate', { Target: 555, Group: 'ItemArms', Name: 'FREMD' });
    env.g.ServerSend('ChatRoomChat', { Type: 'Chat', Content: 'hallo' });
    env.g.ServerSend('ChatRoomSearch', {});
    expect(env.z.gesendet.map((m) => m.typ)).toEqual(['ChatRoomCharacterUpdate', 'ChatRoomCharacterItemUpdate', 'ChatRoomChat', 'ChatRoomSearch']);
    expect(env.g.__BCU_sperreRaum).toBeFalsy();
  });

  it('die Sperre verfällt von selbst (abgestürzter Lauf blockiert dich nie dauerhaft)', () => {
    const b = bausteine();
    const env = bc();
    sperreAn(env, b, 7, -1);           // schon abgelaufen
    env.g.ServerSend('AccountUpdate', { Appearance: ['X'] });
    expect(env.z.gesendet.length).toBe(1);
  });

  it('mehrfaches Installieren legt den Hook nur einmal an', () => {
    const b = bausteine();
    const env = bc({ modsdk: true });
    env.lauf(b.install); env.lauf(b.install); env.lauf(b.install);
    expect(env.z.registriert.length).toBe(1);
    expect(env.z.hooks.length).toBe(1);
  });

  it('mit ModSDK: Hook auf ServerSend mit hoher Priorität (läuft zuerst), fängt ab und reicht sonst durch', () => {
    const b = bausteine();
    const env = bc({ modsdk: true });
    sperreAn(env, b);
    const h = env.z.hooks[0];
    expect(h.fn).toBe('ServerSend');
    expect(h.prio).toBeGreaterThan(9999);   // vor BCX-Filter und Co.
    const next = vi.fn(() => 'weiter');
    expect(h.cb(['AccountUpdate', { Appearance: ['TEMP'] }], next)).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(h.cb(['ChatRoomChat', { Type: 'Chat' }], next)).toBe('weiter');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ModSDK vorhanden, aber ohne Hook-Möglichkeit: ServerSend wird direkt umhüllt', () => {
    const b = bausteine();
    const env = bc();
    env.g.bcModSdk = { registerMod() { throw new Error('nein'); } };
    sperreAn(env, b);
    env.g.ServerSend('AccountUpdate', { Appearance: ['TEMP'] });
    expect(env.z.gesendet).toEqual([]);
    expect(env.g.__FEHLER__).toBeUndefined();
  });

  it('weder ModSDK noch ServerSend: die Sperre ist nicht möglich, der Fehler-Zweig läuft (es wird nichts angelegt)', () => {
    const b = bausteine();
    const env = bc({ serverSend: false });
    sperreAn(env, b);
    expect(env.g.__FEHLER__).toBe(1);
    expect(env.g.__BCU_SPERRE_HOOK__).toBeFalsy();
  });
});

describe('Sync-Sperre: lösen und nachholen', () => {
  const aktiv = (env, b, token = 7) => { sperreAn(env, b, token); };

  it('nur der Eigentümer löst die Sperre (ein neuerer Lauf hat sie übernommen)', () => {
    const b = bausteine();
    const env = bc();
    aktiv(env, b, 8);
    env.lauf(b.aus('7'));
    expect(env.g.__BCU_sperreBis).toBeGreaterThan(Date.now());
    env.lauf(b.aus('8'));
    expect(env.g.__BCU_sperreBis).toBe(0);
  });

  it('war etwas abgefangen: genau EIN frischer Sync nach dem Lösen – mit dem Aussehen von jetzt', () => {
    const b = bausteine();
    const env = bc();
    env.lauf(b.install);
    aktiv(env, b);
    env.Player.Appearance.push({ Asset: { Name: 'TEMP', Group: { Name: 'ItemArms' } } });
    env.g.ServerSend('AccountUpdate', { Appearance: ['TEMP'] });           // abgefangen
    env.g.ServerSend('ChatRoomCharacterUpdate', { ID: 7, Appearance: ['TEMP'] });
    env.Player.Appearance.pop();                                            // Wiederherstellen
    env.lauf(b.aus('7'));
    expect(env.z.sync).toBe(1);
    expect(env.z.raumUpdate).toBe(1);
    expect(env.z.gesendet.map((m) => [m.typ, m.aussehen])).toEqual([
      ['AccountUpdate', ['ORIG']], ['ChatRoomCharacterUpdate', ['ORIG']],
    ]);
    expect(env.g.__BCU_sperreAcc).toBe(false);
    expect(env.g.__BCU_sperreRaum).toBe(false);
  });

  it('wartet bei BC noch ein Aussehen in der Warteschlange, wird es durch den frischen Sync ersetzt', () => {
    const b = bausteine();
    const env = bc({ extra: { ServerAccountUpdate: { Queue: new Map([['Appearance', ['TEMP']]]) } } });
    env.lauf(b.install);
    aktiv(env, b);
    env.lauf(b.aus('7'));
    expect(env.z.sync).toBe(1);
  });

  it('war nichts los: kein überflüssiger Sync', () => {
    const b = bausteine();
    const env = bc({ extra: { ServerAccountUpdate: { Queue: new Map() } } });
    env.lauf(b.install);
    aktiv(env, b);
    env.lauf(b.aus('7'));
    expect(env.z.sync).toBe(0);
    expect(env.z.raumUpdate).toBe(0);
  });

  it('der Raum bekommt das Aussehen nur nach, wenn du im Raum bist', () => {
    const b = bausteine();
    const env = bc({ extra: { ServerPlayerIsInChatRoom: () => false } });
    env.lauf(b.install);
    aktiv(env, b);
    env.g.ServerSend('ChatRoomCharacterUpdate', { ID: 7, Appearance: ['TEMP'] });
    env.lauf(b.aus('7'));
    expect(env.z.raumUpdate).toBe(0);
  });
});

// ── Das Szenario: Raum-Beitritt mitten im Test-Outfit ───────────────────────────────────────────────

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

function captureCode(raw) {
  const t = tool();
  t.ctx.captureProfileViaCanvas('A - B', null, raw);
  return t.execs()[0];
}

function aufnahme(code, { beiJoin } = {}) {
  let version = 0;
  const env = bc({
    extra: {
      Uint8ClampedArray, performance: { now: () => 1 },
      CharacterRefresh() { version++; },
      document: { createElement: () => leinwand(() => version) },
    },
  });
  env.Player.Canvas = leinwand(() => version);
  env.g.__BCK_popupRef = { postMessage: (m) => env.z.gesendet.push({ typ: '@popup', daten: m.err ? { err: m.err } : { ok: true }, aussehen: env.g.Player.Appearance.map((i) => i.Asset.Name) }) };
  env.lauf(code);
  // "Du betrittst gerade einen Raum": BC und ein Mod senden dein Aussehen, während das Test-Outfit an dir hängt
  env.zeit(() => {
    expect(env.Player.Appearance.map((i) => i.Asset.Name)).toContain('TEMP');   // wir sind mitten im Test-Outfit
    if (beiJoin === false) return;
    env.g.ServerPlayerAppearanceSync();
    env.g.ChatRoomCharacterUpdate(env.Player);
    env.g.ServerSend('AccountUpdate', { Appearance: env.Player.Appearance.map((i) => i.Asset.Name), 'ExtensionSettings.AFC_Data': 'daten' });
    env.g.ServerSend('ChatRoomCharacterItemUpdate', { Target: 100, Group: 'ItemArms', Name: 'TEMP' });
  });
  return env;
}
const TEMP_ANLEGEN = 'Player.Appearance.push({Asset:{Name:"TEMP",Group:{Name:"ItemArms"}}});';
const traegtTemp = (m) => JSON.stringify(m.daten ?? '').includes('TEMP') || m.aussehen.includes('TEMP');
const mitAussehen = (m) => m.typ === 'ChatRoomCharacterUpdate' || m.typ === 'ChatRoomCharacterItemUpdate' || (m.typ === 'AccountUpdate' && m.daten && 'Appearance' in m.daten);

describe('Raum-Beitritt mitten im Test-Outfit (Profil-Screenshot)', () => {
  it('KONTROLLE ohne Sperre: das Test-Outfit würde zum Server gehen', () => {
    const code = captureCode(TEMP_ANLEGEN).replace(/window\.__BCU_sperreBis=Date\.now\(\)\+\d+;/, 'window.__BCU_sperreBis=0;');
    const env = aufnahme(code);
    expect(env.z.gesendet.filter(mitAussehen).some(traegtTemp)).toBe(true);
  });

  it('mit Sperre: nichts mit dem Test-Outfit geht raus – zu keinem Zeitpunkt', () => {
    const env = aufnahme(captureCode(TEMP_ANLEGEN));
    const raus = env.z.gesendet.filter((m) => m.typ !== '@popup');
    expect(raus.filter(mitAussehen).some(traegtTemp)).toBe(false);
    // Während das Test-Outfit an dir hängt, geht nichts durch, das dein Aussehen trägt (Einstellungsfelder dürfen)
    expect(raus.filter((m) => m.aussehen.includes('TEMP')).some(mitAussehen)).toBe(false);
  });

  it('die übrigen Felder des Mods kommen trotzdem an', () => {
    const env = aufnahme(captureCode(TEMP_ANLEGEN));
    expect(env.z.gesendet.some((m) => m.typ === 'AccountUpdate' && m.daten['ExtensionSettings.AFC_Data'] === 'daten' && !('Appearance' in m.daten))).toBe(true);
  });

  it('das Aussehen geht erst NACH dem Wiederherstellen raus – ein frischer Sync mit dem Original, einmal', () => {
    const env = aufnahme(captureCode(TEMP_ANLEGEN));
    const aufn = env.z.gesendet.findIndex((m) => m.typ === '@popup');
    expect(aufn).toBeGreaterThan(-1);
    const danach = env.z.gesendet.slice(aufn + 1).filter(mitAussehen);
    expect(danach.filter((m) => m.typ === 'AccountUpdate').length).toBe(1);
    expect(danach.filter((m) => m.typ === 'ChatRoomCharacterUpdate').length).toBe(1);
    for (const m of danach) { expect(m.aussehen).toEqual(['ORIG']); expect(JSON.stringify(m.daten)).not.toContain('TEMP'); }
    expect(env.Player.Appearance.map((i) => i.Asset.Name)).toEqual(['ORIG']);
  });

  it('die Sperre ist am Ende gelöst – dein nächster echter Sync geht wieder raus', () => {
    const env = aufnahme(captureCode(TEMP_ANLEGEN));
    expect(env.g.__BCU_sperreBis).toBe(0);
    const vorher = env.z.gesendet.length;
    env.g.ServerSend('AccountUpdate', { Appearance: ['ORIG'] });
    expect(env.z.gesendet.length).toBe(vorher + 1);
  });

  it('ohne Raum-Beitritt: kein überflüssiger Sync, nur das Bild', () => {
    const env = aufnahme(captureCode(TEMP_ANLEGEN), { beiJoin: false });
    expect(env.z.sync).toBe(0);
    expect(env.z.raumUpdate).toBe(0);
    expect(env.z.gesendet.filter((m) => m.typ !== '@popup')).toEqual([]);
  });

  it('kann die Sperre nicht gesetzt werden, wird NICHTS angelegt und der Fehler geht ans Tool', () => {
    const env = bc({ serverSend: false, extra: { Uint8ClampedArray, performance: { now: () => 1 }, CharacterRefresh() {}, document: { createElement: () => leinwand(() => 0) } } });
    env.Player.Canvas = leinwand(() => 0);
    const meldungen = [];
    env.g.__BCK_popupRef = { postMessage: (m) => meldungen.push(m) };
    env.lauf(captureCode(TEMP_ANLEGEN));
    expect(env.Player.Appearance.map((i) => i.Asset.Name)).toEqual(['ORIG']);
    expect(meldungen.length).toBe(1);
    expect(meldungen[0].err).toMatch(/^SPERRE_FAIL/);
  });
});

describe('Alle Aufnahme-Pfade sperren VOR dem Anlegen und lösen NACH dem Wiederherstellen', () => {
  const idx = (s, teil, von = 0) => s.indexOf(teil, von);

  it('Profil: Sperre → Ausgangslage sichern → Anlegen; Lösen steht hinter dem Zurücksetzen (Normalfall und Fehlerfall)', () => {
    const code = captureCode('var x = 1;');
    expect(() => new Function(code)).not.toThrow();
    const an = idx(code, 'window.__BCU_sperreGen=myGen');
    expect(an).toBeGreaterThan(-1);
    expect(an).toBeLessThan(idx(code, 'var origApp='));
    expect(an).toBeLessThan(idx(code, 'var x = 1;'));
    // _restore(): Zurücksetzen, dann Lösen
    const rest = idx(code, 'function _restore(){');
    const restEnde = idx(code, 'function _canvasHash', rest);
    const block = code.slice(rest, restEnde);
    expect(idx(block, 'origApp.forEach')).toBeLessThan(idx(block, '__BCU_sperreGen!==myGen'));
    expect(idx(block, 'CharacterRefresh(Player,false,false)')).toBeLessThan(idx(block, '__BCU_sperreGen!==myGen'));
  });

  it('Profil im Fehlerfall des Anlegens: erst zurücksetzen, dann lösen, dann melden', () => {
    const t = tool();
    ctxProfilBundle(t);
    const code = t.execs()[0];
    const fehler = idx(code, 'APPLY_FAIL');
    const zurueck = code.lastIndexOf('origApp.forEach', fehler);
    const loesen = code.lastIndexOf('__BCU_sperreGen!==myGen', fehler);
    expect(zurueck).toBeGreaterThan(-1);
    expect(loesen).toBeGreaterThan(zurueck);
    expect(loesen).toBeLessThan(fehler);
  });

  function ctxProfilBundle(t) {
    t.ctx.captureProfileViaCanvas('A - B', 'BUNDLE', null);
  }

  it('Outfit-Scan: Sperre vor dem Anlegen, Lösen in _restoreAndSync nach dem Zurücksetzen und VOR dem späteren Sync', () => {
    const t = tool();
    t.ctx.__code = 'BUNDLE';
    evalIn(t.ctx, "LSCG_DB['1001'] = { versions: [{ code: __code, fingerprint: 'fpA' }] }");
    t.ctx.captureOsScreenshot('1001', 0);
    const code = t.execs()[0];
    expect(() => new Function(code)).not.toThrow();
    expect(idx(code, 'window.__BCU_sperreGen=myGen')).toBeLessThan(idx(code, 'var origApp='));
    const r = idx(code, 'function _restoreAndSync(){');
    const block = code.slice(r, idx(code, 'function _canvasHash', r));
    const zurueck = idx(block, 'origApp.forEach');
    const loesen = idx(block, '__BCU_sperreGen!==myGen');
    const sync = idx(block, 'setTimeout(function(){');
    expect(zurueck).toBeGreaterThan(-1);
    expect(loesen).toBeGreaterThan(zurueck);
    expect(sync).toBeGreaterThan(loesen);
  });

  const wheelCode = (ctx, serie = true) => {
    ctx.__i = [{ group: 'ItemArms', asset: 'X', colors: ['#fff'] }];
    return evalIn(ctx, `_wheelShotCode('wss_1', __i, ${serie})`);
  };

  it('Wheel: Sperre → Ausgangslage sichern → Anlegen; Lösen steht hinter dem Zurücksetzen (Normalfall und Fehlerfall)', () => {
    const { ctx } = tool();
    const code = wheelCode(ctx);
    expect(() => new Function(code)).not.toThrow();
    const an = idx(code, 'window.__BCU_sperreGen=myGen');
    expect(an).toBeGreaterThan(-1);
    expect(an).toBeLessThan(idx(code, 'var origApp='));
    expect(an).toBeLessThan(idx(code, 'InventoryWear('));
    const rest = idx(code, 'function _restore(){');
    const block = code.slice(rest, idx(code, 'function _canvasHash', rest));
    expect(idx(block, 'origApp.forEach')).toBeLessThan(idx(block, '__BCU_sperreGen!==myGen'));
    expect(idx(block, 'CharacterRefresh(Player,false,false)')).toBeLessThan(idx(block, '__BCU_sperreGen!==myGen'));
    // Fehlerfall des Anlegens: erst zurücksetzen, dann lösen, dann melden
    const fehler = idx(code, 'APPLY_FAIL');
    const zurueck = code.lastIndexOf('origApp.forEach', fehler);
    const loesen = code.lastIndexOf('__BCU_sperreGen!==myGen', fehler);
    expect(zurueck).toBeGreaterThan(-1);
    expect(loesen).toBeGreaterThan(zurueck);
    expect(loesen).toBeLessThan(fehler);
  });

  it('Wheel: das normale Anlegen (Run-Button) sperrt nicht und synchronisiert danach', () => {
    const { ctx } = tool();
    ctx.__i = [{ group: 'ItemArms', asset: 'X', colors: ['#fff'] }];
    const normal = evalIn(ctx, '_mbsBuildApplyCode(__i)');
    expect(normal).not.toContain('__BCU_sperreGen');
    expect(normal).toContain('ServerPlayerAppearanceSync');
    expect(() => new Function(normal)).not.toThrow();
  });

  it('Wheel: Zurückstellen (Undo) stellt wieder her und synchronisiert danach', () => {
    const { ctx, execs } = tool();
    evalIn(ctx, '_connected = true');
    ctx.bcuUndoAppearance();
    const code = execs().at(-1);
    expect(() => new Function(code)).not.toThrow();
    const wiederher = idx(code, 'ServerAppearanceLoadFromBundle');
    const sync = idx(code, 'ServerPlayerAppearanceSync();', wiederher);
    expect(wiederher).toBeGreaterThan(-1);
    expect(sync).toBeGreaterThan(wiederher);
  });

  it('Wheel: kann die Sperre nicht gesetzt werden, wird NICHTS angelegt und der Fehler geht ans Tool', () => {
    const { ctx } = tool();
    const code = wheelCode(ctx);
    const env = bc({ serverSend: false, extra: { Uint8ClampedArray, performance: { now: () => 1 }, CharacterRefresh() {},
      AssetGet() { throw new Error('darf nicht angelegt werden'); }, document: { createElement: () => leinwand(() => 0) } } });
    env.Player.Canvas = leinwand(() => 0);
    const meldungen = [];
    env.g.__BCK_popupRef = { postMessage: (m) => meldungen.push(m) };
    env.lauf(code);
    expect(env.Player.Appearance.map((i) => i.Asset.Name)).toEqual(['ORIG']);
    expect(meldungen.length).toBe(1);
    expect(meldungen[0]).toMatchObject({ type: 'SCREENSHOT_DATA', reqId: 'wss_1' });
    expect(meldungen[0].err).toMatch(/^SPERRE_FAIL/);
  });
});

describe('Tool: ohne Sync-Sperre wird abgebrochen statt etwas anzulegen', () => {
  it('Auto-Screenshot der Profile stoppt', () => {
    const { ctx, opener } = tool();
    evalIn(ctx, `_slideshowRunning = true; _slideshowTotal = 3; _slideshowQueue = ['B', 'C'];
      _pendingProfileCapture['ps_1'] = { name: 'A', timeoutId: 0, t0: Date.now() };`);
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', err: 'SPERRE_FAIL: Sync-Sperre nicht möglich' }, { origin: BC, source: opener });
    expect(evalIn(ctx, '_slideshowRunning')).toBe(false);
  });

  it('andere Fehler der Profil-Aufnahme stoppen den Durchlauf NICHT', () => {
    const { ctx, opener } = tool();
    evalIn(ctx, `_slideshowRunning = true; _slideshowTotal = 3; _slideshowQueue = ['B', 'C'];
      _pendingProfileCapture['ps_1'] = { name: 'A', timeoutId: 0, t0: Date.now() };`);
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', err: 'Canvas leer' }, { origin: BC, source: opener });
    expect(evalIn(ctx, '_slideshowRunning')).toBe(true);
  });

  it('Bilderserie der Outfit-Scans: Queue geleert, Code nicht als kaputt markiert', () => {
    const { ctx, opener } = tool();
    evalIn(ctx, `_osCaptureQueue = [{ mk: '1', vIdx: 0 }, { mk: '2', vIdx: 0 }];
      _pendingOsCapture['os_1'] = { mk: '1', fp: 'fpA', vIdx: 0 };`);
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'os_1', err: 'SPERRE_FAIL: Sync-Sperre nicht möglich' }, { origin: BC, source: opener });
    expect(evalIn(ctx, '_osCaptureQueue.length')).toBe(0);
    expect(evalIn(ctx, "Object.keys(_osBrokenCodes).includes('1|fpA')")).toBe(false);
  });

  it('Wheel-Serie stoppt', () => {
    const { ctx, opener } = tool();
    evalIn(ctx, "_wheelGenRunning = true; _wheelGenQueue = []; _wheelGenTotal = 1; _pendingWheelShot['wss_1'] = 'fp';");
    dispatchMessage(ctx, { app: APP, type: 'SCREENSHOT_DATA', reqId: 'wss_1', err: 'SPERRE_FAIL: Sync-Sperre nicht möglich' }, { origin: BC, source: opener });
    expect(evalIn(ctx, '_wheelGenRunning')).toBe(false);
  });
});
