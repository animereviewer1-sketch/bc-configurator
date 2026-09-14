---
phase: 04-entflechtung
plan: 03
subsystem: storage
tags: [screenshots, export, json, tweaks-panel, red-green]

# Dependency graph
requires:
  - phase: 04-entflechtung
    provides: "04-02: bridge.js/items.js Grundlage unveraendert; exportAllData()/importAllData()/_jsonParts()-Pfad seit vor Phase 4 unangetastet"
provides:
  - "exportScreenshotsOnly() (items.js) — Ein-Klick-JSON-Export aller drei Screenshot-Sammlungen (Profil, Outfit-Scan/LSCG, MBS-Wheel) unter denselben Feldnamen wie exportAllData(), restore-fähig über importAllData()"
  - "Tweaks-Panel-Sektion 🖼️ Screenshot-Speicher (index.html) mit Button „📷 Screenshots exportieren“ und Status-Div #screenshotStoreInfo für Plan 04-04"
affects: [04-04-screenshot-store]

# Actuals (#2632)
actuals:
  tokens: 2845
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Screenshot-Export reuse-t den bestehenden _jsonParts/Blob-Pfad aus exportAllData() 1:1 (keine zweite Serialisierungs-Implementierung) — Vorlage für zukünftige Teil-Exports"

key-files:
  created:
    - tests/screenshot-export.test.js
  modified:
    - items.js
    - index.html

key-decisions:
  - "exportScreenshotsOnly() schreibt die drei Maps unter EXAKT den Feldnamen von exportAllData() (profileScreenshots, lscgScreenshots, mbsWheelShots), damit importAllData() die Export-Datei ohne jede Anpassung als Restore einlesen kann (Orchestrator-Entscheidung 6)"
  - "Kommentar über der Funktion als einzeilige // Zeile statt Blockkommentar gesetzt (Deviation, siehe unten), damit der Abstand zum schließenden } von exportAllData ≤ 4 Zeilen bleibt (Acceptance-Criterion)"

patterns-established:
  - "Teil-Export (nur eine Untermenge der Backup-Felder) als eigene Funktion nach demselben bcSpeichernJetzt() → Leer-Check → payload → _jsonParts/Blob → Anker-Muster wie exportAllData() — Vorlage für weitere granulare Exports"

requirements-completed: [SPLIT-07]

coverage:
  - id: D1
    description: "exportScreenshotsOnly() exportiert PROFILE_SCREENSHOTS/LSCG_SCREENSHOTS/_mbsWheelShots unter den exportAllData-Feldnamen (profileScreenshots/lscgScreenshots/mbsWheelShots) als JSON-Download BC_Screenshots_<Datum>.json mit _meta (exportedAt, version 1, tool, counts)"
    requirement: "SPLIT-07"
    verification:
      - kind: unit
        ref: "tests/screenshot-export.test.js#exportiert alle drei Maps unter den Feldnamen von exportAllData"
        status: pass
      - kind: unit
        ref: "tests/screenshot-export.test.js#_meta: exportedAt (ISO), version 1, tool nennt Screenshot, counts je Map"
        status: pass
      - kind: unit
        ref: "tests/screenshot-export.test.js#Download-Anker: Dateiname BC_Screenshots_YYYY-MM-DD.json, click 1×, href aus createObjectURL"
        status: pass
    human_judgment: false
  - id: D2
    description: "Export ist restore-kompatibel (importAllData liest genau diese Feldnamen), flusht ausstehende Sammelspeicher-Writes vor dem Lesen und mutiert keine Map/IDB"
    requirement: "SPLIT-07"
    verification:
      - kind: unit
        ref: "tests/screenshot-export.test.js#ausstehende Sammelspeicher-Writes werden vor dem Export ausgeführt"
        status: pass
      - kind: unit
        ref: "tests/screenshot-export.test.js#mutiert nichts: Maps vor/nach identisch"
        status: pass
      - kind: unit
        ref: "tests/screenshot-export.test.js#Payload ist restore-kompatibel: importAllData liest genau diese Feldnamen (statisch)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Leere Sammlung meldet showStatus(info) ohne Download; Fehler im Download-Pfad meldet showStatus(error) ohne zu werfen"
    requirement: "SPLIT-07"
    verification:
      - kind: unit
        ref: "tests/screenshot-export.test.js#leer: Hinweis per showStatus(info), kein Download"
        status: pass
      - kind: unit
        ref: "tests/screenshot-export.test.js#Fehlerpfad: createObjectURL wirft → showStatus(error), kein Throw"
        status: pass
    human_judgment: false
  - id: D4
    description: "Button „📷 Screenshots exportieren“ und Status-Div #screenshotStoreInfo sitzen genau einmal in einer neuen Sektion 🖼️ Screenshot-Speicher zwischen 📜 EXEC-Log und 📦 Item-Katalog; index.html erhält gegenüber Plan-04-02-Ende nur Einfügungen"
    requirement: "SPLIT-07"
    verification:
      - kind: unit
        ref: "tests/screenshot-export.test.js#Button und Status-Div genau einmal, zwischen EXEC-Log und Item-Katalog"
        status: pass
      - kind: other
        ref: "git diff --numstat f89ba37..HEAD -- index.html → 9 Insertions, 0 Deletions"
        status: pass
    human_judgment: false
  - id: D5
    description: "Manuelle Verifikation im echten Browser: Klick auf 📷 Screenshots exportieren lädt eine plausible JSON-Datei herunter, die sich über ⬆️ Restore wieder einspielen lässt"
    verification: []
    human_judgment: true
    rationale: "Erfordert echten Browser-Download/Datei-Dialog und den bestehenden Restore-Pfad; laut Plan-Text end-of-phase gesammelt (nicht blockierend für diesen Plan, wird in Plan 04-04 zusammengeführt)"

