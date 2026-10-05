import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, settle, makeElementStub } from './helpers/loadScript.js';

// Favoriten (Profile, Item Manager, Mitglieder) lagen nur im localStorage. Ist der voll (~5 MB), warf setItem – ein catch {} schluckte
// das, und die Favoriten waren nach dem Neuladen weg. Jetzt: die Datenbank ist maßgeblich, der localStorage nur ein Spiegel, und ein
// voller localStorage wird sichtbar gemeldet.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const KEY = 'BC_PROFILE_FAVS_v1';

// localStorage-Ersatz; mit voll=true wirft jedes setItem wie ein voller Browser-Speicher
function speicher(start = {}, { voll = false } = {}) {
  const m = new Map(Object.entries(start));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (voll) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k), clear: () => m.clear(),
  };
}

// Ein "Rechner" mit eigener Datenbank; idb kann für einen Neustart weitergereicht werden
function rechner({ idb = new IDBFactory(), ls = speicher(), confirm = () => true } = {}) {
  const fragen = [];
  const ctx = loadScript(['items.js'], { console: quiet, indexedDB: idb, localStorage: ls, setTimeout, clearTimeout, confirm: (m) => { fragen.push(String(m)); return confirm(String(m)); } });
  ctx.__fragen = fragen;
  ctx.document.getElementById = () => makeElementStub();
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus; renderProfileList = function () {};');
  return { ctx, idb, ls };
}

describe('Favoriten überleben einen vollen localStorage', () => {
  it('Profil-Favorit mit vollem localStorage gesetzt → nach dem Neustart (leerer localStorage) wieder da', async () => {
    const a = rechner({ ls: speicher({}, { voll: true }) });
    await settle(80);
    a.ctx.toggleProfileFav('Kleid - Mia');
    await settle(80);
    expect(evalIn(a.ctx, 'PROFILE_FAVS.has("Kleid - Mia")')).toBe(true);
    // Neustart: gleiche Datenbank, der localStorage ist leer bzw. hat nichts bekommen
    const b = rechner({ idb: a.idb });
    await settle(120);
    expect(evalIn(b.ctx, '[...PROFILE_FAVS]')).toEqual(['Kleid - Mia']);
  });

  it('Item-Manager- und Mitglieds-Favoriten ebenso', async () => {
    const a = rechner({ ls: speicher({}, { voll: true }) });
    await settle(80);
    evalIn(a.ctx, "FAVORITES.add('Cloth::Dress'); _kleinSpeichern('BC_FAVORITES_v9', FAVORITES); _favMembers.add(4711); _saveFavMembers();");
    await settle(80);
    const b = rechner({ idb: a.idb });
    await settle(120);
    expect(evalIn(b.ctx, '[...FAVORITES]')).toEqual(['Cloth::Dress']);
    expect(evalIn(b.ctx, '[..._favMembers]')).toEqual([4711]);
  });

  it('ein voller localStorage wird sichtbar gemeldet (nicht still verschluckt)', () => {
    const { ctx } = rechner();
    ctx.showStatus.mockClear();
    evalIn(ctx, '_lsVollGemeldet = 0; _lsVollMelden("BC_PROFILE_FAVS_v1", new Error("quota"));');
    expect(ctx.showStatus).toHaveBeenCalledTimes(1);
    expect(String(ctx.showStatus.mock.calls[0][0])).toContain('Browser-Speicher');
    expect(ctx.showStatus.mock.calls[0][1]).toBe('error');
    // nicht bei jedem Fehler aufs Neue
    evalIn(ctx, '_lsVollMelden("x", new Error("quota"));');
    expect(ctx.showStatus).toHaveBeenCalledTimes(1);
  });
});

describe('Übernahme und Abgleich beim Start', () => {
  it('Bestand im localStorage, noch nichts in der Datenbank → wird dort angelegt (einmalige Übernahme)', async () => {
    const a = rechner({ ls: speicher({ [KEY]: JSON.stringify(['Alt A', 'Alt B']) }) });
    await settle(120);
    expect(evalIn(a.ctx, '[...PROFILE_FAVS].sort()')).toEqual(['Alt A', 'Alt B']);
    expect(await a.ctx.idbGet(KEY)).toEqual(['Alt A', 'Alt B']);
  });

  it('Stand in der Datenbank ist maßgeblich: ein veralteter localStorage-Spiegel überschreibt ihn nicht', async () => {
    const a = rechner();
    await settle(60);
    await a.ctx.idbSet(KEY, ['Neu 1', 'Neu 2']);
    const b = rechner({ idb: a.idb, ls: speicher({ [KEY]: JSON.stringify(['Veraltet']) }) });
    await settle(120);
    expect(evalIn(b.ctx, '[...PROFILE_FAVS].sort()')).toEqual(['Neu 1', 'Neu 2']);
  });

  it('Klicks vor dem Laden gehen nicht verloren: sie werden auf den gespeicherten Stand angewendet', async () => {
    const a = rechner();
    await settle(60);
    await a.ctx.idbSet(KEY, ['Gespeichert', 'Wegzuklicken']);
    const b = rechner({ idb: a.idb, ls: speicher({ [KEY]: JSON.stringify(['Wegzuklicken']) }) });
    // sofort, noch bevor die Datenbank gelesen ist
    b.ctx.toggleProfileFav('Wegzuklicken');   // entfernen
    b.ctx.toggleProfileFav('Frisch');         // hinzufügen
    await settle(150);
    expect(evalIn(b.ctx, '[...PROFILE_FAVS].sort()')).toEqual(['Frisch', 'Gespeichert']);
    expect((await b.ctx.idbGet(KEY)).sort()).toEqual(['Frisch', 'Gespeichert']);
  });

  it('Favorit entfernen wirkt auch im Speicher (kein Wiederauftauchen)', async () => {
    const a = rechner();
    await settle(80);
    a.ctx.toggleProfileFav('X');
    await settle(60);
    a.ctx.toggleProfileFav('X');
    await settle(80);
    const b = rechner({ idb: a.idb });
    await settle(120);
    expect(evalIn(b.ctx, '[...PROFILE_FAVS]')).toEqual([]);
  });
});

