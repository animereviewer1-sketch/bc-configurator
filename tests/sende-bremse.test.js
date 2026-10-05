import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Sende-Bremse: senkt ServerSendRateLimit (BCs Sendewarteschlange, Standard 14 pro 1,2 s) im Spiel-Tab, damit der Raumbeitritt nicht
// am Anschlag läuft ("ErrorRateLimited"). Wird beim Verbinden gesetzt, ist einstellbar und stellt aus den Originalwert wieder her.

const BC = 'https://bc.test';
const APP = 'BCKonfigurator';
const ROOM = { online: true, loggedIn: true, screen: 'ChatRoom', inRoom: true, room: 'Testraum' };

function boot(speicher) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  if (speicher !== undefined) ctx.localStorage.setItem('BC_SendeBremse_v1', speicher);
  const pong = () => dispatchMessage(ctx, { app: APP, type: 'PONG', game: ROOM }, { origin: BC, source: opener });
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, els, opener, pong, execs };
}

// Den Code im "Spiel-Tab" ausführen: ein Kontext mit ServerSendRateLimit
function imSpiel(code, start = 14) {
  const g = { ServerSendRateLimit: start };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(code, g);
  return g;
}

describe('Sende-Bremse: Einstellung', () => {
  it('Standard: an, 9 pro 1,2 s', () => {
    const { ctx } = boot();
    expect(evalIn(ctx, 'sendeBremseLesen()')).toEqual({ an: true, limit: 9 });
  });

  it('kaputter Eintrag fällt auf den Standard zurück; Werte werden auf 4–14 begrenzt', () => {
    expect(evalIn(boot('{kaputt').ctx, 'sendeBremseLesen()')).toEqual({ an: true, limit: 9 });
    expect(evalIn(boot(JSON.stringify({ an: true, limit: 99 })).ctx, 'sendeBremseLesen()').limit).toBe(14);
    expect(evalIn(boot(JSON.stringify({ an: true, limit: 1 })).ctx, 'sendeBremseLesen()').limit).toBe(4);
    expect(evalIn(boot(JSON.stringify({ an: false, limit: 'x' })).ctx, 'sendeBremseLesen()')).toEqual({ an: false, limit: 9 });
  });

  it('ein leeres Feld ergibt den Vorschlag (9), nicht das Minimum', () => {
    const { ctx } = boot();
    expect(evalIn(ctx, "_sendeBremseLimit('')")).toBe(9);
    expect(evalIn(ctx, '_sendeBremseLimit(null)')).toBe(9);
    expect(evalIn(ctx, "_sendeBremseLimit('abc')")).toBe(9);
    expect(evalIn(ctx, "_sendeBremseLimit('0')")).toBe(4);
  });

  it('Eingaben in den Einstellungen werden gespeichert, begrenzt und im Feld korrigiert', () => {
    const { ctx, els } = boot();
    els.sendeBremseChk = Object.assign(makeElementStub(), { checked: true });
    els.sendeBremseLimit = Object.assign(makeElementStub(), { value: '30' });
    ctx.sendeBremseSetzen();
    expect(els.sendeBremseLimit.value).toBe(14);
    expect(JSON.parse(ctx.localStorage.getItem('BC_SendeBremse_v1'))).toEqual({ an: true, limit: 14 });
  });
});

describe('Sende-Bremse: Code im Spiel-Tab', () => {
  it('setzt das Limit und merkt sich den Originalwert', () => {
    const { ctx } = boot();
    const g = imSpiel(evalIn(ctx, '_sendeBremseCode(true, 9)'));
    expect(g.ServerSendRateLimit).toBe(9);
    expect(g.__BCU_origRateLimit).toBe(14);
  });

  it('erneutes Setzen überschreibt den Originalwert nicht; Ausschalten stellt ihn wieder her', () => {
    const { ctx } = boot();
    const g = imSpiel(evalIn(ctx, '_sendeBremseCode(true, 9)'));
    vm.runInContext(evalIn(ctx, '_sendeBremseCode(true, 6)'), g);
    expect(g.ServerSendRateLimit).toBe(6);
    expect(g.__BCU_origRateLimit).toBe(14);
    vm.runInContext(evalIn(ctx, '_sendeBremseCode(false, 6)'), g);
    expect(g.ServerSendRateLimit).toBe(14);
  });

  it('Ausschalten ohne vorheriges Setzen ändert nichts (kein null)', () => {
    const { ctx } = boot();
    const g = imSpiel(evalIn(ctx, '_sendeBremseCode(false, 9)'), 12);
    expect(g.ServerSendRateLimit).toBe(12);
  });

  it('gibt es die BC-Variable nicht (anderes BC), passiert nichts', () => {
    const { ctx } = boot();
    const g = {}; g.window = g; vm.createContext(g);
    vm.runInContext(evalIn(ctx, '_sendeBremseCode(true, 9)'), g);
    expect(g.ServerSendRateLimit).toBeUndefined();
    expect(g.__BCU_origRateLimit).toBeUndefined();
  });

  it('kein Origin-/Token-Bezug im Code (nur das Limit)', () => {
    const { ctx } = boot();
    const code = evalIn(ctx, '_sendeBremseCode(true, 9)');
    expect(code).not.toMatch(/https?:/);
    expect(code).not.toMatch(/postMessage|fetch|XMLHttpRequest/);
  });
});

describe('Sende-Bremse: beim Verbinden', () => {
  it('PONG schickt den Code mit dem gespeicherten Limit an den Spiel-Tab', () => {
    const { pong, execs } = boot(JSON.stringify({ an: true, limit: 7 }));
    pong();
    expect(execs().some((c) => c.includes('ServerSendRateLimit=7;'))).toBe(true);
  });

  it('ausgeschaltet: beim Verbinden wird der Originalwert zurückgestellt', () => {
    const { pong, execs } = boot(JSON.stringify({ an: false, limit: 7 }));
    pong();
    const code = execs().find((c) => c.includes('ServerSendRateLimit'));
    expect(code).toBeTruthy();
    expect(code).toContain('ServerSendRateLimit=window.__BCU_origRateLimit;');
  });
});
