---
phase: 01-testfundament
plan: 01
subsystem: testing
tags: [vitest, tooling, fake-indexeddb, canary, devDependencies]

# Dependency graph
requires: []
provides:
  - Vitest-5-Testharness als reine Dev-Toolchain (keine Produktions-/Build-Auswirkung)
  - .gitignore für node_modules/, coverage/, .vitest/
  - fake-indexeddb-Setup über vitest.config.js setupFiles
  - Meta-Config vitest.no-idb.config.js für den TEST-03-Beweis (Canary schlägt ohne Setup fehl)
  - IDB-Canary-Test (tests/idb-canary.test.js), der stillen localStorage-Fallback ausschließt
affects: [01-02-PLAN.md, 01-03-PLAN.md, 01-04-PLAN.md]

# Actuals (#2632)
actuals:
  tokens: 10926
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: [vitest@5.0.0, "@vitest/coverage-v8@5.0.0", fake-indexeddb@6.2.5, lz-string@1.5.0 (lokal, devDependency)]
  patterns: ["setupFiles-Wiring für fake-indexeddb/auto", "Meta-Config per Spread-Override statt mergeConfig, um setupFiles gezielt zu leeren"]

key-files:
  created:
    - package.json
    - package-lock.json
    - .gitignore
    - vitest.config.js
    - vitest.no-idb.config.js
    - tests/setup/fake-indexeddb.js
    - tests/idb-canary.test.js
  modified: []

key-decisions:
  - "package.json `type: commonjs` gesetzt (nicht `module`), damit `node --check *.js` auf den bestehenden Produktionsdateien weiterhin gültig bleibt — Vitest liest vitest.config.js trotzdem als ESM-Datei (Vite bündelt die Config selbst; das erzeugt eine harmlose, erwartete Warnung, siehe Deviations)"
  - "vitest.no-idb.config.js überschreibt setupFiles per Objekt-Spread (`{...base.test, setupFiles: []}`) statt mit `mergeConfig`, da `mergeConfig` Arrays konkateniert und den setupFiles-Eintrag der Basis-Config behalten hätte"
  - "lz-string als lokale devDependency (1.5.0, identisch zur Produktions-CDN-Version) nur für spätere Outfit-Import-Tests (Plan 01-03) — keine Produktionsänderung, kein `dependencies`-Feld"

patterns-established:
  - "IDB-Canary-Pattern: ein Test ohne eigenen fake-indexeddb-Import prüft ausschließlich, was setupFiles bereitstellt, plus eine Meta-Config, die beweist, dass er ohne Setup sichtbar rot wird"

requirements-completed: [TEST-01, TEST-03]

coverage:
  - id: D1
    description: "npm test führt vitest run aus und endet grün (Exit 0, 1 passed) — package.json existierte vorher nicht"
    requirement: "TEST-01"
    verification:
      - kind: integration
        ref: "npm test (Exit 0, Tests 1 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Auslieferung bleibt buildfrei: kein build-Script, kein dependencies-Feld in package.json, index.html unverändert seit Baseline d9ad6af"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "node -e Feldprüfung auf package.json (dependencies===undefined, scripts.build===undefined)"
        status: pass
      - kind: other
        ref: "git log --format=%h d9ad6af..HEAD -- index.html items.js bot-data.js outfit-import.js bot-engine.js bot-ui.js loader.js (leer)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ohne setupFiles schlägt genau der eine Canary-Test mit der Meldung 'fake-indexeddb/auto nicht geladen' fehl; mit setupFiles ist er grün"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js (Exit 1, 1 failed, Meldung enthalten)"
        status: pass
      - kind: integration
        ref: "tests/idb-canary.test.js#fake-indexeddb ist aktiv — kein stiller localStorage-Fallback (mit setupFiles, Exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Canary importiert fake-indexeddb nicht selbst — Bereitstellung läuft ausschließlich über setupFiles"
    requirement: "TEST-03"
    verification:
      - kind: unit
        ref: "grep -Ec '^[[:space:]]*import .*fake-indexeddb' tests/idb-canary.test.js == 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Commit-Hygiene: exakt sieben neue Pfade im Commit, die neun unrelated Produktionsänderungen bleiben unstaged"
    requirement: "TEST-01"
    verification:
      - kind: other
        ref: "git show --name-only --format= HEAD (7 Pfade) + git status --short nach Commit (M-Zeilen unverändert unstaged)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-12
status: complete
---

# Phase 1 Plan 1: Vitest-Toolchain und IDB-Canary Summary

**Vitest-5-Devtoolchain (package.json, .gitignore, vitest.config.js) mit fake-indexeddb-Setup und einem IDB-Canary-Test, der ohne setupFiles nachweisbar rot wird — Produktion bleibt buildfrei und unverändert.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-12T21:57:00Z (geschätzt, erster Tool-Call)
- **Completed:** 2026-09-12T22:09:03Z
- **Tasks:** 2 (Task 1: Checkpoint bereits vor Dispatch vom Nutzer freigegeben; Task 2: ausgeführt)
- **Files modified:** 7 (alle neu)

