---
phase: quick-260919-1ez
plan: 01
subsystem: storage
tags: [lscg, merge, import, timestamp, items.js]

# Dependency graph
requires: []
provides:
  - "_lscgMerge füllt fehlende/0-ts mit Date.now() an beiden Übernahme-Stellen (ganzer Entry + Einzel-Push)"
  - "importLscgDB (FileReader-Import) füllt fehlende/0-ts vor dem Push"
  - "Sandbox-Regressionstest tests/lscg-merge-timestamps.test.js für beide Pfade"
affects: [scan-tab-analyse, outfit-import]

# Actuals (#2632)
actuals:
  tokens: 1836
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - tests/lscg-merge-timestamps.test.js
  modified:
    - items.js

key-decisions:
  - "Falsy-Check `!v.ts` bewusst gewählt (deckt undefined/null/0/''/NaN ab) statt striktem `=== undefined` — deckt explizit den Plan-Fall `ts: 0` mit ab"
  - "Zeitfenster-Assertion (before/after um Date.now()) statt Fake-Timer, da die vm-Sandbox ein eigenes Date-Objekt hat, das Vitest-Fake-Timer im Host-Realm nicht patchen"

patterns-established: []

requirements-completed: [QUICK-260919-1ez]

coverage:
  - id: D1
    description: "_lscgMerge setzt fehlende/0-ts auf Date.now() (ganzer-Entry-Pfad und Einzel-Push-Pfad), bestehende ts und Duplikate bleiben unverändert"
    requirement: "QUICK-260919-1ez"
    verification:
      - kind: unit
        ref: "tests/lscg-merge-timestamps.test.js#_lscgMerge setzt fehlende Zeitstempel auf Date.now()"
        status: pass
    human_judgment: false
  - id: D2
    description: "importLscgDB (Datei-Import) setzt fehlende/0-ts vor dem Push, bestehende ts bleiben unverändert"
    requirement: "QUICK-260919-1ez"
    verification:
      - kind: unit
        ref: "tests/lscg-merge-timestamps.test.js#importLscgDB setzt fehlende Zeitstempel auf Date.now()"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-09-19
status: complete
---

# Quick Task 260919-1ez: LSCG-Merge/Import Zeitstempel-Auffüllung Summary

**`_lscgMerge` (Backup-Restore, IDB-Startladung) und `importLscgDB` (Datei-Import) setzen fehlende/0-`ts` auf `Date.now()` beim Übernehmen, damit LSCG-Versionen in der UI nie mehr als 01.01.1970 erscheinen.**

## Performance

- **Duration:** 2 min (Commit-Zeitstempel 01:07:45–01:09:40)
- **Tasks:** 2
- **Files modified:** 2 (`items.js`, `tests/lscg-merge-timestamps.test.js`)

## Accomplishments
- `_lscgMerge` füllt fehlende `ts` an beiden Übernahme-Stellen (ganzer neuer Entry + Einzel-Push in bestehenden Entry) mit `Date.now()`, ohne bestehende `ts`-Werte oder Duplikate zu verändern
- `importLscgDB` (FileReader-Import) füllt fehlende `ts` direkt vor `existing.versions.push(v)` innerhalb des Nicht-Duplikat-Zweigs
- Neuer Sandbox-Test `tests/lscg-merge-timestamps.test.js` (8 Tests, Pattern A/`loadScript(['items.js'])`) deckt beide Pfade inkl. Backup-Restore-End-to-End über `LSCG_DB` und simuliertem Datei-Dialog ab

## Task Commits

Jeder Task wurde als RED/GREEN-Paar committet (TDD):

1. **Task 1: `_lscgMerge` füllt fehlende `ts` auf**
   - `1d7136d` test: add failing tests for _lscgMerge ts backfill (RED)
   - `8fe4131` fix: _lscgMerge setzt fehlende ts auf Date.now() (GREEN)
2. **Task 2: `importLscgDB` füllt fehlende `ts` vor dem Push auf**
   - `b1dcb13` test: add failing tests for importLscgDB ts backfill (RED)
   - `6056437` fix: importLscgDB setzt fehlende ts vor dem Push (GREEN)

_Note: TDD-Tasks haben je zwei Commits (test → fix), wie im Plan vorgesehen._

## Files Created/Modified
- `items.js` - `_lscgMerge` (Zeile ~6946): fehlende/0-`ts` wird an beiden Übernahme-Stellen mit `Date.now()` gefüllt; `importLscgDB` (Zeile ~8545): fehlende/0-`ts` wird vor dem Push in `existing.versions` gefüllt
- `tests/lscg-merge-timestamps.test.js` - Neue Sandbox-Testdatei, 8 Tests: 5 für `_lscgMerge` (neuer Entry, Einzel-Push, ts bleibt erhalten x2, Backup-Restore end-to-end), 3 für `importLscgDB` (neuer Char, Push mit ts:0, ts bleibt erhalten)

## Decisions Made
- Falsy-Check `!v.ts` statt striktem Undefined-Check, um explizit auch `ts: 0` abzudecken (wie im Plan gefordert)
- Zeitfenster-Assertion (`before`/`after` um `Date.now()`) statt `vi.useFakeTimers()`, da die vm-Sandbox ihr eigenes `Date` besitzt und Host-Fake-Timer es nicht erreichen

## Deviations from Plan

None — Plan exakt wie geschrieben ausgeführt. Die Sandbox-Simulation von `importLscgDB()` (Test 6/7) funktionierte ohne zusätzliche Global-Stubs über die im Plan beschriebenen `ctx.document.createElement`/`ctx.FileReader`-Overrides hinaus.

## Issues Encountered

Keine. Die im STATE.md dokumentierte gelegentliche Vitest-Worker-Teardown-Race (EnvironmentTeardownError, vorbestehend, außerhalb des Scopes dieser Aufgabe) trat bei `npm test` in diesem Lauf nicht auf; Exit-Code 0, 331 bestanden + 2 erwartet fehlgeschlagen (24/24 Testdateien grün).

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Fix ist rein additiv und lokal auf `_lscgMerge`/`importLscgDB` begrenzt; `_handleOutfitScanData`, `_mbsMerge` und `_dedupeVersions` unberührt (per Diff-Gate verifiziert)
- Keine offenen Punkte für diese Quick-Task; `npm test` grün, `node --check items.js` sauber

---
*Phase: quick-260919-1ez*
*Completed: 2026-09-19*

## Self-Check: PASSED
