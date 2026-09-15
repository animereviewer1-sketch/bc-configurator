// Phase 5, Plan 05-02: Enumerator-Tests SCAN-02..07 (+ SCAN-01 Loader-Hälfte)
// gegen die Loader-Sandbox aus Plan 05-01 (tests/helpers/loaderSandbox.js).
//
// Snapshot-Vertrag (Plan 05-02): `GET_GAME_INVENTORY {reqId}` löst
// `buildGameInventory(reqId, post)` in loader.js aus. Der Case kehrt SOFORT
// zurück; die Arbeit läuft gechunkt in Leerlaufpausen und meldet n×
// `GAME_INVENTORY_PROGRESS {reqId, step, total: 6, label}` und genau 1×
// `GAME_INVENTORY_DATA {reqId, snapshot}` (bzw. `{reqId, err}`) an die
// Tool-Origin. `snapshot = { schema, gameVersion, ts, durationMs, globals,
// assets, modSdk, mods, probes, chatHooks, errors }`.
//
// Kernbeweis für SCAN-07 (read-only): die Fixture-Zähler `hits.getter`,
// `hits.fn`, `hits.dynamic`, `hits.patching` MÜSSEN nach einem vollständigen
// Scan 0 bleiben — sie beweisen, dass der Enumerator selbst nie einen Getter
// liest oder eine entdeckte Funktion aufruft (die einzigen dokumentierten
// Ausnahmen sind `bcModSdk.getModsInfo()`/`getPatchingInfo()`, SCAN-05).

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, evalIn } from './helpers/loadScript.js';
import { makeLoaderSandbox, LOADER_TOOL_ORIGIN } from './helpers/loaderSandbox.js';

async function scan(opts = {}, reqId = 'gi_test_1') {
  const sb = makeLoaderSandbox(opts);
  sb.send({ type: 'GET_GAME_INVENTORY', reqId });
  await sb.waitFor(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === reqId));
  const data = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === reqId).msg;
  return { ...sb, data, snapshot: data.snapshot };
}

function progress(sb, reqId) {
  return sb.posts
    .filter((p) => p.msg.type === 'GAME_INVENTORY_PROGRESS' && p.msg.reqId === reqId)
    .map((p) => p.msg);
}

let shared;

describe('GET_GAME_INVENTORY (SCAN-01 Loader-Hälfte)', () => {
  beforeAll(async () => {
    shared = await scan({ syntheticGlobals: 1200, inventoryFunctions: 600 });
  });

  it('Case kehrt sofort zurück, DATA kommt später mit derselben reqId, snapshot ist Objekt', async () => {
    const sb = makeLoaderSandbox();
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'gi_fresh_1' });
    expect(sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA')).toBe(false);
    await sb.waitFor(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA'));
    const data = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA').msg;
    expect(data.reqId).toBe('gi_fresh_1');
    expect(typeof data.snapshot).toBe('object');
    expect(data.err).toBeUndefined();
  });

  it('jede Post trägt app, reqId und geht an die Tool-Origin', () => {
    const reqId = 'gi_test_1';
    const relevant = shared.posts.filter((p) => typeof p.msg.type === 'string' && p.msg.type.startsWith('GAME_INVENTORY_'));
    expect(relevant.length).toBeGreaterThan(0);
    for (const p of relevant) {
      expect(p.msg.app).toBe('BCKonfigurator');
      expect(p.msg.reqId).toBe(reqId);
      expect(p.origin).toBe(LOADER_TOOL_ORIGIN);
    }
  });

  it('PROGRESS: mindestens 6 Meldungen, total 6, step monoton nicht fallend von 1 bis 6, label nicht leer; DATA ist die letzte Post dieser reqId', () => {
    const reqId = 'gi_test_1';
    const prog = progress(shared, reqId);
    expect(prog.length).toBeGreaterThanOrEqual(6);
    let lastStep = 0;
    for (const m of prog) {
      expect(m.total).toBe(6);
      expect(m.step).toBeGreaterThanOrEqual(lastStep);
      lastStep = m.step;
      expect(typeof m.label).toBe('string');
      expect(m.label.length).toBeGreaterThan(0);
    }
    expect(lastStep).toBe(6);
    const relevant = shared.posts.filter((p) => p.msg.reqId === reqId);
    expect(relevant[relevant.length - 1].msg.type).toBe('GAME_INVENTORY_DATA');
  });

  it('zwei gleichzeitige Scans mit eigenen reqIds laufen beide zu Ende', async () => {
    const sb = makeLoaderSandbox();
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'a' });
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'b' });
    await sb.waitFor(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === 'a'));
    await sb.waitFor(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === 'b'));
    const dataA = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === 'a').msg;
    const dataB = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.reqId === 'b').msg;
    expect(dataA.snapshot.globals.total).toBe(dataB.snapshot.globals.total);
    expect(dataA.snapshot.globals.total).toBeGreaterThan(0);
  });

  it('fremde Origin/Quelle: kein Scan', async () => {
    const sb = makeLoaderSandbox();
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'x' }, { origin: 'https://evil.test' });
    await new Promise((r) => setTimeout(r, 50));
    expect(sb.posts.some((p) => p.msg.reqId === 'x')).toBe(false);
  });
});

