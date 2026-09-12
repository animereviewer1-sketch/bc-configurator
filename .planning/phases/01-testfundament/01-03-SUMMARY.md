---
phase: 01-testfundament
plan: 03
subsystem: testing
tags: [bot-engine, escaping, code-generation, security, vitest]

# Dependency graph
requires:
  - phase: 01-testfundament (Plan 01)
    provides: Vitest-5-Testharness mit fake-indexeddb-setupFiles, package.json/vitest.config.js
provides:
  - "TEST-06: `_buildBotCode` erzeugt für alle elf adversarialen Bot-Namen (inkl. `O'Brien`, `Multi\\nLine`, `CR\\rLF\\r\\n`) Code, den `new Function()` ohne SyntaxError parst; der Name überlebt die Generierung verlustfrei"
  - "bot-engine.js Zeile 49 (`safeName`) escaped zusätzlich `'`, `\\r`, `\\n` — einzige Produktionsänderung der Phase"
affects: []

# Actuals (#2632)
actuals:
  tokens: 947
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: ["Eigene schmale vm-Sandbox pro Testdatei statt gemeinsamer Loader, wenn die getestete Datei nur einen Bruchteil der Globals des Haupt-Loaders braucht (hier: nur console/btoa/atob/_money/_rankData/_shop statt der vollen items.js-Kette) — hält parallele Pläne unabhängig", "Cross-Realm-Fehler in vm.createContext-Sandboxes per Regex-Message statt Konstruktor prüfen (`toThrow(/message/)` statt `toThrow(ReferenceError)`), wie bereits in tests/load-script.test.js etabliert"]

key-files:
  created:
    - tests/bot-engine-escaping.test.js
  modified:
    - bot-engine.js

key-decisions:
  - "Nutzerentscheidung 1 (Planer): `'` ist der verifizierte Bug (safeName landet in einfach gequoteten Strings); `\\r`/`\\n` wurden im selben Fix mitgenommen (gleiche Zeile, gleiche Fehlerklasse, Vorbild `escJsAttr` in items.js). Wer nur `'` gefixt haben will, entfernt die letzten beiden `.replace`-Aufrufe in Zeile 49 und die beiden Newline-Fixtures im Test."
  - "Sandbox-Vertrag-Test (Test 4) mit `.toThrow(ReferenceError)` schlug wegen Cross-Realm-Intrinsics fehl (dieselbe Ursache wie in 01-02 dokumentiert: `vm.createContext()` erzeugt eigene Realm mit eigenem `ReferenceError`-Konstruktor). Assertion auf `.toThrow(/_money is not defined/)` umgestellt — Verhalten unverändert, nur die Prüfmethode."

requirements-completed: [TEST-06]

coverage:
  - id: D1
    description: "`_buildBotCode` erzeugt für alle elf adversarialen Bot-Namen (Backtick, `${`, einfaches/doppeltes Anführungszeichen, Backslash, Backslash+Quote, CR/LF, Unicode) Code, den `new Function(code)` ohne SyntaxError akzeptiert"
    requirement: "TEST-06"
    verification:
      - kind: unit
        ref: "tests/bot-engine-escaping.test.js#bot.name=%j erzeugt Code, den new Function() ohne SyntaxError akzeptiert (it.each, 11 Fälle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Der Bot-Name überlebt die Generierung verlustfrei — das `botName:'…'`-Literal evaluiert isoliert exakt zum ursprünglichen `bot.name`, für alle elf Namen"
    requirement: "TEST-06"
    verification:
      - kind: unit
        ref: "tests/bot-engine-escaping.test.js#bot.name überlebt die Generierung verlustfrei (botName-Literal)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Adversariale Nutzerdaten in id, settings, triggers, events und szenen (Base64-Pfad) brechen den generierten Code ebenfalls nicht"
    requirement: "TEST-06"
    verification:
      - kind: unit
        ref: "tests/bot-engine-escaping.test.js#adversariale Nutzerdaten in id, settings, triggers, events und szenen brechen den Code nicht (Base64-Pfad)"
        status: pass
    human_judgment: false
  - id: D4
    description: "RED vor dem Fix nachweislich (O'Brien u.a. schlagen fehl), GREEN nach dem Fix (14/14 passed); einzige Produktionsänderung ist Zeile 49 von bot-engine.js (1/1 Zeilen laut `git show --numstat HEAD`)"
    requirement: "TEST-06"
    verification:
      - kind: unit
        ref: "tests/bot-engine-escaping.test.js (14 passed nach Fix)"
        status: pass
      - kind: other
        ref: "git show --numstat --format= HEAD → bot-engine.js | 2 +- (1 insertion, 1 deletion)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-09-13
