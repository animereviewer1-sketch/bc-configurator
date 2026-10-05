import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Suche nach Datum in Outfit & Profile, LSCG Outfits und MBS Wheel.
// Datumsformen: TT.MM · TT.MM. · TT.MM.JJ · TT.MM.JJJJ · MM.JJJJ – mit oder ohne führende Null.

const LZString = createRequire(import.meta.url)('lz-string');
const CODE = LZString.compressToBase64('[]');
const tag = (j, m, t, h = 12) => new Date(j, m - 1, t, h).getTime();   // lokale Zeit wie in der Suche

function boot() {
  const els = {};
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(ctx, 'idbSet = function () {};');
  return { ctx, els };
}
const lies = (ctx, ausdruck) => evalIn(ctx, ausdruck);

describe('Suchtext zerlegen', () => {
  const z = (ctx, q) => { ctx.__q = q; return evalIn(ctx, '_sucheZerlegen(__q)'); };

  it('erkennt alle Datumsformen, mit und ohne führende Null', () => {
    const { ctx } = boot();
    expect(z(ctx, '5.10').datum).toMatchObject([{ tag: 5, monat: 10, jahr: null }]);
    expect(z(ctx, '05.10.').datum).toMatchObject([{ tag: 5, monat: 10, jahr: null }]);
    expect(z(ctx, '5.10.26').datum).toMatchObject([{ tag: 5, monat: 10, jahr: 2026 }]);
    expect(z(ctx, '05.10.2026').datum).toMatchObject([{ tag: 5, monat: 10, jahr: 2026 }]);
    expect(z(ctx, '10.2026').datum).toMatchObject([{ tag: null, monat: 10, jahr: 2026 }]);
    expect(z(ctx, '5.10').text).toEqual([]);
  });

  it('alles andere bleibt Text: Namen, Zahlen ohne Punkt (Mitgliedsnummer, Jahr), unmögliche Daten', () => {
    const { ctx } = boot();
    for (const t of ['mia', '2026', '102866', '32.10', '5.13', '0.5', '5.10.202', 'a.b']) {
      const r = z(ctx, t);
      expect(r.datum).toEqual([]);
      expect(r.text).toEqual([t]);
    }
  });

  it('gemischt: Name und Datum, Groß-/Kleinschreibung egal, Leerzeichen egal', () => {
    const { ctx } = boot();
    const r = z(ctx, '  Mia   5.10.  Kleid ');
    expect(r.text).toEqual(['mia', 'kleid']);
    expect(r.datum.map((d) => d.text)).toEqual(['5.10.']);
  });

  it('leer oder null: nichts', () => {
    const { ctx } = boot();
    expect(z(ctx, '')).toEqual({ text: [], datum: [] });
    expect(z(ctx, null)).toEqual({ text: [], datum: [] });
  });
});

describe('Datum vergleichen', () => {
  const passt = (ctx, q, wert) => { ctx.__d = evalIn(ctx, `_sucheZerlegen(${JSON.stringify(q)}).datum[0]`); ctx.__w = wert; return evalIn(ctx, '_datumPasst(__d, __w)'); };

  it('Zeitstempel: Tag, Monat, Jahr', () => {
    const { ctx } = boot();
    const t = tag(2026, 10, 5);
    expect(passt(ctx, '5.10.', t)).toBe(true);
    expect(passt(ctx, '05.10.2026', t)).toBe(true);
    expect(passt(ctx, '5.10.26', t)).toBe(true);
    expect(passt(ctx, '10.2026', t)).toBe(true);
    expect(passt(ctx, '6.10.', t)).toBe(false);
    expect(passt(ctx, '5.11.', t)).toBe(false);
    expect(passt(ctx, '5.10.2025', t)).toBe(false);
    expect(passt(ctx, '11.2026', t)).toBe(false);
  });

  it('der Tag zählt von 0:00 bis 23:59 (nicht nur mittags)', () => {
    const { ctx } = boot();
    expect(passt(ctx, '5.10.', tag(2026, 10, 5, 0))).toBe(true);
    expect(passt(ctx, '5.10.', tag(2026, 10, 5, 23))).toBe(true);
    expect(passt(ctx, '5.10.', tag(2026, 10, 6, 0))).toBe(false);
  });

  it('Profile speichern "T.M.JJJJ" ohne führende Null – das wird gelesen', () => {
    const { ctx } = boot();
    expect(passt(ctx, '5.10.', '5.10.2026')).toBe(true);
    expect(passt(ctx, '05.10.', '05.10.2026')).toBe(true);
    expect(passt(ctx, '5.10.2026', '5.10.2026')).toBe(true);
    expect(passt(ctx, '1.1.', '5.10.2026')).toBe(false);
  });

  it('kein Datum / Unsinn: kein Treffer, kein Absturz', () => {
    const { ctx } = boot();
    for (const w of [undefined, null, '', 'gestern', NaN, {}]) expect(passt(ctx, '5.10.', w)).toBe(false);
  });
});

