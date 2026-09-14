// SPLIT-04 — fehlt persistence.js vor items.js, bricht items.js sichtbar ab
// (rote Box `#loadOrderFatal`, Throw) statt still mit einem tiefen
// ReferenceError zu scheitern. Die Ladereihenfolge ist zweifach dokumentiert:
// als HTML-Kommentar in index.html und in docs/LOAD-ORDER.md.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, loadInto, makeSandbox, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

describe('items.js ohne persistence.js: sichtbare FATAL-Box + Throw, kein tiefer ReferenceError', () => {
  it('wirft mit persistence.js-Hinweis und rendert #loadOrderFatal', () => {
    const sb = makeSandbox();
    const created = [];
    sb.document.createElement = (tag) => {
      const el = makeElementStub();
      el.tagName = tag;
      created.push(el);
      return el;
    };
    expect(() => loadInto(sb, 'items.js')).toThrow(/persistence\.js/);
    const box = created.find((e) => e.id === 'loadOrderFatal');
    expect(box).toBeDefined();
    expect(box.textContent).toMatch(/^FATAL: /);
    expect(box.textContent).toContain('persistence.js');
    expect(box.textContent).toContain('items.js');
    expect(box.textContent).toContain('docs/LOAD-ORDER.md');
    expect(sb.idbGet).toBeUndefined();
  });
});

describe('items.js mit persistence.js davor läuft an', () => {
  it('kein Throw, idbGet und showStatus sind Funktionen', () => {
    const ctx = loadScript(['items.js']);
    expect(typeof ctx.idbGet).toBe('function');
    expect(typeof ctx.showStatus).toBe('function');
  });
});

describe('Guard ist die erste Anweisung und selbstgenügsam', () => {
  it('loadOrderFatal steht vor _debouncedSaveCurseDB, in den ersten 20 Zeilen, ohne idbGet(-Aufruf', () => {
    const lines = src('items.js').split('\n');
    const guardIdx = lines.findIndex((l) => l.includes('loadOrderFatal'));
    const debouncedIdx = lines.findIndex((l) => l.includes('const _debouncedSaveCurseDB'));
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(debouncedIdx).toBeGreaterThan(guardIdx);
    const first20 = lines.slice(0, 20).join('\n');
    expect(first20).toMatch(/typeof window\[/);
    expect(first20).not.toMatch(/idbGet\(/);
  });
});

describe('index.html: Kommentar + persistence.js-Write vor items.js-Write im _cbv-Block', () => {
  it('Reihenfolge, Kommentar und Feature-Kette sind korrekt', () => {
    const html = src('index.html');
    expect(count(html, 'persistence.js?_=')).toBe(1);
    expect(html.indexOf('persistence.js?_=')).toBeLessThan(html.indexOf('items.js?_='));
    expect(html.indexOf('LADEREIHENFOLGE')).not.toBe(-1);
    expect(html.indexOf('LADEREIHENFOLGE')).toBeLessThan(html.indexOf('var _cbv = Date.now();'));

    const blockStart = html.lastIndexOf('<script>', html.indexOf('var _cbv = Date.now();'));
    const blockEnd = html.indexOf('</script>', blockStart);
    const persistIdx = html.indexOf('persistence.js?_=');
    const itemsIdx = html.indexOf('items.js?_=');
    expect(persistIdx).toBeGreaterThan(blockStart);
    expect(persistIdx).toBeLessThan(blockEnd);
    expect(itemsIdx).toBeGreaterThan(blockStart);
    expect(itemsIdx).toBeLessThan(blockEnd);

    const featureChain = ['money.js', 'rank.js', 'shop.js', 'inventar.js', 'bot-data.js', 'bot-ui.js', 'bot-engine.js', 'outfit-import.js', 'bc-autobackup.js'];
    let lastIdx = -1;
    for (const m of featureChain) {
      expect(count(html, m + '?_=')).toBe(1);
      const idx = html.indexOf(m + '?_=');
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});

describe('docs/LOAD-ORDER.md dokumentiert Kette, Guard und Test-Expansion', () => {
  it('Datei existiert und nennt alle Module', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'docs/LOAD-ORDER.md'))).toBe(true);
    const doc = src('docs/LOAD-ORDER.md');
    expect(doc).toContain('persistence.js');
    expect(doc).toContain('items.js');
    for (const m of ['money.js', 'rank.js', 'shop.js', 'inventar.js', 'bot-data.js', 'bot-ui.js', 'bot-engine.js', 'outfit-import.js', 'bc-autobackup.js']) {
      expect(doc).toContain(m);
    }
    expect(doc).toContain('bc-icons.js');
    expect(doc).toContain('loadOrderFatal');
    expect(doc).toContain('CORE_SCRIPTS');
    expect(doc).toContain('document.write');
  });
});
