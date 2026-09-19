---
phase: 06-scan-tab-analyse
plan: 01
subsystem: dev-tooling
tags: [baseline, manifest, static-extraction, red-green, vitest, dev-only]

# Dependency graph
requires:
  - phase: 05-gamecode-inventar
    provides: "Snapshot-Schema (schema:1, inventory.globals/assets/probes) — Voraussetzung für den späteren Badge-Abgleich in Plan 06-03, nicht für diesen Plan selbst"
provides:
  - "tools/build-baseline.js — dev-only Node-CJS-Generator (npm run baseline), extrahiert BC-Bezeichner aus bot-engine.js/items.js/bot-ui.js/bot-data.js/loader.js und klassifiziert function/assetGroup/unknown"
  - "baseline-manifest.json (Tooling) + baseline-manifest.js (const BASELINE_MANIFEST, Zero-Fetch-Konsumform) — committet, deterministisch, 83 Bezeichner (19 function, 33 assetGroup, 31 unknown)"
  - "tests/baseline-manifest.test.js — Frische-Diff-Gate: ein veraltetes Manifest macht npm test rot (T-6-01)"
  - "package.json Script `baseline`"
affects: [06-03-scan-tab-rendering, 06-04-analyse-dokument]

# Actuals (#2632)
actuals:
  tokens: 9694
  tasks: 2
  commits: 2
plan_head_before: de0c519eaff66648454c2e0a8a0778ef5eb7c591

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dev-only Node-CJS-Skript ohne Dependency-Zuwachs (fs/path), analog zum bestehenden Regex-Audit-Stil in tests/ (kein AST-Parser)"
    - "Zwillingsdatei-Muster: JSON (Tooling/Test) + klassisches .js (`const NAME = {...};`, Zero-Fetch, file://-tauglich) aus derselben Manifest-Struktur gerendert"
    - "Frische-Diff-Test regeneriert den Generator in-memory und vergleicht mit den committeten Dateien statt Zeitstempel zu vergleichen"

key-files:
  created:
    - tools/build-baseline.js
    - baseline-manifest.json
    - baseline-manifest.js
    - tests/baseline-manifest.test.js
  modified:
    - package.json
    - .planning/phases/06-scan-tab-analyse/06-VALIDATION.md

key-decisions:
  - "package.json: neues Script `baseline` zwischen `test:watch` und `coverage` eingefügt statt wörtlich 'nach coverage' (Planvorgabe) — vermeidet eine Komma-Änderung an der bisherigen letzten scripts-Zeile, damit der Diff gegenüber dem Phasen-Basis-Commit 49e4365 exakt eine hinzugefügte und keine gelöschte Zeile zeigt (vom Plan selbst als Acceptance Criterion gefordert; die beiden Vorgaben widersprachen sich wörtlich)"
  - "Ist-Stand der Suite vor diesem Plan war 24 Dateien / 331 passed + 2 expected fail, nicht die im Plan/RESEARCH notierten 23/323 — Differenz durch den Quick-Task 260919-1ez (LSCG-Merge-Zeitstempel), der zwischen RESEARCH-Erstellung und Phasen-Ausführung gelandet ist; alle hartcodierten Datei-/Test-Zahlen in den automatisierten Verify-Skripten wurden gegen den tatsächlichen Ist-Stand geprüft (Intention: volle Suite grün, keine Regression), nicht blind wörtlich ausgeführt"
  - "renderManifestJs/renderManifestJson exakt nach Plan-Vertrag benannt, obwohl das Akzeptanzkriterium `grep -c 'function renderManifestJs'` wegen Substring-Überlappung mit `renderManifestJson` 2 statt 1 zählt — beide Funktionen sind laut Plan-Vertrag zwingend erforderlich; Zeilenprüfung bestätigt genau eine Deklaration von `function renderManifestJs(`"

patterns-established:
  - "Baseline-Manifest-Kontrakt: `{schema:1, sourceFiles, identifierPattern, counts, identifiers:[{name,kind,files}], chatHooks, modProbes}` — Vertrag für scan-tab.js, tools/analyze-snapshot.js und GAME-INVENTORY.md (Pläne 06-03/06-04)"

requirements-completed: [SCAN-09]

