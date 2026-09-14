---
phase: 04-entflechtung
plan: 01
subsystem: infra
tags: [persistence, indexeddb, extraction, dual-export, load-order, vm-sandbox, red-green]

requires:
  - phase: 03-bridge-haertung
    provides: Origin-gepinnte Bridge, EXEC-Log — unberührt in dieser Extraktion
provides:
  - "persistence.js: eigenständiges, klassisches Skript mit den IDB-Helfern (_idbOpen/idbGet/idbSet), der localStorage→IDB-Migrations-IIFE und _debounce, per Dual-Export (createRequire) in Vitest importierbar"
  - "Ladereihenfolge-Guard in items.js: fehlt persistence.js, rendert items.js sofort eine rote #loadOrderFatal-Box, loggt und wirft — statt eines stillen ReferenceError tief in einer Tab-Funktion"
  - "tests/helpers/loadScript.js: CORE_SCRIPTS/expandLoadOrder — loadScript(['items.js']) expandiert automatisch um persistence.js, alle 16 bestehenden Aufrufstellen unverändert"
  - "docs/LOAD-ORDER.md: dokumentierte Ladereihenfolge, Guard-Verhalten, Anleitung für neue Module"
affects: [04-02-bridge-haertung-folge, 04-04-screenshot-store]

actuals:
  tokens: 7423
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Dual-export global script (RESEARCH Pattern 1): klassisches <script> ohne export/import, geguardeter module.exports-Schwanz für CJS-Require in Tests"
    - "Ladereihenfolge-Guard per typeof-window-Check (dieselbe Idiomatik wie idbSet's showStatus-Guard, items.js:57 vor der Extraktion)"

key-files:
  created:
    - persistence.js
    - tests/persistence-module.test.js
    - tests/load-order-guard.test.js
    - docs/LOAD-ORDER.md
  modified:
    - items.js
    - tests/helpers/loadScript.js
    - index.html

key-decisions:
  - "Byte-identische Extraktion (Orchestrator-Entscheidung 1): items.js Zeilen 5-96 (Stand 9b41340) per sed/awk extrahiert, nicht abgetippt — diff-Gate bestätigt leer"
  - "Nur die eine generische Migrations-IIFE zieht um; die 36 Ad-hoc-localStorage-Stellen in items.js bleiben unangetastet (RESEARCH-Scope-Guardrail)"
  - "Guard prüft nur idbGet aus persistence.js (kein direkter Aufruf), damit er auch beim genau fehlenden Modul funktioniert"

patterns-established:
  - "Dual-Export-Schwanz: if (typeof module !== 'undefined' && module.exports) { module.exports = {...}; } — Muster für Plan 04-02 (bridge.js)"
  - "CORE_SCRIPTS/expandLoadOrder in tests/helpers/loadScript.js als zentrale Stelle für neue Kern-Vorläufer-Module"

requirements-completed: [SPLIT-01, SPLIT-04]

coverage:
  - id: D1
    description: "persistence.js enthält die IDB-Helfer, Migrations-IIFE und _debounce byte-identisch aus items.js, läuft als klassisches Skript und ist per createRequire (Dual-Export) importierbar"
    requirement: "SPLIT-01"
    verification:
      - kind: unit
        ref: "tests/persistence-module.test.js"
        status: pass
      - kind: other
        ref: "diff <(git show 9b41340:items.js | sed -n '5,96p') <(persistence.js Block) — leer"
        status: pass
    human_judgment: false
  - id: D2
    description: "items.js enthält keine IDB-Primitiven mehr; Ladereihenfolge-Guard bricht sichtbar ab (#loadOrderFatal + Throw), wenn persistence.js fehlt"
    requirement: "SPLIT-04"
    verification:
      - kind: unit
        ref: "tests/load-order-guard.test.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "index.html lädt persistence.js vor items.js (reine Einfügung, 2 Zeilen, 0 Löschungen); docs/LOAD-ORDER.md dokumentiert die Kette"
    requirement: "SPLIT-04"
    verification:
      - kind: other
        ref: "git diff --numstat 9b41340 HEAD -- index.html → 2 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Live-Smoke-Test im echten Browser (hartes Neuladen, Tool bedienbar; DevTools-Blockade von persistence.js zeigt rotes Banner)"
    human_judgment: true
    rationale: "Erfordert echten Browser/BC-Session, End-of-Phase gesammelt (human-check im Plan, nicht blockierend für diesen Plan)"

duration: 8min
completed: 2026-09-14
status: complete
---

# Phase 4 Plan 1: Persistenz-Extraktion & Ladereihenfolge-Guard Summary

**`persistence.js` als eigenständiges, dual-exportiertes IDB-Modul extrahiert; items.js bricht jetzt sichtbar ab statt still zu scheitern, wenn es fehlt.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-14T16:01:00Z
- **Completed:** 2026-09-14T16:09:22Z
- **Tasks:** 3
- **Files modified:** 7 (4 neu, 3 geändert)

