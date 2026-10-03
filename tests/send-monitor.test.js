import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';
import { makeLoaderSandbox, makeBcModSdkMock, LOADER_TOOL_ORIGIN, APP } from './helpers/loaderSandbox.js';

// Sende-Monitor: Der Loader zählt, was BC an den Server SENDET (Typ, Unterart,
// Aufrufer – nie Nachrichtentexte), und hält bei einer Trennung
// (ForceDisconnect/disconnect, z. B. "ErrorRateLimited") den Ablauf der letzten
// Sekunden fest. Das Tool zeigt den Bericht unter Einstellungen → Werkzeuge.

function bootLoader() {
  const hooks = [];
  const sockets = {};
  const base = makeBcModSdkMock();
  const bcModSdk = {
    ...base,
    registerMod(info) {
      base.registerMod(info);
      return { hookFunction(fn, prio, cb) { hooks.push({ mod: info.name, fn, prio, cb }); }, patchFunction() {}, removeHook() {} };
    },
  };
  const ServerSocket = { on(ev, cb) { (sockets[ev] ||= []).push(cb); }, off() {} };
  const sb = makeLoaderSandbox({ extraGlobals: { bcModSdk, ServerSocket } });
  const hook = hooks.find((h) => h.mod === 'BCK_SendMonitor' && h.fn === 'ServerSend');
  return { sb, hooks, hook, sockets };
}

function senden(hook, typ, data) {
  const next = vi.fn(() => 'weiter');
  const r = hook.cb([typ, data], next);
  return { r, next };
}

describe('Sende-Monitor (Loader): Hook', () => {
  it('hängt als eigener Mod mit niedrigster Priorität an ServerSend', () => {
    const { hook } = bootLoader();
    expect(hook).toBeTruthy();
    expect(hook.prio).toBeLessThan(0);
  });

  it('reicht jede Nachricht unverändert weiter und liefert das Ergebnis zurück', () => {
    const { hook } = bootLoader();
    const data = { Type: 'Chat', Content: 'geheim' };
    const { r, next } = senden(hook, 'ChatRoomChat', data);
    expect(r).toBe('weiter');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0][0]).toBe('ChatRoomChat');
    expect(next.mock.calls[0][0][1]).toBe(data);
  });

  it('zählt nach Typ und Unterart – ohne Nachrichtentexte', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'ChatRoomChat', { Type: 'Chat', Content: 'streng geheimer Text' });
    senden(hook, 'ChatRoomChat', { Type: 'Whisper', Content: 'noch geheimer', Target: 5 });
    senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'BCXMsg', Target: 5 });
    senden(hook, 'AccountUpdate', { Appearance: [], ExtensionSettings: {} });
    senden(hook, 'ChatRoomSearch', { Query: 'mein Raumname' });

    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.gesamt).toBe(5);
    expect(snap.nachTyp).toMatchObject({ ChatRoomChat: 3, AccountUpdate: 1, ChatRoomSearch: 1 });
    const subs = snap.ring.map((e) => e.sub);
    expect(subs).toEqual(['Chat', 'Whisper', 'Hidden:BCXMsg', 'Appearance,ExtensionSettings', '']);

    const roh = JSON.stringify(snap);
    expect(roh).not.toContain('geheim');
    expect(roh).not.toContain('Raumname');
  });

  it('ein werfender Monitor blockiert das Senden nie', () => {
    const { hook } = bootLoader();
    const bad = { get Type() { throw new Error('boom'); } };
    const { r, next } = senden(hook, 'ChatRoomChat', bad);
    expect(r).toBe('weiter');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('Ringpuffer bleibt begrenzt, der Gesamtzähler zählt weiter', () => {
    const { sb, hook } = bootLoader();
    for (let i = 0; i < 450; i++) senden(hook, 'AccountUpdate', {});
    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.gesamt).toBe(450);
    expect(sb.ctx.__BCK_SENDLOG.ring.length).toBe(400);
    expect(snap.ring.length).toBe(150);
  });

  it('Spitze: Sendungen in einem 1-s-Fenster', () => {
    const { sb, hook } = bootLoader();
    for (let i = 0; i < 7; i++) senden(hook, 'ChatRoomCharacterUpdate', {});
    expect(sb.ctx.__BCK_sendMonSnapshot().spitze.n).toBe(7);
  });

  it('Konsolen-Warnung ab der Schwelle, danach nicht bei jeder Nachricht', () => {
    const warn = vi.fn();
    const hooks = [];
    const base = makeBcModSdkMock();
    const bcModSdk = { ...base, registerMod(info) { base.registerMod(info); return { hookFunction(fn, prio, cb) { hooks.push({ mod: info.name, cb }); } }; } };
    makeLoaderSandbox({ console: { log() {}, info() {}, error() {}, debug() {}, warn }, extraGlobals: { bcModSdk } });
    const hook = hooks.find((h) => h.mod === 'BCK_SendMonitor');
    for (let i = 0; i < 25; i++) hook.cb(['AccountUpdate', {}], () => {});
    const meldungen = warn.mock.calls.filter((c) => String(c[0]).includes('[WARN]') && c.slice(2).join(' ').includes('SendMonitor'));
    expect(meldungen.length).toBe(1);
    expect(meldungen[0].slice(2).join(' ')).toContain('AccountUpdate');
  });
});

