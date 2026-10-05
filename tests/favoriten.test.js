import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Favoriten:
//  - Outfit & Profile: der Stern ändert nur diese eine Karte (früher wurde die ganze Liste neu gebaut → langes Warten)
//  - LSCG Outfits: der Stern auf einer Karte merkt nur DIESES Outfit (früher die ganze Zeile des Spielers);
//    der Filter "Favoriten" zeigt nur die einzeln markierten

const LZString = createRequire(import.meta.url)('lz-string');
const CODE = LZString.compressToBase64('[]');

function boot() {
  const els = {};
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => els[id];
  ctx.__spur = [];
  evalIn(ctx, `
    renderProfileList = function () { __spur.push('profil-neu'); };
    renderOutfitScanTab = function () { __spur.push('os-neu'); };
    idbSet = function (k, v) { __spur.push(['idb', k, v]); };
  `);
  return { ctx, els, spur: () => ctx.__spur };
}

const klassen = () => ({ toggle: vi.fn() });

// ── Outfit & Profile ─────────────────────────────────────────────────────────

describe('Profil-Favorit: nur die eine Karte ändert sich', () => {
  function liste({ filter = 'all', weitere = true, mitKarte = true } = {}) {
    const t = boot();
    const stern = { classList: klassen(), textContent: '☆' };
    const knopf = { classList: klassen() };
    const block = { querySelectorAll: () => (weitere ? [{}, {}] : []), querySelector: () => ({ textContent: '' }), remove: vi.fn() };
    const karte = {
      querySelector: (s) => (s === '.pc-fav' ? stern : s === '.pc-btn[title="Favorit"]' ? knopf : null),
      closest: () => block, remove: vi.fn(),
    };
    t.els.profileListEl = { _profileKeys: ['A', 'B'], querySelector: () => (weitere ? {} : null) };
    if (mitKarte) t.els.prow_0 = karte;
    evalIn(t.ctx, `_profileFilter = ${JSON.stringify(filter)}; _profileNameMap['p_0'] = 'A'; PROFILE_FAVS.clear();`);
    return { ...t, stern, knopf, karte, block };
  }

  it('Favorit setzen: Stern und Knopf dieser Karte schalten um, die Liste wird NICHT neu gebaut', () => {
    const { ctx, stern, knopf, spur } = liste();
    ctx.toggleProfileFav('A');
    expect(evalIn(ctx, "PROFILE_FAVS.has('A')")).toBe(true);
    expect(stern.classList.toggle).toHaveBeenCalledWith('on', true);
    expect(stern.textContent).toBe('⭐');
    expect(knopf.classList.toggle).toHaveBeenCalledWith('fav-on', true);
    expect(spur()).not.toContain('profil-neu');
  });

  it('Favorit entfernen: Stern wieder leer', () => {
    const { ctx, stern, spur } = liste();
    ctx.toggleProfileFav('A');
    ctx.toggleProfileFav('A');
    expect(evalIn(ctx, "PROFILE_FAVS.has('A')")).toBe(false);
    expect(stern.classList.toggle).toHaveBeenLastCalledWith('on', false);
    expect(stern.textContent).toBe('☆');
    expect(spur()).not.toContain('profil-neu');
  });

  it('im Filter "Favoriten" verschwindet die Karte beim Entfernen – ohne die Liste neu zu bauen', () => {
    const { ctx, karte, spur } = liste({ filter: 'fav' });
    evalIn(ctx, "PROFILE_FAVS.add('A')");
    ctx.toggleProfileFav('A');
    expect(karte.remove).toHaveBeenCalled();
    expect(spur()).not.toContain('profil-neu');
  });

  it('war es die letzte Karte, wird komplett neu gezeichnet (Leermeldung)', () => {
    const { ctx, spur } = liste({ filter: 'fav', weitere: false });
    evalIn(ctx, "PROFILE_FAVS.add('A')");
    ctx.toggleProfileFav('A');
    expect(spur()).toContain('profil-neu');
  });

  it('Profil gerade nicht sichtbar (Suche/anderer Filter): nichts zu zeichnen', () => {
    const { ctx, spur } = liste({ mitKarte: false });
    ctx.toggleProfileFav('A');
    expect(evalIn(ctx, "PROFILE_FAVS.has('A')")).toBe(true);
    expect(spur()).not.toContain('profil-neu');
  });

  it('Liste noch nie gezeichnet: komplett neu zeichnen', () => {
    const { ctx, els, spur } = liste();
    els.profileListEl = { querySelector: () => null };   // kein _profileKeys
    ctx.toggleProfileFav('A');
    expect(spur()).toContain('profil-neu');
  });
});

