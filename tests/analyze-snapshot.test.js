// SCAN-10/12: tools/analyze-snapshot.js muss exakt dieselben Zahlen liefern
// wie der Scan-Tab (_scanCountBadges aus scan-tab.js) — eine Quelle der
// Wahrheit, deren Zahlen später in GAME-INVENTORY.md (Plan 06-04) landen.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { REPO_ROOT } from './helpers/loadScript.js';
import { inv, SYN_MANIFEST } from './helpers/scanFixtures.js';

const require = createRequire(import.meta.url);

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

const az = require('../tools/analyze-snapshot.js');
const tab = require('../scan-tab.js');

const exported = {
  _meta: { version: 1 },
  snapshot: { id: 'x', ts: 1000, gameVersion: 'R131', modCount: 2, mods: [], sizeBytes: 5, inventory: inv() },
};

describe('analyzeSnapshot / renderMarkdown / CLI (tools/analyze-snapshot.js)', () => {
  it('analyzeSnapshot: Zahlen identisch mit _scanCountBadges aus scan-tab.js; neu-Namen je Kategorie sortiert; meta aus dem Datensatz', () => {
    const r = az.analyzeSnapshot(exported, SYN_MANIFEST);
    expect(r.counts).toEqual(tab._scanCountBadges(tab._scanFlatten(inv()), tab._scanBaselineSets(SYN_MANIFEST)));
    expect(r.neu.globals).toEqual(['CharacterNickname', 'ChatRoomData', 'PlayerG1']);
    expect(r.neu.assets).toEqual(['Ballgag', 'Weird']);
    expect(r.meta).toEqual({ id: 'x', ts: 1000, gameVersion: 'R131', modCount: 2, sizeBytes: 5 });
    expect(r.baseline).toEqual({ identifiers: 3, function: 2, assetGroup: 1, unknown: 0 });
  });

  it('akzeptiert die Rohform (Datensatz ohne _meta) und ein nacktes Inventar', () => {
    const r = az.analyzeSnapshot(exported, SYN_MANIFEST);
    expect(az.analyzeSnapshot(exported.snapshot, SYN_MANIFEST).counts).toEqual(r.counts);
    expect(az.analyzeSnapshot({ inventory: inv() }, SYN_MANIFEST).counts.all).toEqual(r.counts.all);
    expect(() => az.analyzeSnapshot(null, SYN_MANIFEST)).toThrow(/Snapshot/);
    expect(() => az.analyzeSnapshot({}, SYN_MANIFEST)).toThrow(/Snapshot/);
  });

  it('renderMarkdown: Tabellenzeile je Kategorie + all, Limit kappt Listen mit „… (+N weitere)", keine Fenced-Code-Blöcke', () => {
    const r = az.analyzeSnapshot(exported, SYN_MANIFEST);
    const md = az.renderMarkdown(r, { limit: 2 });
    for (const cat of [...tab.SCAN_CATEGORIES, 'all']) {
      expect(md).toContain('| ' + cat + ' |');
    }
    expect(md).toContain('| all | ' + r.counts.all.total);
    expect(md).toContain('(+1 weitere)');
    expect(count(md, '```')).toBe(0);
    expect(md).toContain('R131');
  });

  it('CLI: node tools/analyze-snapshot.js <file> --limit 1 druckt Markdown, Exit 0; ohne Datei Exit ≠ 0 mit Usage', () => {
    const tmp = path.join(os.tmpdir(), 'az_' + Date.now() + '.json');
    fs.writeFileSync(tmp, JSON.stringify(exported));
    const tool = path.join(REPO_ROOT, 'tools/analyze-snapshot.js');
    const out = execFileSync(process.execPath, [tool, tmp, '--limit', '1'], { encoding: 'utf8' });
    expect(out).toContain('| globals |');
    expect(out).toContain('| all |');
    let threw = null;
    try {
      execFileSync(process.execPath, [tool], { stdio: 'pipe' });
    } catch (e) {
      threw = e;
    }
    expect(threw).not.toBe(null);
    const combined = (threw.stderr ? threw.stderr.toString() : '') + (threw.stdout ? threw.stdout.toString() : '');
    expect(combined).toContain('Usage');
  });

  it('statisch: CJS, nur fs/path, require von ../scan-tab.js über __dirname, require.main-Guard, package.json-Script analyze, index.html ohne Bezug', () => {
    const t = src('tools/analyze-snapshot.js');
    expect(count(t, "require(path.join(__dirname, '..', 'scan-tab.js'))")).toBe(1);
    expect(count(t, 'require.main === module')).toBe(1);
    expect(count(t, 'module.exports')).toBe(1);
    expect(t).not.toMatch(/^\s*(export|import)\s/m);
    expect(JSON.parse(src('package.json')).scripts.analyze).toBe('node tools/analyze-snapshot.js');
    expect(count(src('index.html'), 'analyze-snapshot')).toBe(0);
  });
});
