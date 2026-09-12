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
| 1-01-01 | 01 | 1 | TEST-01 (Legitimacy-Gate) | T-1-SC | Human verifies vitest/@vitest/coverage-v8 on npmjs.com before install | checkpoint:human-verify | — (blocking-human) | n/a | ⬜ pending |
| 1-01-02 | 01 | 1 | TEST-01, TEST-03 | T-1-02, T-1-03, T-1-06 | Canary asserts fake IDB present (one `it`, no own import); meta-run without setupFiles → exactly `1 failed` | integration + unit | `npm test` und `npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js` (erwartet Exit ≠ 0, `1 failed`) | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | TEST-02 | T-1-02, T-1-04 | Three production files load unchanged in one vm sandbox in script order; `let` globals via `evalIn`; idbGet/idbSet round-trip over fake-indexeddb | unit | `npx vitest run tests/load-script.test.js tests/idb-helpers.test.js` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | TEST-05 | — | `_normLogik`/`_migriereLogik`: invalid inputs passed through unmutated, legacy values normalised, count + idempotence + persistence | unit | `npx vitest run tests/bot-data-validators.test.js` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | TEST-05 | T-1-05, T-1-07 | `_oiDetectType`/`_oiBuildExecCode` with real lz-string; invalid input never reaches the `_raw=` apply path; output parsed only | unit | `npx vitest run tests/outfit-import-parser.test.js` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | TEST-06 | T-1-01, T-1-05 | RED: adversarial names (`O'Brien`, newline …) make `new Function()` throw before the fix | unit (expected red) | `npx vitest run tests/bot-engine-escaping.test.js` (erwartet Exit ≠ 0 vor dem Fix) | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | TEST-06 | T-1-01, T-1-06 | GREEN: `safeName` escapes `'`, `\r`, `\n`; only bot-engine.js:49 changed (`git diff --numstat d9ad6af HEAD -- bot-engine.js` = 1/1) | unit | `npx vitest run tests/bot-engine-escaping.test.js && node --check bot-engine.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — `test` script → `vitest run`; devDependencies vitest@5, @vitest/coverage-v8@5, fake-indexeddb@6, lz-string@1.5.0
- [ ] `vitest.config.js` — `environment: 'node'`, `setupFiles: ['./tests/setup/fake-indexeddb.js']`
- [ ] `.gitignore` — `node_modules/`, `coverage/`
- [ ] `tests/setup/fake-indexeddb.js` — `import 'fake-indexeddb/auto'`
- [ ] `vitest.no-idb.config.js` — Meta-Config ohne setupFiles für den automatisierten TEST-03-Meta-Check (Plan 01-01)
- [ ] `tests/helpers/loadScript.js` — shared vm-sandbox loader (Plan 01-02). Probe-verifizierte Stub-Liste: `console`, `setTimeout`/`clearTimeout` (Host), `setInterval: () => 0`/`clearInterval` No-op (items.js registriert unbedingte Intervalle), `btoa`/`atob`, Map-`localStorage`, `document` mit Element-Stubs aus `getElementById`/`querySelector`/`createElement` (items.js Auto-Init ruft `renderGroups()` beim Laden — `null` bricht das Laden), `querySelectorAll` → `[]`, bare `addEventListener`/`removeEventListener`, `indexedDB: globalThis.indexedDB`, `_money`/`_rankData`/`_shop` pre-declared, `window` self-ref; `evalIn()` für `let`-Globals (`_bots`, `_botVars`, `_playerKeys` sind keine Sandbox-Properties)
- [ ] `tests/idb-canary.test.js` (01-01), `tests/load-script.test.js`, `tests/idb-helpers.test.js`, `tests/bot-data-validators.test.js`, `tests/outfit-import-parser.test.js` (01-02), `tests/bot-engine-escaping.test.js` (01-03, eigene Minimal-Sandbox: window, console, btoa, atob, `_money`/`_rankData`/`_shop`) — Tests für TEST-01/02/03/05/06
- [ ] Package legitimacy checkpoint before `npm install` (vitest flagged "too-new" by heuristic only) — Plan 01-01 Task 1, `gate="blocking-human"`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canary actually fails without fake-indexeddb | TEST-03 | Jetzt automatisiert (Plan 01-01 Task 2, Verify 2) — kein Config-Editieren mehr nötig | `npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js` → Exit ≠ 0, Ausgabe enthält `fake-indexeddb/auto nicht geladen` und `Tests  1 failed` |
| Production untouched | TEST-01 | Git-Historienprüfung gegen die Phase-Baseline `d9ad6af` (Arbeitsbaum trägt unrelated Änderungen, daher kein `git diff` gegen den Arbeitsbaum) | `git log --format=%h d9ad6af..HEAD -- index.html items.js bot-data.js bot-ui.js outfit-import.js loader.js` gibt nichts aus; `git diff --numstat d9ad6af HEAD -- bot-engine.js` = `1 1` (einzige Produktionsänderung); kein `build`-Script in package.json |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
