---
phase: 02-speicher-sicherheit
plan: 01
subsystem: testing
tags: [indexeddb, quota, screenshot-sync, vm-sandbox, red-green]

# Dependency graph
requires:
  - phase: 01-testfundament
    provides: Vitest-5-Testharness, vm-Sandbox-Loader (tests/helpers/loadScript.js), evalIn/settle-Helfer
provides:
  - "TEST-04: idbSet/idbGet Fehlerpfade (Quota, Nicht-Quota, Throttle, Throttle-Reset, idbGet-Fehler, fehlendes showStatus) per Monkeypatch von IDBObjectStore.prototype.put/get getestet"
  - "STAB-02 bestätigt bereits implementiert — kein Produktionsfix nötig, nur Testabdeckung"
  - "STAB-01: _syncLscgScreenshotToProfiles(mk, fp) liest jetzt denselben Schlüssel mk|fp wie die Aufnahme; RED→GREEN dokumentiert"
affects: [02-02-PLAN.md, 02-03-PLAN.md]

# Actuals (#2632)
actuals:
  tokens: 2099
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["Monkeypatch von globalThis.IDBObjectStore.prototype.put/get mit afterEach-Restore zur Quota-Fehler-Simulation gegen echten Produktionscode"]

key-files:
  created:
    - tests/screenshot-sync.test.js
  modified:
    - tests/idb-helpers.test.js
    - items.js

key-decisions:
  - "STAB-02 unverändert gelassen (Orchestrator-Entscheidung 1) — Task 1 war auf Anhieb grün (10 passed), bestätigt den bereits korrekten Quota-Pfad in idbSet"
  - "Throttle-Verhalten in idbSet (_idbFehlerGemeldet, 10s-Unterdrückung) als Ist-Zustand getestet, nicht geändert (Orchestrator-Entscheidung 3)"
  - "Fix an _syncLscgScreenshotToProfiles beschränkt sich auf die Leseseite (Signatur + Schlüsselzeile, 3 Zeilen rein / 2 raus); die Schleife über entry.versions bleibt unverändert, weil sie absichtlich alle Profile mit passendem Fingerprint synchronisiert"

patterns-established:
  - "IDBObjectStore.prototype.put/get Monkeypatch-Pattern für Quota-/Fehlerpfad-Tests: origPut/origGet vor jedem Patch sichern, in afterEach zwingend restaurieren (Leck sonst in andere Testdateien desselben Vitest-Workers)"

requirements-completed: [TEST-04, STAB-02, STAB-01]

