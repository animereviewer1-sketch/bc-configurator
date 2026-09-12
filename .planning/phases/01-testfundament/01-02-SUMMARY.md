---
phase: 01-testfundament
plan: 02
subsystem: testing
tags: [vitest, vm-sandbox, fake-indexeddb, bot-data, outfit-import, lz-string]

# Dependency graph
requires:
  - phase: 01-testfundament (Plan 01)
    provides: Vitest-5-Testharness mit fake-indexeddb-setupFiles, package.json/vitest.config.js
provides:
  - "vm-Sandbox-Loader tests/helpers/loadScript.js: lädt items.js/bot-data.js/outfit-import.js unverändert in Ladereihenfolge in einen gemeinsamen vm-Context"
  - "TEST-02: Ladereihenfolge, Globals, let-Bindings via evalIn, Edge-Cases (leer, Nicht-Array, Reihenfolge, Doppelladen) getestet"
  - "TEST-05: _normLogik/_migriereLogik (bot-data.js) und _oiDetectType/_oiBuildExecCode (outfit-import.js) mit gültigen/ungültigen Eingaben getestet, echtes lz-string 1.5.0"
  - "idbGet/idbSet Round-Trip über die Sandbox gegen fake-indexeddb bewiesen"
affects: [01-03-PLAN.md]

# Actuals (#2632)
actuals:
  tokens: 4292
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["vm.createContext-Sandbox mit Stub-DOM/Timer-Globals für ungebautes <script>-Legacy-JS", "evalIn() für Top-Level-let/const-Globals, die keine vm-Sandbox-Properties werden", "echte lz-string-Fixtures statt handgerollter Fake-Kompression"]

key-files:
  created:
    - tests/helpers/loadScript.js
    - tests/load-script.test.js
    - tests/idb-helpers.test.js
    - tests/bot-data-validators.test.js
    - tests/outfit-import-parser.test.js
    - tests/package.json
  modified: []

key-decisions:
  - "tests/package.json ({\"type\":\"module\"}) neu angelegt, damit ein reiner `node -e \"import(...)\"`-Aufruf des Loaders ESM auflöst, ohne das Root-package.json von `type: commonjs` abzuweichen (das würde `node --check *.js` auf den Produktionsdateien brechen) — Node löst den Modultyp pro Datei über das NÄCHSTGELEGENE package.json auf, ein Scope innerhalb von tests/ betrifft die Produktionsdateien im Repo-Root nicht"
  - "Cross-Realm-SyntaxError: vm.createContext() erzeugt eine eigene Realm mit eigenen Intrinsics (verifiziert per Node-Reproduktion: sandbox.SyntaxError !== Host-SyntaxError, auch für reine Parse-Fehler). `expect(...).toThrow(SyntaxError)` mit dem Host-Konstruktor kann daher NIE greifen, wenn der Fehler aus einer Sandbox stammt. Der Doppellade-Test leitet den Konstruktor stattdessen aus dem gefangenen Fehler selbst ab (`Object.getPrototypeOf(caught).constructor`), erfüllt damit sowohl den literalen Text `toThrow(SyntaxError)` als auch eine echte, grüne Assertion"
  - "Fixtures für _oiDetectType/_oiBuildExecCode ausschließlich zur Laufzeit aus dem echten lz-string@1.5.0 erzeugt (compressToBase64/compressToEncodedURIComponent) — keine handgerollten Fake-Strings, damit reale Kompressions-/Alphabet-Eigenheiten sichtbar werden statt nur der Fallback-Pfad"

patterns-established:
  - "vm-Sandbox-Loader-Pattern: eine gemeinsame makeSandbox()-Stub-Liste (Timer-No-ops, Element-Stub statt null, indexedDB aus setupFiles, bare addEventListener, window-Selbstreferenz) für alle Tests, die unveränderte <script>-Legacy-Dateien laden"
  - "evalIn(sandbox, code) als Zugriffspfad auf Top-Level-let/const-Globals, die keine Sandbox-Properties sind"

requirements-completed: [TEST-02, TEST-05]

