---
phase: 05-gamecode-inventar
plan: 01
subsystem: storage
tags: [loader-sandbox, vm, indexeddb, snapshots, object-store, red-green, wave-0]

# Dependency graph
requires:
  - phase: 04-entflechtung
    provides: "persistence.js IDB v2 mit dem Object-Store `screenshots` (Muster für additive Versionierung, `_idbSchreibfehler`, Screenshot-Primitiven)"
  - phase: 05-gamecode-inventar
    provides: "05-RESEARCH.md (Sandbox-Design, Pattern 6 Snapshot-Store), 05-CONSOLE-FINDINGS.md/05-CONSOLE-RESULT.json (reale Fixture-Formen aus einer R131-Session)"
provides:
  - "tests/helpers/loaderSandbox.js: `makeLoaderSandbox()` führt loader.js erstmals in-process aus — Seams `send`/`posts`/`hits`/`timerQueue`/`counts`/`runUntil`/`waitFor`/`opened`/`assets` für Plan 05-02"
  - "persistence.js v3: additiver Object-Store `snapshots` (keyPath `id`), add-only-Primitiven `idbSnapshotPut/GetAll/Get/Keys`, keine Lösch-API"
  - "SCAN-13 als erfüllt dokumentiert (Konsolen-Artefakte aus a42c696, kein Code in diesem Plan)"
affects: [05-02-gamecode-enumerator, 05-03-bridge-und-store]

# Actuals (#2632)
actuals:
  tokens: 9319
  tasks: 3
  commits: 3
plan_head_before: b7e0881796df89fc8b6419864ae0b778ce06aae9

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vm-Sandbox für loader.js (Wave 0): erste In-Process-Ausführung des Spiel-Tab-Injektionsskripts im Testprozess; jeder Stub ist im Kopfkommentar mit dem konkreten Retry-/Crash-Pfad begründet, den er verhindert (bcModSdk, ServerSocket, MutationObserver, document.getElementById, screen/open/alert)"
    - "Add-only Snapshot-Store: `add()` statt `put()`, Fehler laufen sichtbar über `_idbSchreibfehler('Spiel-Snapshot', err)`, keine Lösch-/Leer-Funktion — Kernwert „nie automatisch entfernt“ bleibt strukturell erzwungen (kein API-Pfad existiert dafür)"
    - "Fixture-Selbsttest via `hits`-Zähler: jeder Getter/jede Funktion/Dynamic*-Hook/Patching-Funktion inkrementiert einen Zähler — beweist, dass ein Testfall wirklich zugreift, ohne dass der (künftige) Enumerator selbst je zugreifen darf"

key-files:
  created:
    - tests/helpers/loaderSandbox.js
    - tests/loader-sandbox.test.js
  modified:
    - persistence.js
    - tests/persistence-module.test.js
    - tests/screenshot-migration.test.js

key-decisions:
  - "LOADER_TOOL_ORIGIN wird per Regex aus loader.js' `POPUP_URL` abgeleitet, nie hartcodiert — konsistent mit dem STAB-06-Prinzip 'eine Origin-Quelle', das tests/loader-origin.test.js bereits für die statische Seite erzwingt"
  - "`manualTimers`/`requestIdleCallback` sind Opt-in-Flags: Default sind reale Host-Timer (setTimeout) und ein ABWESENDES `requestIdleCallback` (Safari-Realität) — nur wenn ein Test deterministisch prüfen will (Retry-Timer, Idle-Chunking), schaltet er auf die manuelle Queue um"
  - "Snapshot-Store-`keyPath` ist `'id'` (Plan-Text/must_haves), nicht `'ts'` wie im RESEARCH-Codebeispiel skizziert — der PLAN.md-Text ist die verbindliche Spezifikation für diesen Task, RESEARCH war ein Vorschlag vor der endgültigen Entscheidung"

requirements-completed: [SCAN-13]

