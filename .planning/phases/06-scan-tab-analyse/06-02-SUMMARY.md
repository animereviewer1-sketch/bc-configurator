---
phase: 06-scan-tab-analyse
plan: 02
subsystem: storage
tags: [snapshot-delete, confirm, static-audit, export, json-download, red-green]

# Dependency graph
requires:
  - phase: 06-scan-tab-analyse
    provides: "06-01: Baseline-Manifest-Kontrakt und volle Suite grün (25 Dateien) als Ausgangsbasis; scan-tab.js selbst ist neu in diesem Plan"
provides:
  - "idbSnapshotDelete(id) (persistence.js) — einzige Lösch-Operation auf dem Store `snapshots` im gesamten Repo, statisch bewiesen"
  - "scan-tab.js (neu, Teil 1) — Ladereihenfolge-Guard, Helfer (_scanFormatTs/_scanKb/_scanSafeName/_scanExportName), deleteGameSnapshot(id) (confirm-gated, fail-closed), exportGameSnapshot(id) (JSON-Download eines Snapshots), Dual-Export-Schwanz; noch nicht in index.html geladen"
affects: [06-03-scan-tab-rendering, 06-04-analyse-dokument]

# Actuals (#2632)
actuals:
  tokens: 8280
  tasks: 2
  commits: 2
plan_head_before: 8cdfed0b97044e0aed4526457eac2f88f13ad82f

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Löschpfad-Guard-Reihenfolge (wie 02-02): Existenz-Prüfung (idbSnapshotGet) → genau ein confirm() mit Datum/BC-Version/Mod-Anzahl im Text → Mutation (idbSnapshotDelete) → Status/Re-Render, fail-closed ohne verfügbare confirm-Funktion, keine Schleife um die Aufrufstelle"
    - "Snapshot-Export reuse-t denselben _jsonParts/Blob/Anker-Pfad wie exportScreenshotsOnly() (04-03) — ein Datensatz statt einer Sammlung, mit eigenem _meta.counts aus dem Inventar"
    - "Neuer strukturierter statischer Audit-Stil (Enclosing-Function-Slice über '\\nasync function '/'\\nfunction ' als Grenze) ergänzt den STAB-09-Property-Delete-Audit für IndexedDB-Store-Operationen — Vorlage für künftige Store-Lösch-Audits"

key-files:
  created:
    - scan-tab.js
    - tests/snapshot-delete.test.js
    - tests/scan-tab-export.test.js
  modified:
    - persistence.js
    - tests/persistence-module.test.js
    - .planning/phases/06-scan-tab-analyse/06-VALIDATION.md

key-decisions:
  - "Zwei stale Plan-Verify-Literale gegen den tatsächlichen Ist-Stand korrigiert (Rule 1, analog 06-01): (a) der Diff-Gate `git diff --quiet 49e4365 -- items.js …` schlug fehl, weil items.js bereits vor Phase 6 durch den Quick-Task 260919-1ez von 49e4365 abweicht (unabhängig von diesem Plan) — die Ausführung prüft stattdessen den Diff gegen den Plan-Start-HEAD `8cdfed0`, was die eigentliche Absicht des Gates (dieser Plan rührt die vier Dateien nicht an) korrekt abbildet; (b) `Test Files +26 passed` wurde zu `Test Files +27 passed` korrigiert, weil die Suite vor diesem Plan bereits 25 statt der vom Plantext angenommenen 24 Dateien enthielt (derselbe 06-01-dokumentierte Drift durch 260919-1ez) — 25 + 2 neue Testdateien = 27, keine Regression"
  - "idbSnapshotDelete-id-Validierung wörtlich wie idbSnapshotPut übernommen (Zahl oder nicht-leerer String) für Konsistenz der Snapshot-Primitive"

patterns-established:
  - "Enclosing-Function-Slice-Audit (fnBody-Helfer: Start bis zum nächsten Top-Level '\\nasync function '/'\\nfunction ') als generisches Werkzeug, um zu beweisen, dass ein Gate-Literal NUR innerhalb einer bestimmten Funktion vorkommt — wiederverwendbar für künftige Ein-Aufrufstellen-Invarianten"

requirements-completed: [SCAN-11]

