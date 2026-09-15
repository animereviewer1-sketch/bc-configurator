---
phase: "5"
slug: "gamecode-inventar"
status: planned
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-15"
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/game-inventory-enumerator.test.js tests/game-scan-bridge.test.js` |
| **Full suite command** | `npm test` (255 passed + 2 expected fail, 20 files before this phase — must never drop) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** affected test file(s) + `node --check` on the touched production file (loader.js / game-scan.js / persistence.js)
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite green; live scan on the real game pending as human check (payload size logged)
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | SCAN-13 (W0) | T-5-01, T-5-08 | `tests/helpers/loaderSandbox.js` executes loader.js in-process with stubs (URL, alert, open, screen, MutationObserver, ServerSocket, Player, GameVersion, Asset/AssetGroup with circular ref + Dynamic*, bcModSdk Map mock, mod globals, synthetic window with throwing/counting getters, requestIdleCallback absent by default); `hits` counters; `send`/`posts`/`runUntil`/`waitFor` seams; existing static `tests/loader-origin.test.js` byte-identical | unit | `npx vitest run tests/loader-sandbox.test.js tests/loader-origin.test.js` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | SCAN-08 (storage half; owner plan 03) | T-5-05, T-5-06 | RED: `tests/persistence-module.test.js` block „Snapshot-Store (SCAN-08, IDB v3)“ (version 3, stores, keyPath id, round trip, add-only, quota visible, invalid record, export list, static no-delete gate) + v3 follow-up in `tests/screenshot-migration.test.js` (raw opens 2→3, 3→4, version literals) | unit (RED) | `npx vitest run tests/persistence-module.test.js tests/screenshot-migration.test.js` (must fail, names `idbSnapshotPut`) | ⚠️ extend | ⬜ pending |
| 5-01-03 | 01 | 1 | SCAN-08 (storage half; owner plan 03) | T-5-05, T-5-06, T-5-07 | GREEN: persistence.js `_IDB_VERSION = 3`, additive store `snapshots` (`keyPath: 'id'`), `idbSnapshotPut` (add-only via `add`, `_idbSchreibfehler('Spiel-Snapshot')`), `idbSnapshotGetAll/Get/Keys`; NO delete API; part of file from `_migrateScreenshotsToStore` byte-identical | unit + static | `npx vitest run tests/persistence-module.test.js tests/screenshot-migration.test.js tests/screenshot-store.test.js tests/idb-helpers.test.js tests/screenshot-export.test.js && node --check persistence.js && npm test` | n/a | ⬜ pending |
| 5-02-01 | 02 | 2 | SCAN-02..07, SCAN-01 (loader half) | T-5-01, T-5-02, T-5-03, T-5-04 | RED: `tests/game-inventory-enumerator.test.js` (31 cases): case returns immediately, reqId echo, reply origin = tool origin, PROGRESS 6 steps, concurrent scans, foreign origin ignored; globals classification + Inventory buckets + byPrefix; asset allowlist without Dynamic*/Group object/cycle, Asset absent → error; bcModSdk transforms (exact keys, `hits.patching` 0), absent SDK; five probes incl. non-enumerable bcx, absent mods; chat-hook registry present/absent; `hits` all 0, `structuredClone`+`JSON.stringify` never throw, chunk ticks ≥ ceil(N/500) with setTimeout fallback and rIC preferred, DataCloneError reported as err; static region gates | unit (RED) | `npx vitest run tests/game-inventory-enumerator.test.js` (must fail) | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | SCAN-02..07, SCAN-01 (loader half) | T-5-01, T-5-02, T-5-03, T-5-04, T-5-09 | GREEN: loader.js section `── Gamecode-Inventar` (`giReadData` descriptor-only, `giBounded` depth ≤ 2, `giChunked` 500/slice via `giNext` rIC/setTimeout 0, `GI_ASSET_KEYS` 88, `giDescribeApi` via getOwnPropertyNames, `buildGameInventory(reqId, post)`, `window.__BCK_buildGameInventory`) + one case `GET_GAME_INVENTORY` replying to validated `ev.origin`; diff purely additive; `ALLOWED_ORIGIN` count stays 34; `node --check loader.js` | unit + static | `node --check loader.js && npx vitest run tests/game-inventory-enumerator.test.js tests/loader-sandbox.test.js tests/loader-origin.test.js tests/injected-code-origin.test.js && npm test` | n/a | ⬜ pending |
| 5-03-01 | 03 | 3 | SCAN-01 (tool half), SCAN-08 | T-5-04, T-5-05, T-5-06, T-5-11 | RED: `tests/game-scan-bridge.test.js` (17 cases): guard, `triggerGameScan` reqId `gi_<ts>_<n>` + handshake refusal, PROGRESS status line + foreign reqId ignored, DATA → one `add` with record `{id, ts, gameVersion, modCount, mods[{name,version}], sizeBytes, inventory}` + size log + success status, second scan keeps first, concurrent scans both saved, unknown/consumed reqId ignored, err path, quota visible („NICHT gespeichert“), init count line, missing element tolerated; static gates for index.html, docs/LOAD-ORDER.md, `CORE_SCRIPTS`/`expandLoadOrder`, game-scan.js source | unit (RED) | `npx vitest run tests/game-scan-bridge.test.js` (must fail, ENOENT game-scan.js) | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 3 | SCAN-01 (tool half), SCAN-08 | T-5-04, T-5-05, T-5-06, T-5-11 | GREEN: `game-scan.js` (guard, pending-map reqId correlation, `_saveGameInventorySnapshot`, `_renderGameScanInfo`, init hook, no own bridge/IDB/delete logic), index.html insertions (write line after items.js, `LADEREIHENFOLGE` comment, Tweaks section `🔎 Spiel-Scan`), `CORE_SCRIPTS` + `expandLoadOrder` post-items rule, persistence-module CORE_SCRIPTS assertions, docs/LOAD-ORDER.md (row 7, isolation sentence corrected); `<human-check>` end-of-phase list | unit + static + human-check | `node --check game-scan.js && npx vitest run tests/game-scan-bridge.test.js tests/load-order-guard.test.js tests/persistence-module.test.js tests/load-script.test.js tests/bridge-registry.test.js tests/screenshot-export.test.js && npm test` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/loaderSandbox.js` + `tests/loader-sandbox.test.js` (Plan 01, Task 1) — loader.js executed in-process for the first time; `tests/loader-origin.test.js` stays byte-identical (its `ALLOWED_ORIGIN` count of 34 forces the new loader case to reply to the already-validated `ev.origin`)
- [ ] `tests/persistence-module.test.js` — extend for `snapshots` store (SCAN-08) + updated export list (Plan 01 Task 2) + `CORE_SCRIPTS` shape (Plan 03 Task 2)
- [ ] `tests/screenshot-migration.test.js` — v2 assumptions raised to v3/v4 (Plan 01, Task 2)
- [ ] `tests/game-inventory-enumerator.test.js` — SCAN-02..07 against a synthetic 20k-prop window with throwing/counting getters, circular asset graph, bcModSdk Map mock, `hits` counters (Plan 02, Task 1)
- [ ] `tests/game-scan-bridge.test.js` — SCAN-01 tool side via existing loadScript sandbox + dispatchMessage (Plan 03, Task 1)
- [ ] `tests/helpers/loadScript.js` — add `game-scan.js` to `CORE_SCRIPTS` AFTER `items.js` with a post-items insertion rule in `expandLoadOrder` (existing 45 `loadScript([...])` call sites unchanged; Plan 03, Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live scan on the real game | SCAN-01..08 | Real 28-mod session | Deploy, re-run bookmarklet (loader update), hard-reload tool, click „🔎 Spiel scannen" → status line counts steps 1/6…6/6, game tab stays responsive, final status „✅ Spiel-Scan gespeichert – 28 Mods, N KB“; tool console logs `[GameScan] Snapshot-Größe (JSON-Zeichen): N` (record N in 05-03-SUMMARY; multi-part transport only if > 20 MB); DevTools → IndexedDB `BCKonfigurator` v3 → `snapshots` has one record (gameVersion R131, modCount 28, globals.total ≈ 18700, assets.count 4764, groupCount 120, patchingCount ≈ 546) |
| Second scan keeps the first | SCAN-08 | Real IDB | Scan again → two snapshot entries, first unchanged (same id/ts and content), none removed; status line „2 Snapshots gespeichert“ survives a tool reload; existing flows (cache, room scan, screenshot, bot deploy/EXEC log, reconnect) unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
