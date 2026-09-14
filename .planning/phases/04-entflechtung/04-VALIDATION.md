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
| 4-01-01 | 01 | 1 | SPLIT-01 | T-4-01 | RED: `persistence.js` per CJS-Require + Sandbox importierbar, `CORE_SCRIPTS`/`expandLoadOrder`-Vertrag, statisches Extraktions-Gate (0× items.js / 1× persistence.js) | unit (RED) | `npx vitest run tests/persistence-module.test.js` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | SPLIT-01 | T-4-01 | GREEN: Block items.js 5-96 byte-identisch in persistence.js (`diff`-Gate), geguardeter `module.exports`, Loader-Expansion; alle bestehenden Tests unverändert grün | unit + suite | `npx vitest run tests/persistence-module.test.js && node --check persistence.js && node --check items.js && npm test` | n/a | ⬜ pending |
| 4-01-03 | 01 | 1 | SPLIT-04 | T-4-02 | items.js ohne persistence.js → `#loadOrderFatal` + Throw in der ersten Anweisung; index.html-Kommentar + Write-Zeile (nur Einfügungen); `docs/LOAD-ORDER.md` | unit (RED→GREEN) | `npx vitest run tests/load-order-guard.test.js && node --check items.js && npm test` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | SPLIT-02, SPLIT-03 | T-4-03, T-4-08 | RED: Registry-Vertrag, Sicherheitsshell vor Dispatch, neuer Typ ohne items.js, 35 Typen registriert, statisches SPLIT-03-Gate | unit (RED) | `npx vitest run tests/bridge-registry.test.js` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | SPLIT-02, SPLIT-03 | T-4-08, T-4-01, T-4-11 | GREEN: bridge.js (Blöcke byte-identisch, Sicherheitszeilen je 1×), 35 `onBridgeMessage`-Registrierungen, Debug-Fold, Start-PING über bcSend; items.js 0× Listener/postMessage/switch/indexedDB.open; 21 Bridge-Protokoll-Fälle grün | unit + static + suite | `npx vitest run tests/bridge-registry.test.js tests/bridge-protocol.test.js tests/injected-code-origin.test.js tests/load-script.test.js tests/exec-log.test.js && node --check bridge.js && node --check items.js && npm test` | ⚠️ extend | ⬜ pending |
| 4-02-03 | 02 | 2 | SPLIT-04 | T-4-02 | Guard nennt bridge.js (items.js), bot-ui.js-Guard, docs/LOAD-ORDER.md mit bridge.js + Registrierungsanleitung | unit (RED→GREEN) | `npx vitest run tests/load-order-guard.test.js tests/injected-code-origin.test.js && node --check bot-ui.js && npm test` | ⚠️ extend | ⬜ pending |
| 4-03-01 | 03 | 3 | SPLIT-07 | T-4-09 | RED: Payload/Feldnamen restore-kompatibel, Dateiname, Flush, Leer-/Fehlerpfad, Nicht-Mutation, Panel-Markup | unit (RED) | `npx vitest run tests/screenshot-export.test.js` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 3 | SPLIT-07 | T-4-09, T-4-13 | GREEN: `exportScreenshotsOnly()` über `_jsonParts`/`Blob`; Sektion `🖼️ Screenshot-Speicher` (nur Einfügungen) | unit + suite | `npx vitest run tests/screenshot-export.test.js && node --check items.js && npm test` | n/a | ⬜ pending |
| 4-04-01 | 04 | 4 | SPLIT-05, SPLIT-06 | T-4-04, T-4-05, T-4-06 | RED: onblocked/versionchange, verifizierte additive idempotente Migration, Teilfehler, ein Datensatz je Bild, Ladepfad, Statusanzeige | unit (RED) | `npx vitest run tests/screenshot-migration.test.js tests/screenshot-store.test.js` | ❌ W0 | ⬜ pending |
| 4-04-02 | 04 | 4 | SPLIT-06 | T-4-04, T-4-05 | GREEN: `_IDB_VERSION = 2`, Store `screenshots`, `onblocked`→Status ohne Fortfahren, `onversionchange`→close, Migration mit Marker `BC_SCREENSHOT_MIGRATION_v1`, Alt-Blobs unverändert | unit | `npx vitest run tests/screenshot-migration.test.js tests/persistence-module.test.js tests/idb-helpers.test.js && node --check persistence.js && npx vitest run --exclude tests/screenshot-store.test.js` | n/a | ⬜ pending |
| 4-04-03 | 04 | 4 | SPLIT-05 | T-4-06, T-4-01 | GREEN: Shadow-Diff-Flush (ein put/delete je Bild), Maps aus dem Store, Aufruf-/Lesestellen-Invarianz, Phase-2-Löschpfade konsistent, Statusanzeige | unit + suite | `npx vitest run tests/screenshot-store.test.js tests/delete-consistency.test.js tests/screenshot-sync.test.js tests/idb-helpers.test.js tests/delete-confirmation.test.js && node --check items.js && npm test` | ⚠️ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/persistence-module.test.js` — SPLIT-01: CJS-Require + Sandbox-Dual-Export, `CORE_SCRIPTS`/`expandLoadOrder`, statisches Extraktions-Gate (Plan 04-01 Task 1)
- [ ] `tests/load-order-guard.test.js` — SPLIT-04 (Plan 04-01 Task 3; erweitert in 04-02 Task 3)
- [ ] `tests/bridge-registry.test.js` — SPLIT-02/03 (Plan 04-02 Task 1)
- [ ] `tests/screenshot-export.test.js` — SPLIT-07 (Plan 04-03 Task 1)
- [ ] `tests/screenshot-migration.test.js` — SPLIT-06, modelliert auf der ausgeführten Probe (Plan 04-04 Task 1)
- [ ] `tests/screenshot-store.test.js` — SPLIT-05 (Plan 04-04 Task 1)
- [ ] Loader: `CORE_SCRIPTS`/`expandLoadOrder` in `tests/helpers/loadScript.js` (04-01 Task 2, +bridge.js in 04-02 Task 2, +`IDBKeyRange` in 04-04 Task 2) — keine der 16 bestehenden `loadScript(['items.js'…])`-Aufrufstellen wird geändert; Datei-Ort-Aussagen in bridge-protocol/injected-code-origin/load-script (04-02) und Alt-Blob-Assertions in delete-consistency/screenshot-sync/idb-helpers (04-04) folgen dem Code im jeweiligen GREEN-Commit

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
