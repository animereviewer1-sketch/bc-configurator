import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Nach einem Screenshot soll nur die Karte des betroffenen Profils bzw. der betroffenen Outfit-Version
// angefasst werden. Früher baute renderProfileList()/renderOutfitScanTab() nach JEDEM Bild die komplette
// Liste per innerHTML neu: alle Bilder wurden neu angelegt und neu dekodiert (beim Auto-Screenshot mit
// hunderten Profilen deutlich spürbar). Hier mit einem kleinen nachgebauten DOM; das echte Verhalten
// im Browser wurde zusätzlich im Tab geprüft (Bild-Elemente behalten ihre Identität).

class El {
  constructor(tag, cls = '') {
    this.tagName = tag.toUpperCase();
    this.className = cls;
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this.attrs = {};
    this.textContent = '';
    this.id = '';
    this.src = '';
  }
  add(...kids) { kids.forEach((k) => { k.parent = this; this.children.push(k); }); return this; }
  appendChild(k) { this.add(k); return k; }
  insertBefore(k, ref) {
    k.parent = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(k); else this.children.splice(i, 0, k);
    return k;
  }
  get firstChild() { return this.children[0] || null; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  hat(cls) { return this.className.split(/\s+/).includes(cls); }
  passt(sel) {
    const m = /^([a-z]*)((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/i.exec(sel.trim());
    if (!m) throw new Error('Selektor nicht unterstützt: ' + sel);
    if (m[1] && this.tagName !== m[1].toUpperCase()) return false;
    for (const c of (m[2].match(/\.[\w-]+/g) || [])) if (!this.hat(c.slice(1))) return false;
    for (const a of (m[3].match(/\[[\w-]+\]/g) || [])) {
      const n = a.slice(1, -1);
      const camel = n.replace(/^data-/, '').replace(/-(\w)/g, (_, x) => x.toUpperCase());
      if (!(camel in this.dataset) && !(n in this.attrs)) return false;
    }
    return true;
  }
  alle() { return this.children.flatMap((c) => [c, ...c.alle()]); }
  querySelectorAll(sel) {
    const sels = sel.split(',');
    return this.alle().filter((e) => sels.some((s) => e.passt(s)));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { for (let e = this; e; e = e.parent) if (e.passt(sel)) return e; return null; }
  set outerHTML(h) { this.neuHtml = h; }
  set innerHTML(h) {
    // Nur was der Test braucht: ein <div class="…" id="…">…</div> → ein Kind-Element
    const m = /<div class="([^"]*)" id="([^"]*)">/.exec(h);
    this.firstElementChild = m ? Object.assign(new El('div', m[1]), { id: m[2], htmlText: h }) : null;
  }
}

function dom() {
  const ids = {};
  const reg = (e, id) => { e.id = id; ids[id] = e; return e; };
  return {
    ids, reg,
    doc: {
      getElementById: (id) => ids[id] || makeElementStub(),
      createElement: (t) => new El(t),
    },
  };
}

function karte(d, idx, name, mitBild) {
  const thumb = new El('div', 'pc-thumb');
  if (mitBild) { const im = new El('img'); im.dataset.lz = 'pf'; im.dataset.lk = name; thumb.add(im); }
  else { const p = new El('div', 'pc-placeholder'); p.textContent = '?'; thumb.add(p); }
  thumb.add(new El('span', 'pc-tag'), new El('button', 'pc-fav'), new El('span', mitBild ? 'pc-zoom' : 'pc-capture-hint'));
  const nameEl = new El('div', 'pc-name'); nameEl.title = name;
  return d.reg(new El('div', 'pc'), 'prow_' + idx).add(thumb, nameEl);
}

// Liste: Besitzer1 = Ada(mit), Bea(ohne); Besitzer2 = Cy(ohne)
function liste(opts = {}) {
  const d = dom();
  const namen = ['Ada - Besitzer1', 'Bea - Besitzer1', 'Cy - Besitzer2'];
  const bilder = [true, false, false];
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = d.doc.getElementById;
  ctx.document.createElement = d.doc.createElement;
  const el = d.reg(new El('div'), 'profileListEl');
  el._profileKeys = opts.ungezeichnet ? undefined : namen.slice();
  const bloecke = [[0, 1], [2]].map((idxs, b) => {
    const blk = d.reg(new El('div', 'profile-owner-block'), 'pb_Besitzer' + (b + 1));
    const zaehler = new El('span', 'profile-owner-count'); zaehler.textContent = String(idxs.length);
    const strip = new El('div', 'profile-strip');
    strip.add(...idxs.map((i) => karte(d, i, namen[i], bilder[i])));
    blk.add(zaehler, new El('div', 'profile-owner-rows').add(strip));
    return blk;
  });
  el.add(...bloecke);
  ctx.__namen = namen; ctx.__bilder = bilder;
  evalIn(ctx, `
    __namen.forEach((n, i) => { PROFILES[n] = { items: [] }; _profileNameMap['p_' + i] = n; if (__bilder[i]) PROFILE_SCREENSHOTS[n] = 'data:ada'; else delete PROFILE_SCREENSHOTS[n]; });
    _profileFilter = ${JSON.stringify(opts.filter || 'all')};
    var __beobachtet = 0; _lazyImgBeobachten = function () { __beobachtet++; };
  `);
  return { ctx, el, d, bloecke, beobachtet: () => evalIn(ctx, '__beobachtet') };
}

const bildVon = (kart) => kart.querySelector('img[data-lz]');

describe('Profil-Liste: nur die eine Karte wird angefasst', () => {
  it('neues Bild: Platzhalter wird zum Bild, die übrigen Karten behalten ihre Elemente', () => {
    const { ctx, el, d, beobachtet } = liste();
    const adaBild = bildVon(d.ids.prow_0);
    const bea = d.ids.prow_1;
    evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
    expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(true);

    expect(bildVon(d.ids.prow_0)).toBe(adaBild);            // Ada: dasselbe Element, nicht neu gebaut
    expect(d.ids.prow_1).toBe(bea);                           // Karte bleibt im DOM
    const neu = bildVon(bea);
    expect(neu).toBeTruthy();
    expect(neu.dataset.lz).toBe('pf');
    expect(neu.dataset.lk).toBe('Bea - Besitzer1');
    expect(bea.querySelectorAll('.pc-placeholder').length).toBe(0);
    expect(bea.querySelectorAll('.pc-zoom, .pc-capture-hint').map((n) => n.className)).toEqual(['pc-zoom']);
    expect(d.ids.prow_2.querySelectorAll('.pc-placeholder').length).toBe(1); // Cy unberührt
    expect(beobachtet()).toBe(1);
    expect(el.children.length).toBe(2);
  });

  it('Bild entfernt: Platzhalter mit Anfangsbuchstabe und Aufnahme-Hinweis kommen zurück', () => {
    const { ctx, d } = liste();
    evalIn(ctx, "delete PROFILE_SCREENSHOTS['Ada - Besitzer1']");
    expect(evalIn(ctx, "_profilBildAktualisieren('Ada - Besitzer1')")).toBe(true);
    const ada = d.ids.prow_0;
    expect(bildVon(ada)).toBeNull();
    expect(ada.querySelector('.pc-placeholder').textContent).toBe('A');
    expect(ada.querySelectorAll('.pc-zoom, .pc-capture-hint').map((n) => n.className)).toEqual(['pc-capture-hint']);
  });

  it('Reihenfolge in der Vorschau bleibt: Bild zuerst, Hinweis zuletzt', () => {
    const { ctx, d } = liste();
    evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
    evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')");
    const thumb = d.ids.prow_1.querySelector('.pc-thumb');
    expect(thumb.children[0].tagName).toBe('IMG');
    expect(thumb.children.at(-1).className).toBe('pc-zoom');
    expect(thumb.children.length).toBe(4);
  });

  it('Filter "ohne Bild": die Karte verschwindet, Zähler wird nachgezogen, leerer Block verschwindet', () => {
    const { ctx, el, d } = liste({ filter: 'noshot' });
    evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
    expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(true);
    expect(d.ids.prow_1.parent).toBeNull();
    expect(el.children[0].querySelector('.profile-owner-count').textContent).toBe('1');

    evalIn(ctx, "PROFILE_SCREENSHOTS['Cy - Besitzer2'] = 'data:cy'");
    // letzter Block wird entfernt – eine Karte (Ada) bleibt übrig, also kein Komplett-Rendern nötig
    expect(evalIn(ctx, "_profilBildAktualisieren('Cy - Besitzer2')")).toBe(true);
    expect(el.children.length).toBe(1);
  });

  it('Filter "ohne Bild": verschwindet die letzte Karte überhaupt, muss neu gezeichnet werden (Leermeldung)', () => {
    const { ctx, el, d } = liste({ filter: 'noshot' });
    // Im Filter "ohne Bild" gibt es Ada (hat ein Bild) nicht in der Liste
    d.ids.prow_0.remove(); delete d.ids.prow_0;
    evalIn(ctx, "delete _profileNameMap['p_0']");
    evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:x'");
    expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(true);   // Cy ist noch da
    expect(el.querySelectorAll('.pc').length).toBe(1);
    evalIn(ctx, "PROFILE_SCREENSHOTS['Cy - Besitzer2'] = 'data:x'");
    expect(evalIn(ctx, "_profilBildAktualisieren('Cy - Besitzer2')")).toBe(false);   // jetzt ist die Liste leer
    expect(el.querySelectorAll('.pc').length).toBe(0);
  });

  describe('Filter "mit Bild": eine neue Karte wird eingesetzt statt die Liste neu zu bauen', () => {
    // Ausgangslage im Filter "mit Bild": nur Ada (hat ein Bild) ist zu sehen; Bea (gleicher Besitzer) und Cy kommen dazu
    function mitBild() {
      const r = liste({ filter: 'withshot' });
      for (const k of ['prow_1', 'prow_2']) { r.d.ids[k].remove(); delete r.d.ids[k]; }
      evalIn(r.ctx, "delete _profileNameMap['p_1']; delete _profileNameMap['p_2']; _profileCardHtml = function (name, idx) { return '<div class=\"pc\" id=\"prow_' + idx + '\">' + name + '</div>'; }");
      r.el.children[1].remove(); // Block "Besitzer2" ist im Filter ebenfalls leer
      return r;
    }
    const namenImBlock = (blk) => blk.querySelectorAll('.pc').map((c) => c.htmlText || c.id);

    it('neue Karte kommt an die richtige Stelle (alphabetisch im Besitzer-Block); Zähler und Nummern stimmen', () => {
      const { ctx, el, d, bloecke } = mitBild();
      const ada = d.ids.prow_0;
      evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
      expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(true);
      const karten = bloecke[0].querySelectorAll('.pc');
      expect(karten.length).toBe(2);
      expect(karten[0]).toBe(ada);                                    // Ada steht vor Bea und bleibt dasselbe Element
      expect(karten[1].htmlText).toContain('Bea - Besitzer1');
      expect(karten[1].id).toBe('prow_3');                            // neue, freie Nummer (es gab 0..2)
      expect(evalIn(ctx, "_profileNameMap['p_3']")).toBe('Bea - Besitzer1');
      expect(el._profileKeys[3]).toBe('Bea - Besitzer1');
      expect(bloecke[0].querySelector('.profile-owner-count').textContent).toBe('2');
    });

    it('kommt die neue Karte alphabetisch VOR den vorhandenen, steht sie davor', () => {
      const { ctx, bloecke } = mitBild();
      evalIn(ctx, "PROFILES['Aaa - Besitzer1'] = { items: [] }; PROFILE_SCREENSHOTS['Aaa - Besitzer1'] = 'data:x'");
      expect(evalIn(ctx, "_profilBildAktualisieren('Aaa - Besitzer1')")).toBe(true);
      const karten = bloecke[0].querySelectorAll('.pc');
      expect(karten[0].htmlText).toContain('Aaa - Besitzer1');
      expect(karten[1].id).toBe('prow_0');
    });

    it('mehrere Bilder nacheinander: jede Karte genau einmal, fortlaufende Nummern, Ada bleibt unberührt', () => {
      const { ctx, d, bloecke } = mitBild();
      const ada = d.ids.prow_0;
      evalIn(ctx, "PROFILES['Zed - Besitzer1'] = { items: [] }");
      for (const n of ['Bea - Besitzer1', 'Zed - Besitzer1']) {
        evalIn(ctx, `PROFILE_SCREENSHOTS[${JSON.stringify(n)}] = 'data:x'`);
        expect(evalIn(ctx, `_profilBildAktualisieren(${JSON.stringify(n)})`)).toBe(true);
      }
      const ids = bloecke[0].querySelectorAll('.pc').map((c) => c.id);
      expect(ids).toEqual(['prow_0', 'prow_3', 'prow_4']);
      expect(bloecke[0].querySelectorAll('.pc')[0]).toBe(ada);
      expect(bloecke[0].querySelector('.profile-owner-count').textContent).toBe('3');
    });

    it('Besitzer-Block fehlt: Komplett-Rendern', () => {
      const { ctx, d } = mitBild();
      delete d.ids.pb_Besitzer1;
      evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
      expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(false);
    });

    it('mit Suchbegriff oder Tag-Filter entscheidet renderProfileList, was zu sehen ist: Komplett-Rendern', () => {
      const { ctx, d } = mitBild();
      d.doc.getElementById = (id) => (id === 'profileSearch' ? { value: 'bea' } : d.ids[id] || makeElementStub());
      ctx.document.getElementById = d.doc.getElementById;
      evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
      expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(false);
      d.doc.getElementById = (id) => d.ids[id] || makeElementStub();
      ctx.document.getElementById = d.doc.getElementById;
      evalIn(ctx, "_profileTagFilter = 'x'");
      expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(false);
    });

    it('nach dem Einsetzen werden neue Lazy-Bilder beobachtet', () => {
      const { ctx, beobachtet } = mitBild();
      evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
      evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')");
      expect(beobachtet()).toBe(1);
    });
  });

  it('Profil ist wegen Suche/Filter nicht sichtbar und bleibt es: nichts zu tun', () => {
    const { ctx, d } = liste();
    d.ids.prow_1.remove(); delete d.ids.prow_1;
    evalIn(ctx, "delete _profileNameMap['p_1']");
    evalIn(ctx, "PROFILE_SCREENSHOTS['Bea - Besitzer1'] = 'data:bea'");
    expect(evalIn(ctx, "_profilBildAktualisieren('Bea - Besitzer1')")).toBe(true);
  });

  it('Liste noch nie gezeichnet: Komplett-Rendern', () => {
    const { ctx } = liste({ ungezeichnet: true });
    expect(evalIn(ctx, "_profilBildAktualisieren('Ada - Besitzer1')")).toBe(false);
  });
});

describe('Outfit-Scan: nur die Karten mit dem neuen Bild werden ersetzt', () => {
  function os() {
    const d = dom();
    const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
    ctx.document.getElementById = d.doc.getElementById;
    const body = d.reg(new El('div'), 'outfitScanBody');
    const blk = d.reg(new El('div', 'os-member-block'), 'osm_1001');
    const strip = new El('div', 'os-strip');
    const karten = [0, 1, 2].map((i) => { const c = new El('div', 'os-card'); c.dataset.mk = '1001'; c.dataset.vidx = String(i); return c; });
    strip.add(...karten);
    blk.add(new El('div', 'os-member-rows').add(strip));
    body.add(blk);
    evalIn(ctx, `
      LSCG_DB['1001'] = { versions: [{ fingerprint: 'fpA' }, { fingerprint: 'fpB' }, { fingerprint: 'fpA' }] };
      _osKartenBauer = function (mk, idx) { return '<card ' + mk + ' ' + idx + '>'; };
      var __beobachtet = 0; _lazyImgBeobachten = function () { __beobachtet++; };
    `);
    return { ctx, d, body, blk, strip, karten };
  }

  it('Versionen mit gleichem Fingerabdruck teilen sich das Bild und werden beide ersetzt, die anderen nicht', () => {
    const { ctx, karten } = os();
    expect(evalIn(ctx, "_osBildAktualisieren('1001|fpA')")).toBe(true);
    expect(karten.map((k) => k.neuHtml)).toEqual(['<card 1001 0>', undefined, '<card 1001 2>']);
    expect(evalIn(ctx, '__beobachtet')).toBe(1);
  });

  it('Version ohne Fingerabdruck (alter Schlüssel nur mk)', () => {
    const { ctx, karten } = os();
    evalIn(ctx, "LSCG_DB['1001'].versions[1] = {}");
    expect(evalIn(ctx, "_osBildAktualisieren('1001')")).toBe(true);
    expect(karten.map((k) => k.neuHtml)).toEqual([undefined, '<card 1001 1>', undefined]);
  });

  it('Streifen noch nicht gebaut (Lazy-Befüllung): nichts zu tun, Karten entstehen später mit dem Bild', () => {
    const { ctx, strip, karten } = os();
    strip.dataset.osLazy = '1001';
    expect(evalIn(ctx, "_osBildAktualisieren('1001|fpA')")).toBe(true);
    expect(karten.every((k) => k.neuHtml === undefined)).toBe(true);
  });

  it('Spieler nicht gezeichnet oder Karte fehlt: Komplett-Rendern', () => {
    const { ctx, karten } = os();
    expect(evalIn(ctx, "_osBildAktualisieren('9999|x')")).toBe(false);
    karten[2].remove();
    expect(evalIn(ctx, "_osBildAktualisieren('1001|fpA')")).toBe(false);
  });

  it('durch den Schloss-Filter ausgeblendete Version (kein HTML) wird übersprungen', () => {
    const { ctx, karten } = os();
    evalIn(ctx, "_osKartenBauer = function (mk, idx) { return idx === 2 ? '' : '<card ' + idx + '>'; }");
    karten[2].remove();
    expect(evalIn(ctx, "_osBildAktualisieren('1001|fpA')")).toBe(true);
    expect(karten[0].neuHtml).toBe('<card 0>');
  });
});

describe('Aufrufstellen nutzen die Einzel-Aktualisierung', () => {
  const SRC = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8');

  it('nach jedem Setzen/Entfernen eines Profil-Bildes steht _profilBildAktualisieren vor dem Komplett-Rendern', () => {
    const treffer = SRC.match(/_saveProfileScreenshots\(\);\s*\n\s*if \(!_profilBildAktualisieren\(name\)\) renderProfileList\(\);/g) || [];
    expect(treffer.length).toBe(4); // Einzel-Screenshot, Auto-Screenshot, Upload, Entfernen
  });

  it('der Auto-Screenshot der Outfit-Scan-Bilder ersetzt nur die betroffenen Karten', () => {
    expect(SRC).toContain("if (_activeTab === 'outfit-scan' && !_osBildAktualisieren(storeKey)) _debouncedRenderOutfitScanTab();");
  });

  it('jede Outfit-Karte trägt Spieler und Versionsnummer, damit sie gefunden wird', () => {
    expect(SRC).toContain('data-mk="\' + escHtml(mk) + \'" data-vidx="\' + realIdx + \'"');
  });
});