coverage:
  - id: D1
    description: "idbSnapshotDelete(id) ist die einzige Lösch-Operation auf dem Store snapshots im gesamten Repo: id-Validierung (Zahl/nicht-leerer String), readwrite-Transaktion, true/false-Rückgabe, Fehler → console.warn + false ohne Throw"
    requirement: "SCAN-11"
    verification:
      - kind: unit
        ref: "tests/snapshot-delete.test.js#idbSnapshotDelete direkt: ungültige id → false ohne IDB-Zugriff; gültige unbekannte id → true (IDB-Semantik)"
        status: pass
      - kind: unit
        ref: "tests/snapshot-delete.test.js#audit: persistence.js — Lösch-Methode auf objectStore(_IDB_SNAPSHOTS) genau einmal, innerhalb idbSnapshotDelete"
        status: pass
      - kind: unit
        ref: "tests/persistence-module.test.js#statisch: Lösch-API nur idbSnapshotDelete (SCAN-11), Version 3, Store additiv, add statt put"
        status: pass
    human_judgment: false
  - id: D2
    description: "deleteGameSnapshot(id) (scan-tab.js) folgt der STAB-09-Guard-Reihenfolge: Existenz-Prüfung → genau ein confirm() mit Datum/BC-Version/Mod-Anzahl → Löschen → Status/renderScanTab; Abbruch oder fehlende confirm-Funktion lässt den Datensatz unverändert; kein 'alle löschen'"
    requirement: "SCAN-11"
    verification:
      - kind: unit
        ref: "tests/snapshot-delete.test.js#confirm → false: genau ein confirm-Aufruf … keine Lösch-Operation; Datensatz bleibt"
        status: pass
      - kind: unit
        ref: "tests/snapshot-delete.test.js#confirm → true: genau eine Lösch-Operation … zweiter Datensatz unverändert (Kernwert)"
        status: pass
      - kind: unit
        ref: "tests/snapshot-delete.test.js#ohne confirm-Global (Sandbox-Default): nichts wird gelöscht, kein Throw, Rückgabe false (fail-closed)"
        status: pass
      - kind: unit
        ref: "tests/snapshot-delete.test.js#audit: scan-tab.js — idbSnapshotDelete( genau einmal, innerhalb deleteGameSnapshot, nach confirm(, keine Schleife"
        status: pass
    human_judgment: false
  - id: D3
    description: "Neuer statischer Audit beweist: genau eine Lösch-Operation auf dem Store snapshots (persistence.js), genau eine bestätigte Aufrufstelle (scan-tab.js), kein anderer Aufrufer in Root-JS/index.html; die STAB-09-Auditdatei deckt das strukturell nicht ab (RESEARCH Pitfall 4)"
    requirement: "SCAN-11"
    verification:
      - kind: unit
        ref: "tests/snapshot-delete.test.js#kein anderer Aufrufer: alle Root-JS-Dateien außer persistence.js/scan-tab.js und index.html enthalten idbSnapshotDelete nicht"
        status: pass
    human_judgment: false
  - id: D4
    description: "exportGameSnapshot(id) lädt genau einen Datensatz, baut {_meta, snapshot} mit counts aus dem Inventar, serialisiert über _jsonParts/Blob und lädt BC_Snapshot_<Datum>_<gameVersion>_<id>.json herunter; mutiert nichts; unbekannte id/Fehlerpfad melden showStatus ohne Throw"
    requirement: "SCAN-11"
    verification:
      - kind: unit
        ref: "tests/scan-tab-export.test.js#exportiert genau den gespeicherten Datensatz unter snapshot; _meta mit version 1, tool nennt Snapshot, exportedAt ISO, snapshotId, counts aus dem Inventar"
        status: pass
      - kind: unit
        ref: "tests/scan-tab-export.test.js#Download-Anker: Dateiname BC_Snapshot_<YYYY-MM-DD>_<gameVersion>_<id>.json, click 1×, href aus createObjectURL, Status success mit KB"
        status: pass
      - kind: unit
        ref: "tests/scan-tab-export.test.js#mutiert nichts: Datensatz vor/nach identisch; keine add/put/delete-Operation auf snapshots während des Exports (Op-Spy)"
        status: pass
      - kind: unit
        ref: "tests/scan-tab-export.test.js#unbekannte id: kein Download, showStatus info „nicht gefunden“"
        status: pass
      - kind: unit
        ref: "tests/scan-tab-export.test.js#Fehlerpfad: createObjectURL wirft → showStatus error mit Fehlertext, kein Throw"
        status: pass
    human_judgment: false
  - id: D5
    description: "scan-tab.js ist Node-tauglich (Ladereihenfolge-Guard entfällt ohne window, kein Top-Level-DOM-Zugriff) für die spätere Nutzung durch tools/analyze-snapshot.js (Plan 06-03); Ladereihenfolge-Guard-Box entspricht dem game-scan.js-Muster"
    requirement: "SCAN-11"
    verification:
      - kind: unit
        ref: "tests/snapshot-delete.test.js#Ladereihenfolge-Guard: ohne items.js FATAL-Box + Throw; in Node (ohne window) lädt scan-tab.js ohne Throw und exportiert deleteGameSnapshot/exportGameSnapshot"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manuelle Browser-Verifikation: 🗑 im Scan-Tab zeigt tatsächlich einen Bestätigungsdialog; Abbrechen lässt den Snapshot unverändert; Bestätigen löscht ihn; ⬇ lädt eine plausible JSON-Datei herunter"
    verification: []
    human_judgment: true
    rationale: "scan-tab.js ist in diesem Plan noch nicht in index.html verdrahtet (Plan 06-03 hängt das Rendering und die Buttons an) — die vm-Sandbox-Tests decken Guard-Reihenfolge und Store-Mutation vollständig ab, nicht das tatsächliche Klickverhalten im echten Scan-Tab; End-of-Phase-Human-Check laut Projektkonvention"

