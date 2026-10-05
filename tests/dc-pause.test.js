import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';
import { makeLoaderSandbox } from './helpers/loaderSandbox.js';

// DC-Pause: Verliert BC die Verbindung zum Server ("Server connection lost" →
// Relog), bleibt die Bridge zum Tool bestehen. Der Loader meldet den Zustand,
// das Tool hält laufende Abläufe an und setzt sie erst fort, wenn BC wieder
// eingeloggt ist, – falls im Raum gestartet – wieder in einem Raum steht und
// das DC_SETTLE_MS lang stabil bleibt.

const BC = 'https://bc.test';
const APP = 'BCKonfigurator';

const ROOM    = { online: true,  loggedIn: true,  screen: 'ChatRoom',   inRoom: true,  room: 'Testraum' };
const HALL    = { online: true,  loggedIn: true,  screen: 'ChatSearch', inRoom: false, room: null };
const OFFLINE = { online: false, loggedIn: true,  screen: 'Relog',      inRoom: false, room: null };
const RELOG   = { online: true,  loggedIn: false, screen: 'Relog',      inRoom: false, room: null };

function boot(files = ['items.js']) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(files, { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  const send = (data) => dispatchMessage(ctx, { app: APP, ...data }, { origin: BC, source: opener });
  const state = (game) => send({ type: 'GAME_STATE', game });
  // Settle-Fenster "vorspulen": erste Auswertung setzt readySince, dann 6 s zurückdatieren
  const settle = (id) => {
    evalIn(ctx, '_raumRuheBis = 0');   // Zeit vorspulen: auch die Ruhe nach einem Raumwechsel ist vorbei
    evalIn(ctx, '_dcEvaluate()');
    evalIn(ctx, `_dcJobs[${JSON.stringify(id)}].readySince -= 6000`);
    evalIn(ctx, '_dcEvaluate()');
  };
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, els, send, state, settle, execs };
}

function silentConsole() {
  return { log() {}, info() {}, warn() {}, error() {}, debug() {} };
}

describe('Loader: Spiel-Server-Zustand', () => {
  it('online, eingeloggt, im Raum → inRoom + Raumname', () => {
    const { ctx } = makeLoaderSandbox({ extraGlobals: {
      ServerIsConnected: true, CurrentScreen: 'ChatRoom', ServerPlayerIsInChatRoom: () => true,
    } });
    expect(ctx.__BCK_gameState()).toEqual({ online: true, loggedIn: true, screen: 'ChatRoom', inRoom: true, room: 'Testraum' });
  });

  it('Server getrennt → offline, nie "im Raum"', () => {
    const { ctx } = makeLoaderSandbox({ extraGlobals: {
      ServerIsConnected: false, CurrentScreen: 'ChatRoom', ServerPlayerIsInChatRoom: () => true,
    } });
    const st = ctx.__BCK_gameState();
    expect(st.online).toBe(false);
    expect(st.inRoom).toBe(false);
    expect(st.room).toBe(null);
  });

  it('Relog-Screen → nicht eingeloggt', () => {
    const { ctx } = makeLoaderSandbox({ extraGlobals: { ServerIsConnected: true, CurrentScreen: 'Relog' } });
    expect(ctx.__BCK_gameState()).toMatchObject({ online: true, loggedIn: false, inRoom: false });
  });

  it('PLAYER_DATA trägt den Zustand mit', () => {
    const { posts, send } = makeLoaderSandbox({ extraGlobals: { ServerIsConnected: false } });
    send({ type: 'GET_PLAYER' });
    expect(posts[0].msg.type).toBe('PLAYER_DATA');
    expect(posts[0].msg.game.online).toBe(false);
  });
});

