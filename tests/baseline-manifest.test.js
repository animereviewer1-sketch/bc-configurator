// SCAN-09 — Baseline-Manifest-Frische-Diff (T-6-01).
// Der Generator (tools/build-baseline.js) wird in-memory erneut ausgeführt
// und mit den committeten Dateien baseline-manifest.json/.js verglichen.
// Das Manifest trägt bewusst keinen Zeitstempel (Determinismus, Orchestrator-
// Entscheidung 1) — deshalb ist ein Ganz-Objekt-Vergleich zulässig; RESEARCH
// Pitfall 5 (generatedAt im Diff) ist damit gegenstandslos.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadScript, evalIn, REPO_ROOT } from './helpers/loadScript.js';

const require = createRequire(import.meta.url);
// RED: tools/build-baseline.js existiert noch nicht — "Cannot find module" ist gewollt.
const gen = require('../tools/build-baseline.js');

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function norm(s) {
  return s.replace(/\r\n/g, '\n');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

const SOURCE_FILES_EXPECTED = ['bot-engine.js', 'items.js', 'bot-ui.js', 'bot-data.js', 'loader.js'];
const PROBES_EXPECTED = ['bcx', 'lscg', 'mbs', 'themed', 'wce'];

describe('Baseline-Manifest ist aktuell (SCAN-09, T-6-01)', () => {
  it('baseline-manifest.json entspricht einer frischen Generierung aus den fünf Quelldateien (toEqual, ohne Zeitstempel)', () => {
    const fresh = gen.buildBaseline(REPO_ROOT);
    expect(JSON.parse(src('baseline-manifest.json'))).toEqual(fresh.manifest);
  });

  it('baseline-manifest.js und .json sind byte-identisch mit renderManifestJs/renderManifestJson(fresh)', () => {
    const fresh = gen.buildBaseline(REPO_ROOT);
    expect(norm(src('baseline-manifest.js'))).toBe(norm(gen.renderManifestJs(fresh.manifest)));
    expect(norm(src('baseline-manifest.json'))).toBe(norm(gen.renderManifestJson(fresh.manifest)));
    expect(fresh.js).toBe(gen.renderManifestJs(fresh.manifest));
    expect(fresh.json).toBe(gen.renderManifestJson(fresh.manifest));
  });

  it('Generator ist deterministisch: zwei Läufe liefern identische Strings; Manifest enthält keinen Zeitstempel', () => {
    const a = gen.buildBaseline(REPO_ROOT);
    const b = gen.buildBaseline(REPO_ROOT);
    expect(a.json).toBe(b.json);
    expect(a.js).toBe(b.js);
    expect(Object.keys(a.manifest)).not.toContain('generatedAt');
    expect(a.json).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('Form: schema 1, sourceFiles, identifiers sortiert/eindeutig, kind-Wertebereich, files sortierte Teilmenge, counts, chatHooks, modProbes', () => {
    const m = JSON.parse(src('baseline-manifest.json'));
    expect(m.schema).toBe(1);
    expect(m.sourceFiles).toEqual(SOURCE_FILES_EXPECTED);
    expect(typeof m.identifierPattern).toBe('string');
    expect(m.identifierPattern).toContain('Inventory|Character|ChatRoom');

    const names = m.identifiers.map((e) => e.name);
    const sorted = [...names].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    expect(names).toEqual(sorted);
    expect(new Set(names).size).toBe(names.length);

    for (const e of m.identifiers) {
      expect(['function', 'assetGroup', 'unknown']).toContain(e.kind);
      expect(e.files.length).toBeGreaterThanOrEqual(1);
      expect(e.files).toEqual([...e.files].sort());
      for (const f of e.files) expect(SOURCE_FILES_EXPECTED).toContain(f);
    }

    expect(m.counts.identifiers).toBe(names.length);
    const actualFn = m.identifiers.filter((e) => e.kind === 'function').length;
    const actualAg = m.identifiers.filter((e) => e.kind === 'assetGroup').length;
    const actualUn = m.identifiers.filter((e) => e.kind === 'unknown').length;
    expect(m.counts.function).toBe(actualFn);
    expect(m.counts.assetGroup).toBe(actualAg);
    expect(m.counts.unknown).toBe(actualUn);
    expect(m.counts.function + m.counts.assetGroup + m.counts.unknown).toBe(names.length);

    expect(m.chatHooks).toEqual(['ChatRoomRegisterMessageHandler']);
    expect(m.modProbes).toEqual(PROBES_EXPECTED);
  });

  it('Mindestumfang und Stichproben: ≥ 60 Bezeichner; InventoryWear = function (bot-engine.js, items.js, loader.js); ItemNeck = assetGroup; LockMemberNumber = unknown', () => {
    const m = JSON.parse(src('baseline-manifest.json'));
    const byName = Object.fromEntries(m.identifiers.map((e) => [e.name, e]));
    expect(m.identifiers.length).toBeGreaterThanOrEqual(60);
    expect(byName.InventoryWear.kind).toBe('function');
    expect(byName.InventoryWear.files).toEqual(['bot-engine.js', 'items.js', 'loader.js']);
    expect(byName.ItemNeck.kind).toBe('assetGroup');
    expect(byName.LockMemberNumber.kind).toBe('unknown');
    expect(byName.ChatRoomSendChat.kind).toBe('function');
  });

  it('jeder modProbes-Key steht in loader.js als Objektschlüssel', () => {
    const m = JSON.parse(src('baseline-manifest.json'));
    const loaderSrc = src('loader.js');
    for (const p of m.modProbes) {
      expect(loaderSrc).toMatch(new RegExp('\\b' + p + ': \\{'));
    }
  });
});

describe('Klassifikation (classif, Pitfall 3)', () => {
  it('Aufruf-Form → function; Item-Präfix in Anführungszeichen → assetGroup; Property-Zugriff/unquoted Item-Präfix → unknown; Aufruf schlägt Anführungszeichen', () => {
    expect(gen.classifyIdentifier('InventoryWear', 'x = InventoryWear(a, b);')).toBe('function');
    expect(gen.classifyIdentifier('InventoryWear', 'if (InventoryWear (a)) {}')).toBe('function');
    expect(gen.classifyIdentifier('ItemNeck', "const g = 'ItemNeck';")).toBe('assetGroup');
    expect(gen.classifyIdentifier('ItemNeck', 'const g = "ItemNeck";')).toBe('assetGroup');
    expect(gen.classifyIdentifier('ItemNeck', 'const g = `ItemNeck`;')).toBe('assetGroup');
    expect(gen.classifyIdentifier('ChatSettings', 'Player.ChatSettings.x')).toBe('unknown');
    expect(gen.classifyIdentifier('ItemName', 'a.ItemName + b')).toBe('unknown');
    expect(gen.classifyIdentifier('ItemColorLoad', "'ItemColorLoad'; ItemColorLoad(c);")).toBe('function');
    expect(() => gen.classifyIdentifier('Item.Neck', "'Item.Neck'")).not.toThrow();
  });

  it('extractBaseline über synthetische Quellen: Namen eindeutig + sortiert, files sortiert, counts konsistent, Name aus zwei Dateien listet beide', () => {
    const r = gen.extractBaseline({
      'b.js': 'InventoryWear(y); Player.ChatSettings;',
      'a.js': "InventoryWear(x); 'ItemNeck'; InventoryWear(z);",
    });
    expect(r.identifiers).toEqual([
      { name: 'ChatSettings', kind: 'unknown', files: ['b.js'] },
      { name: 'InventoryWear', kind: 'function', files: ['a.js', 'b.js'] },
      { name: 'ItemNeck', kind: 'assetGroup', files: ['a.js'] },
    ]);
    expect(r.sourceFiles).toEqual(['b.js', 'a.js']);
    expect(r.counts).toEqual({ identifiers: 3, function: 1, assetGroup: 1, unknown: 1 });
    expect(r.chatHooks).toEqual(['ChatRoomRegisterMessageHandler']);
    expect(r.modProbes).toEqual(PROBES_EXPECTED);
    expect(r.schema).toBe(1);
  });

  it('renderManifestJs: Generiert-Kommentar, genau eine const-Zuweisung, gültiges JS, abschließendes Semikolon und Newline', () => {
    const r = gen.extractBaseline({
      'b.js': 'InventoryWear(y); Player.ChatSettings;',
      'a.js': "InventoryWear(x); 'ItemNeck'; InventoryWear(z);",
    });
    const js = gen.renderManifestJs(r);
    expect(js.startsWith('// GENERIERT von tools/build-baseline.js')).toBe(true);
    expect(count(js, 'const BASELINE_MANIFEST = ')).toBe(1);
    expect(js.endsWith('};\n')).toBe(true);
    expect(new Function(js + '\nreturn BASELINE_MANIFEST;')().identifiers.length).toBe(3);
    expect(gen.renderManifestJson(r)).toBe(JSON.stringify(r, null, 2) + '\n');
  });
});

describe('baseline-manifest.js in der Sandbox und statisch', () => {
  it('loadScript([\'baseline-manifest.js\']) definiert BASELINE_MANIFEST mit derselben Anzahl Bezeichner wie die JSON-Datei', () => {
    const ctx = loadScript(['baseline-manifest.js']);
    expect(evalIn(ctx, 'BASELINE_MANIFEST.schema')).toBe(1);
    expect(evalIn(ctx, 'BASELINE_MANIFEST.identifiers.length')).toBe(JSON.parse(src('baseline-manifest.json')).identifiers.length);
    expect(evalIn(ctx, 'BASELINE_MANIFEST.modProbes.join()')).toBe(PROBES_EXPECTED.join());
  });

  it('statisch: baseline-manifest.js klassisch, tools/build-baseline.js CJS und dev-only, package.json-Script, index.html ohne Generator-Bezug', () => {
    const bm = src('baseline-manifest.js');
    expect(bm.split('\n')[0].startsWith('// GENERIERT von tools/build-baseline.js')).toBe(true);
    expect(count(bm, 'const BASELINE_MANIFEST = ')).toBe(1);
    expect(bm).not.toMatch(/^\s*(export|import)\s/m);
    expect(count(bm, 'require(')).toBe(0);
    expect(count(bm, 'module.exports')).toBe(0);

    const gb = src('tools/build-baseline.js');
    expect(count(gb, "require('fs')") + count(gb, "require('node:fs')")).toBeGreaterThanOrEqual(1);
    expect(count(gb, 'module.exports')).toBe(1);
    expect(count(gb, 'require.main === module')).toBe(1);
    expect(gb).not.toMatch(/^\s*(export|import)\s/m);
    expect(count(gb, 'new Date')).toBe(0);
    expect(count(gb, 'Date.now')).toBe(0);

    const pkg = JSON.parse(src('package.json'));
    expect(pkg.scripts.baseline).toBe('node tools/build-baseline.js');
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(['@vitest/coverage-v8', 'fake-indexeddb', 'lz-string', 'vitest']);
    expect(pkg.dependencies).toBeUndefined();

    const html = src('index.html');
    expect(count(html, 'build-baseline')).toBe(0);
  });
});