status: complete
---

# Phase 1 Plan 3: Escaping-Fix in _buildBotCode Summary

**RED-Test mit elf adversarialen Bot-Namen (u.a. `O'Brien`) lockte den `safeName`-Escaping-Bug in `bot-engine.js:49`; eine chirurgische Ein-Zeilen-Änderung (zusätzlich `'`, `\r`, `\n` escapen) macht alle 14 Tests grün, ohne eine andere Produktionsdatei anzufassen.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-12T22:24:00Z (geschätzt, direkt im Anschluss an das externe "Big Update"-Commit)
- **Completed:** 2026-09-12T22:31:14Z
- **Tasks:** 2
- **Files modified:** 2 (1 neu, 1 geändert)

## Accomplishments
- `tests/bot-engine-escaping.test.js`: eigene Minimal-vm-Sandbox (nur `console`, `btoa`, `atob`, `_money`/`_rankData`/`_shop` als `undefined`), unabhängig vom parallel laufenden Loader aus Plan 01-02
- Elf adversariale Bot-Namen (`NormalName`, `` Back`tick ``, `Dollar${brace}`, `O'Brien`, `Quote"Double`, `` Combo `${x}` and 'quote' ``, `Trail\`, `Back\'slash`, `Multi\nLine`, `CR\rLF\r\n`, `Umlaut Ärger ✓`) per `it.each` gegen `new Function()`-Parsbarkeit geprüft
- Name-Roundtrip-Test: das `botName:'…'`-Literal wird isoliert evaluiert und muss exakt dem ursprünglichen Namen entsprechen — beweist Verlustfreiheit, nicht nur Parsbarkeit
- Voll-Payload-Test: adversariale Strings in `id`, `settings`, `triggers`, `events`, `szenen` (Base64-Pfad) brechen den Code ebenfalls nicht
- Sandbox-Vertrag-Test dokumentiert, dass `_buildBotCode` ohne vordeklarierte `_money`/`_rankData`/`_shop` einen `ReferenceError` wirft (Pitfall 4, bewusst nicht production-seitig gefixt)
- RED bestätigt: `O'Brien`, `` Combo `${x}` and 'quote' ``, `Back\'slash`, `Multi\nLine`, `CR\rLF\r\n` (5 Fälle) sowie der Name-Roundtrip-Test und der Voll-Payload-Test (der `evil` als `bot.name` verwendet, daher ebenfalls vom selben Bug betroffen — eine sinnvolle Erweiterung gegenüber der im Plan vorhergesagten RED-Menge) schlugen fehl; die sechs harmlosen Namen und der Sandbox-Vertrags-Test waren bereits grün (7 failed / 7 passed von 14)
- Fix in `bot-engine.js:49`: `safeName` escaped jetzt zusätzlich `'`, `\r`, `\n` (Backslash-/Backtick-Escaping bleibt an erster Stelle, damit die neuen Escapes nicht doppelt escaped werden)
- GREEN bestätigt: `npx vitest run tests/bot-engine-escaping.test.js` → 14/14 passed; `npm test` → 6 Testdateien, 44 passed + 2 expected fail, Exit 0
- `git show --numstat --format= HEAD` für den Fix-Commit: `1 1 bot-engine.js` — exakt eine geänderte Zeile

## Task Commits

Each task was committed atomically:

1. **Task 1: Escaping-Test schreiben und RED bestätigen** - `647fa33` (test)
2. **Task 2: Minimalen Escaping-Fix anwenden, GREEN bestätigen** - `15f017a` (fix)

**Plan metadata:** wird im Anschluss committet (docs)

## Files Created/Modified
- `tests/bot-engine-escaping.test.js` - TEST-06: elf adversariale Namen, Name-Roundtrip, Voll-Payload-Test, Sandbox-Vertrag
- `bot-engine.js` (Zeile 49) - `safeName` escaped zusätzlich `'`, `\r`, `\n`

## Decisions Made
- Nutzerentscheidung 1 mitgenommen: `\r`/`\n` zusammen mit `'` gefixt (gleiche Zeile, gleiche Fehlerklasse, Vorbild `escJsAttr` in items.js) — wer strikt nur `'` gefixt haben will, entfernt die beiden letzten `.replace`-Aufrufe in Zeile 49 und die beiden Newline-Fixtures (`Multi\nLine`, `CR\rLF\r\n`) im Test.
- Sandbox-Vertrags-Test nutzt `.toThrow(/_money is not defined/)` statt `.toThrow(ReferenceError)`, weil `vm.createContext()` eine eigene Realm mit eigenem `ReferenceError`-Konstruktor erzeugt (Cross-Realm — dieselbe Ursache, die in der 01-02-SUMMARY für `SyntaxError` dokumentiert ist). Das Verhalten der Assertion ist unverändert, nur die Prüfmethode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sandbox-Vertrags-Test (`toThrow(ReferenceError)`) war reproduzierbar rot wegen Cross-Realm-Fehlerobjekt**
- **Found during:** Task 1 (RED-Verifikation)
- **Issue:** `vm.createContext()` erzeugt eine eigene Realm mit eigenen Intrinsics. Der beim Aufruf ohne `_money` geworfene `ReferenceError` ist deshalb nie `instanceof` des Host-`ReferenceError`, den `expect(...).toThrow(ReferenceError)` per `instanceof`-Check verwendet — der Test schlug fehl, obwohl `_buildBotCode` korrekt einen echten `ReferenceError` wirft (identische Ursache wie in 01-02 für `toThrow(SyntaxError)` dokumentiert).
- **Fix:** Assertion auf `.toThrow(/_money is not defined/)` umgestellt (Nachrichtenvergleich statt Konstruktorvergleich) — Muster bereits in `tests/load-script.test.js` etabliert (`toThrow(/idbGet is not defined/)`).
- **Files modified:** tests/bot-engine-escaping.test.js
- **Verification:** Test 4 grün, alle anderen 13 Tests unverändert
- **Committed in:** 647fa33 (Task 1 commit)

**2. [Rule 3 - Blocking] Kopf-Kommentar erwähnte `tests/helpers/loadScript.js` und verletzte damit die Acceptance-Criteria-Grep-Prüfung ("kein Import des Loaders")**
- **Found during:** Task 1 (Acceptance-Criteria-Verifikation)
- **Issue:** `grep -c "helpers/loadScript" tests/bot-engine-escaping.test.js` musste `0` sein; der erste Kommentar-Entwurf erwähnte den Pfad textlich (kein echter Import, aber der Grep unterscheidet nicht).
- **Fix:** Kommentar umformuliert, ohne den Pfad zu nennen — kein funktionaler Import war je vorhanden.
- **Files modified:** tests/bot-engine-escaping.test.js
- **Verification:** `grep -c "helpers/loadScript" tests/bot-engine-escaping.test.js` → 0
- **Committed in:** 647fa33 (Task 1 commit)

**3. [Rule 3 - Blocking] `ADVERSARIAL_NAMES`-Array ohne abschließendes Semikolon ließ die Acceptance-Criteria-Regex (`\];`) ins Leere laufen**
- **Found during:** Task 1 (Acceptance-Criteria-Verifikation)
- **Issue:** Projektkonvention verzichtet stellenweise auf Semikolons; die vorgegebene Prüfregex `ADVERSARIAL_NAMES\s*=\s*\[([\s\S]*?)\];` verlangt aber ein Semikolon nach der schließenden Klammer.
- **Fix:** Semikolon nach `]` ergänzt (rein kosmetisch, keine Verhaltensänderung).
- **Files modified:** tests/bot-engine-escaping.test.js
- **Verification:** Node-Extraktion liefert `11` (Array-Länge)
- **Committed in:** 647fa33 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** Alle drei Fixes betreffen ausschließlich die Testdatei (keine Produktionsänderung, kein Scope-Creep) und waren nötig, damit die vom Plan geforderten Acceptance-Criteria tatsächlich grün werden.

## Issues Encountered

**Externes Commit zwischen Plan-Dispatch und Ausführung ("Big Update", `82a9daa`):** Zwischen dem Abschluss von Plan 01-02 (`0d62ac0`) und dem Start dieses Plans committete der Nutzer selbst (nicht dieser Executor) die zuvor als "~900 unrelated uncommitted changes" bekannten Änderungen in `bc-icons.js`, `bot-data.js`, `bot-ui.js`, `index.html`, `inventar.js`, `items.js`, `money.js`, `rank.js`, `shop.js`, `.planning/state.json` und `.planning/milestone.lock` unter dem Commit `82a9daa "Big Update"` (Autor: `animereviewer1-sketch`, 2026-09-13T00:24:40+02:00). Dieses Commit berührt `bot-engine.js` **nicht**.

Auswirkung auf die Verifikation: Die im Plan vorgegebene automatisierte Prüfung
```
git log --format=%h d9ad6af..HEAD -- index.html items.js bot-data.js bot-ui.js outfit-import.js loader.js
```
ist dadurch **nicht leer** (liefert `82a9daa`) und der zusammengesetzte `SURGICAL-OK`-Verify schlägt als Literalprüfung fehl — nicht weil dieser Plan eine andere Produktionsdatei geändert hätte, sondern weil die Baseline `d9ad6af` durch das externe Commit "kontaminiert" wurde. Die eigentliche Garantie des Plans (nur `bot-engine.js`, nur 1 Zeile, durch DIESEN Plan) wurde stattdessen direkt an den beiden Plan-Commits verifiziert:
- `git show --name-only --format= 647fa33` → `tests/bot-engine-escaping.test.js` (einzige Datei)
- `git show --name-only --format= 15f017a` → `bot-engine.js` (einzige Datei)
- `git show --numstat --format= 15f017a` → `1 1 bot-engine.js`
- `git show --name-only --format= 82a9daa | grep -c "^bot-engine.js$"` → `0` (das externe Commit berührt bot-engine.js nicht)

Kein Datenverlust, keine Vermischung mit diesem Plan — lediglich die exakte Verify-Formulierung aus PLAN.md (die von einer unveränderten Baseline seit `d9ad6af` ausging) ist durch das zeitgleiche externe Commit nicht mehr wörtlich erfüllbar. Empfehlung für künftige Pläne: die Baseline-Prüfung sollte relativ zum Plan-Start-Commit (hier `82a9daa`, nicht `d9ad6af`) laufen, wenn zwischen Planung und Ausführung externe Commits möglich sind.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 (Testfundament) ist damit inhaltlich abgeschlossen: TEST-01 bis TEST-06 sind erfüllt, `npm test` ist grün (6 Testdateien, 44 passed + 2 expected fail).
- `bot-engine.js` bleibt bis auf die eine Zeile 49 unverändert; alle anderen Produktionsdateien der Phase (index.html, items.js, bot-data.js, bot-ui.js, outfit-import.js, loader.js) sind seit `d9ad6af` nur durch das externe, plan-unabhängige `82a9daa`-Commit berührt — nicht durch Phase-1-Pläne.
- Kein Blocker für Phase 2 (Speicher-Sicherheit).

---
*Phase: 01-testfundament*
*Completed: 2026-09-13*

## Self-Check: PASSED
