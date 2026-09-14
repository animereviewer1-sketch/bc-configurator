// SPLIT-05 — Screenshots landen als einzelne Datensätze (id z.B. 'profile|Anna')
// im Store `screenshots`; die drei In-Memory-Maps bleiben Lese-Cache. Der
// Alt-Blob (`BC_PROFILE_SCREENSHOTS_v1` etc.) wird nach der Migration nicht
// mehr beschrieben ("frozen") und `LSCG_DB` (`BC_LSCG_OUTFITS_v3`) bleibt beim
// Screenshot-Speichern unberührt.
//
// Lädt items.js (expandiert automatisch um persistence.js/bridge.js).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, settle, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

const origPut = globalThis.IDBObjectStore.prototype.put;
const origDelete = globalThis.IDBObjectStore.prototype.delete;
let ops = [];

function resetOps() { ops = []; }

function installOpSpy() {
  globalThis.IDBObjectStore.prototype.put = function (...args) {
    ops.push({ op: 'put', store: this.name, arg: args[0], key: args[1] });
    return origPut.apply(this, args);
  };
  globalThis.IDBObjectStore.prototype.delete = function (...args) {
    ops.push({ op: 'delete', store: this.name, arg: args[0], key: args[1] });
    return origDelete.apply(this, args);
  };
}

beforeEach(() => {
  resetOps();
  installOpSpy();
});

afterEach(() => {
  globalThis.IDBObjectStore.prototype.put = origPut;
  globalThis.IDBObjectStore.prototype.delete = origDelete;
});

function shotPuts() {
  return ops.filter((o) => o.op === 'put' && o.store === 'screenshots');
}

function kvPutsFor(key) {
  return ops.filter((o) => o.op === 'put' && o.store === 'kv' && o.key === key);
}

