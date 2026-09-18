import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadScript, evalIn } from './helpers/loadScript.js';

describe('_lscgMerge setzt fehlende Zeitstempel auf Date.now()', () => {
  let ctx;

  beforeAll(() => {
    ctx = loadScript(['items.js']);
    ctx.showStatus = () => {};
    expect(typeof ctx._lscgMerge).toBe('function');
  });

  it('füllt ts für einen ganz neuen Eintrag (ganzer-Entry-Pfad)', () => {
    const ziel = {};
    const quelle = {
      '123': {
        name: 'Anna',
        versions: [
          { code: 'c1', fingerprint: 'F1' },
          { code: 'c2', fingerprint: 'F2', ts: 0 },
        ],
      },
    };
    const before = Date.now();
    const n = ctx._lscgMerge(ziel, quelle);
    const after = Date.now();
    expect(n).toBe(2);
    expect(ziel['123'].versions[0].ts).toBeGreaterThanOrEqual(before);
    expect(ziel['123'].versions[0].ts).toBeLessThanOrEqual(after);
    expect(ziel['123'].versions[1].ts).toBeGreaterThanOrEqual(before);
    expect(ziel['123'].versions[1].ts).toBeLessThanOrEqual(after);
  });

  it('füllt ts für eine Einzel-Push-Version in einen bestehenden Eintrag', () => {
    const ziel = { '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'F1', ts: 1000 }] } };
    const quelle = { '123': { name: 'Anna', versions: [{ code: 'c9', fingerprint: 'F9' }] } };
    const before = Date.now();
    const n = ctx._lscgMerge(ziel, quelle);
    const after = Date.now();
    expect(n).toBe(1);
    expect(ziel['123'].versions[1].ts).toBeGreaterThanOrEqual(before);
    expect(ziel['123'].versions[1].ts).toBeLessThanOrEqual(after);
    expect(ziel['123'].versions[0].ts).toBe(1000);
  });

  it('überschreibt ein bereits vorhandenes ts nie (beide Pfade)', () => {
    const ziel = { '999': { name: 'Bestehend', versions: [{ code: 'x0', fingerprint: 'FX0', ts: 1234567890 }] } };
    const quelle = {
      '888': { name: 'Neu', versions: [{ code: 'y1', fingerprint: 'FY1', ts: 1234567890 }] },
      '999': { name: 'Bestehend', versions: [{ code: 'y2', fingerprint: 'FY2', ts: 1234567890 }] },
    };
    ctx._lscgMerge(ziel, quelle);
    expect(ziel['888'].versions[0].ts).toBe(1234567890);
    expect(ziel['999'].versions[1].ts).toBe(1234567890);
  });

  it('fasst Duplikate (gleicher Fingerprint) nicht an', () => {
    const ziel = { '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'F1', ts: 1000 }] } };
    const quelle = { '123': { name: 'Anna', versions: [{ code: 'c1-dup', fingerprint: 'F1' }] } };
    const n = ctx._lscgMerge(ziel, quelle);
    expect(n).toBe(0);
    expect(ziel['123'].versions.length).toBe(1);
    expect(ziel['123'].versions[0].ts).toBe(1000);
  });

  it('Backup-Restore end-to-end über LSCG_DB: neue Version bekommt ts (kein 1970)', () => {
    evalIn(ctx, 'LSCG_DB = {}');
    const before = Date.now();
    evalIn(ctx, "_lscgMerge(LSCG_DB, {'7': {name:'Bea', versions:[{code:'x', fingerprint:'FX'}]}})");
    const after = Date.now();
    const db = evalIn(ctx, 'JSON.parse(JSON.stringify(LSCG_DB))');
    const ts = db['7'].versions[0].ts;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
    expect(new Date(ts).getFullYear()).toBeGreaterThanOrEqual(2026);
  });
});

describe('importLscgDB setzt fehlende Zeitstempel auf Date.now()', () => {
  let ctx;
  let inputStub;

  beforeAll(() => {
    ctx = loadScript(['items.js']);
  });

  beforeEach(() => {
    evalIn(ctx, 'LSCG_DB = {}');
    ctx.showStatus = () => {};
    ctx.renderOutfitScanTab = () => {};
    ctx._saveLscgDB = () => {};
    inputStub = null;
    ctx.document.createElement = () => {
      inputStub = { click() {} };
      return inputStub;
    };
    ctx.FileReader = class {
      readAsText(file) {
        this.onload({ target: { result: file.text } });
      }
    };
  });

  function runImport(payload) {
    ctx.importLscgDB();
    inputStub.onchange({ target: { files: [{ text: JSON.stringify(payload) }] } });
    return evalIn(ctx, 'JSON.parse(JSON.stringify(LSCG_DB))');
  }

  it('füllt ts für einen neuen Char ohne ts', () => {
    const before = Date.now();
    const db = runImport({ '55': { name: 'Cleo', versions: [{ code: 'c', fingerprint: 'FC' }] } });
    const after = Date.now();
    const ts = db['55'].versions[0].ts;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
    expect(new Date(ts).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('füllt ts für eine gepushte Version mit ts 0 in bestehendem Char, lässt vorhandene Version unangetastet', () => {
    evalIn(ctx, "LSCG_DB = {'55': {name:'Cleo', nickname:null, versions:[{code:'a', fingerprint:'FA', ts: 5000}]}}");
    const before = Date.now();
    const db = runImport({ '55': { name: 'Cleo', versions: [{ code: 'b', fingerprint: 'FB', ts: 0 }] } });
    const after = Date.now();
    expect(db['55'].versions.length).toBe(2);
    expect(db['55'].versions[1].ts).toBeGreaterThanOrEqual(before);
    expect(db['55'].versions[1].ts).toBeLessThanOrEqual(after);
    expect(db['55'].versions[0].ts).toBe(5000);
  });

  it('überschreibt ein bereits vorhandenes ts beim Import nie', () => {
    const db = runImport({ '55': { name: 'Cleo', versions: [{ code: 'c', fingerprint: 'FC', ts: 1234567890 }] } });
    expect(db['55'].versions[0].ts).toBe(1234567890);
  });
});