# Metrics
duration: 13min
completed: 2026-09-19
status: complete
---

# Phase 6 Plan 2: Snapshot-Löschen mit Bestätigung und Snapshot-Export Summary

**`idbSnapshotDelete(id)` (persistence.js) ist die einzige Lösch-Operation auf dem Store `snapshots` im Repo; `scan-tab.js` (neu, Teil 1) liefert den confirm-gated UI-Pfad `deleteGameSnapshot` (fail-closed ohne Bestätigung) und `exportGameSnapshot` für den JSON-Download eines einzelnen Scans — RED→GREEN mit einem neuen statischen Audit, der die STAB-09-Lücke für IndexedDB-Store-Löschungen schließt.**

## Performance

- **Duration:** ~13 min
- **Started:** ~2026-09-19T08:14:00Z (approx. — Anschluss an 06-01)
- **Completed:** 2026-09-19T08:26:55Z
- **Tasks:** 2/2
- **Files modified:** 6 (3 neu, 3 geändert; siehe key-files)

## Accomplishments

- `persistence.js`: `async function idbSnapshotDelete(id)` direkt nach `idbSnapshotKeys` — id-Validierung wie `idbSnapshotPut` (Zahl oder nicht-leerer String, sonst `false` ohne IDB-Zugriff), `readwrite`-Transaktion, `objectStore(_IDB_SNAPSHOTS).delete(id)` als einzige Aufrufstelle dieses Literals im Repo, Fehler → `console.warn('[IDB] snapshot delete:', err)` + `false`, nie ein Throw; Kopfkommentar und Export-Schwanz aktualisiert; `_IDB_VERSION` unverändert bei 3
- `scan-tab.js` (neu, Teil 1): Ladereihenfolge-Guard im Muster von `game-scan.js` (`idbSnapshotGetAll`/`idbSnapshotGet`/`idbSnapshotDelete` ← persistence.js, `showStatus`/`escHtml`/`escJsAttr`/`_jsonParts` ← items.js), erste Anweisung `if (typeof window === 'undefined') return;` für Node-Tauglichkeit; Helfer `_scanFormatTs`/`_scanKb`/`_scanSafeName`/`_scanExportName`; `deleteGameSnapshot(id)` (Guard-Reihenfolge unten); `exportGameSnapshot(id)`; Dual-Export-Schwanz (`deleteGameSnapshot, exportGameSnapshot, _scanFormatTs, _scanKb, _scanSafeName, _scanExportName`) — noch **nicht** in `index.html` geladen (Verdrahtung folgt in Plan 06-03)
- Neuer statischer Audit (`tests/snapshot-delete.test.js`, describe „audit“): beweist per Enclosing-Function-Slice, dass `objectStore(_IDB_SNAPSHOTS).delete(` genau 1× in persistence.js (nur innerhalb `idbSnapshotDelete`) und `idbSnapshotDelete(` genau 1× in scan-tab.js (nur innerhalb `deleteGameSnapshot`, nach `confirm(`) vorkommt, sowie 0× in allen anderen Root-JS-Dateien (12 geprüfte Dateien) und in `index.html`
- 17 neue Testfälle (10 in `tests/snapshot-delete.test.js`, 7 in `tests/scan-tab-export.test.js`) plus drei nachgezogene Erwartungen in `tests/persistence-module.test.js` (Export-Listen + Lösch-API-Invariante von „0 Lösch-Operationen“ auf „genau 1, in idbSnapshotDelete“ umgestellt)

