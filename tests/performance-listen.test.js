import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Performance der Listen (Outfit & Profile, LSCG Outfits, MBS Wheel): weniger Rechenarbeit je Zeichnen, einzelne Änderungen
// ohne Neuzeichnen, Nachfüllen im Hintergrund (abbrechbar) – ohne dass sich am Ergebnis etwas ändert.

const LZString = createRequire(import.meta.url)('lz-string');
const CODE = LZString.compressToBase64('[]');

function boot(extra = {}) {
  const els = {};
  const timer = [];
  const ctx = loadScript(['items.js'], { setTimeout: (fn, ms) => { timer.push({ fn, ms }); return timer.length; }, clearTimeout: () => {}, ...extra });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(ctx, 'idbSet = function () {};');
  timer.length = 0;
  return { ctx, els, timer };
}
const lies = (ctx, a) => evalIn(ctx, a);

describe('Profil-Fingerabdruck (Duplikat-Erkennung)', () => {
  it('Reihenfolge der Items ist egal; ein anderes Item macht ihn anders', () => {
    const { ctx } = boot();
    ctx.__a = { items: [{ group: 'A', asset: '1' }, { group: 'B', asset: '2' }] };
    ctx.__b = { items: [{ group: 'B', asset: '2' }, { group: 'A', asset: '1' }] };
    ctx.__c = { items: [{ group: 'A', asset: '1' }, { group: 'B', asset: '3' }] };
    expect(lies(ctx, '_profileFingerprint(__a) === _profileFingerprint(__b)')).toBe(true);
    expect(lies(ctx, '_profileFingerprint(__a) === _profileFingerprint(__c)')).toBe(false);
  });

  it('wird gemerkt, aber nach einer Änderung neu berechnet (Item entfernt, Items ersetzt, Outfit-Code geändert)', () => {
    const { ctx } = boot();
    ctx.__p = { items: [{ group: 'A', asset: '1' }, { group: 'B', asset: '2' }] };
    const vor = lies(ctx, '_profileFingerprint(__p)');
    expect(lies(ctx, '_profileFingerprint(__p)')).toBe(vor);                 // gemerkt
    evalIn(ctx, '__p.items.splice(1, 1)');
    const nach = lies(ctx, '_profileFingerprint(__p)');
    expect(nach).not.toBe(vor);                                              // Länge geändert → neu
    evalIn(ctx, "__p.items = [{ group: 'X', asset: '9' }]");
    expect(lies(ctx, '_profileFingerprint(__p)')).not.toBe(nach);            // andere Liste → neu
    evalIn(ctx, "__p._outfitCode = '  CODE1 '");
    expect(lies(ctx, '_profileFingerprint(__p)')).toBe('oc:CODE1');
    evalIn(ctx, "__p._outfitCode = 'CODE2'");
    expect(lies(ctx, '_profileFingerprint(__p)')).toBe('oc:CODE2');
  });

  it('Duplikat-Gruppen: ORG = erstes Vorkommen, DUP = Kopien; Gruppen werden nur einmal berechnet', () => {
    const { ctx } = boot();
    evalIn(ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['A - x'] = { items: [{ group: 'G', asset: '1' }] };
      PROFILES['B - x'] = { items: [{ group: 'G', asset: '1' }] };
      PROFILES['C - x'] = { items: [{ group: 'G', asset: '1' }] };
      PROFILES['D - x'] = { items: [{ group: 'G', asset: '2' }] };
      __zaehler = 0; const orig = _getProfileDuplicates; _getProfileDuplicates = function () { __zaehler++; return orig(); };
    `);
    const info = evalIn(ctx, '(() => { const i = _profilDupInfo(); return { dup: [...i.dupSet], org: [...i.orgSet], gruppen: i.gruppen.size, z: __zaehler }; })()');
    expect(info.org).toEqual(['A - x']);
    expect(info.dup).toEqual(['B - x', 'C - x']);
    expect(info.gruppen).toBe(1);
    expect(info.z).toBe(1);
  });
});

describe('Kurzname und Sortierung liefern dasselbe wie vorher', () => {
  const alt = (name, owner) => name.replace(new RegExp('\\s*-\\s+' + owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '').trim() || name;

  it('_profileShortName gleich dem alten regulären Ausdruck (auch bei Sonderzeichen im Besitzer)', () => {
    const { ctx } = boot();
    const faelle = [
      ['Kleid - Mia', 'Mia'], ['Kleid - Mia (old)', 'Mia (old)'], ['Kleid - A.B', 'A.B'], ['Kleid -Mia', 'Mia'], ['Kleid  -  Mia', 'Mia'],
      ['Mia', 'Mia'], ['XMia', 'Mia'], ['Kleid - Mia', '– Ohne Zuordnung –'], ['Hose - Kim [1]', 'Kim [1]'], ['  - Mia', 'Mia'], ['A - B - C', 'C'], ['Kleid - Mia ', 'Mia'],
    ];
    for (const [name, owner] of faelle) {
      ctx.__n = name; ctx.__o = owner;
      expect(lies(ctx, '_profileShortName(__n, __o)'), name + ' / ' + owner).toBe(alt(name, owner));
    }
  });

  it('Namens-Sortierung unverändert', () => {
    const { ctx } = boot();
    evalIn(ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      ['Zeta - Mia', 'Alpha - Mia', 'Beta - Ada', 'Gamma', 'Delta - Ada (old)', 'alpha - ada'].forEach(n => { PROFILES[n] = { items: [] }; });
      _profileSort = 'name';
    `);
    const erwartet = lies(ctx, "Object.keys(PROFILES).slice().sort((a, b) => _profileSortKey(a).localeCompare(_profileSortKey(b)))");
    expect(lies(ctx, '_profilSortieren(Object.keys(PROFILES))')).toEqual(erwartet);
  });
});