coverage:
  - id: D1
    description: "idbSet erkennt QuotaExceededError, liefert false, meldet 'Speicher voll' per showStatus(…, 'error') genau einmal, kein Teilschreibvorgang (idbGet danach null)"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "tests/idb-helpers.test.js#QuotaExceededError: idbSet liefert false, meldet \"Speicher voll\" per showStatus(…, \"error\"), kein Teilschreibvorgang"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nicht-Quota-Fehler (UnknownError) liefert false und meldet 'Speichern fehlgeschlagen' statt 'Speicher voll'"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "tests/idb-helpers.test.js#Nicht-Quota-Fehler (UnknownError): idbSet liefert false und meldet \"Speichern fehlgeschlagen\""
        status: pass
    human_judgment: false
  - id: D3
    description: "10s-Throttle unterdrückt eine zweite showStatus-Meldung binnen 10s (Ist-Zustand); nach Reset von _idbFehlerGemeldet wird wieder gemeldet"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "tests/idb-helpers.test.js#Throttle: zweiter Fehler binnen 10 s liefert false, aber keine zweite Meldung (Ist-Zustand, Entscheidung 3)"
        status: pass
      - kind: unit
        ref: "tests/idb-helpers.test.js#nach Rücksetzen von _idbFehlerGemeldet wird wieder gemeldet"
        status: pass
    human_judgment: false
  - id: D4
    description: "idbGet-Fehlerpfad liefert null, wirft nicht, löst keine UI-Meldung aus (dokumentierter Ist-Zustand); idbSet ohne showStatus-Funktion wirft nicht"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "tests/idb-helpers.test.js#idbGet-Fehlerpfad: liefert null, wirft nicht, keine UI-Meldung (dokumentierter Ist-Zustand)"
        status: pass
      - kind: unit
        ref: "tests/idb-helpers.test.js#idbSet ohne showStatus-Funktion wirft nicht und liefert false"
        status: pass
    human_judgment: false
  - id: D5
    description: "_syncLscgScreenshotToProfiles(mk, fp) liest den Screenshot unter demselben Schlüssel mk|fp, unter dem die Aufnahme ihn gespeichert hat, und kopiert ihn in alle Profil-Slots des Fingerprints; RED vor dem Fix, GREEN danach"
    requirement: "STAB-01"
    verification:
      - kind: unit
        ref: "tests/screenshot-sync.test.js#kopiert das unter mk|fp gespeicherte Bild in alle Profil-Slots des Fingerprints"
        status: pass
      - kind: unit
        ref: "tests/screenshot-sync.test.js#Sync persistiert nach bcSpeichernJetzt() unter BC_PROFILE_SCREENSHOTS_v1"
        status: pass
      - kind: unit
        ref: "tests/screenshot-sync.test.js#Schreibseite und Leseseite bilden den Schlüssel identisch (statischer Quell-Check)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Ein bereits vorhandenes Profil-Bild (manueller Upload) wird vom Sync nie überschrieben; Legacy-Schlüssel ohne Fingerprint funktionieren unverändert; unbekannter Schlüssel wirft nicht"
    requirement: "STAB-01"
    verification:
      - kind: unit
        ref: "tests/screenshot-sync.test.js#überschreibt ein vorhandenes Profil-Bild nie (manuelle Uploads bleiben)"
        status: pass
      - kind: unit
        ref: "tests/screenshot-sync.test.js#Legacy-Schlüssel ohne Fingerprint (storeKey === mk) funktioniert weiterhin"
        status: pass
      - kind: unit
        ref: "tests/screenshot-sync.test.js#unbekannter Schlüssel: keine Änderung, keine Exception"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-09-13
status: complete
---

# Phase 2 Plan 1: Quota-Testabdeckung und Screenshot-Sync-Fix Summary

**TEST-04 sichert den bereits korrekten Quota-Fehlerpfad von `idbSet`/`idbGet` per Monkeypatch-Test ab; STAB-01 behebt den echten Screenshot-Sync-Bug (`_syncLscgScreenshotToProfiles` liest jetzt `mk|fp` statt nur `mk`) nach RED→GREEN mit einer chirurgischen 3/2-Zeilen-Änderung.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-13T09:49:07Z
- **Completed:** 2026-09-13T09:53:13Z
- **Tasks:** 3
- **Files modified:** 3 (1 neu, 2 geändert)

## Accomplishments

- `tests/idb-helpers.test.js` erweitert um `describe('idbSet/idbGet Fehlerpfade (TEST-04, STAB-02)')` mit sechs neuen Testfällen; alle waren **auf Anhieb grün** (10 passed) — bestätigt, dass STAB-02 in `idbSet` bereits vollständig implementiert ist, kein Produktionsfix nötig
- `tests/screenshot-sync.test.js` neu angelegt mit sechs Testfällen für `_syncLscgScreenshotToProfiles`; **RED-CONFIRMED** vor dem Fix (Fälle 1, 2, 5, 6 rot, Fälle 3/4 bereits grün als Regressionsschutz)
- `items.js`: `_syncLscgScreenshotToProfiles(mk, fp)` bildet den Lese-Schlüssel jetzt identisch zur Schreibseite (`fp ? (mk + '|' + fp) : mk`); genau 3 Zeilen rein / 2 raus, Schleife über `entry.versions` unverändert
- `npm test`: 7 Testdateien, 56 passed + 2 expected fail (58 gesamt), Exit 0; `node --check items.js` grün

### Task-1-Ausgabe (Beweis: Quota-Test auf Anhieb grün)

