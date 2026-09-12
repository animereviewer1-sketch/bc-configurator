import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript } from './helpers/loadScript.js';

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
