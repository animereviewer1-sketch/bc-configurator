---
phase: "4"
slug: "entflechtung"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-14"
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/<betroffene Datei>.test.js` |
| **Full suite command** | `npm test` (149 passed + 2 expected fail before this phase — must never drop) |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** affected test file(s) + `node --check items.js persistence.js bridge.js`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite green; static gates (items.js has 0 own `indexedDB.open` / `addEventListener('message'`); human smoke of all tabs pending
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | SPLIT-01 | T-4-01 | `persistence.js` exposes `idbGet`/`idbSet`/`_idbOpen`/`_debounce` + migration IIFE as classic script and via dual-export; idb-helpers tests unchanged green | unit (existing + ESM import) | `npx vitest run tests/idb-helpers.test.js tests/persistence-module.test.js` | ⚠️ extend / ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | SPLIT-04 | T-4-02 | Missing module → visible fatal message at startup, not a deep ReferenceError; load order documented in index.html comment + `docs/LOAD-ORDER.md` | unit | `npx vitest run tests/load-order-guard.test.js` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | SPLIT-02 | T-4-03 | `bridge.js` owns listener, `_bridgeSenderOk`, `bcSend`, heartbeat, registry `onBridgeMessage(type, fn)`; unknown type ignored; new type registers without items.js edit | unit (RED→GREEN) | `npx vitest run tests/bridge-registry.test.js tests/bridge-protocol.test.js` | ❌ W0 / ⚠️ extend | ⬜ pending |
| 4-02-02 | 02 | 2 | SPLIT-03 | T-4-03 | items.js registers its 33 handlers via registry; static gate: 0 own `indexedDB.open` / `addEventListener('message'` in items.js; all 149+ tests green | static + suite | `test "$(grep -c "indexedDB.open\|addEventListener('message'" items.js)" = 0 && npm test` | n/a | ⬜ pending |
| 4-03-01 | 03 | 3 | SPLIT-07 | — | `exportScreenshotsOnly()` yields JSON with all three maps; button in Tweaks panel | unit (RED→GREEN) | `npx vitest run tests/screenshot-export.test.js` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 3 | SPLIT-06 | T-4-04, T-4-05 | DB version bump creates `screenshots` store; migration copies all entries, verifies count+keys, writes marker `BC_SCREENSHOT_MIGRATION_v1`, never deletes old blobs; `onblocked` → visible error | unit (RED→GREEN, modelled on the executed probe) | `npx vitest run tests/screenshot-migration.test.js` | ❌ W0 | ⬜ pending |
| 4-03-03 | 03 | 3 | SPLIT-05 | T-4-06 | Save path writes exactly one record per screenshot; old blob keys no longer written after migration; in-memory maps stay as write-through cache; Phase-2 delete helpers still consistent | unit (RED→GREEN) | `npx vitest run tests/screenshot-store.test.js tests/delete-consistency.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/persistence-module.test.js` — ESM import of persistence.js (dual-export) + sandbox load before items.js
- [ ] `tests/load-order-guard.test.js` — SPLIT-04
- [ ] `tests/bridge-registry.test.js` — SPLIT-02
- [ ] `tests/screenshot-export.test.js` — SPLIT-07
- [ ] `tests/screenshot-migration.test.js` — SPLIT-06
- [ ] `tests/screenshot-store.test.js` — SPLIT-05
- [ ] Update `loadScript([...])` file arrays in existing tests (and the helper's default) to load `persistence.js`, `bridge.js` before `items.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All tabs work unchanged after extraction | SPLIT-03 | Full UI | Open every tab (Items, Outfit, Curse, Inventar, Shop, Rang, Geld, Bot); load cache; start a bot; capture screenshot |
| Migration runs once on real data, old blobs still present, marker set | SPLIT-06 | Real IDB with user data | DevTools → Application → IndexedDB: `screenshots` store populated; `BC_PROFILE_SCREENSHOTS_v1` still present; marker key present; open tool in a second tab during upgrade → error message shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
