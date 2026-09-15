---
phase: "5"
slug: "gamecode-inventar"
status: draft
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

- **After every task commit:** affected test file(s) + `node --check loader.js game-scan.js persistence.js`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite green; live scan on the real game pending as human check (payload size logged)
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | SCAN-13 (W0) | T-5-01 | `tests/helpers/loaderSandbox.js` executes loader.js in-process with stubs (window.open, screen, MutationObserver, ServerSocket, Player, Asset, AssetGroup, bcModSdk Map mock); existing loader-origin static tests untouched | unit | `npx vitest run tests/loader-sandbox.test.js` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | SCAN-08 | T-5-02 | persistence.js v3 adds `snapshots` store (additive upgrade, no migration); `idbSnapshotPut/GetAll/Get`; no delete API in this phase | unit (RED→GREEN) | `npx vitest run tests/persistence-module.test.js -t snapshots tests/screenshot-migration.test.js` | ⚠️ extend | ⬜ pending |
| 5-02-01 | 02 | 2 | SCAN-02..07 | T-5-03, T-5-04 | Enumerator: descriptor-only walk, getters never invoked (throwing getter test), chunked via rIC/setTimeout with fallback, Inventory* grouped, asset allowlist without circular refs, `structuredClone(snapshot)` never throws, bcModSdk transforms drop functions, five mod probes incl. non-enumerable `bcx` | unit (RED→GREEN) | `npx vitest run tests/game-inventory-enumerator.test.js` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | SCAN-01 (loader half) | T-5-05 | loader.js handler gains `GET_GAME_INVENTORY` → enumerator → `GAME_INVENTORY_PROGRESS` × n + `GAME_INVENTORY_DATA` with reqId; minimal diff; `node --check loader.js` | unit + static | `npx vitest run tests/game-inventory-enumerator.test.js -t GET_GAME_INVENTORY tests/loader-origin.test.js && node --check loader.js` | n/a | ⬜ pending |
| 5-03-01 | 03 | 3 | SCAN-01, SCAN-08 (tool half) | T-5-06 | `game-scan.js` registers handlers via `onBridgeMessage` (no items.js edit), reqId correlation, progress line, snapshot {gameVersion, ts, mods[]} persisted, quota error surfaced, button „🔎 Spiel scannen" in Tweaks panel (index.html insertions only), load order docs updated | unit (RED→GREEN) | `npx vitest run tests/game-scan-bridge.test.js tests/load-order-guard.test.js && node --check game-scan.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/loaderSandbox.js` + `tests/loader-sandbox.test.js` — loader.js executed in-process for the first time
- [ ] `tests/game-inventory-enumerator.test.js` — SCAN-02..07 against a synthetic 20k-prop window with throwing getters, circular asset graph, bcModSdk Map mock
- [ ] `tests/game-scan-bridge.test.js` — SCAN-01 tool side via existing loadScript sandbox + dispatchMessage
- [ ] `tests/persistence-module.test.js` — extend for `snapshots` store (SCAN-08)
- [ ] `tests/helpers/loadScript.js` — add `game-scan.js` to CORE_SCRIPTS after bridge.js (existing 16 call sites unchanged)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live scan on the real game | SCAN-01..08 | Real 28-mod session | Re-run bookmarklet, reload tool, click „🔎 Spiel scannen" → progress line advances, game tab stays responsive, final status shows counts; console logs `JSON.stringify(snapshot).length`; DevTools → IndexedDB `snapshots` store has one entry |
| Second scan keeps the first | SCAN-08 | Real IDB | Scan again → two snapshot entries, none removed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
