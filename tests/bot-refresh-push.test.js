import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Server-Push pro Item: BCs InventoryWear(…, Refresh=true) und InventoryRemove(…, refresh=true)
// rufen CharacterRefresh(C, true) auf – für den eigenen Charakter pusht das einen AccountUpdate
// (bei WCE zusätzlich ExtensionSettings.WCEOverrides) zum Server. Eine Schleife über 15 Items
// erzeugte so 15 Push-Paare in einer Millisekunde und löste "ErrorRateLimited" aus (Sende-Monitor,
// Bericht 01:10). Im generierten Bot-Code wird deshalb jedes Anlegen/Entfernen OHNE Refresh
// aufgerufen; der Code ruft danach selbst einmal CharacterRefresh + ChatRoomCharacterUpdate auf.

const BS = String.fromCharCode(92);

function splitArgs(str) {
  const args = [];
  let depth = 0;
  let cur = '';
  let q = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) {
      cur += ch;
      if (ch === BS) { cur += str[++i]; } else if (ch === q) { q = null; }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      q = ch; cur += ch;
    } else if ('([{'.includes(ch)) {
      depth++; cur += ch;
    } else if (')]}'.includes(ch)) {
      depth--; cur += ch;
    } else if (ch === ',' && depth === 0) {
      args.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  args.push(cur);
  return args.map((a) => a.trim());
}

function callEnd(text, start) {
  let depth = 1;
  let q = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === BS) i++; else if (ch === q) q = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      q = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('Klammern nicht ausgeglichen');
}

function aufrufe(src, name) {
  const re = new RegExp('\\b' + name + '\\(', 'g');
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const st = m.index + m[0].length;
    const en = callEnd(src, st);
    out.push({ zeile: src.slice(0, m.index).split('\n').length, args: splitArgs(src.slice(st, en)) });
    re.lastIndex = en;
  }
  return out;
}

const BOT = fs.readFileSync(path.join(REPO_ROOT, 'bot-engine.js'), 'utf8');

describe('Bot-Code: kein Server-Push pro Item', () => {
  it('es gibt Aufrufe zu prüfen (Scanner funktioniert)', () => {
    expect(aufrufe(BOT, 'InventoryWear').length).toBeGreaterThanOrEqual(15);
    expect(aufrufe(BOT, 'InventoryRemove').length).toBeGreaterThanOrEqual(2);
  });

  it('jedes InventoryWear hat Refresh=false als achtes Argument', () => {
    const falsch = aufrufe(BOT, 'InventoryWear').filter((c) => c.args.length !== 8 || c.args[7] !== 'false');
    expect(falsch.map((c) => 'Zeile ' + c.zeile + ': ' + c.args.join(', '))).toEqual([]);
  });

  it('jedes InventoryRemove hat refresh=false als drittes Argument', () => {
    const falsch = aufrufe(BOT, 'InventoryRemove').filter((c) => c.args.length !== 3 || c.args[2] !== 'false');
    expect(falsch.map((c) => 'Zeile ' + c.zeile + ': ' + c.args.join(', '))).toEqual([]);
  });

  it('das Anlegen in der Outfit-Schleife bleibt eine Schleife: Aufruf steht im forEach, Refresh danach genau einmal', () => {
    // Phase 1 – alle InventoryWear synchron, Phase 3 – ein einziger Refresh + Sync
    const phase1 = BOT.indexOf('Phase 1: Alle InventoryWear synchron');
    const phase3 = BOT.indexOf('Phase 3: Ein einziger Refresh + Sync');
    expect(phase1).toBeGreaterThan(0);
    expect(phase3).toBeGreaterThan(phase1);
    const dazwischen = BOT.slice(phase1, phase3);
    const wear = aufrufe(dazwischen, 'InventoryWear');
    expect(wear.length).toBeGreaterThanOrEqual(2); // Schleife + Wiederherstellen
    expect(wear.every((c) => c.args[7] === 'false')).toBe(true);
    // zwischen Phase 1 und Phase 3 kein CharacterRefresh mit Push außer dem Schlussaufruf
    expect((dazwischen.match(/CharacterRefresh\(C\)/g) || []).length).toBe(0);
    expect(BOT.slice(phase3, phase3 + 120)).toMatch(/CharacterRefresh\(C\);\s*ChatRoomCharacterUpdate\(C\);/);
  });
});

// ── Bericht: EXEC-Aufrufe des Tools neben der Trennung ───────────────────

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function bootTool() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  return { ctx };
}

describe('Sende-Monitor (Tool): EXEC-Aufrufe im Bericht', () => {
  const t0 = Date.now();
  const log = {
    jetzt: t0, seit: t0 - 60000, gesamt: 5, vomTool: 2, spitze: { n: 2, t: t0 }, warnAb: 10,
    nachTyp: {}, nachQuelle: {}, ringSendungen: 0, wrapper: [], leitung: { aktiv: false }, bc: {},
    ring: [],
    vorfaelle: [{
      t: t0, grund: 'ServerDisconnect: ErrorRateLimited', n10: 2, tool10: 2, dup10: 0, spitze10: { n: 2, t: t0 },
      leitung10: 2, leitungSpitze10: { n: 2, t: t0 }, top: [], lauf: [],
    }],
  };

  it('zeigt EXEC-Einträge aus den 30 s vor der Trennung, andere nicht', () => {
    const { ctx } = bootTool();
    evalIn(ctx, '_execLog.length = 0');
    evalIn(ctx, `_execLog.push({ ts: ${t0 - 12800}, desc: 'Bot: Outfit anlegen', len: 4021 })`);
    evalIn(ctx, `_execLog.push({ ts: ${t0 - 90000}, desc: 'viel zu frueh', len: 10 })`);
    evalIn(ctx, `_execLog.push({ ts: ${t0 + 60000}, desc: 'viel zu spaet', len: 10 })`);
    const text = evalIn(ctx, '_sendMonText(' + JSON.stringify(log) + ')');
    expect(text).toContain('EXEC-Aufrufe des Tools in diesem Zeitraum (1):');
    expect(text).toContain('-12.8  Bot: Outfit anlegen (4021 Zeichen)');
    expect(text).not.toContain('viel zu frueh');
    expect(text).not.toContain('viel zu spaet');
  });

  it('ohne EXEC in dieser Zeit steht (0) da, kein Fehler', () => {
    const { ctx } = bootTool();
    evalIn(ctx, '_execLog.length = 0');
    expect(evalIn(ctx, '_sendMonText(' + JSON.stringify(log) + ')')).toContain('EXEC-Aufrufe des Tools in diesem Zeitraum (0):');
  });
});
