import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Gesamt-Backup: wirklich alles. Neben den benannten Feldern steckt JEDER Schlüssel der Datenbank und des localStorage
// ('extras') und jeder Spiel-Scan ('spielScans') in der Datei. Einspielen ergänzt nur – nichts wird ersetzt.

function boot({ confirm = () => true } = {}) {
  const idb = new IDBFactory();           // eigene, leere Datenbank je "Rechner"
  const teile = [];
  const els = {};
  const meldungen = [];
  const fragen = [];
  const ctx = loadScript(['items.js'], {
    indexedDB: idb, setTimeout, clearTimeout,
    confirm: (m) => { fragen.push(String(m)); return confirm(String(m)); },
    alert: () => {},
    Blob: class { constructor(p) { teile.push(...p); } get size() { return teile.join('').length; } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.__m = meldungen;
  evalIn(ctx, `showStatus = function (m) { __m.push(m); }; _backupNachWartezeitMs = 0;`);
  return { ctx, teile, meldungen, fragen, els, json: () => JSON.parse(teile.join('')) };
}
const lies = (ctx, a) => evalIn(ctx, a);

describe('Alle Schlüssel lesen', () => {
  it('idbKvAlle liefert jeden Schlüssel samt Wert', async () => {
    const { ctx } = boot();
    await ctx.idbSet('A_schluessel', { x: 1 });
    await ctx.idbSet('B_schluessel', [1, 2]);
    const alle = await ctx.idbKvAlle();
    expect(alle.A_schluessel).toEqual({ x: 1 });
    expect(alle.B_schluessel).toEqual([1, 2]);
  });
});

describe('Export: extras und spielScans', () => {
  it('enthält jeden Schlüssel (auch unbekannte) – außer den Feldern mit eigener Stelle und dem Ordner-Zugriff', async () => {
    const { ctx } = boot();
    await ctx.idbSet('BC_PROFILE_TAGS_v1', { 'Mia - A': ['sommer'] });
    await ctx.idbSet('BC_LSCG_FAVS_v1', ['5']);
    await ctx.idbSet('IRGENDWAS_NEUES_v1', { frisch: true });
    await ctx.idbSet('BC_AUTOBACKUP_v2', { ordner: 'nicht speicherbar' });
    await ctx.idbSet('BC_LSCG_OUTFITS_v3', { '1': { versions: [] } });
    ctx.localStorage.setItem('BC_StartFilter_v1', '{"curse":{}}');
    ctx.localStorage.setItem('BC_PROFILES_v11', '{"x":1}');
    const e = await ctx._backupExtras();
    expect(Object.keys(e.idb).sort()).toEqual(['BC_LSCG_FAVS_v1', 'BC_PROFILE_TAGS_v1', 'IRGENDWAS_NEUES_v1']);
    expect(e.idb.BC_PROFILE_TAGS_v1).toEqual({ 'Mia - A': ['sommer'] });
    expect(Object.keys(e.ls)).toEqual(['BC_StartFilter_v1']);
  });

  it('die Alt-Kopien der Bilder (eingefroren) stecken nicht doppelt drin', async () => {
    const { ctx } = boot();
    for (const k of ['BC_PROFILE_SCREENSHOTS_v1', 'BC_LSCG_SCREENSHOTS_v1', 'BC_MBS_WHEEL_SS_v1']) await ctx.idbSet(k, { a: 'bild' });
    expect(Object.keys((await ctx._backupExtras()).idb)).toEqual([]);
  });

  it('Spiel-Scans: alle Datensätze nach id', async () => {
    const { ctx } = boot();
    await ctx.idbSnapshotPut({ id: 1000, ts: 1000, inventory: { a: 1 } });
    await ctx.idbSnapshotPut({ id: 2000, ts: 2000, inventory: { b: 2 } });
    const s = await ctx._backupScans();
    expect(Object.keys(s).sort()).toEqual(['1000', '2000']);
    expect(s['2000'].inventory).toEqual({ b: 2 });
  });

  it('exportAllData schreibt beides in die Datei (Version 4) – zusammen mit den benannten Feldern', async () => {
    const t = boot();
    await t.ctx.idbSet('BC_PROFILE_TAGS_v1', { 'Mia - A': ['sommer'] });
    await t.ctx.idbSnapshotPut({ id: 1000, ts: 1000 });
    t.ctx.localStorage.setItem('BC_StartFilter_v1', '{"a":1}');
    evalIn(t.ctx, "PROFILES['Mia - A'] = { name: 'Mia - A', items: [], date: '1.1.2026' };");
    await t.ctx.exportAllData();
    const d = t.json();
    expect(d._meta.version).toBe(4);
    expect(d.profiles['Mia - A']).toBeTruthy();
    expect(d.extras.idb.BC_PROFILE_TAGS_v1).toEqual({ 'Mia - A': ['sommer'] });
    expect(d.extras.ls.BC_StartFilter_v1).toBe('{"a":1}');
    expect(Object.keys(d.spielScans)).toEqual(['1000']);
    expect(d._meta.counts.spielScans).toBe(1);
  });
});

describe('Ergänzen statt ersetzen', () => {
  it('Listen: Vereinigung; Objekte: fehlende Einträge (rekursiv); Einzelwerte: Vorhandenes bleibt', () => {
    const { ctx } = boot();
    const e = (a, n) => { ctx.__a = a; ctx.__n = n; return evalIn(ctx, '_ergaenzen(__a, __n)'); };
    expect(e([1, 2], [2, 3])).toEqual({ wert: [1, 2, 3], geaendert: true });
    expect(e([1, 2], [2])).toEqual({ wert: [1, 2], geaendert: false });
    expect(e({ a: [1], b: { x: 1 } }, { a: [2], b: { y: 2 }, c: 3 }).wert).toEqual({ a: [1, 2], b: { x: 1, y: 2 }, c: 3 });
    expect(e({ a: 'alt' }, { a: 'neu' })).toEqual({ wert: { a: 'alt' }, geaendert: false });
    expect(e('alt', 'neu')).toEqual({ wert: 'alt', geaendert: false });
    expect(e(undefined, { x: 1 })).toEqual({ wert: { x: 1 }, geaendert: true });
    expect(e(null, 5)).toEqual({ wert: 5, geaendert: true });
  });

  it('Objekt-Listen werden über ihren Inhalt entdoppelt', () => {
    const { ctx } = boot();
    ctx.__a = [{ id: 1 }]; ctx.__n = [{ id: 1 }, { id: 2 }];
    expect(evalIn(ctx, '_ergaenzen(__a, __n).wert')).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('ein Schlüssel "__proto__" aus einer Datei verbiegt nichts', () => {
    const { ctx } = boot();
    ctx.__n = JSON.parse('{"__proto__":{"boese":true},"ok":1}');
    ctx.__a = {};
    const r = evalIn(ctx, '_ergaenzen(__a, __n)');
    expect(r.wert.ok).toBe(1);
    expect(({}).boese).toBeUndefined();
    expect(Object.getPrototypeOf(r.wert).boese).toBeUndefined();
  });

  it('Datenbank-Schlüssel: neue werden angelegt, vorhandene ergänzt, Einzelwerte bleiben, Sitzungs-Schlüssel werden übersprungen', async () => {
    const { ctx } = boot();
    await ctx.idbSet('LISTE', ['a']);
    await ctx.idbSet('WERT', 'meiner');
    const n = await ctx._backupExtrasImport({ idb: { LISTE: ['a', 'b'], WERT: 'fremder', NEU: { x: 1 }, BC_LAST_MEMBER_v1: '999', BC_LSCG_OUTFITS_v3: { boese: 1 } }, ls: {} });
    expect(await ctx.idbGet('LISTE')).toEqual(['a', 'b']);
    expect(await ctx.idbGet('WERT')).toBe('meiner');
    expect(await ctx.idbGet('NEU')).toEqual({ x: 1 });
    expect(await ctx.idbGet('BC_LAST_MEMBER_v1')).toBeNull();
    expect(await ctx.idbGet('BC_LSCG_OUTFITS_v3')).toBeNull();    // hat ein eigenes Feld, nicht über extras
    expect(n).toBe(2);                                              // LISTE ergänzt + NEU
  });

  it('localStorage: fehlendes wird gesetzt, JSON ergänzt, Text/Einzelwerte bleiben', async () => {
    const { ctx } = boot();
    ctx.localStorage.setItem('LS_JSON', JSON.stringify({ a: 1 }));
    ctx.localStorage.setItem('LS_TEXT', 'meiner');
    ctx.localStorage.setItem('LS_LISTE', JSON.stringify(['x']));
    const n = await ctx._backupExtrasImport({ idb: {}, ls: {
      LS_JSON: JSON.stringify({ a: 2, b: 3 }), LS_TEXT: 'fremder', LS_LISTE: JSON.stringify(['x', 'y']),
      LS_NEU: 'frisch', BC_LAST_MEMBER_v1: '999', BC_PROFILES_v11: '{"boese":1}',
    } });
    expect(JSON.parse(ctx.localStorage.getItem('LS_JSON'))).toEqual({ a: 1, b: 3 });
    expect(ctx.localStorage.getItem('LS_TEXT')).toBe('meiner');
    expect(JSON.parse(ctx.localStorage.getItem('LS_LISTE'))).toEqual(['x', 'y']);
    expect(ctx.localStorage.getItem('LS_NEU')).toBe('frisch');
    expect(ctx.localStorage.getItem('BC_LAST_MEMBER_v1')).toBeNull();
    expect(ctx.localStorage.getItem('BC_PROFILES_v11')).toBeNull();
    expect(n).toBe(3);                                              // LS_JSON, LS_LISTE, LS_NEU
  });

  it('Spiel-Scans: nur fehlende ids werden angelegt, ein vorhandener Scan bleibt unverändert', async () => {
    const { ctx } = boot();
    await ctx.idbSnapshotPut({ id: 1000, marke: 'lokal' });
    const n = await ctx._backupScansImport({ 1000: { id: 1000, marke: 'datei' }, 2000: { id: 2000, marke: 'neu' } });
    expect(n).toBe(1);
    expect((await ctx.idbSnapshotGet(1000)).marke).toBe('lokal');
    expect((await ctx.idbSnapshotGet(2000)).marke).toBe('neu');
  });

  it('nichts zu tun: 0 und keine Fehlermeldung', async () => {
    const { ctx } = boot();
    expect(await ctx._backupExtrasImport(undefined)).toBe(0);
    expect(await ctx._backupScansImport(undefined)).toBe(0);
  });
});

describe('Backup-Dateien zusammenführen', () => {
  it('extras: Vereinigung aller Dateien, bei gleichem Schlüssel gewinnt die neuere; spielScans: Vereinigung', () => {
    const { ctx } = boot();
    ctx.__a = { _meta: { exportedAt: '2026-01-01' }, extras: { idb: { A: 1, B: 1 }, ls: { X: 'alt' } }, spielScans: { 1: { id: 1 } } };
    ctx.__b = { _meta: { exportedAt: '2026-02-01' }, extras: { idb: { B: 2, C: 3 }, ls: { X: 'neu' } }, spielScans: { 2: { id: 2 } } };
    const r = evalIn(ctx, '_backupZuExport([__b, __a])');
    expect(r.extras.idb).toEqual({ A: 1, B: 2, C: 3 });
    expect(r.extras.ls).toEqual({ X: 'neu' });
    expect(Object.keys(r.spielScans)).toEqual(['1', '2']);
  });
});

describe('Rundreise: Gesamt-Backup erstellen → auf einem leeren Rechner einspielen', () => {
  async function einspielen(ziel, json) {
    const eingabe = {};
    const echt = ziel.ctx.document.createElement;
    ziel.ctx.document.createElement = (tag) => (tag === 'input' ? Object.assign(makeElementStub(), { click() { eingabe.i = this; } }) : echt(tag));
    ziel.ctx.importAllData();
    await eingabe.i.onchange({ target: { files: [{ name: 'BC_Backup_test.json', size: json.length, lastModified: 1, text: async () => json }] } });
  }

  it('alles kommt an – auch Einstellungen, Tags, Favoriten, Spiel-Scans', async () => {
    const quelle = boot();
    await quelle.ctx.idbSet('BC_PROFILE_TAGS_v1', { 'Mia - A': ['sommer'] });
    await quelle.ctx.idbSet('BC_LSCG_FAVS_v1', ['5', '7']);
    await quelle.ctx.idbSet('BC_PROFILE_ALT_OWNERS_v1', ['Ada']);
    quelle.ctx.localStorage.setItem('BC_StartFilter_v1', '{"curse":{"filter":["neu"]}}');
    quelle.ctx.localStorage.setItem('BC_LAST_MEMBER_v1', '12345');
    await quelle.ctx.idbSnapshotPut({ id: 1000, ts: 1000, inventory: { a: 1 } });
    evalIn(quelle.ctx, "PROFILES['Mia - A'] = { name: 'Mia - A', items: [], date: '1.1.2026' };");
    await quelle.ctx.exportAllData();
    const json = quelle.teile.join('');

    const ziel = boot();
    await einspielen(ziel, json);

    expect(lies(ziel.ctx, "Object.keys(PROFILES)")).toContain('Mia - A');
    expect(await ziel.ctx.idbGet('BC_PROFILE_TAGS_v1')).toEqual({ 'Mia - A': ['sommer'] });
    expect(await ziel.ctx.idbGet('BC_LSCG_FAVS_v1')).toEqual(['5', '7']);
    expect(await ziel.ctx.idbGet('BC_PROFILE_ALT_OWNERS_v1')).toEqual(['Ada']);
    expect(ziel.ctx.localStorage.getItem('BC_StartFilter_v1')).toBe('{"curse":{"filter":["neu"]}}');
    expect(ziel.ctx.localStorage.getItem('BC_LAST_MEMBER_v1')).toBeNull();      // Sitzungswert bleibt draußen
    expect((await ziel.ctx.idbSnapshotGet(1000)).inventory).toEqual({ a: 1 });
    expect(ziel.meldungen.at(-1)).toMatch(/Spiel-Scans/);
    expect(ziel.fragen.some((f) => /Spiel-Scans: 1/.test(f) && /Weitere Einstellungen und Daten/.test(f))).toBe(true);
    expect(ziel.fragen.some((f) => /neu geladen werden/.test(f))).toBe(true);    // Hinweis aufs Neuladen
  });

  it('zweites Einspielen derselben Datei ändert nichts (nur ergänzen) und fragt nicht nach dem Neuladen', async () => {
    const quelle = boot();
    await quelle.ctx.idbSet('BC_LSCG_FAVS_v1', ['5']);
    evalIn(quelle.ctx, "PROFILES['Mia - A'] = { name: 'Mia - A', items: [], date: '1.1.2026' };");
    await quelle.ctx.exportAllData();
    const json = quelle.teile.join('');
    const ziel = boot();
    await einspielen(ziel, json);
    ziel.fragen.length = 0;
    await einspielen(ziel, json);
    expect(await ziel.ctx.idbGet('BC_LSCG_FAVS_v1')).toEqual(['5']);
    expect(ziel.fragen.some((f) => /neu geladen werden/.test(f))).toBe(false);
  });

  it('ältere Backups (ohne extras/spielScans) lassen sich weiter einspielen', async () => {
    const ziel = boot();
    const alt = JSON.stringify({ _meta: { exportedAt: '2025-01-01T00:00:00.000Z', version: 3 }, profiles: { 'Alt - X': { name: 'Alt - X', items: [], date: '1.1.2025' } } });
    await einspielen(ziel, alt);
    expect(lies(ziel.ctx, "Object.keys(PROFILES)")).toContain('Alt - X');
    expect(ziel.meldungen.at(-1)).toMatch(/Backup eingespielt/);
  });
});
