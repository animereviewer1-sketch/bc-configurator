// SPLIT-06: additive, verifizierte, idempotente Screenshot-Migration.
// Modelliert auf der in 04-RESEARCH.md "Pattern 3" tatsaechlich ausgefuehrten
// fake-indexeddb-Probe. Die Tests laufen in DIESER Reihenfolge — jede Datei
// bekommt per Vitest-Isolation ihre eigene fake-indexeddb-Instanz, aber
// innerhalb dieser Datei teilen sich alle Sandboxen dieselbe BCKonfigurator-DB
// (mehrere boot()-Aufrufe simulieren mehrere Tool-Tabs gegen dieselbe DB).
// onversionchange laeuft zuletzt, weil es die DB auf Version 3 hebt.
//
// Lädt NUR persistence.js — bridge.js/items.js sind für die Migration nicht
// nötig.

import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, settle, REPO_ROOT } from './helpers/loadScript.js';

function openRaw(version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('BCKonfigurator', version);
    r.onupgradeneeded = (e) => { if (onUpgrade) onUpgrade(e.target.result); };
    r.onsuccess = (e) => resolve(e.target.result);
    r.onerror = (e) => reject(e.target.error);
  });
}

function rawKvPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = (e) => reject(tx.error || e.target.error);
  });
}

function rawKvDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = (e) => reject(tx.error || e.target.error);
  });
}

function rawStoreClear(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = (e) => reject(tx.error || e.target.error);
  });
}