## Accomplishments
- `package.json` mit ausschließlich `devDependencies` (exakte Pins, kein Caret), `type: commonjs`, Scripts `test`/`test:watch`/`coverage`, kein `dependencies`-Feld, kein `build`-Script
- `npm install` erzeugte `package-lock.json`; installierte Versionen exakt `vitest@5.0.0`, `@vitest/coverage-v8@5.0.0`, `fake-indexeddb@6.2.5`, `lz-string@1.5.0`
- `.gitignore` (neu) schließt `node_modules/`, `coverage/`, `.vitest/` aus
- `vitest.config.js` verdrahtet `tests/setup/fake-indexeddb.js` als `setupFiles`, `environment: 'node'`, `include: ['tests/**/*.test.js']`
- `vitest.no-idb.config.js` (Meta-Config für TEST-03) überschreibt `setupFiles` per Spread auf `[]`, ohne `mergeConfig`
- `tests/idb-canary.test.js`: genau ein Test, importiert fake-indexeddb nicht selbst; `npm test` grün (`1 passed`); Meta-Check ohne setupFiles liefert `1 failed` mit der erwarteten Meldung `fake-indexeddb/auto nicht geladen`
- Commit enthält exakt die sieben Toolchain-/Canary-Pfade; die neun vorbestehenden unrelated Produktionsänderungen (bc-icons.js, bot-data.js, bot-ui.js, index.html, inventar.js, items.js, money.js, rank.js, shop.js) blieben unstaged

## Task Commits

1. **Task 1: Paket-Legitimität bestätigen** — kein Commit (Checkpoint; vom Nutzer vor Dispatch mit "approved" freigegeben, siehe unten)
2. **Task 2: Vitest-Toolchain anlegen und IDB-Canary erstellen** — `125b96e` (test)

**Plan metadata:** wird im Anschluss committet (docs)

## Files Created/Modified
- `.gitignore` — schließt node_modules/, coverage/, .vitest/ aus
- `package.json` — npm-Manifest, nur devDependencies, Scripts test/test:watch/coverage
- `package-lock.json` — reproduzierbare Installation (generiert durch npm install)
- `vitest.config.js` — Vitest-Basiskonfiguration mit fake-indexeddb-setupFiles
- `vitest.no-idb.config.js` — Meta-Config für den TEST-03-Beweis (setupFiles: [])
- `tests/setup/fake-indexeddb.js` — Side-effect-Import von fake-indexeddb/auto
- `tests/idb-canary.test.js` — ein Test, der globalThis.indexedDB.open prüft

## Decisions Made
- `type: commonjs` in package.json statt `module`, um `node --check *.js` auf allen Produktionsdateien lauffähig zu halten; Vitest liest `vitest.config.js` trotzdem als ESM (siehe Deviations zur Warnung)
- Meta-Config per Objekt-Spread statt `mergeConfig`, da `mergeConfig` Arrays konkateniert hätte und den setupFiles-Eintrag der Basis-Config behalten hätte
- lz-string als lokale devDependency (identische Version 1.5.0 zur Produktions-CDN-Version) nur für spätere Tests vorbereitet, keine Produktionsänderung

## Deviations from Plan

None - plan executed exactly as written.

**Beobachtung (kein Deviation-Fix nötig):** `npm test` und der Meta-Check geben eine Vite-Warnung aus (`ESM syntax in a file loaded as CommonJS ... vitest.config.js:1:1`), weil `package.json` `type: commonjs` setzt, während `vitest.config.js`/`vitest.no-idb.config.js` `import`/`export default` verwenden. Das ist im Plan explizit vorgesehen ("Vitest bündelt die Config selbst, `type: commonjs` stört nicht") und beeinträchtigt weder Exit-Code noch Testergebnis (`Tests 1 passed` bzw. `1 failed` wie erwartet) — keine Änderung nötig.

## Issues Encountered
None.

## Checkpoint / Auth Gates (normaler Ablauf, keine Deviation)

**Task 1 — checkpoint:human-verify, gate="blocking-human" (Paket-Legitimität vitest@5.0.0 / @vitest/coverage-v8@5.0.0):** Der Orchestrator hat diesen Checkpoint vor dem Dispatch dieses Executors dem Nutzer präsentiert; der Nutzer antwortete exakt `"approved"`. Damit gilt das Akzeptanzkriterium ("Nutzer hat 'approved' gesendet") als erfüllt; Task 2 (Installation) wurde ohne erneuten Stopp fortgesetzt. Vor der Installation wurde zusätzlich geprüft, dass die installierten Versionen exakt den Pins entsprechen (`vitest@5.0.0`, `@vitest/coverage-v8@5.0.0`, `fake-indexeddb@6.2.5`, `lz-string@1.5.0`) — keine Abweichung, daher kein erneuter Checkpoint nötig.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Vitest-Toolchain steht für Plan 01-02 (Sandbox-Loader, IDB-Helfer-Tests), 01-03 (Bot-Data-/Outfit-Import-Validatoren) und 01-04 (Bot-Engine-Escaping) bereit.
- `npx vitest --version` → `vitest/5.0.0 win32-x64 node-v24.12.0`.
- Meta-Check-Ergebnis (TEST-03, Beweis): `npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js` → Exit 1, `Tests 1 failed`, Meldung `fake-indexeddb/auto nicht geladen` enthalten.
- Kein Blocker für Plan 01-02.

---
*Phase: 01-testfundament*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: package.json
- FOUND: package-lock.json
- FOUND: .gitignore
- FOUND: vitest.config.js
- FOUND: vitest.no-idb.config.js
- FOUND: tests/setup/fake-indexeddb.js
- FOUND: tests/idb-canary.test.js
- FOUND commit: 125b96e (git log --oneline --all)
- Re-ran `npm test` → Exit 0, `Tests 1 passed`
- Re-ran meta-check `npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js` → Exit 1, `Tests 1 failed`, Meldung enthalten
- `git show --name-only --format= HEAD` listet exakt die 7 Toolchain-/Canary-Pfade
- `git log --format=%h d9ad6af..HEAD -- index.html items.js bot-data.js outfit-import.js bot-engine.js bot-ui.js loader.js` — leer (Produktion unverändert)
- `git status --short` zeigt die neun unrelated Dateien weiterhin unstaged (führendes Leerzeichen)
