# Phase 4: Entflechtung - Research

**Researched:** 2026-09-14
**Domain:** Vanilla-JS module extraction (persistence + postMessage bridge) and additive IndexedDB schema migration, no bundler, in a live 11,872-line monolith
**Confidence:** HIGH (every claim below is grounded in `items.js`/`index.html`/`loader.js` read this session with line numbers, or in a fake-indexeddb probe actually executed this session)

## Summary

Phase 4 extracts two horizontal slices out of `items.js` — `persistence.js` (IDB/localStorage helpers) and `bridge.js` (postMessage protocol + handler registry) — and restructures screenshot storage from three whole-object IDB blobs into one per-record `screenshots` object store. All three targets are **pure extraction + additive schema change**: no message shape, IDB key, or function signature may change as a side effect (Anti-Pattern 1 in `.planning/research/PITFALLS.md`).

Verification this session confirms the milestone-level research (`.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`) is still structurally accurate after Phases 2-3 landed, but every line number it cited has shifted (items.js grew from ~11,684 to 11,872 lines across STAB-08/STAB-09/STAB-10/bridge hardening). This document re-verifies every load-bearing line number against the current source and adds three things the milestone research could not have known in advance: (1) the exact current message-type catalogue (33 cases, lines 6075-6389) and which handler bodies are already delegated to named functions (low risk to move), (2) a working, executed fake-indexeddb probe proving the additive migration pattern (populate-new-store-first, verify count, never touch old blob, `onblocked` fires reliably) actually works under the pinned `fake-indexeddb@6.2.5`, and (3) a scope clarification: SPLIT-01's "localStorage-Helfer" refers to the one generic migration IIFE (lines 68-87), not the 36 scattered ad-hoc `localStorage.getItem/setItem` call sites across items.js for unrelated features (favorites, cache mirror, color themes) — those must NOT be swept into persistence.js in this phase.

**Primary recommendation:** Extract `persistence.js` first (self-contained, ~105 lines, zero external dependents beyond `idbGet`/`idbSet`/`_debounce`), then `bridge.js` as a thin registry+dispatch layer that keeps all 33 existing handler bodies exactly where they are (most already call named functions like `_handleScreenshotData`, `_handleCurseData` — only the `switch` itself and `bcSend`/`_bridgeSenderOk`/origin state move), then the screenshot store migration last, on top of the now-testable persistence layer. Both new files load via the same `document.write` cache-buster pattern used everywhere else, inserted immediately before `items.js`'s existing `document.write` line (`index.html:3091`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| IDB read/write (`idbGet`/`idbSet`/`_idbOpen`) | Browser / Client (persistence.js, new) | — | Pure client-side storage; no server exists (`INTEGRATIONS.md`: no external API) |
| localStorage→IDB migration IIFE | Browser / Client (persistence.js, new) | — | One-time startup migration, same tier as the helpers it calls |
| Debounced batch-save scheduler (`_sammelSpeicher`) | Browser / Client (items.js, unchanged) | — | Orchestrates *when* to call persistence.js writes; stays in the coordinator per PROJECT.md ("items.js bleibt Koordinator") — not itself an IDB primitive |
| postMessage send/receive + origin pinning (`bcSend`, `_bridgeSenderOk`, `_bcOrigin`) | Browser / Client (bridge.js, new) | — | The only trust boundary in the system (`ARCHITECTURE.md`); origin-pinning logic (Phase 3) must move intact, not be re-derived |
| Message-type dispatch (33-case switch) | Browser / Client (bridge.js, new registry) | Browser / Client (items.js, handler bodies) | Registry mechanics move to bridge.js; handler *bodies* mostly already delegate to named functions that stay in items.js — minimizes moved surface area |
| Screenshot storage (per-record IDB) | Browser / Client (persistence.js, new `screenshots` store) | — | Same tier as existing kv store; no new trust/network boundary introduced |
| Loader-side game API access (`loader.js`) | Browser / Client, but a *different* window (game tab) | — | Explicitly out of scope this phase ("loader.js untouched" per constraints); only the tool-side (`items.js`/new files) changes |

No capability in this phase crosses into a server/API tier — the project has none (`INTEGRATIONS.md`: "No external API integrations"; `PROJECT.md`: "kein Server-Backend").

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 5.0.0 | Test runner for `persistence.js`/`bridge.js` | Already installed and in use — `package.json` devDependency, `npm test` currently green: 14 files, 149 passed + 2 expected fail [VERIFIED: package.json:12-17, `npm test` output this session] |
| fake-indexeddb | 6.2.5 | In-memory IDB for Vitest, incl. migration/`onblocked` testing | Already installed; confirmed this session to implement `onblocked` correctly (see Package Legitimacy Audit / migration probe below) [VERIFIED: node_modules/fake-indexeddb/package.json, node_modules/fake-indexeddb/build/cjs/FDBFactory.js:85-148, FDBOpenDBRequest.js:11] |
| Node.js | ≥22.12.0 (engines field) | Runs Vitest locally | [VERIFIED: package.json:6-8] |

No new npm packages are required for this phase — `persistence.js` and `bridge.js` are hand-written extractions of existing code, not new dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `idbGet`/`idbSet` (kept) | `idb-keyval` / `idb` npm wrapper | Rejected for this phase — adding a new dependency during an extraction-only phase combines two changes (Anti-Pattern 1); the existing 65-line implementation is already tested and quota-aware (STAB-02) |
| Single `screenshots` store for all 3 blob kinds (recommended) | Three separate stores (`profileScreenshots`, `lscgScreenshots`, `wheelShots`) | One store with a `kind|key` composite id keeps the `onupgradeneeded` block to one `createObjectStore` call and one migration pass; three stores would triple the boilerplate for no behavioral benefit — recommended: **one store** |

**Installation:** None — no `npm install` needed this phase.

## Package Legitimacy Audit

