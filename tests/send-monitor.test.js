import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';
import { makeLoaderSandbox, makeBcModSdkMock, LOADER_TOOL_ORIGIN, APP } from './helpers/loaderSandbox.js';

// Sende-Monitor: Der Loader zählt, was BC an den Server SENDET (Typ, Unterart,
// Aufrufer – nie Nachrichtentexte), und hält bei einer Trennung
// (ServerDisconnect/ForceDisconnect/disconnect, z. B. "ErrorRateLimited") den
// Ablauf der letzten Sekunden fest. Das Tool zeigt den Bericht unter
// Einstellungen → Werkzeuge.

function bootLoader(opts = {}) {
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
  const emitOrig = vi.fn(() => 'emit-ergebnis');
  const ServerSocket = { on(ev, cb) { (sockets[ev] ||= []).push(cb); }, off() {}, emit: emitOrig };
  const sb = makeLoaderSandbox({
    manualTimers: opts.manualTimers,
    extraGlobals: { bcModSdk, ServerSocket, ...(opts.globals || {}) },
  });
  const hook = hooks.find((h) => h.mod === 'BCK_SendMonitorV2' && h.fn === 'ServerSend');
  const dcHook = hooks.find((h) => h.mod === 'BCK_SendMonitorV2' && h.fn === 'ServerDisconnect');
  return { sb, hooks, hook, dcHook, sockets, emitOrig, ServerSocket };
}

function senden(hook, typ, data) {
  const next = vi.fn(() => 'weiter');
  const r = hook.cb([typ, data], next);
  return { r, next };
}

describe('Sende-Monitor (Loader): Hook', () => {
  it('hängt als eigener Mod mit niedrigster Priorität an ServerSend und ServerDisconnect', () => {
    const { hook, dcHook } = bootLoader();
    expect(hook).toBeTruthy();
    expect(hook.prio).toBeLessThan(0);
    expect(dcHook).toBeTruthy();
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
    expect(snap.ring.map((e) => e.sub)).toEqual(['Chat', 'Whisper', 'Hidden:BCXMsg', 'Appearance,ExtensionSettings', '']);

    const roh = JSON.stringify(snap);
    expect(roh).not.toContain('geheim');
    expect(roh).not.toContain('Raumname');
  });

  it('Hidden: nur der Mod-Name, die Nutzdaten dahinter bleiben draußen', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'LikoAEE:status:{"type":"request"' });
    senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'KIKILINK/1 {"t":"pq","i":"-8d9f-' });
    senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'AFC::Sync' });
    const subs = sb.ctx.__BCK_sendMonSnapshot().ring.map((e) => e.sub);
    expect(subs).toEqual(['Hidden:LikoAEE', 'Hidden:KIKILINK/1', 'Hidden:AFC']);
    expect(JSON.stringify(sb.ctx.__BCK_sendMonSnapshot())).not.toContain('8d9f');
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
    expect(sb.ctx.__BCK_SENDLOG2.ring.length).toBe(400);
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
    const bcModSdk = { ...base, registerMod(info) { base.registerMod(info); return { hookFunction(fn, prio, cb) { hooks.push({ mod: info.name, fn, cb }); } }; } };
    makeLoaderSandbox({ console: { log() {}, info() {}, error() {}, debug() {}, warn }, extraGlobals: { bcModSdk } });
    const hook = hooks.find((h) => h.mod === 'BCK_SendMonitorV2' && h.fn === 'ServerSend');
    for (let i = 0; i < 25; i++) hook.cb(['AccountUpdate', {}], () => {});
    const meldungen = warn.mock.calls.filter((c) => String(c[0]).includes('[WARN]') && c.slice(2).join(' ').includes('SendMonitor'));
    expect(meldungen.length).toBe(1);
    expect(meldungen[0].slice(2).join(' ')).toContain('AccountUpdate');
  });

  it('meldet BCs eigenes Limit und die Warteschlange', () => {
    const { sb } = bootLoader({ globals: { ServerSendRateLimit: 5, ServerSendRateLimitInterval: 1000, ServerSendQueue: [1, 2, 3] } });
    expect(sb.ctx.__BCK_sendMonSnapshot().bc).toEqual({ limit: 5, intervall: 1000, warteschlange: 3 });
  });

  it('ohne diese BC-Globals: null statt Fehler', () => {
    const { sb } = bootLoader();
    expect(sb.ctx.__BCK_sendMonSnapshot().bc).toEqual({ limit: null, intervall: null, warteschlange: null });
  });
});

