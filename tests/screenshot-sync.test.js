import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadScript, evalIn, settle, REPO_ROOT } from './helpers/loadScript.js';
import fs from 'node:fs';
import path from 'node:path';

describe('_syncLscgScreenshotToProfiles liest denselben Schlüssel wie die Aufnahme (STAB-01)', () => {
  let ctx;

  beforeAll(() => {
    ctx = loadScript(['items.js']);
    ctx.showStatus = () => {};
    expect(typeof ctx._syncLscgScreenshotToProfiles).toBe('function');
  });

  function setState(ctx, { db, shots, fpMap, profShots }) {
    evalIn(ctx, `
      LSCG_DB = ${JSON.stringify(db)};
      LSCG_SCREENSHOTS = ${JSON.stringify(shots)};
      _lscgFpMap = ${JSON.stringify(fpMap)};
      PROFILE_SCREENSHOTS = ${JSON.stringify(profShots)};
    `);
  }

  function profShots(ctx) {
    return evalIn(ctx, 'JSON.parse(JSON.stringify(PROFILE_SCREENSHOTS))');
  }

  beforeEach(() => {
    setState(ctx, {
      db: { '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'FP1', ts: 1 }] } },
      shots: { '123|FP1': 'data:img1' },
      fpMap: { FP1: ['Anna_v1', 'Anna_v1b'] },
      profShots: {},
    });
  });

  it('kopiert das unter mk|fp gespeicherte Bild in alle Profil-Slots des Fingerprints', () => {
    ctx._syncLscgScreenshotToProfiles('123', 'FP1');
    expect(profShots(ctx)).toEqual({ Anna_v1: 'data:img1', Anna_v1b: 'data:img1' });
  });

  it('überschreibt ein vorhandenes Profil-Bild nie (manuelle Uploads bleiben)', () => {
    setState(ctx, {
      db: { '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'FP1', ts: 1 }] } },
      shots: { '123|FP1': 'data:img1' },
      fpMap: { FP1: ['Anna_v1', 'Anna_v1b'] },
      profShots: { Anna_v1: 'data:manual' },
    });
    ctx._syncLscgScreenshotToProfiles('123', 'FP1');
    const result = profShots(ctx);
    expect(result.Anna_v1).toBe('data:manual');
    expect(result.Anna_v1b).toBe('data:img1');
  });

  it('Legacy-Schlüssel ohne Fingerprint (storeKey === mk) funktioniert weiterhin', () => {
    setState(ctx, {
      db: { '123': { name: 'Anna', versions: [{ code: 'c1', fingerprint: 'FP1', ts: 1 }] } },
      shots: { '123': 'data:legacy' },
      fpMap: { FP1: ['Anna_v1', 'Anna_v1b'] },
      profShots: {},
    });
    ctx._syncLscgScreenshotToProfiles('123', null);
    const result = profShots(ctx);
    expect(result.Anna_v1).toBe('data:legacy');
    expect(result.Anna_v1b).toBe('data:legacy');
  });

  it('unbekannter Schlüssel: keine Änderung, keine Exception', () => {
    expect(() => ctx._syncLscgScreenshotToProfiles('999', 'FPX')).not.toThrow();
    expect(profShots(ctx)).toEqual({});
  });

  it('Sync persistiert nach bcSpeichernJetzt() im Store screenshots (profile|Anna_v1)', async () => {
    await ctx._screenshotStoreReady();
    ctx._syncLscgScreenshotToProfiles('123', 'FP1');
    ctx.bcSpeichernJetzt();
    await settle(100);
    const saved = await ctx.idbScreenshotGetAll('profile');
    expect(saved?.Anna_v1).toBe('data:img1');
  });

  it('Schreibseite und Leseseite bilden den Schlüssel identisch (statischer Quell-Check)', () => {
    const code = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8');
    const startIdx = code.indexOf('function _syncLscgScreenshotToProfiles(');
    expect(startIdx).toBeGreaterThan(-1);
    const rest = code.slice(startIdx);
    const lines = rest.split('\n');
    let body = lines[0] + '\n';
    for (let i = 1; i < lines.length; i++) {
      body += lines[i] + '\n';
      if (/^\}/.test(lines[i])) break;
    }
    expect(body).toMatch(/mk \+ '\|' \+ fp/);
    expect(body).toMatch(/function _syncLscgScreenshotToProfiles\(mk, fp\)/);
  });
});