describe('Sende-Monitor (Loader): Trennung', () => {
  it('ForceDisconnect hält Grund, Anzahl und Ablauf fest', () => {
    const { sb, hook, sockets } = bootLoader();
    sb.ctx.__BCK_sendMonState({ online: true, screen: 'ChatSearch', room: null });
    for (let i = 0; i < 12; i++) senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'BCXMsg' });
    senden(hook, 'ChatRoomSearch', {});

    expect(sockets.ForceDisconnect?.length).toBe(1);
    sockets.ForceDisconnect[0]('ErrorRateLimited');

    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.vorfaelle.length).toBe(1);
    const v = snap.vorfaelle[0];
    expect(v.grund).toBe('ForceDisconnect: ErrorRateLimited');
    expect(v.n10).toBe(13);
    expect(v.spitze10.n).toBe(13);
    expect(v.top[0].was).toContain('ChatRoomChat:Hidden:BCXMsg');
    expect(v.top[0].n).toBe(12);
    expect(v.lauf.some((e) => e.k === 'state' && e.screen === 'ChatSearch')).toBe(true);
  });

  it('ForceDisconnect + disconnect kurz hintereinander sind ein Vorfall; der erste Grund bleibt', () => {
    const { sb, sockets } = bootLoader();
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    sockets.disconnect[0]('io server disconnect');
    const v = sb.ctx.__BCK_sendMonSnapshot().vorfaelle;
    expect(v.length).toBe(1);
    expect(v[0].grund).toBe('ForceDisconnect: ErrorRateLimited');
  });

  it('meldet die Trennung ans Tool-Fenster – nur an den Tool-Origin', () => {
    const { sb, sockets } = bootLoader();
    const popup = { closed: false, postMessage: vi.fn() };
    sb.ctx.__BCK_popupRef = popup;
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    expect(popup.postMessage).toHaveBeenCalledTimes(1);
    const [msg, origin] = popup.postMessage.mock.calls[0];
    expect(msg).toMatchObject({ app: APP, type: 'SEND_MON_VORFALL', grund: 'ForceDisconnect: ErrorRateLimited' });
    expect(origin).toBe(LOADER_TOOL_ORIGIN);
  });
});

describe('Sende-Monitor (Loader): GET_SEND_LOG', () => {
  it('antwortet mit dem Snapshot an den Tool-Origin', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'AccountUpdate', { Appearance: [] });
    sb.send({ type: 'GET_SEND_LOG' });
    const antwort = sb.posts.find((p) => p.msg.type === 'SEND_LOG_DATA');
    expect(antwort).toBeTruthy();
    expect(antwort.origin).toBe(LOADER_TOOL_ORIGIN);
    expect(antwort.msg.log.gesamt).toBe(1);
  });

  it('fremder Origin bekommt keine Antwort', () => {
    const { sb } = bootLoader();
    sb.send({ type: 'GET_SEND_LOG' }, { origin: 'https://evil.test' });
    expect(sb.posts.find((p) => p.msg.type === 'SEND_LOG_DATA')).toBeUndefined();
  });
});

// ── Tool-Seite ────────────────────────────────────────────────────────────

const BC = 'https://bc.test';

function bootTool() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  const send = (data) => dispatchMessage(ctx, { app: APP, ...data }, { origin: BC, source: opener });
  send({ type: 'PONG' }); // Handshake
  opener.postMessage.mockClear();
  return { ctx, opener, els, send };
}

const LOG = {
  jetzt: Date.now(), seit: Date.now() - 60000, gesamt: 42, spitze: { n: 14, t: Date.now() - 5000 }, warnAb: 10,
  nachTyp: { ChatRoomChat: 30, AccountUpdate: 12 }, nachQuelle: { eval: 20, 'ChatRoom.js': 22 },
  ring: [
    { t: Date.now() - 2000, k: 'send', typ: 'AccountUpdate', sub: 'Appearance', quelle: 'eval', screen: 'ChatRoom' },
    { t: Date.now() - 1000, k: 'state', online: false, screen: 'Relog', room: null },
  ],
  vorfaelle: [{
    t: Date.now() - 1000, grund: 'ForceDisconnect: ErrorRateLimited', n10: 47, spitze10: { n: 18, t: Date.now() - 3000 },
    top: [{ was: 'ChatRoomChat:Hidden:BCXMsg [eval]', n: 12 }],
    lauf: [
      { t: Date.now() - 4000, k: 'state', online: true, screen: 'ChatSearch', room: null },
      { t: Date.now() - 3000, k: 'send', typ: 'ChatRoomSearch', sub: '', quelle: 'ChatSearch.js', screen: 'ChatSearch' },
    ],
  }],
};