describe('Global-Klassifizierung (SCAN-02)', () => {
  it('globals.total stimmt mit Object.getOwnPropertyNames(window) überein (von INNEN gemessen — vm-Kontexte zeigen von außen ~66 Intrinsics weniger, Node-Plattformeigenheit); getters/functions/values ohne Überlappung', () => {
    const { snapshot, ctx } = shared;
    const insideTotal = evalIn(ctx, 'Object.getOwnPropertyNames(window).length');
    expect(snapshot.globals.total).toBe(insideTotal);
    expect(snapshot.globals.getters).toContain('giThrowingGetter');
    expect(snapshot.globals.getters).toContain('giCountingGetter');
    expect(snapshot.globals.functions).toContainEqual({ name: 'giFn3', arity: 3 });
    expect(snapshot.globals.functions).toContainEqual({ name: 'InventoryGet', arity: 2 });
    expect(snapshot.globals.values).toContainEqual({ name: 'giData1', type: 'number' });
    expect(snapshot.globals.values).toContainEqual({ name: 'giStr2', type: 'string' });
    expect(snapshot.globals.values).toContainEqual({ name: 'GameVersion', type: 'string' });
    const getterSet = new Set(snapshot.globals.getters);
    for (const f of snapshot.globals.functions) expect(getterSet.has(f.name)).toBe(false);
    for (const v of snapshot.globals.values) expect(getterSet.has(v.name)).toBe(false);
  });

  it('Inventory-Bündelung: ItemTorso2 exklusiv, ItemTorso zählt nur den Rest, InventoryItemHasEffect landet in other', () => {
    const { snapshot, ctx } = shared;
    const groups = snapshot.globals.inventory.groups;
    const torso2 = groups.find((g) => g.prefix === 'InventoryItemItemTorso2');
    expect(torso2).toBeTruthy();
    expect(torso2.group).toBe('ItemTorso2');
    expect(torso2.count).toBeGreaterThan(0);
    expect(torso2.sample.length).toBeLessThanOrEqual(5);
    const torso = groups.find((g) => g.prefix === 'InventoryItemItemTorso');
    expect(torso).toBeTruthy();
    for (const name of torso.sample) {
      expect(name.startsWith('InventoryItemItemTorso')).toBe(true);
      expect(name.startsWith('InventoryItemItemTorso2')).toBe(false);
    }
    expect(snapshot.globals.inventory.other.count).toBeGreaterThanOrEqual(1);
    expect(snapshot.globals.inventory.other.names).toContain('InventoryItemHasEffect');
    const inventoryItemNames = Object.getOwnPropertyNames(ctx).filter((n) => n.startsWith('InventoryItem'));
    const sumGroups = groups.reduce((s, g) => s + g.count, 0);
    expect(sumGroups + snapshot.globals.inventory.other.count).toBe(inventoryItemNames.length);
    for (const f of snapshot.globals.functions) expect(f.name.startsWith('InventoryItem')).toBe(false);
  });

  it('byPrefix: genau die 16 Schlüssel, Inventory-Zähler stimmt mit den eigenen Namen überein', () => {
    const { snapshot, ctx } = shared;
    const names = Object.getOwnPropertyNames(ctx);
    const expectedInventory = names.filter((n) => n.startsWith('Inventory')).length;
    expect(snapshot.globals.byPrefix.Inventory).toBe(expectedInventory);
    const expectedKeys = ['Character', 'Lock', 'Common', 'Player', 'Asset', 'Reputation', 'Skill', 'Pose', 'Dialog', 'Inventory', 'Item', 'Server', 'Assets', 'Online', 'Wardrobe', 'Chat'];
    expect(Object.keys(snapshot.globals.byPrefix).sort()).toEqual(expectedKeys.slice().sort());
  });

  it('Funktionswerte tauchen nirgends auf (structuredClone von globals wirft nicht)', () => {
    expect(() => structuredClone(shared.snapshot.globals)).not.toThrow();
  });
});

