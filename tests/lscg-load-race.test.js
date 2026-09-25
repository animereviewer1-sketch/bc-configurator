// LSCG-Datenverlust beim Start (Regression)
//
// Ablauf des Verlusts: Tool startet → Lade-IIFE wartet erst auf Screenshots/
// Slots → währenddessen liefert der Auto-Scan beim Verbinden Outfits →
// _handleOutfitScanData → _saveLscgDB() schreibt den fast leeren RAM-Stand
// unter BC_LSCG_OUTFITS_v3 → die IIFE liest danach genau diesen Stand.
// Ergebnis: alle gespeicherten LSCG-Outfits weg.
//
// Zweiter Teil: der Restore verstand die Dateien des automatischen Backups
// (BC_Voll_/BC_Inkr_) nicht und meldete trotzdem Erfolg.

import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, settle } from './helpers/loadScript.js';

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const KEY = 'BC_LSCG_OUTFITS_v3';

describe('LSCG-Lade-Sperre: Speichern vor dem Laden überschreibt den Bestand nicht', () => {
  it('Scan-Speicherung direkt beim Start → gespeicherter Bestand bleibt, neuer Scan kommt dazu', async () => {
    // 1. Erster Start: Bestand anlegen
    const a = loadScript(['items.js'], { console: quiet });
    a.showStatus = () => {};
    await settle(200);
    await a.idbSet(KEY, {
      '555': { name: 'Alt', versions: [
        { code: 'c1', fingerprint: 'F1', ts: 1 },
        { code: 'c2', fingerprint: 'F2', ts: 2 },
      ] },
    });

    // 2. Neustart: noch BEVOR die Lade-IIFE fertig ist, kommt ein Scan herein
    const b = loadScript(['items.js'], { console: quiet });
    b.showStatus = () => {};
    evalIn(b, `
      LSCG_DB['777'] = { name: 'Neu', versions: [{ code: 'n1', fingerprint: 'FN', ts: 3 }] };
      _saveLscgDB();
    `);
    await settle(300);

    const gespeichert = await b.idbGet(KEY);
    expect(Object.keys(gespeichert).sort()).toEqual(['555', '777']);
    expect(gespeichert['555'].versions).toHaveLength(2);
    expect(gespeichert['777'].versions).toHaveLength(1);
    // Arbeitsspeicher enthält ebenfalls beides
    expect(evalIn(b, 'Object.keys(LSCG_DB).sort().join(",")')).toBe('555,777');
  });
});

describe('_backupZuExport: automatische Backups werden verstanden', () => {
  let ctx;
  const voll = () => ({
    _meta: { art: 'voll', exportedAt: '2026-09-01T10:00:00.000Z', generation: 'G1' },
    daten: {
      profiles: { P1: { code: 'p' } },
      lscgDB: {
        '555': { name: 'Alt', versions: [{ code: 'c1', fingerprint: 'F1', ts: 1 }, { code: 'c2', fingerprint: 'F2', ts: 2 }] },
        '600': { name: 'Andere', versions: [{ code: 'x', fingerprint: 'FX', ts: 1 }] },
      },
      mbsWheel: [{ memberNumber: 1, outfits: [{ name: 'A', code: 'a' }] }],
      profileFavs: ['P1'],
    },
  });
  const inkrNachVerlust = () => ({
    _meta: { art: 'inkrement', exportedAt: '2026-09-02T10:00:00.000Z', generation: 'G1', nummer: 1 },
    // nach dem Verlust neu gescannt: nur eine Version für 555
    geaendert: { lscgDB: { '555': { name: 'Alt', versions: [{ code: 'c3', fingerprint: 'F3', ts: 5 }] } } },
    // …und der Verlust selbst als "gelöscht" protokolliert
    geloescht: { lscgDB: ['600'] },
    komplett: { profileFavs: ['P2'] },
  });

  it('Voll + Inkrement: alle Versionen bleiben, Löschungen werden ignoriert', () => {
    ctx = loadScript(['items.js'], { console: quiet });
    ctx.showStatus = () => {};
    // absichtlich in falscher Reihenfolge übergeben – sortiert wird nach exportedAt
    const d = ctx._backupZuExport([inkrNachVerlust(), voll()]);
    expect(Object.keys(d.lscgDB).sort()).toEqual(['555', '600']);
    expect(d.lscgDB['555'].versions.map((v) => v.fingerprint).sort()).toEqual(['F1', 'F2', 'F3']);
    expect(d.profiles.P1).toBeDefined();
    expect([...d.profileFavs].sort()).toEqual(['P1', 'P2']);
    expect(d.mbsWheel).toHaveLength(1);
    expect(d._meta.dateien).toBe(2);
  });

  it('nur Voll-Datei: Inhalt unter "daten" wird ausgepackt', () => {
    const d = ctx._backupZuExport([voll()]);
    expect(Object.keys(d.lscgDB)).toHaveLength(2);
    expect(d.daten).toBeUndefined();
  });

  it('flacher manueller Export bleibt unverändert lesbar', () => {
    const flach = { _meta: { exportedAt: '2026-09-03T00:00:00.000Z', version: 3 }, lscgDB: { '9': { name: 'X', versions: [] } }, profiles: {} };
    const d = ctx._backupZuExport([flach]);
    expect(Object.keys(d.lscgDB)).toEqual(['9']);
  });

  it('ohne _meta → null (ungültig)', () => {
    expect(ctx._backupZuExport([{ foo: 1 }])).toBeNull();
  });
});