No new external packages are introduced in Phase 4. `vitest`/`fake-indexeddb`/`lz-string` were already vetted in Phase 1's research and remain unchanged in `package.json`. This section is included per protocol but has nothing new to gate.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none new)* | — | — | — | — | — | N/A — no packages added this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ index.html (static <script> tags, cache-busted via ?_=Date.now())       │
│                                                                          │
│  bc-icons.js, bc-icons-ergaenzung.js  (plain <script src> — L12-13)     │
│         │                                                                │
│         ▼  document.write() chain, L3088-3092 (extended this phase)     │
│  ┌───────────────┐   ┌───────────────┐                                 │
│  │ persistence.js │──▶│ bridge.js      │  (NEW — both load BEFORE      │
│  │ idbGet/idbSet  │   │ bcSend()       │   items.js in the SAME        │
│  │ _idbOpen       │   │ onBridgeMessage│   document.write chain)       │
│  │ _debounce      │   │ _bridgeSenderOk│                                │
│  └───────┬────────┘   └───────┬────────┘                                │
│          │                     │                                        │
│          ▼                     ▼                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ items.js (coordinator) — registers 33 handlers via              │   │
│  │ onBridgeMessage(type, fn); most handler BODIES stay here         │   │
│  │ unchanged (_handleScreenshotData, _handleCurseData, ...)          │   │
│  └───────┬─────────────────────────────────────┬────────────────────┘   │
│          │ document.write chain, L3523-3532      │                       │
│          ▼                                        │                      │
│  money.js, rank.js, shop.js, inventar.js,          │                      │
│  bot-data.js, bot-ui.js, bot-engine.js,            │ persistence.js calls │
│  outfit-import.js, bc-autobackup.js                │ (idbGet/idbSet,      │
│  (each calls idbGet/idbSet — 25 call sites total   │  now per-screenshot  │
│   outside items.js, verified below)                │  puts for the new    │
│                                                     ▼  screenshots store) │
└───────────────────────────────── IndexedDB 'BCKonfigurator' ─────────────┘
                    kv store (v1, unchanged) + screenshots store (v2, NEW)
                                     ▲
                                     │ postMessage(msg, _bcOrigin) — origin-pinned (Phase 3, unchanged)
                    ┌────────────────┴─────────────────┐
                    │ loader.js (game tab) — UNTOUCHED  │
                    │ this phase, per constraint         │
                    └─────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Extracted from (verified line ranges) |