describe('Profil löschen ohne alles neu zu zeichnen', () => {
  function liste({ kopie = false, weitere = true } = {}) {
    const t = boot({ confirm: () => true });
    const block = { querySelectorAll: () => (weitere ? [{}, {}] : []), querySelector: () => ({ textContent: '' }), remove: vi.fn() };
    const karte = { closest: () => block, remove: vi.fn() };
    t.els.profileListEl = { _profileKeys: ['A - x', 'B - x'], querySelector: () => (weitere ? {} : null) };
    t.els.prow_0 = karte;
    t.ctx.__spur = [];
    evalIn(t.ctx, `
      renderProfileList = function () { __spur.push('neu'); };
      _saveProfiles = function () {}; _saveProfileScreenshots = function () {};
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['A - x'] = { items: [{ group: 'G', asset: '1' }] };
      PROFILES['B - x'] = { items: [{ group: 'G', asset: ${kopie ? "'1'" : "'2'"} }] };
      _profileNameMap['p_0'] = 'A - x';
    `);
    return { ...t, karte };
  }

  it('Profil ohne Kopien: nur die Karte verschwindet, die Liste wird nicht neu gebaut', () => {
    const t = liste();
    t.ctx.deleteProfile('A - x');
    expect(t.karte.remove).toHaveBeenCalled();
    expect(lies(t.ctx, '__spur')).toEqual([]);
    expect(lies(t.ctx, "'A - x' in PROFILES")).toBe(false);
  });

  it('Profil mit Kopie: ORG/DUP-Abzeichen ändern sich → komplett neu zeichnen', () => {
    const t = liste({ kopie: true });
    t.ctx.deleteProfile('A - x');
    expect(lies(t.ctx, '__spur')).toEqual(['neu']);
  });

  it('war es die letzte Karte: komplett neu (Leermeldung)', () => {
    const t = liste({ weitere: false });
    t.ctx.deleteProfile('A - x');
    expect(lies(t.ctx, '__spur')).toEqual(['neu']);
  });
});

