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
| **Quick run command** | `npx vitest run tests/bridge-protocol.test.js tests/exec-log.test.js` |
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
| 3-01-01 | 01 | 1 | TEST-07 (W0) | — | Sandbox `addEventListener` captures listeners and can dispatch `message` events with origin/source | unit | `npx vitest run tests/load-script.test.js` | ⚠️ extend | ⬜ pending |
| 3-01-02 | 01 | 1 | STAB-04, STAB-06, STAB-07, TEST-07 | T-3-01, T-3-02 | Tool handler ignores wrong origin/source after handshake; `bcSend` uses `_bcOrigin`; bootstrap PING exception documented; heartbeat timeout sets `dataset.conn='off'`; `manualReconnect` resets `_bcOrigin` | unit (RED→GREEN) | `npx vitest run tests/bridge-protocol.test.js` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | STAB-05 | T-3-03 | Every generated injected-code string uses the tool-origin literal instead of `"*"` (36 sites in items.js/bot-engine.js/bot-ui.js); grep-count assertion = 0 remaining | unit (RED→GREEN) | `npx vitest run tests/bridge-protocol.test.js -t "injizierter Code"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | STAB-06 (loader) | T-3-02 | loader.js derives `ALLOWED_ORIGIN` from `POPUP_URL` (single definition) and pins `event.source` after handshake | static + `node --check` | `node --check loader.js && test "$(grep -c "animereviewer1-sketch.github.io" loader.js)" = 1` | n/a | ⬜ pending |
| 3-03-01 | 03 | 3 | STAB-08 | T-3-04 | Every EXEC through `bcSend` appends `{ts, desc, len}` to a capped ring buffer persisted under `BC_ExecLog_v1`; rotation never touches scan data; log view in Tweaks panel | unit (RED→GREEN) | `npx vitest run tests/exec-log.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/loadScript.js` — real `addEventListener`/`removeEventListener` (listener registry + `dispatch(type, event)` helper), `window.opener` injectable via `extraGlobals`
- [ ] `tests/bridge-protocol.test.js` — STAB-04/05/06/07 + TEST-07
- [ ] `tests/exec-log.test.js` — STAB-08

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
