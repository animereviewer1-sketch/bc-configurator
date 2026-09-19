// SCAN-11 — Verhalten des einzigen Snapshot-Löschpfads (deleteGameSnapshot →
// idbSnapshotDelete) plus NEUER statischer Audit. Die STAB-09-Auditdatei
// (tests/delete-confirmation.test.js) ist items.js-/Property-Delete-
// spezifisch und deckt eine IndexedDB-Store-Löschung in persistence.js
// strukturell nicht ab (RESEARCH Pitfall 4) — dieser Audit schließt diese
// Lücke für den neuen Store `snapshots`.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, makeSandbox, loadInto, makeElementStub, evalIn, settle, REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

// Findet das Ende einer Top-Level-Funktionsdeklaration: der Beginn der
// nächsten '\nasync function ' bzw. '\nfunction ' nach startIdx (das kleinere).
function fnBody(text, startIdx) {
  const candidates = [
    text.indexOf('\nasync function ', startIdx + 1),
    text.indexOf('\nfunction ', startIdx + 1),
  ].filter((i) => i > -1);
  const endIdx = candidates.length ? Math.min(...candidates) : text.length;
  return text.slice(startIdx, endIdx);
}

let seq = 0;
function rec(extra) {
  seq++;
  return {
    id: 'sd_' + Date.now() + '_' + seq,
    ts: Date.now() - 86400000 * seq,
    gameVersion: 'R131',
    modCount: 2,
    mods: [{ name: 'BCX', version: '1' }, { name: 'WCE', version: '6' }],
    sizeBytes: 10,
    inventory: { schema: 1, marker: 'm' + seq },
    ...extra,
  };
}

// Op-Spy auf die Lösch-Methode des IDBObjectStore-Prototyps (Muster
// tests/game-scan-bridge.test.js für add — hier für delete).
const origDelete = globalThis.IDBObjectStore.prototype.delete;
let deletes = [];
function installDeleteSpy(impl) {
  globalThis.IDBObjectStore.prototype.delete = function (...args) {
    deletes.push({ store: this.name, key: args[0] });
    if (impl) return impl.call(this, ...args);
    return origDelete.apply(this, args);
  };
}
beforeEach(() => {
  deletes = [];
});
afterEach(() => {
  globalThis.IDBObjectStore.prototype.delete = origDelete;
});

async function boot({ confirm } = {}) {
  const extra = { setTimeout: () => 0, clearTimeout: () => {} };
  if (confirm !== undefined) extra.confirm = confirm;
  const ctx = loadScript(['items.js', 'scan-tab.js'], extra);
  ctx.showStatus = vi.fn();
  ctx.renderScanTab = vi.fn(async () => {});
  await settle(40);
  return ctx;
}