### Guard-Reihenfolge des Löschpfads (`deleteGameSnapshot`, Kernwert-Absicherung)

1. `idbSnapshotGet(id)` — Existenz-Prüfung. Fehlt → `showStatus('⚠️ Snapshot nicht gefunden', 'info')`, **kein** `confirm()`, Rückgabe `false`.
2. `typeof confirm !== 'function'` → sofort `false` (fail-closed: ohne verfügbaren Dialog wird nie gelöscht).
3. Genau **ein** `confirm(...)` mit Datum (ISO UTC via `_scanFormatTs`), BC-Version und Mod-Anzahl im Text. Abbruch (`false`) → Rückgabe `false`, **nichts** wird angerührt, kein Status.
4. `idbSnapshotDelete(id)`. Fehlschlag → `showStatus('❌ Snapshot konnte nicht gelöscht werden', 'error')`, `false`.
5. Erfolg → `showStatus('✅ Snapshot gelöscht', 'success')`, `typeof renderScanTab === 'function'`-geguardeter Re-Render, Rückgabe `true`.

Keine Schleife und kein `Promise.all` um die Aufrufstelle — statisch bewiesen (0× `for (`/`while (`/`.forEach(`/`.map(`/`Promise.all(` im Funktionskörper).

### Export-Dateiname-Schema

`BC_Snapshot_<YYYY-MM-DD>_<gameVersion|unbekannt>_<id>.json` (`_scanExportName`), z. B. `BC_Snapshot_2026-09-19_R131_sd_1758270000000_1.json`. Sonderzeichen in `gameVersion` (Leerzeichen, `/`) werden über `_scanSafeName` durch `_` ersetzt; fehlende `gameVersion` → `unbekannt`. Payload: `{ _meta: { version: 1, tool, exportedAt, snapshotId, counts: { globals, assets, groups, patching, mods } }, snapshot: <Datensatz unverändert> }`.

### RED-Ausgabe (Task 1, vor der Implementierung)

```
tests/snapshot-delete.test.js  → 11 Fälle, 7 rot (scan-tab.js ENOENT / idbSnapshotDelete fehlt), 4 grün (Roundtrip-Vorbereitung idbSnapshotPut/Get bereits vorhanden)
tests/scan-tab-export.test.js  → 8 Fälle, alle rot (scan-tab.js ENOENT)
tests/persistence-module.test.js → 3 der geänderten Erwartungen rot (idbSnapshotDelete fehlt im Export, Lösch-API-Invariante)

 Test Files  3 failed (3)
      Tests  19 failed | 18 passed (37)
```
RED-CONFIRMED (Marker-Skript grün: Exit ≠ 0, Ausgabe nennt scan-tab.js/idbSnapshotDelete/deleteGameSnapshot/exportGameSnapshot, `scan-tab.js` existiert noch nicht, `persistence.js`/`items.js`/`game-scan.js`/`index.html` unverändert gegen HEAD).

### GREEN-Ausgabe (Task 2, nach der Implementierung)

```
node --check persistence.js scan-tab.js → Exit 0

npx vitest run tests/snapshot-delete.test.js tests/scan-tab-export.test.js tests/persistence-module.test.js \
  tests/game-scan-bridge.test.js tests/screenshot-store.test.js tests/delete-confirmation.test.js tests/baseline-manifest.test.js
 Test Files  7 passed (7)
      Tests  99 passed (99)

npm test
 Test Files  27 passed (27)
      Tests  359 passed | 2 expected fail (361)
```

Statischer Audit-Block (zweiter `<automated>` in Task 2): alle 18 Einzelgates grün (eine Lösch-Operation, eine Aufrufstelle, keine Fremdaufrufer, keine eigene IDB-/Bridge-Logik in scan-tab.js, `items.js`/`game-scan.js`/`index.html`/`loader.js`/`bridge.js` unverändert gegenüber Plan-Start).

