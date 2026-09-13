import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// TEST-07 / STAB-04 / STAB-06 (Tool-Hälfte) / STAB-07: Bridge-Protokoll gegen
// den echten items.js-Handler, mit simulierten postMessage-Ereignissen.
//
// Absender-Doppelprüfung (Trust-on-first-use): `_bcOrigin` startet als `null`
// und wird beim ersten gültigen Handshake (source === opener, Origin nicht
// 'null') gelernt; danach muss JEDE weitere Nachricht denselben Origin UND
// denselben Source tragen, sonst wird sie mit `console.warn` verworfen — ohne
// die _bcOrigin neu zu lernen und ohne `_lastMsgTs` zu berühren.

const BC = 'https://bc.test';
const BC2 = 'https://bc2.test';
const EVIL = 'https://evil.example';
const APP = 'BCKonfigurator';

function mkOpener() {
  return { closed: false, postMessage: vi.fn() };
}

function boot(extra = {}) {
  const opener = mkOpener();
  const els = { connStatus: makeElementStub(), statusMsg: makeElementStub() };
  const ctx = loadScript(['items.js'], {
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

function handshake({ ctx, opener }) {
  send(ctx, msg('PONG'), BC, opener);
  opener.postMessage.mockClear();
}

function lastTs(ctx) {
  return evalIn(ctx, '_lastMsgTs');
}

function resetTs(ctx) {
  return evalIn(ctx, '_lastMsgTs = 0');
}

describe('Absender-Doppelprüfung: Origin + Source, Trust-on-first-use (STAB-06 Tool-Seite)', () => {
  it('lernt den Spiel-Origin beim ersten gültigen Handshake', () => {
    const { ctx, opener } = boot();
    expect(evalIn(ctx, '_bcOrigin')).toBeNull();
    expect(send(ctx, msg('PONG'), BC, opener)).toBeGreaterThanOrEqual(1);
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC);
    expect(evalIn(ctx, '_connected')).toBe(true);
  });

  it('verwirft Nachrichten, deren source nicht der Opener ist – auch mit korrektem Origin', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    resetTs(ctx);
    send(ctx, msg('EXEC_OK'), BC, {});
    expect(lastTs(ctx)).toBe(0);
    expect(els.statusMsg.textContent).toBe('');
  });

  it('verwirft Nachrichten von fremdem Origin nach dem Handshake – auch mit korrekter source', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    resetTs(ctx);
    send(ctx, msg('EXEC_OK'), EVIL, opener);
    expect(lastTs(ctx)).toBe(0);
    expect(els.statusMsg.textContent).toBe('');
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC);
  });

  it('ohne opener wird nichts angenommen', () => {
    const ctx = loadScript(['items.js']);
    resetTs(ctx);
    send(ctx, msg('PONG'), BC, {});
    expect(lastTs(ctx)).toBe(0);
    expect(evalIn(ctx, '_connected')).toBe(false);
  });

  it('_bridgeSenderOk ist die gemeinsame Prüfung: vor dem Lernen zählt nur die Quelle, danach Quelle UND Origin', () => {
    const { ctx, opener } = boot();
    expect(ctx._bridgeSenderOk({ source: opener, origin: BC })).toBe(true);
    expect(ctx._bridgeSenderOk({ source: {}, origin: BC })).toBe(false);
    handshake({ ctx, opener });
    expect(ctx._bridgeSenderOk({ source: opener, origin: BC })).toBe(true);
    expect(ctx._bridgeSenderOk({ source: opener, origin: EVIL })).toBe(false);
    expect(ctx._bridgeSenderOk({ source: {}, origin: BC })).toBe(false);
  });

  it('auch der temporäre Debug-Listener von debugOsOutfit prüft den Absender', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    evalIn(ctx, "LSCG_DB['1'] = { versions: [{ code: 'abc' }] }");
    const before = ctx._listeners.get('message').length;
    ctx.debugOsOutfit('1', 0);
    expect(ctx._listeners.get('message').length).toBe(before + 1);

    const call = opener.postMessage.mock.calls.find((c) => /reqId:"(dbg_\d+)"/.test(c[0]?.code || ''));
    const match = /reqId:"(dbg_\d+)"/.exec(call[0].code);
    const reqId = match[1];

    // Fremder Origin: Handler bleibt registriert, hat nichts angenommen.
    send(ctx, msg('OUTFIT_DEBUG_RESULT', { reqId, total: 0, missing: [], naked: [], missingNaked: [], assetFamily: 'F' }), EVIL, opener);
    expect(ctx._listeners.get('message').length).toBe(before + 1);

    // Gleiche Nachricht vom gelernten Origin: Handler akzeptiert und entfernt sich.
    send(ctx, msg('OUTFIT_DEBUG_RESULT', { reqId, total: 0, missing: [], naked: [], missingNaked: [], assetFamily: 'F' }), BC, opener);
    expect(ctx._listeners.get('message').length).toBe(before);
  });
});

