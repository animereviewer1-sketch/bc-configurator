import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Bild neu aufnehmen / entfernen geht in allen drei Tabs (Profile, LSCG Outfits, MBS Wheel); das Hochladen eigener Dateien
// gibt es nicht mehr.

const LZString = createRequire(import.meta.url)('lz-string');
const CODE = LZString.compressToBase64('[]');
const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function boot() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  ctx.__m = [];
  evalIn(ctx, 'showStatus = function (m) { __m.push(m); };');
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, els, execs, meldungen: ctx.__m };
}
const lies = (ctx, a) => evalIn(ctx, a);

describe('Kein Hochladen mehr', () => {
  it('Funktion und Knopf sind weg', () => {
    const { ctx } = boot();
    expect(ctx.uploadProfileScreenshot).toBeUndefined();
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    expect(html).not.toContain('uploadProfileScreenshot');
    expect(html).not.toContain('pmodUploadBtn');
    expect(html).toContain('profilBildNeu(');
  });
});

describe('Profil: Bild neu aufnehmen', () => {
  function profile(extra = '') {
    const t = boot();
    evalIn(t.ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['Mia - Code'] = { name: 'Mia - Code', _outfitCode: ${JSON.stringify(CODE)}, items: [] };
      PROFILES['Mia - Leer'] = { name: 'Mia - Leer', items: [] };
      PROFILES['Mia - Roh']  = { name: 'Mia - Roh', items: [{ group: 'Cloth', asset: 'Dress' }] };
      _connected = true; _slideshowRunning = false; ${extra}
    `);
    return t;
  }

  it('Outfit-Code-Profil: ein EXEC, das lokal anzieht, fotografiert und zurücksetzt (Sync-Sperre, stehend, AFK)', () => {
    const t = profile();
    t.ctx.profilBildNeu('Mia - Code');
    expect(t.execs().length).toBe(1);
    const code = t.execs()[0];
    expect(() => new Function(code)).not.toThrow();
    expect(code).toContain('__BCU_sperreGen');
    expect(code).toContain('AfkTimerReset');
    expect(code).toContain('PoseSetActive');
    expect(t.meldungen.at(-1)).toContain('wird aufgenommen');
  });

  it('läuft gerade der Auto-Screenshot, wird nichts dazwischengeschoben', () => {
    const t = profile('_slideshowRunning = true;');
    t.ctx.profilBildNeu('Mia - Code');
    expect(t.execs().length).toBe(0);
    expect(t.meldungen.at(-1)).toMatch(/Auto-Screenshot läuft/);
  });

  it('nicht verbunden: Hinweis statt Absturz', () => {
    const t = profile('_connected = false;');
    t.ctx.profilBildNeu('Mia - Code');
    expect(t.execs().length).toBe(0);
    expect(t.meldungen.at(-1)).toMatch(/Nicht verbunden/);
  });

  it('Profil ohne Items, oder ohne geladenen Cache: klare Meldung, nichts wird gesendet und der Outfit-Aufbau bleibt unberührt', () => {
    const t = profile('OUTFIT = [{ stehengeblieben: true }];');
    t.ctx.profilBildNeu('Mia - Leer');
    expect(t.meldungen.at(-1)).toMatch(/keine Items/);
    evalIn(t.ctx, 'Object.keys(CACHE).forEach(k => delete CACHE[k]);');
    t.ctx.profilBildNeu('Mia - Roh');
    expect(t.meldungen.at(-1)).toMatch(/Cache nicht geladen/);
    expect(t.execs().length).toBe(0);
    expect(lies(t.ctx, 'OUTFIT.length')).toBe(1);
  });

  it('unbekanntes Profil: nichts passiert', () => {
    const t = profile();
    t.ctx.profilBildNeu('gibt es nicht');
    expect(t.execs().length).toBe(0);
  });

  it('Modal: Knopf heißt "neu aufnehmen", sobald ein Bild da ist, und "Entfernen" erscheint nur dann', () => {
    const t = profile();
    const knopf = makeElementStub(), weg = makeElementStub();
    t.els.pmodCaptureBtn = knopf; t.els.pmodRemoveBtn = weg;
    const panel = makeElementStub(); panel.querySelectorAll = () => []; panel.insertBefore = () => {};
    t.els.pmodImgPanel = panel;
    evalIn(t.ctx, "PROFILE_SCREENSHOTS['Mia - Code'] = 'data:x'; _profileModalNames = ['Mia - Code']; _profileModalIdx = 0;");
    t.ctx._renderProfileModal('Mia - Code');
    expect(knopf.textContent).toMatch(/neu aufnehmen/);
    expect(weg.style.display).toBe('');
    evalIn(t.ctx, "delete PROFILE_SCREENSHOTS['Mia - Code']");
    t.ctx._renderProfileModal('Mia - Code');
    expect(knopf.textContent).toMatch(/Bild aufnehmen/);
    expect(weg.style.display).toBe('none');
  });
});

describe('Lightbox (LSCG und Wheel): 🔄 Neu aufnehmen', () => {
  it('LSCG: Lightbox merkt sich Spieler und Version; der Knopf schließt und nimmt genau diese Version neu auf', () => {
    const t = boot();
    evalIn(t.ctx, `
      LSCG_DB['1'] = { name: 'Mia', versions: [{ fingerprint: 'fa', code: ${JSON.stringify(CODE)}, ts: 1 }, { fingerprint: 'fb', code: ${JSON.stringify(CODE)}, ts: 2 }] };
      LSCG_SCREENSHOTS['1|fb'] = 'data:bild';
      __aufnahmen = []; captureOsScreenshot = function (mk, i) { __aufnahmen.push([mk, i]); };
    `);
    t.ctx.openOsLightboxVersion('1', 1);
    expect(t.els.osLbNeuBtn.style.display).toBe('');
    t.ctx.osLightboxNeuAufnehmen();
    expect(lies(t.ctx, '__aufnahmen')).toEqual([['1', 1]]);
    expect(lies(t.ctx, '_osLightboxNeu')).toBeNull();   // Lightbox ist zu
  });

  it('Wheel: der Knopf nimmt das Outfit neu auf', () => {
    const t = boot();
    evalIn(t.ctx, `
      _mbsWheelData = [{ memberNumber: 5, name: 'Mia', outfits: [{ name: 'A', items: [{ group: 'Cloth', asset: 'Dress' }] }] }];
      _mbsWheelShots = { 'Cloth:Dress': 'data:bild' };
      __aufnahmen = []; mbsWheelCaptureShot = function (mn, oi) { __aufnahmen.push([mn, oi]); };
    `);
    t.ctx.mbsWheelOpenShot(0, 5, 0);
    expect(t.els.osLbNeuBtn.style.display).toBe('');
    t.ctx.osLightboxNeuAufnehmen();
    expect(lies(t.ctx, '__aufnahmen')).toEqual([[5, 0]]);
  });

  it('ältere Ansicht ohne Version (nur Spieler): kein Neu-Aufnehmen-Knopf', () => {
    const t = boot();
    evalIn(t.ctx, "LSCG_DB['1'] = { name: 'Mia', versions: [] }; LSCG_SCREENSHOTS['1'] = 'data:bild';");
    t.ctx.openOsLightbox('1');
    expect(t.els.osLbNeuBtn.style.display).toBe('none');
  });
});

describe('Karten zeigen 🔄 und 🗑 nur, wenn ein Bild da ist', () => {
  it('LSCG', () => {
    const t = boot();
    evalIn(t.ctx, `
      LSCG_DB['1'] = { name: 'Mia', versions: [{ fingerprint: 'fa', code: ${JSON.stringify(CODE)}, ts: 1 }, { fingerprint: 'fb', code: ${JSON.stringify(CODE)}, ts: 2 }] };
      LSCG_SCREENSHOTS['1|fb'] = 'data:bild'; _osFavs = new Set(); _osOutfitFavs = new Set(); _osFavFilter = false; _osLockFilter = ''; _osSearchQuery = '';
    `);
    const body = makeElementStub(); t.els.outfitScanBody = body;
    t.ctx.renderOutfitScanTab();
    const mitBild = body.innerHTML.slice(body.innerHTML.indexOf('data-vidx="1"'), body.innerHTML.indexOf('data-vidx="0"'));
    const ohneBild = body.innerHTML.slice(body.innerHTML.indexOf('data-vidx="0"'));
    expect(mitBild).toContain('os-card-redo');
    expect(mitBild).toContain('os-card-del');
    expect(ohneBild).not.toContain('os-card-redo');
  });

  it('Wheel', () => {
    const t = boot();
    evalIn(t.ctx, `
      _mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [
        { name: 'Mit', items: [{ group: 'Cloth', asset: 'Dress' }] }, { name: 'Ohne', items: [{ group: 'Cloth', asset: 'Rock' }] }] }];
      _mbsWheelShots = { 'Cloth:Dress': 'data:bild' }; _mbsWheelFilter = 'all'; _mbsWheelSearch = '';
    `);
    const body = makeElementStub(); t.els.wheelOutfitBody = body;
    t.ctx._renderMbsWheelTab();
    const html = body.innerHTML;
    const mit = html.slice(html.indexOf('Mit'), html.indexOf('Ohne'));
    expect(html.split('os-card-redo').length - 1).toBe(1);
    expect(mit).toBeTruthy();
  });
});