## Task Commits

Jeder Task wurde atomar committet:

1. **Task 1: Lösch-/Export-Tests schreiben, persistence-module-Gates nachziehen, RED bestätigen** - `d5d23d3` (test) - `tests/snapshot-delete.test.js`, `tests/scan-tab-export.test.js`, `tests/persistence-module.test.js`
2. **Task 2: `idbSnapshotDelete` (persistence.js) + `scan-tab.js` Teil 1 — GREEN** - `28ea9db` (feat) - `persistence.js`, `scan-tab.js`

**Plan metadata:** folgt im Anschluss (docs-Commit mit diesem SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, 06-VALIDATION.md)

_Note: RED→GREEN wie geplant — Task 1 committet die roten Tests, bevor persistence.js/scan-tab.js angefasst werden._

## Files Created/Modified

- `scan-tab.js` - Neu (Teil 1): Ladereihenfolge-Guard, Helfer, `deleteGameSnapshot(id)`, `exportGameSnapshot(id)`, Dual-Export-Schwanz — noch nicht in index.html geladen
- `persistence.js` - `async function idbSnapshotDelete(id)` (einzige Lösch-Operation auf `snapshots`), Kopfkommentar und Export-Schwanz aktualisiert
- `tests/snapshot-delete.test.js` - Neu: 10 Fälle (Verhalten `deleteGameSnapshot`/`idbSnapshotDelete`) + 4 Audit-Fälle
- `tests/scan-tab-export.test.js` - Neu: 7 Fälle (Payload/Download/Fehlerpfade/Mutationsfreiheit/statisch)
- `tests/persistence-module.test.js` - Export-Listen (2×) um `idbSnapshotDelete` ergänzt; Lösch-API-Test umbenannt und auf die neue Invariante umgestellt
- `.planning/phases/06-scan-tab-analyse/06-VALIDATION.md` - Zeilen 6-02-01/6-02-02 auf ✅ done gesetzt, Ist-Stand-Notiz zur Suite-Größe nach diesem Plan ergänzt

## Decisions Made

Siehe `key-decisions` im Frontmatter — zwei stale Plan-Verify-Literale (49e4365-Diff-Basis, „26 Dateien“) gegen den gemessenen Ist-Stand korrigiert, ohne die Absicht der Gates zu ändern; `idbSnapshotDelete`-id-Validierung 1:1 von `idbSnapshotPut` übernommen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Diff-Gate gegen `49e4365` durch Diff-Gate gegen Plan-Start-HEAD ersetzt**
- **Found during:** Task 2, Verify-Schritt (zweiter `<automated>`-Block)
- **Issue:** `git diff --quiet 49e4365 -- items.js game-scan.js index.html loader.js bridge.js` schlägt fehl, weil `items.js` bereits vor Beginn von Phase 6 durch den Quick-Task `260919-1ez` (LSCG-Merge-Zeitstempel, Commits `8fe4131`/`6056437`/`59316e4`) von `49e4365` abweicht — unabhängig von diesem Plan, dessen Tasks `items.js` gar nicht anfassen.
- **Fix:** Dieselbe Prüfung stattdessen gegen den Plan-Start-HEAD (`8cdfed0b97044e0aed4526457eac2f88f13ad82f`, unmittelbar nach 06-01) ausgeführt — das bildet die eigentliche Absicht des Gates korrekt ab: „dieser Plan rührt die vier Dateien nicht an“.
- **Files modified:** keine (reine Verify-Ausführung, kein Code-Effekt)
- **Verification:** `git diff --quiet 8cdfed0 -- items.js game-scan.js index.html loader.js bridge.js` → leer (Exit 0)
- **Committed in:** n/a (Verify-Schritt, kein eigener Commit)