## Accomplishments
- `persistence.js` (neu) enthält `_IDB_NAME`/`_IDB_VERSION`/`_IDB_STORE`/`_IDB_DB`, `_idbOpen`, `idbGet`, `_idbFehlerGemeldet`, `idbSet`, die generische localStorage→IDB-Migrations-IIFE und `_debounce` — byte-identisch aus items.js Zeilen 5-96 (Stand `9b41340`) verschoben, mit geguardetem `module.exports`-Schwanz (Dual-Export)
- items.js beginnt jetzt mit einem Ladereihenfolge-Guard: fehlt `persistence.js`, rendert die erste Anweisung eine rote `#loadOrderFatal`-Box, loggt per `console.error` und wirft — kein stiller `ReferenceError` mehr
- `tests/helpers/loadScript.js` exportiert `CORE_SCRIPTS`/`expandLoadOrder`; `loadScript(['items.js'])` expandiert automatisch um `persistence.js`, alle 16 bestehenden Aufrufstellen in 12 Testdateien blieben unverändert
- `index.html` lädt `persistence.js` vor `items.js` im selben `<script>`-Block (2 Einfügungen, 0 Löschungen) mit einem `LADEREIHENFOLGE`-Kommentar; `docs/LOAD-ORDER.md` (neu) dokumentiert die vollständige Kette, das Guard-Verhalten und die Anleitung für neue Module

## Task Commits

Jeder Task wurde atomar committet (RED→GREEN je Task 1 und 3, Task 2 direkt GREEN nach dem RED aus Task 1):

1. **Task 1: Persistenz-Modul-Test schreiben und RED bestätigen** - `7194a2f` (test)
2. **Task 2: `persistence.js` extrahieren, items.js kürzen, Loader-Expansion** - `396f2d6` (refactor)
3. **Task 3a: Ladereihenfolge-Guard-Test (RED)** - `d923d20` (test)
4. **Task 3b: Guard + index.html + docs/LOAD-ORDER.md (GREEN)** - `29e0fab` (feat)

**Plan metadata:** folgt in separatem Commit (SUMMARY/STATE/ROADMAP/REQUIREMENTS)

## Files Created/Modified
- `persistence.js` - Neues Modul: IDB-Helfer, Migrations-IIFE, `_debounce`, Dual-Export
- `items.js` - Zeilen 1-96 entfernt, ersetzt durch Ladereihenfolge-Guard (IIFE) + Sektionskommentar vor der bisherigen Zeile 97
- `tests/helpers/loadScript.js` - `CORE_SCRIPTS`/`expandLoadOrder` ergänzt, `loadScript` nutzt die Expansion; `loadInto` bleibt roh
- `tests/persistence-module.test.js` - Neu: CJS-Require-Dual-Export, Sandbox-Klassik-Pfad, Loader-Expansion, statisches Extraktions-Gate (13 Tests)
- `tests/load-order-guard.test.js` - Neu: FATAL-Box + Throw ohne persistence.js, kein Throw mit persistence.js, Guard-Position, index.html-Reihenfolge, docs/LOAD-ORDER.md-Inhalt (5 Tests)
- `index.html` - 2 Einfügungen im `_cbv`-Block: `LADEREIHENFOLGE`-Kommentar + `persistence.js`-`document.write`-Zeile vor der `items.js`-Zeile
- `docs/LOAD-ORDER.md` - Neu: Reihenfolge-Tabelle, Begründung, Guard-Verhalten, Anleitung, Test-Hinweise

## Decisions Made
- Byte-identische Extraktion per `sed -n '5,96p' items.js` in eine Zwischendatei, dann Header+Block+Footer zusammengesetzt (keine manuelle Abschrift) — Verbatim-Diff-Gate bestätigt leer
- Nur die eine generische Migrations-IIFE (`items.js:68-87` alt) zieht um; die 36 Ad-hoc-`localStorage.*`-Stellen bleiben in items.js (RESEARCH-Scope-Guardrail eingehalten: `localStorage.` kommt 31× in items.js und 3× in persistence.js vor)
- Guard prüft nur `typeof window['idbGet'] !== 'function'`, ohne `idbGet` selbst aufzurufen — funktioniert damit gerade dann, wenn genau dieses Modul fehlt

## Deviations from Plan

### Auto-fixed Issues

None — keine Code-Abweichungen vom Plan nötig; die Extraktion und der Guard entsprechen exakt der Spezifikation.

### Verifikations-Diskrepanzen (dokumentiert, kein Code-Fix)