describe('deleteGameSnapshot (SCAN-11): Bestätigung ist Pflicht', () => {
  it('confirm → false: genau ein confirm-Aufruf mit Datum, BC-Version und Mod-Anzahl im Text; keine Lösch-Operation; Datensatz bleibt; kein Status; Rückgabe false', async () => {
    const confirm = vi.fn(() => false);
    const ctx = await boot({ confirm });
    const r = rec();
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    installDeleteSpy();
    expect(await ctx.deleteGameSnapshot(r.id)).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    const msg = confirm.mock.calls[0][0];
    expect(msg).toContain('R131');
    expect(msg).toContain('2 Mods');
    expect(msg).toContain(' UTC');
    expect(msg).toContain('löschen');
    expect(deletes.filter((d) => d.store === 'snapshots').length).toBe(0);
    expect(await ctx.idbSnapshotGet(r.id)).toEqual(r);
    expect(ctx.showStatus).not.toHaveBeenCalled();
    expect(ctx.renderScanTab).not.toHaveBeenCalled();
  });

  it('confirm → true: genau eine Lösch-Operation auf snapshots mit der id; Datensatz weg; zweiter Datensatz unverändert (Kernwert); Status success; renderScanTab aufgerufen; Rückgabe true', async () => {
    const ctx = await boot({ confirm: () => true });
    const a = rec();
    const b = rec();
    expect(await ctx.idbSnapshotPut(a)).toBe(true);
    expect(await ctx.idbSnapshotPut(b)).toBe(true);
    installDeleteSpy();
    expect(await ctx.deleteGameSnapshot(a.id)).toBe(true);
    const snap = deletes.filter((d) => d.store === 'snapshots');
    expect(snap.length).toBe(1);
    expect(snap[0].key).toBe(a.id);
    expect(await ctx.idbSnapshotGet(a.id)).toBeNull();
    expect(await ctx.idbSnapshotGet(b.id)).toEqual(b);
    expect(ctx.showStatus).toHaveBeenCalledWith('✅ Snapshot gelöscht', 'success');
    expect(ctx.renderScanTab).toHaveBeenCalledTimes(1);
  });

  it('unbekannte id: confirm wird NICHT aufgerufen (Existenz-Prüfung zuerst), Status info, keine Lösch-Operation, Rückgabe false', async () => {
    const confirm = vi.fn(() => true);
    const ctx = await boot({ confirm });
    installDeleteSpy();
    expect(await ctx.deleteGameSnapshot('sd_gibt_es_nicht')).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(ctx.showStatus).toHaveBeenCalledWith('⚠️ Snapshot nicht gefunden', 'info');
    expect(deletes.length).toBe(0);
  });

  it('ohne confirm-Global (Sandbox-Default): nichts wird gelöscht, kein Throw, Rückgabe false (fail-closed)', async () => {
    const ctx = await boot();
    const r = rec();
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    installDeleteSpy();
    await expect(ctx.deleteGameSnapshot(r.id)).resolves.toBe(false);
    expect(deletes.length).toBe(0);
    expect(await ctx.idbSnapshotGet(r.id)).toEqual(r);
    expect(ctx.showStatus).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('Fehlerpfad: Lösch-Operation wirft → idbSnapshotDelete false, Status error, Datensatz bleibt, kein Throw, kein renderScanTab', async () => {
    const ctx = await boot({ confirm: () => true });
    const r = rec();
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    installDeleteSpy(() => { throw new Error('kaputt'); });
    expect(await ctx.deleteGameSnapshot(r.id)).toBe(false);
    expect(ctx.showStatus).toHaveBeenCalledWith('❌ Snapshot konnte nicht gelöscht werden', 'error');
    globalThis.IDBObjectStore.prototype.delete = origDelete;
    expect(await ctx.idbSnapshotGet(r.id)).toEqual(r);
    expect(ctx.renderScanTab).not.toHaveBeenCalled();
  });

  it('idbSnapshotDelete direkt: ungültige id → false ohne IDB-Zugriff; gültige unbekannte id → true (IDB-Semantik), Store sonst unverändert; fehlende id-Argumente löschen nie einen Datensatz', async () => {
    const ctx = await boot();
    const r = rec();
    expect(await ctx.idbSnapshotPut(r)).toBe(true);
    installDeleteSpy();
    for (const v of [undefined, null, {}, '']) {
      expect(await ctx.idbSnapshotDelete(v)).toBe(false);
      expect(deletes.length).toBe(0);
    }
    expect(await ctx.idbSnapshotDelete('sd_unbekannt_' + Date.now())).toBe(true);
    expect(await ctx.idbSnapshotGet(r.id)).toEqual(r);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installDeleteSpy(() => { throw new Error('x'); });
    expect(await ctx.idbSnapshotDelete(r.id)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[IDB] snapshot delete'), expect.anything());
    warnSpy.mockRestore();
  });
});

describe('audit: genau eine Lösch-Operation, genau eine bestätigte Aufrufstelle (T-6-03)', () => {
  it('persistence.js: die Lösch-Methode auf objectStore(_IDB_SNAPSHOTS) genau einmal, innerhalb von idbSnapshotDelete; keine clear-/deleteDatabase-Operation; Export enthält idbSnapshotDelete; id-Validierung vorhanden; Version 3', () => {
    const p = src('persistence.js');
    expect(count(p, 'objectStore(_IDB_SNAPSHOTS).delete(')).toBe(1);
    const fnStart = p.indexOf('async function idbSnapshotDelete(id)');
    expect(fnStart).toBeGreaterThan(-1);
    const body = fnBody(p, fnStart);
    expect(count(body, 'objectStore(_IDB_SNAPSHOTS).delete(')).toBe(1);
    expect(count(body, "'readwrite'")).toBe(1);
    expect(count(body, "console.warn('[IDB] snapshot delete:'")).toBe(1);
    expect(body).toContain("typeof id === 'number'");
    expect(body).toContain("typeof id === 'string'");
    expect(count(p, 'objectStore(_IDB_SNAPSHOTS).clear(')).toBe(0);
    expect(count(p, 'deleteDatabase')).toBe(0);
    expect(count(p, 'const _IDB_VERSION = 3;')).toBe(1);
    const tailStart = p.indexOf("if (typeof module !== 'undefined' && module.exports)");
    expect(tailStart).toBeGreaterThan(-1);
    expect(p.slice(tailStart)).toContain('idbSnapshotDelete');
  });

  it('scan-tab.js: idbSnapshotDelete( genau einmal, innerhalb deleteGameSnapshot, nach confirm(, typeof-Guard auf confirm, keine Schleife um die Aufrufstelle; Datei ohne eigene IDB-/Bridge-/Schreiblogik', () => {
    const s = src('scan-tab.js');
    expect(count(s, 'idbSnapshotDelete(')).toBe(1);
    const fnStart = s.indexOf('async function deleteGameSnapshot(id)');
    expect(fnStart).toBeGreaterThan(-1);
    const body = fnBody(s, fnStart);
    expect(count(body, 'idbSnapshotDelete(')).toBe(1);
    expect(count(body, 'confirm(')).toBe(1);
    expect(body.indexOf('confirm(')).toBeLessThan(body.indexOf('idbSnapshotDelete('));
    expect(body).toContain('typeof confirm');
    expect(body.indexOf('idbSnapshotGet(')).toBeLessThan(body.indexOf('confirm('));
    expect(
      count(body, 'for (') + count(body, 'while (') + count(body, '.forEach(') + count(body, '.map(') + count(body, 'Promise.all(')
    ).toBe(0);
    expect(count(s, '.delete(')).toBe(0);
    expect(count(s, '.clear(')).toBe(0);
    expect(count(s, 'indexedDB.open(')).toBe(0);
    expect(count(s, 'idbSnapshotPut(')).toBe(0);
    expect(count(s, 'idbSet(')).toBe(0);
    expect(count(s, "addEventListener('message'")).toBe(0);
    expect(count(s, 'postMessage(')).toBe(0);
    expect(count(s, 'setInterval(')).toBe(0);
    expect(count(s, 'loadOrderFatal')).toBe(1);
    expect(s).toContain('wurde nicht vor scan-tab.js geladen');
  });

  it('kein anderer Aufrufer: alle Root-JS-Dateien außer persistence.js/scan-tab.js und index.html enthalten idbSnapshotDelete nicht; tools/ und tests/ ausgenommen', () => {
    const files = fs.readdirSync(REPO_ROOT).filter((f) => f.endsWith('.js') && f !== 'persistence.js' && f !== 'scan-tab.js');
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const f of files) {
      expect(count(src(f), 'idbSnapshotDelete')).toBe(0);
    }
    expect(count(src('index.html'), 'idbSnapshotDelete')).toBe(0);
  });

  it('Ladereihenfolge-Guard: ohne items.js FATAL-Box + Throw; in Node (ohne window) lädt scan-tab.js ohne Throw und exportiert deleteGameSnapshot/exportGameSnapshot', async () => {
    const created = [];
    const sb = makeSandbox();
    sb.document.createElement = (tag) => {
      const el = makeElementStub();
      el.tagName = tag;
      created.push(el);
      return el;
    };
    loadInto(sb, 'persistence.js');
    expect(() => loadInto(sb, 'scan-tab.js')).toThrow(/items\.js/);
    const box = created.find((e) => e.id === 'loadOrderFatal');
    expect(box).toBeTruthy();
    expect(box.textContent.startsWith('FATAL: ')).toBe(true);
    expect(box.textContent).toContain('scan-tab.js');
    expect(box.textContent.endsWith('(siehe docs/LOAD-ORDER.md)')).toBe(true);

    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const m = require('../scan-tab.js');
    expect(typeof m.deleteGameSnapshot).toBe('function');
    expect(typeof m.exportGameSnapshot).toBe('function');
    expect(typeof m._scanFormatTs).toBe('function');
    expect(m._scanFormatTs(0)).toBe('1970-01-01 00:00 UTC');
  });
});
