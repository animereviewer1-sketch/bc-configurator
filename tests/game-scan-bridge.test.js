// game-scan.js — Tool-seitige Spiel-Scan-Tests (SCAN-01 Tool-Hälfte, SCAN-08).
// Bridge-Nachrichten werden hier simuliert (der Loader läuft in diesen Tests
// nicht) — dieselbe Sandbox-Technik wie tests/exec-log.test.js/
// tests/bridge-registry.test.js. fake-indexeddb ist pro Testdatei
// prozessweit (mehrere loadScript-Sandboxen teilen dieselbe DB) — deshalb
// werden Snapshot-Zählungen relativ (vorher/nachher), nicht absolut geprüft.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadScript, loadInto, makeSandbox, makeElementStub, evalIn, dispatchMessage,
  settle, expandLoadOrder, CORE_SCRIPTS, REPO_ROOT,
} from './helpers/loadScript.js';

const BC = 'https://game.test';

async function boot({ handshake = true } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const info = makeElementStub();
  const ctx = loadScript(['items.js', 'game-scan.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  if (handshake) evalIn(ctx, "_bcOrigin = '" + BC + "'");
  ctx.document.getElementById = (id) => (id === 'gameScanInfo' ? info : makeElementStub());
  ctx.showStatus = vi.fn();
  evalIn(ctx, '_idbFehlerGemeldet = 0');
  await settle(60);
  opener.postMessage.mockClear();
  return { ctx, opener, info };
}

function recv(ctx, opener, data) {
  return dispatchMessage(ctx, { app: 'BCKonfigurator', ...data }, { origin: BC, source: opener });
}

function inventory(extra = {}) {
  return {
    schema: 1,
    gameVersion: 'R131',
    ts: 1,
    durationMs: 5,
    globals: {
      total: 3, getters: [], functions: [], values: [], byPrefix: {},
      inventory: { groups: [], other: { count: 0, names: [] } },
    },
    assets: { count: 0, groupCount: 0, groups: [], items: [] },
    modSdk: { available: true, version: '1.2.0', modCount: 2, patchingCount: 0, patching: [] },
    mods: [
      { name: 'BCX', fullName: 'Bondage Club Extended', version: '1.1.19', repository: 'r' },
      { name: 'WCE', fullName: 'Wholesome Club Extensions', version: '6.3.19', repository: 'r' },
    ],
    probes: {},
    chatHooks: {},
    errors: [],
    ...extra,
  };
}

// Op-Spy auf IDBObjectStore.prototype.add (Muster tests/injected-code-origin.test.js
// für put/delete, hier für add — Snapshot-Store nutzt ausschließlich add).
const origAdd = globalThis.IDBObjectStore.prototype.add;
let adds = [];
function resetAdds() { adds = []; }
function installAddSpy() {
  globalThis.IDBObjectStore.prototype.add = function (...args) {
    adds.push({ store: this.name, arg: args[0] });
    return origAdd.apply(this, args);
  };
}
afterEach(() => {
  globalThis.IDBObjectStore.prototype.add = origAdd;
});
beforeEach(() => {
  resetAdds();
});

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

describe('Ladereihenfolge-Guard (game-scan.js)', () => {
  it('ohne items.js: FATAL-Box nennt items.js und game-scan.js, Throw', () => {
    const sb = makeSandbox();
    const created = [];
    sb.document.createElement = (tag) => { const el = makeElementStub(); el.tagName = tag; created.push(el); return el; };
    loadInto(sb, 'persistence.js');
    loadInto(sb, 'bridge.js');
    expect(() => loadInto(sb, 'game-scan.js')).toThrow(/items\.js/);
    const box = created.find((el) => el.id === 'loadOrderFatal');
    expect(box).toBeTruthy();
    expect(box.textContent.startsWith('FATAL: ')).toBe(true);
    expect(box.textContent).toContain('game-scan.js');
    expect(box.textContent.endsWith('(siehe docs/LOAD-ORDER.md)')).toBe(true);
    // Hinweis: `function triggerGameScan(){}` wird als Funktionsdeklaration
    // gehoisted, bevor der Guard wirft (Node-vm-Plattformverhalten, kein
    // Fehler in game-scan.js) — die eigentliche Absicherung ist, dass der
    // Guard-Throw das Skript VOR den beiden Handler-Registrierungen abbricht.
    expect(evalIn(sb, "(_bridgeHandlers.get('GAME_INVENTORY_DATA') || []).length")).toBe(0);
  });

  it('mit allen Vorläufern: kein Throw, triggerGameScan ist Funktion, beide Handler registriert', async () => {
    const { ctx } = await boot();
    expect(typeof ctx.triggerGameScan).toBe('function');
    expect(evalIn(ctx, "(_bridgeHandlers.get('GAME_INVENTORY_PROGRESS') || []).length")).toBe(1);
    expect(evalIn(ctx, "(_bridgeHandlers.get('GAME_INVENTORY_DATA') || []).length")).toBe(1);
  });
});

describe('triggerGameScan (SCAN-01)', () => {
  it('sendet GET_GAME_INVENTORY mit reqId gi_<ts>_<n> an den gelernten Origin; Statuszeile "Scan läuft…"', async () => {
    const { ctx, opener, info } = await boot();
    const reqId = ctx.triggerGameScan();
    expect(reqId).toMatch(/^gi_\d+_\d+$/);
    expect(opener.postMessage).toHaveBeenCalledWith({ app: 'BCKonfigurator', type: 'GET_GAME_INVENTORY', reqId }, BC);
    expect(info.textContent).toContain('Scan läuft');
  });

  it('zwei Klicks → zwei verschiedene reqIds', async () => {
    const { ctx } = await boot();
    const a = ctx.triggerGameScan();
    const b = ctx.triggerGameScan();
    expect(a).not.toBe(b);
  });

  it('ohne Handshake: null, kein GET_GAME_INVENTORY, Statuszeile nennt Verbinden', async () => {
    const { ctx, opener, info } = await boot({ handshake: false });
    const reqId = ctx.triggerGameScan();
    expect(reqId).toBe(null);
    expect(opener.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GET_GAME_INVENTORY' }), expect.anything());
    expect(info.textContent).toContain('Verbinden');
  });
});

describe('GAME_INVENTORY_PROGRESS', () => {
  it('pendende reqId: Statuszeile "Schritt 2/6 – Assets 3/10"; fremde reqId: unverändert', async () => {
    const { ctx, opener, info } = await boot();
    const reqId = ctx.triggerGameScan();
    recv(ctx, opener, { type: 'GAME_INVENTORY_PROGRESS', reqId, step: 2, total: 6, label: 'Assets 3/10' });
    expect(info.textContent).toContain('2/6');
    expect(info.textContent).toContain('Assets 3/10');
    const before = info.textContent;
    recv(ctx, opener, { type: 'GAME_INVENTORY_PROGRESS', reqId: 'gi_fremd_9', step: 5, total: 6, label: 'X' });
    expect(info.textContent).toBe(before);
  });

  it('fehlendes Statuselement wirft nicht', async () => {
    const { ctx, opener } = await boot();
    ctx.document.getElementById = () => null;
    const reqId = ctx.triggerGameScan();
    expect(() => recv(ctx, opener, { type: 'GAME_INVENTORY_PROGRESS', reqId, step: 1, total: 6, label: 'X' })).not.toThrow();
    expect(() => ctx.triggerGameScan()).not.toThrow();
  });
});

describe('GAME_INVENTORY_DATA → Snapshot (SCAN-08)', () => {
  it('pendende reqId: genau ein add in snapshots, Datensatz-Form, Größenlog, Erfolgs-Status, Statuszeile', async () => {
    const { ctx, opener, info } = await boot();
    installAddSpy();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const reqId = ctx.triggerGameScan();
    const inv = inventory();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId, snapshot: inv });
    await settle(80);
    const snapAdds = adds.filter((a) => a.store === 'snapshots');
    expect(snapAdds.length).toBe(1);
    const rec = snapAdds[0].arg;
    expect(Object.keys(rec).sort()).toEqual(['gameVersion', 'id', 'inventory', 'modCount', 'mods', 'sizeBytes', 'ts']);
    expect(rec.id).toBe(rec.ts);
    expect(typeof rec.ts).toBe('number');
    expect(Math.abs(rec.ts - Date.now())).toBeLessThan(5000);
    expect(rec.gameVersion).toBe('R131');
    expect(rec.modCount).toBe(2);
    expect(rec.mods).toEqual([{ name: 'BCX', version: '1.1.19' }, { name: 'WCE', version: '6.3.19' }]);
    expect(rec.sizeBytes).toBe(JSON.stringify(inv).length);
    expect(rec.inventory).toEqual(inv);
    const infoCalls = infoSpy.mock.calls;
    const matched = infoCalls.some((args) => args.some((a) => typeof a === 'string' && a.includes('[GameScan]')) && args.includes(rec.sizeBytes));
    expect(matched).toBe(true);
    expect(ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('gespeichert'), 'success');
    expect(info.textContent).toContain('R131');
    expect(info.textContent).toContain('2 Mods');
    expect(info.textContent).toContain('Snapshot');
    expect(await ctx.idbSnapshotGet(rec.id)).toEqual(rec);
    infoSpy.mockRestore();
  });

  it('zweiter Scan behält den ersten: zwei Datensätze, erster unverändert (Kernwert)', async () => {
    const { ctx, opener } = await boot();
    const n0 = (await ctx.idbSnapshotKeys()).length;
    const reqId1 = ctx.triggerGameScan();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: reqId1, snapshot: inventory() });
    await settle(5);
    const reqId2 = ctx.triggerGameScan();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: reqId2, snapshot: inventory({ gameVersion: 'R132' }) });
    await settle(80);
    const keys = await ctx.idbSnapshotKeys();
    expect(keys.length).toBe(n0 + 2);
    const newKeys = keys.slice(-2);
    const recs = await Promise.all(newKeys.map((k) => ctx.idbSnapshotGet(k)));
    const versions = recs.map((r) => r.gameVersion).sort();
    expect(versions).toEqual(['R131', 'R132']);
    for (const call of ctx.showStatus.mock.calls) {
      expect(call[1]).not.toBe('error');
    }
  });

  it('gleichzeitige Scans: DATA für beide pendenden reqIds wird gespeichert; danach ist die reqId verbraucht', async () => {
    const { ctx, opener } = await boot();
    const n0 = (await ctx.idbSnapshotKeys()).length;
    const a = ctx.triggerGameScan();
    const b = ctx.triggerGameScan();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: a, snapshot: inventory() });
    await settle(5);
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: b, snapshot: inventory({ gameVersion: 'R132' }) });
    await settle(80);
    const keys1 = await ctx.idbSnapshotKeys();
    expect(keys1.length).toBe(n0 + 2);
    installAddSpy();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: a, snapshot: inventory() });
    await settle(50);
    expect(adds.filter((x) => x.store === 'snapshots').length).toBe(0);
  });

  it('unbekannte reqId: kein add, kein Status (T-5-04)', async () => {
    const { ctx, opener } = await boot();
    installAddSpy();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: 'gi_fremd_1', snapshot: inventory() });
    await settle(50);
    expect(adds.filter((x) => x.store === 'snapshots').length).toBe(0);
    expect(ctx.showStatus).not.toHaveBeenCalled();
  });

  it('err: Fehler-Status mit Fehlertext, nichts gespeichert, Statuszeile "fehlgeschlagen"', async () => {
    const { ctx, opener, info } = await boot();
    const reqId = ctx.triggerGameScan();
    installAddSpy();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId, err: 'DataCloneError: could not be cloned' });
    await settle(50);
    expect(adds.filter((x) => x.store === 'snapshots').length).toBe(0);
    expect(ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('DataCloneError'), 'error');
    const errCall = ctx.showStatus.mock.calls.find((c) => c[1] === 'error');
    expect(errCall[0]).toContain('fehlgeschlagen');
    expect(info.textContent).toContain('fehlgeschlagen');
  });

  it('DATA ohne snapshot-Objekt: wie err behandelt', async () => {
    const { ctx, opener } = await boot();
    const reqId = ctx.triggerGameScan();
    installAddSpy();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId });
    await settle(50);
    expect(adds.filter((x) => x.store === 'snapshots').length).toBe(0);
    expect(ctx.showStatus).toHaveBeenCalledWith(expect.anything(), 'error');
  });

  it('Quota: add wirft QuotaExceededError → "Speicher voll" sichtbar, Statuszeile "NICHT gespeichert", kein Erfolgs-Status', async () => {
    const { ctx, opener, info } = await boot();
    globalThis.IDBObjectStore.prototype.add = function () {
      const e = new Error('quota');
      e.name = 'QuotaExceededError';
      throw e;
    };
    const reqId = ctx.triggerGameScan();
    recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId, snapshot: inventory() });
    await settle(80);
    expect(ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('Speicher voll'), 'error');
    expect(info.textContent).toContain('NICHT gespeichert');
    for (const call of ctx.showStatus.mock.calls) {
      expect(call[1]).not.toBe('success');
    }
  });

  it('Init: Statuszeile zeigt vorhandene Snapshot-Anzahl beim Laden', async () => {
    const { ctx: ctx1, opener: opener1 } = await boot();
    const reqId = ctx1.triggerGameScan();
    recv(ctx1, opener1, { type: 'GAME_INVENTORY_DATA', reqId, snapshot: inventory() });
    await settle(80);

    const { info: info2 } = await boot();
    expect(info2.textContent).toMatch(/\d+ Snapshot/);
  });
});