describe('Tool: Badge und Zustand', () => {
  it('PONG ohne Zustand (alter Loader) → wie bisher "Verbunden", Abläufe gelten als erlaubt', () => {
    const { ctx, els, send } = boot();
    send({ type: 'PONG' });
    expect(els.connStatus.textContent).toBe('Verbunden');
    expect(els.connStatus.dataset.conn).toBe('on');
    expect(evalIn(ctx, '_gameState')).toBe(null);
    expect(evalIn(ctx, '_gameOk(true)')).toBe(true);
  });

  it('Server getrennt → gelbes Badge; Relog → "BC: Relog…"; zurück → "Verbunden"', () => {
    const { els, send, state } = boot();
    send({ type: 'PONG', game: ROOM });
    state(OFFLINE);
    expect(els.connStatus.textContent).toBe('BC-Server getrennt');
    expect(els.connStatus.dataset.conn).toBe('warn');
    state(RELOG);
    expect(els.connStatus.textContent).toBe('BC: Relog…');
    state(ROOM);
    expect(els.connStatus.textContent).toBe('Verbunden');
    expect(els.connStatus.dataset.conn).toBe('on');
  });

  it('PLAYER_DATA aktualisiert den Zustand', () => {
    const { ctx, send } = boot();
    send({ type: 'PONG', game: ROOM });
    send({ type: 'PLAYER_DATA', memberNumber: 1, name: 'X', members: [], game: OFFLINE });
    expect(evalIn(ctx, '_gameState.online')).toBe(false);
  });
});

describe('Tool: Spiel-Server-Wächter', () => {
  let t;
  beforeEach(() => {
    t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, `
      var _tActive = true; var _tLog = [];
      _dcRegisterJob('t', { label: 'Test', active: () => _tActive,
        pause: (r) => _tLog.push('pause:' + r), resume: () => _tLog.push('resume') });
      _dcJobStart('t');`);
  });
  const log = () => evalIn(t.ctx, '_tLog.slice()');

  it('DC pausiert sofort, mit Grund', () => {
    t.state(OFFLINE);
    expect(log()).toEqual(['pause:BC-Server getrennt']);
    expect(evalIn(t.ctx, "_dcIsPaused('t')")).toBe(true);
    expect(t.els.statusMsg.textContent).toContain('pausiert');
  });

  it('wieder online, aber noch im Relog → wartet', () => {
    t.state(OFFLINE);
    t.state(RELOG);
    t.settle('t');
    expect(log()).toEqual(['pause:BC-Server getrennt']);
    expect(t.els.statusMsg.textContent).toContain('nicht wieder eingeloggt');
  });

  it('im Raum gestartet: eingeloggt, aber nicht im Raum → wartet weiter', () => {
    t.state(OFFLINE);
    t.state(HALL);
    t.settle('t');
    expect(log()).toEqual(['pause:BC-Server getrennt']);
    expect(t.els.statusMsg.textContent).toContain('nicht in einem Raum');
  });

  it('wieder im Raum → erst nach dem Settle-Fenster fortsetzen', () => {
    t.state(OFFLINE);
    t.state(ROOM);
    expect(log()).toEqual(['pause:BC-Server getrennt']);  // noch nicht stabil
    t.settle('t');
    expect(log()).toEqual(['pause:BC-Server getrennt', 'resume']);
    expect(evalIn(t.ctx, "_dcIsPaused('t')")).toBe(false);
    expect(t.els.statusMsg.textContent).toContain('Testraum');
  });

  it('kurzer Wackler während des Settle-Fensters setzt die Wartezeit zurück', () => {
    t.state(OFFLINE);
    t.state(ROOM);
    evalIn(t.ctx, "_dcJobs.t.readySince -= 6000");
    t.state(OFFLINE);
    t.state(ROOM);
    expect(log()).toEqual(['pause:BC-Server getrennt']);
  });

  it('außerhalb eines Raums gestartet → Raum ist keine Bedingung', () => {
    t.state(HALL);
    evalIn(t.ctx, "_dcJobStart('t')");
    t.state(OFFLINE);
    t.state(HALL);
    t.settle('t');
    expect(log()).toEqual(['pause:BC-Server getrennt', 'resume']);
  });

  it('im Raum gestartet, Raum freiwillig verlassen (kein DC) → läuft weiter', () => {
    t.state(HALL);
    expect(log()).toEqual([]);
  });

  it('alwaysRoom-Ablauf (Curse-Test-Art): Raum verlassen → pausiert, zurück im Raum → weiter', () => {
    evalIn(t.ctx, `
      _dcRegisterJob('r', { label: 'Raum', alwaysRoom: true, active: () => true,
        pause: (r) => _tLog.push('r-pause:' + r), resume: () => _tLog.push('r-resume') });
      _dcJobStart('r');`);
    t.state(HALL);
    expect(log()).toEqual(['r-pause:nicht in einem Raum']);
    t.state(ROOM);
    t.settle('r');
    // (der Standard-Ablauf 't' des Aufbaus pausiert beim Beitritt jetzt ebenfalls kurz – hier zählen nur die Einträge von 'r')
    expect(log().filter((x) => x.startsWith('r-'))).toEqual(['r-pause:nicht in einem Raum', 'r-resume']);
  });

  it('Bridge verloren → pausiert ebenfalls', () => {
    evalIn(t.ctx, '_connected = false; _dcEvaluate()');
    expect(log()).toEqual(['pause:Verbindung zum BC-Tab verloren']);
  });

  it('inaktiver Ablauf wird nie angefasst', () => {
    evalIn(t.ctx, '_tActive = false');
    t.state(OFFLINE);
    t.state(ROOM);
    t.settle('t');
    expect(log()).toEqual([]);
  });
});

