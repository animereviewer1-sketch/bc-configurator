# Project Research Summary

**Project:** BC Universal Configurator — Milestone Stabilisierung / Entflechtung / Gamecode-Scan
**Domain:** Browser-based companion tool for Bondage Club (vanilla JS, no build, popup + bookmarklet loader, postMessage bridge, IndexedDB)
**Researched:** 2026-09-12
**Confidence:** MEDIUM-HIGH

## Executive Summary

The tool is a working vanilla-JS application with an 11,700-line monolithic core. This milestone is a three-part overhaul in strict order: **Stabilisierung** (harden the bridge, surface storage errors, add a test safety net), **Entflechtung** (extract persistence and bridge modules from the monolith), **Gamecode-Scan** (a new runtime inventory of what the game and its mods expose).

The recommended approach is Vitest + fake-indexeddb for testing (devDependencies only — production stays plain `<script>` tags on GitHub Pages), a dual-export pattern so extracted modules work both as classic scripts and as test imports, origin-pinned postMessage on both bridge legs, and an additive per-screenshot IDB migration. The project's core value — "never lose scanned data" — enforces the phase order: tests first, extraction on tested code, features on a stable foundation.

Key risks: script reordering silently breaking implicit-global dependencies; IDB migrations blocked by a second open tab or partially applied; postMessage hardening applied on only one bridge leg (the bot-engine-generated injected code is easy to miss); game enumeration freezing the BC tab through unbounded recursion or side-effecting getters. All are preventable with the documented patterns.

## Key Findings

### Recommended Stack

- **Vitest 5.0.0** + **@vitest/coverage-v8 5.0.0** + **fake-indexeddb 6.2.5**, all devDependencies (versions verified against npm, HIGH). Default `environment: 'node'` is sufficient for browser-free logic; neither jsdom nor happy-dom implement IndexedDB, so fake-indexeddb is required regardless.
- **Pattern A (Stabilisierung):** load existing global-scope files (e.g. `items.js`) into a Node `vm` sandbox — zero source changes needed to test current code.
- **Pattern B (Entflechtung):** every newly extracted module ends with `window.x = x` plus a guarded `if (typeof module !== 'undefined') module.exports = {...}` — classic-`<script>` compatible, Vitest-importable. Deliberately avoid `<script type="module">` (breaks under `file://`).
- postMessage hardening is call-site discipline (exact `targetOrigin`, validate `event.origin` and `event.source`), not a dependency. IDB safety: catch `QuotaExceededError` explicitly, use `navigator.storage.estimate()`/`persist()`. `idb`/`idb-keyval` are optional, not required.
- No new production dependency for any milestone goal.

### Expected Features

**Table stakes for the game-code scan:** core globals probe (Player, ChatRoom, Inventory*, Character*, ServerSend …), asset catalog extension (groups, properties, locks, colors, layers), chat-hook enumeration (`ChatRoomRegisterMessageHandler` is confirmed core API), `bcModSdk.getModsInfo()` + `getPatchingInfo()` reads (verified from SDK source — lists registered mods and every hooked game function), known-mod fallback probes (`window.bcx`, `globalThis.mbs` expose independent globals — the SDK registry is not complete), baseline "already used by the tool" manifest and diff, read-only enforcement, versioned snapshots, manual delete with confirmation, visible quota errors.

**Differentiators (P2):** suggested bot actions/triggers with manual review, per-mod compatibility badges, hooked-function conflict view. MBS already ships a "new items in this BC version" screen — a validated precedent for the used-vs-new diff UI.

**Anti-features:** no eval-based fuzzing or invocation of discovered functions, no bundled BC code, no auto-generated bot code without review, no call tracing, no automatic snapshot pruning.

**Open gap:** WCE/FBC's exact exposed global could not be confirmed from public docs — one live console check needed.

### Architecture Approach

Flat file structure preserved. New/changed modules: `persistence.js` (extracted IDB/localStorage helpers), `bridge.js` (extracted postMessage protocol with an `onBridgeMessage(type, handler)` registry replacing the giant switch at `items.js` ~5917–6500), `game-scan.js` (new tool-side scan tab), `loader.js` gains `buildGameInventory()`. Data flow for the scan: game → loader enumerator → `GAME_INVENTORY_DATA` over the bridge → persistence (versioned snapshot) → scan tab diff against the baseline manifest.

Origin-pinning lands *before* bridge extraction: tool→game learns `_gameOrigin` from the first received message; game→tool switches immediately since `POPUP_URL`'s origin is static. Per-screenshot migration is additive-only: bump `_idbVersion`, create a `screenshots` store, copy records, flag completion — never delete the legacy `PROFILE_SCREENSHOTS` blob programmatically (permanent rollback path).

### Critical Pitfalls