# Metrics
duration: 9min
completed: 2026-09-14
status: complete
plan_head_before: 5e850f1364128a4ab25126f4a8718445b6e9c3e7
commits: 3
---

# Phase 4 Plan 3: Screenshot-Export vor der Migration Summary

**`exportScreenshotsOnly()` erzeugt per bestehendem `_jsonParts`/`Blob`-Pfad einen restore-kompatiblen JSON-Export aller drei Screenshot-Sammlungen; neue Tweaks-Panel-Sektion `🖼️ Screenshot-Speicher` mit Button und Status-Div für Plan 04-04 — RED→GREEN mit neun Testfällen.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-14T16:48:00Z
- **Completed:** 2026-09-14T16:57:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 neu, 2 geändert)

## Accomplishments

- `tests/screenshot-export.test.js` (SPLIT-07, neu): 9 Testfälle in zwei `describe`-Blöcken (Payload/Download/Flush/Nicht-Mutation/Leer/Fehler/Restore-Kompatibilität + Tweaks-Panel-Markup) mit `FakeBlob`/`URL`-Stubs und `document.createElement`-Override — **RED-CONFIRMED** vor der Implementierung (9 Fälle rot, `ctx.exportScreenshotsOnly is not a function` bzw. Zählungen 0, exakt wie im Plan vorausgesagt)
- `items.js`: `function exportScreenshotsOnly()` direkt nach `exportAllData()` — `bcSpeichernJetzt()` → Leer-Check (`showStatus('⚠️ Keine Screenshots zum Exportieren', 'info')`) → Payload mit `_meta` (`exportedAt`, `version: 1`, `tool`, `counts`) und den drei Maps unter den Feldnamen von `exportAllData` (`profileScreenshots`, `lscgScreenshots`, `mbsWheelShots`) → `_jsonParts`/`Blob`/Anker-Download `BC_Screenshots_<Datum>.json` → `catch` meldet `showStatus('❌ Screenshot-Export fehlgeschlagen: …', 'error')` ohne zu werfen — **GREEN** (9 passed), volle Suite grün (18 Dateien, 235 passed + 2 expected fail, vorher 226 + 2)
- `index.html`: Sektion `🖼️ Screenshot-Speicher` mit `#screenshotStoreInfo` zwischen `📜 EXEC-Log` und `📦 Item-Katalog` eingefügt — ausschließlich Einfügungen (9 Insertions, 0 Deletions gegenüber Plan-04-02-Ende `f89ba37`)

### RED-Ausgabe (Task 1, vor der Implementierung)

```
npx vitest run tests/screenshot-export.test.js
 Test Files  1 failed (1)
      Tests  9 failed (9)
```
Alle 9 Fälle rot: `TypeError: ctx.exportScreenshotsOnly is not a function` (7 Fälle), `expected -1 to be greater than -1` (statischer Fall 8, Funktion existiert nicht), `expected +0 to be 1` (Panel-Markup, Fall 9). RED-CONFIRMED-Marker der Plan-Verify-Befehle wurde ausgegeben.

### GREEN-Ausgabe (Task 2, nach der Implementierung)

```
node --check items.js  → Exit 0
npx vitest run tests/screenshot-export.test.js
 Test Files  1 passed (1)
      Tests  9 passed (9)

npm test
 Test Files  18 passed (18)
      Tests  235 passed | 2 expected fail (237)
```

