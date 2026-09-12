---
phase: "1"
slug: "testfundament"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-12"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 (Wave 0 installs) |
| **Config file** | `vitest.config.js` — none yet, Wave 0 installs |
| **Quick run command** | `npx vitest run tests/idb-canary.test.js` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <betroffene Testdatei>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green; additionally `git diff --stat index.html` shows no Phase-1 changes
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | TEST-01 | — | N/A | integration | `npm test` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | TEST-02 | — | N/A | unit | `npx vitest run tests/idb-helpers.test.js` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | TEST-03 | T-1-02 | Canary asserts fake IDB present; no silent localStorage fallback | unit | `npx vitest run tests/idb-canary.test.js` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | TEST-05 | — | Invalid/legacy bot logic normalised or rejected | unit | `npx vitest run tests/bot-data-validators.test.js tests/outfit-import-parser.test.js` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | TEST-06 | T-1-01 | `_buildBotCode` output parses via `new Function()` for backtick, `${`, `'`, `\` | unit | `npx vitest run tests/bot-engine-escaping.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — `test` script → `vitest run`; devDependencies vitest@5, @vitest/coverage-v8@5, fake-indexeddb@6, lz-string@1.5.0
- [ ] `vitest.config.js` — `environment: 'node'`, `setupFiles: ['./tests/setup/fake-indexeddb.js']`
- [ ] `.gitignore` — `node_modules/`, `coverage/`
- [ ] `tests/setup/fake-indexeddb.js` — `import 'fake-indexeddb/auto'`
- [ ] `tests/helpers/loadScript.js` — shared vm-sandbox loader (stubs: window/document/localStorage/addEventListener bare + on window, LZString, `_money`/`_rankData`/`_shop` pre-declared)
- [ ] `tests/idb-canary.test.js`, `tests/idb-helpers.test.js`, `tests/bot-data-validators.test.js`, `tests/outfit-import-parser.test.js`, `tests/bot-engine-escaping.test.js` — stubs for TEST-01..06
- [ ] Package legitimacy checkpoint before `npm install` (vitest flagged "too-new" by heuristic only)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canary actually fails without fake-indexeddb | TEST-03 | Meta-check of the test harness itself | Temporarily remove the `setupFiles` entry in `vitest.config.js`, run `npx vitest run tests/idb-canary.test.js`, expect exactly 1 failure with a clear message, restore config |
| Production untouched | TEST-01 | Diff inspection | `git diff --stat index.html` and script tags show no Phase-1 changes; no build step introduced |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
