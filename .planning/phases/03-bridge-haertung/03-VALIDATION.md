---
phase: "3"
slug: "bridge-haertung"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-13"
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/bridge-protocol.test.js tests/injected-code-origin.test.js tests/loader-origin.test.js tests/exec-log.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run the affected test file(s)
- **After every plan wave:** Run `npm test`; `node --check items.js loader.js bot-engine.js`
- **Before `/gsd-verify-work`:** Full suite green; live smoke test (cache load, EXEC, screenshot, room scan) pending as human check
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | TEST-07 (W0) | T-3-06 | Sandbox `addEventListener` captures listeners in `_listeners` (Map) and `dispatch`/`dispatchMessage` invoke them with `{data, origin, source}`; `location.origin` stub = `https://tool.test`; all 10 existing test files stay green | unit | `npx vitest run tests/load-script.test.js && npm test` | ⚠️ extend | ⬜ pending |
| 3-01-02 | 01 | 1 | TEST-07, STAB-04, STAB-07 (+ STAB-06 tool half) | T-3-01, T-3-05 | RED: `tests/bridge-protocol.test.js` — `_bridgeSenderOk` (origin+source, TOFU), dispatch by type, `bcSend` learned origin + static PING audit, `_heartbeatCheck`, `manualReconnect` resets `_bcOrigin` | unit (RED) | `npx vitest run tests/bridge-protocol.test.js` (RED-CONFIRMED) | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | STAB-04, STAB-07 (+ STAB-06 tool half) | T-3-01, T-3-05 | GREEN in items.js: `_bridgeSenderOk(ev)` used by main + debug listener; origin learned once, then enforced; `_heartbeatCheck()` named; `_bcOrigin = null` in `manualReconnect()`; exactly 2 bootstrap PINGs keep `'*'` | unit (GREEN) + static | `npx vitest run tests/bridge-protocol.test.js && node --check items.js && npm test` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | STAB-05, STAB-06 | T-3-03, T-3-02 | RED: `tests/injected-code-origin.test.js` (behavioral: `debugOsOutfit`, `bcKeys`, `_buildBotCode` + static audit 2/0/0, single `TOOL_ORIGIN` definition) and `tests/loader-origin.test.js` (static: origin string 1×, `ALLOWED_ORIGIN` derived, source-pin guard); escaping sandbox gets `TOOL_ORIGIN` | unit (RED) | `npx vitest run tests/injected-code-origin.test.js tests/loader-origin.test.js` (RED-CONFIRMED) | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | STAB-06 (loader) | T-3-02, T-3-08 | loader.js derives `ALLOWED_ORIGIN = new URL(POPUP_URL).origin` (origin string 1×) and rejects non-`PING` messages whose `ev.source !== window.__BCK_popupRef`; diff ≤ +8/−2 | static test + `node --check` | `npx vitest run tests/loader-origin.test.js && node --check loader.js` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | STAB-05, STAB-06 (tool) | T-3-03, T-3-09, T-3-10 | `const TOOL_ORIGIN = window.location.origin;` once in items.js; 17 items.js + 18 bot-engine.js (`_TOOL_ORIGIN` head const) + 1 bot-ui.js sites use it; wildcard targets 2/0/0/0 | unit (GREEN) + static | `npx vitest run tests/injected-code-origin.test.js tests/bot-engine-escaping.test.js tests/loader-origin.test.js && npm test` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | STAB-08 | T-3-04, T-3-11 | RED: `tests/exec-log.test.js` — append contract `{ts, desc, len}`, cap 200, scan-data invariance (`LSCG_DB`/`PROFILE_SCREENSHOTS` unchanged after 250 EXECs + save), persistence/merge under `BC_ExecLog_v1`, panel rendering | unit (RED) | `npx vitest run tests/exec-log.test.js` (RED-CONFIRMED) | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | STAB-08 | T-3-04, T-3-11, T-3-12 | GREEN: EXEC-log block in items.js, one hook line in `bcSend` before `postMessage`, section `📜 EXEC-Log` in index.html (insertions only) | unit (GREEN) + static | `npx vitest run tests/exec-log.test.js && node --check items.js && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/loadScript.js` — real `addEventListener`/`removeEventListener` (listener registry `_listeners` + `dispatch(sandbox, type, event)` / `dispatchMessage(sandbox, data, {origin, source})` helpers), `location` stub (`SANDBOX_ORIGIN = 'https://tool.test'`), `window.opener` injectable via `extraGlobals` (Plan 03-01 Task 1)
- [ ] `tests/load-script.test.js` — 4 new cases for the registry, `removeEventListener`, items.js handler registration, `location` override (Plan 03-01 Task 1)
- [ ] `tests/bridge-protocol.test.js` — STAB-04/07 + STAB-06 tool half + TEST-07 (Plan 03-01 Task 2)
- [ ] `tests/injected-code-origin.test.js` — STAB-05 + STAB-06 tool-side single definition (Plan 03-02 Task 1)
- [ ] `tests/loader-origin.test.js` — STAB-06 loader half, static (Plan 03-02 Task 1; loader sandbox deferred to Phase 5 per orchestrator decision 4)
- [ ] `tests/bot-engine-escaping.test.js` — minimal sandbox gains `TOOL_ORIGIN: 'https://tool.test'` (Plan 03-02 Task 1)
- [ ] `tests/exec-log.test.js` — STAB-08 (Plan 03-03 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live smoke: cache load, EXEC (bot start), screenshot capture, room scan still work | Criterion 5 | Needs real BC tab + bookmarklet | Run bookmarklet, load cache, start a bot, capture a screenshot, run room scan — all succeed; console shows no origin errors |
| Disconnect visible + reconnect works | STAB-07 | Real `window.opener` lifecycle | Close/reload the BC tab → status badge goes red; re-run bookmarklet + reconnect → green |
| EXEC log visible | STAB-08 | DOM rendering | Start a bot → entry with timestamp appears in the Tweaks panel log |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
