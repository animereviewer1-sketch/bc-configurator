import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// SPLIT-02 / SPLIT-03: bridge.js besitzt den einzigen postMessage-Listener und
// eine Handler-Registry (onBridgeMessage/offBridgeMessage/_bridgeDispatch);
// items.js registriert nur noch seine 35 Handler-Körper, statt selbst einen
// switch(ev.data.type) zu betreiben. Ein neuer Nachrichtentyp (z. B.
// GAME_SCAN_DATA für Phase 5) muss sich ohne jede items.js-Änderung
// registrieren und empfangen lassen.

const BC = 'https://bc.test';
const EVIL = 'https://evil.example';
const APP = 'BCKonfigurator';

const TYPES = [
  'PONG', 'CACHE_DATA', 'POS_DATA', 'PLAYER_DATA', 'BOT_EV_STATUS', 'BOT_LOG',
  'BOT_MONEY', 'BOT_SHOP', 'BOT_RANG', 'BOT_SET_ZONE', 'BOT_VAR', 'BOT_PROBE',
  'BOT_KEYBERICHT', 'BOT_INVENTAR', 'BOT_MAPKEY', 'RANG_INIT', 'MONEY_INIT_NEW',
  'MONEY_QUERY', 'BOT_ROOM_EVER', 'EXEC_OK', 'EXEC_ERR', 'CURSE_DATA',
  'LSCG_CACHE_DATA', 'CRAFT_CACHE_DATA', 'WEAR_CURSE_OK', 'WEAR_CURSE_ERR',
  'CT_CHAT_MSG', 'CHAR_APPEARANCE_DATA', 'DEFAULT_OUTFIT_DATA', 'SCREENSHOT_DATA',
  'CANVAS_PREVIEW_DATA', 'OUTFIT_SCAN_DATA', 'LSCG_OUTFITS_DATA', 'MBS_WHEEL_DATA',
  'LOCKS_DATA',
];

function mkOpener() {
  return { closed: false, postMessage: vi.fn() };
}

function boot(files, extra = {}) {
  const opener = mkOpener();
  const els = { connStatus: makeElementStub(), statusMsg: makeElementStub() };
  const ctx = loadScript(files, {
    opener,
    setTimeout: () => 0,
    clearTimeout: () => {},
    logPush: vi.fn(),
    _handlePosData: vi.fn(),
    ...extra,
  });
  ctx.document.getElementById = (id) => els[id] || makeElementStub();
  return { ctx, opener, els };
}

function msg(type, extra = {}) {
  return { app: APP, type, ...extra };
}

function send(ctx, data, origin, source) {
  return dispatchMessage(ctx, data, { origin, source });
}

function handshake(ctx, opener) {
  send(ctx, msg('PONG'), BC, opener);
  opener.postMessage.mockClear();
}

// Zwei Bedeutungen unter einem Namen (wie in der Aufgabenbeschreibung notiert):
// count(ctx, type)   → Länge der Registry-Liste für einen Nachrichtentyp
// count(quelltext, needle) → Vorkommen eines Literals im Quelltext
function count(ctxOrSrc, arg) {
  if (typeof ctxOrSrc === 'string') {
    return ctxOrSrc.split(arg).length - 1;
  }
  return evalIn(ctxOrSrc, "(_bridgeHandlers.get('" + arg + "') || []).length");
}

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

