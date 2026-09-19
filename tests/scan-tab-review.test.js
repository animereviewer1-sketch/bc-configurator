// Regressionen aus dem Phase-6-Code-Review (06-REVIEW.md):
//  CR-01 — probes.*.api sind laut loader.js (giDescribeApi) Objekte {name, kind},
//          keine Strings; screenFunctions.sample darf nicht durch eine exklusive
//          ||-Kette verloren gehen. Vorher: „mbs.[object Object]“, LSCG_*-Screens fehlten.
//  WR-01 — Snapshots mit numerischer id (persistence.js erlaubt sie) waren im Tab
//          nicht auswählbar/exportierbar/löschbar (onclick liefert immer Strings).
//  WR-02 — ungültiger ts warf RangeError in _scanFormatTs und brach renderScanTab ab.
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadScript, makeElementStub, settle } from './helpers/loadScript.js';
import { inv } from './helpers/scanFixtures.js';

const require = createRequire(import.meta.url);
const IDS = ['scanSnapshotList', 'scanBaselineInfo', 'scanSearch', 'scanCategory', 'scanCount', 'scanList'];

async function boot({ confirm } = {}) {
  const captured = Object.fromEntries(IDS.map((id) => [id, makeElementStub()]));
  const extra = { setTimeout: () => 0, clearTimeout: () => {} };
  if (confirm !== undefined) extra.confirm = confirm;
  const ctx = loadScript(['items.js', 'baseline-manifest.js', 'scan-tab.js'], extra);
  ctx.document.getElementById = (id) => captured[id] || makeElementStub();
  ctx.showStatus = vi.fn();
  ctx.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  ctx.Blob = class { constructor(parts) { this.parts = parts; } };
  await settle(40);
  return { ctx, captured };
}

describe('CR-01: Mod-API-Einträge als Objekte {name, kind}', () => {
  const { _scanFlatten } = require('../scan-tab.js');

  it('api-Objekte werden auf ihren Namen reduziert; kein „[object Object]“', () => {
    const i = inv();
    i.probes.mbs.api = [{ name: 'wheelOutfits', kind: 'object' }, { name: 'runTests', kind: 'function' }];
    i.probes.lscg = { present: true, loaded: true, api: [{ name: 'Outfits', kind: 'function' }], screenFunctions: { count: 2, sample: ['LSCG_SleepyMiniGameRun', 'LSCG_InjectEnd_Sedative'] } };
    const rows = _scanFlatten(i).filter((r) => r.category === 'probes');
    const names = rows.map((r) => r.name);
    expect(names.some((n) => n.includes('[object Object]'))).toBe(false);
    expect(names).toContain('mbs.wheelOutfits');
    expect(names).toContain('mbs.runTests');
    expect(names).toContain('lscg.Outfits');
  });

  it('api UND screenFunctions.sample werden beide aufgenommen (keine exklusive Kette)', () => {
    const i = inv();
    i.probes.lscg = { present: true, loaded: true, api: [{ name: 'Outfits', kind: 'function' }], screenFunctions: { count: 2, sample: ['LSCG_SleepyMiniGameRun', 'LSCG_InjectEnd_Sedative'] } };
    const names = _scanFlatten(i).filter((r) => r.probe === 'lscg').map((r) => r.name);
    expect(names).toContain('lscg.Outfits');
    expect(names).toContain('lscg.LSCG_SleepyMiniGameRun');
    expect(names).toContain('lscg.LSCG_InjectEnd_Sedative');
  });

  it('String-Einträge (wce.functions, themed.sample) funktionieren weiterhin; Nicht-Strings ohne name werden übersprungen', () => {
    const i = inv();
    i.probes.wce.functions = ['fbcChatNotify', 42, null, { kind: 'x' }];
    const names = _scanFlatten(i).filter((r) => r.probe === 'wce').map((r) => r.name);
    expect(names).toEqual(['wce', 'wce.fbcChatNotify']);
  });
});

describe('WR-01: numerische Snapshot-ids sind im Tab auswählbar, exportierbar, löschbar', () => {
  it('scanSelectSnapshot mit String-id trifft den numerischen Datensatz', async () => {
    const { ctx, captured } = await boot();
    const r = { id: 424242, ts: 9e12 + 1, gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() };
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    await ctx.renderScanTab();
    ctx.scanSelectSnapshot('424242');
    expect(captured.scanSnapshotList.innerHTML).toContain('scan-snap-active');
    expect(captured.scanList.innerHTML).toContain('class="scan-row"');
  });

  it('exportGameSnapshot("<numerisch>") findet den Datensatz und liefert true', async () => {
    const { ctx } = await boot();
    const r = { id: 424243, ts: 9e12 + 2, gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() };
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    expect(await ctx.exportGameSnapshot('424243')).toBe(true);
    expect(ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('exportiert'), 'success');
  });

  it('deleteGameSnapshot("<numerisch>") fragt nach und löscht genau diesen Datensatz', async () => {
    const confirm = vi.fn(() => true);
    const { ctx } = await boot({ confirm });
    const r = { id: 424244, ts: 9e12 + 3, gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() };
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    expect(await ctx.deleteGameSnapshot('424244')).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(await ctx.idbSnapshotGet(424244)).toBeNull();
  });

  it('String-id bleibt String: "123" löscht keinen Datensatz mit id 123, wenn ein Datensatz "123" existiert', async () => {
    const confirm = vi.fn(() => true);
    const { ctx } = await boot({ confirm });
    expect(await ctx.idbSnapshotPut({ id: '99123', ts: 9e12 + 4, gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() })).toBe(true);
    expect(await ctx.idbSnapshotPut({ id: 99123, ts: 9e12 + 5, gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() })).toBe(true);
    expect(await ctx.deleteGameSnapshot('99123')).toBe(true);
    expect(await ctx.idbSnapshotGet('99123')).toBeNull();
    expect(await ctx.idbSnapshotGet(99123)).not.toBeNull();
  });
});

describe('WR-02: ungültiger ts bricht das Rendering nicht ab', () => {
  it('_scanFormatTs wirft nicht bei NaN/undefined/String', () => {
    const { _scanFormatTs } = require('../scan-tab.js');
    expect(() => _scanFormatTs(NaN)).not.toThrow();
    expect(() => _scanFormatTs(undefined)).not.toThrow();
    expect(() => _scanFormatTs('nope')).not.toThrow();
    expect(typeof _scanFormatTs('nope')).toBe('string');
    expect(_scanFormatTs(0)).toBe('1970-01-01 00:00 UTC');
  });

  it('renderScanTab rendert einen Datensatz mit kaputtem ts weiterhin (inkl. 🗑-Button)', async () => {
    const { ctx, captured } = await boot();
    const r = { id: 'bad_ts_' + Date.now(), ts: 'kaputt', gameVersion: 'R131', modCount: 1, mods: [], sizeBytes: 1, inventory: inv() };
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    await expect(ctx.renderScanTab()).resolves.toBeUndefined();
    expect(captured.scanSnapshotList.innerHTML).toContain(r.id);
    expect(captured.scanSnapshotList.innerHTML).toContain('🗑');
  });
});