**2. [Rule 1 - Bug] Erwarteter Dateizähler „26 Dateien“ auf den tatsächlichen Ist-Stand „27 Dateien“ korrigiert**
- **Found during:** Task 2, GREEN-Verify (`npm test`)
- **Issue:** Der Plantext erwartete `Test Files +26 passed` (24 Dateien vor Plan + 2 neue). Die Suite lag vor diesem Plan aber bereits bei 25 Dateien (derselbe in 06-01-SUMMARY.md dokumentierte Ist-Stand-Drift durch `260919-1ez`) — 25 + 2 neue Testdateien = 27, keine Regression.
- **Fix:** Verify-Ausführung gegen den gemessenen Ist-Stand geprüft (`Test Files +27 passed`, keine `failed`-Zeile) statt blind wörtlich am hartcodierten „26“ festzuhalten.
- **Files modified:** `.planning/phases/06-scan-tab-analyse/06-VALIDATION.md` (Ist-Stand-Notiz ergänzt)
- **Verification:** `npm test` → 27 Dateien / 359 passed + 2 expected fail, keine `failed`-Zeile
- **Committed in:** folgt im Plan-Metadaten-Commit

---

**Total deviations:** 2 auto-fixed (beide Rule-1-Korrekturen an stale Plan-Verify-Literalen, keine funktionale Codeänderung).
**Impact on plan:** Kein Einfluss auf Funktionalität, Sicherheit oder Scope — beide Korrekturen betreffen ausschließlich hartcodierte Zahlen/Hashes im Verify-Text, die durch einen bereits vor Phase 6 gelandeten, unabhängigen Quick-Task veraltet waren (identisches Muster wie 06-01-SUMMARY.md). Keine Regression, kein Scope Creep.

## Issues Encountered

- `npm test`-Exitcode gelegentlich `1` trotz „alle passed“ (`EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending` bei wechselnden Testdateien, 3-12 Vorkommen je Lauf) — dieselbe bereits in STATE.md (Phase 4) dokumentierte Vitest-Worker-Teardown-Race, unabhängig von diesem Plan reproduzierbar (mehrfacher Lauf zeigt wechselnde Datei-/Fehlerzahl bei konstant 359 passed + 2 expected fail, 0 failed). Kein Blocker: alle automatisierten Verify-Schritte werten die Testergebniszeilen aus, nicht den Prozess-Exitcode. Außerhalb des Scopes dieses Plans (Scope Boundary — vorbestehendes, nicht von diesem Plan verursachtes Verhalten).

## User Setup Required

None - no external service configuration required.

## Known Stubs

Keine. `scan-tab.js` ist absichtlich noch nicht in `index.html` verdrahtet (Plan 06-03 hängt Rendering/Buttons an) — im Plan-Text so vorgesehen, kein Stub.

## Next Phase Readiness

- `idbSnapshotDelete`/`deleteGameSnapshot`/`exportGameSnapshot` stehen fest und sind durch den neuen statischen Audit gegen eine zweite Lösch-Stelle oder unbestätigtes Löschen geschützt — Plan 06-03 kann `scan-tab.js` um das Rendering (Snapshot-Liste, Badges, Filter) erweitern und die Datei erstmals in `index.html` laden.
- Volle Suite grün: 27 Dateien / 359 passed + 2 expected fail (siehe Issues Encountered zum gelegentlichen Exitcode) — keine Blocker für Plan 06-03.
- Manuelle Browser-Verifikation (🗑/⬇ im echten Scan-Tab) steht noch aus — wird laut Projektkonvention end-of-phase gesammelt (Coverage D6), da scan-tab.js erst in Plan 06-03 sichtbar wird.
- Kein Blocker.

---
*Phase: 06-scan-tab-analyse*
*Completed: 2026-09-19*

## Self-Check: PASSED

- Files exist: `scan-tab.js`, `tests/snapshot-delete.test.js`, `tests/scan-tab-export.test.js` — all FOUND
- Commits exist: `d5d23d3` (test, RED), `28ea9db` (feat, GREEN) — both FOUND in `git log --oneline --all`
- Re-run `npx vitest run tests/snapshot-delete.test.js tests/scan-tab-export.test.js tests/persistence-module.test.js` → 3 files passed
- Re-run `npm test` → 27 Dateien / 359 passed + 2 expected fail (kein `failed`)
- `node --check persistence.js scan-tab.js` → Exit 0
- Static audit block (18 gates) re-verified via grep — all OK
- Commit-Scope beider Task-Commits per `git show --name-only` geprüft: exakt die im Plan genannten Pfade, keine unerwarteten Löschungen
- `commits: 2` gemessen via `git rev-list --count 8cdfed0..HEAD` (vor diesem SUMMARY-Commit)