describe('Sende-Monitor (Loader): identische Wiederholungen', () => {
  // Gemessen wird nur, ob eine Sendung dasselbe enthält wie die vorige gleicher Art –
  // das Senden selbst bleibt unverändert.
  const ring = (sb) => sb.ctx.__BCK_sendMonSnapshot().ring;

  it('zweimal derselbe AccountUpdate-Inhalt: die zweite Sendung ist eine Wiederholung', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'AccountUpdate', { 'ExtensionSettings.WCEOverrides': 'x' });
    senden(hook, 'AccountUpdate', { 'ExtensionSettings.WCEOverrides': 'x' });
    expect(ring(sb).map((e) => e.dup)).toEqual([false, true]);
    const d = sb.ctx.__BCK_sendMonSnapshot().dup;
    expect(d.gesamt).toBe(1);
    expect(d.nachTyp).toEqual({ AccountUpdate: 1 });
    expect(d.von).toEqual({ AccountUpdate: 2 });
  });

  it('geänderter Inhalt dazwischen: die Wiederholung von früher zählt nicht (A, B, A)', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'AccountUpdate', { Appearance: ['A'] });
    senden(hook, 'AccountUpdate', { Appearance: ['B'] });
    senden(hook, 'AccountUpdate', { Appearance: ['A'] });
    expect(ring(sb).map((e) => e.dup)).toEqual([false, false, false]);
  });

  it('verschiedene Felder sind verschiedene Arten: jede wird mit ihrer eigenen Vorgängerin verglichen', () => {
    const { sb, hook } = bootLoader();
    for (let i = 0; i < 3; i++) {
      senden(hook, 'AccountUpdate', { 'ExtensionSettings.WCEOverrides': 'x' });
      senden(hook, 'AccountUpdate', { Appearance: ['A'] });
    }
    // Paare wie im echten Bericht: ab dem zweiten Durchlauf sind beide Wiederholungen
    expect(ring(sb).map((e) => e.dup)).toEqual([false, false, true, true, true, true]);
  });

  it('nur bestimmte Typen werden verglichen – Chat zählt nie als Wiederholung', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'ChatRoomChat', { Type: 'Chat', Content: 'hallo' });
    senden(hook, 'ChatRoomChat', { Type: 'Chat', Content: 'hallo' });
    expect(ring(sb).map((e) => e.dup)).toEqual([false, false]);
    expect(sb.ctx.__BCK_sendMonSnapshot().dup.von).toEqual({});
  });

  it('nach einer Trennung gilt nichts mehr als schon gesendet', () => {
    const { sb, hook, sockets } = bootLoader();
    senden(hook, 'AccountUpdate', { Appearance: ['A'] });
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    senden(hook, 'AccountUpdate', { Appearance: ['A'] });
    expect(ring(sb).map((e) => e.dup)).toEqual([false, false]);
  });

  it('ein Inhalt, der sich nicht serialisieren lässt, wird nicht als Wiederholung gewertet und blockiert nichts', () => {
    const { sb, hook } = bootLoader();
    const kreis = {}; kreis.selbst = kreis;
    const { r, next } = senden(hook, 'AccountUpdate', kreis);
    expect(r).toBe('weiter');
    expect(next).toHaveBeenCalledTimes(1);
    expect(ring(sb)[0].dup).toBe(false);
  });

  it('Trennung zählt die Wiederholungen der letzten 10 s; der Bericht enthält nie Inhalte', () => {
    const { sb, hook, sockets } = bootLoader();
    for (let i = 0; i < 5; i++) senden(hook, 'AccountUpdate', { Appearance: ['sehr-privater-Inhalt'] });
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.vorfaelle[0].dup10).toBe(4);
    expect(JSON.stringify(snap)).not.toContain('privater');
  });
});

