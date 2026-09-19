// SCAN-11-Eingabe / SCAN-12-Vorstufe — exportGameSnapshot(id) exportiert
// genau einen Spiel-Scan-Snapshot als JSON-Download über denselben
// _jsonParts/Blob/Anker-Pfad wie exportScreenshotsOnly() (items.js,
// Plan 04-03). Muster: tests/screenshot-export.test.js.

import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, settle, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

function fnBody(text, startIdx) {
  const candidates = [
    text.indexOf('\nasync function ', startIdx + 1),
    text.indexOf('\nfunction ', startIdx + 1),
  ].filter((i) => i > -1);
  const endIdx = candidates.length ? Math.min(...candidates) : text.length;
  return text.slice(startIdx, endIdx);
}

class FakeBlob {
  constructor(parts, opts) {
    this.parts = parts;
    this.type = opts && opts.type;
    this.size = parts.reduce((n, p) => n + String(p).length, 0);
  }
  text() {
    return this.parts.join('');
  }
}

async function boot() {
  const urls = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };
  const created = [];
  const ctx = loadScript(['items.js', 'scan-tab.js'], { Blob: FakeBlob, URL: urls, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.createElement = (tag) => {
    const el = makeElementStub();
    el.tagName = tag;
    el.click = vi.fn();
    created.push(el);
    return el;
  };
  ctx.showStatus = vi.fn();
  await settle(40);
  return { ctx, urls, created };
}

let seq = 0;
function rec(extra) {
  seq++;
  return {
    id: 'ex_' + Date.now() + '_' + seq,
    ts: Date.now() - 86400000 * seq,
    gameVersion: 'R131',
    modCount: 2,
    mods: [{ name: 'BCX', version: '1' }, { name: 'WCE', version: '6' }],
    sizeBytes: 10,
    inventory: {
      schema: 1,
      gameVersion: 'R131',
      globals: { total: 5, getters: [], functions: [], values: [] },
      assets: { count: 3, groupCount: 2, groups: [], items: [] },
      modSdk: { available: true, patchingCount: 4, patching: [] },
      mods: [],
      probes: {},
      chatHooks: {},
      errors: [],
    },
    ...extra,
  };
}

function lastBlob(urls) {
  return urls.createObjectURL.mock.calls.at(-1)[0];
}

function payloadOf(urls) {
  return JSON.parse(lastBlob(urls).text());
}

function anchor(created) {
  return created.find((e) => e.tagName === 'a');
}

// Op-Spy auf add/put/delete des IDBObjectStore-Prototyps (Mutationsfreiheit).
const origAdd = globalThis.IDBObjectStore.prototype.add;
const origPut = globalThis.IDBObjectStore.prototype.put;
const origDelete = globalThis.IDBObjectStore.prototype.delete;
let ops = [];
function installOpSpy() {
  globalThis.IDBObjectStore.prototype.add = function (...args) {
    ops.push({ store: this.name, op: 'add' });
    return origAdd.apply(this, args);
  };
  globalThis.IDBObjectStore.prototype.put = function (...args) {
    ops.push({ store: this.name, op: 'put' });
    return origPut.apply(this, args);
  };
  globalThis.IDBObjectStore.prototype.delete = function (...args) {
    ops.push({ store: this.name, op: 'delete' });
    return origDelete.apply(this, args);
  };
}
afterEach(() => {
  globalThis.IDBObjectStore.prototype.add = origAdd;
  globalThis.IDBObjectStore.prototype.put = origPut;
  globalThis.IDBObjectStore.prototype.delete = origDelete;
  ops = [];
});

describe('exportGameSnapshot(): Payload und Download (SCAN-11-Eingabe)', () => {
  it('exportiert genau den gespeicherten Datensatz unter snapshot; _meta mit version 1, tool nennt Snapshot, exportedAt ISO, snapshotId, counts aus dem Inventar', async () => {
    const { ctx, urls } = await boot();
    const r = rec();
    await ctx.idbSnapshotPut(r);
    await ctx.exportGameSnapshot(r.id);
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);
    expect(lastBlob(urls).type).toBe('application/json');
    const p = payloadOf(urls);
    expect(Object.keys(p).sort()).toEqual(['_meta', 'snapshot']);
    expect(p.snapshot).toEqual(r);
    expect(p._meta.version).toBe(1);
    expect(p._meta.tool).toMatch(/Snapshot/);
    expect(Number.isNaN(Date.parse(p._meta.exportedAt))).toBe(false);
    expect(p._meta.snapshotId).toBe(r.id);
    expect(p._meta.counts).toEqual({ globals: 5, assets: 3, groups: 2, patching: 4, mods: 2 });
  });

  it('Download-Anker: Dateiname BC_Snapshot_<YYYY-MM-DD>_<gameVersion>_<id>.json, click 1×, href aus createObjectURL, Status success mit KB', async () => {
    const { ctx, urls, created } = await boot();
    const r = rec();
    await ctx.idbSnapshotPut(r);
    await ctx.exportGameSnapshot(r.id);
    const a = anchor(created);
    expect(a).toBeTruthy();
    expect(a.download).toMatch(new RegExp('^BC_Snapshot_\\d{4}-\\d{2}-\\d{2}_R131_' + r.id + '\\.json$'));
    expect(a.href).toBe('blob:test');
    expect(a.click).toHaveBeenCalledTimes(1);
    const lastCall = ctx.showStatus.mock.calls.at(-1);
    expect(lastCall[1]).toBe('success');
    expect(lastCall[0]).toContain('exportiert');
    expect(lastCall[0]).toContain(' KB');
  });

  it('unbekannte id: kein Download, showStatus info „nicht gefunden“', async () => {
    const { ctx, urls, created } = await boot();
    await ctx.exportGameSnapshot('ex_nicht_da');
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(anchor(created)).toBeUndefined();
    expect(ctx.showStatus).toHaveBeenLastCalledWith('⚠️ Snapshot nicht gefunden', 'info');
  });

  it('Fehlerpfad: createObjectURL wirft → showStatus error mit Fehlertext, kein Throw', async () => {
    const { ctx, urls } = await boot();
    const r = rec();
    await ctx.idbSnapshotPut(r);
    urls.createObjectURL = vi.fn(() => { throw new Error('boom'); });
    await expect(ctx.exportGameSnapshot(r.id)).resolves.toBe(false);
    const lastCall = ctx.showStatus.mock.calls.at(-1);
    expect(lastCall[1]).toBe('error');
    expect(lastCall[0]).toContain('Snapshot-Export fehlgeschlagen');
    expect(lastCall[0]).toContain('boom');
  });

  it('mutiert nichts: Datensatz vor/nach identisch; keine add/put/delete-Operation auf snapshots während des Exports (Op-Spy)', async () => {
    const { ctx } = await boot();
    const r = rec();
    await ctx.idbSnapshotPut(r);
    installOpSpy();
    ops = [];
    await ctx.exportGameSnapshot(r.id);
    expect(ops.filter((o) => o.store === 'snapshots').length).toBe(0);
    expect(await ctx.idbSnapshotGet(r.id)).toEqual(r);
  });

  it('Sonderzeichen in gameVersion werden im Dateinamen ersetzt; fehlende gameVersion → unbekannt', async () => {
    const { ctx, created } = await boot();
    const r1 = rec({ gameVersion: 'R131 beta/1' });
    await ctx.idbSnapshotPut(r1);
    await ctx.exportGameSnapshot(r1.id);
    const anchors1 = created.filter((e) => e.tagName === 'a');
    const a1 = anchors1[anchors1.length - 1];
    expect(a1.download).toContain('_R131_beta_1_');
    expect(a1.download).not.toMatch(/[/ ]/);

    const r2 = rec({ gameVersion: null });
    await ctx.idbSnapshotPut(r2);
    await ctx.exportGameSnapshot(r2.id);
    const anchors2 = created.filter((e) => e.tagName === 'a');
    const a2 = anchors2[anchors2.length - 1];
    expect(a2.download).toContain('_unbekannt_');
  });

  it('statisch: exportGameSnapshot nutzt _jsonParts + Blob + Anker wie exportScreenshotsOnly; kein Schreibpfad in scan-tab.js', () => {
    const s = src('scan-tab.js');
    const fnStart = s.indexOf('async function exportGameSnapshot(id)');
    expect(fnStart).toBeGreaterThan(-1);
    const body = fnBody(s, fnStart);
    expect(body).toContain('_jsonParts(payload)');
    expect(body).toContain('new Blob(');
    expect(body).toContain("'application/json'");
    expect(body).toContain('URL.createObjectURL(');
    expect(body).toContain('.download = ');
    expect(body).toContain('.click()');
    expect(body).toContain('revokeObjectURL(');
    expect(body).toContain('_scanGetSnapshot('); // liest via idbSnapshotGet (Review WR-01: numerische ids)
    expect(count(body, 'idbSnapshotDelete')).toBe(0);
    expect(count(s, 'idbSnapshotPut(')).toBe(0);
    expect(count(s, 'idbSet(')).toBe(0);
    expect(count(s, 'toLocaleString')).toBe(0);
  });
});
