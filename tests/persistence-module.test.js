// SPLIT-01 — persistence.js ist ein klassisches Skript UND per Dual-Export
// importierbar (Orchestrator-Entscheidung 1, RESEARCH „Pattern 1: Dual-export
// global script“). Dieser Test deckt beide Ladewege ab: `createRequire` (CJS,
// so wie Vitest es sähe) und die vm-Sandbox (so wie der Browser es sieht).
// Zusätzlich prüft er die Loader-Expansion (`CORE_SCRIPTS`/`expandLoadOrder`)
// und ein statisches Extraktions-Gate gegen Doppeldefinitionen (Pitfall 2).

import { describe, it, expect, beforeAll } from 'vitest';
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
    expect(Object.keys(mod).sort()).toEqual(['_debounce', '_idbOpen', 'idbGet', 'idbSet']);
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
    expect(Object.keys(module.exports).sort()).toEqual(['_debounce', '_idbOpen', 'idbGet', 'idbSet']);
  });

  it('Round-Trip über die Sandbox (wie tests/idb-helpers.test.js, aber ohne items.js)', async () => {
    const ctx = loadScript(['persistence.js']);
    expect(await ctx.idbSet('PM_sb', [1, 2])).toBe(true);
    expect(JSON.stringify(await ctx.idbGet('PM_sb'))).toBe('[1,2]');
  });
});

describe('loadScript expandiert die Kern-Reihenfolge (CORE_SCRIPTS)', () => {
  it('CORE_SCRIPTS beginnt mit persistence.js und endet mit items.js', () => {
    expect(CORE_SCRIPTS[0]).toBe('persistence.js');
    expect(CORE_SCRIPTS.at(-1)).toBe('items.js');
  });

  it('expandLoadOrder fügt fehlende Vorläufer vor dem ersten items.js ein und lässt alles andere unangetastet', () => {
    expect(expandLoadOrder(['items.js'])).toEqual([...CORE_SCRIPTS]);
    expect(expandLoadOrder(['items.js', 'bot-data.js'])).toEqual([...CORE_SCRIPTS, 'bot-data.js']);
    expect(expandLoadOrder(['persistence.js', 'items.js'])).toEqual(['persistence.js', 'bridge.js', 'items.js']);
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