coverage:
  - id: D1
    description: "Baseline-Manifest-Generator extrahiert und klassifiziert alle BC-Bezeichner aus den fünf Tool-Quelldateien deterministisch (function/assetGroup/unknown, Pitfall 3)"
    requirement: "SCAN-09"
    verification:
      - kind: unit
        ref: "tests/baseline-manifest.test.js#Baseline-Manifest ist aktuell (SCAN-09, T-6-01)"
        status: pass
      - kind: unit
        ref: "tests/baseline-manifest.test.js#Klassifikation (classif, Pitfall 3)"
        status: pass
      - kind: unit
        ref: "tests/baseline-manifest.test.js#baseline-manifest.js in der Sandbox und statisch"
        status: pass
    human_judgment: false
  - id: D2
    description: "Committete baseline-manifest.json/.js sind deterministisch (kein Zeitstempel, zwei Läufe byte-identisch) und lösen keine Regression in der Gesamt-Suite aus"
    requirement: "SCAN-09"
    verification:
      - kind: integration
        ref: "npm run baseline (zweiter Lauf) && git diff --quiet -- baseline-manifest.json baseline-manifest.js"
        status: pass
      - kind: integration
        ref: "npm test (volle Suite)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-19
status: complete
---

# Phase 6 Plan 1: Baseline-Manifest-Generator Summary

**Dev-only Node-Generator `tools/build-baseline.js` extrahiert 83 BC-Bezeichner aus den fünf Tool-Quelldateien, klassifiziert sie statisch (19 function/33 assetGroup/31 unknown) und schreibt deterministisch die committeten Zwillingsdateien `baseline-manifest.json`/`baseline-manifest.js`, geschützt durch eine Frische-Diff-Testsuite.**

## Performance

- **Duration:** ~15 min
- **Started:** ~2026-09-19T07:56:00Z (geschätzt — kein expliziter Start-Timer erfasst)
- **Completed:** 2026-09-19T08:11:15Z
- **Tasks:** 2/2
- **Files modified:** 6 (4 neu, 2 geändert; siehe key-files)

## Accomplishments

- `tools/build-baseline.js` (CJS, nur `fs`/`path`, kein Build-Schritt) mit `classifyIdentifier`, `extractBaseline`, `readSources`, `renderManifestJson`, `renderManifestJs`, `buildBaseline`, `writeBaseline` und `require.main`-CLI-Guard; `module.exports` für den Vitest-Require-Zugriff
- `npm run baseline` schreibt `baseline-manifest.json` (Tooling) und `baseline-manifest.js` (`const BASELINE_MANIFEST = {...};`, Zero-Fetch-Konsumform, GitHub-Pages- und `file://`-tauglich) — deterministisch, ohne Zeitstempel, zwei Läufe byte-identisch verifiziert
- `tests/baseline-manifest.test.js` mit 11 Testfällen über drei describe-Blöcke: Frische-Diff, Determinismus, Manifest-Form, Mindestumfang/Stichproben, modProbes-Objektschlüssel-Gegenprobe in loader.js, Klassifikations-Einzelfälle, `extractBaseline`/`renderManifestJs` über synthetische Quellen, Sandbox-Ladbarkeit, statische Gates
- Erste committete Manifest-Generation: **83 Bezeichner gesamt — 19 function, 33 assetGroup, 31 unknown** (deckt sich exakt mit der im Plan dokumentierten, um die "assetGroup nur wenn quoted"-Verfeinerung korrigierten Erwartung 19/33/31)

## Task Commits

Jeder Task wurde atomar committet:

1. **Task 1: Baseline-Manifest-Tests schreiben und RED bestätigen** — `83cd7d5` (test) — `tests/baseline-manifest.test.js`, RED bestätigt (`Cannot find module '../tools/build-baseline.js'`)
2. **Task 2: `tools/build-baseline.js` + `npm run baseline` + generierte Dateien** — `b0b6707` (feat) — `tools/build-baseline.js`, `package.json`, `baseline-manifest.json`, `baseline-manifest.js`, GREEN (11/11 neue Tests, volle Suite 25 Dateien / 342 passed + 2 expected fail)

**Plan metadata:** folgt (docs-Commit mit diesem SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, 06-VALIDATION.md)

## Files Created/Modified

- `tools/build-baseline.js` — Generator/CLI (neu)
- `baseline-manifest.json` — committetes Manifest (neu, generiert)
- `baseline-manifest.js` — Konsumform `const BASELINE_MANIFEST` (neu, generiert)
- `tests/baseline-manifest.test.js` — Frische-Diff/Determinismus/Klassifikations-/Sandbox-Tests (neu)
- `package.json` — Script `baseline` ergänzt
- `.planning/phases/06-scan-tab-analyse/06-VALIDATION.md` — Zeilen 6-01-01/6-01-02 auf ✅ done gesetzt, Ist-Stand-Notiz zur Suite-Größe korrigiert

## Decisions Made

