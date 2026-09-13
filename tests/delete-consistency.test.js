import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadScript, evalIn, settle } from './helpers/loadScript.js';

// STAB-10: Bestätigtes Löschen eines LSCG-Bildes darf keine byte-identische
// Kopie in PROFILE_SCREENSHOTS verwaisen lassen — weder im RAM noch nach
// bcSpeichernJetzt() in IDB. Manuell hochgeladene Profil-Bilder (nicht
// identisch zum gelöschten LSCG-Bild) bleiben immer erhalten.

let confirmResult = true;

let ctx;

beforeAll(() => {
  ctx = loadScript(['items.js'], {
    confirm: () => confirmResult,
  });
  ctx.showStatus = () => {};
});

// Setzt das gemeinsame Fixture in EINEM evalIn-Aufruf (alle Ziele sind
// Top-Level-`let`, daher nur per evalIn erreichbar).
function setState(ctx) {
  const db = {
    '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'FP1', ts: 1 }, { code: 'c2', fingerprint: 'FP2', ts: 2 }] },
    '456': { name: 'Bob', versions: [{ code: 'c4', fingerprint: 'FP4', ts: 4 }] },
  };
  const shots = { '123|FP1': 'data:img1', '123|FP2': 'data:img2', '456': 'data:legacy' };
  const fpMap = { FP1: ['Anna_v1'], FP2: ['Anna_v2', 'Anna_v2b', 'Anna_v2c'], FP4: ['Bob_v1'] };
  const profShots = { Anna_v1: 'data:img1', Anna_v2: 'data:img2', Anna_v2b: 'data:manual', Anna_v2c: 'data:img1', Bob_v1: 'data:legacy', Fremd: 'data:other' };
  const wheelData = [{ memberNumber: 5, name: 'Bob', outfits: [{ name: 'Outfit A', items: [{ group: 'G', asset: 'A' }] }] }];
  const wheelShots = { 'G:A': 'data:wheel', W2: 'data:wheel2' };

  evalIn(ctx, `
    LSCG_DB = ${JSON.stringify(db)};
    LSCG_SCREENSHOTS = ${JSON.stringify(shots)};
    _lscgFpMap = ${JSON.stringify(fpMap)};
    PROFILE_SCREENSHOTS = ${JSON.stringify(profShots)};
    _mbsWheelData = ${JSON.stringify(wheelData)};
    _mbsWheelShots = ${JSON.stringify(wheelShots)};
    _osLightboxWheelFp = 'W2';
    _osLightboxKey = null;
    _osLightboxMk = null;
  `);
}

function profShots(ctx) {
  return evalIn(ctx, 'JSON.parse(JSON.stringify(PROFILE_SCREENSHOTS))');
}

describe('Bestätigtes Löschen hinterlässt keine verwaisten Kopien (STAB-10)', () => {
  beforeEach(() => {
    confirmResult = true;
    setState(ctx);
  });

  it('deleteLscgVersion entfernt das Versionsbild und alle identischen Profil-Kopien des Members (inkl. Cross-Version-Kopie Anna_v2c)', () => {
    ctx.deleteLscgVersion('123', 0);
    expect(evalIn(ctx, "LSCG_SCREENSHOTS['123|FP1']")).toBeUndefined();
    expect(profShots(ctx)).toEqual({ Anna_v2: 'data:img2', Anna_v2b: 'data:manual', Bob_v1: 'data:legacy', Fremd: 'data:other' });
    expect(evalIn(ctx, "LSCG_DB['123'].versions.length")).toBe(1);
  });

  it('deleteOsScreenshotKey entfernt nur identische Kopien — manuelle Profil-Bilder bleiben', () => {
    ctx.deleteOsScreenshotKey('123|FP2');
    expect(profShots(ctx)).toEqual({ Anna_v1: 'data:img1', Anna_v2b: 'data:manual', Anna_v2c: 'data:img1', Bob_v1: 'data:legacy', Fremd: 'data:other' });
  });

  it('deleteOsScreenshot (Legacy-Schlüssel mk) räumt die Profil-Kopie über die Versions-Fingerprints', () => {
    ctx.deleteOsScreenshot('456');
    const result = profShots(ctx);
    expect(result.Bob_v1).toBeUndefined();
    expect(result.Anna_v1).toBe('data:img1');
    expect(result.Anna_v2).toBe('data:img2');
    expect(result.Anna_v2b).toBe('data:manual');
    expect(result.Anna_v2c).toBe('data:img1');
    expect(result.Fremd).toBe('data:other');
  });

  it('clearAllLscgScreenshots leert LSCG_SCREENSHOTS und alle identischen Profil-Kopien, LSCG_DB bleibt', () => {
    ctx.clearAllLscgScreenshots();
    expect(profShots(ctx)).toEqual({ Anna_v2b: 'data:manual', Fremd: 'data:other' });
    expect(evalIn(ctx, 'Object.keys(LSCG_DB).length')).toBe(2);
  });

  it('clearAllLscgOutfits leert LSCG_DB, LSCG_SCREENSHOTS, _lscgFpMap und alle identischen Profil-Kopien', () => {
    ctx.clearAllLscgOutfits();
    expect(profShots(ctx)).toEqual({ Anna_v2b: 'data:manual', Fremd: 'data:other' });
    expect(evalIn(ctx, 'Object.keys(LSCG_DB).length')).toBe(0);
    expect(evalIn(ctx, 'Object.keys(_lscgFpMap).length')).toBe(0);
  });

  it('Helfer-Vertrag: _removeLscgScreenshotFromProfiles(fp, img) entfernt nur identische Slots und liefert die Anzahl', () => {
    expect(ctx._removeLscgScreenshotFromProfiles('FP2', 'data:img1')).toBe(1); // nur Anna_v2c
    expect(ctx._removeLscgScreenshotFromProfiles(null, 'x')).toBe(0);

    // Frisches Fixture innerhalb desselben it — testet den Schlüssel-basierten Helfer separat.
    setState(ctx);
    expect(ctx._removeLscgScreenshotKeyFromProfiles('123|FP1')).toBe(2); // Anna_v1 (FP1) + Anna_v2c (FP2, selber Member)
    expect(ctx._removeLscgScreenshotKeyFromProfiles('gibt-es-nicht')).toBe(0);
  });

  it('nach bcSpeichernJetzt() sind die Kopien auch in IDB weg', async () => {
    ctx.deleteLscgVersion('123', 0);
    ctx.bcSpeichernJetzt();
    await settle(100);
    const p = await ctx.idbGet('BC_PROFILE_SCREENSHOTS_v1');
    expect(p?.Anna_v1).toBeUndefined();
    expect(p?.Anna_v2c).toBeUndefined();
    expect(p?.Anna_v2b).toBe('data:manual');
    const s = await ctx.idbGet('BC_LSCG_SCREENSHOTS_v1');
    expect(s?.['123|FP1']).toBeUndefined();
    expect(s?.['123|FP2']).toBe('data:img2');
  });
});