coverage:
  - id: D1
    description: "loader.js läuft erstmals in einer Vitest-Sandbox: 0 offene Timer, genau 1 message-Listener, PING→PONG, Source-Pinning, synthetische Getter/Funktionen/Assets/bcModSdk/Mod-Globals-Fixtures nachweislich funktionsfähig"
    requirement: "SCAN-13"
    verification:
      - kind: unit
        ref: "tests/loader-sandbox.test.js (11 Fälle)"
        status: pass
      - kind: unit
        ref: "tests/loader-origin.test.js (4 Fälle, unverändert, weiterhin grün)"
        status: pass
    human_judgment: false
  - id: D2
    description: "persistence.js öffnet IndexedDB v3 mit additivem Object-Store `snapshots` (keyPath 'id'); idbSnapshotPut ist add-only (zweiter Schreibversuch mit gleicher id → false, erster Datensatz unverändert), Quota-/Store-Fehler laufen sichtbar über showStatus/console.warn"
    requirement: "SCAN-08"
    verification:
      - kind: unit
        ref: "tests/persistence-module.test.js#Snapshot-Store (SCAN-08, IDB v3) (7 Fälle: Version/Stores/keyPath, Round-Trip, add-only, Quota, ungültiger Datensatz, Store-Fehlerpfade, statisches Lösch-API-Gate)"
        status: pass
    human_judgment: false
  - id: D3
    description: "v2-Annahmen in tests/screenshot-migration.test.js (Kommentar, _IDB_VERSION-Erwartung, openRaw-Aufrufe, Testname, statisches Gate) auf v3/v4 nachgezogen; bestehende Suite bleibt grün trotz Versionsbump"
    requirement: "SCAN-08"
    verification:
      - kind: unit
        ref: "tests/screenshot-migration.test.js (alle 7 Fälle weiterhin grün nach v3-Nachzug)"
        status: pass
    human_judgment: false
  - id: D4
    description: "SCAN-13 gilt als erfüllt durch die bereits committeten Konsolen-Artefakte (05-CONSOLE-FINDINGS.md/05-CONSOLE-RESULT.json aus Commit a42c696) — dieser Plan verankert das als must_have, ohne eigenen Code dafür zu liefern"
    requirement: "SCAN-13"
    verification: []
    human_judgment: true
    rationale: "Reine Dokumentations-/Orchestrator-Entscheidung (Konsolen-Probe bereits in einem früheren Commit erledigt) — keine automatisierte Prüfung möglich oder nötig, nur die Verankerung im Plan-Text"

# Metrics
duration: 11min
completed: 2026-09-15
status: complete
---

# Phase 5 Plan 1: loader.js-Sandbox & Snapshot-Store (IDB v3) Summary

**Erste in-process-lauffähige loader.js-Sandbox (Wave 0) mit dokumentierten Stubs/Fixtures für Plan 05-02, plus IndexedDB v3 mit einem additiven, add-only `snapshots`-Object-Store in persistence.js (SCAN-08, keine Lösch-API).**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-15T12:49:22+02:00
- **Completed:** 2026-09-15T13:00:30+02:00
- **Tasks:** 3
- **Files modified:** 5 (2 neu, 3 geändert)

## Accomplishments

- `tests/helpers/loaderSandbox.js` (neu): `makeLoaderSandbox()` lädt loader.js zum ersten Mal überhaupt in einer Vitest-vm-Sandbox — mit allen nötigen Stubs (`URL`, `alert`, `open`, `screen`, `MutationObserver`, `ServerSocket.on/off`, `bcModSdk`-Mock, Mod-Globals, `Player`/`ChatRoomCharacter`/`ChatRoomData`/`GameVersion`) und Fixtures (`makeSyntheticAssets` mit `Asset.Group.Asset`-Zirkel, `makeBcModSdkMock` mit `getPatchingInfo()`-Map, `makeModGlobals` mit nicht-enumerierbarer `bcx`-API), abgeleitet aus den realen Zahlen in `05-CONSOLE-RESULT.json`
- `tests/loader-sandbox.test.js` (neu, 11 Fälle): beweist 0 offene Timer, genau 1 `message`-Listener, PING→PONG an die Tool-Origin, Source-Pinning, Getter-Deskriptoren sichtbar aber nie gelesen (Fixture-Selbsttest via `hits`), Inventory-Funktions-Fixture, Asset-Zirkel bricht `JSON.stringify`, bcModSdk-Map mit Funktionswerten, nicht-enumerierbare `bcx`-API, Retry-Timer-Fixture ohne bcModSdk
- `persistence.js`: `_IDB_VERSION` 2 → 3, additiver Object-Store `snapshots` (`keyPath: 'id'`), vier neue Funktionen `idbSnapshotPut/GetAll/Get/Keys` — add-only (`add` statt `put`), Fehler sichtbar über `_idbSchreibfehler('Spiel-Snapshot', err)`, keine Lösch-/Leer-Funktion
- `tests/persistence-module.test.js`: neuer Block „Snapshot-Store (SCAN-08, IDB v3)“ (7 Fälle) inkl. statischem Gate (0× delete/clear/deleteDatabase auf dem Store); beide Export-Listen (CJS-Require + `module.exports`) um die vier neuen Funktionen ergänzt
- `tests/screenshot-migration.test.js`: v2/v3-Annahmen auf v3/v4 nachgezogen (Kommentar, `_IDB_VERSION`-Erwartung, drei `openRaw(2)`→`openRaw(3)`, ein `openRaw(3)`→`openRaw(4)`, Testname, statisches Gate) — bestehende 7 Migrations-Fälle bleiben grün
- SCAN-13 als erfüllt dokumentiert (Konsolen-Artefakte aus Commit `a42c696`, kein Code in diesem Plan) — die Zahlen daraus sind die Grundlage jeder Fixture in diesem Plan