|-----------|----------------|------------------------------------------|
| `persistence.js` (NEW) | `_idbOpen`, `idbGet`, `idbSet`, localStorage→IDB migration IIFE, `_debounce` | `items.js:5-104` [VERIFIED: items.js:5-104, read this session] |
| `bridge.js` (NEW) | `TOOL_ORIGIN`, `_bcOrigin`, `_bridgeSenderOk`, `bcSend`, `manualReconnect`, `startPingRetry`, `_heartbeatCheck`, `onBridgeMessage` registry + the `window.addEventListener('message', ...)` dispatch shell | `items.js:5853-6390` [VERIFIED: items.js:5853-6390, read this session] |
| `items.js` (post-extraction) | Tab rendering, `_sammelSpeicher` batch scheduler, all 33 message-handler *bodies* (registered via `onBridgeMessage`), EXEC log (`_execLog*`, lines 5912-5971 — stays, it's a `bcSend` hook not bridge-core), coordinator role | Same file, shrinks by the ~640 combined lines of the two extracted regions |
| `screenshots` IDB store (NEW) | One record per screenshot, `id = '<kind>|<key>'` (`profile|<name>`, `lscg|<mk>` or `lscg|<mk>|<fp>`, `wheel|<fp>`) | Migration target for `PROFILE_SCREENSHOTS` (`items.js:600-603`), `LSCG_SCREENSHOTS` (`items.js:7633-7641`), `_mbsWheelShots` (`items.js:9536-9545`) |

### Verified persistence surface (SPLIT-01)

```javascript
// items.js:5-65 — VERIFIED verbatim, this is what moves to persistence.js
const _IDB_NAME    = 'BCKonfigurator';
const _IDB_VERSION = 1;
const _IDB_STORE   = 'kv';
let   _IDB_DB      = null;

function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
    };
    req.onsuccess = e => { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbGet(key) { /* items.js:23-33, unchanged */ }
let _idbFehlerGemeldet = 0;
async function idbSet(key, value) { /* items.js:42-65, unchanged — calls showStatus() via typeof-guard */ }
```

`idbSet`'s error path (`items.js:57`) calls `showStatus(...)` guarded by `typeof showStatus === 'function'`. `showStatus` is defined much later in the same file (`items.js:6415`). **This guard is exactly the pattern SPLIT-04's runtime check should reuse** — it already proves the codebase's own convention for tolerating cross-module forward references safely, because `idbSet` is only ever *called* asynchronously (after `showStatus` has had time to load), never at `persistence.js`'s own top-level parse time.

`_IDB_VERSION = 1` today [VERIFIED: items.js:6]. SPLIT-05/06 require bumping this to `2` when the `onupgradeneeded` handler adds the `screenshots` store — this bump belongs in `persistence.js` after extraction, in the same commit that adds the new store creation, not before.

**No `idbDel`/`idbKeys`/`idbDelete` helper exists anywhere in the codebase** [VERIFIED: `grep -rn "idbDel\|idbKeys\|idbDelete" *.js` → no matches]. All existing "deletes" are `idbSet(key, mutatedWholeObject)` calls. `persistence.js` will need a **new** `idbDeleteRecord(store, id)` or equivalent for the per-screenshot store (deleting a specific screenshot users confirm-delete today) — this is a new primitive, not an extraction, and should be scoped explicitly as such in the plan.

### Cross-file `idbGet`/`idbSet` callers (load-order-relevant, SPLIT-04)

| File | `idbGet(`/`idbSet(` calls | Loads via |
|------|---------------------------|-----------|
| items.js | 51 | `index.html:3091` document.write |
| bot-data.js | 10 | `index.html:3528` document.write (chained from inside items.js's own document.write output — executes after items.js fully parses) |
| inventar.js | 4 | `index.html:3527` |
| outfit-import.js | 4 | `index.html:3531` |
| shop.js | 2 | `index.html:3526` |
| rank.js | 2 | `index.html:3525` |
| money.js | 2 | `index.html:3524` |
| bc-autobackup.js | 2 | `index.html:3532` |
| bot-ui.js | 1 | `index.html:3529` |

[VERIFIED: `grep -c "idbGet(\|idbSet(" <file>` per file, this session] Every one of these 9 dependent files loads via `document.write` **after** `items.js`'s own `document.write` call has fully executed (classic-script `document.write` during synchronous parsing inserts and runs the new `<script>` immediately, blocking further parsing until it completes) — so a single `persistence.js` insertion point immediately before `items.js`'s write (see SPLIT-04 below) is sufficient; no other file needs its own separate persistence.js insertion.

Two dependents call `idbGet` at their own top-level parse time (not inside a later async handler): `bot-data.js:91` (`idbGet(BOT_VARS_KEY).then(...)`) and `bc-autobackup.js:64` (inside an async IIFE). Both are safe under the verified load order above since `persistence.js` will have already run by the time either file parses.

### Verified bridge surface (SPLIT-02)

```javascript
// items.js:5853-5866 — module state that moves to bridge.js
const APP = 'BCKonfigurator';               // items.js:5853 (NOT to move — see note)
const TOOL_ORIGIN = window.location.origin; // items.js:5858
let _bcOrigin = null;                        // items.js:5866
```

Note: `const APP = 'BCKonfigurator'` (`items.js:5853`) is referenced by `bcSend`, the message listener, AND ~10 generated-game-code string templates (`+ '...",TOOL_ORIGIN...'` blocks around lines 2548-2739, 5318-5321, 7778-8114, 10116-10118) that are pure string concatenation, not live references — `APP` itself should move to `bridge.js` since it's bridge protocol state, but the generated-code string literals that embed `"BCKonfigurator"` directly (already hardcoded as a JSON string in the injected code, not a live `APP` reference) are unaffected either way.

**Message dispatch — full verified catalogue (`items.js:6050-6390`):**

| Type | Line | Handler body |
|------|------|---------------|
| `PONG` | 6077 | inline (connection state, `_pushCurseDBToBC`, `startRoomScan`, `_triggerAutoScan`) |
| `CACHE_DATA` | 6124 | inline (DOM updates + `CACHE` global assignment + `localStorage.setItem('BC_CACHE_v12', ...)`) |
| `POS_DATA` | 6148 | → `_handlePosData(ev.data)` |
| `PLAYER_DATA` | 6152 | inline (player-check confirm dialog, `renderRoomMembers`) |
| `BOT_EV_STATUS` | 6182 | → `_evIntervalStatusUpdate(...)` |
| `BOT_LOG` | 6185 | → `logPush(ev.data.entry)` |
| `BOT_MONEY` | 6189 | → `_moneyApply(...)` |
| `BOT_SHOP` | 6193 | → `_shopLogPurchase(ev.data)` |
| `BOT_RANG` | 6198 | → `_rankApply(...)` |
| `BOT_SET_ZONE` | 6202 | → `_botSetZone(...)` |
| `BOT_VAR` | 6206 | → `_botVarApply(...)` |
| `BOT_PROBE` | 6211 | → `_probeEmpfangen(ev.data)` |
| `BOT_KEYBERICHT` | 6216 | → `_keyBerichtZeigen(...)` |
| `BOT_INVENTAR` | 6220 | → `_invApply(ev.data)` |
| `BOT_MAPKEY` | 6224 | → `_playerKeyApply(...)` |
| `RANG_INIT` | 6228 | inline (mutates `_rankData.players`) |
| `MONEY_INIT_NEW` | 6246 | inline (mutates `_money.balances`) |
| `MONEY_QUERY` | 6262 | inline (reads `_money.balances`, calls `bcSend({type:'EXEC',...})`) |
| `BOT_ROOM_EVER` | 6283 | inline (`localStorage` read/write of `BC_RoomEver_v1`) |
| `EXEC_OK` | 6294 | inline (`showStatus`) |
| `EXEC_ERR` | 6299 | inline (`showStatus`) |
| `CURSE_DATA` | 6304 | → `_handleCurseData(ev.data)` |
| `LSCG_CACHE_DATA` | 6308 | inline (`Object.assign(CURSE_CACHE_LSCG, ...)`) |
| `CRAFT_CACHE_DATA` | 6316 | inline (merges into `CURSE_DB`) |
| `WEAR_CURSE_OK` | 6330 | inline (`showStatus`) |
| `WEAR_CURSE_ERR` | 6334 | inline (`showStatus`) |
| `CT_CHAT_MSG` | 6338 | → `_ctHandleChatMsg(...)` |
| `CHAR_APPEARANCE_DATA` | 6344 | inline (resolves `_pendingOutfitSave[reqId]` callback) |
| `DEFAULT_OUTFIT_DATA` | 6353 | inline (mutates `CURSE_DEFAULT_OUTFIT_CODE`) |
| `SCREENSHOT_DATA` | 6365 | → `_handleScreenshotData(ev.data)` |
| `CANVAS_PREVIEW_DATA` | 6369 | → `_handleCanvasPreviewData(ev.data)` |
| `OUTFIT_SCAN_DATA` | 6373 | → `_handleOutfitScanData(ev.data)` |
| `LSCG_OUTFITS_DATA` | 6377 | → `_handleLscgOutfitsData(ev.data)` |
| `MBS_WHEEL_DATA` | 6381 | → `_handleMbsWheelData(ev.data)` |
| `LOCKS_DATA` | 6385 | → `_handleLocksData(ev.data)` |

[VERIFIED: items.js:6075-6389, read in full this session] 21 of 33 cases already delegate to a named function that stays in `items.js`. The remaining 12 are inline but short (1-20 lines each) and mutate only items.js-local globals (`CACHE`, `_rankData`, `_money`, `CURSE_CACHE_LSCG`, `CURSE_DB`, `CURSE_DEFAULT_OUTFIT_CODE`, `_pendingOutfitSave`) — **none of these need to move**; `bridge.js` only needs to own the `switch`'s replacement (the registry) and re-dispatch to whatever `items.js` registered.

**A second, independent listener exists** at `items.js:8069-8090` (`debugOsOutfit`'s `OUTFIT_DEBUG_RESULT` correlated one-shot response, registered/removed dynamically via raw `window.addEventListener('message', handler)` — not through the type-switch). It calls `_bridgeSenderOk(ev)` directly (`items.js:8069`). `bridge.js` must export `_bridgeSenderOk` as a global (dual-export, Pattern B) so this one-off pattern keeps working unchanged — **do not** force this correlated-response pattern into the `onBridgeMessage(type, fn)` registry; it is structurally different (single-use, reqId-correlated) and forcing it would be a behavior change, not a pure move.

**External `bcSend` callers outside items.js** (confirms bridge.js's public API surface): `bot-engine.js:3254,3300,3315,3343,3350` (5 real calls — all `{type:'EXEC',...}`) and `bot-data.js:401,910` (2 real calls) [VERIFIED: `grep -n "bcSend(" bot-engine.js bot-data.js`]. `bot-engine.js` additionally contains ~40 occurrences of the *string* `TOOL_ORIGIN` inside generated-game-code template literals (Phase 3 work) — those are unrelated to the tool-side `bcSend` extraction and must not be touched.

### Pattern 1: Dual-export global script (SPLIT-01/02 testability)

```javascript
// persistence.js — bottom of file
window.idbGet = idbGet;
window.idbSet = idbSet;
window._idbOpen = _idbOpen;
window._debounce = _debounce;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { idbGet, idbSet, _idbOpen, _debounce };
}
```

Tests can load it two ways, both already supported by the existing test harness:
1. `loadScript(['persistence.js', 'bridge.js', 'items.js'])` — the vm-sandbox loader (`tests/helpers/loadScript.js:171-180`) already accepts an array and loads files into the **same** sandbox in order [VERIFIED: tests/helpers/loadScript.js:171-180, read this session — `loadScript(files, extraGlobals)` loops `loadInto(sandbox, file)` per file]. Current tests call `loadScript(['items.js'])` only [VERIFIED: tests/idb-helpers.test.js:8]; extending the array is the only change needed to those tests' setup, no new helper required.
2. `import { idbGet, idbSet } from '../persistence.js'` — native ESM import, works because `tests/package.json` sets `"type": "module"` [VERIFIED: tests/package.json] independent of the repo root's `"type": "commonjs"` [VERIFIED: package.json:5].

### Pattern 2: Handler-registry bridge (SPLIT-02/03)

```javascript
// bridge.js (NEW)
const _bridgeHandlers = new Map(); // type -> array of handler fns

function onBridgeMessage(type, fn) {
  if (!_bridgeHandlers.has(type)) _bridgeHandlers.set(type, []);
  _bridgeHandlers.get(type).push(fn);
}

window.addEventListener('message', function(ev) {
  if (!ev.data || ev.data.app !== APP) return;
  if (!_bridgeSenderOk(ev)) { console.warn('[BCK-Popup] message von fremder Quelle/Origin ignoriert:', ev.origin); return; }
  if (_playerAbgelehnt) return;                          // items.js global — still readable, classic-script shared scope
  if (!_bcOrigin && ev.origin && ev.origin !== 'null') _bcOrigin = ev.origin;
  _lastMsgTs = Date.now();
  if (/^(BOT_|RANG_INIT|MONEY_INIT_NEW)/.test(String(ev.data.type || '')) &&
      typeof _botRueckschreibStart === 'function') _botRueckschreibStart();
  const handlers = _bridgeHandlers.get(ev.data.type);
  if (handlers) for (const fn of handlers) fn(ev);
});
```

```javascript
// items.js (post-extraction) — registers instead of switching
onBridgeMessage('SCREENSHOT_DATA', (ev) => _handleScreenshotData(ev.data));
onBridgeMessage('CURSE_DATA',      (ev) => _handleCurseData(ev.data));
onBridgeMessage('CACHE_DATA', (ev) => { /* the 20-line inline body, unchanged, just moved into a function */ });
// ... 31 more registrations, one per row in the table above
```

`_playerAbgelehnt`, `_lastMsgTs`, `_botRueckschreibStart` are items.js globals referenced inside the listener body — since both files are classic scripts sharing one global scope, this works unchanged as long as `bridge.js` loads **before** first use (not necessarily before *declaration* — `_playerAbgelehnt` is only read when a message actually arrives, always after items.js has finished its own top-level execution).

### Pattern 3: Additive per-screenshot IDB store (SPLIT-05/06) — VERIFIED via executed probe

This session ran a real fake-indexeddb script (not merely written — **executed**, output captured below) proving the exact sequence the plan should implement:

```javascript
// persistence.js — screenshots store, added in the same onupgradeneeded that bumps _IDB_VERSION to 2
function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, 2); // _IDB_VERSION bumped 1 -> 2
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
      if (!db.objectStoreNames.contains('screenshots')) {
        db.createObjectStore('screenshots', { keyPath: 'id' }); // id = 'profile|<name>' | 'lscg|<mk>' | 'lscg|<mk>|<fp>' | 'wheel|<fp>'
      }
    };
    req.onblocked = () => {
      // SPLIT-06: surface visibly, never hang silently
      if (typeof showStatus === 'function') {
        showStatus('⚠️ Bitte alle anderen Tabs des Configurators schließen, um das Datenbank-Update abzuschließen', 'error');
      }
    };
    req.onsuccess = e => { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror   = e => reject(e.target.error);
  });
}
```

**Executed probe output** (script run this session against the repo's pinned `fake-indexeddb@6.2.5`, not just written):

```
[1] v1 blob written, keys: 3
[2] onblocked fired (expected while dbV1 stays open)
[2] blockedFired after 20ms (v1 still open): true
[2] v2 open resolved after close(), blockedFired total: true
[3] migratedCount: 3 newCount: 3 match: true
[3] old blob still present after migration: true keys: 3
ALL ASSERTIONS PASSED
```

This falsifies the concern (raised by `.planning/research/PITFALLS.md` Pitfall 9) that `fake-indexeddb` might not model `onblocked` correctly — it does, reliably, with a second connection held open exactly as a real second tab would. [VERIFIED: executed `node` script against `node_modules/fake-indexeddb@6.2.5` this session; source also confirms `onblocked` wiring at `node_modules/fake-indexeddb/build/cjs/FDBFactory.js:85-148` and `FDBOpenDBRequest.js:11`]

**Migration procedure (concrete, do in this order):**
1. `onupgradeneeded` (version 1→2): create `screenshots` store only. Do not touch `kv` or read any data here (transaction is version-locked and synchronous-only; reading `PROFILE_SCREENSHOTS` here is possible but riskier — prefer step 2, post-open).
2. On next app start, after `_idbOpen()` resolves: read the three legacy blobs (`idbGet('BC_PROFILE_SCREENSHOTS_v1')`, `idbGet('BC_LSCG_SCREENSHOTS_v1')`, `idbGet(_MBS_WHEEL_SS_KEY)`), write one `put({id, img})` per entry into `screenshots`, verify `Object.keys(blob).length === (count of records written for that kind)`, then set a single marker key `BC_ScreenshotsMigrated_v1 = { done: true, profileCount, lscgCount, wheelCount, ts: Date.now() }` via the **existing** `idbSet` (kv store, unchanged).
3. **Never delete** `BC_PROFILE_SCREENSHOTS_v1` / `BC_LSCG_SCREENSHOTS_v1` / the wheel key — matches `PROJECT.md`'s explicit Out-of-Scope line ("Löschen des Alt-Blobs `PROFILE_SCREENSHOTS` nach Migration") and the Datenschutz-Regel.
4. After the marker is set, **stop calling** `_saveProfileScreenshotsJetzt()`/`_saveLscgScreenshotsJetzt()`/`_saveMbsWheelShotsJetzt()` (the full-object `idbSet` calls) — replace their call sites with new per-key writes (`putScreenshot(kind, key, img)` in persistence.js). The old blob is now a frozen point-in-time snapshot, not deleted, satisfying "never lose data" while satisfying SPLIT-05 "no longer serializes the whole object."
5. All existing ~40 read sites (`PROFILE_SCREENSHOTS[name]`, `LSCG_SCREENSHOTS[key]`, `_mbsWheelShots[fp]`) **keep working unchanged** — the in-memory objects (`PROFILE_SCREENSHOTS`, `LSCG_SCREENSHOTS`, `_mbsWheelShots`) stay as write-through read caches, populated at startup from the **new** store (not the old blob) once migration is done. This is the "write-through cache" strategy from `ARCHITECTURE.md`, confirmed as minimal-risk: **recommended over rewriting the 40+ read call sites**, since none of them need to change shape or semantics.

### Anti-Patterns

- **Combining the screenshot-store migration with a behavior fix** (e.g. "also fix the LSCG key-mismatch bug while I'm in here") — that bug (`_syncLscgScreenshotToProfiles`) was already fixed in Phase 2/STAB-01; touching that code again in Phase 4 without a specific requirement re-introduces Anti-Pattern 1 risk.
- **Sweeping all 36 raw `localStorage.getItem/setItem` call sites in items.js into persistence.js** "while extracting the IDB helpers" — SPLIT-01 only requires the IDB helpers + the one generic migration IIFE (`items.js:68-87`) to move. The other 36 sites (favorites, `BC_CACHE_v12` mirror, `BC_RoomEver_v1`, color themes, wheel sort) are unrelated single-purpose reads/writes with no shared helper today [VERIFIED: `grep -n "localStorage\." items.js` — 36 lines, no wrapper function found via `grep -n "function.*[Ll]ocalStorage" items.js *.js` → zero matches]. Moving them would be an unscoped, high-risk refactor with no requirement backing it.
- **Forcing the `debugOsOutfit` correlated one-shot listener into `onBridgeMessage`** — see Pattern 2 note above; it is structurally a different mechanism (reqId-correlated, self-removing) and must keep using raw `addEventListener`/`_bridgeSenderOk` directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Testing plain global `<script>` files unmodified | A bundler/module wrapper to make `items.js` importable | `tests/helpers/loadScript.js`'s existing `vm`-sandbox loader (Pattern A, already built) | Zero source changes needed; already proven for 149 passing tests |
| Detecting "did persistence.js load before items.js" | A custom module-loader/dependency-graph library | A one-line `typeof idbGet !== 'function'` guard at the top of items.js (SPLIT-04) — same idiom `idbSet` already uses for `showStatus` (`items.js:57`) | The codebase already has this exact pattern proven working; no new abstraction needed |
| IDB `onblocked`/migration testing | Hand-rolled IDB mock | `fake-indexeddb@6.2.5`, already pinned, already proven this session to fire `onblocked` correctly | Verified via executed probe (see Pattern 3) — reinventing this is pure risk with no benefit |

**Key insight:** Every "don't hand-roll" item in this phase already has a working, in-repo precedent from Phases 1-3. This phase's risk is almost entirely in *sequencing and scope discipline* (move code verbatim, in small slices, verifying the full suite after each), not in needing new tooling.

## Runtime State Inventory

> Included because SPLIT-05/06/07 change the on-disk (IndexedDB) shape of already-persisted user data — the canonical "migration phase" trigger.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Three whole-object IDB blobs under `BC_PROFILE_SCREENSHOTS_v1`, `BC_LSCG_SCREENSHOTS_v1`, and the wheel-shots key (`_MBS_WHEEL_SS_KEY`, value confirmed at `items.js:9536-9545`) [VERIFIED: items.js:601-603, 7633-7641, 9536-9545] — real per-user screenshot counts are unknowable from the repo (data lives only in the author's own browser's IndexedDB, no export sample present in the repo). **No observation possible this session** on real-world entry counts; the only verified upper bound is `LSCG_MAX_VERSIONS = 1500` per member [VERIFIED: items.js:8339, 8683-8684, 10278-10279] (a version-count cap, not a screenshot-count cap — most versions have no screenshot). Additive migration (Pattern 3) required; old blobs never deleted. |
| Live service config | None — no external service (game session state lives only in the BC tab via `loader.js`, which is untouched this phase; no server-side config exists per `INTEGRATIONS.md`). |
| OS-registered state | None — this tool has no OS-level task scheduler entries, pm2 processes, or launchd/systemd units. Browser tab/window only. |
| Secrets/env vars | None — `.planning/config.json` confirms no secrets management is in scope; the tool has no API keys or auth tokens (`INTEGRATIONS.md`: no external API integrations). |
| Build artifacts | None — no build step exists (`package.json` has no `build` script; production deploy is a raw file copy to GitHub Pages). `node_modules`/`package-lock.json` are dev-only and already excluded from the deploy surface. |

## Common Pitfalls

### Pitfall 1: Extraction reorders script execution and breaks implicit-global dependencies (Entflechtung-specific)

**What goes wrong:** `persistence.js`/`bridge.js` must be inserted into the `document.write` chain (`index.html:3088-3092`) in the correct position — before `items.js`'s own `document.write('<scr'+'ipt src="items.js...')` call, not after.
**Why it happens:** No bundler means no dependency graph; only physical script order matters, and `document.write` chains make the "physical order" span two different `<script>` blocks separated by ~2400 lines of HTML (`index.html:3092` vs `3523`).
**How to avoid:** Insert the new `document.write` lines **inside the same `<script>` block** that already writes `items.js` at `index.html:3088-3092`, immediately before that line — reusing the already-declared `var _cbv = Date.now()` from the same block:
```html
<script>
var _cbv = Date.now();
document.write('<scr'+'ipt src="persistence.js?_='+_cbv+'"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="bridge.js?_='+_cbv+'"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="items.js?_='+_cbv+'"><\/scr'+'ipt>');
</script>
```
Add SPLIT-04's runtime guard as the very first line of `items.js` (and of `bridge.js`, guarding on `idbGet`):
```javascript
if (typeof idbGet !== 'function') { document.write('<div style="padding:40px;font-family:monospace;color:#f66">FATAL: persistence.js hat nicht geladen — Ladereihenfolge in index.html prüfen.</div>'); throw new Error('persistence.js must load before items.js'); }
```
**Warning signs:** `ReferenceError: idbGet is not defined` on load (loud, easy) — but also test with a hard refresh (not just a cached warm reload), since `document.write`'s synchronous insertion masks reordering bugs that only appear on first parse.
**Phase to address:** Entflechtung (this phase) — both the guard and the load-order comment should land in the *same* commit as the first extraction, per `.planning/research/PITFALLS.md` Pitfall 1.

### Pitfall 2: `var`/duplicate-declaration shadowing during the transition window

**What goes wrong:** Copy-then-delete extraction risks leaving a duplicate `idbGet`/`bcSend` in both `items.js` and the new file simultaneously.
**How to avoid:** Delete the moved code from `items.js` in the **same commit** that adds it to the new file — never a "just in case" leftover copy. A quick regression gate: `grep -c "^function idbGet" items.js persistence.js` must equal `0 1` (zero in items.js, one in persistence.js) after the SPLIT-01 commit.
**Phase to address:** This phase, each extraction commit.

### Pitfall 3: IDB migration blocked by a second tab, or partially applied then abandoned

**Already mitigated by design** (Pattern 3 above): populate-new-then-verify-then-mark-done, `onblocked` surfaced visibly, old blob never touched. The remaining risk is **not re-triggering** `onupgradeneeded` on a retry after a failed migration pass (version already at 2) — mitigate by keying the "did migration run" check off the `BC_ScreenshotsMigrated_v1` marker, not off the DB version number, so a partial failure (marker never written) causes a retry on next load regardless of DB version.
**Phase to address:** This phase, SPLIT-06 task.

### Pitfall 4: Quota exceeded specifically during the migration write pass

**How to avoid:** Check `navigator.storage.estimate()` (already implemented for STAB-03, `items.js:569-583`) before starting the migration pass and warn if headroom is under ~2x the combined blob size; if an individual `put()` in the migration loop throws `QuotaExceededError`, stop the loop (leave the old blob intact, do not set the "done" marker) so the migration retries on next load rather than silently completing partially.
**Phase to address:** This phase, SPLIT-06 task — reuse the existing `_speicherFormat`/`estimate()` helpers, no new API needed.

## Code Examples

### index.html script tag change (SPLIT-04)

```html
<!-- index.html:3088-3092, VERIFIED current state before this phase -->
<script>
var _cbv = Date.now();
document.write('<scr'+'ipt src="items.js?_='+_cbv+'"><\/scr'+'ipt>');
</script>
```
becomes (only insertion, per Pitfall 1 above — 2 new lines, 0 deletions):
```html
<script>
var _cbv = Date.now();
document.write('<scr'+'ipt src="persistence.js?_='+_cbv+'"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="bridge.js?_='+_cbv+'"><\/scr'+'ipt>');
document.write('<scr'+'ipt src="items.js?_='+_cbv+'"><\/scr'+'ipt>');
</script>
```
Add a load-order comment directly above (SPLIT-04's "documented" requirement):
```html
<!-- LOAD ORDER (do not reorder): persistence.js -> bridge.js -> items.js -> feature modules -->
```

### JSON export before migration (SPLIT-07) — reuse existing export machinery

`exportAllData()` (`items.js:7305-7375`) [VERIFIED: read this session] already bundles `lscgScreenshots`, `profileScreenshots`, and `mbsWheelShots` into one streamed-JSON download (`_jsonParts` chunking avoids the V8 512MB string limit — `items.js:7354-7358`). Add a dedicated smaller export reusing the same `_jsonParts`/`Blob` pattern, offered specifically before the migration runs:

```javascript
function exportScreenshotsOnly() {
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), tool: 'BC Konfigurator - Screenshot-Export vor Migration' },
    profileScreenshots: PROFILE_SCREENSHOTS,
    lscgScreenshots:    LSCG_SCREENSHOTS,
    mbsWheelShots:      _mbsWheelShots,
  };
  const parts = _jsonParts(payload); // reuse — already handles the size limit
  const blob  = new Blob(parts, { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'BC_Screenshots_vor_Migration_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
```

UI placement: model on the existing Tweaks-panel sections (`index.html:2457-2478`) — insert a new `<div>` block with the same `tweaks-section-title`/`tweaks-btn-group` structure directly after `📜 EXEC-Log` (`index.html:2465-2472`), titled e.g. `🖼️ Screenshot-Migration`, containing the export button and, once migration has run, the read-only status (`profileCount`/`lscgCount`/`wheelCount`/`ts` from the `BC_ScreenshotsMigrated_v1` marker).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Screenshot save = full-object `idbSet(key, wholeBlob)` per debounced batch | Per-record `put({id, img})` into a dedicated `screenshots` store | This phase (SPLIT-05) | A single screenshot save no longer re-serializes potentially hundreds of other images; matches the `LSCG_DB`/`CURSE_DB` growth pattern already flagged as a performance trap in `.planning/research/PITFALLS.md` |
| `items.js` owns IDB + postMessage directly | `persistence.js`/`bridge.js` own them; `items.js` is a peer consumer | This phase (SPLIT-01/02/03) | Sets up Phase 5/6 (`game-scan.js`) to add new message types via `onBridgeMessage` without touching `items.js` at all |

**Deprecated/outdated:** None — this phase does not remove any capability, only relocates code and adds an additive store.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | SPLIT-05's requirement text ("...serialisiert nicht mehr das gesamte PROFILE_SCREENSHOTS-Objekt oder LSCG_DB") is interpreted as referring to `LSCG_SCREENSHOTS` (the screenshot blob), not the outfit-metadata store `LSCG_DB` itself — verified that `_saveLscgDB()` (`items.js:8616-8620`) already writes only outfit codes/fingerprints, never images, under a separate key (`LSCG_IDB_KEY`) [VERIFIED: items.js:8616-8620]. If the requirement literally also wants `LSCG_DB` (1500 versions/member, code+metadata) restructured to per-record storage, that is a materially larger scope not covered by this research. | Standard Stack / SPLIT-05 discussion | Planner scopes only screenshots; if the user actually meant LSCG_DB too, a follow-up phase/plan revision is needed |
| A2 | One shared `screenshots` IDB store (keyed `kind|key`) for all three screenshot kinds (profile/lscg/wheel) is recommended over three separate stores — based on minimizing `onupgradeneeded` complexity, not on any explicit requirement preference. | Alternatives Considered, Pattern 3 | Low risk either way; if the planner/user prefers three stores, the migration logic changes only in how many `createObjectStore` calls exist, not in the overall procedure |
| A3 | Real-world screenshot counts (how many entries in `PROFILE_SCREENSHOTS`/`LSCG_SCREENSHOTS` today) could not be observed — no export sample exists in the repo and the data lives only in the author's browser. The migration design assumes "could be large enough that a full JS-thread loop over all entries during migration should be chunked defensively," but this is not verified against real data volume. | Runtime State Inventory | If real counts are very large (thousands), a single synchronous migration transaction could be slow; recommend the plan include a quick manual check (`Object.keys(PROFILE_SCREENSHOTS).length` typed into the tool's own console) before finalizing whether chunking is needed |

## Open Questions

1. **Does SPLIT-05's mention of "LSCG_DB" mean the outfit-metadata store too, or was it a documentation shorthand for LSCG_SCREENSHOTS?**
   - What we know: `LSCG_DB` (outfit codes/fingerprints/versions) and `LSCG_SCREENSHOTS` (images) are verified-separate IDB keys with separate save functions (`items.js:8616` vs `items.js:7640`).
   - What's unclear: user intent behind the exact wording in `REQUIREMENTS.md:39`.
   - Recommendation: Scope the plan to the three screenshot blobs only (matches SPLIT-06's explicit "Screenshot-Store" framing); flag for one confirmation question in `/gsd-discuss-phase` if not already resolved there.

2. **Should the old screenshot blobs continue receiving writes after migration (dual-write) or freeze at the migration snapshot?**
   - What we know: `PROJECT.md` explicitly forbids auto-deleting the old blob; it does not explicitly forbid or require continued writes to it.
   - What's unclear: whether "never lose data" implies the old blob should stay a live mirror (safer, but reintroduces the exact full-object-write cost SPLIT-05 wants removed) or a frozen rollback point (recommended above).
   - Recommendation: Freeze-at-migration (Pattern 3 above) — satisfies both the letter of SPLIT-05 (no more full-object writes) and the Datenschutz-Regel (old data never deleted, always recoverable to its last known-good state).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | Vitest, test scripts | ✓ | ≥22.12.0 required, engines field verified [VERIFIED: package.json:6-8] | — |
| Vitest | All new persistence.js/bridge.js tests | ✓ | 5.0.0, `npm test` green (149 passed + 2 expected fail) [VERIFIED: `npm test` output this session] | — |
| fake-indexeddb | Migration/onblocked tests | ✓ | 6.2.5, `onblocked` confirmed working via executed probe this session | — |
| Browser (manual smoke test) | End-of-phase human verification of load order + bridge flows | Not verifiable from this environment (no live BC game/browser access here) | — | User performs manual smoke test per Phase 3's precedent (`03-03-SUMMARY.md`'s "End-of-Phase Human-Checks") |

**Missing dependencies with no fallback:** none — everything this phase needs is already installed and proven working.
**Missing dependencies with fallback:** live-browser verification of the extracted load order and bridge flows has no automated fallback and must be a manual, end-of-phase checkpoint (consistent with Phase 3's precedent).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 [VERIFIED: package.json:13] |
| Config file | `vitest.config.js` (environment: node, setupFiles: `tests/setup/fake-indexeddb.js`) [VERIFIED: vitest.config.js, tests/setup/fake-indexeddb.js] |
| Quick run command | `npx vitest run tests/<new-file>.test.js` |
| Full suite command | `npm test` (currently 14 files, 149 passed + 2 expected fail) [VERIFIED: `npm test` output this session] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| SPLIT-01 | `idbGet`/`idbSet` round-trip and quota-error path work identically after moving to `persistence.js`, importable both via `vm`-sandbox and native ESM | unit | `npx vitest run tests/idb-helpers.test.js` (existing, must stay green after the move — update its `loadScript([...])` array) | ✅ existing, needs update, not new |
| SPLIT-02 | `onBridgeMessage(type, fn)` registers a handler; dispatch calls it with the right event; a new type needs zero `items.js` edits | unit | `npx vitest run tests/bridge-protocol.test.js` (existing, extend) + a new `tests/bridge-registry.test.js` | ❌ registry-specific cases → Wave 0 |
| SPLIT-03 | After extraction, `items.js` contains zero `indexedDB.open`/`window.addEventListener('message'` occurrences of its own (all moved) | other (static grep gate) | `grep -c "indexedDB.open\|addEventListener('message'" items.js` → expect count to drop to the debug-listener-only case | ❌ Wave 0 (grep gate, add to plan verification) |
| SPLIT-04 | Missing `persistence.js` (simulated by not loading it) produces a visible error, not a silent `ReferenceError` deep in an unrelated function | unit | `npx vitest run tests/load-order-guard.test.js` (new — load `items.js` alone via vm sandbox without persistence.js pre-loaded, assert the guard throws/renders the fatal message) | ❌ Wave 0 |
| SPLIT-05 | Saving one screenshot writes exactly one `screenshots` record; `idbSet('BC_PROFILE_SCREENSHOTS_v1', ...)`/`idbSet('BC_LSCG_SCREENSHOTS_v1', ...)`/wheel equivalent are no longer called after migration | unit | `npx vitest run tests/screenshot-store.test.js` (new — spy on `idbSet`, assert whole-blob key never called post-migration, exactly one `put` per screenshot save) | ❌ Wave 0 |
| SPLIT-06 | Migration populates new store, count/keys match, marker set, old blob untouched; a second open connection triggers `onblocked` visibly | unit + integration | `npx vitest run tests/screenshot-migration.test.js` (new — model on the executed probe in this document) | ❌ Wave 0 |
| SPLIT-07 | `exportScreenshotsOnly()` produces a JSON blob containing all three screenshot maps | unit | `npx vitest run tests/screenshot-export.test.js` (new — assert `_jsonParts`/Blob content shape; can reuse existing `exportAllData` test patterns if any exist, else new) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched test file>` + `node --check <touched .js file>` (existing convention, confirmed via Phase 2/3 SUMMARY.md `git show --stat` sections)
- **Per wave merge:** `npm test` (full suite, must stay 149+ passed with 0 new failures, 2 expected fail unchanged)
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus the manual end-of-phase browser smoke test (hard-refresh reload, all tabs, all bridge flows) per Pitfall 1's warning sign

### Wave 0 Gaps

- [ ] `tests/bridge-registry.test.js` — covers SPLIT-02 registry mechanics specifically (distinct from existing `bridge-protocol.test.js`, which covers origin/source checks)
- [ ] `tests/load-order-guard.test.js` — covers SPLIT-04
- [ ] `tests/screenshot-store.test.js` — covers SPLIT-05
- [ ] `tests/screenshot-migration.test.js` — covers SPLIT-06 (model directly on the probe script executed this session)
- [ ] `tests/screenshot-export.test.js` — covers SPLIT-07
- [ ] Update `tests/idb-helpers.test.js`'s and other existing tests' `loadScript([...])` file arrays once `persistence.js`/`bridge.js` exist, so they load the extracted files instead of relying on `items.js` alone

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | No auth system; single local user, no login (`PROJECT.md`: "Einziger Nutzer ist der Autor") |
| V3 Session Management | No | No server sessions |
| V4 Access Control | No | Single-user tool |
| V5 Input Validation | No new surface | This phase moves existing code; it does not add new user-input parsing. Existing validation (bot-data.js validators, outfit-import parser) is untouched. |
| V6 Cryptography | No | Not applicable |
| V14 (Browser cross-origin / postMessage, ASVS-adjacent) | **Yes — regression risk, not new surface** | `bridge.js` must move `_bridgeSenderOk`/`_bcOrigin`/`TOOL_ORIGIN` **verbatim** — Phase 3's origin-pinning (STAB-04/06/07) is the project's only real trust boundary; a pure-move extraction must not accidentally re-introduce a `'*'` wildcard or drop the `ev.source !== window.opener` check during the refactor |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Extraction accidentally weakens origin pinning (e.g. `bridge.js` re-derives `_bcOrigin` differently, or a copy-paste during the move drops the `ev.source` check) | Spoofing | Move `_bridgeSenderOk`/`_bcOrigin` learning logic character-for-character; add a regression test asserting the exact source lines exist in `bridge.js` post-move (mirrors the static-audit pattern already used in `tests/delete-confirmation.test.js` and `03-01`'s PING-count audit) |
| New `screenshots` IDB store accessible to any script with page access (no new isolation) | Information Disclosure | Same trust model as the existing `kv` store — no new exposure, since the tool is a single-origin, single-user, client-only application with no new party gaining access |
| Migration transaction failure leaves DB at v2 with an incomplete `screenshots` store, silently discarding future saves that assume migration is done | Denial of Service (self-inflicted) | Marker-key gate (`BC_ScreenshotsMigrated_v1`) checked before switching the save path — covered under Pitfall 3 above |

## Sources

### Primary (HIGH confidence — read/executed this session)
- `items.js` (read in full for lines 1-140, 500-720, 5850-6390, 7300-7760, 8330-8700, 9530-9560, 10650-10700) — persistence/bridge/screenshot surface, line numbers current as of `git log` HEAD `5c780b5`
- `index.html` (read lines 1-15, 2450-2480, 3080-3540, 4160-4200) — script load order, Tweaks-panel structure
- `loader.js` (grepped for `ALLOWED_ORIGIN`/`POPUP_URL`) — confirms out-of-scope boundary
- `tests/helpers/loadScript.js` (read in full) — vm-sandbox loader capabilities
- `tests/idb-helpers.test.js`, `tests/screenshot-sync.test.js` (read heads) — existing test patterns to extend
- `package.json`, `tests/package.json`, `vitest.config.js`, `vitest.no-idb.config.js` (read in full)
- `node_modules/fake-indexeddb/build/cjs/FDBFactory.js:85-148`, `FDBOpenDBRequest.js:11` (grepped) + an **executed** migration probe script (`node` run against the repo's pinned `fake-indexeddb@6.2.5`) — proves `onblocked` fires correctly under a real second open connection
- `npm test` executed this session — 14 files, 149 passed + 2 expected fail (baseline this phase must not regress)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md` (read in full)
- `.planning/phases/03-bridge-haertung/03-01-SUMMARY.md`, `03-03-SUMMARY.md`, `.planning/phases/02-speicher-sicherheit/02-02-SUMMARY.md` (read in full) — current bridge/delete-cleanup shape this phase must not regress

### Secondary (MEDIUM confidence — prior milestone research, re-verified structurally this session)
- `.planning/research/ARCHITECTURE.md` — dual-export pattern, handler-registry design, build order (structure confirmed still accurate; line numbers in that document are now stale and superseded by this document)
- `.planning/research/PITFALLS.md` — pitfalls 1, 2, 9, 10 directly applicable to this phase (still accurate)
- `.planning/research/STACK.md` — Pattern A/B testing approach, Vitest/fake-indexeddb versions (versions re-confirmed against `package.json`/`node_modules` this session)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing versions re-verified against `package.json`/`node_modules` this session
- Architecture: HIGH — every line number re-verified against current `items.js`/`index.html` this session; message-type catalogue is a full re-read, not a re-cite of stale milestone research
- Pitfalls: HIGH — mapped to this session's verified line numbers; the migration pitfall is additionally backed by an executed (not just described) probe
- Migration design (Pattern 3): HIGH — positively falsification-tested this session (`onblocked` behavior confirmed to work, not merely assumed)

**Research date:** 2026-09-14
**Valid until:** Until `items.js`/`index.html` line numbers shift again (i.e., invalidated by the next merged plan in this phase, or ~14 days, whichever first — this codebase changes fast per-phase)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|----------------------|
| SPLIT-01 | IDB-/localStorage-Helfer liegen in `persistence.js`, funktionieren unverändert als klassisches `<script>` und sind per Dual-Export in Vitest importierbar | Verified exact source (`items.js:5-104`), Pattern 1 (dual-export skeleton), cross-file caller table, scope clarification (only the generic migration IIFE moves, not the 36 ad-hoc localStorage sites) |
| SPLIT-02 | Das postMessage-Protokoll liegt in `bridge.js` mit einer Handler-Registry (`onBridgeMessage(type, handler)`); neue Nachrichtentypen brauchen keine Änderung an `items.js` | Verified full 33-case message catalogue with line numbers, Pattern 2 (handler-registry skeleton using the codebase's real state/global references), the `debugOsOutfit` one-shot-listener exception documented |
| SPLIT-03 | `items.js` enthält keine eigene IDB- oder postMessage-Logik mehr, sondern nutzt `persistence.js` und `bridge.js`; alle bestehenden Tabs funktionieren unverändert | Component Responsibilities table defines the post-extraction shape; Validation Architecture adds a static-grep gate test to prove `items.js` no longer contains `indexedDB.open`/`addEventListener('message'` |
| SPLIT-04 | Die Ladereihenfolge der Script-Tags ist dokumentiert und wird zur Laufzeit defensiv geprüft (fehlendes Modul → sichtbare Fehlermeldung statt stiller Ausfall) | Verified exact `index.html:3088-3092` insertion point and script; runtime guard snippet reusing the codebase's own `typeof x === 'function'` idiom (already proven at `items.js:57`) |
| SPLIT-05 | Screenshots werden als einzelne IDB-Datensätze in einem eigenen Store gespeichert; das Speichern eines Screenshots serialisiert nicht mehr das gesamte `PROFILE_SCREENSHOTS`-Objekt oder `LSCG_DB` | Verified all three screenshot blobs' save functions and read/write call sites; write-through-cache strategy recommended (keep 40+ read sites unchanged, only change save path); Assumption A1 flags the `LSCG_DB` wording for confirmation |
| SPLIT-06 | Die Migration in den neuen Screenshot-Store ist additiv: der Alt-Blob bleibt erhalten, die Migration wird verifiziert (Anzahl/Schlüssel stimmen überein) und als abgeschlossen markiert; ein blockierter `versionchange` (zweiter Tab) wird dem Nutzer angezeigt statt still zu scheitern | Executed (not just described) fake-indexeddb probe proves `onblocked` fires correctly and the old blob survives migration; concrete 5-step migration procedure with marker-key gating against partial-failure retry |
| SPLIT-07 | Vor der Migration kann der Nutzer einen JSON-Export aller Screenshot-Daten auslösen | Verified existing `exportAllData()`/`_jsonParts` chunking machinery (`items.js:7305-7375`) to reuse; concrete `exportScreenshotsOnly()` code example and Tweaks-panel UI placement modeled on verified existing sections |
</phase_requirements>