describe('Ruhe nach freiwilligem Raumwechsel', () => {
  const ANDERER = { online: true, loggedIn: true, screen: 'ChatRoom', inRoom: true, room: 'Anderer Raum' };
  function mitAblauf() {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, `
      globalThis._tLog = [];
      _dcRegisterJob('s', { label: 'Serie', active: () => true,
        pause: (r) => _tLog.push('pause:' + r), resume: () => _tLog.push('resume') });
      _dcJobStart('s');`);
    return t;
  }
  const log = (t) => evalIn(t.ctx, '_tLog.slice()');

  it('Raumwechsel hält laufende Abläufe an und nennt den Grund', () => {
    const t = mitAblauf();
    t.state(ANDERER);
    expect(log(t).length).toBe(1);
    expect(log(t)[0]).toMatch(/^pause:Raumwechsel/);
  });

  it('weiter geht es erst nach der Ruhe UND dem Settle-Fenster, nicht schon nach dem Settle-Fenster allein', () => {
    const t = mitAblauf();
    t.state(ANDERER);
    evalIn(t.ctx, '_dcEvaluate()');
    evalIn(t.ctx, "_dcJobs['s'].readySince -= 6000");
    evalIn(t.ctx, '_dcEvaluate()');
    expect(log(t)).toEqual([expect.stringMatching(/^pause:/)]);   // Ruhe läuft noch → kein resume
    evalIn(t.ctx, '_raumRuheBis = 0');
    evalIn(t.ctx, '_dcEvaluate()');
    evalIn(t.ctx, "_dcJobs['s'].readySince -= 6000");
    evalIn(t.ctx, '_dcEvaluate()');
    expect(log(t)[1]).toBe('resume');
  });

  it('nach einem DC gibt es keine zusätzliche Ruhe (dort wartet DC_SETTLE_MS allein)', () => {
    const t = mitAblauf();
    t.state(OFFLINE);
    t.state(ROOM);
    expect(evalIn(t.ctx, '_raumRuheBis')).toBe(0);
    t.settle('s');
    expect(log(t)[1]).toBe('resume');
  });

  it('derselbe Raum (nur ein neuer Zustandsbericht) löst keine Ruhe aus', () => {
    const t = mitAblauf();
    t.state(ROOM);
    t.state(ROOM);
    expect(evalIn(t.ctx, '_raumRuheBis')).toBe(0);
    expect(log(t)).toEqual([]);
  });
});