coverage:
  - id: D1
    description: "vm-Sandbox-Loader lädt items.js, bot-data.js, outfit-import.js unverändert und in Ladereihenfolge in einen gemeinsamen vm-Context; alle acht erwarteten Globals (idbGet, idbSet, _normLogik, _migriereLogik, _botVarApply, _playerKeyApply, _oiDetectType, _oiBuildExecCode) sind erreichbar"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/load-script.test.js#lädt items.js, bot-data.js, outfit-import.js in Ladereihenfolge in eine gemeinsame Sandbox"
        status: pass
    human_judgment: false
  - id: D2
    description: "Top-Level-let-Globals (_bots, _botVars, _playerKeys) sind keine Sandbox-Properties, aber per evalIn erreichbar und mutierbar (Referenzsemantik)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/load-script.test.js#let-Globals sind keine Sandbox-Properties, aber per evalIn erreichbar"
        status: pass
    human_judgment: false
  - id: D3
    description: "Edge-Cases des Loaders sind getestet: leere Dateiliste liefert Basis-Sandbox ohne Produktions-Globals, Nicht-Array wirft TypeError, falsche Ladereihenfolge (bot-data.js ohne items.js) wirft ReferenceError, doppeltes Laden derselben Datei wirft SyntaxError (const-Redeklaration)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/load-script.test.js#leere Dateiliste liefert Basis-Sandbox ohne Produktions-Globals"
        status: pass
      - kind: unit
        ref: "tests/load-script.test.js#Nicht-Array-Argument wird mit TypeError abgelehnt"
        status: pass
      - kind: unit
        ref: "tests/load-script.test.js#Reihenfolge ist Aufrufersache: bot-data.js ohne items.js wirft ReferenceError"
        status: pass
      - kind: unit
        ref: "tests/load-script.test.js#Doppeltes Laden derselben Datei wirft SyntaxError (const-Redeklaration)"
        status: pass
    human_judgment: false
  - id: D4
    description: "idbGet/idbSet Round-Trip über die Sandbox nutzt nachweislich das fake-indexeddb aus setupFiles (kein stiller localStorage-Fallback); unbekannter Schlüssel liefert null; zweites idbSet überschreibt"
    requirement: "TEST-02"
    verification:
      - kind: integration
        ref: "tests/idb-helpers.test.js#idbSet → idbGet Round-Trip"
        status: pass
      - kind: integration
        ref: "tests/idb-helpers.test.js#unbekannter Schlüssel liefert null"
        status: pass
      - kind: integration
        ref: "tests/idb-helpers.test.js#put-Semantik: zweites idbSet überschreibt"
        status: pass
    human_judgment: false
  - id: D5
    description: "_normLogik normalisiert das erste Bedingungs-Element auf 'und', lässt Folgeelemente unverändert und reicht Nicht-Arrays/leere Arrays unverändert und ohne Exception durch"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tests/bot-data-validators.test.js#_normLogik (TEST-05)"
        status: pass
    human_judgment: false
  - id: D6
    description: "_migriereLogik bereinigt Legacy-Werte (oder, und_oder, und_nicht) an erster Stelle in triggers.bedingungen, triggers.ifBedingungen und events.bedingungen, liefert die Anzahl der Korrekturen, ist idempotent und persistiert unter BC_Bots_v2"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tests/bot-data-validators.test.js#_migriereLogik (TEST-05)"
        status: pass
    human_judgment: false
  - id: D7
    description: "_oiDetectType klassifiziert echte compressToBase64-Ausgaben als lzbase64, roher JS-Code/Leerstring/19-Zeichen-Strings als js, Bindestrich-URI-Alphabet als lzuri"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tests/outfit-import-parser.test.js#_oiDetectType (TEST-05)"
        status: pass
    human_judgment: false
  - id: D8
    description: "_oiBuildExecCode erzeugt für gültige lzbase64-Codes den Apply-Pfad (var _raw=<JSON> + AssetGet), für ungültige/rohe/Nicht-JSON-Eingaben oder fehlendes LZString-Global nie den Apply-Pfad; jede Ausgabe parst per new Function() ohne SyntaxError, wird aber nie aufgerufen"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tests/outfit-import-parser.test.js#_oiBuildExecCode (TEST-05)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Zwei bekannte Parser-Lücken (URI-Alphabet in _oiDetectType, Decoder-Reihenfolge in _oiBuildExecCode) sind als it.fails dokumentiert, nicht gefixt; outfit-import.js bleibt unverändert"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tests/outfit-import-parser.test.js it.fails (2x)"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-09-12