describe('Wheel: Favoriten-Stern an Ort und Stelle', () => {
  function wheel(filter = 'all') {
    const t = boot();
    const stern = { classList: { toggle: vi.fn() }, textContent: '' };
    const knopf = { classList: { toggle: vi.fn() }, textContent: '' };
    const reihe = { firstChild: { id: 'erste' }, insertBefore: vi.fn() };
    const karte = { dataset: { mn: '5', oi: '1' }, querySelector: (s) => (s === '.os-card-fav' ? stern : s === '.os-card-favbtn' ? knopf : null), parentElement: reihe };
    const body = makeElementStub(); body.querySelectorAll = () => [karte];
    t.els.wheelOutfitBody = body;
    t.ctx.__spur = [];
    evalIn(t.ctx, `
      _renderMbsWheelTab = function () { __spur.push('neu'); }; _saveMbsWheelOutfitFavs = function () {};
      _mbsWheelData = [{ memberNumber: 5, name: 'Mia', outfits: [{ name: 'A', items: [{ group: 'G', asset: '1' }] }, { name: 'B', items: [{ group: 'G', asset: '2' }] }] }];
      _mbsWheelOutfitFavs = new Set(); _mbsWheelFilter = ${JSON.stringify(filter)};
    `);
    return { ...t, stern, knopf, reihe, karte };
  }

  it('Stern setzen: nur diese Karte ändert sich und rückt in ihrer Reihe nach vorn – kein Neuzeichnen', () => {
    const t = wheel();
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    expect(t.stern.classList.toggle).toHaveBeenCalledWith('on', true);
    expect(t.stern.textContent).toBe('⭐');
    expect(t.knopf.classList.toggle).toHaveBeenCalledWith('fav-on', true);
    expect(t.reihe.insertBefore).toHaveBeenCalledWith(t.karte, t.reihe.firstChild);
    expect(lies(t.ctx, '__spur')).toEqual([]);
  });

  it('Stern entfernen: Karte bleibt stehen (kein Neuzeichnen)', () => {
    const t = wheel();
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    t.reihe.insertBefore.mockClear();
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    expect(t.stern.textContent).toBe('☆');
    expect(t.reihe.insertBefore).not.toHaveBeenCalled();
    expect(lies(t.ctx, '__spur')).toEqual([]);
  });

  it('im Filter "Favoriten" verschwindet das Outfit beim Entfernen → komplett neu zeichnen', () => {
    const t = wheel('fav');
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    expect(lies(t.ctx, '__spur')).toEqual([]);          // Setzen: in place
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    expect(lies(t.ctx, '__spur')).toEqual(['neu']);     // Entfernen: neu
  });

  it('Karte nicht gezeichnet (z. B. noch nicht nachgefüllt): komplett neu', () => {
    const t = wheel();
    t.els.wheelOutfitBody.querySelectorAll = () => [];
    t.ctx.mbsWheelToggleOutfitFav(5, 1);
    expect(lies(t.ctx, '__spur')).toEqual(['neu']);
  });
});