describe('Disconnect-Popup (Einstellung)', () => {
  const open = (t) => t.els.dcPopup?.style.display === 'flex';

  it('standardmäßig an: DC öffnet das Popup, Rückkehr wird darin protokolliert', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, "_slideshowRunning = true; _slideshowQueue = ['A']; _dcJobStart('slideshow')");
    t.state(OFFLINE);
    expect(open(t)).toBe(true);
    expect(t.els.dcPopupTitle.textContent).toBe('⚠️ Verbindung getrennt');
    expect(t.els.dcPopupLog.textContent).toContain('BC-Server getrennt');
    expect(t.els.dcPopupLog.textContent).toContain('Auto-Screenshot pausiert');
    expect(t.els.dcPopupJobs.textContent).toContain('Auto-Screenshot');
    t.state(RELOG);
    t.state(ROOM);
    t.settle('slideshow');
    expect(t.els.dcPopupTitle.textContent).toBe('✅ Wieder verbunden');
    expect(t.els.dcPopupLog.textContent).toContain('Server wieder da – BC im Relog');
    expect(t.els.dcPopupLog.textContent).toContain('Auto-Screenshot läuft weiter');
    evalIn(t.ctx, 'dcPopupClose()');
    expect(open(t)).toBe(false);
  });

  it('aus: kein Popup, Einstellung wird gespeichert – Pausieren läuft trotzdem', () => {
    const t = boot();
    evalIn(t.ctx, 'dcPopupSetOn(false)');
    expect(t.ctx.localStorage.getItem('BC_DC_POPUP_v1')).toBe('0');
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, "_slideshowRunning = true; _slideshowQueue = ['A']; _dcJobStart('slideshow')");
    t.state(OFFLINE);
    expect(open(t)).toBe(false);
    expect(evalIn(t.ctx, '_slideshowPaused')).toBe(true);
  });

  it('kein Popup vor der ersten Verbindung und bei kurzer Bridge-Trennung ("🔄 Verbinden")', () => {
    const t = boot();
    evalIn(t.ctx, '_dcEvaluate()');
    expect(open(t)).toBe(false);
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, '_connected = false; _dcEvaluate()');
    expect(open(t)).toBe(false);
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, '_dcEvaluate()');
    expect(open(t)).toBe(false);
  });

  it('Bridge länger als 3 s weg → Popup', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, '_connected = false; _dcEvaluate(); _dcBridgeSince -= 4000; _dcEvaluate()');
    expect(open(t)).toBe(true);
    expect(t.els.dcPopupLog.textContent).toContain('Verbindung zum BC-Tab verloren');
  });

  it('Testen-Knopf zeigt das Popup', () => {
    const t = boot();
    evalIn(t.ctx, 'dcPopupTest()');
    expect(open(t)).toBe(true);
    expect(t.els.dcPopupLog.textContent).toContain('TEST');
  });
});