describe('Outfit & Profile', () => {
  function profile() {
    const t = boot();
    t.ctx.__t = tag(2026, 10, 5);
    evalIn(t.ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['Mia - Kleid']  = { name: 'Mia - Kleid',  date: '5.10.2026', items: [{ asset: 'Dress', group: 'Cloth' }] };
      PROFILES['Ada - Rock']   = { name: 'Ada - Rock',   date: '06.10.2026', items: [{ asset: 'Skirt', group: 'Cloth' }] };
      PROFILES['Zoe - v1.2']   = { name: 'Zoe - v1.2',   date: '1.1.2025', items: [] };
      PROFILES['Kim - Alt']    = { name: 'Kim - Alt',    date: '3.9.2026', items: [] };
      PROFILE_TAGS = { 'Kim - Alt': ['sommer'] };
      PROFILE_FAVS.clear(); _profileFilter = 'all'; _profileTagFilter = null;
    `);
    return t;
  }
  const suche = (t, q) => { t.els.profileSearch = { value: q }; return evalIn(t.ctx, '_profilGefiltert().sort()'); };

  it('ein Tag, mit und ohne führende Null, mit und ohne Jahr', () => {
    const t = profile();
    expect(suche(t, '5.10.')).toEqual(['Mia - Kleid']);
    expect(suche(t, '05.10.2026')).toEqual(['Mia - Kleid']);
    expect(suche(t, '5.10.26')).toEqual(['Mia - Kleid']);
    expect(suche(t, '6.10.')).toEqual(['Ada - Rock']);
    expect(suche(t, '5.10.2025')).toEqual([]);
  });

  it('ein ganzer Monat', () => {
    const t = profile();
    expect(suche(t, '10.2026')).toEqual(['Ada - Rock', 'Mia - Kleid']);
    expect(suche(t, '9.2026')).toEqual(['Kim - Alt']);
  });

  it('Name und Datum zusammen: beides muss passen', () => {
    const t = profile();
    expect(suche(t, 'mia 5.10.')).toEqual(['Mia - Kleid']);
    expect(suche(t, 'ada 5.10.')).toEqual([]);
  });

  it('mehrere Daten sind Alternativen', () => {
    const t = profile();
    expect(suche(t, '5.10. 3.9.')).toEqual(['Kim - Alt', 'Mia - Kleid']);
  });

  it('ein Datumsbegriff im Namen (v1.2) findet das Profil weiterhin als Text', () => {
    const t = profile();
    expect(suche(t, '1.2')).toEqual(['Zoe - v1.2']);
  });

  it('Suche nach Item und Tag findet jetzt auch Profile, deren Name nicht passt (vorher blieb sie leer)', () => {
    const t = profile();
    expect(suche(t, 'dress')).toEqual(['Mia - Kleid']);
    expect(suche(t, 'sommer')).toEqual(['Kim - Alt']);
  });

  it('ohne Suche: alle; die Filter wirken weiter zusammen mit dem Datum', () => {
    const t = profile();
    expect(suche(t, '').length).toBe(4);
    evalIn(t.ctx, "PROFILE_FAVS.add('Ada - Rock'); _profileFilter = 'fav'");
    expect(suche(t, '10.2026')).toEqual(['Ada - Rock']);
    evalIn(t.ctx, "_profileFilter = 'all'; _profileTagFilter = 'sommer'");
    expect(suche(t, '')).toEqual(['Kim - Alt']);
    expect(suche(t, '5.10.')).toEqual([]);
  });

  it('die Liste zeigt wirklich nur die Treffer (und nicht mehr "alles, nur ausgeblendet")', () => {
    const t = profile();
    const liste = makeElementStub();
    t.els.profileListEl = liste;
    t.els.profileSearch = { value: '5.10.' };
    t.ctx.renderProfileList();
    expect(liste.innerHTML).toContain('Kleid');
    expect(liste.innerHTML).not.toContain('Rock');
    expect(liste.innerHTML).not.toContain('v1.2');
  });
});

describe('LSCG Outfits', () => {
  function lscg(suche) {
    const t = boot();
    t.ctx.__stamps = [tag(2026, 10, 4), tag(2026, 10, 5, 8), tag(2026, 10, 5, 20), tag(2026, 9, 1)];
    evalIn(t.ctx, `
      Object.keys(LSCG_DB).forEach(k => delete LSCG_DB[k]);
      LSCG_DB['1001'] = { name: 'Mia', versions: __stamps.map((ts, i) => ({ fingerprint: 'm' + i, code: ${JSON.stringify(CODE)}, ts })) };
      LSCG_DB['1002'] = { name: 'Ada', versions: [{ fingerprint: 'a0', code: ${JSON.stringify(CODE)}, ts: __stamps[3] }] };
      _osFavs = new Set(); _osOutfitFavs = new Set(); _osFavFilter = false; _osLockFilter = '';
      _osSearchQuery = ${JSON.stringify(suche)};
    `);
    const body = makeElementStub();
    t.els.outfitScanBody = body;
    t.ctx.renderOutfitScanTab();
    return { ...t, html: body.innerHTML };
  }
  const karten = (html, mk) => [...html.matchAll(new RegExp('data-mk="' + mk + '" data-vidx="(\\d+)"', 'g'))].map((m) => Number(m[1]));

  it('ohne Datum in der Suche: alle Outfits', () => {
    const { html } = lscg('');
    expect(karten(html, '1001')).toEqual([3, 2, 1, 0]);
    expect(karten(html, '1002')).toEqual([0]);
  });

  it('ein Tag: nur die Outfits dieses Tages (und nur die Spieler, die welche haben)', () => {
    const { html } = lscg('5.10.');
    expect(karten(html, '1001').sort()).toEqual([1, 2]);
    expect(karten(html, '1002')).toEqual([]);
    expect(html).toContain('2/4x');            // Treffer/alle in der Spielerzeile
    expect(html).not.toContain('Ada');
  });

  it('mit Jahr, ganz ausgeschrieben', () => {
    expect(karten(lscg('05.10.2026').html, '1001').sort()).toEqual([1, 2]);
    expect(karten(lscg('05.10.2025').html, '1001')).toEqual([]);
  });

  it('ganzer Monat', () => {
    const { html } = lscg('9.2026');
    expect(karten(html, '1001')).toEqual([3]);
    expect(karten(html, '1002')).toEqual([0]);
  });

  it('Name + Datum: erst der Spieler, dann seine Outfits des Tages', () => {
    const { html } = lscg('ada 1.9.');
    expect(karten(html, '1002')).toEqual([0]);
    expect(karten(html, '1001')).toEqual([]);
  });

  it('Datum ohne Treffer: eigene Meldung', () => {
    expect(lscg('24.12.2030').html).toContain('Keine Outfits zu diesem Datum');
  });

  it('nur Name: wie bisher', () => {
    const { html } = lscg('mia');
    expect(karten(html, '1001').length).toBe(4);
    expect(karten(html, '1002')).toEqual([]);
  });

  it('zusammen mit dem Favoriten-Filter: beides muss passen', () => {
    const t = lscg('5.10.');
    t.ctx.toggleOsOutfitFav('1001', 0);   // Favorit, aber vom 4.10.
    t.ctx.toggleOsOutfitFav('1001', 2);   // Favorit vom 5.10.
    evalIn(t.ctx, '_osFavFilter = true');
    const body = makeElementStub(); t.els.outfitScanBody = body;
    t.ctx.renderOutfitScanTab();
    expect(karten(body.innerHTML, '1001')).toEqual([2]);
  });
});

describe('MBS Wheel: gleiche Datumsformen (auch ohne führende Null)', () => {
  function wheel(suche) {
    const t = boot();
    t.ctx.__o = { ts: tag(2026, 7, 2), alt: tag(2026, 3, 1) };
    evalIn(t.ctx, `
      _mbsWheelData = [
        { memberNumber: 1, name: 'Mia', ts: __o.ts, outfits: [{ name: 'O1', firstSeen: __o.ts, items: [{ group: 'Cloth', asset: 'A' }] }] },
        { memberNumber: 2, name: 'Ada', ts: __o.alt, outfits: [{ name: 'O2', firstSeen: __o.alt, items: [{ group: 'Cloth', asset: 'B' }] }] } ];
      _mbsWheelSearch = ${JSON.stringify(suche)}; _mbsWheelFilter = 'all';
    `);
    const body = makeElementStub();
    t.els.wheelOutfitBody = body;
    t.ctx._renderMbsWheelTab();
    return body.innerHTML;
  }

  it('"02.07." wie bisher; neu: "2.7." und "07.2026"', () => {
    for (const q of ['02.07.', '2.7.', '2.7.26', '07.2026']) {
      const html = wheel(q);
      expect(html, q).toContain('Mia');
      expect(html, q).not.toContain('Ada');
    }
  });

  it('Name + Datum', () => {
    expect(wheel('mia 2.7.')).toContain('Mia');
    expect(wheel('ada 2.7.')).not.toContain('Mia');
  });

  it('Teilstücke wie "2026" oder "02.0" finden weiter über den ausgeschriebenen Text', () => {
    expect(wheel('2026')).toContain('Mia');
    expect(wheel('02.0')).toContain('Mia');
  });
});
