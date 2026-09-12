# Architecture Research

**Domain:** Vanilla-JS browser companion tool for Bondage Club (BC), cross-window bridge + IndexedDB persistence, no bundler
**Researched:** 2026-09-12
**Confidence:** HIGH (internal structure, grounded in codebase map) / MEDIUM (bcModSdk mod-registry details, unverified against live game)

This is not an "ecosystem" survey — it is a structural design for four concrete extraction/addition targets inside an already-mapped 11.7k-line monolith. Every recommendation below is anchored to the file/line evidence in `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `INTEGRATIONS.md`, and `CONCERNS.md`.

## Standard Architecture

### System Overview — Target State

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Configurator Tool window (index.html, static <script> tags, no build) │
│                                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐    │
│  │ items.js       │  │ bot-ui.js      │  │ game-scan.js (NEW)      │    │
│  │ (coordinator,  │  │ bot-engine.js  │  │ scan-tab UI, diff view  │    │
│  │  tab render)   │  │ shop/rank/...  │  │                        │    │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬────────────┘    │
│          │  calls              │  calls                 │  calls        │
│          ▼                     ▼                        ▼               │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ bridge.js (NEW) — bcSend(), onBridgeMessage() registry,         │   │
│  │ handshake/ping-pong, EXEC dispatch, origin pinning              │   │
│  └───────────────────────────┬────────────────────────────────────┘   │
│                               │  postMessage(msg, gameOrigin)          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ persistence.js (NEW) — idbGet/idbSet/idbDelete, migrations,     │   │
│  │ quota handling, debounce registry                                │   │
│  └───────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────┼────────────────────────────────────────┘
                                 │
                          IndexedDB 'BCKonfigurator'
                    kv store (existing) + screenshots store (NEW)
                                 │
                                 │  postMessage(msg, toolOrigin)
┌────────────────────────────────▼───────────────────────────────────────┐
│ loader.js — injected into BC game tab via bookmarklet                  │
│  ┌──────────────────┐  ┌───────────────────────────────────────────┐  │
│  │ existing handlers  │  │ buildGameInventory() (NEW)                 │  │
│  │ (cache, EXEC, scan)│  │ walks window globals, Asset[], bcModSdk    │  │
│  └──────────────────┘  │ registry, function signatures               │  │
│                          └───────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │  reads
                          BC game globals (Player, Asset, ChatRoom…)
                          + mod globals (LSCG, BCX, FBC/WCE, MBS via bcModSdk)
```

The diagram differs from the current one in `.planning/codebase/ARCHITECTURE.md` only by inserting **bridge.js** and **persistence.js** as named layers *between* the feature modules and their existing responsibilities (today both live inside `items.js`), and by adding **game-scan.js** + `buildGameInventory()` as new, purely additive components. Nothing in the top-level box-drawing changes shape — the two new tool-side modules are horizontal slices carved out of `items.js`, not new boxes with new responsibilities.

### Component Responsibilities