```
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

### RED-Ausgabe Task 2 (vor dem Fix)

```
❯ tests/screenshot-sync.test.js (6 tests | 4 failed)
   × kopiert das unter mk|fp gespeicherte Bild in alle Profil-Slots des Fingerprints
   × überschreibt ein vorhandenes Profil-Bild nie (manuelle Uploads bleiben)
   × Sync persistiert nach bcSpeichernJetzt() unter BC_PROFILE_SCREENSHOTS_v1
   × Schreibseite und Leseseite bilden den Schlüssel identisch (statischer Quell-Check)
 Test Files  1 failed (1)
      Tests  4 failed | 2 passed (6)
```
RED-CONFIRMED (wie im Plan erwartet: Fälle 1, 2, 5, 6 rot; Fälle 3, 4 grün).

### GREEN-Ausgabe Task 3 (nach dem Fix)

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

`git show --numstat --format= HEAD` (GREEN-Commit `a59b4b9`):
```
3	2	items.js
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Quota- und Fehlerpfade von idbSet/idbGet testen (TEST-04, STAB-02)** - `6b68436` (test)
2. **Task 2: Screenshot-Sync-Test schreiben und RED bestätigen (STAB-01)** - `01b823b` (test)
3. **Task 3: Leseseite von `_syncLscgScreenshotToProfiles` auf `mk|fp` umstellen (STAB-01)** - `a59b4b9` (fix)

**Plan metadata:** wird im Anschluss committet (docs)

## Files Created/Modified

- `tests/idb-helpers.test.js` - Erweitert um sechs Fehlerpfad-Tests für `idbSet`/`idbGet` (Quota, Nicht-Quota, Throttle, Throttle-Reset, idbGet-Fehler, fehlendes showStatus)
- `tests/screenshot-sync.test.js` - Neu: sechs Tests für `_syncLscgScreenshotToProfiles(mk, fp)` (Kopie, Überschreib-Schutz, Legacy-Pfad, unbekannter Schlüssel, Persistenz, statischer Quell-Check)
- `items.js` - `_syncLscgScreenshotToProfiles(mk, fp)`: Leseseite liest jetzt `LSCG_SCREENSHOTS[key]` mit `key = fp ? (mk + '|' + fp) : mk` statt nur `LSCG_SCREENSHOTS[mk]`

## Decisions Made

- STAB-02 unverändert gelassen — Task 1 lieferte auf Anhieb 10/10 grüne Tests, bestätigt den bereits korrekten Quota-Pfad; kein Produktionsfix laut Orchestrator-Entscheidung 1
- Throttle-Verhalten (`_idbFehlerGemeldet`, 10s) als Ist-Zustand getestet, nicht geändert (Orchestrator-Entscheidung 3)
- Fix an `_syncLscgScreenshotToProfiles` beschränkt auf die Leseseite (Signatur + Schlüsselzeile); die Schleife über `entry.versions` bleibt unverändert, weil sie absichtlich alle Profile mit passendem Fingerprint synchronisiert, nicht nur das eine `fp`-Argument

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Deferred (Orchestrator-Entscheidung 4, aus RESEARCH übernommen)

**`enrichProfileNamesWithIDs()` (items.js ~6743-6813) migriert `PROFILE_SCREENSHOTS`-Schlüssel bei Profil-Umbenennung nicht mit.** Baut `PROFILES` komplett neu, lässt aber alte `PROFILE_SCREENSHOTS`-Keys unter dem alten Namen liegen. Kein Datenverlust (Bild bleibt gespeichert), aber UX-Lücke: Bild erscheint nach Rename als fehlend. Nicht in REQUIREMENTS.md abgedeckt, bewusst nicht in diesem Plan gefixt (Scope-Disziplin). Kandidat für Backlog/spätere Phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm test` grün: 7 Testdateien, 56 passed + 2 expected fail
- `node --check items.js` grün
- Bereit für 02-02 (STAB-09/STAB-10, Lösch-Bestätigung und -Konsistenz) und 02-03 (STAB-03, Speicherplatz-Anzeige)
- Kein Blocker

---
*Phase: 02-speicher-sicherheit*
*Completed: 2026-09-13*

## Self-Check: PASSED