// ── LSCG Outfits ─────────────────────────────────────────────────────────────

function lscg() {
  const t = boot();
  evalIn(t.ctx, `
    LSCG_DB['1'] = { name: 'Mia', versions: [
      { fingerprint: 'fa', code: ${JSON.stringify(CODE)}, ts: 1 },
      { fingerprint: 'fb', code: ${JSON.stringify(CODE)}, ts: 2 },
      { fingerprint: 'fc', code: ${JSON.stringify(CODE)}, ts: 3 } ] };
    _osFavs = new Set(); _osOutfitFavs = new Set(); _osFavFilter = false; _osLockFilter = ''; _osSearchQuery = '';
  `);
  return t;
}
const favs = (ctx) => evalIn(ctx, '[..._osOutfitFavs].sort()');

describe('LSCG: ein Stern auf einer Karte merkt nur dieses Outfit', () => {
  it('nur diese Version wird Favorit – nicht der Spieler, nicht die anderen Versionen', () => {
    const { ctx, spur } = lscg();
    ctx.toggleOsOutfitFav('1', 1);
    expect(favs(ctx)).toEqual(['1|fb']);
    expect(evalIn(ctx, '_osFavs.size')).toBe(0);
    expect(spur()).toContainEqual(['idb', 'BC_LSCG_OUTFIT_FAVS_v1', ['1|fb']]);
  });

  it('nochmal klicken nimmt es wieder raus; mehrere Outfits sind unabhängig', () => {
    const { ctx } = lscg();
    ctx.toggleOsOutfitFav('1', 0);
    ctx.toggleOsOutfitFav('1', 2);
    expect(favs(ctx)).toEqual(['1|fa', '1|fc']);
    ctx.toggleOsOutfitFav('1', 0);
    expect(favs(ctx)).toEqual(['1|fc']);
  });

  it('ohne Fingerabdruck: Schlüssel aus dem Zeitstempel (bleibt stabil, wenn davor Versionen gelöscht werden)', () => {
    const { ctx } = lscg();
    evalIn(ctx, "LSCG_DB['2'] = { name: 'X', versions: [{ ts: 77, code: 'c' }] }");
    ctx.toggleOsOutfitFav('2', 0);
    expect(favs(ctx)).toEqual(['2|ts77']);
  });

  it('eine Version, die es nicht gibt, ändert nichts', () => {
    const { ctx } = lscg();
    ctx.toggleOsOutfitFav('1', 9);
    ctx.toggleOsOutfitFav('99', 0);
    expect(favs(ctx)).toEqual([]);
  });

  it('der Stern in der Spielerzeile bleibt eine Spieler-Markierung (alle Outfits)', () => {
    const { ctx } = lscg();
    ctx.toggleOsFav('1');
    expect(evalIn(ctx, "_osFavs.has('1')")).toBe(true);
    expect(favs(ctx)).toEqual([]);
  });
});

