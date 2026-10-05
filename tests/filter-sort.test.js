import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Einheitliche Filter (Alle · Favoriten · Neu · Mit Bild · Ohne Bild) und Sortierung (Name · Zuletzt) in Outfit & Profile,
// LSCG Outfits und MBS Wheel – plus die Zähler im Tab-Namen.

const LZString = createRequire(import.meta.url)('lz-string');
const CODE = LZString.compressToBase64('[]');
const TAG = 24 * 3600 * 1000;

function boot() {
  const els = {};
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(ctx, 'idbSet = function () {};');
  return { ctx, els };
}
const lies = (ctx, a) => evalIn(ctx, a);
// "T.M.JJJJ" wie ein Profil sein Datum speichert, n Tage vor heute (mittags, damit Zeitzonen nichts verschieben)
const datum = (vorTagen) => { const d = new Date(Date.now() - vorTagen * TAG); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); };

describe('Outfit & Profile: Filter "Neu" und Sortierung', () => {
  function profile() {
    const t = boot();
    t.ctx.__d = { heute: datum(0), vor2: datum(2), vor4: datum(4), vor30: datum(30) };
    evalIn(t.ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['Eins - A'] = { name: 'Eins - A', date: __d.vor30, items: [] };
      PROFILES['Zwei - A'] = { name: 'Zwei - A', date: __d.heute, items: [] };
      PROFILES['Drei - B'] = { name: 'Drei - B', date: __d.vor4, items: [] };
      PROFILES['Vier - B'] = { name: 'Vier - B', date: __d.vor2, items: [] };
      PROFILES['Fuenf - B'] = { name: 'Fuenf - B', date: __d.heute, items: [] };
      PROFILES['Sechs - C'] = { name: 'Sechs - C', items: [] };               // ohne Datum
      PROFILE_FAVS.clear(); PROFILE_TAGS = {}; _profileTagFilter = null; _profileFilter = 'all'; _profileSort = 'name';
    `);
    t.els.profileSearch = { value: '' };
    return t;
  }
  const keys = (t) => lies(t.ctx, '_profilGefiltert().sort()');

  it('"Neu" zeigt Profile der letzten zwei Tage; ältere und solche ohne Datum nicht', () => {
    const t = profile();
    evalIn(t.ctx, "_profileFilter = 'new'");
    expect(keys(t)).toEqual(['Fuenf - B', 'Vier - B', 'Zwei - A']);
  });

  it('"Neu" und "Mit Bild" lassen sich nicht vermischen: genau ein Filter ist aktiv', () => {
    const t = profile();
    evalIn(t.ctx, "PROFILE_SCREENSHOTS['Zwei - A'] = 'data:x'; _profileFilter = 'withshot'");
    expect(keys(t)).toEqual(['Zwei - A']);
    evalIn(t.ctx, "_profileFilter = 'noshot'");
    expect(keys(t).length).toBe(5);
  });

  it('Sortierung "Name": nach Besitzer, dann Name (wie bisher)', () => {
    const t = profile();
    const erwartet = lies(t.ctx, "Object.keys(PROFILES).slice().sort((a, b) => _profileSortKey(a).localeCompare(_profileSortKey(b)))");
    expect(lies(t.ctx, "_profilSortieren(Object.keys(PROFILES))")).toEqual(erwartet);
  });

  it('Sortierung "Zuletzt": neuestes Datum zuerst, bei gleichem Tag das später angelegte; ohne Datum ganz unten', () => {
    const t = profile();
    evalIn(t.ctx, "_profileSort = 'ts'");
    expect(lies(t.ctx, "_profilSortieren(Object.keys(PROFILES))")).toEqual(['Fuenf - B', 'Zwei - A', 'Vier - B', 'Drei - B', 'Eins - A', 'Sechs - C']);
  });

  it('Umschalten merkt sich die Wahl und beschriftet den Knopf', () => {
    const t = profile();
    const liste = makeElementStub(); t.els.profileListEl = liste;
    t.els.profileSortBtn = makeElementStub();
    t.ctx.profileToggleSort();
    expect(lies(t.ctx, '_profileSort')).toBe('ts');
    expect(t.ctx.localStorage.getItem('BC_PROFILE_SORT_v1')).toBe('ts');
    expect(t.els.profileSortBtn.textContent).toMatch(/Zuletzt/);
    t.ctx.profileToggleSort();
    expect(t.els.profileSortBtn.textContent).toMatch(/Name/);
  });
});

describe('LSCG Outfits: gleiche Filter und Sortierung', () => {
  function lscg(extra = '') {
    const t = boot();
    t.ctx.__t = { jetzt: Date.now(), alt: Date.now() - 10 * TAG, aelter: Date.now() - 20 * TAG };
    evalIn(t.ctx, `
      Object.keys(LSCG_DB).forEach(k => delete LSCG_DB[k]);
      LSCG_DB['1'] = { name: 'Mia', versions: [
        { fingerprint: 'a0', code: ${JSON.stringify(CODE)}, ts: __t.alt }, { fingerprint: 'a1', code: ${JSON.stringify(CODE)}, ts: __t.jetzt } ] };
      LSCG_DB['2'] = { name: 'Ada', versions: [ { fingerprint: 'b0', code: ${JSON.stringify(CODE)}, ts: __t.aelter } ] };
      LSCG_DB['3'] = { name: 'Zoe', versions: [ { fingerprint: 'c0', code: ${JSON.stringify(CODE)}, ts: __t.jetzt } ] };
      Object.keys(LSCG_SCREENSHOTS).forEach(k => delete LSCG_SCREENSHOTS[k]);
      LSCG_SCREENSHOTS['1|a1'] = 'data:x'; LSCG_SCREENSHOTS['2|b0'] = 'data:y';
      _osFavs = new Set(); _osOutfitFavs = new Set(); _osFavFilter = false; _osBildFilter = ''; _osLockFilter = ''; _osSearchQuery = ''; _osSort = 'name';
      ${extra}
    `);
    const body = makeElementStub(); t.els.outfitScanBody = body;
    return { ...t, body };
  }
  const karten = (html) => [...html.matchAll(/data-mk="(\d+)" data-vidx="(\d+)"/g)].map((m) => m[1] + ':' + m[2]).sort();
  const zeichne = (t) => { t.ctx.renderOutfitScanTab(); return t.body.innerHTML; };

  it('Alle: jede Version', () => {
    const t = lscg();
    expect(karten(zeichne(t))).toEqual(['1:0', '1:1', '2:0', '3:0']);
  });

  it('Neu: nur Versionen der letzten 48 Stunden', () => {
    const t = lscg();
    t.ctx.osSetFilter('new');
    expect(karten(zeichne(t))).toEqual(['1:1', '3:0']);
    expect(lies(t.ctx, '[_osFavFilter, _osBildFilter]')).toEqual([false, 'new']);
  });

  it('Mit Bild / Ohne Bild: nach dem Versions-Bild', () => {
    const t = lscg();
    t.ctx.osSetFilter('withshot');
    expect(karten(zeichne(t))).toEqual(['1:1', '2:0']);
    t.ctx.osSetFilter('noshot');
    expect(karten(zeichne(t))).toEqual(['1:0', '3:0']);
  });

  it('Favoriten und die anderen Filter schließen sich aus (es ist immer genau einer aktiv); "Alle" setzt alles zurück', () => {
    const t = lscg();
    t.ctx.toggleOsOutfitFav('1', 0);
    t.ctx.osSetFilter('fav');
    expect(lies(t.ctx, '[_osFavFilter, _osBildFilter, _osFilterWert()]')).toEqual([true, '', 'fav']);
    t.ctx.osSetFilter('new');
    expect(lies(t.ctx, '[_osFavFilter, _osBildFilter, _osFilterWert()]')).toEqual([false, 'new', 'new']);
    t.ctx.osSetFilter('all');
    expect(lies(t.ctx, '[_osFavFilter, _osBildFilter, _osFilterWert()]')).toEqual([false, '', 'all']);
  });

  it('die Knöpfe zeigen den aktiven Filter', () => {
    const t = lscg();
    const knoepfe = {};
    for (const f of ['all', 'fav', 'new', 'withshot', 'noshot']) { knoepfe[f] = makeElementStub(); knoepfe[f].classList = { toggle: vi.fn() }; t.els['osFilter_' + f] = knoepfe[f]; }
    t.ctx.osSetFilter('noshot');
    expect(knoepfe.noshot.classList.toggle).toHaveBeenLastCalledWith('on', true);
    expect(knoepfe.all.classList.toggle).toHaveBeenLastCalledWith('on', false);
  });

  it('leerer Filter: eigene Meldung', () => {
    const t = lscg("Object.keys(LSCG_SCREENSHOTS).forEach(k => delete LSCG_SCREENSHOTS[k]);");
    t.ctx.osSetFilter('withshot');
    expect(zeichne(t)).toContain('Keine Outfits mit Bild');
  });

  it('Sortierung "Zuletzt": Spieler mit dem neuesten Outfit zuerst; Spieler-Sterne bleiben oben', () => {
    const t = lscg();
    const reihenfolge = (html) => [...html.matchAll(/id="osm_(\d+)"/g)].map((m) => m[1]);
    expect(reihenfolge(zeichne(t))).toEqual(['2', '1', '3']);           // Name: Ada, Mia, Zoe
    t.ctx.osToggleSort();
    expect(lies(t.ctx, '_osSort')).toBe('ts');
    expect(t.ctx.localStorage.getItem('BC_LSCG_SORT_v1')).toBe('ts');
    expect(reihenfolge(t.body.innerHTML)).toEqual(['1', '3', '2']);     // Mia (jetzt, Name vor Zoe), Zoe (jetzt), Ada (alt)
    evalIn(t.ctx, "_osFavs.add('2')");
    expect(reihenfolge(zeichne(t))[0]).toBe('2');
  });
});

describe('MBS Wheel: Mit Bild / Ohne Bild', () => {
  function wheel(filter) {
    const t = boot();
    evalIn(t.ctx, `
      _mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [
        { name: 'MitBild', items: [{ group: 'Cloth', asset: 'A' }] }, { name: 'OhneBild', items: [{ group: 'Cloth', asset: 'B' }] }] }];
      _mbsWheelShots = { 'Cloth:A': 'data:x' }; _mbsWheelFavs = new Set(); _mbsWheelOutfitFavs = new Set(); _mbsWheelSearch = '';
      _mbsWheelFilter = ${JSON.stringify(filter)};
    `);
    const body = makeElementStub(); t.els.wheelOutfitBody = body;
    t.ctx._renderMbsWheelTab();
    return body.innerHTML;
  }
  it('mit Bild', () => { const h = wheel('withshot'); expect(h).toContain('MitBild'); expect(h).not.toContain('OhneBild'); });
  it('ohne Bild', () => { const h = wheel('noshot'); expect(h).toContain('OhneBild'); expect(h).not.toContain('MitBild'); });
  it('Alle', () => { const h = wheel('all'); expect(h).toContain('MitBild'); expect(h).toContain('OhneBild'); });
});

describe('Zähler im Tab-Namen', () => {
  it('Outfit & Profile, LSCG Outfits, Craft & Curse, Outfit Import zeigen ihre Anzahl; 0 zeigt keine Klammer', () => {
    const t = boot();
    evalIn(t.ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['A - x'] = { items: [] }; PROFILES['B - x'] = { items: [] };
      Object.keys(LSCG_DB).forEach(k => delete LSCG_DB[k]);
      LSCG_DB['1'] = { versions: [{}, {}, {}] }; LSCG_DB['2'] = { versions: [{}] };
      Object.keys(CURSE_DB).forEach(k => delete CURSE_DB[k]);
      OI_LIST = [];
    `);
    for (const id of ['outfit', 'outfit-scan', 'curse', 'outfit-import']) t.els['tab-' + id + '-btn'] = makeElementStub();
    t.ctx._tabZaehlerAktualisieren();
    expect(t.els['tab-outfit-btn'].textContent).toBe('👗 Outfit & Profile (2)');
    expect(t.els['tab-outfit-scan-btn'].textContent).toBe('🧬 LSCG Outfits (4)');
    expect(t.els['tab-curse-btn'].textContent).toBe('🔮 Craft & Curse');
    expect(t.els['tab-outfit-import-btn'].textContent).toBe('📥 Outfit Import');
  });

  it('schreibt nur, wenn sich die Zahl geändert hat', () => {
    const t = boot();
    let schreibungen = 0;
    const knopf = { set textContent(v) { schreibungen++; this._t = v; }, get textContent() { return this._t; } };
    t.els['tab-outfit-btn'] = knopf;
    evalIn(t.ctx, "Object.keys(PROFILES).forEach(k => delete PROFILES[k]); PROFILES['A - x'] = { items: [] };");
    t.ctx._tabZaehlerAktualisieren(); t.ctx._tabZaehlerAktualisieren(); t.ctx._tabZaehlerAktualisieren();
    expect(schreibungen).toBe(1);
    evalIn(t.ctx, "PROFILES['B - x'] = { items: [] }");
    t.ctx._tabZaehlerAktualisieren();
    expect(schreibungen).toBe(2);
  });
});