- Script-Platzierung in `package.json` zwischen `test:watch` und `coverage` statt wörtlich "nach coverage" (siehe key-decisions oben) — reine Diff-Minimierung, keine funktionale Änderung.
- Hartcodierte Datei-/Testzahlen in den Plan-Verify-Skripten (z. B. "23 Dateien", "Test Files +24 passed") wurden gegen den tatsächlich gemessenen Ist-Stand (24 Dateien vor, 25 nach diesem Plan) geprüft statt blind wörtlich ausgeführt — Ursache ist ein zwischen RESEARCH und Ausführung gelandeter Quick-Task, keine Abweichung in der Implementierung.
- `renderManifestJson`/`renderManifestJs` exakt wie im Plan-Vertrag benannt und implementiert, obwohl ein Akzeptanzkriterium wegen Substring-Überlappung einen irreführenden Zählwert liefert (dokumentiert, keine Code-Änderung nötig).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] package.json-Einfügeposition korrigiert, damit der Diff-Gate-Test besteht**
- **Found during:** Task 2 (Verify-Schritt, `git diff 49e4365 -- package.json`)
- **Issue:** Die Plan-Aktion verlangte wörtlich, `"baseline"` nach `"coverage"` einzufügen. Da `"coverage"` bisher die letzte scripts-Zeile ohne Trailing-Komma war, hätte das Einfügen an dieser Stelle zwangsläufig eine bestehende Zeile (Komma-Zusatz) verändert — der Diff hätte dann 2 hinzugefügte + 1 gelöschte Zeile gezeigt, statt der vom selben Plan geforderten "genau eine hinzugefügte, keine gelöschte Zeile".
- **Fix:** `"baseline"` stattdessen zwischen `"test:watch"` (hat bereits ein Trailing-Komma) und `"coverage"` eingefügt — reine Zeilen-Insertion ohne Änderung einer bestehenden Zeile.
- **Files modified:** package.json
- **Verification:** `git diff 49e4365 -- package.json` zeigt exakt 1 `+`-Zeile, 0 `-`-Zeilen; `grep -c '"baseline": "node tools/build-baseline.js"' package.json` = 1
- **Committed in:** b0b6707 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule-1-Bugfix an einer widersprüchlichen Plan-Detailvorgabe).
**Impact on plan:** Keine funktionale Abweichung — dieselbe Funktionalität (`npm run baseline`), lediglich eine andere Zeile im scripts-Objekt, um das Plan-eigene Acceptance Criterion zu erfüllen. Kein Scope Creep.

## Issues Encountered

- Ist-Stand-Drift der Testsuite: Vor diesem Plan lag die Suite bei 24 Dateien / 331 passed + 2 expected fail statt der im Plan-Kontext und in 06-VALIDATION.md notierten 23/323. Ursache: Der Quick-Task `260919-1ez` (LSCG-Merge-Zeitstempel, Commits `6056437`/`59316e4`) fügte `tests/lscg-merge-timestamps.test.js` hinzu — chronologisch vor der Phase-6-Planerstellung, aber offenbar nach der Zählung im RESEARCH-Dokument. Kein Blocker: alle automatisierten Verify-Schritte wurden gegen den tatsächlichen Ist-Stand ausgeführt (24→25 Dateien, 331→342 passed, weiterhin 2 expected fail, keine Regression). `06-VALIDATION.md` wurde entsprechend korrigiert.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Baseline-Manifest-Kontrakt `{schema, sourceFiles, identifierPattern, counts, identifiers[{name,kind,files}], chatHooks, modProbes}` steht fest und ist per Frische-Test gegen Drift geschützt — Plan 06-03 kann `baseline-manifest.js` direkt per `<script>` laden (`typeof BASELINE_MANIFEST !== 'undefined'`) und die Badge-Berechnung darauf aufbauen.
- Volle Suite grün (25 Dateien / 342 passed + 2 expected fail) — keine Blocker für Plan 06-02.
- Hinweis für künftige Pläne: Nach jeder Änderung an bot-engine.js/items.js/bot-ui.js/bot-data.js/loader.js muss `npm run baseline` erneut laufen und beide generierten Dateien explizit committet werden, sonst wird `tests/baseline-manifest.test.js` rot (T-6-01, gewollt).

---
*Phase: 06-scan-tab-analyse*
*Completed: 2026-09-19*

## Self-Check: PASSED

- Files exist: `tools/build-baseline.js`, `baseline-manifest.json`, `baseline-manifest.js`, `tests/baseline-manifest.test.js` — all FOUND
- Commits exist: `83cd7d5` (test, RED), `b0b6707` (feat, GREEN) — both FOUND in `git log --oneline --all`
- Re-run `npx vitest run tests/baseline-manifest.test.js` → 11/11 passed
- Re-run `npm test` → 25 Dateien / 342 passed + 2 expected fail (kein `failed`)
- `npm run baseline` (erneut) + `git diff --quiet -- baseline-manifest.json baseline-manifest.js` → deterministisch, keine Änderung
- `git diff 49e4365 -- package.json` → genau 1 hinzugefügte, 0 gelöschte Zeilen
- Commit-Scope beider Task-Commits per `git show --name-only` geprüft: exakt die im Plan genannten Pfade, keine unerwarteten Löschungen