describe('Handler-Dispatch nach Nachrichtentyp (TEST-07)', () => {
  it('PONG: verbunden, Status grün, GET_PLAYER geht an den gelernten Origin', () => {
    const { ctx, opener, els } = boot();
    opener.postMessage.mockClear();
    send(ctx, msg('PONG'), BC, opener);
    expect(evalIn(ctx, '_connected')).toBe(true);
    expect(els.connStatus.textContent).toBe('Verbunden');
    expect(els.connStatus.dataset.conn).toBe('on');
    expect(opener.postMessage).toHaveBeenCalledWith({ app: APP, type: 'GET_PLAYER' }, BC);
  });

  it('BOT_LOG wird an logPush durchgereicht', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    send(ctx, msg('BOT_LOG', { entry: { t: 1 } }), BC, opener);
    expect(ctx.logPush).toHaveBeenCalledWith({ t: 1 });
  });

  it('POS_DATA wird an _handlePosData durchgereicht', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    const data = msg('POS_DATA', { x: 1, y: 2 });
    send(ctx, data, BC, opener);
    expect(ctx._handlePosData).toHaveBeenCalledWith(data);
  });

  it('EXEC_OK / EXEC_ERR setzen die Statusmeldung', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    send(ctx, msg('EXEC_OK'), BC, opener);
    expect(els.statusMsg.textContent).toBe('✅ Ausgeführt!');
    send(ctx, msg('EXEC_ERR', { msg: 'boom' }), BC, opener);
    expect(els.statusMsg.textContent).toBe('❌ Fehler: boom');
  });

  it('unbekannter Typ wird angenommen, aber ohne Wirkung (kein Throw)', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    resetTs(ctx);
    expect(() => send(ctx, msg('NOPE'), BC, opener)).not.toThrow();
    expect(lastTs(ctx)).toBeGreaterThan(0);
    expect(els.statusMsg.textContent).toBe('');

    resetTs(ctx);
    send(ctx, { type: 'PONG' }, BC, opener);
    expect(lastTs(ctx)).toBe(0);
  });
});

