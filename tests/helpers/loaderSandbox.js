// Wave 0 (Phase 5, SCAN-13-Folge): loader.js läuft hier erstmals in-process.
// Bisher wurde loader.js nur statisch als Text gelesen (tests/loader-origin.test.js)
// — ohne eine echte Sandbox ist keine der SCAN-02..07-Anforderungen aus Plan
// 05-02 automatisiert testbar (RESEARCH "Wave 0 Gaps").
//
// Stub-Liste und WARUM jeder Stub nötig ist (Planer-Probe, Befund 1):
// - URL: loader.js leitet ALLOWED_ORIGIN per `new URL(POPUP_URL).origin` ab.
// - alert: der Popup-Blocker-Zweig ruft `alert(...)` auf, wenn `window.open`
//   null liefert.
// - open (als Sandbox-Property, `window === sandbox`): loader.js ruft
//   `window.open(POPUP_URL, APP, ...)`, um das Tool-Popup zu öffnen.
// - screen.width/height: Positionierung des Popups (links/oben berechnet).
// - MutationObserver: der Curse-Test-Chat-Observer (`_installChatObserver`)
//   erzeugt eine Instanz und ruft `observe`/`disconnect` darauf.
// - ServerSocket.on/off: Auto-Outfit-Scan (`_installOutfitScan`) und der
//   Curse-Test-Monitor registrieren/entfernen Handler ausschließlich darüber.
// - bcModSdk.registerMod → { hookFunction() {} }: fehlt bcModSdk, retried
//   `installBCXFilter` alle 500ms per `setTimeout` — mit dem Mock läuft die
//   Registrierung synchron durch, kein offener Timer.
// - document.getElementById (liefert bereits `makeElementStub()` aus
//   loadScript.js, also truthy): sonst retried `_installChatObserver` alle 2s.
// - Player/ChatRoomCharacter/ChatRoomData/GameVersion,
//   ChatRoomRegisterMessageHandler: vom Loader referenzierte Spiel-Globals
//   (GameVersion/ChatRoomRegisterMessageHandler sind Vorgriffe auf Plan 05-02).
// - requestIdleCallback: standardmäßig ABWESEND (Safari-Realität, RESEARCH
//   Pitfall 4) — `_BCU_leerlauf` muss ohne diesen Stub auf `setTimeout`
//   zurückfallen; nur mit der Option `requestIdleCallback: true` installiert.
//
// `hits` zählt jeden Zugriff auf Getter/Funktionen/Dynamic*-Asset-Hooks/
// Patching-Funktionen der Fixtures — der Beweis, dass ein Testfall wirklich
// zugreift (Fixture-Selbsttest, Threat T-5-01), nie dass der Enumerator sie
// tatsächlich aufruft.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, makeSandbox, loadInto } from './loadScript.js';

const LOADER_SRC = fs.readFileSync(path.join(REPO_ROOT, 'loader.js'), 'utf8');

function _popupUrl() {
  const m = /const POPUP_URL = '([^']+)'/.exec(LOADER_SRC);
  if (!m) throw new Error('loaderSandbox: POPUP_URL nicht in loader.js gefunden');
  return m[1];
}

export const LOADER_TOOL_ORIGIN = new URL(_popupUrl()).origin;
export const GAME_ORIGIN = 'https://game.test';
export const APP = 'BCKonfigurator';

const DEFAULT_INVENTORY_GROUPS = ['ItemArms', 'ItemTorso', 'ItemTorso2', 'Cloth'];

function _silentConsole() {
  return { log() {}, info() {}, warn() {}, error() {}, debug() {} };
}