describe('Asset-Serialisierung (SCAN-03)', () => {
  it('count/groupCount/items; erstes Item mit Group/ParentItem/Layer/Effect/DefaultColor/ExpressionTrigger/OverrideHeight; zweites mit ParentItem; Waise ohne Group', () => {
    const { snapshot } = shared;
    expect(snapshot.assets.count).toBe(13);
    expect(snapshot.assets.groupCount).toBe(4);
    const items = snapshot.assets.items;
    expect(items.length).toBe(13);
    const first = items[0];
    expect(first.Group).toBe('ItemArms');
    expect(first.ParentItem).toBeNull();
    expect(first.Layer).toEqual({ count: 2, names: ['L1', 'L2'] });
    expect(first.Effect).toEqual(['Block']);
    expect(first.DefaultColor).toEqual(['Default', '#123456']);
    expect(first.ExpressionTrigger[0]).toEqual({ Group: 'Eyes', Name: 'Closed', Timer: 5 });
    expect(first.OverrideHeight).toEqual({ Height: 1, Priority: 2 });
    const second = items[1];
    expect(second.ParentItem).toBe('ItemArmsAsset0');
    const orphan = items.find((it) => it.Name === 'OrphanAsset');
    expect(orphan).toBeTruthy();
    expect(orphan.Group).toBeNull();
    expect(orphan.Layer).toEqual({ count: 0, names: [] });
  });

  it('keine Dynamic*-Keys, kein Gruppenobjekt, kein Zirkel; hits.dynamic bleibt 0', () => {
    const { snapshot, hits } = shared;
    for (const it of snapshot.assets.items) {
      for (const k of Object.keys(it)) expect(k.startsWith('Dynamic')).toBe(false);
      // null (Waise ohne Gruppe) ist erlaubt (typeof null === 'object' in JS,
      // das ist NICHT der verbotene Zirkelbezug — verboten ist nur das rohe
      // Gruppenobjekt selbst).
      expect(it.Group === null || typeof it.Group === 'string').toBe(true);
    }
    expect(() => JSON.stringify(snapshot.assets)).not.toThrow();
    expect(() => structuredClone(snapshot.assets)).not.toThrow();
    expect(hits.dynamic).toBe(0);
  });

  it('Gruppen: ItemTorso2 mit assetCount 3, kein Gruppenobjekt trägt den Key Asset', () => {
    const groups = shared.snapshot.assets.groups;
    expect(groups).toContainEqual(expect.objectContaining({ Name: 'ItemTorso2', assetCount: 3 }));
    for (const g of groups) expect(Object.prototype.hasOwnProperty.call(g, 'Asset')).toBe(false);
  });

  it('Asset[] fehlt → assets.error, Scan läuft trotzdem zu Ende (Globals + Mods vorhanden)', async () => {
    const sb = await scan({ withAssets: false });
    expect(typeof sb.snapshot.assets.error).toBe('string');
    expect(sb.snapshot.globals.total).toBeGreaterThan(0);
    expect(sb.snapshot.mods.length).toBe(2);
    expect(sb.data).toBeTruthy();
  });
});