describe('Sende-Monitor (Loader): Leitung (socket.emit)', () => {
  it('zählt Emits, lässt Argumente und Rückgabe unverändert', () => {
    const { sb, ServerSocket, emitOrig } = bootLoader();
    const r = ServerSocket.emit('ChatRoomChat', { Type: 'Chat' });
    expect(r).toBe('emit-ergebnis');
    expect(emitOrig).toHaveBeenCalledWith('ChatRoomChat', { Type: 'Chat' });
    ServerSocket.emit('AccountUpdate', {});
    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.leitung.aktiv).toBe(true);
    expect(snap.leitung.gesamt).toBe(2);
    expect(snap.leitung.spitze.n).toBe(2);
  });

  it('socket.io-eigene Ereignisse (connect, disconnect …) zählen nicht', () => {
    const { sb, ServerSocket } = bootLoader();
    ServerSocket.emit('connect');
    ServerSocket.emit('disconnect', 'x');
    expect(sb.ctx.__BCK_sendMonSnapshot().leitung.gesamt).toBe(0);
  });

  it('ohne emit am Socket: nicht gemessen, kein Absturz', () => {
    const sb = makeLoaderSandbox({ extraGlobals: { ServerSocket: { on() {}, off() {} } } });
    expect(sb.ctx.__BCK_sendMonSnapshot().leitung.aktiv).toBe(false);
  });
});

