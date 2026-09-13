---
phase: "2"
slug: "speicher-sicherheit"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-13"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 (installed in Phase 1) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/<betroffene Datei>.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/<betroffene Datei>.test.js`
- **After every plan wave:** Run `npm test` (waves are sequential: 02-01 → 02-02 → 02-03, all touch items.js)
- **Before `/gsd-verify-work`:** Full suite green; `node --check items.js` passes
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 (Task 1) | 1 | TEST-04, STAB-02 | T-2-01 | `idbSet` returns false + `showStatus(..,'error')` on QuotaExceededError; no partial write; throttle + idbGet error path documented | unit (green on first run — STAB-02 already implemented) | `npx vitest run tests/idb-helpers.test.js` | ⚠️ extend | ⬜ pending |
| 2-01-02 | 01 (Task 2 RED, Task 3 GREEN) | 1 | STAB-01 | T-2-04 | Sync reads `mk|fp` key it was written under; never overwrites existing profile image | unit (RED→GREEN) | `npx vitest run tests/screenshot-sync.test.js` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 (Task 1 RED, Task 2 GREEN) | 2 | STAB-09 | T-2-02 | Every image/outfit/version delete path calls `confirm()` exactly once (incl. `mbsWheelDeleteShot` and the wheel branch of `deleteOsScreenshotFromLb`); false → all four stores unchanged; static source audit: no delete line outside confirmed/allow-listed functions | unit (RED→GREEN) | `npx vitest run tests/delete-confirmation.test.js` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 (Task 1 RED, Task 3 GREEN) | 2 | STAB-10 | T-2-03, T-2-07 | Confirmed delete removes record from LSCG_DB, LSCG_SCREENSHOTS and every byte-identical copy in PROFILE_SCREENSHOTS (via `_removeLscgScreenshotFromProfiles(fp, img)`) — no orphans; manual profile uploads stay; persisted after `bcSpeichernJetzt()` | unit (RED→GREEN) | `npx vitest run tests/delete-consistency.test.js` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 (Task 1 RED, Task 2 GREEN) | 3 | STAB-03 | T-2-09 | Storage panel renders `navigator.storage.estimate()` result via pure `_speicherFormat`; graceful fallback when API missing or rejecting; guarded init hook never throws in the sandbox | unit (RED→GREEN) | `npx vitest run tests/storage-estimate.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/idb-helpers.test.js` — extend with quota case (monkeypatch `IDBObjectStore.prototype.put` in sandbox to throw `DOMException(...,'QuotaExceededError')`, `afterEach` restore)
- [ ] `tests/screenshot-sync.test.js` — STAB-01; prepare `LSCG_DB`, `_lscgFpMap` (let → `evalIn`), `PROFILE_SCREENSHOTS`
- [ ] `tests/delete-confirmation.test.js` — STAB-09; `confirm` spy via `extraGlobals`
- [ ] `tests/delete-consistency.test.js` — STAB-10; red before fix, green after
- [ ] `tests/storage-estimate.test.js` — STAB-03; `navigator` stub via `extraGlobals`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storage panel visible and readable in the real browser | STAB-03 | DOM layout / real `navigator.storage` | Open tool, open the panel, compare displayed used/quota with browser DevTools → Application → Storage |
| Confirm dialog actually appears on delete | STAB-09 | Native `confirm()` | Click delete on a profile screenshot and on an outfit-scan screenshot; cancel → still present; confirm → gone everywhere |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
