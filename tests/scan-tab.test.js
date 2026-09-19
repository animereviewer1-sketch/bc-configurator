// SCAN-10: Rendering-Tests für scan-tab.js gegen die vm-Sandbox mit
// überschriebenem `document.getElementById` (RESEARCH Pitfall 2 — jeder
// Aufruf liefert sonst einen frischen Stub). Badges werden gegen das echte
// `baseline-manifest.js` nur für stabile, im Manifest fest verankerte Namen
// geprüft; die reinen Funktionen (Flatten/Badges/Filter/Zähler) laufen
// gegen ein synthetisches Manifest, damit sie nicht an Quelldrift hängen.
// fake-indexeddb ist pro Testdatei geteilt (prozessweit) — der Fall „ohne
// Snapshot" läuft deshalb als erster DOM-Test in dieser Datei (vitest führt
// Fälle einer Datei sequenziell aus); alle Vorauswahl-Tests seeden mit `ts`
// weit in der Zukunft, damit „neuester" deterministisch ist.

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  loadScript, makeElementStub, evalIn, settle,
  CORE_SCRIPTS, expandLoadOrder, REPO_ROOT,
} from './helpers/loadScript.js';
import { inv, SYN_MANIFEST, EXPECTED_ROWS } from './helpers/scanFixtures.js';

const require = createRequire(import.meta.url);

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

const IDS = ['scanSnapshotList', 'scanBaselineInfo', 'scanSearch', 'scanCategory', 'scanCount', 'scanList'];

async function boot({ manifest = true, timers = null } = {}) {
  const captured = Object.fromEntries(IDS.map((id) => [id, makeElementStub()]));
  const extra = timers
    ? { setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout }
    : { setTimeout: () => 0, clearTimeout: () => {} };
  const files = manifest ? ['items.js', 'baseline-manifest.js', 'scan-tab.js'] : ['items.js', 'scan-tab.js'];
  const ctx = loadScript(files, extra);
  ctx.document.getElementById = (id) => captured[id] || makeElementStub();
  ctx.showStatus = vi.fn();
  await settle(40);
  return { ctx, captured };
}

let seq = 0;
function rec(extra) {
  seq += 1;
  return {
    id: 'st_' + Date.now() + '_' + seq,
    ts: 9e12 + seq,
    gameVersion: 'R131',
    modCount: 2,
    mods: [{ name: 'BCX', version: '1' }, { name: 'X', version: '0' }],
    sizeBytes: 2048,
    inventory: inv(),
    ...extra,
  };
}

function rowsOf(html) {
  return html.split('class="scan-row"').slice(1);
}

function rowFor(html, name) {
  return rowsOf(html).find((seg) => seg.includes('>' + name + '<'));
}

function badgeOf(segment) {
  return /scan-badge-(genutzt|neu|unbekannt)/.exec(segment)[1];
}

describe('Ladereihenfolge-Guard + Node-Export (scan-tab.js)', () => {
  it('in Node (ohne window) exportiert scan-tab.js die reinen Funktionen', () => {
    const m = require('../scan-tab.js');
    for (const fn of ['_scanFlatten', '_scanBaselineSets', '_scanBadge', '_scanFilter', '_scanCountBadges', 'deleteGameSnapshot', 'exportGameSnapshot']) {
      expect(typeof m[fn]).toBe('function');
    }
    expect(m.SCAN_PAGE_SIZE).toBe(300);
    expect(m.SCAN_CATEGORIES).toEqual(['globals', 'assets', 'groups', 'hooks', 'mods', 'patching', 'probes']);
  });

  it('mit allen Vorläufern: renderScanTab, scanOnSearch, scanOnFilter, scanLoadMore, scanSelectSnapshot sind Funktionen; CORE_SCRIPTS unverändert; expandLoadOrder hängt scan-tab.js hinter game-scan.js', async () => {
    const { ctx } = await boot();
    for (const fn of ['renderScanTab', 'scanOnSearch', 'scanOnFilter', 'scanLoadMore', 'scanSelectSnapshot']) {
      expect(typeof ctx[fn]).toBe('function');
    }
    expect(CORE_SCRIPTS).toEqual(['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']);
    expect(expandLoadOrder(['items.js', 'scan-tab.js'])).toEqual([...CORE_SCRIPTS, 'scan-tab.js']);
  });
});

