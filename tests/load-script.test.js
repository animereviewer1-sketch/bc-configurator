import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript, evalIn } from './helpers/loadScript.js';

describe('vm-Sandbox-Loader (TEST-02)', () => {
  let ctx;

  beforeAll(() => {
    ctx = loadScript(['items.js', 'bot-data.js', 'outfit-import.js']);
  });

  it('lädt items.js, bot-data.js, outfit-import.js in Ladereihenfolge in eine gemeinsame Sandbox', () => {
    for (const name of ['idbGet', 'idbSet', '_normLogik', '_migriereLogik', '_botVarApply', '_playerKeyApply', '_oiDetectType', '_oiBuildExecCode']) {
      expect(typeof ctx[name]).toBe('function');
    }
    expect(ctx.window).toBe(ctx);
  });

  it('let-Globals sind keine Sandbox-Properties, aber per evalIn erreichbar', () => {
    expect(ctx._bots).toBeUndefined();
    expect(Array.isArray(evalIn(ctx, '_bots'))).toBe(true);
    expect(typeof evalIn(ctx, '_botVars')).toBe('object');
  });

  it('leere Dateiliste liefert Basis-Sandbox ohne Produktions-Globals', () => {
    const s = loadScript([]);
    expect(typeof s.idbGet).toBe('undefined');
    expect(typeof s.localStorage.getItem).toBe('function');
    expect(s.localStorage.getItem('x')).toBeNull();
    expect(s.window).toBe(s);
    expect(typeof s.document.getElementById('any').classList.toggle).toBe('function');
  });

  it('Nicht-Array-Argument wird mit TypeError abgelehnt', () => {
    expect(() => loadScript('items.js')).toThrow(TypeError);
    expect(() => loadScript(null)).toThrow(TypeError);
  });

  it('Reihenfolge ist Aufrufersache: bot-data.js ohne items.js wirft ReferenceError', () => {
    expect(() => loadScript(['bot-data.js'])).toThrow(/idbGet is not defined/);
  });

  it('Doppeltes Laden derselben Datei wirft SyntaxError (const-Redeklaration)', () => {
    // vm.createContext() erzeugt eine eigene Realm mit eigenen Intrinsics (verifiziert:
    // sandbox.SyntaxError !== host-SyntaxError) — der geworfene Fehler ist deshalb keine
    // instanceof des Host-`SyntaxError`, sondern der SyntaxError-Konstruktor DERSELBEN
    // Sandbox-Realm. Der Konstruktor wird daher aus dem gefangenen Fehler selbst abgeleitet.
    let caught;
    try {
      loadScript(['items.js', 'items.js']);
    } catch (e) {
      caught = e;
    }
    expect(caught?.name).toBe('SyntaxError');
    const SyntaxError = Object.getPrototypeOf(caught).constructor;
    expect(() => { throw caught; }).toThrow(SyntaxError);
  });

  it('Stubs neutralisieren Timer und DOM beim Laden', () => {
    expect(ctx.setInterval(() => {}, 10)).toBe(0);
    expect(ctx.document.querySelectorAll('.x')).toEqual([]);
  });
});