describe('bcModSdk (SCAN-05)', () => {
  it('mods/modSdk aus bcModSdk; patching-Einträge mit exakt vier Keys; hits.patching bleibt 0', () => {
    const { snapshot, hits } = shared;
    expect(snapshot.mods).toEqual([
      { name: 'BCX', fullName: 'Bondage Club Extended', version: '1.1.19-test', repository: 'https://example.test/bcx' },
      { name: 'WCE', fullName: 'Wholesome Club Extensions', version: '6.3.19', repository: 'https://example.test/wce' },
    ]);
    expect(snapshot.modSdk).toMatchObject({ available: true, version: '1.2.0', modCount: 2, patchingCount: 3 });
    expect(snapshot.modSdk.patching).toContainEqual({
      name: 'CommonDrawAppearanceBuild',
      originalHash: 'B02DDFE3',
      hookedByMods: ['LSCG', 'BCT'],
      patchedByMods: [],
    });
    for (const p of snapshot.modSdk.patching) {
      expect(Object.keys(p).sort()).toEqual(['hookedByMods', 'name', 'originalHash', 'patchedByMods']);
    }
    expect(hits.patching).toBe(0);
  });

  it('ohne bcModSdk: mods leer, modSdk.available false, Probes laufen unabhängig weiter', () => {
    const sb = makeLoaderSandbox({ withBcModSdk: false, manualTimers: true });
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'gi_test_1' });
    sb.runUntil(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA'));
    const data = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA').msg;
    expect(data.snapshot.mods).toEqual([]);
    expect(data.snapshot.modSdk.available).toBe(false);
    expect(data.snapshot.probes.bcx.present).toBe(true);
  });
});

describe('Fallback-Probes (SCAN-06)', () => {
  it('wce: present mit version aus FBC_VERSION, functions enthält fbcChatNotify/wceServerAppearance', () => {
    const { probes } = shared.snapshot;
    expect(probes.wce).toMatchObject({ present: true, version: '6.3.19' });
    expect(probes.wce.functions).toContain('fbcChatNotify');
    expect(probes.wce.functions).toContain('wceServerAppearance');
  });

  it('bcx: present/loaded/version über Deskriptoren, api enthält getRuleState (function) und secret (getter); hits.getter bleibt 0', () => {
    const { probes } = shared.snapshot;
    expect(probes.bcx).toMatchObject({ present: true, loaded: true, version: '1.1.19-test' });
    expect(probes.bcx.api).toContainEqual({ name: 'getRuleState', kind: 'function' });
    expect(probes.bcx.api).toContainEqual({ name: 'secret', kind: 'getter' });
    expect(shared.hits.getter).toBe(0);
  });

  it('mbs: version/apiVersion, api enthält getDebug', () => {
    const { probes } = shared.snapshot;
    expect(probes.mbs).toMatchObject({ present: true, version: '1.10.25', apiVersion: { major: 1, minor: 5 } });
    expect(probes.mbs.api).toContainEqual({ name: 'getDebug', kind: 'function' });
  });

  it('lscg: present/loaded, api enthält getModule, screenFunctions >= 2 mit LSCG_SuggestionMiniGameRun', () => {
    const { probes } = shared.snapshot;
    expect(probes.lscg).toMatchObject({ present: true, loaded: true });
    expect(probes.lscg.api).toContainEqual({ name: 'getModule', kind: 'function' });
    expect(probes.lscg.screenFunctions.count).toBeGreaterThanOrEqual(2);
    expect(probes.lscg.screenFunctions.sample).toContain('LSCG_SuggestionMiniGameRun');
  });

  it('themed: present/loaded, screenFunctionCount >= 2 mit Themed_mainmenuLoad', () => {
    const { probes } = shared.snapshot;
    expect(probes.themed).toMatchObject({ present: true, loaded: true });
    expect(probes.themed.screenFunctionCount).toBeGreaterThanOrEqual(2);
    expect(probes.themed.sample).toContain('Themed_mainmenuLoad');
  });

  it('ohne Mod-Globals: alle fünf Probes present false, sweep leer', async () => {
    const sb = await scan({ withModGlobals: false });
    const { probes } = sb.snapshot;
    for (const key of ['wce', 'bcx', 'mbs', 'lscg', 'themed']) {
      expect(probes[key].present).toBe(false);
    }
    expect(probes.sweep).toEqual([]);
  });

  it('hits.fn bleibt 0 nach dem Standard-Scan (keine Mod-Funktion wurde aufgerufen)', () => {
    expect(shared.hits.fn).toBe(0);
  });
});