describe('Reine Funktionen: Flatten, Badges, Filter, Zähler', () => {
  it('_scanFlatten: eine Zeile je Fund, sieben Kategorien, assets tragen group, probes tragen probe', () => {
    const m = require('../scan-tab.js');
    const rows = m._scanFlatten(inv());
    expect(rows.length).toBe(EXPECTED_ROWS);
    expect(new Set(rows.map((r) => r.category))).toEqual(new Set(m.SCAN_CATEGORIES));
    for (const r of rows) {
      expect(typeof r.category).toBe('string');
      expect(typeof r.kind).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
    }
    expect(rows.filter((r) => r.category === 'assets').every((r) => typeof r.group === 'string')).toBe(true);
    expect(rows.find((r) => r.name === 'Collar').group).toBe('ItemNeck');
    expect(rows.filter((r) => r.category === 'probes').every((r) => typeof r.probe === 'string')).toBe(true);
    const wceFn = rows.find((r) => r.name === 'wce.fbcVersion');
    expect(wceFn).toBeDefined();
    expect(wceFn.probe).toBe('wce');
    const csc = rows.find((r) => r.name === 'ChatRoomSendChat');
    expect(csc.kind).toBe('function');
    expect(csc.detail).toContain('1');
    const di = rows.find((r) => r.name === 'DrawImage');
    expect(di.detail).toContain('LSCG');
    expect(m._scanFlatten({})).toEqual([]);
    expect(m._scanFlatten(null)).toEqual([]);
  });

  it('_scanBaselineSets + _scanBadge: Namensmenge über alle kinds, assets nach Gruppe, mods/probes nach modProbes, null → unbekannt', () => {
    const m = require('../scan-tab.js');
    const sets = m._scanBaselineSets(SYN_MANIFEST);
    expect(sets.identifiers.has('ChatRoomSendChat') && sets.identifiers.has('ItemNeck')).toBe(true);
    expect(sets.modProbes.has('wce')).toBe(true);
    expect(sets.counts).toEqual({ identifiers: 3, function: 2, assetGroup: 1, unknown: 0 });
    const rows = m._scanFlatten(inv());
    const b = (name) => m._scanBadge(rows.find((r) => r.name === name), sets);
    expect(b('ChatRoomSendChat')).toBe('genutzt');
    expect(b('CharacterNickname')).toBe('neu');
    expect(b('Collar')).toBe('genutzt');
    expect(b('Ballgag')).toBe('neu');
    expect(b('ItemNeck')).toBe('genutzt');
    expect(b('ItemUnknownGrp')).toBe('neu');
    expect(b('ServerSend')).toBe('genutzt');
    expect(b('DrawImage')).toBe('neu');
    const modRow = rows.find((r) => r.category === 'mods' && r.name === 'BCX');
    expect(m._scanBadge(modRow, sets)).toBe('neu');
    const probeWce = rows.find((r) => r.category === 'probes' && r.kind === 'probe' && r.name === 'wce');
    const probeBcx = rows.find((r) => r.category === 'probes' && r.kind === 'probe' && r.name === 'bcx');
    expect(m._scanBadge(probeWce, sets)).toBe('genutzt');
    expect(m._scanBadge(probeBcx, sets)).toBe('neu');
    const probeApiWce = rows.find((r) => r.name === 'wce.fbcVersion');
    expect(m._scanBadge(probeApiWce, sets)).toBe('genutzt');
    expect(m._scanBadge(rows[0], null)).toBe('unbekannt');
    expect(m._scanBaselineSets(null)).toBe(null);
    let emptySets;
    expect(() => { emptySets = m._scanBaselineSets({}); }).not.toThrow();
    expect(emptySets.identifiers.size).toBe(0);
    expect(emptySets.modProbes.size).toBe(0);
  });

  it('_scanFilter: Suche case-insensitive über Name + Detail, Kategorie, Kombination; leere Suche = alles', () => {
    const m = require('../scan-tab.js');
    const rows = m._scanFlatten(inv());
    expect(m._scanFilter(rows, '', 'all').length).toBe(rows.length);
    expect(m._scanFilter(rows, 'chatroom', 'all').map((r) => r.name).sort()).toEqual([
      'ChatRoomData', 'ChatRoomMessage', 'ChatRoomRegisterMessageHandler', 'ChatRoomSendChat',
    ]);
    expect(m._scanFilter(rows, '', 'mods').length).toBe(2);
    expect(m._scanFilter(rows, 'bcx', 'mods').length).toBe(1);
    expect(m._scanFilter(rows, 'lscg', 'patching').length).toBe(1);
  });

  it('_scanCountBadges: gesamt/genutzt/neu/unbekannt je Kategorie und all', () => {
    const m = require('../scan-tab.js');
    const rows = m._scanFlatten(inv());
    const sets = m._scanBaselineSets(SYN_MANIFEST);
    const c = m._scanCountBadges(rows, sets);
    expect(c.all.total).toBe(rows.length);
    expect(c.globals).toEqual({ total: 4, genutzt: 1, neu: 3, unbekannt: 0 });
    expect(c.assets).toEqual({ total: 3, genutzt: 1, neu: 2, unbekannt: 0 });
    expect(m._scanCountBadges(rows, null).all.unbekannt).toBe(rows.length);
  });
});