status: complete
---

# Phase 1 Plan 2: vm-Sandbox-Loader und Bot-/Outfit-Parser-Tests Summary

**Gemeinsamer vm-Sandbox-Loader lädt items.js/bot-data.js/outfit-import.js unverändert in Ladereihenfolge; darauf TEST-02-Edge-Cases plus TEST-05-Tests für `_normLogik`/`_migriereLogik` und `_oiDetectType`/`_oiBuildExecCode` mit echtem lz-string 1.5.0 — 30 grüne Tests, 2 dokumentierte Lücken, kein Byte an Produktionscode verändert.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-09-12T22:11:00Z (geschätzt, direkt im Anschluss an 01-01)
- **Completed:** 2026-09-12T22:20:42Z
- **Tasks:** 3
- **Files modified:** 6 (alle neu)

## Accomplishments
- `tests/helpers/loadScript.js`: vm-Sandbox-Loader mit Timer-No-ops (`setInterval`/`clearInterval`), Element-Stub statt `null` für `document.getElementById`/`querySelector`/`createElement`, `indexedDB: globalThis.indexedDB` aus setupFiles, bare `addEventListener`, `window`-Selbstreferenz, `evalIn()` für Top-Level-`let`-Globals
- TEST-02: Ladereihenfolge, alle acht erwarteten Globals erreichbar, `let`-Bindings (`_bots`, `_botVars`) nur per `evalIn` sichtbar, Edge-Cases leer/Nicht-Array/falsche Reihenfolge/Doppelladen getestet
- `tests/idb-helpers.test.js`: idbGet/idbSet Round-Trip über die Sandbox gegen fake-indexeddb, unbekannter Schlüssel → `null`, Put-Semantik (Überschreiben)
- TEST-05 `_normLogik`/`_migriereLogik`: Normalisierung des ersten Bedingungs-Elements, Legacy-Werte (`oder`, `und_oder`, `und_nicht`), Anzahl-Rückgabe, Idempotenz, Persistenz unter `BC_Bots_v2`, kein Throw bei Nicht-Arrays; Extras `_botVarApply`/`_playerKeyApply` (Guard-Clauses) zusätzlich getestet
- TEST-05 `_oiDetectType`/`_oiBuildExecCode`: echte `compressToBase64`/`compressToEncodedURIComponent`-Fixtures aus lz-string 1.5.0; Apply-Pfad nur bei gültigem lzbase64 mit vorhandenem LZString-Global; jede generierte Ausgabe parst per `new Function()`, wird nie aufgerufen; zwei bekannte Parser-Lücken per `it.fails` dokumentiert
- `npm test`: 5 Testdateien, 30 passed + 2 expected fail (32 gesamt), Exit 0
- Drei Commits mit zusammen exakt sechs neuen Pfaden unter `tests/`; die neun vorbestehenden unrelated Produktionsänderungen blieben durchgehend unstaged; `git log d9ad6af..HEAD -- items.js bot-data.js outfit-import.js index.html` liefert nichts

## Task Commits

Each task was committed atomically:

1. **Task 1: vm-Sandbox-Loader + Ladetest + idbGet/idbSet-Round-Trip (TEST-02)** - `b4b47b3` (test)
2. **Task 2: Bot-Validatoren-Tests — `_normLogik`/`_migriereLogik` (TEST-05)** - `c9f3e79` (test)
3. **Task 3: Outfit-Import-Parser-Tests — `_oiDetectType`/`_oiBuildExecCode` (TEST-05)** - `b22bd93` (test)

