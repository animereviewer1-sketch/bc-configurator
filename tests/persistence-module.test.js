// SPLIT-01 — persistence.js ist ein klassisches Skript UND per Dual-Export
// importierbar (Orchestrator-Entscheidung 1, RESEARCH „Pattern 1: Dual-export
// global script“). Dieser Test deckt beide Ladewege ab: `createRequire` (CJS,
// so wie Vitest es sähe) und die vm-Sandbox (so wie der Browser es sieht).
// Zusätzlich prüft er die Loader-Expansion (`CORE_SCRIPTS`/`expandLoadOrder`)
// und ein statisches Extraktions-Gate gegen Doppeldefinitionen (Pitfall 2).

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadScript, loadInto, makeSandbox, evalIn, expandLoadOrder, CORE_SCRIPTS, REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

describe('persistence.js per CJS-Require (Dual-Export, Pattern B)', () => {
  let mod;

  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      globalThis.localStorage = {
        getItem: () => null,
        setItem() {},
        removeItem() {},
      };
    }
    const require = createRequire(import.meta.url);
    mod = require('../persistence.js');
  });

  it('exportiert idbGet, idbSet, _idbOpen, _debounce als Funktionen', () => {
    expect(typeof mod.idbGet).toBe('function');
    expect(typeof mod.idbSet).toBe('function');
    expect(typeof mod._idbOpen).toBe('function');
    expect(typeof mod._debounce).toBe('function');
    expect(Object.keys(mod).sort()).toEqual([
      'SCREENSHOT_KINDS', 'SCREENSHOT_LEGACY_KEYS', 'SCREENSHOT_MIGRATION_KEY',
      '_debounce', '_idbOpen', '_migrateScreenshotsToStore', '_screenshotStoreReady',
      'idbGet', 'idbScreenshotBatch', 'idbScreenshotDelete', 'idbScreenshotGetAll', 'idbScreenshotKeys', 'idbScreenshotPut',
      'idbSet', 'idbSnapshotDelete', 'idbSnapshotGet', 'idbSnapshotGetAll', 'idbSnapshotKeys', 'idbSnapshotPut',
    ]);
  });

  it('idbSet → idbGet Round-Trip über das required Modul gegen fake-indexeddb', async () => {
    expect(await mod.idbSet('PM_rt', { a: 1 })).toBe(true);
    expect(await mod.idbGet('PM_rt')).toEqual({ a: 1 });
    expect(await mod.idbGet('PM_missing')).toBeNull();
  });

  it('_debounce ruft fn nach Ablauf genau einmal mit den letzten Argumenten', async () => {
    const calls = [];
    const d = mod._debounce((...a) => calls.push(a), 5);
    d(1);
    d(2);
    await new Promise((r) => setTimeout(r, 30));
    expect(calls).toEqual([[2]]);
  });
});

describe('persistence.js als klassisches Skript in der vm-Sandbox', () => {
  it('ohne module-Global: Funktionen sind Globals, kein Export-Versuch', () => {
    const ctx = loadScript(['persistence.js']);
    expect(typeof ctx.idbGet).toBe('function');
    expect(typeof ctx.idbSet).toBe('function');
    expect(typeof ctx._idbOpen).toBe('function');
    expect(typeof ctx._debounce).toBe('function');
    expect(evalIn(ctx, 'typeof module')).toBe('undefined');
    expect(evalIn(ctx, '_IDB_STORE')).toBe('kv');
    expect(evalIn(ctx, '_IDB_NAME')).toBe('BCKonfigurator');
  });

  it('mit module-Global füllt der Export-Schwanz module.exports', () => {
    const module = { exports: {} };
    loadScript(['persistence.js'], { module });
    expect(typeof module.exports.idbGet).toBe('function');
    expect(Object.keys(module.exports).sort()).toEqual([
      'SCREENSHOT_KINDS', 'SCREENSHOT_LEGACY_KEYS', 'SCREENSHOT_MIGRATION_KEY',
      '_debounce', '_idbOpen', '_migrateScreenshotsToStore', '_screenshotStoreReady',
      'idbGet', 'idbScreenshotBatch', 'idbScreenshotDelete', 'idbScreenshotGetAll', 'idbScreenshotKeys', 'idbScreenshotPut',
      'idbSet', 'idbSnapshotDelete', 'idbSnapshotGet', 'idbSnapshotGetAll', 'idbSnapshotKeys', 'idbSnapshotPut',
    ]);
  });

  it('Round-Trip über die Sandbox (wie tests/idb-helpers.test.js, aber ohne items.js)', async () => {
    const ctx = loadScript(['persistence.js']);
    expect(await ctx.idbSet('PM_sb', [1, 2])).toBe(true);
    expect(JSON.stringify(await ctx.idbGet('PM_sb'))).toBe('[1,2]');
  });
});

