import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, settle, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Der Item-Katalog des Spiels (mehrere MB) lag im localStorage (~5 MB Limit) – war der voll, scheiterte das Speichern still
// ("Kein Cache" beim nächsten Start). Jetzt liegt er in der Datenbank; ein alter localStorage-Stand wird einmalig übernommen.
// Außerdem fragt das Tool beim Browser nach dauerhaftem Speicher.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const KEY = 'BC_CACHE_v12';
const KATALOG = { Cloth: { Dress: { colorCount: 1, typeKeys: {} }, Skirt: { colorCount: 1, typeKeys: {} } } };

function speicher(start = {}, { voll = false } = {}) {
  const m = new Map(Object.entries(start));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (voll) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => m.delete(k), clear: () => m.clear(),
  };
}

function rechner({ idb = new IDBFactory(), ls = speicher(), confirm = () => true } = {}) {
  const persist = vi.fn(async () => true);
  const opener = { closed: false, postMessage: vi.fn() };
  const ctx = loadScript(['items.js'], {
    console: quiet, indexedDB: idb, localStorage: ls, setTimeout, clearTimeout, opener, confirm,
    navigator: { storage: { persist, persisted: async () => true, estimate: async () => ({ usage: 1048576, quota: 10485760 }) }, userAgent: 'Test', hardwareConcurrency: 4 },
  });
  const els = {};
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  return { ctx, idb, ls, persist, opener, els };
}
const cacheDaten = (t, cache = KATALOG) => {
  dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: t.opener });
  dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'CACHE_DATA', cache }, { origin: 'https://bc.test', source: t.opener });
};

describe('Item-Katalog liegt in der Datenbank', () => {
  it('aus dem Spiel geladen: in der Datenbank gespeichert; mit vollem localStorage geht nichts verloren, und nach dem Neustart ist er da', async () => {
    const a = rechner({ ls: speicher({}, { voll: true }) });
    await settle(60);
    cacheDaten(a);
    await settle(80);
    expect(await a.ctx.idbGet(KEY)).toEqual(KATALOG);
    const b = rechner({ idb: a.idb });    // Neustart mit leerem localStorage
    await settle(100);
    expect(evalIn(b.ctx, 'CACHE')).toEqual(KATALOG);
  });

  it('die alte Kopie im localStorage wird erst nach erfolgreichem Schreiben in die Datenbank entfernt', async () => {
    const a = rechner({ ls: speicher({ [KEY]: JSON.stringify({ Alt: { X: {} } }) }) });
    await settle(60);
    cacheDaten(a);
    await settle(80);
    expect(a.ls.m.has(KEY)).toBe(false);
    expect(await a.ctx.idbGet(KEY)).toEqual(KATALOG);
  });

  it('Bestandsnutzer: der Katalog aus dem localStorage wird sofort verwendet und einmalig in die Datenbank übernommen', async () => {
    const a = rechner({ ls: speicher({ [KEY]: JSON.stringify(KATALOG) }) });
    expect(evalIn(a.ctx, 'CACHE')).toEqual(KATALOG);   // sofort, ohne auf die Datenbank zu warten
    await settle(100);
    expect(await a.ctx.idbGet(KEY)).toEqual(KATALOG);
    expect(a.ls.m.has(KEY)).toBe(false);                // erst nach erfolgreichem Schreiben entfernt
  });

  it('steht er in der Datenbank, gilt dieser Stand – ein älterer localStorage-Stand überschreibt ihn nicht', async () => {
    const a = rechner();
    await settle(60);
    await a.ctx.idbSet(KEY, KATALOG);
    const b = rechner({ idb: a.idb, ls: speicher({ [KEY]: JSON.stringify({ Veraltet: { X: {} } }) }) });
    await settle(100);
    expect(evalIn(b.ctx, 'CACHE')).toEqual(KATALOG);
    expect(b.ls.m.has(KEY)).toBe(true);   // die alte Kopie bleibt – entfernt wird sie nur per bestätigter Aktion
  });

  it('frisch aus dem Spiel geladene Daten werden nicht von einem verspäteten Datenbank-Stand überschrieben', async () => {
    const a = rechner();
    await settle(60);
    await a.ctx.idbSet(KEY, { Alt: { X: { colorCount: 1 } } });
    const b = rechner({ idb: a.idb });
    cacheDaten(b);                         // Spiel-Daten kommen, bevor die Datenbank gelesen ist
    await settle(120);
    expect(evalIn(b.ctx, 'CACHE')).toEqual(KATALOG);
  });

  it('„Cache löschen“ (mit Rückfrage) leert beide Orte', async () => {
    const a = rechner({ ls: speicher({ [KEY]: JSON.stringify(KATALOG) }) });
    await settle(100);
    a.ctx.clearCache();
    await settle(60);
    expect(evalIn(a.ctx, 'CACHE')).toEqual({});
    expect(a.ls.m.has(KEY)).toBe(false);
    expect(Object.keys((await a.ctx.idbGet(KEY)) || {})).toHaveLength(0);
  });
});

describe('Katalog-Kopie im localStorage entfernen (bestätigt)', () => {
  it('ohne Kopie: nur ein Hinweis', async () => {
    const a = rechner();
    await settle(60);
    await a.ctx.lsKatalogKopieEntfernen();
    expect(a.ctx.showStatus.mock.calls.some(c => String(c[0]).includes('Keine Katalog-Kopie'))).toBe(true);
  });

  it('mit Kopie: Rückfrage, dann weg – der Katalog liegt in der Datenbank', async () => {
    const frage = vi.fn(() => true);
    const a = rechner({ ls: speicher({ [KEY]: JSON.stringify(KATALOG) }), confirm: frage });
    await settle(100);
    // Kopie wieder hinlegen (der Start hatte sie schon übernommen)
    a.ls.m.set(KEY, JSON.stringify(KATALOG));
    await a.ctx.lsKatalogKopieEntfernen();
    expect(frage).toHaveBeenCalledTimes(1);
    expect(a.ls.m.has(KEY)).toBe(false);
    expect(await a.ctx.idbGet(KEY)).toEqual(KATALOG);
  });

  it('steht der Katalog noch nicht in der Datenbank, wird er vor dem Entfernen übernommen', async () => {
    const a = rechner();
    await settle(60);
    a.ls.m.set(KEY, JSON.stringify(KATALOG));
    await a.ctx.lsKatalogKopieEntfernen();
    expect(await a.ctx.idbGet(KEY)).toEqual(KATALOG);
    expect(a.ls.m.has(KEY)).toBe(false);
  });

  it('„Abbrechen“ lässt alles, wie es ist', async () => {
    const a = rechner({ confirm: () => false });
    await settle(60);
    a.ls.m.set(KEY, JSON.stringify(KATALOG));
    await a.ctx.lsKatalogKopieEntfernen();
    expect(a.ls.m.has(KEY)).toBe(true);
  });
});

describe('Dauerhafter Speicher', () => {
  it('das Tool fragt beim Start danach, damit der Browser die Daten bei knappem Plattenplatz nicht selbst aufräumt', async () => {
    const a = rechner();
    await settle(60);
    expect(a.persist).toHaveBeenCalled();
  });

  it('die Export-Info nennt, ob der Speicher dauerhaft ist', async () => {
    const a = rechner();
    await settle(60);
    const text = await a.ctx.exportInfoSammeln();
    expect(text).toContain('Dauerhafter Speicher');
    expect(text).toMatch(/Dauerhafter Speicher[^\n]*: ja/);
  });
});
