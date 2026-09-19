---
phase: "6"
slug: "scan-tab-analyse"
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `npx vitest run tests/baseline-manifest.test.js tests/snapshot-delete.test.js tests/scan-tab-export.test.js tests/scan-tab.test.js tests/analyze-snapshot.test.js` |
| **Full suite command** | `npm test` (Ist-Stand vor Plan 01: 24 Dateien / 331 passed + 2 expected fail — ein Datei/8-Test-Drift ggü. der hier ursprünglich notierten 23/323 durch den zwischen RESEARCH und Ausführung gelandeten Quick-Task `260919-1ez`, siehe 06-01-SUMMARY.md; muss nie sinken. Nach Plan 01: 25 Dateien / 342 passed + 2 expected fail. Nach Plan 02: 27 Dateien / 359 passed + 2 expected fail — Plan-Text nannte 26, siehe 06-02-SUMMARY.md Deviations. Nach Plan 03: 29 Dateien / 383 passed + 2 expected fail. Nach Plan 04 unverändert (docs-only) — Plan-Text nannte 28, derselbe Ist-Stand-Drift-Effekt, siehe 06-03-SUMMARY.md Deviations) |
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
| 6-01-01 | 01 | 1 | SCAN-09 | T-6-01 | RED: `tests/baseline-manifest.test.js` — Frische-Diff (JSON `toEqual`, JS byte-identisch), Determinismus (kein Zeitstempel), Klassifikation function/assetGroup/unknown (classif), Sandbox-Ladbarkeit von `baseline-manifest.js`, statische Gates (CJS, dev-only, npm-Script) | unit (RED) | `npx vitest run tests/baseline-manifest.test.js` (rot) | ✅ | ✅ done |
| 6-01-02 | 01 | 1 | SCAN-09 | T-6-01 | GREEN: `tools/build-baseline.js` (dev-only, not deployed, `npm run baseline`) extrahiert Bezeichner aus bot-engine/items/bot-ui/bot-data/loader.js, klassifiziert statisch, schreibt deterministisch `baseline-manifest.json` + `baseline-manifest.js` (`const BASELINE_MANIFEST`); beide committet | unit (GREEN) | `npx vitest run tests/baseline-manifest.test.js && npm run baseline && git diff --quiet -- baseline-manifest.json baseline-manifest.js` | ✅ | ✅ done |
| 6-02-01 | 02 | 2 | SCAN-11 | T-6-02, T-6-03, T-6-04 | RED: `tests/snapshot-delete.test.js` (confirm false/true/fehlt, unbekannte id, Fehlerpfad, Audit: genau eine Lösch-Operation/Aufrufstelle, readdir-Gate), `tests/scan-tab-export.test.js` (Payload `{_meta, snapshot}`, Dateiname, Fehlerpfade, Mutationsfreiheit); Nachzug `tests/persistence-module.test.js` | unit (RED) | `npx vitest run tests/snapshot-delete.test.js tests/scan-tab-export.test.js tests/persistence-module.test.js` (rot) | ✅ | ✅ done |
| 6-02-02 | 02 | 2 | SCAN-11 | T-6-02, T-6-03, T-6-10, T-6-11 | GREEN: `idbSnapshotDelete(id)` in persistence.js (einzige Lösch-Operation auf `snapshots`); `scan-tab.js` Teil 1: Guard, `deleteGameSnapshot(id)` (Existenz → `confirm()` → Löschen → Status, fail-closed ohne confirm, keine Schleife), `exportGameSnapshot(id)` (`_jsonParts`/Blob/Anker) | unit (GREEN) + static | `npx vitest run tests/snapshot-delete.test.js tests/scan-tab-export.test.js tests/persistence-module.test.js && node --check persistence.js scan-tab.js` | ✅ | ✅ done |
| 6-03-01 | 03 | 3 | SCAN-10 | T-6-05, T-6-06 | RED: `tests/scan-tab.test.js` (Node-Export, Flatten/Badges/Filter/Zähler, DOM: leer, Vorauswahl, Badges mit echtem Manifest, XSS `<img onerror>`, filter, Paging 300, Debounce 150 ms, ohne Manifest, Snapshot-Wechsel, statische Gates items.js/index.html/docs/Quelle), `tests/analyze-snapshot.test.js` | unit (RED) | `npx vitest run tests/scan-tab.test.js tests/analyze-snapshot.test.js` (rot) | ✅ | ✅ done |
| 6-03-02 | 03 | 3 | SCAN-10 | T-6-05, T-6-06, T-6-12, T-6-13 | GREEN: `scan-tab.js` Rendering (Snapshot-Liste mit ⬇/🗑 je Snapshot, Kategorie-Filter, debounced Suche, Slice 300 + „mehr laden“, Badges aus `BASELINE_MANIFEST`, `escHtml`/`escJsAttr` überall); items.js genau 3 Zeilen; index.html nur Einfügungen (+ Kommentarzeile); docs/LOAD-ORDER.md; `CORE_SCRIPTS` unverändert | unit (GREEN) + static | `npx vitest run tests/scan-tab.test.js tests/snapshot-delete.test.js tests/load-order-guard.test.js tests/game-scan-bridge.test.js && node --check scan-tab.js items.js` | ✅ | ✅ done |
| 6-03-03 | 03 | 3 | SCAN-12 (input) | T-6-15 | GREEN: `tools/analyze-snapshot.js` (`npm run analyze -- <export.json>`) nutzt `_scanFlatten`/`_scanBaselineSets`/`_scanBadge`/`_scanCountBadges` aus scan-tab.js (Dual-Export) — Zahlen identisch mit dem Tab; Markdown-Ausgabe, CLI | unit (GREEN) | `npx vitest run tests/analyze-snapshot.test.js && node --check tools/analyze-snapshot.js` | ✅ | ✅ done |
| 6-04-01 | 04 | 4 | SCAN-12 | — | Checkpoint (human-action, blocking-human): Nutzer exportiert einen echten Snapshot über ⬇ und legt ihn als `.planning/analysis/snapshot.json` ab | human | `node -e` Schema-Check (`inventory.schema === 1`, `modCount > 0`) + `npm run analyze -- .planning/analysis/snapshot.json --limit 5` | ✅ | ✅ done |
| 6-04-02 | 04 | 4 | SCAN-12 | T-6-07, T-6-15, T-6-16 | Doc: `.planning/analysis/GAME-INVENTORY.md` — Übersichtstabelle byte-gleich aus `npm run analyze`, ≥ 15 Vorschläge (Bot-Aktionen/-Trigger/Tab-Funktionen je ≥ 5, Name · Badge · Nutzen · Aufwand), lohnende Mods, Nicht übernommen, Sicherheitshinweis, Methodik; keine Fenced-Code-Blöcke; kein Code geändert | doc (automated gates) + human review | Gate `DOC-OK`/`NO-CODE-OK` aus 06-04-PLAN.md Task 2 | ✅ | ✅ done |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tools/build-baseline.js` + `baseline-manifest.json` + `baseline-manifest.js` + `tests/baseline-manifest.test.js` + package.json-Script `baseline` (Plan 01)
- [x] `tests/snapshot-delete.test.js`, `tests/scan-tab-export.test.js`, Nachzug `tests/persistence-module.test.js` (Export-Listen, statisches Gate) (Plan 02)
- [x] `tests/scan-tab.test.js`, `tests/analyze-snapshot.test.js` (Plan 03) — override `document.getElementById` before rendering (fresh-stub pitfall); „ohne Snapshot“-Fall zuerst (fake-indexeddb pro Datei geteilt)
- [x] `scan-tab.js` is NOT added to CORE_SCRIPTS (not a runtime prerequisite of items.js) — tests load it explicitly (`loadScript(['items.js', 'baseline-manifest.js', 'scan-tab.js'])`)
- [x] `tools/analyze-snapshot.js` + package.json-Script `analyze` (Plan 03) — Voraussetzung für die Zahlen in Plan 04
- [x] `.planning/analysis/snapshot.json` (Plan 04, Nutzer-Checkpoint) — nie per Read in den Kontext laden (eingehalten: nur npm run analyze + node-Skripte)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-19 (alle 8 Tasks ✅, Suite 29 Dateien grün; Manual-Only-Verifications offen für UAT)