| Component | Responsibility | Extracted from / New |
|-----------|----------------|------------------------|
| `persistence.js` | `idbGet`, `idbSet`, `idbDelete`, `_idbOpen`, `_debounce`, versioned-key migration helpers, `QuotaExceededError` surfacing | Extracted from `items.js` lines 22–66 (idbGet/idbSet), 13 (`_idbOpen`/`_idbVersion`), 68–87 (localStorage→IDB migration), 90–104 (`_debounce`) |
| `bridge.js` | `bcSend(msg, expectResponse)`, `onBridgeMessage(type, handler)` registry, ping/pong handshake, origin pinning (`_gameOrigin`), EXEC dispatch + timeout/cleanup for pending requests | Extracted from `items.js` lines 5917–6500 (message handler switch), ~2452–2515 (screenshot request/response), `bcSend()` currently defined for `bot-ui.js` use |
| `items.js` (post-extraction) | Tab switching, `TAB_GROUPS`, DOM rendering, coordinates calls into `persistence.js`/`bridge.js` | Same file, ~3,000–4,000 fewer lines once both extractions land |
| `game-scan.js` (NEW) | Tool-side: request inventory via `bridge.js`, store snapshot in IDB (`BC_GameInventory_v1`), diff against a curated "known usage" list, render searchable scan tab | New file, follows `shop.js` pattern (STRUCTURE.md "New Feature" recipe) |
| `buildGameInventory()` (NEW, in `loader.js`) | Enumerate window globals, function signatures, `Asset`/`AssetFemale3DCGExtended` catalogs, `bcModSdk` mod registry and hooks; serialize compact JSON | New function inside existing `loader.js`, alongside existing cache builder (loader.js lines 35–800) |
| Screenshot store (NEW IDB object store) | One record per screenshot, keyed `mk|fp`, replacing the single `PROFILE_SCREENSHOTS` blob | Migration target for `items.js` lines 561–562, 2735–2738, 7551–7569, 7979, 8057–8058 |

## Recommended Project Structure

No `src/` tree, no bundler — the project stays a flat root directory of independently `<script>`-tagged files (per PROJECT.md Constraint: "Vanilla JS ohne Build-Schritt in Produktion"). The only new artifacts are:

```
bc-universal-configurator/
├── index.html              # add 2 new <script> lines, in this order:
│                            #   persistence.js  (before items.js)
│                            #   bridge.js       (before items.js, after persistence.js)
│                            #   game-scan.js    (with other feature modules)
├── persistence.js          # NEW — extracted from items.js
├── bridge.js                # NEW — extracted from items.js
├── game-scan.js             # NEW — scan tab UI + diff logic
├── items.js                 # SHRINKS — becomes coordinator only
├── loader.js                 # GROWS — + buildGameInventory()
├── bot-ui.js / bot-engine.js / bot-data.js / shop.js / inventar.js / rank.js / money.js / outfit-import.js / bc-autobackup.js / bc-icons*.js   # unchanged
└── test/                     # NEW — Vitest suite, never shipped (not referenced by index.html)
    ├── persistence.test.js
    ├── bridge.test.js
    ├── bot-data.test.js
    └── outfit-import.test.js
```

### Structure Rationale

