// SPLIT-07 — Screenshot-Export vor der Migration (Plan 04-04). Die neue
// `exportScreenshotsOnly()` reuse-t den bestehenden, groessenfesten
// `_jsonParts`/`Blob`-Pfad aus `exportAllData()` und schreibt die drei
// Screenshot-Maps unter GENAU den Feldnamen von `exportAllData`
// (`profileScreenshots`, `lscgScreenshots`, `mbsWheelShots`), sodass
// `importAllData()` (Restore) die Datei unveraendert wieder einlesen kann.
// Sie liest nur - kein `idbSet`/`delete`/Map-Neuzuweisung im Funktionskoerper.

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, settle, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
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
  const ctx = loadScript(['items.js'], { Blob: FakeBlob, URL: urls, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.createElement = (tag) => {
    const el = makeElementStub();
    el.tagName = tag;
    el.click = vi.fn();
    created.push(el);
    return el;
  };
  ctx.showStatus = vi.fn();
  await settle(50);
  return { ctx, urls, created };
}

function seed(ctx) {
  evalIn(ctx, "PROFILE_SCREENSHOTS = { Anna: 'data:a', 'Bob#1': 'data:b' }; LSCG_SCREENSHOTS = { '123|FP1': 'data:l1', '456': 'data:l2' }; _mbsWheelShots = { 'G:A|G:B': 'data:w' };");
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

describe('exportScreenshotsOnly(): Payload und Download (SPLIT-07)', () => {
  it('exportiert alle drei Maps unter den Feldnamen von exportAllData', async () => {
    const { ctx, urls } = await boot();
    seed(ctx);
    ctx.exportScreenshotsOnly();
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);
    expect(lastBlob(urls).type).toBe('application/json');
    const p = payloadOf(urls);
    expect(Object.keys(p).sort()).toEqual(['_meta', 'lscgScreenshots', 'mbsWheelShots', 'profileScreenshots']);
    expect(p.profileScreenshots).toEqual({ Anna: 'data:a', 'Bob#1': 'data:b' });
    expect(p.lscgScreenshots['123|FP1']).toBe('data:l1');
    expect(p.mbsWheelShots['G:A|G:B']).toBe('data:w');
  });

  it('_meta: exportedAt (ISO), version 1, tool nennt Screenshot, counts je Map', async () => {
    const { ctx, urls } = await boot();
    seed(ctx);
    ctx.exportScreenshotsOnly();
    const p = payloadOf(urls);
    expect(p._meta.version).toBe(1);
    expect(p._meta.tool).toMatch(/Screenshot/);
    expect(typeof Date.parse(p._meta.exportedAt)).toBe('number');
    expect(Number.isNaN(Date.parse(p._meta.exportedAt))).toBe(false);
    expect(p._meta.counts).toEqual({ profileScreenshots: 2, lscgScreenshots: 2, mbsWheelShots: 1 });
  });

  it('Download-Anker: Dateiname BC_Screenshots_YYYY-MM-DD.json, click 1×, href aus createObjectURL', async () => {
    const { ctx, urls, created } = await boot();
    seed(ctx);
    ctx.exportScreenshotsOnly();
    const a = anchor(created);
    expect(a).toBeTruthy();
    expect(a.download).toMatch(/^BC_Screenshots_\d{4}-\d{2}-\d{2}\.json$/);
    expect(a.href).toBe('blob:test');
    expect(a.click).toHaveBeenCalledTimes(1);
    const lastCall = ctx.showStatus.mock.calls.at(-1);
    expect(lastCall[1]).toBe('success');
    expect(lastCall[0]).toContain('2 Profil');
    expect(lastCall[0]).toContain('2 Outfit-Scan');
    expect(lastCall[0]).toContain('1 Wheel');
  });

  it('ausstehende Sammelspeicher-Writes werden vor dem Export ausgeführt', async () => {
    const { ctx, urls } = await boot();
    seed(ctx);
    evalIn(ctx, "PROFILE_SCREENSHOTS.Neu = 'data:n'");
    ctx._saveProfileScreenshots();
    expect(evalIn(ctx, '_sammelSpeicher.offen()')).toBe(1);
    ctx.exportScreenshotsOnly();
    expect(evalIn(ctx, '_sammelSpeicher.offen()')).toBe(0);
    expect(payloadOf(urls).profileScreenshots.Neu).toBe('data:n');
  });

  it('mutiert nichts: Maps vor/nach identisch', async () => {
    const { ctx } = await boot();
    seed(ctx);
    const before = evalIn(ctx, 'JSON.stringify([PROFILE_SCREENSHOTS, LSCG_SCREENSHOTS, _mbsWheelShots])');
    ctx.exportScreenshotsOnly();
    const after = evalIn(ctx, 'JSON.stringify([PROFILE_SCREENSHOTS, LSCG_SCREENSHOTS, _mbsWheelShots])');
    expect(after).toBe(before);
  });

  it('leer: Hinweis per showStatus(info), kein Download', async () => {
    const { ctx, urls, created } = await boot();
    evalIn(ctx, 'PROFILE_SCREENSHOTS = {}; LSCG_SCREENSHOTS = {}; _mbsWheelShots = {};');
    ctx.exportScreenshotsOnly();
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(anchor(created)).toBeUndefined();
    expect(ctx.showStatus).toHaveBeenLastCalledWith('⚠️ Keine Screenshots zum Exportieren', 'info');
  });

  it('Fehlerpfad: createObjectURL wirft → showStatus(error), kein Throw', async () => {
    const { ctx, urls } = await boot();
    seed(ctx);
    urls.createObjectURL = vi.fn(() => { throw new Error('boom'); });
    expect(() => ctx.exportScreenshotsOnly()).not.toThrow();
    const lastCall = ctx.showStatus.mock.calls.at(-1);
    expect(lastCall[1]).toBe('error');
    expect(lastCall[0]).toContain('Screenshot-Export fehlgeschlagen');
    expect(lastCall[0]).toContain('boom');
  });

  it('Payload ist restore-kompatibel: importAllData liest genau diese Feldnamen (statisch)', () => {
    const text = src('items.js');
    // Der Restore liest Bild-Sammlungen ueber _BILD_SAMMLUNGEN/_bildEinspieler
    // (stueckweise, nur ergaenzend) – dort muessen genau diese Feldnamen stehen.
    const importBody = text.slice(text.indexOf('function importAllData'));
    expect(importBody).toContain('_bildEinspieler()');
    const sammlungen = text.slice(text.indexOf('const _BILD_SAMMLUNGEN'), text.indexOf('const _BILD_SAMMLUNGEN') + 200);
    expect(sammlungen).toContain('profileScreenshots:');
    expect(sammlungen).toContain('lscgScreenshots:');
    expect(sammlungen).toContain('mbsWheelShots:');

    const startIdx = text.indexOf('function exportScreenshotsOnly');
    expect(startIdx).toBeGreaterThan(-1);
    const exportBody = text.slice(startIdx, startIdx + 3000);
    expect(exportBody).toContain('profileScreenshots:');
    expect(exportBody).toContain('lscgScreenshots:');
    expect(exportBody).toContain('mbsWheelShots:');
    expect(exportBody).toContain('_jsonParts(payload)');
    expect(exportBody).toContain('bcSpeichernJetzt()');
    expect(exportBody).not.toContain('idbSet(');
    expect(exportBody).not.toContain('delete ');
    expect(exportBody).not.toContain('= {}');
  });
});

describe('Tweaks-Panel: Sektion 🖼️ Screenshot-Speicher (index.html)', () => {
  it('Button und Status-Div genau einmal, zwischen EXEC-Log und Item-Katalog', () => {
    const html = src('index.html');
    expect(count(html, 'onclick="exportScreenshotsOnly()"')).toBe(1);
    expect(count(html, '📷 Screenshots exportieren')).toBe(1);
    expect(count(html, 'id="screenshotStoreInfo"')).toBe(1);
    expect(count(html, '🖼️ Screenshot-Speicher')).toBe(1);
    expect(html.indexOf('id="execLogInfo"')).toBeLessThan(html.indexOf('id="screenshotStoreInfo"'));
    expect(html.indexOf('id="screenshotStoreInfo"')).toBeLessThan(html.indexOf('📦 Item-Katalog'));
  });
});