describe('loadScript expandiert die Kern-Reihenfolge (CORE_SCRIPTS)', () => {
  it('CORE_SCRIPTS beginnt mit persistence.js und endet mit game-scan.js (Phase 5: nach items.js)', () => {
    expect(CORE_SCRIPTS[0]).toBe('persistence.js');
    expect(CORE_SCRIPTS.at(-1)).toBe('game-scan.js');
    expect(CORE_SCRIPTS.indexOf('items.js')).toBeLessThan(CORE_SCRIPTS.indexOf('game-scan.js'));
  });

  it('expandLoadOrder fügt fehlende Vorläufer vor dem ersten items.js ein und lässt alles andere unangetastet', () => {
    expect(expandLoadOrder(['items.js'])).toEqual([...CORE_SCRIPTS]);
    expect(expandLoadOrder(['items.js', 'bot-data.js'])).toEqual([...CORE_SCRIPTS, 'bot-data.js']);
    expect(expandLoadOrder(['persistence.js', 'items.js'])).toEqual(['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']);
    expect(expandLoadOrder(['bot-data.js'])).toEqual(['bot-data.js']);
    expect(expandLoadOrder([])).toEqual([]);
    const inp = ['items.js'];
    expandLoadOrder(inp);
    expect(inp).toEqual(['items.js']);
  });

  it('loadScript(["items.js"]) liefert eine Sandbox mit idbGet aus persistence.js', () => {
    const ctx = loadScript(['items.js']);
    expect(typeof ctx.idbGet).toBe('function');
    expect(evalIn(ctx, '_IDB_VERSION')).toBeGreaterThanOrEqual(1);
  });

  it('loadInto bleibt roh: items.js allein ohne persistence.js scheitert', () => {
    expect(() => loadInto(makeSandbox(), 'items.js')).toThrow();
  });
});

describe('statisches Extraktions-Gate (Pitfall 2: keine Doppeldefinition)', () => {
  const markers = [
    'function _idbOpen()',
    'async function idbGet(key)',
    'async function idbSet(key, value)',
    'function _debounce(fn, delay)',
    'indexedDB.open(',
    "const _IDB_NAME    = 'BCKonfigurator';",
    "'BC_Money_v1','BC_Rank_v1','BC_Shop_v1','BC_Bots_v2','BC_BotGroups_v1'",
    'let _idbFehlerGemeldet = 0;',
  ];

  it('Definitionen liegen genau einmal in persistence.js und nicht mehr in items.js', () => {
    const persistenceSrc = src('persistence.js');
    const itemsSrc = src('items.js');
    for (const marker of markers) {
      expect(count(persistenceSrc, marker)).toBe(1);
      expect(count(itemsSrc, marker)).toBe(0);
    }
  });

  it('persistence.js ist klassisch: kein type=module, kein export/import-Statement, geguardeter module.exports-Schwanz', () => {
    const persistenceSrc = src('persistence.js');
    expect(persistenceSrc).not.toMatch(/^\s*(export|import)\s/m);
    expect(count(persistenceSrc, "if (typeof module !== 'undefined' && module.exports)")).toBe(1);
    expect(count(persistenceSrc, 'window.idbGet =')).toBe(0);
  });

  it('items.js referenziert kein Top-Level-window/localStorage-Sweep: die 36 Ad-hoc-localStorage-Stellen bleiben', () => {
    expect(count(src('items.js'), 'localStorage.')).toBeGreaterThanOrEqual(30);
    expect(count(src('persistence.js'), 'localStorage.')).toBeLessThanOrEqual(3);
  });
});