describe('renderScanTab (DOM, Sandbox)', () => {
  it('ohne Snapshot: Hinweis nennt „Spiel scannen" und einen Shortcut auf triggerGameScan, Liste leer, Zähler 0, kein Throw', async () => {
    const { ctx, captured } = await boot();
    await ctx.renderScanTab();
    expect(captured.scanSnapshotList.innerHTML).toContain('Spiel scannen');
    expect(captured.scanSnapshotList.innerHTML).toContain('onclick="triggerGameScan()"');
    expect(captured.scanList.innerHTML).toBe('');
    expect(captured.scanCount.textContent).toContain('0');
    expect(evalIn(ctx, '_scanState.selectedId')).toBe(null);
  });

  it('neuester Snapshot vorausgewählt; Snapshot-Liste: je Eintrag Datum UTC, BC-Version, Mods, KB, ⬇/🗑-Buttons mit escJsAttr-id; aktiver Eintrag markiert', async () => {
    const { ctx, captured } = await boot();
    const older = rec();
    const newer = rec();
    await ctx.idbSnapshotPut(older);
    await ctx.idbSnapshotPut(newer);
    await ctx.renderScanTab();
    expect(evalIn(ctx, '_scanState.selectedId')).toBe(newer.id);
    const html = captured.scanSnapshotList.innerHTML;
    expect(html).toContain("exportGameSnapshot('" + newer.id + "')");
    expect(html).toContain("deleteGameSnapshot('" + newer.id + "')");
    expect(html).toContain("exportGameSnapshot('" + older.id + "')");
    expect(html).toContain("deleteGameSnapshot('" + older.id + "')");
    expect(html).toContain('R131');
    expect(html).toContain('2 Mods');
    expect(html).toContain(' UTC');
    expect(html).toContain('2 KB');
    expect(count(html, 'scan-snap-active')).toBe(1);
    expect(html.indexOf('scan-snap-active')).toBeLessThan(html.indexOf("scanSelectSnapshot('" + older.id));
    expect(count(html, 'idbSnapshotDelete')).toBe(0);
  });

  it('Fundliste mit echtem Manifest: Badges je Kategorie korrekt, Baseline-Info nennt die Bezeichner-Anzahl', async () => {
    const { ctx, captured } = await boot();
    const older = rec();
    const newer = rec();
    await ctx.idbSnapshotPut(older);
    await ctx.idbSnapshotPut(newer);
    await ctx.renderScanTab();
    const html = captured.scanList.innerHTML;
    expect(badgeOf(rowFor(html, 'ChatRoomSendChat'))).toBe('genutzt');
    expect(badgeOf(rowFor(html, 'CharacterNickname'))).toBe('neu');
    expect(badgeOf(rowFor(html, 'Collar'))).toBe('genutzt');
    expect(badgeOf(rowFor(html, 'Weird'))).toBe('neu');
    expect(badgeOf(rowFor(html, 'ItemNeck'))).toBe('genutzt');
    expect(badgeOf(rowFor(html, 'ServerSend'))).toBe('genutzt');
    expect(badgeOf(rowFor(html, 'DrawImage'))).toBe('neu');
    expect(badgeOf(rowFor(html, 'BCX'))).toBe('genutzt');
    expect(badgeOf(rowFor(html, 'ChatRoomMessage'))).toBe('genutzt');
    expect(html).toContain('bereits genutzt');
    const manifestCounts = JSON.parse(src('baseline-manifest.json')).counts;
    const infoText = captured.scanBaselineInfo.textContent || captured.scanBaselineInfo.innerHTML;
    expect(infoText).toContain(String(manifestCounts.identifiers));
    expect(infoText).toContain('Gruppe');
    expect(captured.scanCount.textContent).toMatch(/\d+ von \d+ Einträgen/);
    expect(captured.scanCount.textContent).toContain('genutzt');
  });

  it('XSS: Mod-Name mit <img onerror> wird escaped (T-6-05)', async () => {
    const { ctx, captured } = await boot();
    await ctx.idbSnapshotPut(rec());
    await ctx.renderScanTab();
    const html = captured.scanList.innerHTML;
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(captured.scanSnapshotList.innerHTML).not.toContain('<img');
  });

  it('Suche + Kategorie-Filter (filter): Suche „chatroom" verengt; Kategorie „mods" zeigt 2 Zeilen; Kombination; Zähler aktualisiert', async () => {
    const { ctx, captured } = await boot();
    await ctx.idbSnapshotPut(rec());
    await ctx.renderScanTab();
    captured.scanSearch.value = 'chatroom';
    captured.scanCategory.value = 'all';
    ctx._scanRender();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(4);
    captured.scanSearch.value = '';
    captured.scanCategory.value = 'mods';
    ctx._scanRender();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(2);
    captured.scanSearch.value = 'bcx';
    ctx._scanRender();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(1);
    expect(captured.scanCount.textContent).toContain('1 von 1');
  });

  it('Paging (T-6-06): 1000 Getter → 300 Zeilen + „mehr laden (700 weitere)"; scanLoadMore → 600; nach 1000 kein Button', async () => {
    const { ctx, captured } = await boot();
    const big = rec({ inventory: inv({ globals: { total: 1000, getters: Array.from({ length: 1000 }, (_, i) => 'PagerG' + i), functions: [], values: [] } }) });
    await ctx.idbSnapshotPut(big);
    captured.scanSearch.value = 'pagerg';
    captured.scanCategory.value = 'globals';
    await ctx.renderScanTab();
    ctx._scanRender();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(300);
    expect(captured.scanList.innerHTML).toContain('mehr laden (700 weitere)');
    expect(captured.scanList.innerHTML).toContain('onclick="scanLoadMore()"');
    ctx.scanLoadMore();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(600);
    expect(captured.scanList.innerHTML).toContain('(400 weitere)');
    ctx.scanLoadMore();
    ctx.scanLoadMore();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(1000);
    expect(captured.scanList.innerHTML).not.toContain('mehr laden');
  });

  it('Debounce (T-6-06): zwei schnelle scanOnSearch-Aufrufe → clearTimeout, genau ein 150-ms-Timer, Render erst beim Timer-Lauf', async () => {
    const timers = {
      list: [],
      setTimeout: vi.fn((fn, ms) => { timers.list.push({ fn, ms }); return timers.list.length; }),
      clearTimeout: vi.fn(),
    };
    const { ctx, captured } = await boot({ timers });
    await ctx.renderScanTab();
    timers.list.length = 0;
    timers.clearTimeout.mockClear();
    captured.scanSearch.value = 'zzz-nichts';
    const before = captured.scanList.innerHTML;
    ctx.scanOnSearch();
    ctx.scanOnSearch();
    const pending = timers.list.filter((t) => t.ms === 150);
    expect(pending.length).toBe(2);
    expect(timers.clearTimeout).toHaveBeenCalled();
    expect(captured.scanList.innerHTML).toBe(before);
    pending.at(-1).fn();
    expect(rowsOf(captured.scanList.innerHTML).length).toBe(0);
    expect(captured.scanCount.textContent).toContain('0 von 0');
  });

  it('ohne BASELINE_MANIFEST: alle Badges „unbekannt", Hinweis in scanBaselineInfo, kein Throw', async () => {
    const { ctx, captured } = await boot({ manifest: false });
    await ctx.renderScanTab();
    const infoText = captured.scanBaselineInfo.textContent || captured.scanBaselineInfo.innerHTML;
    expect(infoText).toContain('baseline-manifest.js');
    const html = captured.scanList.innerHTML;
    expect(count(html, 'scan-badge-genutzt')).toBe(0);
    expect(rowsOf(html).length).toBeGreaterThan(0);
    expect(count(html, 'scan-badge-unbekannt')).toBe(rowsOf(html).length);
  });

  it('scanSelectSnapshot wechselt den Datensatz ohne IDB-Neuladen und setzt die Seite zurück', async () => {
    const { ctx, captured } = await boot();
    const a = rec({ inventory: inv({ mods: [{ name: 'NurA', version: '1' }] }) });
    const b = rec({ inventory: inv({ mods: [{ name: 'NurB', version: '1' }] }) });
    await ctx.idbSnapshotPut(a);
    await ctx.idbSnapshotPut(b);
    await ctx.renderScanTab();
    captured.scanCategory.value = 'mods';
    ctx._scanRender();
    expect(captured.scanList.innerHTML).toContain('NurB');
    expect(captured.scanList.innerHTML).not.toContain('NurA');
    ctx.scanSelectSnapshot(a.id);
    expect(captured.scanList.innerHTML).toContain('NurA');
    expect(captured.scanList.innerHTML).not.toContain('NurB');
    expect(evalIn(ctx, '_scanState.shown')).toBe(300);
    expect(count(captured.scanSnapshotList.innerHTML, 'scan-snap-active')).toBe(1);
  });
});