describe('Sende-Monitor (Loader): Trennung', () => {
  it('ForceDisconnect hält Grund, Anzahl und Ablauf fest', () => {
    const { sb, hook, sockets, ServerSocket } = bootLoader();
    sb.ctx.__BCK_sendMonState({ online: true, screen: 'ChatSearch', room: null });
    for (let i = 0; i < 12; i++) { senden(hook, 'ChatRoomChat', { Type: 'Hidden', Content: 'BCXMsg' }); ServerSocket.emit('ChatRoomChat', {}); }
    senden(hook, 'ChatRoomSearch', {});

    expect(sockets.ForceDisconnect?.length).toBe(1);
    sockets.ForceDisconnect[0]('ErrorRateLimited');

    const v = sb.ctx.__BCK_sendMonSnapshot().vorfaelle[0];
    expect(v.grund).toBe('ForceDisconnect: ErrorRateLimited');
    expect(v.n10).toBe(13);
    expect(v.spitze10.n).toBe(13);
    expect(v.leitung10).toBe(12);
    expect(v.leitungSpitze10.n).toBe(12);
    expect(v.top[0].was).toContain('ChatRoomChat:Hidden:BCXMsg');
    expect(v.top[0].n).toBe(12);
    expect(v.lauf.some((e) => e.k === 'state' && e.screen === 'ChatSearch')).toBe(true);
  });

  it('ServerDisconnect liefert den Grund aus dem ersten Aufruf und reicht ihn unverändert weiter', () => {
    const { sb, dcHook } = bootLoader();
    const next = vi.fn(() => 'dc-weiter');
    expect(dcHook.cb(['ErrorRateLimited', true], next)).toBe('dc-weiter');
    expect(next).toHaveBeenCalledWith(['ErrorRateLimited', true]);
    expect(sb.ctx.__BCK_sendMonSnapshot().vorfaelle[0].grund).toBe('ServerDisconnect: ErrorRateLimited');
  });

  it('ServerDisconnect ohne Angabe wird als solche benannt', () => {
    const { sb, dcHook } = bootLoader();
    dcHook.cb([], () => {});
    expect(sb.ctx.__BCK_sendMonSnapshot().vorfaelle[0].grund).toBe('ServerDisconnect: (ohne Angabe)');
  });

  it('kommt "disconnect" vor ForceDisconnect (BC ruft intern disconnect() auf), bleibt der echte Grund erhalten', () => {
    const { sb, sockets } = bootLoader();
    sockets.disconnect[0]('io client disconnect');
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    const v = sb.ctx.__BCK_sendMonSnapshot().vorfaelle;
    expect(v.length).toBe(1);
    expect(v[0].grund).toBe('ForceDisconnect: ErrorRateLimited | disconnect: io client disconnect');
  });

  it('ForceDisconnect + disconnect in der anderen Reihenfolge: gleicher Bericht', () => {
    const { sb, sockets } = bootLoader();
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    sockets.disconnect[0]('io server disconnect');
    sockets.disconnect[0]('io server disconnect');
    const v = sb.ctx.__BCK_sendMonSnapshot().vorfaelle;
    expect(v.length).toBe(1);
    expect(v[0].grund).toBe('ForceDisconnect: ErrorRateLimited | disconnect: io server disconnect');
  });

  it('meldet die Trennung ans Tool-Fenster – verzögert, nur an den Tool-Origin, mit dem gesammelten Grund', () => {
    const { sb, sockets } = bootLoader({ manualTimers: true });
    const popup = { closed: false, postMessage: vi.fn() };
    sb.ctx.__BCK_popupRef = popup;
    sockets.disconnect[0]('io client disconnect');
    sockets.ForceDisconnect[0]('ErrorRateLimited');
    expect(popup.postMessage).not.toHaveBeenCalled();
    sb.runUntil(() => popup.postMessage.mock.calls.length > 0);
    expect(popup.postMessage).toHaveBeenCalledTimes(1);
    const [msg, origin] = popup.postMessage.mock.calls[0];
    expect(msg).toMatchObject({ app: APP, type: 'SEND_MON_VORFALL' });
    expect(msg.grund).toContain('ForceDisconnect: ErrorRateLimited');
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

describe('Sende-Monitor (Loader): Bild-Aufnahme markieren', () => {
  it('Sendungen während der Sync-Sperre (Aufnahme) sind markiert und werden gezählt, andere nicht', () => {
    const { sb, hook } = bootLoader();
    senden(hook, 'ChatRoomChat', {});
    sb.ctx.__BCU_sperreBis = Date.now() + 30000;
    senden(hook, 'ChatRoomChat', {});
    senden(hook, 'ChatRoomCharacterExpressionUpdate', {});
    sb.ctx.__BCU_sperreBis = 0;
    senden(hook, 'ChatRoomChat', {});
    const snap = sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.waehrendAufnahme).toBe(2);
    expect(snap.ring.map((e) => !!e.aufnahme)).toEqual([false, true, true, false]);
  });
});

describe('Sende-Monitor (Loader): Aufrufer-Erkennung', () => {
  // Der Aufrufer kommt aus dem Stack: Dateiname ohne Query, bcmodsdk/Server.js
  // übersprungen, vom Tool eingespielter Code (new Function in loader.js) heißt
  // "eval@loader.js" und ist als Tool-Sendung markiert.
  function lauf(skripte, aufruf) {
    const b = bootLoader();
    b.sb.ctx.__cb = b.hook.cb;   // direkt, ohne Wrapper aus dieser Datei im Stack
    for (const [filename, code] of skripte) {
      vm.runInContext(code.replace(/__hook\("([^"]*)"\)/g, '__cb(["$1",{}],function(){})'), b.sb.ctx, { filename });
    }
    vm.runInContext(aufruf, b.sb.ctx, { filename: 'https://x.test/start.js' });
    return b.sb;
  }
  function letzte(sb) {
    const ring = sb.ctx.__BCK_sendMonSnapshot().ring;
    return ring[ring.length - 1];
  }

  it('BC-Datei: Name ohne Pfad und ohne ?v=…', () => {
    const sb = lauf([['https://www.bondage-europe.com/R132/BondageClub/Scripts/ChatRoom.js?v=123',
      'function ChatRoomCharacterUpdate(){ __hook("ChatRoomCharacterUpdate"); }']], 'ChatRoomCharacterUpdate();');
    expect(letzte(sb).quelle.split(' ← ')[0]).toBe('ChatRoom.js');
    expect(letzte(sb).tool).toBe(false);
  });

  it('Mod-Datei mit Query (bcplus.js?v=…)', () => {
    const sb = lauf([['https://x.test/bcplus.js?v=1791066372355', 'function syncen(){ __hook("ChatRoomChat"); }']], 'syncen();');
    expect(letzte(sb).quelle.split(' ← ')[0]).toBe('bcplus.js');
  });

  it('bcmodsdk.min.js und Server.js zählen nicht als Aufrufer', () => {
    const sb = lauf([
      ['https://www.bondage-europe.com/R132/BondageClub/Scripts/Server.js', 'function ServerSend2(){ __hook("AccountUpdate"); }'],
      ['https://x.test/bcmodsdk.min.js', 'function i(){ ServerSend2(); }'],
    ], 'i();');
    const teile = letzte(sb).quelle.split(' ← ');
    expect(teile).not.toContain('Server.js');
    expect(teile).not.toContain('bcmodsdk.min.js');
  });

  it('new Function in loader.js (EXEC/Bots) heißt eval@loader.js und ist als Tool markiert', () => {
    const sb = lauf([['https://x.test/loader.js?_=1', "function exec(){ new Function('__cb([\"ChatRoomChat\",{}],function(){}) /*fall-1*/')(); }"]], 'exec();');
    expect(letzte(sb).quelle.split(' ← ')[0]).toBe('eval@loader.js');
    expect(letzte(sb).tool).toBe(true);
    expect(sb.ctx.__BCK_sendMonSnapshot().vomTool).toBe(1);
  });

  it('eval aus ModSDK-Patches ist kein Tool und kein Aufrufer', () => {
    const sb = lauf([['https://x.test/bcmodsdk.min.js', "function patch(){ new Function('__cb([\"ChatRoomChat\",{}],function(){}) /*fall-2*/')(); }"]], 'patch();');
    expect(letzte(sb).tool).toBe(false);
    expect(letzte(sb).quelle).not.toContain('bcmodsdk');
  });

  it('Kette hat höchstens drei Stationen in der Anzeige', () => {
    const sb = lauf([['https://x.test/ketten.js',
      'function a(){__hook("X")} function b(){a()} function c(){b()} function d(){c()}']], 'd();');
    expect(letzte(sb).quelle.split(' ← ').length).toBeLessThanOrEqual(3);
  });

  it('der Hook der Sync-Sperre (BCU_SperreHook, per new Function eingespielt) macht nicht jede Sendung zur Tool-Sendung', () => {
    // Stack von innen nach außen: Monitor-Hook ← BCU_SperreHook (eval@loader.js) ← ChatRoom.js
    const sb = lauf([
      ['https://x.test/loader.js?_=1', "var sperre = new Function('return function BCU_SperreHook(){ __cb([\\\"ChatRoomChat\\\",{}],function(){}); }')();"],
      ['https://x.test/ChatRoom.js', 'function ChatRoomX(){ sperre(); }'],
    ], 'ChatRoomX();');
    expect(letzte(sb).tool).toBe(false);
    expect(letzte(sb).quelle.split(' ← ')[0]).toBe('ChatRoom.js');
    expect(sb.ctx.__BCK_sendMonSnapshot().vomTool).toBe(0);
  });

  it('echter Tool-Code bleibt Tool, auch wenn der Hook der Sync-Sperre daneben im Stack steht', () => {
    const sb = lauf([
      ['https://x.test/loader.js?_=1', "function exec(){ new Function('function BCU_SperreHook(){ __cb([\\\"ChatRoomChat\\\",{}],function(){}); } BCU_SperreHook();')(); }"],
    ], 'exec();');
    expect(letzte(sb).tool).toBe(true);
  });

  it('ein älterer Monitor im selben Tab macht nicht jede Sendung zur Tool-Sendung', () => {
    // Alter Hook (gleicher Funktionsname, loader.js) steht NACH dem neuen im Stack
    const sb = lauf([
      ['https://x.test/ChatRoom.js', 'function ChatRoomX(){ __hook("ChatRoomChat"); }'],
      ['https://x.test/loader.js?_=1', 'function BCK_SendMonHook(f){ return f(); }'],
    ], 'BCK_SendMonHook(function(){ ChatRoomX(); });');
    expect(letzte(sb).tool).toBe(false);
    expect(letzte(sb).quelle).not.toContain('loader.js');
  });

  it('ein Hook in loader.js (BCX-Filter) im Stack wird wie ein Wrapper ausgeblendet', () => {
    // Stack von innen nach außen: Monitor-Hook ← Hook in loader.js ← KikiLink-Wrapper ← Mod ← start.js
    const b = bootLoader();
    b.sb.ctx.__cb = b.hook.cb;
    vm.runInContext('function BcxFilterHook(typ){ __cb([typ, {}], function(){}); }', b.sb.ctx, { filename: 'https://x.test/loader.js?_=1' });
    vm.runInContext('function ServerSendUmhuellt(typ){ BcxFilterHook(typ); }', b.sb.ctx, { filename: 'https://x.test/KikiLink.fusam.js' });
    const mods = ['DOGS', 'LSCG', 'ChatRoom'];
    mods.forEach((n) => {
      vm.runInContext('function von_' + n + '(){ ServerSendUmhuellt("ChatRoomChat"); }', b.sb.ctx, { filename: 'https://x.test/' + n + '.js' });
    });
    for (let i = 0; i < 12; i++) vm.runInContext('von_' + mods[i % 3] + '();', b.sb.ctx, { filename: 'https://x.test/start.js' });
    const snap = b.sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.wrapper).toEqual(['loader.js', 'KikiLink.fusam.js']);
    expect(Object.keys(snap.nachQuelle).map((k) => k.split(' ← ')[0]).sort()).toEqual(['ChatRoom.js', 'DOGS.js', 'LSCG.js']);
    expect(snap.vomTool).toBe(0);
  });

  it('eingespielter Tool-Code wird nie ausgeblendet, auch wenn er bei fast jeder Sendung vorn steht', () => {
    const b = bootLoader();
    b.sb.ctx.__cb = b.hook.cb;
    vm.runInContext("function exec(){ new Function('__cb([\"ChatRoomChat\",{}],function(){}) /*fall-3*/')(); }", b.sb.ctx, { filename: 'https://x.test/loader.js?_=1' });
    for (let i = 0; i < 12; i++) vm.runInContext('exec();', b.sb.ctx, { filename: 'https://x.test/start.js' });
    const snap = b.sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.wrapper).not.toContain('eval@loader.js');
    expect(snap.vomTool).toBe(12);
    expect(snap.ring.every((e) => e.tool && e.quelle.startsWith('eval@loader.js'))).toBe(true);
  });

  it('auch hinter vielen Durchgangs-Mods (je ein Hook) wird der echte Absender gefunden', () => {
    const b = bootLoader();
    b.sb.ctx.__cb = b.hook.cb;
    const durchgang = ['KikiLink.fusam.js', 'bcplus.js', 'bcx.js', 'wce.js', 'BC_LianChat.js', 'app.js', 'main-A.js', 'main-B.js', 'main.js', 'zusatz1.js', 'zusatz2.js', 'zusatz3.js'];
    // innerster Durchgang ruft den Monitor, jeder weitere ruft den vorigen
    durchgang.forEach((datei, i) => {
      const ziel = i === 0 ? '__cb([typ, {}], function(){})' : 'dg' + (i - 1) + '(typ)';
      vm.runInContext('function dg' + i + '(typ){ ' + ziel + '; }', b.sb.ctx, { filename: 'https://x.test/' + datei });
    });
    ['DOGS', 'LSCG', 'ChatRoom'].forEach((n) => {
      vm.runInContext('function von_' + n + '(typ){ dg' + (durchgang.length - 1) + '(typ); }', b.sb.ctx, { filename: 'https://x.test/' + n + '.js' });
    });
    for (let i = 0; i < 12; i++) vm.runInContext('von_' + ['DOGS', 'LSCG', 'ChatRoom'][i % 3] + '("ChatRoomChat");', b.sb.ctx, { filename: 'https://x.test/start.js' });
    const snap = b.sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.wrapper).toEqual(durchgang);
    expect(Object.keys(snap.nachQuelle).map((k) => k.split(' ← ')[0]).sort()).toEqual(['ChatRoom.js', 'DOGS.js', 'LSCG.js']);
  });

  it('ein Mod, der ServerSend umhüllt, verdeckt den echten Absender nicht', () => {
    const b = bootLoader();
    b.sb.ctx.__cb = b.hook.cb;
    vm.runInContext('function ServerSendUmhuellt(typ){ __cb([typ, {}], function(){}); }', b.sb.ctx, { filename: 'https://x.test/KikiLink.fusam.js' });
    const absender = ['DOGS.js', 'LSCG.js', 'ChatRoom.js'];
    absender.forEach((datei) => {
      vm.runInContext('function von_' + datei.replace('.js', '') + '(typ){ ServerSendUmhuellt(typ); }', b.sb.ctx, { filename: 'https://x.test/' + datei });
    });
    for (let i = 0; i < 12; i++) {
      const name = absender[i % 3].replace('.js', '');
      vm.runInContext('von_' + name + '("ChatRoomChat");', b.sb.ctx, { filename: 'https://x.test/start.js' });
    }
    const snap = b.sb.ctx.__BCK_sendMonSnapshot();
    expect(snap.wrapper).toEqual(['KikiLink.fusam.js']);
    // vorn steht der echte Absender, nicht der Wrapper
    expect(Object.keys(snap.nachQuelle).map((k) => k.split(' ← ')[0]).sort()).toEqual(['ChatRoom.js', 'DOGS.js', 'LSCG.js']);
    expect(JSON.stringify(snap.nachQuelle)).not.toContain('KikiLink');
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
  jetzt: Date.now(), seit: Date.now() - 60000, gesamt: 42, vomTool: 3, spitze: { n: 14, t: Date.now() - 5000 }, warnAb: 10,
  nachTyp: { ChatRoomChat: 30, AccountUpdate: 12 }, nachQuelle: { 'eval@loader.js': 3, 'ChatRoom.js': 22 },
  ringSendungen: 42, wrapper: ['KikiLink.fusam.js', 'main-COE8imrH.js'],
  dup: { gesamt: 31, nachTyp: { AccountUpdate: 28, ChatRoomCharacterExpressionUpdate: 3 }, von: { AccountUpdate: 40, ChatRoomCharacterExpressionUpdate: 6 }, fensterMs: 10000 },
  leitung: { aktiv: true, gesamt: 38, spitze: { n: 9, t: Date.now() - 5000 } },
  bc: { limit: 10, intervall: 1000, warteschlange: 0 },
  ring: [
    { t: Date.now() - 2000, k: 'send', typ: 'AccountUpdate', sub: 'Appearance', quelle: 'eval@loader.js', screen: 'ChatRoom', tool: true },
    { t: Date.now() - 1000, k: 'state', online: false, screen: 'Relog', room: null },
  ],
  vorfaelle: [{
    t: Date.now() - 1000, grund: 'ServerDisconnect: ErrorRateLimited | disconnect: io client disconnect',
    n10: 47, tool10: 0, dup10: 29, spitze10: { n: 18, t: Date.now() - 3000 }, leitung10: 40, leitungSpitze10: { n: 11, t: Date.now() - 3000 },
    top: [{ was: 'ChatRoomChat:Hidden:BCXMsg [bcx.js]', n: 12 }],
    lauf: [
      { t: Date.now() - 4000, k: 'state', online: true, screen: 'ChatSearch', room: null },
      { t: Date.now() - 3000, k: 'send', typ: 'ChatRoomSearch', sub: '', quelle: 'ChatSearch.js', screen: 'ChatSearch', tool: false },
      { t: Date.now() - 2500, k: 'send', typ: 'AccountUpdate', sub: 'Appearance', quelle: 'eval@loader.js', screen: 'ChatRoom', tool: true },
      { t: Date.now() - 2400, k: 'send', typ: 'AccountUpdate', sub: 'Appearance', quelle: 'wce.js', screen: 'ChatRoom', tool: false, dup: true },
    ],
  }],
};

describe('Sende-Monitor (Tool): Bericht', () => {
  it('SEND_LOG_DATA füllt die Karte; Trennung, Hauptsender, Leitung und Ablauf stehen im Text', () => {
    const { ctx, els, send } = bootTool();
    send({ type: 'SEND_LOG_DATA', log: LOG });
    const text = els.sendMonInfo.textContent;
    expect(text).toContain('ServerSend-Aufrufe seit Start: 42 · davon vom Tool: 3');
    expect(text).toContain('Spitze: 14 in 1 s');
    expect(text).toContain('An der Leitung (socket.emit, nach BCs Warteschlange): 38 · Spitze: 9 in 1 s');
    expect(text).toContain('ServerSendRateLimit=10 pro 1000 ms · Warteschlange jetzt: 0');
    expect(text).toContain('durchgereicht über KikiLink.fusam.js ← main-COE8imrH.js – ausgeblendet');
    expect(text).toContain('TRENNUNGEN (1)');
    expect(text).toContain('ServerDisconnect: ErrorRateLimited | disconnect: io client disconnect');
    expect(text).toContain('letzte 10 s: 47 ServerSend-Aufrufe (Spitze 18 in 1 s), davon vom Tool: 0');
    expect(text).toContain('An der Leitung: 40 (Spitze 11 in 1 s)');
    expect(text).toContain('12× ChatRoomChat:Hidden:BCXMsg [bcx.js]');
    expect(text).toContain('Identische Wiederholungen (≡, gleicher Inhalt wie die vorige Sendung derselben Art innerhalb 10 s): 31 von 46 geprüften (AccountUpdate 28, ChatRoomCharacterExpressionUpdate 3)');
    expect(text).toContain('davon identische Wiederholungen (≡): 29');
    expect(text).toContain('Zustand: ChatSearch');
    expect(text).toContain('ChatRoomSearch [ChatSearch.js] (ChatSearch)');
    expect(text).toContain('GETRENNT · Relog');
    expect(evalIn(ctx, '_sendMonText(_sendMonLog)')).toBe(text);
  });

  it('Tool-Sendungen sind im Verlauf markiert, fremde nicht', () => {
    const { ctx } = bootTool();
    const text = evalIn(ctx, '_sendMonText(' + JSON.stringify(LOG) + ')');
    expect(text).toMatch(/AccountUpdate:Appearance \[eval@loader\.js\] \(ChatRoom\)  ◀ TOOL/);
    expect(text).not.toMatch(/ChatRoomSearch \[ChatSearch\.js\] \(ChatSearch\)  ◀ TOOL/);
    expect(text).toMatch(/AccountUpdate:Appearance \[wce\.js\] \(ChatRoom\)  ≡/);
  });

  it('ohne Leitungs-Messung steht das im Bericht statt falscher Nullen', () => {
    const { ctx } = bootTool();
    const text = evalIn(ctx, '_sendMonText(' + JSON.stringify({ ...LOG, leitung: { aktiv: false, gesamt: 0 } }) + ')');
    expect(text).toContain('An der Leitung: nicht gemessen');
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
    send({ type: 'SEND_MON_VORFALL', grund: 'ServerDisconnect: ErrorRateLimited', n10: 47, spitze10: 18 });
    expect(els.statusMsg.textContent).toContain('ErrorRateLimited');
    expect(opener.postMessage).toHaveBeenCalledWith({ app: APP, type: 'GET_SEND_LOG' }, BC);
  });

  it('Nachrichten von fremdem Origin ändern den Bericht nicht', () => {
    const { ctx, opener, els } = bootTool();
    dispatchMessage(ctx, { app: APP, type: 'SEND_LOG_DATA', log: LOG }, { origin: 'https://evil.example', source: opener });
    expect(els.sendMonInfo?.textContent || '').not.toContain('ServerSend-Aufrufe seit Start');
  });
});

describe('Sende-Monitor (Loader): neues Socket nach einem Relog', () => {
  it('Zähler und Trennungs-Hörer werden am neuen Socket-Objekt neu angehängt – und nicht doppelt', () => {
    const intervals = [];
    const { sb } = bootLoader({ globals: { setInterval: (fn) => { intervals.push(fn); return intervals.length; } } });
    const neu = { handlers: {}, on(ev, cb) { (this.handlers[ev] ||= []).push(cb); }, off() {}, emit: vi.fn(() => 'ok') };
    sb.ctx.ServerSocket = neu;          // BC legt nach dem Neuanmelden ein neues Socket an
    intervals.forEach((f) => f());
    // (ChatRoomMessage ist der Hörer der Spielerprofile für versteckte Mod-Nachrichten – er hängt am neuen Socket ebenfalls)
    expect(Object.keys(neu.handlers).sort()).toEqual(['ChatRoomMessage', 'ForceDisconnect', 'disconnect']);
    expect(neu.emit('ChatRoomChat', {})).toBe('ok');   // Rückgabe unverändert
    expect(sb.ctx.__BCK_sendMonSnapshot().leitung.gesamt).toBe(1);
    intervals.forEach((f) => f());                      // dasselbe Objekt: nicht noch einmal verdrahten
    expect(neu.handlers.ForceDisconnect).toHaveLength(1);
    neu.emit('ChatRoomChat', {});
    expect(sb.ctx.__BCK_sendMonSnapshot().leitung.gesamt).toBe(2);
  });

  it('eine Trennung am neuen Socket wird mit ihrem Grund festgehalten', () => {
    const intervals = [];
    const { sb } = bootLoader({ globals: { setInterval: (fn) => { intervals.push(fn); return intervals.length; } } });
    const neu = { handlers: {}, on(ev, cb) { (this.handlers[ev] ||= []).push(cb); }, off() {}, emit() {} };
    sb.ctx.ServerSocket = neu;
    intervals.forEach((f) => f());
    neu.handlers.ForceDisconnect[0]('ErrorRateLimited');
    expect(sb.ctx.__BCK_sendMonSnapshot().vorfaelle[0].grund).toContain('ForceDisconnect: ErrorRateLimited');
  });
});
