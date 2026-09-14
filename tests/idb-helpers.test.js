import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadScript, evalIn } from './helpers/loadScript.js';

describe('idbGet/idbSet über die Sandbox (TEST-02, Canary-Bezug TEST-03)', () => {
  let ctx;

  beforeAll(() => {
    ctx = loadScript(['items.js']);
  });

  it('Sandbox nutzt das fake-indexeddb aus setupFiles', () => {
    expect(ctx.indexedDB).toBe(globalThis.indexedDB);
    expect(typeof ctx.indexedDB.open).toBe('function');
  });

  it('idbSet → idbGet Round-Trip', async () => {
    expect(await ctx.idbSet('TEST_rt', { a: 1, list: [1, 2] })).toBe(true);
    expect(JSON.stringify(await ctx.idbGet('TEST_rt'))).toBe('{"a":1,"list":[1,2]}');
  });

  it('unbekannter Schlüssel liefert null', async () => {
    expect(await ctx.idbGet('TEST_missing')).toBeNull();
  });

  it('put-Semantik: zweites idbSet überschreibt', async () => {
    await ctx.idbSet('TEST_over', 1);
    await ctx.idbSet('TEST_over', 2);
    expect(await ctx.idbGet('TEST_over')).toBe(2);
  });
});

describe('idbSet/idbGet Fehlerpfade (TEST-04, STAB-02)', () => {
  let ctx;
  let calls;
  const origPut = globalThis.IDBObjectStore.prototype.put;
  const origGet = globalThis.IDBObjectStore.prototype.get;

  function failPut(name) {
    globalThis.IDBObjectStore.prototype.put = function () {
      throw new DOMException('simuliert', name);
    };
  }

  function failGet(name) {
    globalThis.IDBObjectStore.prototype.get = function () {
      throw new DOMException('simuliert', name);
    };
  }

  beforeAll(async () => {
    ctx = loadScript(['items.js']);
    await ctx.idbGet('warmup');
    // Migration beenden, bevor `put` gepatcht wird — sonst zaehlt ihr
    // Marker-Write als zweite Statusmeldung (SPLIT-06, Race).
    await ctx._screenshotStoreReady();
  });

  beforeEach(() => {
    calls = [];
    ctx.showStatus = (msg, type) => { calls.push({ msg, type }); };
    evalIn(ctx, '_idbFehlerGemeldet = 0');
  });

  afterEach(() => {
    globalThis.IDBObjectStore.prototype.put = origPut;
    globalThis.IDBObjectStore.prototype.get = origGet;
  });

  it('QuotaExceededError: idbSet liefert false, meldet "Speicher voll" per showStatus(…, "error"), kein Teilschreibvorgang', async () => {
    failPut('QuotaExceededError');
    expect(await ctx.idbSet('TEST_quota', { big: 'x' })).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe('error');
    expect(calls[0].msg).toContain('Speicher voll');
    expect(calls[0].msg).toContain('TEST_quota');
    globalThis.IDBObjectStore.prototype.put = origPut;
    expect(await ctx.idbGet('TEST_quota')).toBeNull();
  });

  it('Nicht-Quota-Fehler (UnknownError): idbSet liefert false und meldet "Speichern fehlgeschlagen"', async () => {
    failPut('UnknownError');
    expect(await ctx.idbSet('TEST_unknown', { x: 1 })).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe('error');
    expect(calls[0].msg).toContain('Speichern fehlgeschlagen');
    expect(calls[0].msg).toContain('TEST_unknown');
    expect(calls[0].msg).not.toContain('Speicher voll');
  });

  it('Throttle: zweiter Fehler binnen 10 s liefert false, aber keine zweite Meldung (Ist-Zustand, Entscheidung 3)', async () => {
    failPut('QuotaExceededError');
    expect(await ctx.idbSet('TEST_t1', 1)).toBe(false);
    expect(await ctx.idbSet('TEST_t2', 1)).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].msg).toContain('TEST_t1');
  });

  it('nach Rücksetzen von _idbFehlerGemeldet wird wieder gemeldet', async () => {
    failPut('QuotaExceededError');
    await ctx.idbSet('TEST_r1', 1);
    evalIn(ctx, '_idbFehlerGemeldet = 0');
    await ctx.idbSet('TEST_r2', 1);
    expect(calls).toHaveLength(2);
    expect(calls[1].msg).toContain('TEST_r2');
  });

  it('idbGet-Fehlerpfad: liefert null, wirft nicht, keine UI-Meldung (dokumentierter Ist-Zustand)', async () => {
    await ctx.idbSet('TEST_get', 42);
    failGet('UnknownError');
    expect(await ctx.idbGet('TEST_get')).toBeNull();
    expect(calls).toHaveLength(0);
    globalThis.IDBObjectStore.prototype.get = origGet;
    expect(await ctx.idbGet('TEST_get')).toBe(42);
  });

  it('idbSet ohne showStatus-Funktion wirft nicht und liefert false', async () => {
    ctx.showStatus = undefined;
    failPut('QuotaExceededError');
    expect(await ctx.idbSet('TEST_nostatus', 1)).toBe(false);
  });
});
