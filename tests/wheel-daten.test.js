import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// MBS Wheel – Daten: Import nur ergänzend, eindeutige Outfit-Favoriten (auch bei gleichen Namen), Bild geht mit ins Profil,
// größere Bilder und "Alle erstellen" macht niedrig aufgelöste Bilder neu.

function boot({ prompt = null, confirm = () => true, echteZeichnung = false } = {}) {
  const els = {};
  const meldungen = [];
  const eingabe = { dateien: null };
  const ctx = loadScript(['items.js'], {
    setTimeout: () => 0, clearTimeout: () => {},
    prompt: () => prompt, confirm: (m) => confirm(String(m)),
    FileReader: class { readAsText(f) { this.onload({ target: { result: f.inhalt } }); } },
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  const echt = ctx.document.createElement;
  ctx.document.createElement = (tag) => {
    if (tag === 'input') { const i = makeElementStub(); i.click = () => { eingabe.input = i; }; return i; }
    return echt(tag);
  };
  evalIn(ctx, `
    idbSet = function () {};
    ${echteZeichnung ? '' : '_renderMbsWheelTab = function () {};'} _saveMbsWheelData = function () {}; _updateWheelTabBadge = function () {};
    showStatus = function (m) { __meldungen.push(m); };
    _mbsWheelData = []; _mbsWheelShots = {}; _mbsWheelFavs = new Set(); _mbsWheelOutfitFavs = new Set(); _mbsWheelFilter = 'all';
  `.replace('__meldungen', '__m'));
  ctx.__m = meldungen;
  return { ctx, els, meldungen, eingabe };
}
const item = (g, a) => ({ group: g, asset: a, colors: 'Default', property: null });
const outfit = (name, ...items) => ({ name, items: items.map(([g, a]) => item(g, a)), firstSeen: 1 });
const setze = (ctx, daten) => { ctx.__d = daten; evalIn(ctx, '_mbsWheelData = __d'); };
const lies = (ctx, ausdruck) => evalIn(ctx, ausdruck);

describe('Wheel-Import: nur ergänzen', () => {
  function importiere(t, payload) {
    t.ctx.mbsWheelImportDB();
    t.eingabe.input.onchange({ target: { files: [{ inhalt: JSON.stringify(payload) }] } });
  }

  it('bekannter Spieler: fehlende Outfits kommen dazu, vorhandene bleiben unverändert – auch bei neuerem Scan', () => {
    const t = boot();
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 100, room: 'alt', outfits: [outfit('A', ['Cloth', 'Dress']), outfit('Nur lokal', ['Cloth', 'Rock'])] }]);
    importiere(t, { type: 'BCU_WHEEL_DB', data: [{ memberNumber: 5, name: 'Mia neu', ts: 999, outfits: [outfit('A anders benannt', ['Cloth', 'Dress']), outfit('B', ['Cloth', 'Hose'])] }] });
    const namen = lies(t.ctx, '_mbsWheelData[0].outfits.map(o => o.name)');
    expect(namen).toEqual(['A', 'Nur lokal', 'B']);   // "Nur lokal" ging früher verloren; A bleibt A; B ergänzt
    expect(lies(t.ctx, '_mbsWheelData.length')).toBe(1);
  });

  it('unbekannte Spieler werden angehängt; Meldung nennt neue Spieler und neue Outfits', () => {
    const t = boot();
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('A', ['Cloth', 'Dress'])] }]);
    importiere(t, { type: 'BCU_WHEEL_DB', data: [{ memberNumber: 7, name: 'Ada', ts: 2, outfits: [outfit('X', ['Cloth', 'Kleid']), outfit('Y', ['Cloth', 'Bluse'])] }] });
    expect(lies(t.ctx, '_mbsWheelData.map(r => r.memberNumber)')).toEqual([5, 7]);
    expect(t.meldungen.at(-1)).toMatch(/1 neue Spieler, 2 neue Outfits/);
  });

  it('Favoriten und Bilder aus der Datei werden ergänzt, vorhandene Bilder nicht überschrieben', () => {
    const t = boot();
    evalIn(t.ctx, "_mbsWheelShots = { fpA: 'lokal' }");
    importiere(t, { type: 'BCU_WHEEL_DB', data: [], favs: [5], outfitFavs: ['o2|5|A|x'], shots: { fpA: 'datei', fpB: 'neu' } });
    expect(lies(t.ctx, '_mbsWheelShots')).toEqual({ fpA: 'lokal', fpB: 'neu' });
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.has("o2|5|A|x")')).toBe(true);
  });

  it('Einzel-Import (JSON eines Outfits): gleiches Outfit wird nicht doppelt angelegt, ein anderes mit GLEICHEM Namen ersetzt nichts', () => {
    const t = boot();
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('Sommer', ['Cloth', 'Dress'])] }]);
    const objekt = (o) => ({ type: 'BCU_WHEEL_OUTFIT', memberNumber: 5, player: 'Mia', outfit: o });
    t.ctx._mbsImportOutfitObj(objekt(outfit('Sommer', ['Cloth', 'Dress'])));
    expect(lies(t.ctx, '_mbsWheelData[0].outfits.length')).toBe(1);
    expect(t.meldungen.at(-1)).toMatch(/schon vorhanden/);
    t.ctx._mbsImportOutfitObj(objekt(outfit('Sommer', ['Cloth', 'Rock'])));
    expect(lies(t.ctx, '_mbsWheelData[0].outfits.map(o => o.items[0].asset)')).toEqual(['Dress', 'Rock']);
  });
});