describe('Hintergrund-Füllen', () => {
  it('_naechsterLeerlauf nimmt requestIdleCallback, sonst einen kurzen Timer', () => {
    const idle = vi.fn();
    const a = boot({ requestIdleCallback: idle });
    a.ctx.__f = () => {};
    evalIn(a.ctx, '_naechsterLeerlauf(__f)');
    expect(idle).toHaveBeenCalledWith(a.ctx.__f, { timeout: 400 });
    const b = boot();
    b.ctx.__f = () => {};
    evalIn(b.ctx, '_naechsterLeerlauf(__f)');
    expect(b.timer.at(-1)).toMatchObject({ ms: 16 });
  });

  // Ein nachgebautes LSCG-Tab: Streifen als einfache Objekte, damit sich das Füllen im Hintergrund prüfen lässt
  function lscgTab() {
    const lauf = [];
    class IO { constructor() {} observe() {} unobserve() {} disconnect() {} }
    const t = boot({ IntersectionObserver: IO, requestIdleCallback: (fn) => { lauf.push(fn); return lauf.length; } });
    evalIn(t.ctx, `
      Object.keys(LSCG_DB).forEach(k => delete LSCG_DB[k]);
      for (let m = 1; m <= 5; m++) LSCG_DB[String(m)] = { name: 'Spieler ' + m, versions: [{ fingerprint: 'f' + m, code: ${JSON.stringify(CODE)}, ts: 1000 * m }] };
      _osFavs = new Set(); _osOutfitFavs = new Set(); _osFavFilter = false; _osBildFilter = ''; _osLockFilter = ''; _osSearchQuery = ''; _osSort = 'name';
    `);
    const strips = ['3', '4', '5'].map((mk) => {
      const attr = { 'data-os-lazy': mk };
      return { innerHTML: '', hasAttribute: (n) => n in attr, getAttribute: (n) => attr[n], removeAttribute: (n) => { delete attr[n]; }, closest: () => ({}) };
    });
    const body = makeElementStub();
    body.querySelectorAll = (sel) => (sel === '.os-strip[data-os-lazy]' ? strips : []);
    t.els.outfitScanBody = body;
    return { ...t, lauf, strips };
  }

  it('LSCG: die noch leeren Spieler füllen sich im Hintergrund – ganz ohne Hinscrollen', () => {
    const t = lscgTab();
    t.ctx.renderOutfitScanTab();
    expect(t.strips.every((s) => s.innerHTML === '')).toBe(true);        // direkt nach dem Zeichnen leer
    expect(t.lauf.length).toBe(1);
    while (t.lauf.length) t.lauf.shift()();                              // der Browser hat Luft
    expect(t.strips.every((s) => s.innerHTML.includes('os-card'))).toBe(true);
    expect(t.strips.every((s) => !s.hasAttribute('data-os-lazy'))).toBe(true);
  });

  it('LSCG: ein neues Zeichnen bricht das Füllen der alten Zeichnung ab', () => {
    const t = lscgTab();
    t.ctx.renderOutfitScanTab();
    const alt = t.lauf.shift();
    t.ctx.renderOutfitScanTab();
    t.lauf.length = 0;
    alt();                                                               // der alte Füller meldet sich spät
    expect(t.strips.every((s) => s.innerHTML === '')).toBe(true);        // und tut nichts
  });

  it('Wheel: das Nachfüllen einer alten Zeichnung hängt sich nicht an die neue (früher: doppelte Einträge)', () => {
    const lauf = [];
    const t = boot({ requestIdleCallback: (fn) => { lauf.push(fn); return lauf.length; } });
    t.ctx.__spieler = Array.from({ length: 80 }, (_, i) => ({ memberNumber: 100 + i, name: 'Spieler ' + i, ts: i, outfits: [{ name: 'O', items: [{ group: 'G', asset: 'A' + i }] }] }));
    evalIn(t.ctx, "_mbsWheelData = __spieler; _mbsWheelShots = {}; _mbsWheelFavs = new Set(); _mbsWheelOutfitFavs = new Set(); _mbsWheelFilter = 'all'; _mbsWheelSearch = ''; _activeTab = 'lscg-wheel';");
    const angehaengt = [];
    const body = makeElementStub();
    body.insertAdjacentHTML = (pos, html) => angehaengt.push(html);
    t.els.wheelOutfitBody = body;
    t.ctx._renderMbsWheelTab();
    const alt = lauf.shift();
    t.ctx._renderMbsWheelTab();
    lauf.length = 0;
    alt();
    expect(angehaengt).toEqual([]);                                      // der alte Rest wird verworfen
    // die neue Zeichnung füllt ihren Rest dagegen auf
    t.ctx._renderMbsWheelTab();
    while (lauf.length) lauf.shift()();
    const gesamt = body.innerHTML.split('class="os-member-block').length - 1 + angehaengt.join('').split('class="os-member-block').length - 1;
    expect(gesamt).toBe(80);
  });
});