describe('Sende-Monitor (Tool): Bericht', () => {
  it('SEND_LOG_DATA füllt die Karte; Trennung, Hauptsender und Ablauf stehen im Text', () => {
    const { ctx, els, send } = bootTool();
    send({ type: 'SEND_LOG_DATA', log: LOG });
    const text = els.sendMonInfo.textContent;
    expect(text).toContain('Gesendet seit Start: 42');
    expect(text).toContain('Spitze: 14 in 1 s');
    expect(text).toContain('TRENNUNGEN (1)');
    expect(text).toContain('ForceDisconnect: ErrorRateLimited');
    expect(text).toContain('12× ChatRoomChat:Hidden:BCXMsg [eval]');
    expect(text).toContain('Zustand: ChatSearch');
    expect(text).toContain('ChatRoomSearch [ChatSearch.js] (ChatSearch)');
    expect(text).toContain('GETRENNT · Relog');
    expect(evalIn(ctx, '_sendMonText(_sendMonLog)')).toBe(text);
  });

  it('ohne Daten gibt es einen Hinweis statt eines Fehlers', () => {
    const { ctx } = bootTool();
    expect(evalIn(ctx, '_sendMonText(null)')).toContain('Aktualisieren');
  });

  it('Aktualisieren fragt GET_SEND_LOG an; ohne Verbindung nicht', () => {
    const { ctx, opener } = bootTool();
    ctx.sendMonRefresh();
    expect(opener.postMessage).toHaveBeenCalledWith({ app: APP, type: 'GET_SEND_LOG' }, BC);
    evalIn(ctx, '_connected = false');
    opener.postMessage.mockClear();
    ctx.sendMonRefresh();
    expect(opener.postMessage).not.toHaveBeenCalled();
  });

  it('SEND_MON_VORFALL zeigt eine Meldung und holt den Bericht gleich ab', () => {
    const { opener, els, send } = bootTool();
    send({ type: 'SEND_MON_VORFALL', grund: 'ForceDisconnect: ErrorRateLimited', n10: 47, spitze10: 18 });
    expect(els.statusMsg.textContent).toContain('ErrorRateLimited');
    expect(opener.postMessage).toHaveBeenCalledWith({ app: APP, type: 'GET_SEND_LOG' }, BC);
  });

  it('Nachrichten von fremdem Origin ändern den Bericht nicht', () => {
    const { ctx, opener, els } = bootTool();
    dispatchMessage(ctx, { app: APP, type: 'SEND_LOG_DATA', log: LOG }, { origin: 'https://evil.example', source: opener });
    expect(els.sendMonInfo?.textContent || '').not.toContain('Gesendet seit Start');
  });
});

describe('Sende-Monitor (Loader): Aufrufer-Erkennung', () => {
  // Der Aufrufer kommt aus dem Stack: Dateiname ohne Query, bcmodsdk/Server.js
  // übersprungen, vom Tool eingespielter Code (new Function) heißt "eval".
  function quelleVon(code, filename) {
    const { sb, hook } = bootLoader();
    sb.ctx.__cb = hook.cb;   // direkt, ohne Wrapper aus dieser Datei im Stack
    const echt = code.replace(/__hook\("([^"]*)"\)/g, '__cb(["$1",{}],function(){})');
    vm.runInContext(echt, sb.ctx, { filename });
    const ring = sb.ctx.__BCK_sendMonSnapshot().ring;
    return ring[ring.length - 1].quelle;
  }

  it('BC-Datei: Name ohne Pfad und ohne ?v=…', () => {
    const q = quelleVon('function ChatRoomCharacterUpdate(){ __hook("ChatRoomCharacterUpdate"); } ChatRoomCharacterUpdate();',
      'https://www.bondage-europe.com/R132/BondageClub/Scripts/ChatRoom.js?v=123');
    expect(q.split(' ← ')[0]).toBe('ChatRoom.js');
  });

  it('Mod-Datei mit Query (bcplus.js?v=…)', () => {
    const q = quelleVon('function syncen(){ __hook("ChatRoomChat"); } syncen();', 'https://x.test/bcplus.js?v=1791066372355');
    expect(q.split(' ← ')[0]).toBe('bcplus.js');
  });

  it('bcmodsdk.min.js und Server.js zählen nicht als Aufrufer', () => {
    const q = quelleVon(
      'function ServerSend2(){ __hook("AccountUpdate"); } ServerSend2();',
      'https://www.bondage-europe.com/R132/BondageClub/Scripts/Server.js');
    expect(q.split(' ← ')).not.toContain('Server.js');
    const q2 = quelleVon('function i(){ __hook("AccountUpdate"); } i();', 'https://x.test/bcmodsdk.min.js');
    expect(q2.split(' ← ')).not.toContain('bcmodsdk.min.js');
  });

  it('new Function (EXEC/Bots) heißt eval', () => {
    const q = quelleVon("new Function('__cb([\"ChatRoomChat\",{}],function(){})')();", 'https://x.test/loader.js?_=1');
    expect(q.split(' ← ')[0]).toBe('eval');
  });

  it('Kette hat höchstens drei Stationen', () => {
    const q = quelleVon(
      'function a(){__hook("X")} function b(){a()} function c(){b()} function d(){c()} d();', 'https://x.test/ketten.js');
    expect(q.split(' ← ').length).toBeLessThanOrEqual(3);
  });
});