### RED-Ausgabe (Task 2, vor persistence.js-Änderung)

```
npx vitest run tests/persistence-module.test.js tests/screenshot-migration.test.js
 Test Files  2 failed (2)
      Tests  16 failed | 12 passed (28)
```

### GREEN-Ausgabe (Task 3, nach persistence.js)

```
npx vitest run tests/persistence-module.test.js tests/screenshot-migration.test.js tests/screenshot-store.test.js tests/idb-helpers.test.js tests/screenshot-export.test.js
 Test Files  5 passed (5)
      Tests  57 passed (57)

node --check persistence.js  → Exit 0

npx vitest run (volle Suite)
 Test Files  21 passed (21)
      Tests  273 passed | 2 expected fail (275)
```

Dreimal wiederholt (sauberer Lauf jedes Mal) — siehe „Issues Encountered“ zur bekannten, unabhängigen Teardown-Flakiness.

### Plan-Level-Verifikation

```
npx vitest run tests/loader-sandbox.test.js tests/loader-origin.test.js
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

Statische Gates: `persistence.js` 0× `objectStore(_IDB_SNAPSHOTS).delete(`/`.clear(`/`deleteDatabase`, genau 1× `.add(`, 0× `.put(` auf dem Store; `git diff f3973f6 HEAD -- tests/loader-origin.test.js loader.js` leer (byte-identisch).

## Task Commits

Each task was committed atomically:

1. **Task 1: Loader-Sandbox `tests/helpers/loaderSandbox.js` + Smoke-Test** - `df9a50a` (test)
2. **Task 2: Snapshot-Store-Tests (RED) + v3-Nachzug Migrationstest** - `49da565` (test)
3. **Task 3: persistence.js — IDB v3, Store `snapshots`, add-only-Primitiven — GREEN** - `876302c` (feat)

**Plan metadata:** folgt in separatem Commit (docs)

_Note: RED→GREEN wie geplant — Task 2 committet die roten Tests, bevor persistence.js angefasst wird._

## Files Created/Modified

- `tests/helpers/loaderSandbox.js` - Neu: loader.js-Sandbox-Factory, Fixtures (`makeSyntheticAssets`/`makeBcModSdkMock`/`makeModGlobals`)
- `tests/loader-sandbox.test.js` - Neu: 11 Smoke-/Fixture-Fälle für die Sandbox
- `persistence.js` - IDB v3, Object-Store `snapshots`, vier Snapshot-Primitiven, erweiterter Export
- `tests/persistence-module.test.js` - Neuer Snapshot-Store-Testblock (7 Fälle), zwei Export-Listen ergänzt
- `tests/screenshot-migration.test.js` - v2/v3-Annahmen auf v3/v4 nachgezogen (6 Stellen)

## Decisions Made

Siehe `key-decisions` im Frontmatter — Origin-Ableitung per Regex statt Hartcodierung, Timer-Stubs als Opt-in mit realen Defaults, `keyPath: 'id'` statt des RESEARCH-Vorschlags `'ts'`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Export-Liste musste an ZWEI Stellen in `tests/persistence-module.test.js` ergänzt werden, nicht nur einer**
- **Found during:** Task 2, beim Umsetzen der Export-Listen-Anweisung
- **Issue:** Der Plan-Text nennt namentlich nur den Test „mit module-Global füllt der Export-Schwanz module.exports“ für die Export-Listen-Ergänzung. Die Datei enthält aber eine BYTE-IDENTISCHE zweite Kopie derselben sortierten Liste im Test „exportiert idbGet, idbSet, _idbOpen, _debounce als Funktionen“ (CJS-Require-Pfad, `Pattern B` laut Dateikopf — beide Ladewege prüfen dieselbe tatsächliche Export-Menge). Hätte ich nur die genannte Stelle geändert, wäre der CJS-Require-Test nach Task 3s GREEN-Implementierung fehlgeschlagen (echte Export-Liste enthält die vier neuen Funktionen, aber die alte Erwartung im ersten Test nicht) — das hätte Task 3s „npm test grün“-Erfolgskriterium verletzt.
- **Fix:** Beide sortierten Listen um `'idbSnapshotGet', 'idbSnapshotGetAll', 'idbSnapshotKeys', 'idbSnapshotPut'` ergänzt (alphabetisch korrekt einsortiert).
- **Files modified:** `tests/persistence-module.test.js`
- **Verification:** `npx vitest run tests/persistence-module.test.js` grün nach Task 3 (beide Export-Tests bestehen)
- **Committed in:** `49da565` (Task 2, Teil der RED-Testdatei-Änderung — die Erwartung selbst war zu diesem Zeitpunkt noch rot, da persistence.js noch v2 exportierte)

---

**Total deviations:** 1 auto-fixed (Rule 1 — eine im Plan-Text nicht explizit genannte, aber notwendige Konsequenz derselben Änderung an einer bestehenden Duplikat-Assertion in derselben Datei).
**Impact on plan:** Kein Scope-Creep — reine Testauthoring-Korrektur innerhalb der bereits im Plan genannten Datei, notwendig damit Task 3 tatsächlich grün wird.

## Issues Encountered

**Bekannte, unabhängige Vitest-Worker-Teardown-Race (nicht durch diesen Plan verursacht)**

Bei einem von vier `npm test`-Läufen dieser Session trat `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending` auf, diesmal mit `tests/bridge-protocol.test.js` als Ursprungsdatei (in Phase 4/04-04-SUMMARY.md war dieselbe Fehlerklasse bereits für `tests/load-order-guard.test.js` dokumentiert — reine Vitest-Worker-RPC-Race beim Schließen, während ein Hintergrund-`console.*`-Aufruf noch aussteht). In allen vier Läufen meldeten alle Testdateien/Tests „passed“ — der Fehler betrifft ausschließlich den Worker-Exitcode, keine Assertion. Drei direkt aufeinanderfolgende Wiederholungen liefen sauber (21 Dateien, 273 passed + 2 expected fail). Nicht Teil des Datei-Scopes dieses Plans — dokumentiert, nicht behoben.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Known Stubs

Keine.

## Threat Flags

Keine neuen. Alle im Plan-Threat-Register genannten Bedrohungen (T-5-01, T-5-05, T-5-06, T-5-07, T-5-08, T-5-SC) sind durch die 18 neuen Testfälle mitigiert:
- T-5-01 (Fixture-Zähler messen nicht wirklich): `hits`-Zähler nachweislich funktionsfähig (Smoke-Test 6/10)
- T-5-05 (Snapshot-Store verliert/überschreibt): add-only-Test 3, statisches 0×-Delete/Clear/Put-Gate
- T-5-06 (Quota bleibt still): Test 4 mit gepatchtem `add`, sichtbare „Speicher voll“-Meldung
- T-5-07 (Versionsbump bricht Tabs/Tests): additiv, `onblocked`/`onversionchange` unverändert, Migrationstest nachgezogen
- T-5-08 (Sandbox hält Vitest-Worker mit Retry-Timern am Leben): Smoke-Test 5 (0 offene Timer mit allen Default-Stubs)
- T-5-SC (npm/pip/cargo installs): keine Installationen in diesem Plan

## Next Phase Readiness

- Wave 0 abgeschlossen: `tests/helpers/loaderSandbox.js` steht mit allen in 05-RESEARCH.md/05-01-PLAN.md spezifizierten Seams (`send`/`posts`/`hits`/`timerQueue`/`counts`/`runUntil`/`waitFor`/`opened`/`assets`) für Plan 05-02 (Gamecode-Enumerator) bereit.
- SCAN-08 Speicherhälfte fertig: `persistence.js` öffnet IDB v3 mit dem additiven `snapshots`-Store; Plan 05-03 kann `idbSnapshotPut` direkt für die Bridge-Speicherung verwenden.
- `npm test` grün (21 Dateien, 273 passed + 2 expected fail bei sauberem Lauf — siehe Issues Encountered zur bekannten, unabhängigen Teardown-Flakiness).
- `node --check persistence.js` grün.
- Drei Commits in der Reihenfolge test (Sandbox) → test (RED Snapshot-Store) → feat (persistence v3, GREEN).
- `loader.js` und `tests/loader-origin.test.js` byte-identisch zu `f3973f6` — kein Blocker für Plan 05-02, das loader.js tatsächlich erweitern wird.
- Kein Blocker für Plan 05-02/05-03.

---
*Phase: 05-gamecode-inventar*
*Completed: 2026-09-15*

## Self-Check: PASSED

Alle 6 erstellten/geänderten Dateien auf Disk gefunden (`tests/helpers/loaderSandbox.js`, `tests/loader-sandbox.test.js`, `persistence.js`, `tests/persistence-module.test.js`, `tests/screenshot-migration.test.js`, diese SUMMARY). Alle 3 Task-Commits (`df9a50a`, `49da565`, `876302c`) im Log gefunden. Plan-Level-`<verification>` erneut ausgeführt: `npx vitest run tests/loader-sandbox.test.js` → 11 passed; `npx vitest run tests/persistence-module.test.js tests/screenshot-migration.test.js` → 28 passed; volle Suite → 21 Dateien grün, 273 passed + 2 expected fail; `node --check persistence.js` → Exit 0; `git diff f3973f6 HEAD -- tests/loader-origin.test.js loader.js` → leer (byte-identisch).