async function boot() {
  const infoEl = makeElementStub();
  const ctx = loadScript(['items.js'], { confirm: () => true, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (id === 'screenshotStoreInfo' ? infoEl : makeElementStub());
  ctx.showStatus = vi.fn();
  await ctx._screenshotStoreReady();
  await settle(80);
  return { ctx, infoEl };
}

async function flush(ctx, fn) {
  ctx[fn]();
  ctx.bcSpeichernJetzt();
  await settle(80);
}

describe('Screenshot-Store (SPLIT-05) — ein Datensatz je Bild, Alt-Blob frozen, Maps als Cache', () => {
  let ctx;
  let ctx2;

  it('neues Profil-Bild: genau ein put {id:"profile|Anna", img}; Alt-Blob wird nicht beschrieben', async () => {
    ({ ctx } = await boot());
    await ctx.idbSet('BC_PROFILE_SCREENSHOTS_v1', { Alt: 'data:alt' });
    resetOps();
    evalIn(ctx, "PROFILE_SCREENSHOTS.Anna = 'data:a1'");
    await flush(ctx, '_saveProfileScreenshots');
    expect(shotPuts()).toHaveLength(1);
    expect(shotPuts()[0].arg).toEqual({ id: 'profile|Anna', img: 'data:a1' });
    expect(kvPutsFor('BC_PROFILE_SCREENSHOTS_v1')).toHaveLength(0);
    expect(kvPutsFor('BC_LSCG_OUTFITS_v3')).toHaveLength(0);
    expect(await ctx.idbGet('BC_PROFILE_SCREENSHOTS_v1')).toEqual({ Alt: 'data:alt' });
    expect((await ctx.idbScreenshotGetAll('profile')).Anna).toBe('data:a1');
  });

  it('unverändert → kein put, kein delete', async () => {
    resetOps();
    await flush(ctx, '_saveProfileScreenshots');
    expect(ops.filter((o) => o.store === 'screenshots')).toHaveLength(0);
  });

  it('Umbenennen: ein put + ein delete', async () => {
    resetOps();
    evalIn(ctx, 'PROFILE_SCREENSHOTS.Anna2 = PROFILE_SCREENSHOTS.Anna; delete PROFILE_SCREENSHOTS.Anna');
    await flush(ctx, '_saveProfileScreenshots');
    const shots = ops.filter((o) => o.store === 'screenshots');
    expect(shots.filter((o) => o.op === 'put')).toHaveLength(1);
    expect(shots.filter((o) => o.op === 'delete')).toHaveLength(1);
    expect(shots.find((o) => o.op === 'put').arg).toEqual({ id: 'profile|Anna2', img: 'data:a1' });
    expect(shots.find((o) => o.op === 'delete').arg).toBe('profile|Anna');
    const all = await ctx.idbScreenshotGetAll('profile');
    expect(all.Anna).toBeUndefined();
    expect(all.Anna2).toBe('data:a1');
  });

  it('clearAllProfileScreenshots (confirm) → ein delete je Bild, Alt-Blob bleibt', async () => {
    evalIn(ctx, "PROFILE_SCREENSHOTS.B = 'data:b'");
    await flush(ctx, '_saveProfileScreenshots');
    resetOps();
    ctx.clearAllProfileScreenshots();
    ctx.bcSpeichernJetzt();
    await settle(80);
    const shots = ops.filter((o) => o.store === 'screenshots');
    const deletes = shots.filter((o) => o.op === 'delete');
    expect(deletes).toHaveLength(2);
    expect(deletes.map((o) => o.arg).sort()).toEqual(['profile|Anna2', 'profile|B']);
    expect(shots.filter((o) => o.op === 'put')).toHaveLength(0);
    expect(await ctx.idbScreenshotGetAll('profile')).toEqual({});
    expect(await ctx.idbGet('BC_PROFILE_SCREENSHOTS_v1')).toEqual({ Alt: 'data:alt' });
  });

  it('LSCG: Schlüssel mit Pipe bleibt erhalten; LSCG_DB unberührt', async () => {
    evalIn(ctx, "LSCG_SCREENSHOTS['123|FP1'] = 'data:l'");
    resetOps();
    await flush(ctx, '_saveLscgScreenshots');
    const shots = shotPuts();
    expect(shots).toHaveLength(1);
    expect(shots[0].arg).toEqual({ id: 'lscg|123|FP1', img: 'data:l' });
    expect(await ctx.idbScreenshotGetAll('lscg')).toEqual({ '123|FP1': 'data:l' });
    expect(kvPutsFor('BC_LSCG_SCREENSHOTS_v1')).toHaveLength(0);
    expect(kvPutsFor('BC_LSCG_OUTFITS_v3')).toHaveLength(0);
  });

  it('Wheel: Fingerprint-Schlüssel', async () => {
    evalIn(ctx, "_mbsWheelShots['G:A|G:B'] = 'data:w'");
    resetOps();
    await flush(ctx, '_saveMbsWheelShots');
    const shots = shotPuts();
    expect(shots).toHaveLength(1);
    expect(shots[0].arg).toEqual({ id: 'wheel|G:A|G:B', img: 'data:w' });
    expect(kvPutsFor('BC_MBS_WHEEL_SS_v1')).toHaveLength(0);
  });

  it('Ladepfad: Store → Maps (Cache) und Shadow; danach kein Op ohne Änderung', async () => {
    await ctx.idbScreenshotPut('profile', 'Seed', 'data:s');
    await ctx.idbScreenshotPut('lscg', '9|FP', 'data:ls');
    await ctx.idbScreenshotPut('wheel', 'fpw', 'data:ws');

    ({ ctx: ctx2 } = await boot());
    await settle(150);
    expect(evalIn(ctx2, 'PROFILE_SCREENSHOTS.Seed')).toBe('data:s');
    expect(evalIn(ctx2, "LSCG_SCREENSHOTS['9|FP']")).toBe('data:ls');
    expect(evalIn(ctx2, "_mbsWheelShots['fpw']")).toBe('data:ws');

    resetOps();
    await flush(ctx2, '_saveProfileScreenshots');
    await flush(ctx2, '_saveLscgScreenshots');
    await flush(ctx2, '_saveMbsWheelShots');
    expect(ops.filter((o) => o.store === 'screenshots')).toHaveLength(0);
  });

  it('Quota beim Flush: false, "Speicher voll"-Status, Shadow unverändert, nächster Flush schreibt nach', async () => {
    evalIn(ctx2, "PROFILE_SCREENSHOTS.Q = 'data:q'");
    const spyPut = globalThis.IDBObjectStore.prototype.put;
    globalThis.IDBObjectStore.prototype.put = function () {
      throw new DOMException('simuliert', 'QuotaExceededError');
    };
    evalIn(ctx2, '_idbFehlerGemeldet = 0');
    const ok = await ctx2._saveProfileScreenshotsJetzt();
    expect(ok).toBe(false);
    expect(ctx2.showStatus).toHaveBeenCalledWith(expect.stringContaining('Speicher voll'), 'error');

    globalThis.IDBObjectStore.prototype.put = spyPut;
    resetOps();
    const ok2 = await ctx2._saveProfileScreenshotsJetzt();
    expect(ok2).toBe(true);
    const shots = shotPuts();
    expect(shots).toHaveLength(1);
    expect(shots[0].arg).toEqual({ id: 'profile|Q', img: 'data:q' });
  });

  it('Statusanzeige #screenshotStoreInfo nennt Migration und Anzahl', async () => {
    const { infoEl } = await boot();
    await settle(100);
    expect(infoEl.textContent).toContain('Migration abgeschlossen');
    expect(infoEl.textContent).toMatch(/\d+ Bilder/);
  });

  it('statisch: items.js ohne Alt-Blob-Writes, Flush je Kind genau einmal, Aufruf-/Lesestellen unverändert', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8');
    expect(count(src, "'BC_PROFILE_SCREENSHOTS_v1'")).toBe(0);
    expect(count(src, "'BC_LSCG_SCREENSHOTS_v1'")).toBe(0);
    expect(count(src, "'BC_MBS_WHEEL_SS_v1'")).toBe(0);
    expect(count(src, 'idbSet(LSCG_SCREENSHOTS_KEY')).toBe(0);
    expect(count(src, 'idbSet(_MBS_WHEEL_SS_KEY')).toBe(0);
    expect(count(src, "_screenshotFlush('profile', PROFILE_SCREENSHOTS)")).toBe(1);
    expect(count(src, "_screenshotFlush('lscg', LSCG_SCREENSHOTS)")).toBe(1);
    expect(count(src, "_screenshotFlush('wheel', _mbsWheelShots)")).toBe(1);
    expect(count(src, '_screenshotStoreReady()')).toBe(3);
    expect(count(src, 'PROFILE_SCREENSHOTS[')).toBe(26);
    expect(count(src, 'LSCG_SCREENSHOTS[')).toBe(20);
    expect(count(src, '_mbsWheelShots[')).toBe(9);
  });
});