export function makeSyntheticAssets({ groups = DEFAULT_INVENTORY_GROUPS, perGroup = 3, hits } = {}) {
  const h = hits || { getter: 0, fn: 0, dynamic: 0, patching: 0 };
  const AssetGroup = [];
  const Asset = [];
  for (const Name of groups) {
    const isItem = Name.startsWith('Item');
    const group = {
      Name,
      Description: 'Gruppe ' + Name,
      Category: isItem ? 'Item' : 'Appearance',
      Family: 'Female3DCG',
      IsRestraint: isItem,
      Clothing: !isItem,
      Zone: [[0, 0, 1, 1]],
      Asset: [],
    };
    AssetGroup.push(group);
    for (let i = 0; i < perGroup; i++) {
      const asset = {
        Name: Name + 'Asset' + i,
        Description: 'Asset ' + i,
        Group: group, // Zirkel: group.Asset enthält dieses Objekt zurück
        ParentItem: i === 0 ? null : Name + 'Asset0',
        Enable: true,
        Visible: true,
        Value: i * 10,
        Difficulty: i,
        Effect: ['Block'],
        Block: [],
        Prerequisite: 'Prereq' + i,
        Extended: i % 2 === 0,
        IsLock: false,
        IsRestraint: isItem,
        AllowLock: true,
        AllowLockType: ['MetalPadlock'],
        DefaultColor: ['Default', '#123456'],
        Layer: [{ Name: 'L1', Priority: 1 }, { Name: 'L2', Priority: 2 }],
        ColorableLayerCount: 2,
        Tint: [{ Color: 0 }],
        ExpressionTrigger: [{ Group: 'Eyes', Name: 'Closed', Timer: 5 }],
        OverrideHeight: { Height: 1, Priority: 2 },
        Category: ['Bondage'],
        Attribute: ['Attr'],
        Gender: null,
        CraftGroup: Name + 'Craft',
        DynamicName() { h.dynamic++; return 'x'; },
        DynamicDescription() { throw new Error('Dynamic* wurde aufgerufen'); },
        DynamicBeforeDraw() { h.dynamic++; },
        DynamicAfterDraw() { h.dynamic++; },
      };
      group.Asset.push(asset);
      Asset.push(asset);
    }
  }
  // Genau ein Waisen-Asset ohne Group — Pitfall-2-Gegenprobe (kein Zirkel-Crash bei fehlender Gruppe)
  Asset.push({ Name: 'OrphanAsset', Description: 'ohne Gruppe', Enable: true, Layer: [] });
  return { Asset, AssetGroup };
}

export function makeBcModSdkMock({ mods, patching, hits } = {}) {
  const h = hits || { getter: 0, fn: 0, dynamic: 0, patching: 0 };
  const registrations = [];
  const modsInfo = mods || [
    { name: 'BCX', fullName: 'Bondage Club Extended', version: '1.1.19-test', repository: 'https://example.test/bcx' },
    { name: 'WCE', fullName: 'Wholesome Club Extensions', version: '6.3.19', repository: 'https://example.test/wce' },
  ];
  function patchEntry(name, hookedByMods, patchedByMods, originalHash) {
    return {
      name,
      original() { h.patching++; },
      originalHash,
      sdkEntrypoint() { h.patching++; },
      currentEntrypoint() { h.patching++; },
      hookedByMods,
      patchedByMods,
    };
  }
  const patchingInfo = patching || new Map([
    ['CommonDrawAppearanceBuild', patchEntry('CommonDrawAppearanceBuild', ['LSCG', 'BCT'], [], 'B02DDFE3')],
    ['ChatRoomMessage', patchEntry('ChatRoomMessage', ['BCX'], ['WCE'], 'AA11BB22')],
    ['ServerSend', patchEntry('ServerSend', ['BCK_BCXFilter'], [], 'CC33DD44')],
  ]);
  return {
    version: '1.2.0',
    apiVersion: 1,
    errorReporterHooks: {},
    registerMod(info) {
      registrations.push(info);
      return { hookFunction() {}, patchFunction() {}, removeHook() {} };
    },
    getModsInfo() { return modsInfo; },
    getPatchingInfo() { return patchingInfo; },
    registrations,
  };
}