**1. Plan-Verify-Gate `grep -c '^function _debounce' items.js` = 0 ist über-breit**
- **Gefunden bei:** Task 2 Verify-Lauf
- **Befund:** Das Muster `^function _debounce` matcht als Substring-Präfix auch die unverwandten, bereits vor der Extraktion existierenden Funktionen `_debouncedRenderGroups` (items.js) und `_debounceCurseComment` (items.js, Zeile ~4925) — beide bleiben laut Plan-Anweisung ("Nichts anderes anfassen") unverändert in items.js. Der Test schlägt daher mit `grep -c` = 2 statt 0 fehl.
- **Verifiziert stattdessen:** Das präzise Marker-Muster `^function _debounce(fn, delay)` (volle Signatur, wie in `tests/persistence-module.test.js` Fall 12 verwendet) liefert `items.js:0`, `persistence.js:1` — exakt die geforderte 0/1-Verteilung. Kein Duplikat, kein Code-Fehler; reines Plan-Skript-Artefakt.
- **Impact:** Keiner — die eigentliche Eigenschaft (keine Doppeldefinition von `_debounce`) ist durch den präziseren Test und die vollständige `npm test`-grüne Suite belegt.

**2. Plan-Acceptance-Criterion `grep -Fc "docs/LOAD-ORDER.md" items.js` = 1 widerspricht dem vom Plan selbst vorgegebenen Wortlaut**
- **Gefunden bei:** Task 3 GREEN-Verify
- **Befund:** Der Plan schreibt sowohl im Guard-Kopfkommentar (`... (docs/LOAD-ORDER.md). ...`) als auch in der `msg`-Konstante (`... siehe docs/LOAD-ORDER.md`) den String `docs/LOAD-ORDER.md` wörtlich vor — das ergibt zwangsläufig `grep -Fc` = 2, nicht 1.
- **Entscheidung:** Beide Vorkommen wie im Plan-Aktionstext spezifiziert beibehalten (Kommentar UND Fehlermeldung sollen auf die Doku verweisen — funktional sinnvoll, von `tests/load-order-guard.test.js` auch so verlangt: die Box muss `docs/LOAD-ORDER.md` enthalten). Das Acceptance-Criterion ist ein Zählfehler im Plan, kein Implementierungsfehler.
- **Impact:** Keiner — alle automatisierten `<verify>`-Blöcke (RED/GREEN-Vitest-Läufe, `node --check`, `npm test`) sind grün; nur dieses eine grep-Acceptance-Criterion (nicht Teil des `<verify>`-Blocks) zählt anders als vom Plan-Text selbst erzeugt.

---

**Total deviations:** 0 Code-Fixes; 2 dokumentierte Plan-Skript-Diskrepanzen (beide harmlos, funktional durch präzisere/vollständigere Tests abgedeckt).
**Impact on plan:** Keiner auf Funktionalität oder Sicherheit — beide Punkte sind Zählungenauigkeiten in den Plan-eigenen grep-Mustern, nicht im produzierten Code.

## Issues Encountered

- `tests/persistence-module.test.js` enthält 13 `it()`-Fälle statt der im Plan-Fließtext genannten "14 Fälle" — die Plan-Nummerierung 1-14 zählt den `beforeAll`-Block (Punkt 1) mit; die tatsächlichen `it()`-Testfälle entsprechen exakt den nummerierten Punkten 2-14 (13 Stück). Alle in der Aktionsbeschreibung geforderten Assertions sind vollständig umgesetzt; dadurch weicht die Gesamtzahl im `<verification>`-Block (erwartet „19 passed" / „168 passed") um genau 1 nach unten ab (tatsächlich 18 passed für die zwei neuen Testdateien, 167 passed in der Gesamtsuite + 2 expected fail).

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- `persistence.js` und der Ladereihenfolge-Guard stehen bereit; Plan 04-02 kann `bridge.js` nach demselben Dual-Export-Muster extrahieren und in dieselbe Guard-Tabelle (`required`-Array in items.js) sowie `CORE_SCRIPTS` eintragen
- Plan 04-04 erweitert `_idbOpen` in persistence.js um den `screenshots`-Store (additive Migration, `_IDB_VERSION` 1→2)
- End-of-Phase-Human-Check aus Task 3 (hartes Neuladen im echten Browser, DevTools-Blockade von persistence.js → rotes Banner) steht noch aus — wird in Plan 04-04 gesammelt (per Plan-Text, nicht blockierend)
- Keine Blocker für 04-02

---
*Phase: 04-entflechtung*
*Completed: 2026-09-14*

## Self-Check: PASSED

Alle 8 erstellten/geänderten Dateien auf Disk gefunden (`persistence.js`, `tests/persistence-module.test.js`, `tests/load-order-guard.test.js`, `docs/LOAD-ORDER.md`, `items.js`, `tests/helpers/loadScript.js`, `index.html`, diese SUMMARY). Alle 4 Task-Commits (`7194a2f`, `396f2d6`, `d923d20`, `29e0fab`) im Log gefunden. Alle `<verify>`-Blöcke und `<acceptance_criteria>` erneut ausgeführt (bis auf die zwei in "Deviations" dokumentierten Plan-Skript-Diskrepanzen, die keine Code-Fehler sind). `npm test` → 16 Testdateien grün, 167 passed + 2 expected fail.
