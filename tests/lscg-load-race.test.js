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