export function makeModGlobals(hits) {
  const h = hits || { getter: 0, fn: 0, dynamic: 0, patching: 0 };

  // bcx: öffentliche API ist nicht-enumerierbar (05-CONSOLE-RESULT.json,
  // Object.keys(bcx) === []) — jede Property per defineProperty ohne
  // `enumerable: true`.
  const bcx = {};
  Object.defineProperty(bcx, 'version', { value: '1.1.19-test', enumerable: false, configurable: true });
  Object.defineProperty(bcx, 'getRuleState', { value: function () { h.fn++; }, enumerable: false, configurable: true });
  Object.defineProperty(bcx, 'secret', { get() { h.getter++; return 1; }, enumerable: false, configurable: true });

  return {
    FBC_VERSION: '6.3.19',
    fbcChatNotify() { h.fn++; },
    fbcDisplayText() { h.fn++; },
    wceServerAppearance() { h.fn++; },
    BCX_Loaded: true,
    bcx,
    mbs: {
      MBS_VERSION: '1.10.25',
      API_VERSION: { major: 1, minor: 5 },
      getDebug() { h.fn++; },
      runTests() { h.fn++; },
      wheelEvents: {},
      css: 'x',
    },
    LSCG_Loaded: true,
    LSCG: {
      getModule() { h.fn++; },
      Outfits: {},
      sendLSCGBeep() { h.fn++; },
      HypnoTriggers: ['x'],
    },
    LSCG_SuggestionMiniGameRun() { h.fn++; },
    LSCG_SleepyMiniGameLoad() { h.fn++; },
    ThemedLoaded: true,
    Themed_mainmenuLoad() { h.fn++; },
    Themed_mainmenuRun() { h.fn++; },
    Themed_colorsBackground: 'Sheet',
  };
}

function _makeArityFn(arity, hits) {
  switch (arity) {
    case 0: return function () { hits.fn++; };
    case 1: return function (a) { hits.fn++; return a; };
    case 2: return function (a, b) { hits.fn++; return b; };
    default: return function (a, b, c) { hits.fn++; return c; };
  }
}

function _installSyntheticGlobals(ctx, count, hits) {
  for (let i = 0; i < count; i++) {
    ctx['giData' + i] = i;
    ctx['giStr' + i] = 'v' + i;
    ctx['giObj' + i] = { i };
    ctx['giFn' + i] = _makeArityFn(i % 4, hits);
  }
}

function _installInventoryFunctions(ctx, count, groups, hits) {
  const verbs = ['Load', 'Draw', 'Click'];
  for (let i = 0; i < count; i++) {
    const group = groups[i % groups.length];
    const verb = verbs[i % verbs.length];
    const name = 'InventoryItem' + group + 'Asset' + i + verb;
    if (verb === 'Load') ctx[name] = function (C, ItemGroup) { hits.fn++; };
    else if (verb === 'Draw') ctx[name] = function (C, Item, ItemGroup) { hits.fn++; };
    else ctx[name] = function (event, C, ItemGroup) { hits.fn++; };
  }
  ctx.InventoryGet = function (C, G) { hits.fn++; return null; };
  ctx.InventoryWear = function (C, A, G) { hits.fn++; };
  ctx.InventoryItemHasEffect = function (I, E) { hits.fn++; return false; };
}