describe('Chat-Hook (SCAN-04)', () => {
  it('ChatRoomRegisterMessageHandler exists/arity/kind; Registry ohne Kandidat nicht introspektierbar; hookedChatFunctions aus Patching', () => {
    const { chatHooks } = shared.snapshot;
    expect(chatHooks.ChatRoomRegisterMessageHandler).toEqual({ exists: true, arity: 1, kind: 'data' });
    expect(chatHooks.registry).toEqual({ introspectable: false, checked: ['ChatRoomMessageHandlers'] });
    expect(chatHooks.hookedChatFunctions).toContainEqual({ name: 'ChatRoomMessage', hookedByMods: ['BCX'] });
  });

  it('Registry vorhanden → nur Description/Priority übernommen, Callback nie aufgerufen', async () => {
    const sb = await scan({
      extraGlobals: {
        ChatRoomMessageHandlers: [{ Description: 'Test', Priority: 100, Callback() { throw new Error('Callback aufgerufen'); } }],
      },
    });
    expect(sb.snapshot.chatHooks.registry).toEqual({
      introspectable: true,
      source: 'ChatRoomMessageHandlers',
      count: 1,
      handlers: [{ Description: 'Test', Priority: 100 }],
    });
  });
});

describe('SCAN-07: read-only, gechunkt, klonbar', () => {
  it('werfender Getter und werfende Dynamic*-Funktion bringen den Scan nicht zu Fall; alle Zähler 0', () => {
    expect(shared.hits).toEqual({ getter: 0, fn: 0, dynamic: 0, patching: 0 });
    expect(shared.snapshot.errors).toEqual([]);
  });

  it('structuredClone und JSON.stringify des gesamten Snapshots werfen nicht; alle Posts klonbar', () => {
    expect(() => structuredClone(shared.snapshot)).not.toThrow();
    expect(() => JSON.stringify(shared.snapshot)).not.toThrow();
    for (const p of shared.posts) {
      expect(() => structuredClone(p.msg)).not.toThrow();
    }
  });

  it('Chunking mit setTimeout-Fallback: Case kehrt zurück, bevor die Arbeit erledigt ist; >= ceil(N/500) Ticks', () => {
    const sb = makeLoaderSandbox({ syntheticGlobals: 20000, manualTimers: true });
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'gi_test_1' });
    // Von INNEN gemessen (evalIn) — vm-Kontexte zeigen von außen ~66
    // Intrinsics (Map/RegExp/Promise/...) weniger als von innen, eine
    // Node-Plattformeigenheit, keine loader.js-Eigenschaft.
    const n0 = evalIn(sb.ctx, 'Object.getOwnPropertyNames(window).length');
    expect(sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA')).toBe(false);
    expect(sb.timerQueue.length).toBeGreaterThanOrEqual(1);
    const ticks = sb.runUntil(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA'));
    expect(ticks).toBeGreaterThanOrEqual(Math.ceil(n0 / 500));
    expect(sb.counts.timeout).toBeGreaterThanOrEqual(Math.ceil(n0 / 500));
    expect(sb.counts.ric).toBe(0);
    const data = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA').msg;
    expect(data).toBeTruthy();
    expect(data.snapshot.globals.total).toBe(n0);
  });

  it('requestIdleCallback wird bevorzugt, wenn vorhanden', () => {
    const sb = makeLoaderSandbox({ syntheticGlobals: 3000, manualTimers: true, requestIdleCallback: true });
    sb.send({ type: 'GET_GAME_INVENTORY', reqId: 'gi_test_1' });
    sb.runUntil(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA'));
    expect(sb.counts.ric).toBeGreaterThanOrEqual(Math.ceil(3000 / 500));
    expect(sb.counts.timeout).toBe(0);
  });

  it('Post-Fehler (DataCloneError) wird als err gemeldet, nicht verschluckt', async () => {
    const sb = makeLoaderSandbox();
    sb.ctx.__BCK_buildGameInventory('gi_err', (msg) => {
      if (msg.type === 'GAME_INVENTORY_DATA' && msg.snapshot) {
        const e = new Error('could not be cloned');
        e.name = 'DataCloneError';
        throw e;
      }
      sb.posts.push({ msg, origin: 'direct' });
    });
    await sb.waitFor(() => sb.posts.some((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.err));
    const errPost = sb.posts.find((p) => p.msg.type === 'GAME_INVENTORY_DATA' && p.msg.err);
    expect(errPost.msg.err).toContain('DataCloneError');
  });

  it('gameVersion und Metadaten', () => {
    const { snapshot } = shared;
    expect(snapshot.schema).toBe(1);
    expect(snapshot.gameVersion).toBe('R131');
    expect(typeof snapshot.ts).toBe('number');
    expect(typeof snapshot.durationMs).toBe('number');
  });
});

describe('statisch: Loader-Änderung minimal und read-only', () => {
  const L = fs.readFileSync(path.join(REPO_ROOT, 'loader.js'), 'utf8');

  function count(str, needle) {
    return str.split(needle).length - 1;
  }

  it('Case/Funktion/Exposure genau einmal; Zähler 34; verbotene Aufrufe fehlen; Region enthält Deskriptor-APIs und Chunking; Case-Block antwortet an ev.origin', () => {
    expect(count(L, "case 'GET_GAME_INVENTORY':")).toBe(1);
    expect(count(L, 'function buildGameInventory(reqId, post)')).toBe(1);
    expect(count(L, 'window.__BCK_buildGameInventory = buildGameInventory;')).toBe(1);
    expect((L.match(/ALLOWED_ORIGIN/g) || []).length).toBe(34);

    const lines = L.split('\n');
    const startIdx = lines.findIndex((l) => l.includes('── Gamecode-Inventar'));
    const endIdx = lines.findIndex((l) => l.includes('── PostMessage Listener'));
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(endIdx).toBeGreaterThan(startIdx);
    const region = lines.slice(startIdx, endIdx).join('\n');

    expect(count(region, 'toString(')).toBe(0);
    expect(count(region, 'window[')).toBe(0);
    expect(count(region, 'eval(')).toBe(0);
    expect(count(region, 'new Function')).toBe(0);
    expect(count(region, 'JSON.parse(')).toBe(0);
    expect(count(region, 'Object.getOwnPropertyDescriptor(')).toBeGreaterThanOrEqual(1);
    expect(count(region, 'Object.getOwnPropertyNames(')).toBeGreaterThanOrEqual(2);
    expect(region).toContain('requestIdleCallback');
    expect(region).toContain('setTimeout(');

    const caseStart = lines.findIndex((l) => l.includes("case 'GET_GAME_INVENTORY':"));
    expect(caseStart).toBeGreaterThanOrEqual(0);
    let caseEnd = caseStart;
    for (let i = caseStart; i < lines.length; i++) {
      if (lines[i].includes('break;')) { caseEnd = i; break; }
    }
    const caseBlock = lines.slice(caseStart, caseEnd + 1).join('\n');
    expect(caseBlock).toContain('ev.origin');
    expect(caseBlock).toContain('buildGameInventory(');
  });
});