describe('Große Profil-Kopie im localStorage', () => {
  it('bei vielen Profilen wird der Spiegel gar nicht erst geschrieben (er würde den Speicher füllen und den Hauptthread blockieren)', async () => {
    const a = rechner();
    await settle(60);
    evalIn(a.ctx, 'Object.keys(PROFILES).forEach(k => delete PROFILES[k]); for (let i = 0; i < 600; i++) PROFILES["P" + i] = { name: "P" + i, items: [{ group: "Cloth", asset: "A" }] };');
    a.ls.m.delete('BC_PROFILES_v11');
    evalIn(a.ctx, '_saveProfilesJetzt();');
    expect(a.ls.m.has('BC_PROFILES_v11')).toBe(false);
    // wenige Profile: wie bisher gespiegelt
    evalIn(a.ctx, 'Object.keys(PROFILES).forEach(k => delete PROFILES[k]); PROFILES["Klein"] = { name: "Klein", items: [] };');
    evalIn(a.ctx, '_saveProfilesJetzt();');
    expect(a.ls.m.has('BC_PROFILES_v11')).toBe(true);
  });
});

describe('Alte Profil-Kopie im localStorage entfernen (mit Rückfrage)', () => {
  const kopie = (namen) => JSON.stringify(Object.fromEntries(namen.map(n => [n, { name: n, items: [] }])));

  it('ohne Kopie: nur ein Hinweis, keine Rückfrage', async () => {
    const a = rechner();
    await settle(60);
    a.ctx.lsProfilKopieEntfernen();
    expect(a.ctx.__fragen).toHaveLength(0);
    expect(a.ctx.showStatus.mock.calls.some(c => String(c[0]).includes('Keine alte Profil-Kopie'))).toBe(true);
  });

  it('steht alles in der Datenbank: eine Rückfrage, dann ist die Kopie weg und die Profile bleiben', async () => {
    const a = rechner({ ls: speicher({ BC_PROFILES_v11: kopie(['A', 'B']) }) });
    await settle(60);
    evalIn(a.ctx, 'PROFILES["A"] = { name: "A", items: [] }; PROFILES["B"] = { name: "B", items: [] };');
    a.ctx.lsProfilKopieEntfernen();
    expect(a.ctx.__fragen).toHaveLength(1);
    expect(a.ls.m.has('BC_PROFILES_v11')).toBe(false);
    expect(evalIn(a.ctx, 'Object.keys(PROFILES).sort()')).toEqual(['A', 'B']);
  });

  it('„Abbrechen“ lässt die Kopie unangetastet', async () => {
    const a = rechner({ ls: speicher({ BC_PROFILES_v11: kopie(['A']) }), confirm: () => false });
    await settle(60);
    evalIn(a.ctx, 'PROFILES["A"] = { name: "A", items: [] };');
    a.ctx.lsProfilKopieEntfernen();
    expect(a.ls.m.has('BC_PROFILES_v11')).toBe(true);
  });

  it('Profile, die nur in der Kopie stehen, werden erst (mit Rückfrage) in die Datenbank übernommen – nichts geht verloren', async () => {
    const a = rechner({ ls: speicher({ BC_PROFILES_v11: kopie(['A', 'Nur-Kopie']) }) });
    await settle(60);
    evalIn(a.ctx, 'Object.keys(PROFILES).forEach(k => delete PROFILES[k]); PROFILES["A"] = { name: "A", items: [] };');
    a.ctx.lsProfilKopieEntfernen();
    expect(a.ctx.__fragen).toHaveLength(2);
    expect(a.ctx.__fragen[0]).toContain('Nur-Kopie');
    expect(evalIn(a.ctx, 'Object.keys(PROFILES).sort()')).toEqual(['A', 'Nur-Kopie']);
    expect(a.ls.m.has('BC_PROFILES_v11')).toBe(false);
  });

  it('die Export-Info warnt, wenn der localStorage fast voll ist, und nennt die größten Schlüssel', async () => {
    const gross = 'x'.repeat(4.8 * 1048576);
    const a = rechner({ ls: Object.assign(speicher({ BC_PROFILES_v11: gross }), { get length() { return 1; }, key: () => 'BC_PROFILES_v11' }) });
    await settle(60);
    const text = await a.ctx.exportInfoSammeln();
    expect(text).toMatch(/localStorage: 1 Schlüssel · ca\. 4,8 MB von etwa 5 MB ⚠️ FAST VOLL/);
    expect(text).toContain('größte: BC_PROFILES_v11');
  });
});