export function makeLoaderSandbox(opts = {}) {
  const hits = { getter: 0, fn: 0, dynamic: 0, patching: 0 };
  const opened = [];
  const timerQueue = [];
  const counts = { timeout: 0, ric: 0 };

  const manualTimers = opts.manualTimers === true;
  const wantsRic = opts.requestIdleCallback === true;

  const stubs = {
    console: opts.console || _silentConsole(),
    URL,
    alert() {},
    open(url, name, features) {
      const w = { closed: false, url, name, features, focus() {}, postMessage() {} };
      opened.push(w);
      return w;
    },
    screen: { width: 1920, height: 1080 },
    location: {
      origin: GAME_ORIGIN,
      href: GAME_ORIGIN + '/R131/BondageClub/',
      pathname: '/R131/BondageClub/',
      protocol: 'https:',
      host: 'game.test',
      hostname: 'game.test',
      search: '',
      hash: '',
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    },
    ServerSocket: { on() {}, off() {} },
    Player: { MemberNumber: 1, Name: 'Testspielerin', AssetFamily: 'Female3DCG', Appearance: [] },
    ChatRoomCharacter: [],
    ChatRoomData: { Name: 'Testraum' },
    GameVersion: 'R131',
    ChatRoomRegisterMessageHandler: function (handler) { hits.fn++; },
  };

  if (manualTimers) {
    stubs.setTimeout = (fn) => { timerQueue.push(fn); counts.timeout++; return timerQueue.length; };
    stubs.clearTimeout = () => {};
  }
  // requestIdleCallback bleibt standardmäßig ABWESEND (typeof === 'undefined') —
  // nur mit der Option `true` wird eine manuelle Queue-Variante installiert.
  if (wantsRic) {
    stubs.requestIdleCallback = (fn) => { timerQueue.push(fn); counts.ric++; return timerQueue.length; };
  }

  let assets = { Asset: undefined, AssetGroup: undefined };
  if (opts.withAssets !== false) {
    assets = makeSyntheticAssets({ hits });
    stubs.Asset = assets.Asset;
    stubs.AssetGroup = assets.AssetGroup;
  }

  if (opts.withBcModSdk !== false) {
    stubs.bcModSdk = makeBcModSdkMock({ mods: opts.mods, patching: opts.patching, hits });
  }

  if (opts.withModGlobals !== false) {
    Object.assign(stubs, makeModGlobals(hits));
  }

  const ctx = makeSandbox({ ...stubs, ...(opts.extraGlobals || {}) });

  // Synthetische Globals/Getter werden DIREKT auf ctx gesetzt — VOR dem Laden
  // von loader.js (Planer-Probe, Ablauf-Beschreibung).
  _installSyntheticGlobals(ctx, opts.syntheticGlobals || 0, hits);
  _installInventoryFunctions(ctx, opts.inventoryFunctions || 0, DEFAULT_INVENTORY_GROUPS, hits);

  if (opts.throwingGetter !== false) {
    Object.defineProperty(ctx, 'giThrowingGetter', {
      get() { hits.getter++; throw new Error('Getter mit Nebenwirkung gelesen'); },
      enumerable: true,
      configurable: true,
    });
  }
  if (opts.countingGetter !== false) {
    Object.defineProperty(ctx, 'giCountingGetter', {
      get() { hits.getter++; return 42; },
      enumerable: true,
      configurable: true,
    });
  }

  loadInto(ctx, 'loader.js');

  const posts = [];
  const src = { postMessage(msg, origin) { posts.push({ msg, origin }); }, closed: false };

  function send(data, { origin = LOADER_TOOL_ORIGIN, source = src } = {}) {
    return ctx.__BCK_LISTENER_FN__({ data: { app: APP, ...data }, origin, source });
  }

  // Nimmt der manuellen Timer-Queue Einträge ab und ruft sie auf, bis `pred()`
  // wahr wird, die Queue leer ist oder `max` Ticks erreicht sind.
  function runUntil(pred, max = 200000) {
    let ticks = 0;
    while (!pred() && timerQueue.length > 0 && ticks < max) {
      const fn = timerQueue.shift();
      fn();
      ticks++;
    }
    return ticks;
  }

  // Pollt mit dem HOST-setTimeout (nicht dem Sandbox-Stub) — für asynchrone
  // Erwartungen, die nicht über die manuelle Timer-Queue laufen.
  function waitFor(pred, timeoutMs = 8000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      function poll() {
        if (pred()) { resolve(); return; }
        if (Date.now() - start > timeoutMs) { reject(new Error('waitFor: Timeout')); return; }
        setTimeout(poll, 5);
      }
      poll();
    });
  }

  return { ctx, posts, src, send, hits, timerQueue, counts, runUntil, waitFor, opened, assets };
}
