// SPLIT-04 — fehlt persistence.js vor items.js, bricht items.js sichtbar ab
// (rote Box `#loadOrderFatal`, Throw) statt still mit einem tiefen
// ReferenceError zu scheitern. Die Ladereihenfolge ist zweifach dokumentiert:
// als HTML-Kommentar in index.html und in docs/LOAD-ORDER.md.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, loadInto, makeSandbox, makeElementStub, settle, REPO_ROOT } from './helpers/loadScript.js';

// Der Migrations-Bootstrap in items.js loggt asynchron nach Testende — mit dem Host-console
// kollidiert das mit dem Vitest-Worker-Teardown (EnvironmentTeardownError). Stumm + abwarten.
const quietConsole = { log() {}, warn() {}, error() {}, info() {}, debug() {} };

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
  it('kein Throw, idbGet und showStatus sind Funktionen', async () => {
    const ctx = loadScript(['items.js'], { console: quietConsole });
    expect(typeof ctx.idbGet).toBe('function');
    expect(typeof ctx.showStatus).toBe('function');
    await settle(150); // Bootstrap (Migration/Store-Load) ausklingen lassen
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

describe('Plan 04-02: bridge.js im Guard, bot-ui.js-Guard', () => {
  function loadRaw(files) {
    const sb = makeSandbox();
    const created = [];
    sb.document.createElement = (tag) => {
      const el = makeElementStub();
      el.tagName = tag;
      created.push(el);
      return el;
    };
    const load = () => {
      for (const f of files) loadInto(sb, f);
    };
    return { sb, created, load };
  }

  it('items.js ohne bridge.js wirft mit bridge.js-Hinweis, Box nennt bridge.js statt persistence.js', () => {
    const { created, load } = loadRaw(['persistence.js', 'items.js']);
    expect(load).toThrow(/bridge\.js/);
    const box = created.find((e) => e.id === 'loadOrderFatal');
    expect(box).toBeDefined();
    expect(box.textContent).toContain('bridge.js');
    expect(box.textContent).not.toContain('persistence.js');
  });

  it('bot-ui.js ohne items.js (persistence.js + bridge.js vorhanden) wirft mit items.js-Hinweis', () => {
    const { load } = loadRaw(['persistence.js', 'bridge.js', 'bot-ui.js']);
    expect(load).toThrow(/items\.js/);
  });

  it('bot-ui.js ohne bridge.js und items.js: Meldung nennt beide fehlenden Module, Box-Text FATAL…docs/LOAD-ORDER.md', () => {
    const { created, load } = loadRaw(['persistence.js', 'bot-ui.js']);
    expect(load).toThrow(/bridge\.js/);
    const box = created.find((e) => e.id === 'loadOrderFatal');
    expect(box).toBeDefined();
    expect(box.textContent).toContain('bridge.js, items.js');
    expect(box.textContent).toMatch(/^FATAL: /);
    expect(box.textContent.trim().endsWith('(siehe docs/LOAD-ORDER.md)')).toBe(true);
  });

  it('loadScript(["items.js", "bot-data.js", "bot-ui.js"]) wirft nicht; renderBotTab ist eine Funktion', async () => {
    const ctx = loadScript(['items.js', 'bot-data.js', 'bot-ui.js'], { console: quietConsole });
    await settle(150);
    expect(typeof ctx.renderBotTab).toBe('function');
  });

  it('index.html: bridge.js liegt zwischen persistence.js und items.js, Kommentar nennt bridge.js', () => {
    const html = src('index.html');
    const persistIdx = html.indexOf('persistence.js?_=');
    const bridgeIdx = html.indexOf('bridge.js?_=');
    const itemsIdx = html.indexOf('items.js?_=');
    expect(persistIdx).toBeLessThan(bridgeIdx);
    expect(bridgeIdx).toBeLessThan(itemsIdx);
    expect(html.indexOf('LADEREIHENFOLGE')).not.toBe(-1);
    expect(html.slice(html.indexOf('LADEREIHENFOLGE'), html.indexOf('LADEREIHENFOLGE') + 200)).toContain('bridge.js');
  });

  it('docs/LOAD-ORDER.md nennt bridge.js, onBridgeMessage/offBridgeMessage und den bot-ui.js-Guard', () => {
    const doc = src('docs/LOAD-ORDER.md');
    expect(doc).toContain('bridge.js');
    expect(doc).toContain('onBridgeMessage');
    expect(doc).toContain('offBridgeMessage');
    expect(doc).toContain('bot-ui.js');
    expect(doc).toMatch(/GAME_SCAN_DATA|MEIN_TYP/);
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