describe('Abläufe: laufender Schritt geht bei DC nicht verloren', () => {
  it('Auto-Screenshot: laufende Aufnahme zurück in die Queue, Fortsetzen sichert Original nur falls es fehlt', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, `_slideshowRunning = true; _slideshowQueue = ['B']; _dcJobStart('slideshow');
      _pendingProfileCapture['ps_1'] = { name: 'A', timeoutId: 0 };`);
    t.state(OFFLINE);
    expect(evalIn(t.ctx, '_slideshowPaused')).toBe(true);
    expect(evalIn(t.ctx, '_slideshowQueue.slice()')).toEqual(['A', 'B']);
    expect(evalIn(t.ctx, 'Object.keys(_pendingProfileCapture).length')).toBe(0);
    // Späte Antwort der verworfenen Aufnahme wird ignoriert
    t.send({ type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', data: 'data:image/jpeg;base64,xx' });
    evalIn(t.ctx, '_runNextSlideshow()');
    expect(evalIn(t.ctx, '_slideshowQueue.slice()')).toEqual(['A', 'B']);

    t.opener.postMessage.mockClear();
    t.state(ROOM);
    t.settle('slideshow');
    expect(evalIn(t.ctx, '_slideshowPaused')).toBe(false);
    expect(t.execs().some((c) => c.includes('if(!window.__BCU_slideshowOrig)window.__BCU_slideshowOrig='))).toBe(true);
  });

  it('Auto-Screenshot: Stop während DC schickt keinen Server-Sync', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, "_slideshowRunning = true; _slideshowQueue = ['A']; _dcJobStart('slideshow')");
    t.state(OFFLINE);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'toggleProfileSlideshow()');
    expect(evalIn(t.ctx, '_slideshowRunning')).toBe(false);
    expect(t.execs().some((c) => c.includes('ServerPlayerAppearanceSync'))).toBe(false);
  });

  it('LSCG-Bilderserie: laufende Aufnahme vorne wieder eingereiht, Serie steht bis zur Rückkehr', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, `_osCaptureRunning = true; _dcJobStart('osCapture');
      _osCaptureQueue = [{ mk: '6', vIdx: 0 }];
      _pendingOsCapture['os_1'] = { mk: '5', fp: 'x', vIdx: 2 };`);
    t.state(OFFLINE);
    expect(evalIn(t.ctx, '_osCaptureQueue.slice()')).toEqual([{ mk: '5', vIdx: 2 }, { mk: '6', vIdx: 0 }]);
    evalIn(t.ctx, '_runNextOsCapture()');
    expect(evalIn(t.ctx, '_osCaptureQueue.length')).toBe(2);
    expect(evalIn(t.ctx, '_osCaptureRunning')).toBe(true);
    t.state(ROOM);
    t.settle('osCapture');
    expect(evalIn(t.ctx, '_osCapturePaused')).toBe(false);
    expect(evalIn(t.ctx, '_osCaptureQueue.length')).toBe(1);  // nächster Eintrag wurde angestoßen
  });

  it('Wheel-Bilderserie: aktuelles Outfit zurück in die Queue, ausstehendes Foto verworfen', () => {
    const t = boot();
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, `_wheelGenRunning = true; _dcJobStart('wheelGen');
      _wheelGenQueue = [{ mn: 2, oi: 0 }]; _wheelGenJob = { mn: 1, oi: 3 };
      _wheelGenShotReq = 'wss_1'; _pendingWheelShot['wss_1'] = 'fp';`);
    const tok = evalIn(t.ctx, '_wheelGenTok');
    t.state(OFFLINE);
    expect(evalIn(t.ctx, '_wheelGenPaused')).toBe(true);
    expect(evalIn(t.ctx, '_wheelGenQueue.slice()')).toEqual([{ mn: 1, oi: 3 }, { mn: 2, oi: 0 }]);
    expect(evalIn(t.ctx, "'wss_1' in _pendingWheelShot")).toBe(false);
    expect(evalIn(t.ctx, '_wheelGenTok')).toBe(tok + 1);
    t.state(ROOM);
    t.settle('wheelGen');
    expect(evalIn(t.ctx, '_wheelGenPaused')).toBe(false);
  });

  it('Curse-Test: Ketten verworfen, "Weiter" während DC bleibt pausiert, Raum ist Pflicht', () => {
    const t = boot();
    t.send({ type: 'PONG', game: HALL });
    // Start außerhalb eines Raums ist nicht möglich
    evalIn(t.ctx, "CURSE_DB['k'] = { IstCursed: true, CraftName: 'X' }");
    evalIn(t.ctx, '_ctStart()');
    expect(evalIn(t.ctx, '_ctIdx')).toBe(-1);

    t.state(ROOM);
    evalIn(t.ctx, `_ctQueue = [{ dbKey: 'k', entry: {} }]; _ctIdx = 0; _dcJobStart('curseTest');
      _ctCurseActive = true; _ctReadyForCurse = true;`);
    const run = evalIn(t.ctx, '_ctRunId');
    t.state(OFFLINE);
    expect(evalIn(t.ctx, '_ctPaused')).toBe(true);
    expect(evalIn(t.ctx, '_ctCurseActive')).toBe(false);
    expect(evalIn(t.ctx, '_ctRunId')).toBe(run + 1);
    evalIn(t.ctx, 'curseTestPauseToggle()');
    expect(evalIn(t.ctx, '_ctPaused')).toBe(true);
    t.state(HALL);
    t.settle('curseTest');
    expect(evalIn(t.ctx, '_ctPaused')).toBe(true);   // kein Raum → wartet
    t.state(ROOM);
    t.settle('curseTest');
    expect(evalIn(t.ctx, '_ctPaused')).toBe(false);
  });

  it('Outfit-Import-Serie: letztes Outfit wird nach der Rückkehr wiederholt', () => {
    const t = boot(['items.js', 'outfit-import.js']);
    evalIn(t.ctx, 'renderOutfitImportTab = function () {}');  // DOM-Renderer braucht echte Elemente
    t.send({ type: 'PONG', game: ROOM });
    evalIn(t.ctx, "OI_LIST = [{code:'a'},{code:'b'},{code:'c'},{code:'d'}]; _oiSeqRunning = true; _oiSeqIdx = 3; _dcJobStart('oiSeq')");
    t.state(OFFLINE);
    expect(evalIn(t.ctx, '_oiSeqPaused')).toBe(true);
    expect(evalIn(t.ctx, '_oiSeqIdx')).toBe(2);
    evalIn(t.ctx, '_oiRunNext()');
    expect(evalIn(t.ctx, '_oiSeqIdx')).toBe(2);
    t.state(ROOM);
    t.settle('oiSeq');
    expect(evalIn(t.ctx, '_oiSeqPaused')).toBe(false);
  });
});