// SCAN-08 (Speicherhälfte): IndexedDB v3 mit dem additiven Object-Store
// `snapshots` (keyPath 'id') und den add-only-Primitiven idbSnapshotPut/
// GetAll/Get/Keys. Add-only ist Kernwert: ein Snapshot wird NIE überschrieben
// (add statt put), Fehler laufen sichtbar über _idbSchreibfehler. Löschen
// ausschließlich über idbSnapshotDelete hinter Bestätigung (Phase 6, SCAN-11;
// Verhalten + Audit in tests/snapshot-delete.test.js).
describe('Snapshot-Store (SCAN-08, IDB v3)', () => {
  const origAdd = globalThis.IDBObjectStore.prototype.add;

  function rec(id, extra) {
    return {
      id,
      ts: id,
      gameVersion: 'R131',
      modCount: 1,
      mods: [{ name: 'BCX', version: '1.1.19' }],
      sizeBytes: 12,
      inventory: { schema: 1, marker: 'a' },
      ...extra,
    };
  }

  function openRaw(version) {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('BCKonfigurator', version);
      r.onupgradeneeded = () => {};
      r.onsuccess = (e) => resolve(e.target.result);
      r.onerror = (e) => reject(e.target.error);
    });
  }

  function boot() {
    const showStatus = vi.fn();
    const ctx = loadScript(['persistence.js'], { showStatus });
    evalIn(ctx, '_idbFehlerGemeldet = 0');
    return { ctx, showStatus };
  }

  afterEach(() => {
    globalThis.IDBObjectStore.prototype.add = origAdd;
  });

  it('_IDB_VERSION ist 3; Stores kv, screenshots, snapshots; snapshots hat keyPath id', async () => {
    const { ctx } = boot();
    await ctx.idbGet('warm');
    expect(evalIn(ctx, '_IDB_VERSION')).toBe(3);
    const db = await openRaw(3);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(['kv', 'screenshots', 'snapshots']);
    expect(db.transaction('snapshots', 'readonly').objectStore('snapshots').keyPath).toBe('id');
    db.close();
  });

  it('Round-Trip: put → get/getAll/keys, Reihenfolge nach ts', async () => {
    const { ctx, showStatus } = boot();
    expect(await ctx.idbSnapshotPut(rec(2000))).toBe(true);
    expect(await ctx.idbSnapshotPut(rec(1000))).toBe(true);
    expect(await ctx.idbSnapshotGet(1000)).toEqual(rec(1000));
    expect(await ctx.idbSnapshotGet(999)).toBeNull();
    expect((await ctx.idbSnapshotGetAll()).map((r) => r.id)).toEqual([1000, 2000]);
    expect((await ctx.idbSnapshotKeys()).sort()).toEqual([1000, 2000]);
    expect(showStatus).not.toHaveBeenCalled();
  });

  it('add-only: gleiche id ein zweites Mal → false, Statusmeldung, erster Datensatz unverändert (Kernwert)', async () => {
    const { ctx, showStatus } = boot();
    expect(await ctx.idbSnapshotPut(rec(1000, { inventory: { schema: 1, marker: 'b' } }))).toBe(false);
    expect(showStatus).toHaveBeenCalledWith(expect.stringContaining('Speichern fehlgeschlagen (Spiel-Snapshot)'), 'error');
    expect((await ctx.idbSnapshotGet(1000)).inventory.marker).toBe('a');
    expect((await ctx.idbSnapshotKeys()).length).toBe(2);
  });

  it('Quota: add wirft QuotaExceededError → false, „Speicher voll" sichtbar, nichts geschrieben', async () => {
    const { ctx, showStatus } = boot();
    evalIn(ctx, '_idbFehlerGemeldet = 0');
    globalThis.IDBObjectStore.prototype.add = function () {
      const e = new Error('quota');
      e.name = 'QuotaExceededError';
      throw e;
    };
    expect(await ctx.idbSnapshotPut(rec(3000))).toBe(false);
    expect(showStatus).toHaveBeenCalledWith(expect.stringContaining('Speicher voll'), 'error');
    expect(showStatus.mock.calls[0][0]).toContain('Spiel-Snapshot');
    globalThis.IDBObjectStore.prototype.add = origAdd;
    expect(await ctx.idbSnapshotGet(3000)).toBeNull();
  });

  it('ungültiger Datensatz (ohne numerische id) → false ohne IDB-Zugriff', async () => {
    const { ctx, showStatus } = boot();
    evalIn(ctx, '_idbFehlerGemeldet = 0');
    let addCalls = 0;
    globalThis.IDBObjectStore.prototype.add = function (...args) {
      addCalls++;
      return origAdd.apply(this, args);
    };
    expect(await ctx.idbSnapshotPut({ ts: 1 })).toBe(false);
    expect(await ctx.idbSnapshotPut(null)).toBe(false);
    expect(addCalls).toBe(0);
    expect(showStatus).toHaveBeenCalledWith(expect.stringContaining('Spiel-Snapshot'), 'error');
  });

  it('Store-Fehler in getAll/keys/get werden geloggt und degradieren zu []/[]/null', async () => {
    const { ctx } = boot();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const origGetAll = globalThis.IDBObjectStore.prototype.getAll;
    globalThis.IDBObjectStore.prototype.getAll = function () { throw new Error('kaputt'); };
    expect(await ctx.idbSnapshotGetAll()).toEqual([]);
    globalThis.IDBObjectStore.prototype.getAll = origGetAll;

    const origGetAllKeys = globalThis.IDBObjectStore.prototype.getAllKeys;
    globalThis.IDBObjectStore.prototype.getAllKeys = function () { throw new Error('kaputt'); };
    expect(await ctx.idbSnapshotKeys()).toEqual([]);
    globalThis.IDBObjectStore.prototype.getAllKeys = origGetAllKeys;

    const origGet = globalThis.IDBObjectStore.prototype.get;
    globalThis.IDBObjectStore.prototype.get = function () { throw new Error('kaputt'); };
    expect(await ctx.idbSnapshotGet(1000)).toBeNull();
    globalThis.IDBObjectStore.prototype.get = origGet;

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[IDB]'), expect.anything());
    warn.mockRestore();
  });

  it('statisch: Lösch-API nur idbSnapshotDelete (SCAN-11), Version 3, Store additiv, add statt put', () => {
    const persistenceSrc = src('persistence.js');
    expect(count(persistenceSrc, 'const _IDB_VERSION = 3;')).toBe(1);
    expect(count(persistenceSrc, "const _IDB_SNAPSHOTS = 'snapshots';")).toBe(1);
    expect(count(persistenceSrc, "createObjectStore(_IDB_SNAPSHOTS, { keyPath: 'id' })")).toBe(1);
    expect(count(persistenceSrc, 'objectStore(_IDB_SNAPSHOTS).add(')).toBe(1);
    expect(count(persistenceSrc, 'objectStore(_IDB_SNAPSHOTS).put(')).toBe(0);
    expect(count(persistenceSrc, 'objectStore(_IDB_SNAPSHOTS).delete(')).toBe(1);
    expect(count(persistenceSrc, 'objectStore(_IDB_SNAPSHOTS).clear(')).toBe(0);
    expect(count(persistenceSrc, 'async function idbSnapshotDelete(id)')).toBe(1);
    expect(count(persistenceSrc, 'idbSnapshotDelete')).toBeGreaterThanOrEqual(2);
    expect(count(persistenceSrc, 'deleteDatabase')).toBe(0);
    expect(count(persistenceSrc, "_idbSchreibfehler('Spiel-Snapshot'")).toBeGreaterThanOrEqual(1);
  });
});