describe('Wheel-Favoriten: pro Outfit eindeutig', () => {
  function zwei(echt = false) {
    const t = boot({ echteZeichnung: echt });
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('Gleich', ['Cloth', 'Dress']), outfit('Gleich', ['Cloth', 'Rock']), outfit('Anders', ['Cloth', 'Hose'])] }]);
    return t;
  }
  const favNamen = (ctx) => lies(ctx, '[..._mbsWheelOutfitFavs].map(k => k.split("|")[3]).sort()');

  it('zwei Outfits mit gleichem Namen teilen sich keinen Stern mehr', () => {
    const t = zwei();
    t.ctx.mbsWheelToggleOutfitFav(5, 0);
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.size')).toBe(1);
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.has(_mbsOutfitFavKey(5, _mbsWheelData[0].outfits[0]))')).toBe(true);
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.has(_mbsOutfitFavKey(5, _mbsWheelData[0].outfits[1]))')).toBe(false);
    t.ctx.mbsWheelToggleOutfitFav(5, 0);
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.size')).toBe(0);
  });

  it('alter Schlüssel "Spieler|Name": alle gleichnamigen Outfits werden umgesetzt (wie vorher markiert), der alte fällt weg', () => {
    const t = zwei();
    evalIn(t.ctx, "_mbsWheelOutfitFavs = new Set(['5|Gleich'])");
    t.ctx._mbsFavMigrieren();
    expect(lies(t.ctx, '_mbsWheelOutfitFavs.size')).toBe(2);
    expect(lies(t.ctx, "[..._mbsWheelOutfitFavs].every(k => k.startsWith('o2|5|Gleich|'))")).toBe(true);
    expect(lies(t.ctx, "_mbsWheelOutfitFavs.has('5|Gleich')")).toBe(false);
  });

  it('alter Schlüssel ohne passendes Outfit (noch nicht geladen) bleibt stehen – nichts geht verloren', () => {
    const t = zwei();
    evalIn(t.ctx, "_mbsWheelOutfitFavs = new Set(['9|Fremd', '5|Gibt es nicht'])");
    t.ctx._mbsFavMigrieren();
    expect(lies(t.ctx, '[..._mbsWheelOutfitFavs].sort()')).toEqual(['5|Gibt es nicht', '9|Fremd']);
  });

  it('Filter "Favoriten" zeigt nur die markierten Outfits, nicht alle des (favorisierten) Spielers', () => {
    const t = zwei(true);
    evalIn(t.ctx, '_mbsWheelFavs.add(5)');                // Spieler-Stern
    t.ctx.mbsWheelToggleOutfitFav(5, 2);                  // nur "Anders"
    const body = makeElementStub(); t.els.wheelOutfitBody = body;
    evalIn(t.ctx, "_mbsWheelFilter = 'fav'");
    t.ctx._renderMbsWheelTab();
    expect(body.innerHTML).toContain('Anders');
    expect(body.innerHTML).not.toContain('Gleich');
  });

  it('Spieler löschen entfernt seine neuen UND alten Favoriten-Schlüssel', () => {
    const t = boot({ confirm: () => true });
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('A', ['Cloth', 'Dress'])] }]);
    evalIn(t.ctx, "_mbsWheelOutfitFavs = new Set(['5|A', 'o2|5|A|x', 'o2|7|B|y'])");
    t.ctx.mbsWheelDeletePlayer(5);
    expect(lies(t.ctx, '[..._mbsWheelOutfitFavs]')).toEqual(['o2|7|B|y']);
  });
});

