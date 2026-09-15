// Wave 0 (Phase 5, SCAN-13-Folge): dynamische Ergänzung zu tests/loader-origin.test.js
// (STAB-06, statisch, bewusst unverändert). Diese Datei führt loader.js
// erstmals wirklich aus (tests/helpers/loaderSandbox.js) und beweist die
// Fixtures, die Plan 05-02 (Gamecode-Enumerator) direkt weiterverwendet:
// Getter-Deskriptoren werden sichtbar, aber nie gelesen; Funktionen werden
// erfasst, aber nie aufgerufen; der Asset.Group.Asset-Zirkel bricht
// JSON.stringify; bcModSdk liefert eine Map mit Funktionswerten; bcx' API ist
// nicht-enumerierbar.

import { describe, it, expect } from 'vitest';
import { makeLoaderSandbox, LOADER_TOOL_ORIGIN } from './helpers/loaderSandbox.js';

describe('Loader-Sandbox: loader.js läuft in-process (Wave 0, Phase 5)', () => {
  it('loader.js lädt ohne Throw; genau ein message-Listener; __BCK_LISTENER_FN__ ist Funktion; window.open genau einmal mit POPUP_URL', () => {
    const { ctx, opened } = makeLoaderSandbox();
    expect(opened.length).toBe(1);
    expect(opened[0].url.startsWith(LOADER_TOOL_ORIGIN)).toBe(true);
    expect(ctx._listeners.get('message').length).toBe(1);
    expect(typeof ctx.__BCK_LISTENER_FN__).toBe('function');
    expect(ctx.__BCK_LISTENER__).toBe(true);
  });

  it('PING → PONG an die Tool-Origin', () => {
    const { posts, send } = makeLoaderSandbox();
    send({ type: 'PING' });
    expect(posts).toEqual([{ msg: { app: 'BCKonfigurator', type: 'PONG' }, origin: LOADER_TOOL_ORIGIN }]);
  });

  it('fremde Origin und fremde App werden ignoriert', () => {
    const { ctx, posts, send, src } = makeLoaderSandbox();
    send({ type: 'PING' }, { origin: 'https://evil.test' });
    expect(posts).toHaveLength(0);
    ctx.__BCK_LISTENER_FN__({ data: { app: 'X', type: 'PING' }, origin: LOADER_TOOL_ORIGIN, source: src });
    expect(posts).toHaveLength(0);
  });

  it('Source-Pinning: nach dem ersten Kontakt blockt eine andere Quelle alles außer PING', () => {
    const { posts, send } = makeLoaderSandbox();
    send({ type: 'GET_POS', reqId: 'p1' });
    expect(posts.some((p) => p.msg.type === 'POS_DATA' && p.msg.reqId === 'p1')).toBe(true);

    send({ type: 'GET_POS', reqId: 'p2' }, { source: { postMessage() {} } });
    expect(posts.some((p) => p.msg.reqId === 'p2')).toBe(false);
  });

  it('mit allen Stubs bleiben 0 Timer offen', () => {
    const { ctx, timerQueue } = makeLoaderSandbox({ manualTimers: true });
    expect(timerQueue.length).toBe(0);
    expect(typeof ctx.requestIdleCallback).toBe('undefined');
  });

  it('synthetisches Fenster: Getter als Accessor-Deskriptor sichtbar, nie gelesen', () => {
    const { ctx, hits } = makeLoaderSandbox({ syntheticGlobals: 1000 });
    expect(Object.getOwnPropertyNames(ctx).length).toBeGreaterThanOrEqual(1000);

    const d = Object.getOwnPropertyDescriptor(ctx, 'giThrowingGetter');
    expect(typeof d.get).toBe('function');
    expect(hits.getter).toBe(0);

    expect(() => ctx.giThrowingGetter).toThrow(/Nebenwirkung/);
    expect(hits.getter).toBe(1);

    expect(ctx.giCountingGetter).toBe(42);
    expect(hits.getter).toBe(2);

    expect(typeof ctx.giFn3).toBe('function');
    expect(ctx.giFn3.length).toBe(3);
  });

  it('Inventory-Fixture: Kern- und Item-Funktionen', () => {
    const { ctx } = makeLoaderSandbox({ inventoryFunctions: 20 });
    expect(typeof ctx.InventoryGet).toBe('function');
    expect(ctx.InventoryGet.length).toBe(2);

    const invItemNames = Object.getOwnPropertyNames(ctx).filter((n) => n.startsWith('InventoryItem'));
    expect(invItemNames.length).toBeGreaterThanOrEqual(20);
    expect(invItemNames.some((n) => n.startsWith('InventoryItemItemTorso2'))).toBe(true);
  });

  it('Asset-Fixture: Zirkel Asset.Group.Asset, Dynamic*-Funktionen, Waise', () => {
    const { assets } = makeLoaderSandbox();
    expect(assets.Asset[0].Group.Asset.includes(assets.Asset[0])).toBe(true);
    expect(() => JSON.stringify(assets.Asset[0])).toThrow(/circular/i);
    expect(typeof assets.Asset[0].DynamicName).toBe('function');
    expect(assets.Asset.at(-1).Name).toBe('OrphanAsset');
    expect(assets.Asset.at(-1).Group).toBeUndefined();
    expect(assets.AssetGroup.length).toBe(4);
    expect(assets.Asset.length).toBe(13);
  });

  it('bcModSdk-Mock: getModsInfo Array, getPatchingInfo Map mit Funktionswerten, registerMod liefert hookFunction', () => {
    const { ctx } = makeLoaderSandbox();
    expect(Array.isArray(ctx.bcModSdk.getModsInfo())).toBe(true);
    expect(ctx.bcModSdk.getPatchingInfo()).toBeInstanceOf(Map);
    expect(typeof ctx.bcModSdk.getPatchingInfo().get('CommonDrawAppearanceBuild').original).toBe('function');
    expect(ctx.bcModSdk.registrations.some((r) => r.name === 'BCK_BCXFilter')).toBe(true);
  });

  it('Mod-Globals: bcx-API nicht-enumerierbar, aber per getOwnPropertyNames sichtbar', () => {
    const { ctx, hits } = makeLoaderSandbox();
    expect(Object.keys(ctx.bcx).length).toBe(0);
    const bcxNames = Object.getOwnPropertyNames(ctx.bcx);
    expect(bcxNames).toContain('version');
    expect(bcxNames).toContain('getRuleState');
    expect(bcxNames).toContain('secret');
    expect(ctx.bcx.version).toBe('1.1.19-test');
    expect(ctx.FBC_VERSION).toBe('6.3.19');
    expect(ctx.mbs.API_VERSION.minor).toBe(5);
    expect(ctx.LSCG_Loaded).toBe(true);
    expect(ctx.ThemedLoaded).toBe(true);
    expect(hits.fn).toBe(0);
  });

  it('ohne bcModSdk: Retry-Timer landet in der manuellen Queue (Fixture-Verhalten dokumentiert)', () => {
    // Ohne bcModSdk retried installBCXFilter alle 500ms per setTimeout — mit
    // manualTimers landet dieser Retry in der Queue statt sofort zu feuern.
    // runUntil() existiert genau für solche Faelle: mit Praedikat statt fixer
    // Tick-Zahl abarbeiten, ohne den fehlenden Stub nachzureichen.
    const { timerQueue } = makeLoaderSandbox({ withBcModSdk: false, manualTimers: true });
    expect(timerQueue.length).toBeGreaterThanOrEqual(1);
  });
});