### `git diff --numstat f89ba37..HEAD -- index.html`

```
9	0	index.html
```
9 Insertions, 0 Deletions — reine Einfügung, wie von der Threat-Mitigation T-4-14 verlangt.

## Task Commits

Jeder Task wurde atomar committet (RED → GREEN, plus ein Rule-1-Fix):

1. **Task 1: Export-Test schreiben, RED bestätigt** - `588347e` (test)
2. **Task 2: `exportScreenshotsOnly()` + Tweaks-Sektion — GREEN** - `9b1fabb` (feat)
3. **Task 2 Nachbesserung (Deviation, siehe unten)** - `455a6fb` (fix)

**Plan metadata:** folgt in separatem Commit (docs)

_Note: RED→GREEN wie geplant — Task 1 committet den roten Test, bevor items.js/index.html angefasst werden._

## Files Created/Modified

- `tests/screenshot-export.test.js` - Neu: SPLIT-07, 9 Fälle für Payload/Download/Flush/Nicht-Mutation/Leer/Fehler/Restore-Kompatibilität/Panel-Markup
- `items.js` - `function exportScreenshotsOnly()` direkt nach `exportAllData()`; reuse-t `bcSpeichernJetzt()`/`_jsonParts`/`Blob`/Anker-Muster
- `index.html` - Sektion `🖼️ Screenshot-Speicher` im Tweaks-Panel (`#screenshotStoreInfo`, Button `📷 Screenshots exportieren`) zwischen `📜 EXEC-Log` und `📦 Item-Katalog`

## Decisions Made

Siehe `key-decisions` im Frontmatter — identische Feldnamen zu `exportAllData()` für Restore-Kompatibilität; einzeiliger Kommentar statt Blockkommentar, um das Abstands-Acceptance-Criterion zu treffen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Funktionsabstand zu `exportAllData()` überschritt das Acceptance-Criterion (≤4 Zeilen)**
- **Gefunden bei:** Task 2, Nachverifikation der Acceptance-Criteria nach dem GREEN-Commit
- **Issue:** Der im Plan vorgeschlagene mehrzeilige Blockkommentar (`/* … */`, 5 Zeilen) vor `function exportScreenshotsOnly()` ergab einen Abstand von 8 Zeilen zum schließenden `}` von `exportAllData()` — das Acceptance-Criterion verlangt ≤ 4 Zeilen (unmittelbar danach).
- **Fix:** Blockkommentar durch eine einzeilige `//`-Zeile mit demselben Inhalt ersetzt; Abstand danach 4 Zeilen. Kein funktionaler Unterschied — reine Kommentarform.
- **Files modified:** `items.js`
- **Verifikation:** `awk`-Zeilendifferenz erneut geprüft (4 ≤ 4), `node --check items.js`, `npx vitest run tests/screenshot-export.test.js` (9 passed), `npm test` (18 Dateien grün) alle erneut grün
- **Committed in:** `455a6fb`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Kein Einfluss auf Funktionalität oder Sicherheit — reine Kommentarform-Korrektur, um ein im Plan selbst definiertes Acceptance-Criterion zu erfüllen.

## Issues Encountered

None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Known Stubs

Keine. `#screenshotStoreInfo` bleibt bewusst mit Platzhaltertext `–` gefüllt — Plan 04-04 füllt es mit dem Migrationsstatus (im Plan-Text so vorgesehen, kein Stub).

## Next Phase Readiness

- `exportScreenshotsOnly()` und die Tweaks-Sektion stehen bereit, bevor Plan 04-04 die Screenshot-Migration einführt — Nutzer kann vorab ein restore-fähiges JSON-Backup der Screenshot-Sammlungen ziehen (Kernwert-Absicherung, Erfolgskriterium 5 erster Halbsatz)
- `#screenshotStoreInfo` im Tweaks-Panel wartet auf Plan 04-04, das den Migrationsstatus dort einträgt
- `npm test` grün: 18 Testdateien, 235 passed + 2 expected fail
- `node --check items.js` grün
- index.html gegenüber Plan-04-02-Ende (`f89ba37`) nur Einfügungen (9/0)
- End-of-Phase-Human-Check (Klick auf 📷 Screenshots exportieren im echten Browser, Datei via ⬆️ Restore wieder einspielen) steht weiterhin aus — wird laut Plan-Text in Plan 04-04 gesammelt
- Kein Blocker für 04-04

---
*Phase: 04-entflechtung*
*Completed: 2026-09-14*

## Self-Check: PASSED