describe('Als Profil speichern: das Bild geht mit', () => {
  function mitBild(bild) {
    const t = boot({ prompt: 'Mein Profil' });
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('A', ['Cloth', 'Dress'])] }]);
    evalIn(t.ctx, `Object.keys(PROFILES).forEach(k => delete PROFILES[k]); Object.keys(PROFILE_SCREENSHOTS).forEach(k => delete PROFILE_SCREENSHOTS[k]);
      _saveProfiles = function () {}; _saveProfileScreenshots = function () {};`);
    if (bild) { t.ctx.__b = bild; evalIn(t.ctx, "_mbsWheelShots[_mbsOutfitFp(_mbsWheelData[0].outfits[0])] = __b"); }
    return t;
  }

  it('mit Wheel-Bild: das Profil bekommt es', () => {
    const t = mitBild('data:wheel');
    t.ctx.mbsWheelSaveProfile(5, 0);
    expect(lies(t.ctx, "PROFILE_SCREENSHOTS['Mein Profil']")).toBe('data:wheel');
    expect(t.meldungen.at(-1)).toContain('inkl. Bild');
  });

  it('ohne Wheel-Bild: Profil ohne Bild, ein vorhandenes Bild des Profils bleibt', () => {
    const t = mitBild(null);
    evalIn(t.ctx, "PROFILES['Mein Profil'] = { name: 'Mein Profil', items: [] }; PROFILE_SCREENSHOTS['Mein Profil'] = 'data:alt'");
    t.ctx.mbsWheelSaveProfile(5, 0);
    expect(lies(t.ctx, "PROFILE_SCREENSHOTS['Mein Profil']")).toBe('data:alt');
    expect(t.meldungen.at(-1)).not.toContain('inkl. Bild');
  });
});

// ── Bildgröße und "Alle erstellen" ───────────────────────────────────────────

function jpeg(w, h) {
  const b = Buffer.from([
    0xFF, 0xD8,
    0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xFF, 0xC0, 0x00, 0x11, 0x08, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    0xFF, 0xD9,
  ]);
  return 'data:image/jpeg;base64,' + b.toString('base64');
}

describe('Wheel-Bildgröße', () => {
  it('JPEG-Größe aus dem Kopf; alte 260×520-Bilder gelten als niedrig, neue nicht, Unlesbares ist in Ordnung', () => {
    const { ctx } = boot();
    expect(ctx._jpegGroesse(jpeg(260, 520))).toEqual({ w: 260, h: 520 });
    expect(ctx._jpegGroesse(jpeg(500, 1000))).toEqual({ w: 500, h: 1000 });
    expect(ctx._wheelBildNiedrig(jpeg(260, 520))).toBe(true);
    expect(ctx._wheelBildNiedrig(jpeg(180, 520))).toBe(true);
    expect(ctx._wheelBildNiedrig(jpeg(500, 1000))).toBe(false);
    for (const u of ['data:image/png;base64,AAAA', 'data:image/jpeg;base64,AAAA', '', undefined, 'unsinn']) {
      expect(ctx._jpegGroesse(u)).toBeNull();
      expect(ctx._wheelBildNiedrig(u)).toBe(false);
    }
  });

  function speichere(naturlichB, naturlichH) {
    const t = boot();
    const z = {};
    t.ctx.Image = class { set src(v) { this.naturalWidth = naturlichB; this.naturalHeight = naturlichH; this.onload(); } };
    const alt = t.ctx.document.createElement;
    t.ctx.document.createElement = (tag) => (tag === 'canvas'
      ? { set width(v) { z.w = v; }, set height(v) { z.h = v; }, getContext: () => ({ drawImage() {} }), toDataURL: (typ, q) => { z.typ = typ; z.q = q; return 'data:neu'; } }
      : alt(tag));
    evalIn(t.ctx, "_pendingWheelShot['wss_1'] = 'fpX'; _saveMbsWheelShots = function () {}; _activeTab = 'x'; _wheelGenWeiter = function () {};");
    t.ctx._handleWheelShotData({ reqId: 'wss_1', data: 'data:in' });
    return { z, bild: lies(t.ctx, '_mbsWheelShots.fpX') };
  }

  it('neue Bilder werden auf höchstens 520×1040 verkleinert (früher 260×520), JPEG-Qualität 0.88', () => {
    const { z, bild } = speichere(1200, 2400);
    expect([z.w, z.h]).toEqual([520, 1040]);
    expect(z.typ).toBe('image/jpeg');
    expect(z.q).toBe(0.88);
    expect(bild).toBe('data:neu');
  });

  it('kleinere Aufnahmen werden nicht vergrößert', () => {
    const { z } = speichere(400, 900);
    expect([z.w, z.h]).toEqual([400, 900]);
  });
});