- **Flat root, no `src/`:** matches existing convention (STRUCTURE.md "Flat structure at root") and keeps GitHub Pages deployment a straight file copy — no path rewriting needed.
- **`persistence.js` loads before `bridge.js` and `items.js`:** `bridge.js`'s screenshot-response handler and `items.js`'s startup migration both call `idbGet`/`idbSet` synchronously at module-eval time in some places (e.g. `items.js` line 494's `idbGet('BC_PROFILES_v12').then(...)`), so load order must guarantee `idbGet` exists on `window` before those calls happen. This preserves the load-order sensitivity already documented in STRUCTURE.md ("items.js must load before other modules").
- **`test/` is new and untracked by the deploy path:** `index.html` never references it, so it cannot break production; Vitest is configured to look only in `test/`.
- **`game-scan.js` is additive, not extracted:** it introduces zero risk to existing tabs since nothing currently depends on it; it can be built and shipped independently of the persistence/bridge extraction (see Build Order below).

## Architectural Patterns

### Pattern 1: Dual-export global script (testable without a bundler)

**What:** Every extracted module keeps its current shape — plain top-level `function`/`const` declarations loaded via `<script>` so they attach as globals — but each file ends with a guarded CommonJS export block that only executes under a test runner:

```javascript
// persistence.js — bottom of file
window.idbGet = idbGet;
window.idbSet = idbSet;
window.idbDelete = idbDelete;
window._debounce = _debounce;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { idbGet, idbSet, idbDelete, _debounce, _idbOpen };
}
```

**When to use:** For `persistence.js` and `bridge.js` specifically — these are the two modules the milestone requires to be "testable under Vitest" while production stays script-tag based.
**Trade-offs:** Explicit `window.x = x` assignments are a few extra lines per module, but they are the only way an ES-module-aware test runner (Vite/Vitest treats every imported file as a module graph node) sees these functions as globals — top-level `function` declarations inside a file that Vitest `import`s do **not** leak to `globalThis` the way a classic `<script>` tag does. This pattern is required, not optional, once extraction happens.
**Verification note:** `idbGet`/`idbSet` tests need `indexedDB` to exist in the Vitest environment; jsdom does not implement it. Add `fake-indexeddb` as a devDependency and import it once in a Vitest setup file (`import 'fake-indexeddb/auto'`) — this is the standard no-bundler-friendly way to unit-test IDB helpers without a browser.

### Pattern 2: Handler-registry bridge (replaces the giant switch)

**What:** `bridge.js` exposes `onBridgeMessage(type, handlerFn)` instead of a single hardcoded `switch` inside `items.js`'s `window.addEventListener('message', …)` (currently lines 5917–6500). Feature modules register their own handlers at load time:

```javascript
// in game-scan.js
onBridgeMessage('GAME_INVENTORY_DATA', (ev) => {
  storeInventorySnapshot(ev.data.inventory);
  renderScanTab();
});
```

**When to use:** Immediately upon extracting `bridge.js` — this is what makes the giant `items.js` switch statement (CONCERNS.md: "Large switch statements... make logic flow hard to follow", though that citation is actually about `bot-engine.js`; the same shape exists in the `items.js` message handler) safely splittable across files without every new message type requiring an edit to `items.js` itself.
**Trade-offs:** Slightly more indirection to trace ("who handles `CACHE_DATA`?" now requires grep instead of reading one switch), but this is exactly the seam the milestone needs: `game-scan.js`'s new `GET_GAME_INVENTORY`/`GAME_INVENTORY_DATA` pair can be added without touching `items.js` at all.

### Pattern 3: Origin-pinned bridge with handshake-learned origin

**What:** Both directions currently have a wildcard problem: `items.js` sends with `"*"` (lines 2507, 2509, 2685, 2694, 2698) and bot-engine-injected watcher code also does `window.__BCK_popupRef.postMessage({...}, "*")` (CONCERNS.md). Fix: the tool already knows the game tab's window reference only after the bookmarklet opens it, but it does not reliably know the *origin string* in advance (BC is hosted on a fixed but externally-controlled domain, and the loader is injected into whatever tab the user bookmarklet-clicked). Two origins need pinning:
- **Tool → game:** cache the game origin the first time a message is received from it (`_gameOrigin = ev.origin`, captured in `bridge.js`'s message listener) and use that cached value for all subsequent `postMessage` calls instead of `"*"`. Until the first message arrives there is nothing to send to yet (EXEC/GET_CACHE always follow a successful PONG), so there is no legitimate case where `_gameOrigin` is unset when a send is attempted.
- **Game → tool (injected code):** `loader.js` already validates `ALLOWED_ORIGIN` on receipt (line 32/840) and knows `POPUP_URL`'s origin statically (it is the tool's own hardcoded deployment origin, `https://animereviewer1-sketch.github.io`) — this side can switch to `new URL(POPUP_URL).origin` immediately, no handshake needed, since the tool's origin is fixed and known at injection time.

**When to use:** As part of the Stabilisierung phase, *before* touching `bridge.js`'s extraction — fixing the wildcard is a 5-line change to the message-send call sites and is independent of the extraction. Doing it first means `bridge.js` is extracted with the origin-safe version already in place, instead of extracting first and then patching the new file.
**Trade-offs:** None significant; this is a strict security improvement with no functional behavior change for the single legitimate user of the tool.

### Pattern 4: Additive IDB store migration (never delete the source)

**What:** Moving `PROFILE_SCREENSHOTS` from one big blob to per-screenshot records requires an IndexedDB version bump (`_idbVersion` in `items.js` line 13) so `onupgradeneeded` can create a new object store (e.g. `screenshots`, keyPath `id` where `id = mk + '|' + fp`). Migration procedure:

1. On the version-bump's `onupgradeneeded`, create the new `screenshots` store — do **not** touch the old `kv` store or the `PROFILE_SCREENSHOTS` key inside it.
2. On next app start, run a one-time migration pass: read `PROFILE_SCREENSHOTS` from `kv`, write each `mk|fp → image` entry as an individual record into `screenshots`, and only after every write succeeds, set a `BC_ScreenshotsMigrated_v1 = true` flag key in `kv`.
3. All read paths (profile slideshow, scan tab) are updated to read from the `screenshots` store *first*, falling back to the legacy `PROFILE_SCREENSHOTS` blob if the flag is unset or a specific key is missing (covers users mid-migration or with partially-failed writes).
4. The old `PROFILE_SCREENSHOTS` blob is **never deleted** by code — this satisfies the Datenschutz-Regel ("gespeicherte Scan-Daten werden nie automatisch gelöscht") and gives a permanent rollback path. If storage pressure ever becomes a problem, deletion of the old blob is a manual, confirmation-gated action, same as `deleteLscgVersion()` today (CONCERNS.md).

**When to use:** This directly fixes two CONCERNS.md items at once — the "Screenshot Storage Key Mismatch" bug (`_syncLscgScreenshotToProfiles(mk, fp)` reading the wrong key) disappears because per-record storage means there is no second blob-shaped key to get wrong, and the "IDB JSON Serialization" performance bottleneck disappears because a screenshot save is a single small `put()` instead of a full-database re-serialize.
**Trade-offs:** Two storage locations exist simultaneously for a transition period (more IDB space used, not less, until/unless the old blob is manually cleared) — acceptable given the project's explicit anti-data-loss priority over storage efficiency.

## Data Flow

### Extraction data flow (unchanged behavior, moved location)

```
Feature module (shop.js, bot-ui.js, …)
    │  calls idbGet()/idbSet() — same call signature as today
    ▼
persistence.js  (was: items.js lines 22-66)
    │
    ▼
IndexedDB 'BCKonfigurator'

Feature module (game-scan.js, bot-ui.js via bcSend, …)
    │  calls bcSend()/onBridgeMessage() — bcSend signature unchanged
    ▼
bridge.js  (was: items.js lines 5917-6500)
    │  postMessage(msg, _gameOrigin)   ← origin-pinned, not "*"
    ▼
loader.js (game tab)
```

No message shapes, IDB keys, or function signatures change during the extraction itself — this is a pure "move code, keep the API" refactor, which is what makes it safe to sequence before the riskier screenshot-storage and inventory-scan work.

### Game-inventory scan flow (new)

```
1. User clicks "Scan Game Inventory" (game-scan.js, new tab UI)
2. game-scan.js calls bcSend({ type: 'GET_GAME_INVENTORY' }, true)   — via bridge.js
3. loader.js receives GET_GAME_INVENTORY (new case in its existing handler, loader.js ~825+)
4. loader.js runs buildGameInventory():
     a. walk Object.keys(window) with an allowlist/heuristic filter (skip DOM/browser builtins)
     b. for BC-relevant globals (Player, ChatRoom*, Asset*, ExtensionSettings, …): record
        type, and for functions: name + arity + param names (via toString().match(/\(([^)]*)\)/))
        — never the full function body, to keep the payload compact
     c. walk Asset[] / AssetFemale3DCGExtended for groups, properties, colors (asset catalog)
     d. if window.bcModSdk exists: enumerate its registered-mod list and hooked function names
        (bcModSdk exposes this for mod interop — see Sources); else fall back to probing known
        mod namespaces (LSCG, BCX, FBC/WCE, MBS) for their documented globals
     e. serialize to one compact JSON object
5. loader.js sends GAME_INVENTORY_DATA back — origin-pinned postMessage (Pattern 3)
6. bridge.js dispatches to game-scan.js's registered handler (Pattern 2)
7. game-scan.js stores the snapshot in IDB (BC_GameInventory_v1, via persistence.js)
8. game-scan.js diffs the snapshot against a curated "known usage" list (what items.js/bot-engine.js
   already reference — hand-maintained or generated once as a checked-in const) and renders the
   scan tab with "already used" vs "new" tags, searchable
```

**Key data-flow constraint:** the inventory snapshot must never overwrite a previous snapshot silently — store each scan as its own timestamped IDB record (`BC_GameInventory_<ts>`) or keep only the latest but never as a destructive merge into hand-curated bot-action metadata, per the same "never lose scan data" rule that applies to outfits.

### Screenshot flow (after migration)

```
Capture request → loader.js encodes image → SCREENSHOT_DATA over bridge.js
    → items.js/game module calls persistence.js: putScreenshot(mk, fp, image)
    → persistence.js writes ONE record to the `screenshots` IDB store (put, not full blob rewrite)
    → read paths query getScreenshot(mk, fp) directly — no more RAM+IDB+localStorage triple
      (CONCERNS.md "Screenshot Storage — Triple Storage" collapses to IDB as sole source of truth,
      with LSCG_SCREENSHOTS in RAM only as a request-in-flight cache, not a persistence layer)
```

## Suggested Build Order

This follows and refines the milestone order already fixed in PROJECT.md's Key Decision (Stabilisierung → Entflechtung → Gamecode-Scan). Within that order, the four research targets slot in as follows, with explicit "tests before extraction" gating:

1. **Vitest harness stands up first, extracting nothing yet.**
   - Add `vitest`, `fake-indexeddb`, `jsdom` as devDependencies (dev-only; zero impact on the shipped static site).
   - Write the first tests against the *current* `items.js` globals as-is (load `items.js` via `import` in a test, assert `window.idbGet`/`window.idbSet` round-trip, assert `bot-data.js` validators reject malformed triggers, assert `outfit-import.js` parses a known BC outfit code). This is the safety net the PROJECT.md constraint demands ("Reihenfolge: Refactoring erst, wenn die Tests aus der Stabilisierung existieren") and it requires zero code changes to production files beyond adding the dual-export guard (Pattern 1) to the files being tested first.
   - Gate: do not proceed to step 2 until `idbGet`/`idbSet` and the outfit-import parser have passing tests, since these are exactly the functions the next two steps move and depend on.

2. **Origin-specific postMessage targets (Stabilisierung item, Pattern 3).**
   - Independent of extraction — touches only the `postMessage(..., "*")` call sites in `items.js` and the bot-engine-injected watcher template.
   - Do this before extracting `bridge.js` so the new module is created already origin-safe, rather than extracted-then-patched.
   - Gate: add a bridge-level test (can be a light integration test using two `jsdom` `window`-like message-passing stubs, or simply a unit test asserting the send function is called with the cached origin string, not `"*"`) before folding this logic into `bridge.js` in step 4.

3. **Extract `persistence.js`.**
   - Lower risk than the bridge: self-contained, ~150 lines total (idbGet/idbSet/idbOpen/debounce/migration), single clear responsibility, already has Vitest coverage from step 1.
   - Move code verbatim, add `window.x = x` + dual-export (Pattern 1), add `<script src="persistence.js">` to `index.html` *before* `items.js`.
   - Gate: full existing manual smoke test (load tool, confirm outfits/bots/money/rank all still load) plus the Vitest suite, before touching the bridge.

4. **Extract `bridge.js`.**
   - Higher risk: this is the file every feature module's `bcSend` calls and every message-type handler currently live inside `items.js`'s single switch. Convert to the handler-registry pattern (Pattern 2) as part of the extraction, not after — doing both at once avoids a second migration of every call site.
   - Depends on step 2's origin-pinning logic being ready to fold in directly.
   - Gate: re-run the full manual message-flow smoke test (cache load, EXEC, screenshot capture, room scan) since this is where a silent regression would be most costly (CONCERNS.md: "Order of message handlers matters; if one handler is missing, the chain breaks silently").

5. **Per-screenshot IDB migration (Pattern 4).**
   - Depends on `persistence.js` existing (the migration helper and new `screenshots` store logic belongs there) and benefits from `bridge.js` already being handler-registry-based (the screenshot request/response pair moves cleanly into the new registry instead of needing a separate patch).
   - This is the highest-value fix for two named CONCERNS.md bugs (key mismatch, triple storage) — sequencing it last within Entflechtung means it lands on the already-tested, already-extracted foundation instead of adding a third moving part to steps 3–4.

6. **Game-inventory scan (Gamecode-Scan phase, entirely additive).**
   - Only start once `bridge.js`'s handler registry exists — the new `GET_GAME_INVENTORY`/`GAME_INVENTORY_DATA` pair is a two-line registration in the new pattern versus a switch-case insertion into the old monolith.
   - `buildGameInventory()` in `loader.js` can be developed and tested independently against a live game tab (per PROJECT.md: the user can run console commands in the BC tab and report output — use this to verify `bcModSdk` registry shape and mod-global names *before* writing the enumerator, since these are the MEDIUM-confidence unknowns in this whole plan).
   - `game-scan.js` (tool side) is new, additive, and cannot regress anything else — build it last precisely because it is the lowest-risk, most isolated piece, and it is the one component that most benefits from all the prior seams (clean bridge, clean persistence) already being in place.

## Anti-Patterns

### Anti-Pattern 1: Extracting while also changing behavior

**What people do:** Combine "move idbGet out of items.js" with "also fix the QuotaExceededError handling" or "also change the debounce delay" in the same step.
**Why it's wrong:** If a regression appears, it's ambiguous whether the move or the behavior change caused it — exactly the failure mode this milestone is trying to avoid by requiring tests first. `items.js` at 11,684 lines already has fragile global-init-order issues (CONCERNS.md "Global State in items.js — 50+ Variables"); compounding a move with a fix multiplies the surface area of what could break silently.
**Do this instead:** Extraction commits move code verbatim (Vitest tests should pass unchanged before/after a pure move). Behavior fixes (quota handling, origin pinning) are separate commits, ideally landing *before* the extraction they'll eventually live inside (see Build Order step 2 landing before step 4).

### Anti-Pattern 2: Testing the new files by re-implementing them, not by importing the real files

**What people do:** Write a "clean" reimplementation of `idbGet`/`idbSet` inside the test file to get fast, deterministic tests, then extract the real module later assuming it matches.
**Why it's wrong:** Defeats the entire purpose of "tests before extraction" — the safety net only works if the tests exercise the actual code that ships, including its existing quirks (e.g. the current lack of quota-error surfacing, which the Stabilisierung phase is separately supposed to fix and verify via a test that currently fails).
**Do this instead:** Tests `import` the real `persistence.js`/`bridge.js` files (Pattern 1's dual-export makes this possible) and run against `fake-indexeddb`, not a hand-rolled substitute.

### Anti-Pattern 3: Making the inventory scan a second source of truth for what bot-engine.js can do

**What people do:** Have `game-scan.js`'s diff view directly generate or auto-register new bot trigger/action types into `bot-data.js` from scan results.
**Why it's wrong:** PROJECT.md's Active list is explicit that Gamecode-Scan's job is "Vorschlagsliste neuer Bot-Aktionen/-Trigger" (a suggestion list) — not automatic registration. Auto-wiring scan output into `bot-data.js`/`bot-engine.js` would make the trigger/action type system depend on live game state shape, which changes with every BC patch and every mod update; a single miss-detected global could silently corrupt the bot type registry.
**Do this instead:** The scan tab is read-only and advisory: it shows "found in game, not yet used by tool" as a list a human reviews before manually adding a new trigger/action type through the existing `bot-data.js` pattern (STRUCTURE.md's "New Bot Trigger Type" recipe).

## Integration Points

### External Services

None — this milestone touches no external APIs (confirmed by INTEGRATIONS.md: "No external API integrations"). The one external actor is the BC game itself, reached only through the existing postMessage bridge, and third-party mods (LSCG, BCX, FBC/WCE, MBS) reached only indirectly through globals they attach inside the game tab — never through a direct network call from the tool.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Feature modules (`bot-ui.js`, `shop.js`, `game-scan.js`, …) ↔ `persistence.js` | Direct function calls (`idbGet`/`idbSet`), same signatures as today | No feature module should touch `indexedDB` directly — always through `persistence.js`, enforced by convention (no build-time boundary enforcement is possible without a bundler) |
| Feature modules ↔ `bridge.js` | `bcSend()` to send, `onBridgeMessage(type, fn)` to receive | Replaces direct edits to `items.js`'s switch; new message types never require touching `items.js` |
| `bridge.js` ↔ `loader.js` | `postMessage`, origin-pinned both directions (Pattern 3) | The only trust boundary in the whole system (ARCHITECTURE.md: "Origin-locked bridge") — every new message type added for the inventory scan must be validated on both sides the same way existing types are |
| `loader.js` ↔ BC game globals / `bcModSdk` | Direct property reads, no writes except via existing EXEC-injected code | `buildGameInventory()` must be read-only — enumerating globals must never call mutating game functions as a side effect of inspection |
| `items.js` (post-extraction) ↔ `persistence.js` + `bridge.js` | Same as any other feature module — `items.js` loses its "owns persistence and bridge" role and becomes a peer consumer, per PROJECT.md's own framing ("`items.js` bleibt Koordinator") | This is the measurable success criterion for the Entflechtung phase: `items.js` line count should drop by roughly the combined size of the two extracted modules (~250-400 lines), not stay flat |

## Sources

- `.planning/codebase/ARCHITECTURE.md` (2026-09-11 codebase map) — component/layer/data-flow baseline
- `.planning/codebase/STRUCTURE.md` (2026-09-11) — file layout, load order, "add new feature" recipe used as the template for `game-scan.js`
- `.planning/codebase/INTEGRATIONS.md` (2026-09-11) — postMessage protocol table, no-external-API confirmation
- `.planning/codebase/CONCERNS.md` (2026-09-11) — screenshot key-mismatch bug, origin-wildcard risk, triple-storage fragility, monolith debt — all directly addressed above
- `.planning/PROJECT.md` — milestone ordering decision (Stabilisierung → Entflechtung → Gamecode-Scan), data-preservation constraint, no-bundler constraint
- [bondage-club-mod-sdk (Jomshir98)](https://github.com/Jomshir98/bondage-club-mod-sdk) — `registerMod()`/`hookFunction()` API shape for mod detection in `buildGameInventory()` — MEDIUM confidence, verify exact registry introspection shape against a live game console session before finalizing the enumerator (per PROJECT.md's note that in-game console commands can be run and reported back)
- [Vitest — Test Environment guide](https://vitest.dev/guide/environment) and [Vitest — Mocking Globals](https://vitest.dev/guide/mocking/globals) — confirms jsdom/happy-dom `window`/`globalThis` behavior underlying Pattern 1
- `fake-indexeddb` — standard no-browser IndexedDB shim for Vitest/Node test environments (referenced for testing `persistence.js` without a real browser)

---
*Architecture research for: bc-universal-configurator (BC companion tool) — subsequent milestone, Entflechtung + Gamecode-Scan targets*
*Researched: 2026-09-12*