1. **Load-order / var-shadowing** — extraction reorders script tags; implicit globals break only on cold reload. Document load order, add defensive existence checks, extract verbatim.
2. **False-green tests** — fake-indexeddb not wired in `setupFiles` lets code fall back to the localStorage path; add a canary asserting `globalThis.indexedDB` is the fake.
3. **One-legged postMessage fix** — must cover tool→game, game→tool, *and* the bot-engine-generated injected code; also handle `window.opener` becoming `null` after navigation (heartbeat).
4. **IDB migration data loss** — `onblocked` with two tabs, partial in-place transforms leave DB at new version with incomplete data. Populate-new-then-verify, pre-migration JSON export, realistic-volume tests.
5. **Enumeration freezes the game tab** — side-effecting getters, circular graphs, huge asset arrays. Shallow walk with allowlist, depth budget, chunk via `setTimeout`; prototype in the in-game console first.
6. **Confirmed delete that still leaks** — screenshots live in three places; a "confirmed" delete can orphan data. Delete must be a single audited path.

## Implications for Roadmap

### Phase 1: Stabilisierung
- **Rationale:** Safety net before any refactoring; fixes inherited by extracted modules.
- **Delivers:** Vitest harness on current code (Pattern A) with fake-indexeddb canary; screenshot key-mismatch fix; `idbSet()` quota error surfaced in UI; exhaustive postMessage origin audit (both legs + injected code) with single-source origin constant; opener-liveness heartbeat; single audited delete-with-confirmation path; load-order documentation.
- **Dependencies:** none.
- **Pitfalls addressed:** 1 (documentation), 2, 3, 6.

### Phase 2: Entflechtung
- **Rationale:** Extract tested code verbatim; create the clean seams the scan needs.
- **Delivers:** `persistence.js` and `bridge.js` (Pattern B, handler registry); per-screenshot IDB migration (additive, verified, legacy blob retained); `items.js` reduced to coordinator.
- **Dependencies:** Phase 1 tests green.
- **Pitfalls addressed:** 1, 4.
- **Research flag:** before Phase 3 planning, run live console checks (`bcModSdk.getModsInfo()` shape, WCE/FBC global, getter side-effects on LSCG/BCX/MBS, asset nesting depth).

### Phase 3: Gamecode-Scan
- **Rationale:** Purely additive; benefits most from the clean bridge and persistence.
- **Delivers:** `buildGameInventory()` in loader (bounded, chunked, read-only); `GAME_INVENTORY_DATA` message pair; versioned snapshot storage; baseline manifest of what the bot engine already uses; scan tab with used/new badges, search, manual delete; one-off analysis document with proposals for new bot actions/triggers.
- **Dependencies:** Phase 2 seams; live console verification results.
- **Pitfalls addressed:** 5.

### Phase Ordering Rationale

Tests must exist before extraction (project constraint). Extraction must precede the scan so the new message pair and storage go through the registry/persistence module instead of the monolith. Each phase leaves the tool fully working; no phase depends on a later one.

### Research Flags

- **Phase 3 (blocking design):** `bcModSdk.getModsInfo()`/`getPatchingInfo()` exact return shape; WCE/FBC global name(s); getter side-effects during `window` enumeration with mods loaded; asset array nesting depth. All resolvable via the user's in-game console — provide concrete commands, collect output.
- **Phase 1 (routine):** live smoke test of bridge flows (cache load, EXEC, screenshot capture, room scan) after origin-pinning; Vitest canary.
- **Standard, no research needed:** Vitest setup, fake-indexeddb wiring, handler-registry pattern, additive IDB migration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (versions) / MEDIUM (patterns) | Versions from npm registry; vm/dual-export patterns synthesized from web sources, spot-verify against vitest.dev when implementing |
| Features | MEDIUM-HIGH | bcModSdk and BCX facts from repo source; MBS from README; WCE/FBC unverified |
| Architecture | HIGH (boundaries, order) / MEDIUM (inventory shape) | Grounded in codebase map line references; `buildGameInventory()` shape awaits live check |
| Pitfalls | MEDIUM | Project-specific items HIGH (from CONCERNS.md); IDB/postMessage from MDN; enumeration side-effects partly speculative |

### Gaps to Address

- WCE/FBC global name — live console.
- bcModSdk registry return shape — live console against the actual release artifact.
- Browser-specific partial versionchange rollback behavior — cover with tests, don't assume.
- Whether to adopt `idb`/`idb-keyval` during Entflechtung — phase-planning decision.

## Sources

### Primary (HIGH confidence)
- `.planning/codebase/` (ARCHITECTURE, STRUCTURE, INTEGRATIONS, CONCERNS, STACK) — first-party codebase map with line references
- npm registry — vitest, @vitest/coverage-v8, fake-indexeddb, jsdom, happy-dom versions
- bondage-club-mod-sdk source (`modRegistry.ts`, `sdkApi.ts`, `patching.ts`, `api.ts`); BCX `bcxExternalInterface.d.ts`; BC core merge request for `ChatRoomRegisterMessageHandler`

### Secondary (MEDIUM confidence)
- MDN — postMessage, IndexedDB versionchange/onblocked, StorageManager; MSRC blog on postMessage hardening; MBS README

### Tertiary (LOW confidence)
- Web-search syntheses on vm-sandbox testing of global scripts and IndexedDB quota handling; WCE/FBC marketing pages