describe('Sendepfad bcSend nutzt den gelernten Origin (STAB-04)', () => {
  it('Bootstrap-PING beim Laden geht an "*" – dokumentierte Ausnahme vor dem Handshake', () => {
    const { opener } = boot();
    expect(opener.postMessage.mock.calls[0]).toEqual([{ app: APP, type: 'PING' }, '*']);
  });

  it('vor dem Handshake weist bcSend alles außer PING zentral ab – nichts geht an "*"', () => {
    const { ctx, opener } = boot();
    opener.postMessage.mockClear();
    expect(ctx.bcSend({ type: 'GET_PLAYER' }, true)).toBe(false);
    expect(ctx.bcSend({ type: 'EXEC', code: '1+1' }, true)).toBe(false);
    expect(opener.postMessage).not.toHaveBeenCalled();
    // PING (Bootstrap) bleibt die einzige dokumentierte Ausnahme
    expect(ctx.bcSend({ type: 'PING' }, true)).toBe(true);
    expect(opener.postMessage.mock.calls.at(-1)[1]).toBe('*');
  });

  it('vor dem Handshake landet ein abgewiesener EXEC nicht im EXEC-Log', () => {
    const { ctx } = boot();
    const before = evalIn(ctx, '_execLog.length');
    ctx.bcSend({ type: 'EXEC', code: '1+1' }, true);
    expect(evalIn(ctx, '_execLog.length')).toBe(before);
  });

  it('nach dem Handshake sendet bcSend an den gelernten Spiel-Origin', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    ctx.bcSend({ type: 'GET_PLAYER' }, true);
    const last = opener.postMessage.mock.calls.at(-1);
    expect(last).toEqual([{ app: APP, type: 'GET_PLAYER' }, BC]);
  });

  it('ohne opener liefert bcSend false und wirft nicht', () => {
    const ctx = loadScript(['items.js']);
    expect(ctx.bcSend({ type: 'GET_PLAYER' }, true)).toBe(false);
  });

  it('statischer Audit: genau zwei direkte Wildcard-Sends, beide Bootstrap-PING; genau ein Fallback in bcSend', () => {
    const lines = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8').split('\n');
    const wildcardSends = lines.filter((l) => /window\.opener\.postMessage\(.*, '\*'\)/.test(l));
    expect(wildcardSends).toHaveLength(2);
    for (const l of wildcardSends) {
      expect(l).toContain("type: 'PING'");
    }
    const fallbackLines = lines.filter((l) => l.includes("_bcOrigin || '*'"));
    expect(fallbackLines).toHaveLength(1);
  });
});

describe('Verbindungsverlust und Reconnect (STAB-07)', () => {
  it('_heartbeatCheck markiert die Verbindung nach 15 s Stille als verloren', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    ctx.startPingRetry = vi.fn();
    evalIn(ctx, '_lastMsgTs = Date.now() - 20000');
    ctx._heartbeatCheck();
    expect(evalIn(ctx, '_connected')).toBe(false);
    expect(els.connStatus.textContent).toBe('Verbindung verloren');
    expect(els.connStatus.dataset.conn).toBe('off');
    expect(ctx.startPingRetry).toHaveBeenCalledTimes(1);
  });

  it('_heartbeatCheck lässt eine lebendige Verbindung in Ruhe', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    ctx.startPingRetry = vi.fn();
    evalIn(ctx, '_lastMsgTs = Date.now()');
    ctx._heartbeatCheck();
    expect(evalIn(ctx, '_connected')).toBe(true);
    expect(ctx.startPingRetry).not.toHaveBeenCalled();
  });

  it('manualReconnect setzt _bcOrigin zurück, zeigt "Nicht verbunden" und sendet PING an "*"', () => {
    const { ctx, opener, els } = boot();
    handshake({ ctx, opener });
    ctx.manualReconnect();
    expect(evalIn(ctx, '_bcOrigin')).toBeNull();
    expect(evalIn(ctx, '_connected')).toBe(false);
    expect(els.connStatus.textContent).toBe('Nicht verbunden');
    expect(els.connStatus.dataset.conn).toBe('off');
    expect(opener.postMessage.mock.calls.at(-1)).toEqual([{ app: APP, type: 'PING' }, '*']);
  });

  it('nach manualReconnect wird ein neuer Origin gelernt (Mirror-Wechsel)', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    ctx.manualReconnect();
    send(ctx, msg('PONG'), BC2, opener);
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC2);
    expect(evalIn(ctx, '_connected')).toBe(true);
  });

  it('Origin-Wechsel ohne Reconnect bleibt gesperrt – erst 🔄 Verbinden vertraut neu', () => {
    const { ctx, opener } = boot();
    handshake({ ctx, opener });
    resetTs(ctx);
    send(ctx, msg('PONG'), BC2, opener);
    expect(evalIn(ctx, '_bcOrigin')).toBe(BC);
    expect(lastTs(ctx)).toBe(0);
  });
});
