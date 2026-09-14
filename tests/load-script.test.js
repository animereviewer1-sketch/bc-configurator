import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadScript, evalIn, dispatch, SANDBOX_ORIGIN } from './helpers/loadScript.js';

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

  it('addEventListener sammelt Handler pro Typ; dispatch ruft sie mit dem Event auf', () => {
    const s = loadScript([]);
    const fn = vi.fn();
    s.addEventListener('message', fn);
    expect(dispatch(s, 'message', { data: 1 })).toBe(1);
    expect(fn).toHaveBeenCalledWith({ data: 1 });
    expect(dispatch(s, 'keydown', {})).toBe(0);
  });

  it('removeEventListener entfernt genau den übergebenen Handler', () => {
    const s = loadScript([]);
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    s.addEventListener('message', fn1);
    s.addEventListener('message', fn2);
    s.removeEventListener('message', fn1);
    expect(dispatch(s, 'message', { data: 2 })).toBe(1);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith({ data: 2 });
  });

  it('bridge.js registriert genau einen message-Handler in der Registry', () => {
    const handlers = ctx._listeners.get('message');
    expect(handlers.length).toBe(1);
    for (const h of handlers) {
      expect(typeof h).toBe('function');
    }
  });

  it('location.origin ist gesetzt und per extraGlobals überschreibbar', () => {
    expect(loadScript([]).location.origin).toBe(SANDBOX_ORIGIN);
    expect(loadScript([], { location: { origin: 'https://x.test' } }).location.origin).toBe('https://x.test');
    expect(evalIn(loadScript([]), 'window.location.origin')).toBe(SANDBOX_ORIGIN);
  });
});