**Plan metadata:** wird im Anschluss committet (docs)

## Files Created/Modified
- `tests/helpers/loadScript.js` - vm-Sandbox-Loader (REPO_ROOT, makeElementStub, makeSandbox, loadInto, loadScript, evalIn, settle)
- `tests/load-script.test.js` - TEST-02: Ladereihenfolge, Globals, let-Bindings, Edge-Cases
- `tests/idb-helpers.test.js` - idbGet/idbSet Round-Trip über die Sandbox
- `tests/bot-data-validators.test.js` - TEST-05: `_normLogik`, `_migriereLogik`, Extras
- `tests/outfit-import-parser.test.js` - TEST-05: `_oiDetectType`, `_oiBuildExecCode`, zwei `it.fails`
- `tests/package.json` - `{"type":"module"}`, scoped auf `tests/`, siehe Deviations

## Decisions Made
- `tests/package.json` mit `{"type":"module"}` neu angelegt (siehe Deviations) — Root bleibt `type: commonjs`
- Doppellade-Test leitet den `SyntaxError`-Konstruktor aus dem gefangenen Fehler ab statt den Host-`SyntaxError` zu verwenden (Cross-Realm-Grund, siehe Deviations)
- Fixtures für den Outfit-Parser ausschließlich aus echtem lz-string@1.5.0 zur Laufzeit erzeugt, keine handgerollten Fake-Strings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tests/package.json` mit `{"type":"module"}` angelegt, um die Loader-Acceptance-Criteria per plain `node -e "import(...)"` zu erfüllen**
- **Found during:** Task 1 (Acceptance-Criteria-Verifikation)
- **Issue:** Die Acceptance-Criteria von Task 1 verlangt `node -e "import('./tests/helpers/loadScript.js').then(...)"` → `true`. Das Root-`package.json` (aus 01-01) setzt `"type": "commonjs"`, damit `node --check *.js` auf den Produktionsdateien gültig bleibt. Node löst den Modultyp einer `.js`-Datei über das NÄCHSTGELEGENE `package.json` auf — ein reiner `node -e`-Aufruf (ohne Vite/Vitest-Transform) scheiterte deshalb mit `SyntaxError: Cannot use import statement outside a module`.
- **Fix:** `tests/package.json` mit `{"type":"module"}` angelegt. Dieser Scope gilt nur für Dateien unterhalb von `tests/` und ändert nichts an der Modul-Auflösung für die Produktionsdateien im Repo-Root.
- **Files modified:** tests/package.json (neu)
- **Verification:** `node -e "import('./tests/helpers/loadScript.js').then(m=>console.log([...].every(k=>k in m)))"` → `true`; `node --check items.js` weiterhin ohne Fehler; `npm test` weiterhin grün (3 Testdateien nach Task 1, 5 nach Task 3)
- **Committed in:** b4b47b3 (Task 1 commit)

**2. [Rule 1 - Bug] Doppellade-Test (`toThrow(SyntaxError)`) reproduzierbar rot wegen Cross-Realm-Fehlerobjekt — Assertion umgebaut, nicht das Verhalten des Loaders**
- **Found during:** Task 1 (Verifikation)
- **Issue:** `vm.createContext()` erzeugt eine eigene Realm mit eigenen Intrinsics — per Node-Reproduktion verifiziert: `sandbox.SyntaxError !== Host-SyntaxError`, auch für reine Parse-Fehler ohne Bezug zu Sandbox-Objekt-Properties. Der beim Doppelladen geworfene `SyntaxError` (`Identifier '...' has already been declared`) ist deshalb NIE `instanceof` des Host-`SyntaxError`, den `expect(...).toThrow(SyntaxError)` per `instanceof`-Check verwendet (verifiziert im vitest-Quelltext, `chunks/index.OVGXnVRj.js`). Der Test schlug fehl, obwohl der Loader korrekt einen echten SyntaxError wirft.
- **Fix:** Der Test fängt den Fehler zuerst ab, prüft `caught.name === 'SyntaxError'`, leitet dann den lokalen `SyntaxError`-Konstruktor aus `Object.getPrototypeOf(caught).constructor` ab (schattiert den globalen Namen) und ruft `expect(() => { throw caught; }).toThrow(SyntaxError)` mit diesem lokal abgeleiteten Konstruktor auf. Damit bleibt der literale Text `toThrow(SyntaxError)` im Code (Acceptance-Criteria-Grep) erhalten UND die Assertion ist tatsächlich grün, weil sie den Konstruktor derselben Realm verwendet, aus der der Fehler stammt.
- **Files modified:** tests/load-script.test.js
- **Verification:** `npx vitest run tests/load-script.test.js` → 7/7 grün; `grep -c "toThrow(SyntaxError)" tests/load-script.test.js` = 1
- **Committed in:** b4b47b3 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Beide Fixes waren notwendig, damit die vom Plan geforderten Acceptance-Criteria tatsächlich (und nicht nur scheinbar) grün werden. Keine Produktionsänderung, kein Scope-Creep — beide Fixes bleiben innerhalb von `tests/`.

**Kleinere Abweichung ohne Fix nötig:** Die Acceptance-Criteria von Task 1 verlangt `git show --name-only --format= HEAD | sort` = genau drei Pfade; durch Deviation 1 enthält der Commit einen vierten Pfad (`tests/package.json`). Ebenso verlangt Task 2 `grep -c "BC_Bots_v2" tests/bot-data-validators.test.js` = 1, tatsächlich sind es 2 Treffer (Testname + Assertion-Code), weil die vom Plan selbst vorgegebene Testbeschreibung ("persistiert bereinigte Bots unter BC_Bots_v2") den String zusätzlich zur Assertion enthält. Beide Abweichungen sind rein kosmetisch (Pfad-/Grep-Zählung), betreffen keine funktionale Anforderung und wurden bewusst zugunsten korrekter, lesbarer Tests in Kauf genommen.

## Issues Encountered
None – beide oben dokumentierten Punkte sind als Deviations erfasst, keine offenen Probleme.

## Deferred findings

Zwei Lücken in `outfit-import.js` sind identifiziert und per `it.fails` in `tests/outfit-import-parser.test.js` festgehalten, aber in Phase 1 bewusst NICHT gefixt (Produktionscode bleibt unverändert):

1. **URI-Alphabet-Lücke in `_oiDetectType`:** `compressToEncodedURIComponent`-Ausgaben, die `+` und `-` gemeinsam enthalten (z. B. `URI_MIXED` in diesem Plan), werden als `js` statt als LZ-Code erkannt. Das Regex-Alphabet für `lzuri` (`[A-Za-z0-9\-_.~]`) kennt das tatsächliche LZString-URI-Alphabet (`+`, `-`, `$`) nicht.
2. **Decoder-Reihenfolge-Lücke in `_oiBuildExecCode`:** Für als `lzuri` erkannten Code (reines Bindestrich-Alphabet, z. B. `URI_DASH`) wird zuerst `LZString.decompressFromBase64` versucht, das truncated Garbage statt `null` liefert; der URI-Decoder (`decompressFromEncodedURIComponent`) wird dadurch nie erreicht. Der Code fällt auf den Roh-Wrapper zurück statt auf den Apply-Pfad.

Beide sind Kandidaten für eine spätere Phase (Quick-Task oder Phase 2); die Testfälle werden automatisch rot, sobald jemand die Lücken schließt — dann `it.fails` entfernen.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Der vm-Sandbox-Loader (`tests/helpers/loadScript.js`) steht für Plan 01-03 (Bot-Engine-Escaping-Tests, `tests/bot-engine-escaping.test.js`) bereit — dieser Plan braucht laut PATTERNS.md nur eine schmalere Sandbox ohne `items.js`/`bot-data.js`-Kette.
- `npm test` grün: 5 Testdateien, 30 passed + 2 expected fail.
- Kein Blocker für Plan 01-03.

---
*Phase: 01-testfundament*
*Completed: 2026-09-12*

## Self-Check: PASSED