describe('Registry-Vertrag: onBridgeMessage / offBridgeMessage / Dispatch (SPLIT-02)', () => {
  let ctx, opener;

  beforeEach(() => {
    ({ ctx, opener } = boot(['items.js']));
    handshake(ctx, opener);
  });

  it('onBridgeMessage registriert; Dispatch ruft den Handler mit dem Event', () => {
    const fn = vi.fn();
    ctx.onBridgeMessage('TEST_A', fn);
    send(ctx, msg('TEST_A', { x: 1 }), BC, opener);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].data.x).toBe(1);
    expect(fn.mock.calls[0][0].origin).toBe(BC);
    expect(count(ctx, 'TEST_A')).toBe(1);
  });

  it('mehrere Handler desselben Typs laufen in Registrierungsreihenfolge', () => {
    const order = [];
    ctx.onBridgeMessage('TEST_B', () => order.push('a'));
    ctx.onBridgeMessage('TEST_B', () => order.push('b'));
    send(ctx, msg('TEST_B'), BC, opener);
    expect(order).toEqual(['a', 'b']);
  });

  it('ein werfender Handler blockiert keine Geschwister (Review WR-01)', () => {
    const order = [];
    const errSpy = vi.spyOn(ctx.console, 'error').mockImplementation(() => {});
    ctx.onBridgeMessage('TEST_ERR', () => { throw new Error('boom'); });
    ctx.onBridgeMessage('TEST_ERR', () => order.push('b'));
    expect(() => send(ctx, msg('TEST_ERR'), BC, opener)).not.toThrow();
    expect(order).toEqual(['b']);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('Doppelregistrierung desselben Handlers ist ein No-op (Review WR-02)', () => {
    let n = 0;
    const h = () => { n++; };
    ctx.onBridgeMessage('TEST_DUP', h);
    ctx.onBridgeMessage('TEST_DUP', h);
    send(ctx, msg('TEST_DUP'), BC, opener);
    expect(n).toBe(1);
  });

  it('offBridgeMessage entfernt genau den übergebenen Handler und meldet Erfolg', () => {
    const fnA = vi.fn();
    const fnB = vi.fn();
    ctx.onBridgeMessage('TEST_C', fnA);
    ctx.onBridgeMessage('TEST_C', fnB);
    expect(ctx.offBridgeMessage('TEST_C', fnA)).toBe(true);
    expect(ctx.offBridgeMessage('TEST_C', fnA)).toBe(false);
    expect(ctx.offBridgeMessage('NIE', fnA)).toBe(false);
    send(ctx, msg('TEST_C'), BC, opener);
    expect(fnA).not.toHaveBeenCalled();
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(count(ctx, 'TEST_C')).toBe(1);
  });

  it('ein Handler darf sich während des Dispatch selbst entfernen, ohne die anderen zu überspringen', () => {
    const calls = { a: 0, b: 0 };
    const fnA = () => { calls.a++; ctx.offBridgeMessage('TEST_D', fnA); };
    ctx.onBridgeMessage('TEST_D', fnA);
    const fnB = () => { calls.b++; };
    ctx.onBridgeMessage('TEST_D', fnB);
    send(ctx, msg('TEST_D'), BC, opener);
    expect(calls.a).toBe(1);
    expect(calls.b).toBe(1);
    expect(count(ctx, 'TEST_D')).toBe(1);
  });

  it('unbekannter Typ: kein Throw, kein Handler, _lastMsgTs aktualisiert (Shell-Semantik unverändert)', () => {
    evalIn(ctx, '_lastMsgTs = 0');
    expect(() => send(ctx, msg('NOPE'), BC, opener)).not.toThrow();
    expect(evalIn(ctx, '_lastMsgTs')).toBeGreaterThan(0);
    expect(count(ctx, 'NOPE')).toBe(0);
  });
});