describe('statisch: items.js-Verdrahtung, index.html, docs, scan-tab.js-Quelle', () => {
  it("items.js: 'scan' in TAB_GROUPS.bots und in der Sichtbarkeits-Liste; genau eine geguardete Render-Zeile", () => {
    const items = src('items.js');
    const botsLine = items.split('\n').find((l) => l.includes("bots:  ['bot','shop'"));
    expect(botsLine).toContain("'scan'");
    const visLine = items.split('\n').find((l) => l.includes("['items','outfit','curse','bot','log'"));
    expect(visLine).toContain("'inventar','scan']");
    expect(count(items, "if (tab === 'scan')")).toBe(1);
    expect(count(items, "typeof renderScanTab === 'function'")).toBe(1);
    expect(count(items, 'renderScanTab')).toBe(1);
  });

  it('index.html: Button, Pane, ids, Handler, Optionen, Styles, Write-Zeilen, Kommentar; keine Direktaufrufe der Persistenz', () => {
    const html = src('index.html');
    expect(count(html, 'id="tab-scan-btn"')).toBe(1);
    expect(count(html, "onclick=\"switchTab('scan')\"")).toBe(1);
    expect(count(html, '🔎 Scan<')).toBe(1);
    expect(html.indexOf('id="tab-variablen-btn"')).toBeLessThan(html.indexOf('id="tab-scan-btn"'));
    expect(count(html, 'id="tab-scan"')).toBe(1);
    expect(html.indexOf('id="tab-variablen"')).toBeLessThan(html.indexOf('id="tab-scan"'));
    for (const id of IDS) {
      expect(count(html, 'id="' + id + '"')).toBe(1);
    }
    expect(count(html, 'oninput="scanOnSearch()"')).toBe(1);
    expect(count(html, 'onchange="scanOnFilter()"')).toBe(1);
    expect(count(html, 'onclick="renderScanTab()"')).toBe(1);
    const paneStart = html.indexOf('id="tab-scan"');
    const paneEnd = html.indexOf('<!-- /tab-scan -->');
    const paneSlice = html.slice(paneStart, paneEnd);
    for (const v of ['all', 'globals', 'assets', 'groups', 'hooks', 'mods', 'patching', 'probes']) {
      expect(count(paneSlice, 'value="' + v + '"')).toBeGreaterThanOrEqual(1);
    }
    for (const cls of ['.scan-row', '.scan-badge-genutzt', '.scan-badge-neu', '.scan-badge-unbekannt', '.scan-snap-active']) {
      expect(count(html, cls)).toBeGreaterThanOrEqual(1);
    }
    expect(count(html, 'baseline-manifest.js?_=')).toBe(1);
    expect(count(html, 'scan-tab.js?_=')).toBe(1);
    const scriptEnd = html.indexOf('</script>', html.indexOf('var _cbv = Date.now();'));
    expect(html.indexOf('game-scan.js?_=')).toBeLessThan(html.indexOf('baseline-manifest.js?_='));
    expect(html.indexOf('baseline-manifest.js?_=')).toBeLessThan(html.indexOf('scan-tab.js?_='));
    expect(html.indexOf('scan-tab.js?_=')).toBeLessThan(scriptEnd);
    const loIdx = html.indexOf('LADEREIHENFOLGE');
    const loSlice = html.slice(loIdx, loIdx + 320);
    expect(loSlice).toContain('baseline-manifest.js');
    expect(loSlice).toContain('scan-tab.js');
    expect(count(html, 'idbSnapshotDelete')).toBe(0);
    expect(count(html, 'build-baseline')).toBe(0);
    expect(count(html, 'analyze-snapshot')).toBe(0);
    expect(count(html, 'onclick="deleteGameSnapshot(')).toBe(0);
  });

  it('docs/LOAD-ORDER.md nennt beide Module, Positionen, Guard, CORE_SCRIPTS-Regel', () => {
    const doc = src('docs/LOAD-ORDER.md');
    expect(count(doc, 'scan-tab.js')).toBeGreaterThanOrEqual(3);
    expect(count(doc, 'baseline-manifest.js')).toBeGreaterThanOrEqual(2);
    expect(doc).toContain('renderScanTab');
    expect(doc).toContain('idbSnapshotDelete');
    expect(doc).toContain('npm run baseline');
    expect(doc).toContain('| 9 | `scan-tab.js`');
    expect(doc).toContain('| 18 | `bc-autobackup.js`');
    expect(doc).toContain("'game-scan.js'");
    expect(doc).toContain('332fc2d');
    expect(doc).toContain('GAME_SCAN_DATA');
    expect(doc).toContain('loadOrderFatal');
    expect(doc).toContain('CORE_SCRIPTS');
    expect(doc).toContain('document.write');
  });

  it('scan-tab.js-Quelle: escHtml/escJsAttr-Nutzung, keine eigene Bridge-/IDB-/Schreiblogik, Debounce-Nutzung, Seitengröße', () => {
    const s = src('scan-tab.js');
    expect(count(s, 'escHtml(')).toBeGreaterThanOrEqual(8);
    expect(count(s, "deleteGameSnapshot('${escJsAttr(")).toBe(1);
    expect(count(s, "exportGameSnapshot('${escJsAttr(")).toBe(1);
    expect(count(s, "scanSelectSnapshot('${escJsAttr(")).toBe(1);
    expect(count(s, 'innerHTML +=')).toBe(0);
    expect(count(s, '_debounce(')).toBe(1);
    expect(count(s, 'const SCAN_PAGE_SIZE = 300;')).toBe(1);
    expect(count(s, 'idbSnapshotDelete(')).toBe(1);
    expect(count(s, 'idbSnapshotGetAll(')).toBeGreaterThanOrEqual(1);
    expect(count(s, 'typeof BASELINE_MANIFEST')).toBeGreaterThanOrEqual(1);
    expect(count(s, "addEventListener('message'")).toBe(0);
    expect(count(s, 'postMessage(')).toBe(0);
    expect(count(s, 'indexedDB.open(')).toBe(0);
    expect(count(s, '.delete(')).toBe(0);
    expect(count(s, '.clear(')).toBe(0);
    expect(count(s, 'idbSnapshotPut(')).toBe(0);
    expect(count(s, 'idbSet(')).toBe(0);
    expect(count(s, 'setInterval(')).toBe(0);
    expect(count(s, 'location.origin')).toBe(0);
    expect(count(s, 'toLocaleString')).toBe(0);
    expect(count(s, 'triggerGameScan')).toBeGreaterThanOrEqual(1);
    expect(count(s, 'typeof triggerGameScan')).toBe(1);
  });
});
