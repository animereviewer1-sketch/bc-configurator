---
phase: "6"
slug: "scan-tab-analyse"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-19"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/scan-tab.test.js tests/snapshot-delete.test.js` |
| **Full suite command** | `npm test` (323 passed + 2 expected fail, 23 files before this phase — must never drop) |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** affected test file(s) + `node --check` on touched production files (persistence.js / items.js / scan-tab.js / game-scan.js)
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite green; baseline regeneration test green; human check of the tab in the real browser pending
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | SCAN-09 | T-6-01 | `tools/build-baseline.js` (dev-only, not deployed) extracts identifiers from injected-code strings + loader.js, classifies function/assetGroup/unknown, writes `baseline-manifest.json` deterministically; test regenerates and diffs (can't go stale) | unit (RED→GREEN) | `npx vitest run tests/baseline-manifest.test.js` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 2 | SCAN-11 | T-6-02, T-6-03 | `idbSnapshotDelete(id)` in persistence.js (single `.delete(` site on `snapshots`); `deleteGameSnapshot(id)` calls `confirm()` first; false → store untouched; static audit for the store | unit (RED→GREEN) | `npx vitest run tests/snapshot-delete.test.js` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 2 | SCAN-12 (input) | T-6-04 | `exportGameSnapshot(id)` JSON download of one record (fields intact) | unit (RED→GREEN) | `npx vitest run tests/scan-tab-export.test.js` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 3 | SCAN-10 | T-6-05, T-6-06 | `scan-tab.js`: snapshot selector, category filter, debounced search, paged rendering (≤300 rows + „mehr"), badges via baseline set membership, `escHtml` on every untrusted string; tab wiring in items.js (TAB_GROUPS, visibility array, render hook) + index.html insertions only | unit (RED→GREEN) + static | `npx vitest run tests/scan-tab.test.js && node --check scan-tab.js items.js` | ❌ W0 | ⬜ pending |
| 6-04-01 | 04 | 4 | SCAN-12 | — | Human step: user exports a real snapshot to `.planning/analysis/snapshot.json`; agent writes `.planning/analysis/GAME-INVENTORY.md` (categories, used/new counts, concrete proposals for bot actions/triggers/tabs with rationale) | human + doc | — (checkpoint:human-action, then doc review) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/build-baseline.js` + `baseline-manifest.json` + `tests/baseline-manifest.test.js` (Plan 01)
- [ ] `tests/snapshot-delete.test.js`, `tests/scan-tab-export.test.js` (Plan 02)
- [ ] `tests/scan-tab.test.js` (Plan 03) — override `document.getElementById` before rendering (fresh-stub pitfall)
- [ ] `scan-tab.js` is NOT added to CORE_SCRIPTS (not a runtime prerequisite of items.js) — tests load it explicitly

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scan-Tab usable on a real snapshot | SCAN-10 | Real DOM, real data volume | Open „🔎 Scan" tab → newest snapshot selected → search „ChatRoom" → list narrows; filter „Mods" → 28 rows; badges plausible (e.g. `ChatRoomSendChat` = genutzt) |
| Delete asks and respects cancel | SCAN-11 | Native confirm() | 🗑 on a snapshot → dialog; cancel → still there; confirm → gone, others remain |
| Export downloads one snapshot | SCAN-12 | Browser download | ⬇ → JSON file with `inventory` |
| Analysis doc reviewed | SCAN-12 | Human judgment | Read `.planning/analysis/GAME-INVENTORY.md`; proposals concrete and plausible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