describe('Bot: setzt während DC/Relog aus', () => {
  function botPausiert() {
    const sb = { console: silentConsole(), btoa, atob, _money: undefined, _rankData: undefined, _shop: undefined, TOOL_ORIGIN: 'https://tool.test' };
    sb.window = sb;
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, 'bot-engine.js'), 'utf8'), sb, { filename: 'bot-engine.js' });
    const code = sb._buildBotCode({ id: 'b1', name: 'Bot', settings: { hearChat: true, modus: 'chat' }, triggers: [], events: [], szenen: [] });
    expect(() => new Function(code)).not.toThrow();
    expect(code).toContain('if(_botPausiert())return;');
    // Nur die Pausen-Logik ausführen – der restliche Bot-Code braucht das Spiel
    const a = code.indexOf('let _dcSeit=0');
    const b = code.indexOf('function _botPausiert(){', a);
    const e = code.indexOf('\n}\n', b);
    expect(a).toBeGreaterThan(-1);
    const game = { console: silentConsole(), ServerIsConnected: true, CurrentScreen: 'ChatRoom', ServerPlayerIsInChatRoom: () => game._imRaum, _imRaum: true, _now: 1000 };
    game.Date = { now: () => game._now };
    vm.createContext(game);
    vm.runInContext(code.slice(a, e + 3) + ';this._p=_botPausiert;', game);
    return game;
  }

  it('online → läuft; DC → pausiert; zurück, aber nicht im Raum → pausiert; im Raum → nach 5 s weiter', () => {
    const g = botPausiert();
    expect(g._p()).toBe(false);
    g.ServerIsConnected = false;
    expect(g._p()).toBe(true);
    g.ServerIsConnected = true; g._imRaum = false; g._now += 60000;
    expect(g._p()).toBe(true);
    g._imRaum = true;
    expect(g._p()).toBe(true);           // Settle beginnt
    g._now += 4000;
    expect(g._p()).toBe(true);
    g._now += 1500;
    expect(g._p()).toBe(false);
    expect(g._p()).toBe(false);
  });

  it('Relog-Screen zählt als getrennt', () => {
    const g = botPausiert();
    g.CurrentScreen = 'Relog';
    expect(g._p()).toBe(true);
  });

  it('ohne vorherigen DC ändert sich nichts (auch außerhalb eines Raums)', () => {
    const g = botPausiert();
    g._imRaum = false;
    expect(g._p()).toBe(false);
  });
});