describe('Sicherheitsshell liegt VOR der Registry (STAB-04/06 bleiben, T-4-08)', () => {
  let ctx, opener, fn;

  beforeEach(() => {
    ({ ctx, opener } = boot(['items.js']));
    handshake(ctx, opener);
    fn = vi.fn();
    ctx.onBridgeMessage('TEST_S', fn);
  });

  it('fremde Source: Handler wird nicht gerufen', () => {
    send(ctx, msg('TEST_S'), BC, {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('fremder Origin nach Handshake: Handler wird nicht gerufen, _bcOrigin bleibt', () => {
    send(ctx, msg('TEST_S'), EVIL, opener);
    expect(fn).not.toHaveBeenCalled();
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC);
  });

  it('falsche app: Handler wird nicht gerufen', () => {
    send(ctx, { app: 'x', type: 'TEST_S' }, BC, opener);
    expect(fn).not.toHaveBeenCalled();
  });

  it('_playerAbgelehnt: Handler wird nicht gerufen', () => {
    evalIn(ctx, '_playerAbgelehnt = true');
    send(ctx, msg('TEST_S'), BC, opener);
    expect(fn).not.toHaveBeenCalled();
    evalIn(ctx, '_playerAbgelehnt = false');
    send(ctx, msg('TEST_S'), BC, opener);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Neuer Nachrichtentyp ohne items.js (Erfolgskriterium 1)', () => {
  it('bridge.js allein: GAME_SCAN_DATA registrieren und empfangen', () => {
    const { ctx, opener } = boot(['persistence.js', 'bridge.js']);
    handshake(ctx, opener); // kein PONG-Handler registriert – darf nicht werfen
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC);
    const fn = vi.fn();
    ctx.onBridgeMessage('GAME_SCAN_DATA', fn);
    send(ctx, msg('GAME_SCAN_DATA', { chunk: 1 }), BC, opener);
    expect(fn.mock.calls[0][0].data.chunk).toBe(1);
    expect(typeof ctx.bcSend).toBe('function');
    expect(ctx.bcSend({ type: 'GET_SCAN' }, true)).toBe(true);
    expect(opener.postMessage.mock.calls.at(-1)).toEqual([{ app: APP, type: 'GET_SCAN' }, BC]);
  });

  it('bcSend loggt EXEC nur, wenn _execLogAppend existiert (bridge.js allein wirft nicht)', () => {
    const { ctx, opener } = boot(['persistence.js', 'bridge.js']);
    handshake(ctx, opener);
    let result;
    expect(() => { result = ctx.bcSend({ type: 'EXEC', code: '1' }, true); }).not.toThrow();
    expect(result).toBe(true);
    expect(opener.postMessage.mock.calls.at(-1)[0].type).toBe('EXEC');
  });

  it('Dual-Export: module.exports liefert die Bridge-API', () => {
    const module = { exports: {} };
    loadScript(['bridge.js'], { module, setTimeout: () => 0, clearTimeout: () => {} });
    expect(Object.keys(module.exports).sort()).toEqual(
      ['APP', '_bridgeSenderOk', 'bcSend', 'offBridgeMessage', 'onBridgeMessage', 'manualReconnect', 'startPingRetry', '_heartbeatCheck'].sort()
    );
  });
});

describe('items.js registriert alle bisherigen Typen (SPLIT-03)', () => {
  let ctx, opener;

  beforeAll(() => {
    ({ ctx, opener } = boot(['items.js']));
    handshake(ctx, opener);
  });

  it.each(TYPES)('%s ist registriert', (type) => {
    expect(count(ctx, type)).toBeGreaterThanOrEqual(1);
  });

  it('genau 35 Typen aus dem alten Switch plus OUTFIT_DEBUG_RESULT (dynamisch)', () => {
    expect(TYPES.length).toBe(35);
    expect(count(ctx, 'OUTFIT_DEBUG_RESULT')).toBe(0);
    evalIn(ctx, "LSCG_DB['1'] = { versions: [{ code: 'abc' }] }");
    ctx.debugOsOutfit('1', 0);
    expect(count(ctx, 'OUTFIT_DEBUG_RESULT')).toBe(1);
    const call = opener.postMessage.mock.calls.find((c) => /reqId:"(dbg_\d+)"/.test(c[0]?.code || ''));
    const match = /reqId:"(dbg_\d+)"/.exec(call[0].code);
    const reqId = match[1];
    send(ctx, msg('OUTFIT_DEBUG_RESULT', { reqId, total: 0, missing: [], naked: [], missingNaked: [], assetFamily: 'F' }), BC, opener);
    expect(count(ctx, 'OUTFIT_DEBUG_RESULT')).toBe(0);
  });
});

describe('Statisches Gate: items.js ohne eigene Bridge-/IDB-Logik (SPLIT-03)', () => {
  it("items.js: 0x addEventListener('message'), 0x window.opener.postMessage(, 0x switch (ev.data.type), 0x indexedDB.open(, 0x function bcSend", () => {
    const itemsSrc = src('items.js');
    const needles = [
      "addEventListener('message'",
      'window.opener.postMessage(',
      'switch (ev.data.type)',
      'indexedDB.open(',
      'function bcSend(',
      'function _bridgeSenderOk(',
      'function startPingRetry(',
      'function _heartbeatCheck(',
      'function manualReconnect(',
      "const APP = 'BCKonfigurator';",
    ];
    for (const needle of needles) {
      expect(count(itemsSrc, needle)).toBe(0);
    }
  });

  it('bridge.js: je genau einmal Listener, Registry, bcSend, Absenderprüfung, Sicherheitszeilen', () => {
    const bridgeSrc = src('bridge.js');
    const needlesOnce = [
      "window.addEventListener('message'",
      'function onBridgeMessage(type, handler)',
      'function offBridgeMessage(type, handler)',
      'function _bridgeDispatch(ev)',
      'function bcSend(msg, silent)',
      'function _bridgeSenderOk(ev)',
      'if (!window.opener || ev.source !== window.opener) return false;',
      'if (_bcOrigin && ev.origin !== _bcOrigin) return false;',
      "if (!_bcOrigin && ev.origin && ev.origin !== 'null') _bcOrigin = ev.origin;",
      "if (!_bcOrigin && msg.type !== 'PING') {",
      "window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*');",
      "if (msg.type === 'EXEC' && typeof _execLogAppend === 'function') _execLogAppend(msg);",
      'if (_playerAbgelehnt) return;',
      '_bridgeDispatch(ev);',
      'setInterval(_heartbeatCheck, 5000);',
    ];
    for (const needle of needlesOnce) {
      expect(count(bridgeSrc, needle)).toBe(1);
    }
    expect(count(bridgeSrc, 'switch (ev.data.type)')).toBe(0);
    expect(count(bridgeSrc, 'const TOOL_ORIGIN')).toBe(0);
  });

  it('items.js: 35 Top-Level-Registrierungen in der alten Reihenfolge + Debug-Fold + PING über bcSend', () => {
    const itemsSrc = src('items.js');
    const lines = itemsSrc.split('\n');
    let lastIdx = -1;
    for (const type of TYPES) {
      const needle = "onBridgeMessage('" + type + "', function(ev) {";
      const idx = lines.findIndex((l) => l.startsWith(needle));
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
    expect(count(itemsSrc, "onBridgeMessage('OUTFIT_DEBUG_RESULT', handler)")).toBe(1);
    expect(count(itemsSrc, "offBridgeMessage('OUTFIT_DEBUG_RESULT', handler)")).toBe(1);
    expect(count(itemsSrc, "bcSend({ type: 'PING' }, true)")).toBe(1);
    expect(count(itemsSrc, 'const TOOL_ORIGIN = window.location.origin;')).toBe(1);
  });
});
