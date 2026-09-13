import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadScript, evalIn, REPO_ROOT } from './helpers/loadScript.js';
import fs from 'node:fs';
import path from 'node:path';

// STAB-09: Jeder UI-erreichbare Lösch-Pfad für Bilder, einzelne Outfits und
// Outfit-Versionen muss confirm() genau einmal aufrufen, bevor er etwas
// entfernt. Bricht confirm() ab (false), bleiben LSCG_DB, LSCG_SCREENSHOTS,
// PROFILE_SCREENSHOTS und _mbsWheelShots byte-identisch zum Vorzustand.

let confirmResult = true;
const confirmCalls = [];

let ctx;

beforeAll(() => {
  ctx = loadScript(['items.js'], {
    confirm: (msg) => { confirmCalls.push(String(msg)); return confirmResult; },
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

function snap(ctx) {
  return evalIn(ctx, 'JSON.stringify({ db: LSCG_DB, shots: LSCG_SCREENSHOTS, prof: PROFILE_SCREENSHOTS, wheel: _mbsWheelShots })');
}

const DELETE_PATHS = [
  {
    name: 'removeProfileScreenshot',
    call: (ctx) => ctx.removeProfileScreenshot('Anna_v1'),
    gone: (ctx) => evalIn(ctx, "PROFILE_SCREENSHOTS['Anna_v1'] === undefined"),
  },
  {
    name: 'deleteOsScreenshot',
    call: (ctx) => ctx.deleteOsScreenshot('456'),
    gone: (ctx) => evalIn(ctx, "LSCG_SCREENSHOTS['456'] === undefined"),
  },
  {
    name: 'deleteOsScreenshotKey',
    call: (ctx) => ctx.deleteOsScreenshotKey('123|FP1'),
    gone: (ctx) => evalIn(ctx, "LSCG_SCREENSHOTS['123|FP1'] === undefined"),
  },
  {
    name: 'mbsWheelDeleteShot',
    call: (ctx) => ctx.mbsWheelDeleteShot(5, 0),
    gone: (ctx) => evalIn(ctx, "_mbsWheelShots['G:A'] === undefined"),
  },
  {
    name: 'deleteOsScreenshotFromLb (Wheel-Zweig)',
    call: (ctx) => ctx.deleteOsScreenshotFromLb(),
    gone: (ctx) => evalIn(ctx, "_mbsWheelShots['W2'] === undefined"),
  },
  {
    name: 'deleteLscgVersion',
    call: (ctx) => ctx.deleteLscgVersion('123', 0),
    gone: (ctx) => evalIn(ctx, "LSCG_DB['123'].versions.length === 1 && LSCG_SCREENSHOTS['123|FP1'] === undefined"),
  },
  {
    name: 'clearAllProfileScreenshots',
    call: (ctx) => ctx.clearAllProfileScreenshots(),
    gone: (ctx) => evalIn(ctx, 'Object.keys(PROFILE_SCREENSHOTS).length === 0'),
  },
  {
    name: 'clearAllLscgScreenshots',
    call: (ctx) => ctx.clearAllLscgScreenshots(),
    gone: (ctx) => evalIn(ctx, 'Object.keys(LSCG_SCREENSHOTS).length === 0'),
  },
  {
    name: 'clearAllLscgOutfits',
    call: (ctx) => ctx.clearAllLscgOutfits(),
    gone: (ctx) => evalIn(ctx, 'Object.keys(LSCG_DB).length === 0 && Object.keys(LSCG_SCREENSHOTS).length === 0'),
  },
  {
    name: 'mbsWheelClearAllShots',
    call: (ctx) => ctx.mbsWheelClearAllShots(),
    gone: (ctx) => evalIn(ctx, 'Object.keys(_mbsWheelShots).length === 0'),
  },
];

describe('Löschen nur mit Bestätigung (STAB-09)', () => {
  beforeEach(() => {
    confirmCalls.length = 0;
    confirmResult = true;
    setState(ctx);
  });

  it.each(DELETE_PATHS)('$name: confirm → false löscht nichts und fragt genau einmal', ({ call, gone }) => {
    confirmResult = false;
    const before = snap(ctx);
    call(ctx);
    expect(confirmCalls).toHaveLength(1);
    expect(snap(ctx)).toBe(before);
  });

  it.each(DELETE_PATHS)('$name: confirm → true entfernt das Ziel und fragt genau einmal', ({ call, gone }) => {
    call(ctx);
    expect(confirmCalls).toHaveLength(1);
    expect(gone(ctx)).toBe(true);
  });

  it('confirm-Text ist ein nicht-leerer String', () => {
    confirmResult = true;
    ctx.deleteOsScreenshotKey('123|FP1');
    expect(typeof confirmCalls[0]).toBe('string');
    expect(confirmCalls[0].length).toBeGreaterThan(0);
  });

  it('jede Lösch-Zeile der vier Stores liegt in einer Funktion mit confirm() oder auf der Ausnahmeliste', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8').split('\n');

    const DELETE_RE = /delete (LSCG_SCREENSHOTS|PROFILE_SCREENSHOTS|_mbsWheelShots|LSCG_DB)\[|^\s*(LSCG_SCREENSHOTS|PROFILE_SCREENSHOTS|_mbsWheelShots|LSCG_DB)\s*=\s*\{\}/;
    const FN_RE = /^(?:async )?function ([A-Za-z_$][\w$]*)|^window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async )?function/;

    // Funktionen, die UI-erreichbare Lösch-Pfade sind — MÜSSEN confirm() aufrufen.
    const CONFIRM_REQUIRED = [
      'deleteProfile', 'removeProfileScreenshot', 'deleteOsScreenshot', 'deleteOsScreenshotKey',
      'mbsWheelDeleteShot', 'deleteOsScreenshotFromLb', 'deleteLscgVersion', 'clearAllProfileScreenshots',
      'clearAllLscgScreenshots', 'clearAllLscgOutfits', 'mbsWheelClearAllShots', 'mbsWheelClearAll',
    ];
    // Bewusste Ausnahmen — kein confirm() nötig:
    const ALLOWED_WITHOUT_CONFIRM = [
      'markAllProfilesOld',                // Umbenennung mit Screenshot-Mitzug, kein Datenverlust
      'profileRename',                     // Umbenennung, kein Datenverlust
      'repairOsOutfitCode',                // Konsolen-Reparatur, nicht UI-erreichbar
      '_removeLscgScreenshotFromProfiles', // Aufräum-Helfer, läuft nur hinter bereits bestätigten Aufrufern
    ];

    let currentFn = null;
    const hits = [];
    const fnStartIdx = {};
    for (let i = 0; i < src.length; i++) {
      const line = src[i];
      const fnMatch = FN_RE.exec(line);
      if (fnMatch) {
        currentFn = fnMatch[1] || fnMatch[2];
        if (!(currentFn in fnStartIdx)) fnStartIdx[currentFn] = i;
      }
      if (DELETE_RE.test(line)) hits.push({ line: i + 1, fn: currentFn });
    }

    const unexpected = hits.filter(h => !CONFIRM_REQUIRED.includes(h.fn) && !ALLOWED_WITHOUT_CONFIRM.includes(h.fn));
    expect(unexpected, 'Unerwartete Lösch-Zeilen außerhalb bekannter Funktionen: ' + JSON.stringify(unexpected)).toEqual([]);
    expect(hits.length).toBeGreaterThanOrEqual(15);

    for (const name of CONFIRM_REQUIRED) {
      const startIdx = fnStartIdx[name];
      expect(startIdx, `Funktion ${name} nicht gefunden`).not.toBeUndefined();
      let body = src[startIdx] + '\n';
      for (let i = startIdx + 1; i < src.length; i++) {
        body += src[i] + '\n';
        if (/^\}/.test(src[i])) break;
      }
      expect(body, `Funktion ${name} hat kein confirm() im Körper`).toMatch(/confirm\(/);
    }
  });
});