describe('"Alle erstellen": fehlende und niedrig aufgelöste Bilder', () => {
  it('Queue = Outfits ohne Bild + mit niedrig aufgelöstem Bild; gute Bilder bleiben; gleiche Outfits nur einmal', () => {
    let gefragt = null, queue = null;
    const t = boot({ confirm: (m) => { gefragt = m; queue = lies(t.ctx, '_wheelGenQueue.map(j => j.mn + ":" + j.oi)'); return false; } });
    t.ctx.__hd = jpeg(500, 1000); t.ctx.__ld = jpeg(260, 520);
    setze(t.ctx, [
      { memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('Fehlt', ['Cloth', 'A']), outfit('Niedrig', ['Cloth', 'B']), outfit('Gut', ['Cloth', 'C'])] },
      { memberNumber: 6, name: 'Ada', ts: 1, outfits: [outfit('Fehlt auch', ['Cloth', 'A'])] },   // gleiche Items wie "Fehlt" → ein Bild
    ]);
    evalIn(t.ctx, "_connected = true; _mbsWheelShots = { 'Cloth:B': __ld, 'Cloth:C': __hd }");
    t.ctx.mbsWheelGenerateAll();
    expect(queue).toEqual(['5:0', '5:1']);
    expect(gefragt).toContain('2 Outfit-Bilder');
    expect(gefragt).toContain('1 fehlende');
    expect(gefragt).toContain('1 in niedriger Auflösung');
    expect(lies(t.ctx, '_wheelGenRunning')).toBe(false);   // abgebrochen → nichts gestartet
  });

  it('sind alle Bilder gut: nichts zu tun, keine Rückfrage', () => {
    let gefragt = false;
    const t = boot({ confirm: () => { gefragt = true; return true; } });
    t.ctx.__hd = jpeg(500, 1000);
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('Gut', ['Cloth', 'C'])] }]);
    evalIn(t.ctx, "_connected = true; _mbsWheelShots = { 'Cloth:C': __hd }");
    t.ctx.mbsWheelGenerateAll();
    expect(gefragt).toBe(false);
    expect(t.meldungen.at(-1)).toMatch(/guter Auflösung/);
  });

  it('ein Schritt überspringt ein Outfit, dessen Bild inzwischen gut ist – ein niedriges wird neu gemacht', () => {
    const t = boot();
    t.ctx.__hd = jpeg(500, 1000); t.ctx.__ld = jpeg(260, 520);
    setze(t.ctx, [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [outfit('Niedrig', ['Cloth', 'B'])] }]);
    evalIn(t.ctx, "_connected = true; _wheelGenRunning = true; _wheelGenTotal = 1; _wheelGenQueue = [{ mn: 5, oi: 0 }]; _mbsWheelShots = { 'Cloth:B': __ld }");
    t.opener = null;
    evalIn(t.ctx, "bcSend = function (m) { __m.push('EXEC-' + (String(m.code).includes('\"asset\":\"B\"') ? 'MIT-OUTFIT' : 'OHNE-OUTFIT')); return true; }");
    t.ctx._wheelGenStep();
    expect(t.meldungen).toContain('EXEC-MIT-OUTFIT');      // wird neu gemacht
    evalIn(t.ctx, "_wheelGenShotReq = null; _wheelGenQueue = [{ mn: 5, oi: 0 }]; _mbsWheelShots = { 'Cloth:B': __hd }; __m.length = 0");
    t.ctx._wheelGenStep();
    expect(t.meldungen).not.toContain('EXEC-MIT-OUTFIT');  // gutes Bild: übersprungen (nur das Aufräumen am Ende der Serie geht raus)
  });
});