describe('statisch: Ladeordnung, index.html, docs, game-scan.js', () => {
  it('index.html: Write-Zeile direkt nach items.js im ersten _cbv-Block, Kommentar nennt game-scan.js, Sektion 🔎 Spiel-Scan genau einmal zwischen Screenshot-Speicher und Item-Katalog', () => {
    const html = src('index.html');
    expect(count(html, 'game-scan.js?_=')).toBe(1);
    expect(html.indexOf('items.js?_=')).toBeLessThan(html.indexOf('game-scan.js?_='));
    expect(html.indexOf('game-scan.js?_=')).toBeLessThan(html.indexOf('</script>', html.indexOf('var _cbv = Date.now();')));
    const loIdx = html.indexOf('LADEREIHENFOLGE');
    expect(html.slice(loIdx, loIdx + 260)).toContain('game-scan.js');
    expect(count(html, 'onclick="triggerGameScan()"')).toBe(1);
    expect(count(html, 'id="gameScanInfo"')).toBe(1);
    expect(count(html, '🔎 Spiel scannen')).toBe(1);
    expect(count(html, '🔎 Spiel-Scan')).toBe(1);
    expect(html.indexOf('id="screenshotStoreInfo"')).toBeLessThan(html.indexOf('id="gameScanInfo"'));
    expect(html.indexOf('id="gameScanInfo"')).toBeLessThan(html.indexOf('📦 Item-Katalog'));
  });

  it('docs/LOAD-ORDER.md + CORE_SCRIPTS + game-scan.js-Quelle', () => {
    const doc = src('docs/LOAD-ORDER.md');
    expect(count(doc, 'game-scan.js')).toBeGreaterThanOrEqual(3);
    expect(doc).toContain('GAME_INVENTORY_DATA');
    expect(doc).toContain('GAME_SCAN_DATA');
    expect(doc).toContain('idbSnapshotPut');
    expect(doc).toContain("'game-scan.js'");
    expect(doc).toContain('332fc2d');
    expect(doc).not.toContain('keine try/catch-Isolation');

    expect(CORE_SCRIPTS).toEqual(['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']);
    expect(expandLoadOrder(['items.js'])).toEqual([...CORE_SCRIPTS]);
    expect(expandLoadOrder(['items.js', 'bot-data.js'])).toEqual([...CORE_SCRIPTS, 'bot-data.js']);
    expect(expandLoadOrder(['items.js', 'game-scan.js'])).toEqual([...CORE_SCRIPTS]);
    expect(expandLoadOrder(['persistence.js', 'items.js'])).toEqual([...CORE_SCRIPTS]);
    expect(expandLoadOrder(['bot-data.js'])).toEqual(['bot-data.js']);

    const gs = src('game-scan.js');
    expect(count(gs, "onBridgeMessage('GAME_INVENTORY_PROGRESS'")).toBe(1);
    expect(count(gs, "onBridgeMessage('GAME_INVENTORY_DATA'")).toBe(1);
    expect(count(gs, "type: 'GET_GAME_INVENTORY'")).toBe(1);
    expect(count(gs, 'idbSnapshotPut(')).toBeGreaterThanOrEqual(1);
    expect(count(gs, 'idbSnapshotKeys(')).toBeGreaterThanOrEqual(1);
    expect(count(gs, 'loadOrderFatal')).toBe(1);
    expect(gs).toContain('wurde nicht vor game-scan.js geladen');
    expect(count(gs, "addEventListener('message'")).toBe(0);
    expect(count(gs, 'postMessage(')).toBe(0);
    expect(count(gs, 'indexedDB.open(')).toBe(0);
    expect(count(gs, '.delete(')).toBe(0);
    expect(count(gs, '.clear(')).toBe(0);
    expect(count(gs, 'idbSnapshotDelete')).toBe(0);
    expect(count(gs, 'location.origin')).toBe(0);
    expect(count(gs, 'toLocaleString')).toBe(0);

    const loaderSrc = src('loader.js');
    const popupUrlLine = loaderSrc.split('\n').find((l) => /const POPUP_URL = '([^']+)'/.test(l));
    const m = /const POPUP_URL = '([^']+)'/.exec(popupUrlLine);
    const originHost = new URL(m[1]).host;
    expect(count(gs, originHost)).toBe(0);

    const WILD = /,\s*['"]\*['"]\)/;
    expect(gs.split('\n').some((line) => WILD.test(line))).toBe(false);
  });
});
