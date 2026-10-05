import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, settle, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Bilder laden im Hintergrund (bei großen Beständen über 1 GB): in Häppchen statt einem riesigen getAll, Schlüssel vorab ("hat ein
// Bild?" stimmt sofort), sichtbare Bilder einzeln auf Abruf, und alles, was ein vollständiges Archiv braucht, wartet darauf.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };

async function boot({ confirm = () => true } = {}) {
  const ctx = loadScript(['items.js'], { console: quiet, confirm });
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  await ctx._screenshotStoreReady();
  await settle(60);
  return ctx;
}
const id = (p) => p + Math.random().toString(36).slice(2, 8);

describe('Datenbank-Schicht: Häppchen, Schlüssel, Einzelabruf', () => {
  it('idbScreenshotGetAll liest in Häppchen zu 100, liefert alles und meldet ok', async () => {
    const ctx = await boot();
    const pre = id('h');
    const puts = Array.from({ length: 250 }, (_, i) => [pre + '_' + String(i).padStart(4, '0'), 'data:' + i]);
    await ctx.idbScreenshotBatch('profile', puts, []);
    const teile = [];
    const status = {};
    const alle = await ctx.idbScreenshotGetAll('profile', (t) => teile.push(Object.keys(t).length), status);
    const meine = Object.keys(alle).filter((k) => k.startsWith(pre + '_'));
    expect(meine).toHaveLength(250);
    expect(alle[pre + '_0249']).toBe('data:249');
    expect(status.ok).toBe(true);
    expect(teile.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(250);
    expect(Math.max(...teile)).toBeLessThanOrEqual(100);
  });

  it('idbScreenshotKeysOf liefert nur die Schlüssel der Art, ohne Präfix', async () => {
    const ctx = await boot();
    const k = id('s');
    await ctx.idbScreenshotBatch('wheel', [[k + 'a', 'x']], []);
    await ctx.idbScreenshotBatch('lscg', [[k + 'b', 'y']], []);
    const keys = await ctx.idbScreenshotKeysOf('wheel');
    expect(keys).toContain(k + 'a');
    expect(keys).not.toContain(k + 'b');
  });

  it('idbScreenshotGetMany holt nur die gefundenen', async () => {
    const ctx = await boot();
    const k = id('m');
    await ctx.idbScreenshotBatch('profile', [[k + '1', 'data:1'], [k + '2', 'data:2']], []);
    const g = await ctx.idbScreenshotGetMany('profile', [k + '1', k + 'fehlt', k + '2']);
    expect(g).toEqual({ [k + '1']: 'data:1', [k + '2']: 'data:2' });
    expect(await ctx.idbScreenshotGetMany('profile', [])).toEqual({});
  });
});

describe('Beim Start: alle Bilder landen im Speicher, Flags und Versprechen stimmen', () => {
  it('nach dem Laden: bcBilderGeladen() = true, _bildFertig, Schlüsselmenge verworfen', async () => {
    const vorher = await boot();
    const n = id('start');
    await vorher.idbScreenshotBatch('profile', [[n + 'A', 'data:A']], []);
    await vorher.idbScreenshotBatch('wheel', [[n + 'W', 'data:W']], []);
    await vorher.idbScreenshotBatch('lscg', [[n + 'L|F', 'data:L']], []);
    const ctx = loadScript(['items.js'], { console: quiet });
    expect(await ctx.bcBilderGeladen()).toBe(true);
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[n + 'A']).toBe('data:A');
    expect(evalIn(ctx, '_mbsWheelShots')[n + 'W']).toBe('data:W');
    expect(evalIn(ctx, 'LSCG_SCREENSHOTS')[n + 'L|F']).toBe('data:L');
    expect(evalIn(ctx, '[_bildFertig.profile, _bildFertig.lscg, _bildFertig.wheel]')).toEqual([true, true, true]);
    expect(evalIn(ctx, '[_bildKeys.profile, _bildKeys.lscg, _bildKeys.wheel]')).toEqual([null, null, null]);
  });

  it('ein Lesefehler lässt das Archiv NICHT als vollständig gelten (Sicherung würde sonst Bilder auslassen)', async () => {
    const ctx = loadScript(['items.js'], { console: quiet });
    await ctx.bcBilderGeladen();
    evalIn(ctx, '_bilderGeladen.lscg = _verzoegert(); _bilderGeladen.lscg.fertig(false);');
    expect(await ctx.bcBilderGeladen()).toBe(false);
  });
});

describe('Karten und Filter kennen die Bilder schon vor dem Laden (_hatBild)', () => {
  it('Schlüsselmenge zählt als "hat ein Bild", der Speicher auch; gelöscht = weg', async () => {
    const ctx = await boot();
    evalIn(ctx, "_bildFertig.profile = false; _bildKeys.profile = new Set(['Ada']); PROFILE_SCREENSHOTS['Neu'] = 'data:n';");
    expect(evalIn(ctx, "_hatBild('profile', 'Ada')")).toBe(true);
    expect(evalIn(ctx, "_hatBild('profile', 'Neu')")).toBe(true);
    expect(evalIn(ctx, "_hatBild('profile', 'Zoe')")).toBe(false);
    evalIn(ctx, "_bildKeyWeg('profile', 'Ada')");
    expect(evalIn(ctx, "_hatBild('profile', 'Ada')")).toBe(false);
  });

  it('die Profil-Karte zeigt ein Bild (kein Buchstabe), obwohl es noch nicht im Speicher liegt', async () => {
    const ctx = await boot();
    evalIn(ctx, `
      _bildFertig.profile = false; _bildKeys.profile = new Set(['Kleid - Ada']);
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['Kleid - Ada'] = { name: 'Kleid - Ada', items: [{ group: 'Cloth', asset: 'Dress' }] };`);
    const html = evalIn(ctx, "_profileCardHtml('Kleid - Ada', 0, 'Ada', 'blk', _profilDupInfo())");
    expect(html).toContain('data-lz="pf"');
    expect(html).toContain('data-lk="Kleid - Ada"');
    expect(html).not.toContain('pc-placeholder');
    // ohne Schlüssel und ohne Bild: Buchstabe
    evalIn(ctx, '_bildKeys.profile = null;');
    expect(evalIn(ctx, "_profileCardHtml('Kleid - Ada', 0, 'Ada', 'blk', _profilDupInfo())")).toContain('pc-placeholder');
  });

  it('Filter "Mit Bild / Ohne Bild" stimmen schon vor dem Laden', async () => {
    const ctx = await boot();
    evalIn(ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      ['A', 'B', 'C'].forEach(n => { PROFILES[n] = { name: n, items: [] }; });
      _bildFertig.profile = false; _bildKeys.profile = new Set(['A']); PROFILE_SCREENSHOTS['B'] = 'data:b';
      _profileFilter = 'withshot';`);
    expect(evalIn(ctx, '_profilGefiltert().sort()')).toEqual(['A', 'B']);
    evalIn(ctx, "_profileFilter = 'noshot';");
    expect(evalIn(ctx, '_profilGefiltert().sort()')).toEqual(['C']);
  });
});

describe('Sichtbare Bilder werden einzeln nachgeholt', () => {
  it('ein Bild, das noch nicht im Speicher liegt, erscheint nach einem kurzen Einzelabruf – und gilt als gespeichert', async () => {
    const ctx = await boot();
    const k = id('lazy');
    await ctx.idbScreenshotBatch('profile', [[k, 'data:lazy']], []);
    evalIn(ctx, `_bildFertig.profile = false; _bildKeys.profile = new Set([${JSON.stringify(k)}]);`);
    const img = { dataset: { lz: 'pf', lk: k }, _src: '', getAttribute() { return this._src || null; }, set src(v) { this._src = v; }, get src() { return this._src; } };
    ctx._lazyImgLaden(img);
    expect(img.src).toBe('');          // noch nicht im Speicher
    await settle(60);
    expect(img.src).toBe('data:lazy');
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[k]).toBe('data:lazy');
    expect(evalIn(ctx, `_screenshotShadow.profile.get(${JSON.stringify(k)})`)).toBe('data:lazy');   // Schatten: wird nicht noch einmal geschrieben
  });

  it('ein inzwischen neu aufgenommenes Bild hat Vorrang vor dem alten aus der Datenbank', async () => {
    const ctx = await boot();
    const k = id('vorrang');
    await ctx.idbScreenshotBatch('profile', [[k, 'data:alt']], []);
    evalIn(ctx, `_bildKeys.profile = new Set([${JSON.stringify(k)}]); PROFILE_SCREENSHOTS[${JSON.stringify(k)}] = 'data:neu';`);
    evalIn(ctx, `_bilderEinfuegen('profile', { [${JSON.stringify(k)}]: 'data:alt' });`);
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[k]).toBe('data:neu');
  });
});

describe('Umbenennen und Löschen, wenn das Bild noch nicht im Speicher liegt', () => {
  it('Umbenennen nimmt das Bild mit; die alte Datenbank-Zeile verschwindet, die neue steht', async () => {
    const ctx = await boot();
    const a = id('alt'), n = id('neu');
    await ctx.idbScreenshotBatch('profile', [[a, 'data:bild']], []);
    evalIn(ctx, `_bildFertig.profile = false; _bildKeys.profile = new Set([${JSON.stringify(a)}]);`);
    const ok = await evalIn(ctx, `_profilBildUmziehen(${JSON.stringify(a)}, ${JSON.stringify(n)})`);
    expect(ok).toBe(true);
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[n]).toBe('data:bild');
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[a]).toBeUndefined();
    await ctx._saveProfileScreenshotsJetzt();
    const alle = await ctx.idbScreenshotGetAll('profile');
    expect(alle[n]).toBe('data:bild');
    expect(alle[a]).toBeUndefined();
  });

  it('Profil löschen löscht auch ein noch nicht geladenes Bild aus der Datenbank (kein Waise)', async () => {
    const ctx = await boot();
    const k = id('weg');
    await ctx.idbScreenshotBatch('profile', [[k, 'data:x']], []);
    evalIn(ctx, `_bildFertig.profile = false; _bildKeys.profile = new Set([${JSON.stringify(k)}]); PROFILES[${JSON.stringify(k)}] = { name: ${JSON.stringify(k)}, items: [] };`);
    evalIn(ctx, `_profilEntfernen(${JSON.stringify(k)})`);
    await settle(60);
    expect((await ctx.idbScreenshotGetAll('profile'))[k]).toBeUndefined();
    expect(evalIn(ctx, `_hatBild('profile', ${JSON.stringify(k)})`)).toBe(false);
  });
});

describe('Alles, was ein vollständiges Archiv braucht, wartet auf die Bilder', () => {
  it('"Alle Bilder löschen" lehnt ab, solange geladen wird – ohne Rückfrage, ohne etwas zu löschen', async () => {
    const confirm = vi.fn(() => true);
    const ctx = await boot({ confirm });
    evalIn(ctx, "PROFILE_SCREENSHOTS['X'] = 'data:x'; _bildFertig.profile = false;");
    ctx.clearAllProfileScreenshots();
    expect(confirm).not.toHaveBeenCalled();
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')['X']).toBe('data:x');
    expect(ctx.showStatus.mock.calls.some((c) => String(c[0]).includes('noch geladen'))).toBe(true);
  });

  it('Auto-Screenshot-Start und "alle fehlenden LSCG-Bilder" warten, solange nicht bekannt ist, welche Bilder es gibt', async () => {
    const ctx = await boot();
    evalIn(ctx, '_connected = true; _bildFertig.profile = false; _bildKeys.profile = null; _bildFertig.lscg = false; _bildKeys.lscg = null;');
    ctx._startProfileSlideshow();
    expect(evalIn(ctx, '_slideshowRunning')).toBe(false);
    ctx.captureAllMissingOsScreenshots();
    expect(evalIn(ctx, '_osCaptureRunning')).toBe(false);
    expect(ctx.showStatus.mock.calls.filter((c) => String(c[0]).includes('noch geladen')).length).toBeGreaterThanOrEqual(2);
  });

  it('Wheel-Serie wartet auf die Bilddaten (die Auflösung wird geprüft)', async () => {
    const ctx = await boot();
    evalIn(ctx, '_connected = true; _bildFertig.wheel = false;');
    ctx.mbsWheelGenerateAll();
    expect(evalIn(ctx, '_wheelGenRunning')).toBe(false);
    expect(ctx.showStatus.mock.calls.some((c) => String(c[0]).includes('Wheel-Bilder werden noch geladen'))).toBe(true);
  });

  it('Gesamt-Backup: sind die Bilder da, geht es sofort los; schlug das Lesen fehl, wird gefragt', async () => {
    const frage = vi.fn(() => false);
    const ctx = await boot({ confirm: frage });
    evalIn(ctx, '_bildFertig.profile = _bildFertig.lscg = _bildFertig.wheel = true;');
    expect(await evalIn(ctx, '_bilderFuerSicherung()')).toBe(true);
    evalIn(ctx, '_bildFertig.lscg = false; _bilderGeladen.lscg = _verzoegert(); _bilderGeladen.lscg.fertig(false);');
    expect(await evalIn(ctx, '_bilderFuerSicherung()')).toBe(false);   // "Trotzdem erstellen?" → Nein
    expect(frage).toHaveBeenCalledTimes(1);
    expect(String(frage.mock.calls[0][0])).toContain('unvollständig');
  });

  it('die automatische Tagessicherung wartet auf bcBilderGeladen() und setzt bei Misserfolg keinen Tagesvermerk', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'bc-autobackup.js'), 'utf8');
    const iGate = src.indexOf('bcBilderGeladen');
    const iDaten = src.indexOf('var daten = await ergaenzeDaten(baueDaten())');
    const iTag = src.indexOf('cfg.letzterTag = heute()');
    expect(iGate).toBeGreaterThan(-1);
    expect(iGate).toBeLessThan(iDaten);      // erst warten, dann die Daten sammeln
    expect(iDaten).toBeLessThan(iTag);       // Tagesvermerk erst nach erfolgreichem Schreiben
    expect(src).toContain("uebersprungen: 'Bilder noch nicht vollstaendig geladen'");
  });
});

describe('Löschen während des Ladens: ein verspätetes Häppchen setzt das Bild nicht wieder ein', () => {
  it('Grabstein hält das Bild draußen; der nächste Speichervorgang entfernt es auch aus der Datenbank', async () => {
    const ctx = await boot();
    const k = id('grab');
    await ctx.idbScreenshotBatch('profile', [[k, 'data:x']], []);
    const K = JSON.stringify(k);
    evalIn(ctx, `_bildFertig.profile = false; _bildKeys.profile = new Set([${K}]);
      PROFILE_SCREENSHOTS[${K}] = 'data:x'; _screenshotShadow.profile.set(${K}, 'data:x');
      delete PROFILE_SCREENSHOTS[${K}]; _bildKeyWeg('profile', ${K});`);
    evalIn(ctx, `_bilderEinfuegen('profile', { [${K}]: 'data:x' });`);   // das Häppchen war schon unterwegs
    expect(evalIn(ctx, 'PROFILE_SCREENSHOTS')[k]).toBeUndefined();
    await ctx._saveProfileScreenshotsJetzt();
    expect((await ctx.idbScreenshotGetAll('profile'))[k]).toBeUndefined();
  });

  it('ein neu aufgenommenes Bild unter demselben Schlüssel bleibt, auch wenn er einen Grabstein hat', async () => {
    const ctx = await boot();
    const K = JSON.stringify(id('neu'));
    evalIn(ctx, `_bildFertig.profile = false; _bildKeyWeg('profile', ${K}); PROFILE_SCREENSHOTS[${K}] = 'data:frisch';
      _bilderEinfuegen('profile', { [${K}]: 'data:alt' });`);
    expect(evalIn(ctx, `PROFILE_SCREENSHOTS[${K}]`)).toBe('data:frisch');
  });

  it('ist alles geladen, werden die Grabsteine verworfen', async () => {
    const ctx = loadScript(['items.js'], { console: quiet });
    await ctx.bcBilderGeladen();
    expect(evalIn(ctx, '[_bildGeloescht.profile.size, _bildGeloescht.lscg.size, _bildGeloescht.wheel.size]')).toEqual([0, 0, 0]);
  });
});