describe('LSCG: Filter "Favoriten" zeigt nur die einzeln markierten', () => {
  it('_osVersionPasst: nur markierte Versionen, auch zusammen mit dem Schloss-Filter-Fall ohne Filter', () => {
    const { ctx } = lscg();
    ctx.toggleOsOutfitFav('1', 1);
    expect(evalIn(ctx, "[0, 1, 2].map(i => _osVersionPasst(LSCG_DB['1'].versions[i], '1', i))")).toEqual([true, true, true]);
    evalIn(ctx, '_osFavFilter = true');
    expect(evalIn(ctx, "[0, 1, 2].map(i => _osVersionPasst(LSCG_DB['1'].versions[i], '1', i))")).toEqual([false, true, false]);
  });

  it('Anzahl in der Spielerzeile: Treffer/alle', () => {
    const { ctx } = lscg();
    expect(evalIn(ctx, "_osVcntText('1')")).toBe('3x');
    ctx.toggleOsOutfitFav('1', 1);
    evalIn(ctx, '_osFavFilter = true');
    expect(evalIn(ctx, "_osVcntText('1')")).toBe('1/3x');
  });

  function zeichnen(ctx) {
    const body = makeElementStub();
    ctx.document.getElementById = (id) => (id === 'outfitScanBody' ? body : makeElementStub());
    evalIn(ctx, "renderOutfitScanTab = _origRender");
    ctx.renderOutfitScanTab();
    return body.innerHTML;
  }
  function boot2() {
    const t = lscg();
    // die echte Zeichenfunktion zurückholen (boot() ersetzt sie durch einen Spion)
    const echt = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
    t.ctx.__origRenderSrc = evalIn(echt, 'renderOutfitScanTab.toString()');
    evalIn(t.ctx, '_origRender = (0, eval)("(" + __origRenderSrc + ")")');
    return t;
  }

  it('gezeichnet: ohne Filter alle Karten, der Stern nur beim markierten; mit Filter nur die markierte', () => {
    const { ctx } = boot2();
    ctx.toggleOsOutfitFav('1', 1);
    let html = zeichnen(ctx);
    expect(html).toContain('data-vidx="0"');
    expect(html).toContain('data-vidx="1"');
    expect(html).toContain('data-vidx="2"');
    expect((html.match(/os-card-fav on/g) || []).length).toBe(1);
    evalIn(ctx, '_osFavFilter = true');
    html = zeichnen(ctx);
    expect(html).not.toContain('data-vidx="0"');
    expect(html).toContain('data-vidx="1"');
    expect(html).not.toContain('data-vidx="2"');
  });

  it('die Karten-Sterne rufen den Einzel-Favoriten, die Spielerzeile den Spieler-Favoriten', () => {
    const { ctx } = boot2();
    const html = zeichnen(ctx);
    expect(html).toContain("toggleOsOutfitFav('1',2)");
    expect(html).toContain("toggleOsFav('1')");
    // auf den Karten selbst kein Spieler-Favorit mehr
    const karten = html.slice(html.indexOf('os-member-rows'));
    expect(karten).not.toContain("toggleOsFav('1')");
  });

  it('ohne Treffer: freundliche Meldung statt leerer Seite', () => {
    const { ctx } = boot2();
    evalIn(ctx, '_osFavFilter = true');
    expect(zeichnen(ctx)).toContain('Keine einzeln favorisierten Outfits');
  });

  it('osToggleFavFilter schaltet um und markiert den Knopf', () => {
    const { ctx, els, spur } = lscg();
    els.osFavFilterBtn = { classList: klassen() };
    ctx.osToggleFavFilter();
    expect(evalIn(ctx, '_osFavFilter')).toBe(true);
    expect(els.osFavFilterBtn.classList.toggle).toHaveBeenCalledWith('on', true);
    expect(spur()).toContain('os-neu');
    ctx.osToggleFavFilter();
    expect(evalIn(ctx, '_osFavFilter')).toBe(false);
  });
});

describe('LSCG: nur die eine Karte ändern statt alles neu zu zeichnen', () => {
  function dom({ weitere = true, mitKarte = true } = {}) {
    const t = lscg();
    const stern = { classList: klassen(), textContent: '' };
    const knopf = { classList: klassen(), textContent: '' };
    const zaehler = { textContent: '' };
    const karte = { querySelector: (s) => (s === '.os-card-fav' ? stern : s === '.os-card-favbtn' ? knopf : null), remove: vi.fn() };
    const block = {
      querySelector: (s) => (s.startsWith('.os-card[data-vidx') ? (mitKarte ? karte : null) : s === '.os-card' ? (weitere ? {} : null) : s === '.os-member-vcnt' ? zaehler : null),
      remove: vi.fn(),
    };
    t.els.osm_1 = block;
    t.els.outfitScanBody = { querySelector: () => (weitere ? {} : null) };
    return { ...t, stern, knopf, zaehler, karte, block };
  }

  it('Favorit setzen: beide Sterne der Karte schalten um, kein Neuzeichnen', () => {
    const { ctx, stern, knopf, spur } = dom();
    ctx.toggleOsOutfitFav('1', 1);
    expect(stern.classList.toggle).toHaveBeenCalledWith('on', true);
    expect(stern.textContent).toBe('⭐');
    expect(knopf.classList.toggle).toHaveBeenCalledWith('fav-on', true);
    expect(spur()).not.toContain('os-neu');
  });

  it('im Favoriten-Filter verschwindet die Karte beim Entfernen; die Anzahl der Zeile wird nachgezogen', () => {
    const { ctx, karte, zaehler, spur } = dom();
    ctx.toggleOsOutfitFav('1', 1);
    evalIn(ctx, '_osFavFilter = true');
    ctx.toggleOsOutfitFav('1', 1);
    expect(karte.remove).toHaveBeenCalled();
    expect(zaehler.textContent).toBe('0/3x');
    expect(spur()).not.toContain('os-neu');
  });

  it('Streifen noch nicht gefüllt (keine Karte da): komplett neu zeichnen', () => {
    const { ctx, spur } = dom({ mitKarte: false });
    ctx.toggleOsOutfitFav('1', 1);
    expect(spur()).toContain('os-neu');
  });
});