describe('_backupDateiParsen: verschachtelte Auto-Backups stückweise lesen', () => {
  it('liefert exakt JSON.parse – auch unter "daten", über Chunk-Grenzen, mit Escapes/Unicode/Arrays', async () => {
    const ctx = loadScript(['items.js'], {
      console: quiet, Blob, File, TextDecoderStream,
    });
    ctx.showStatus = () => {};
    const bild = 'data:image/png;base64,' + 'A'.repeat(200 * 1024);   // > Stream-Chunk (64 KB)
    const quelle = {
      _meta: { art: 'voll', exportedAt: '2026-09-01T10:00:00.000Z', version: 3 },
      daten: {
        lscgScreenshots: { '555|F1': bild, '555|F2': bild.slice(0, 1000) + 'Ende' },
        lscgDB: { '555': { name: 'Ä "Zitat" \\ Back\nZeile 😀', versions: [{ code: 'c1', fingerprint: 'F1\u001f\u001e', ts: 1 }, { code: null, ts: -2.5e3 }] } },
        leer: {}, leerArr: [], zahlen: [1, 2.5, -3, true, false, null],
        verschachtelt: [[{ a: [{}] }]],
      },
    };
    // "__proto__" darf kein Prototyp werden, sondern muss ein normales Feld bleiben
    const text = JSON.stringify(quelle).replace('"leer":{}', '"leer":{"__proto__":{"x":1}}');
    const erwartet = JSON.parse(text);
    const file = new File([text], 'BC_Voll_test.json', { type: 'application/json' });
    const d = await ctx._backupDateiParsen(file, null);
    expect(JSON.stringify(d)).toBe(JSON.stringify(erwartet));
    expect(Object.prototype.hasOwnProperty.call(d.daten.leer, '__proto__')).toBe(true);
    expect(d.daten.leer.x).toBeUndefined();
    expect(d.daten.lscgScreenshots['555|F1'].length).toBe(bild.length);
  });
});

describe('Große Backups: Bilder werden beim Lesen abgezweigt, nie überschrieben', () => {
  it('Parser reicht Bild-Einträge an bilder.add durch und behält sie nicht im Ergebnis', async () => {
    const ctx = loadScript(['items.js'], { console: quiet, Blob, File, TextDecoderStream });
    ctx.showStatus = () => {};
    const bild = 'data:image/jpeg;base64,' + 'B'.repeat(150 * 1024);
    // Escapes direkt an Chunk-Grenzen: viele kurze Strings mit \" und \\ rund um 64-KB-Grenzen
    const lang = 'x'.repeat(65530) + '\\"\\\\"' + 'y'.repeat(10);
    const quelle = {
      _meta: { art: 'voll', exportedAt: '2026-09-01T10:00:00.000Z', version: 3 },
      daten: {
        lscgScreenshots: { '1|F1': bild, '1|F2': bild + 'x' },
        profileScreenshots: { 'Profil A': bild },
        lscgDB: { '1': { name: lang, versions: [{ code: 'c', fingerprint: 'F1', ts: 1 }] } },
      },
    };
    const text = JSON.stringify(quelle);
    const angekommen = [];
    const bilder = { add: async (s, k, v) => { angekommen.push([s, k, v.length]); } };
    const d = await ctx._backupDateiParsen(new File([text], 'BC_Voll_x.json'), null, bilder);
    expect(angekommen).toEqual([
      ['lscgScreenshots', '1|F1', bild.length], ['lscgScreenshots', '1|F2', bild.length + 1],
      ['profileScreenshots', 'Profil A', bild.length],
    ]);
    expect(d.daten.lscgScreenshots).toBeUndefined();
    expect(d.daten.profileScreenshots).toBeUndefined();
    expect(d.daten.lscgDB['1'].name).toBe(quelle.daten.lscgDB['1'].name);
  });

  it('_bildEinspieler ergänzt nur fehlende Bilder und schreibt sie in die IDB', async () => {
    const ctx = loadScript(['items.js'], { console: quiet });
    ctx.showStatus = () => {};
    await settle(300);
    evalIn(ctx, `LSCG_SCREENSHOTS['vorhanden'] = 'ALT';`);
    const e = ctx._bildEinspieler();
    await e.add('lscgScreenshots', 'vorhanden', 'NEU');
    await e.add('lscgScreenshots', 'fehlt', 'BILD');
    await e.add('mbsWheelShots', 'w1', 'WHEEL');
    await e.flush();
    expect(evalIn(ctx, `LSCG_SCREENSHOTS['vorhanden']`)).toBe('ALT');
    expect(evalIn(ctx, `LSCG_SCREENSHOTS['fehlt']`)).toBe('BILD');
    expect(e.neu).toEqual({ lscg: 1, profile: 0, wheel: 1 });
    const gespeichert = await ctx.idbScreenshotGetAll('lscg');
    expect(gespeichert.fehlt).toBe('BILD');
  });

  it('_backupSammler: Dateien einzeln nacheinander, Ergebnis wie bei Gesamtauswahl', () => {
    const ctx = loadScript(['items.js'], { console: quiet });
    const s = ctx._backupSammler();
    expect(s.ergebnis()).toBeNull();
    expect(s.add({ foo: 1 })).toBe(false);
    s.add({ _meta: { art: 'voll', exportedAt: '2026-09-01' }, daten: { lscgDB: { '1': { name: 'A', versions: [{ code: 'a', fingerprint: 'FA', ts: 1 }] } } } });
    s.add({ _meta: { art: 'inkrement', exportedAt: '2026-09-02' }, geaendert: { lscgDB: { '1': { name: 'A', versions: [{ code: 'b', fingerprint: 'FB', ts: 2 }] } } }, geloescht: { lscgDB: ['1'] }, komplett: {} });
    const d = s.ergebnis();
    expect(d.lscgDB['1'].versions.map((v) => v.fingerprint)).toEqual(['FA', 'FB']);
    expect(d._meta.dateien).toBe(2);
    expect(d._meta.exportedAt).toBe('2026-09-02');
  });
});