function rawStoreKeys(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('screenshots', 'readonly');
    const req = tx.objectStore('screenshots').getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function boot() {
  const showStatus = vi.fn();
  const ctx = loadScript(['persistence.js'], { showStatus });
  return { ctx, showStatus };
}

const SEED = {
  profile: { Anna: 'data:a', 'Bob#1': 'data:b' },
  lscg: { '123|FP1': 'data:l1', '456': 'data:l2' },
  wheel: { 'G:A|G:B': 'data:w' },
};
const LEGACY = {
  profile: 'BC_PROFILE_SCREENSHOTS_v1',
  lscg: 'BC_LSCG_SCREENSHOTS_v1',
  wheel: 'BC_MBS_WHEEL_SS_v1',
};

const origPut = globalThis.IDBObjectStore.prototype.put;
let puts = [];

// Wrapper um IDBObjectStore.prototype.put — sammelt this.name (Store), ruft
// das Original. installPutSpy() setzt puts jeweils neu zurueck.
function installPutSpy() {
  puts = [];
  globalThis.IDBObjectStore.prototype.put = function (...args) {
    puts.push(this.name);
    return origPut.apply(this, args);
  };
}

afterEach(() => {
  globalThis.IDBObjectStore.prototype.put = origPut;
});

describe('Screenshot-Migration (SPLIT-06) — additiv, verifiziert, idempotent, onblocked/onversionchange sichtbar', () => {
  let ctx, ctx2, ctx3, ctx4, ctx5, ctx6;
  let showStatus, showStatus4, showStatus6;
  let tsBefore;

  it('v1 offen → onblocked sichtbar, Migration wartet; nach close: Store befüllt, Schlüssel/Zählung stimmen, Marker gesetzt, Alt-Blobs unverändert', async () => {
    const db1 = await openRaw(1, (db) => db.createObjectStore('kv'));
    for (const kind of Object.keys(LEGACY)) {
      await rawKvPut(db1, LEGACY[kind], SEED[kind]);
    }

    ({ ctx, showStatus } = boot());
    const ready = ctx._screenshotStoreReady();
    await settle(60);
    expect(showStatus).toHaveBeenCalledWith(expect.stringContaining('Datenbank-Update blockiert'), 'error');

    const race = await Promise.race([ready.then(() => 'done'), settle(40).then(() => 'pending')]);
    expect(race).toBe('pending');

    db1.close();
    const r = await ready;
    expect(r.done).toBe(true);
    expect(r.marker.count).toBe(5);
    expect(r.marker.counts).toEqual({ profile: 2, lscg: 2, wheel: 1 });

    const m = await ctx.idbGet('BC_SCREENSHOT_MIGRATION_v1');
    expect(m.done).toBe(true);
    expect(m.count).toBe(5);
    expect(typeof m.ts).toBe('number');

    for (const kind of Object.keys(SEED)) {
      expect(await ctx.idbScreenshotGetAll(kind)).toEqual(SEED[kind]);
    }
    expect((await ctx.idbScreenshotKeys()).sort()).toEqual([
      'lscg|123|FP1', 'lscg|456', 'profile|Anna', 'profile|Bob#1', 'wheel|G:A|G:B',
    ]);
    for (const kind of Object.keys(LEGACY)) {
      expect(await ctx.idbGet(LEGACY[kind])).toEqual(SEED[kind]);
    }
    expect(evalIn(ctx, '_IDB_VERSION')).toBe(2);
  });

  it('idempotent: zweiter Start überspringt (kein put), Marker unverändert', async () => {
    tsBefore = (await ctx.idbGet('BC_SCREENSHOT_MIGRATION_v1')).ts;
    installPutSpy();
    ({ ctx: ctx2 } = boot());
    const r2 = await ctx2._screenshotStoreReady();
    expect(r2.done).toBe(true);
    expect(r2.skipped).toBe(true);
    expect(puts.filter((n) => n === 'screenshots')).toHaveLength(0);
    expect((await ctx2.idbGet('BC_SCREENSHOT_MIGRATION_v1')).ts).toBe(tsBefore);
  });

  it('add-if-absent: ein bereits im Store liegendes Bild wird nicht vom Alt-Stand überschrieben', async () => {
    const db2 = await openRaw(2);
    await rawKvDelete(db2, 'BC_SCREENSHOT_MIGRATION_v1');
    db2.close();

    await ctx2.idbScreenshotPut('profile', 'Anna', 'data:neu');

    ({ ctx: ctx3 } = boot());
    const r3 = await ctx3._screenshotStoreReady();
    expect(r3.done).toBe(true);
    expect((await ctx3.idbScreenshotGetAll('profile')).Anna).toBe('data:neu');
    expect(r3.marker.count).toBe(5);
  });

  it('Teilfehler: put wirft QuotaExceededError → kein Marker, Store leer, Alt-Blobs intakt, Status; nächster Start migriert', async () => {
    const dbX = await openRaw(2);
    await rawKvDelete(dbX, 'BC_SCREENSHOT_MIGRATION_v1');
    await rawStoreClear(dbX, 'screenshots');
    dbX.close();

    globalThis.IDBObjectStore.prototype.put = function () {
      throw new DOMException('simuliert', 'QuotaExceededError');
    };

    ({ ctx: ctx4, showStatus: showStatus4 } = boot());
    const r4 = await ctx4._screenshotStoreReady();
    expect(r4.done).toBe(false);
    expect(await ctx4.idbGet('BC_SCREENSHOT_MIGRATION_v1')).toBeNull();
    expect(showStatus4).toHaveBeenCalledWith(expect.stringContaining('Screenshot-Migration'), 'error');

    globalThis.IDBObjectStore.prototype.put = origPut;
    expect((await ctx4.idbScreenshotKeys())).toHaveLength(0);
    expect(await ctx4.idbGet(LEGACY.profile)).toEqual(SEED.profile);

    ({ ctx: ctx5 } = boot());
    const r5 = await ctx5._screenshotStoreReady();
    expect(r5.done).toBe(true);
    expect((await ctx5.idbScreenshotKeys())).toHaveLength(5);
  });

  it('Atomizität (Review CR-02): schlägt nur der Marker-Put fehl, werden auch KEINE Bilder committet — kein Wiederbeleben gelöschter Bilder beim Retry', async () => {
    const dbX = await openRaw(2);
    await rawKvDelete(dbX, 'BC_SCREENSHOT_MIGRATION_v1');
    await rawStoreClear(dbX, 'screenshots');
    dbX.close();

    // Nur der kv-Put (Marker) wirft; Screenshot-Puts laufen durch.
    globalThis.IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'kv' && args[1] === 'BC_SCREENSHOT_MIGRATION_v1') throw new DOMException('simuliert', 'QuotaExceededError');
      return origPut.apply(this, args);
    };
    const { ctx: ctxA } = boot();
    const rA = await ctxA._screenshotStoreReady();
    globalThis.IDBObjectStore.prototype.put = origPut;

    expect(rA.done).toBe(false);
    expect(await ctxA.idbGet('BC_SCREENSHOT_MIGRATION_v1')).toBeNull();
    // Entscheidend: gleiche Transaktion → Bilder wurden mit abgebrochen.
    expect(await ctxA.idbScreenshotKeys()).toHaveLength(0);
    expect(await ctxA.idbGet(LEGACY.profile)).toEqual(SEED.profile);

    // Retry beim naechsten Start migriert vollstaendig.
    ({ ctx: ctx5 } = boot());
    const r5b = await ctx5._screenshotStoreReady();
    expect(r5b.done).toBe(true);
    expect(await ctx5.idbScreenshotKeys()).toHaveLength(5);
  });

  it('idbScreenshotBatch: ein put/delete je Eintrag in EINER Transaktion; leere Batches sind ein No-op', async () => {
    installPutSpy();
    expect(await ctx5.idbScreenshotBatch('wheel', [['x', 'd1'], ['y', 'd2']], ['G:A|G:B'])).toBe(true);
    expect(puts.filter((n) => n === 'screenshots')).toHaveLength(2);
    expect(await ctx5.idbScreenshotGetAll('wheel')).toEqual({ x: 'd1', y: 'd2' });

    installPutSpy();
    expect(await ctx5.idbScreenshotBatch('wheel', [], [])).toBe(true);
    expect(puts).toHaveLength(0);

    expect(await ctx5.idbScreenshotDelete('wheel', 'x')).toBe(true);
    expect(await ctx5.idbScreenshotGetAll('wheel')).toEqual({ y: 'd2' });
  });

  it('onversionchange: Verbindung schließt, Status, _IDB_DB null (zuletzt, hebt die DB auf v3)', async () => {
    ({ ctx: ctx6, showStatus: showStatus6 } = boot());
    await ctx6.idbGet('warm');

    const db3 = await openRaw(3);
    expect(showStatus6).toHaveBeenCalledWith(expect.stringContaining('anderen Tab'), 'error');
    expect(evalIn(ctx6, '_IDB_DB')).toBeNull();
    db3.close();
  });

  it('statisch: persistence.js kennt die Alt-Schlüssel nur lesend', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'persistence.js'), 'utf8');
    function count(hay, needle) { return hay.split(needle).length - 1; }
    expect(count(src, "'BC_PROFILE_SCREENSHOTS_v1'")).toBe(1);
    expect(count(src, "'BC_LSCG_SCREENSHOTS_v1'")).toBe(1);
    expect(count(src, "'BC_MBS_WHEEL_SS_v1'")).toBe(1);
    expect(count(src, "'BC_SCREENSHOT_MIGRATION_v1'")).toBe(1);
    expect(count(src, 'objectStore(_IDB_STORE).delete(')).toBe(0);
    expect(count(src, 'deleteDatabase')).toBe(0);
    expect(count(src, 'req.onblocked')).toBe(1);
    expect(count(src, 'db.onversionchange')).toBe(1);
    expect(count(src, 'const _IDB_VERSION = 2;')).toBe(1);
  });
});

// rawStoreKeys steht als Helfer bereit (RESEARCH-Helferliste), auch wenn kein
// Testfall ihn direkt braucht — idbScreenshotKeys() deckt denselben Zweck
// bereits ueber die persistence.js-API ab.
void rawStoreKeys;
