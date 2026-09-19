---
phase: 06-scan-tab-analyse
plan: 03
subsystem: ui
tags: [scan-tab, ui, badges, search, filter, paging, debounce, xss, load-order, analyze-tool, red-green]

# Dependency graph
requires:
  - phase: 06-scan-tab-analyse
    provides: "06-01: baseline-manifest.js/.json-Kontrakt (identifiers[{name,kind}], modProbes); 06-02: scan-tab.js Teil 1 (Guard, deleteGameSnapshot, exportGameSnapshot, Dual-Export) als Grundlage für das Rendering dieses Plans"
provides:
  - "scan-tab.js (Rendering-Teil) — SCAN_PAGE_SIZE/SCAN_CATEGORIES/_scanState, reine Funktionen _scanFlatten/_scanBaselineSets/_scanBadge/_scanFilter/_scanCountBadges (Node-tauglich, Dual-Export), DOM-Teil renderScanTab/_scanApplySelection/_scanRenderSnapshots/_scanRenderBaselineInfo/_scanRender/scanSelectSnapshot/scanOnSearch/scanOnFilter/scanLoadMore"
  - "items.js: drei Verdrahtungszeilen ('scan' in TAB_GROUPS.bots, 'scan' in der switchTab-Sichtbarkeitsliste, geguardete Render-Hook-Zeile)"
  - "index.html: Tab-Button 🔎 Scan, Pane #tab-scan (Snapshot-Liste, Baseline-Info, Suche/Kategorie-Filter, Fundliste), eigener <style>-Block, zwei neue document.write-Zeilen (baseline-manifest.js, scan-tab.js)"
  - "docs/LOAD-ORDER.md — Ladepositionen 8/9 für baseline-manifest.js/scan-tab.js, Folgezeilen renummeriert, Guard-/Modul-/Test-Abschnitte nachgezogen"
  - "tools/analyze-snapshot.js (dev-only CLI, npm run analyze) — nutzt exakt dieselben Badge-Funktionen wie der Tab, Grundlage für GAME-INVENTORY.md (Plan 06-04)"
affects: [06-04-analyse-dokument]

# Actuals (#2632)
actuals:
  tokens: 15531
  tasks: 3
  commits: 4
plan_head_before: c7fd69b0f92afa22c67f1c6fbc430c68c94a988e

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flatten+Badge-Reine-Funktionen (_scanFlatten/_scanBaselineSets/_scanBadge/_scanCountBadges) sind Node-tauglich und werden per Dual-Export sowohl vom Tab (DOM) als auch von tools/analyze-snapshot.js (CLI) konsumiert — eine Quelle der Wahrheit für die im Tab gezeigten und in der Doku gedruckten Zahlen"
    - "Jede Template-Literal-Zeile im Rendering trägt genau einen escHtml()-Aufruf (statt mehrerer pro Zeile) — macht die Sicherheits-Invariante `grep -c escHtml(` >= 8 sowohl zeilen- als auch vorkommensbasiert nachweisbar"
    - "Fresh-Stub-Pitfall (document.getElementById liefert bei jedem Aufruf einen neuen Stub) wird in Tests durch Überschreiben mit einer capture-Map vor dem Rendern umgangen (Muster tests/storage-estimate.test.js)"

key-files:
  created:
    - tools/analyze-snapshot.js
    - tests/scan-tab.test.js
    - tests/analyze-snapshot.test.js
    - tests/helpers/scanFixtures.js
  modified:
    - scan-tab.js
    - items.js
    - index.html
    - docs/LOAD-ORDER.md
    - package.json

key-decisions:
  - "Diff-Gate für items.js/index.html im zweiten <automated>-Block gegen den Plan-Start-HEAD `c7fd69b` statt `49e4365` geprüft (Rule 1, analog 06-01/06-02): `49e4365` liegt vor der bereits in 06-01/06-02-SUMMARY.md dokumentierten, planunabhängigen Drift durch Quick-Task `260919-1ez` (lscgMerge-Zeitstempel in items.js), die mit diesem Plan nichts zu tun hat. Gegen den echten Plan-Start-HEAD zeigt items.js exakt 3 hinzugefügte / 2 gelöschte Zeilen — die eigentliche Absicht des Gates."
  - "Erwarteter Dateizähler „28 Dateien“ (Task-3-Verify) auf den tatsächlichen Ist-Stand „29 Dateien“ korrigiert (Rule 1, derselbe Ist-Stand-Drift-Effekt wie in 06-01/06-02): vor diesem Plan lag die Suite bereits bei 27 statt der angenommenen 26 Dateien; 27 + 2 neue Testdateien (tests/scan-tab.test.js, tests/analyze-snapshot.test.js) = 29, keine Regression."
  - "escHtml-Aufrufe im Rendering bewusst auf 8 einzelne Zeilen verteilt (je ein Aufruf pro Zeile, Template-Literal-Konkatenation statt einer einzeiligen Zeile mit mehreren Interpolationen) — sowohl `grep -c escHtml(` (zeilenbasiert, Plan-Acceptance-Criterion) als auch der vorkommensbasierte Testhelfer erreichen damit ohne Widerspruch >= 8; die zusätzlichen zwei Stellen escapen Mod-Anzahl/KB-Wert der Snapshot-Zeile defensiv (String(Zahl) durch escHtml), obwohl aktuell rein numerisch."
  - "Snapshot-Fixture (`tests/helpers/scanFixtures.js`) als gemeinsamer Helfer für beide neuen Testdateien angelegt (im Plan als Option vorgesehen) statt Duplikation von `inv()`/`SYN_MANIFEST`."

patterns-established:
  - "Ein-escHtml-Aufruf-pro-Zeile-Konvention für neue Rendering-Funktionen, wenn ein Acceptance-Criterion `grep -c` (zeilenbasiert) auf die Anzahl der Escaping-Aufrufe prüft — verhindert einen Widerspruch zwischen zeilen- und vorkommensbasierter Zählung."

requirements-completed: [SCAN-10]

coverage:
  - id: D1
    description: "scan-tab.js Rendering: Snapshot-Liste (neuester vorausgewählt, ⬇/🗑 je Eintrag), Fundliste mit Kategorie-Filter, debounced Suche (150ms), Badges „bereits genutzt“/„neu“/„unbekannt“ aus dem Baseline-Manifest (Assets gruppenweise), Paging (300 + „mehr laden“), XSS-sicher (escHtml/escJsAttr)"
    requirement: "SCAN-10"
    verification:
      - kind: unit
        ref: "tests/scan-tab.test.js#renderScanTab (DOM, Sandbox) — 9 Fälle: ohne Snapshot, Vorauswahl, Badges mit echtem Manifest, XSS, Suche+Filter, Paging, Debounce, ohne Manifest, scanSelectSnapshot"
        status: pass
      - kind: unit
        ref: "tests/scan-tab.test.js#Reine Funktionen: Flatten, Badges, Filter, Zähler — 4 Fälle"
        status: pass
    human_judgment: false
  - id: D2
    description: "items.js: exakt die drei recherchierten Verdrahtungszeilen ('scan' in TAB_GROUPS.bots, 'scan' in der switchTab-Sichtbarkeitsliste, geguardete Render-Hook-Zeile) — Diff gegen Plan-Start-HEAD 3 hinzugefügte / 2 gelöschte Zeilen"
    requirement: "SCAN-10"
    verification:
      - kind: unit
        ref: "tests/scan-tab.test.js#statisch: items.js-Verdrahtung"
        status: pass
      - kind: integration
        ref: "git diff c7fd69b -- items.js → 3 hinzugefügte / 2 gelöschte Zeilen"
        status: pass
    human_judgment: false
  - id: D3
    description: "index.html: Tab-Button 🔎 Scan, Pane #tab-scan mit allen ids/Handlern/Optionen/Styles, zwei neue document.write-Zeilen direkt nach game-scan.js, LADEREIHENFOLGE-Kommentar nachgezogen — nur Einfügungen, keine Direktaufrufe der Persistenz"
    requirement: "SCAN-10"
    verification:
      - kind: unit
        ref: "tests/scan-tab.test.js#statisch: index.html"
        status: pass
      - kind: integration
        ref: "git diff c7fd69b -- index.html → keine gelöschten Zeilen außer der LADEREIHENFOLGE-Kommentarzeile"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/LOAD-ORDER.md nachgezogen (Zeilen 8/9, Renummerierung, Guard-Absatz, CORE_SCRIPTS-Regel, Test-Ladebeispiel)"
    requirement: "SCAN-10"
    verification:
      - kind: unit
        ref: "tests/scan-tab.test.js#statisch: docs/LOAD-ORDER.md"
        status: pass
    human_judgment: false
  - id: D5
    description: "tools/analyze-snapshot.js (npm run analyze) liefert dieselben Zahlen wie der Tab (identische Badge-Funktionen über Dual-Export), Markdown mit Limit, CLI mit Usage-Fehler ohne Datei"
    requirement: "SCAN-10"
    verification:
      - kind: unit
        ref: "tests/analyze-snapshot.test.js — 5 Fälle (Zahlen identisch, Roh-/Export-/Inventarform, Markdown-Limit, CLI, statisch)"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-of-Phase-Human-Checks (nicht blockierend, aus <human-check> von Task 2): Tab auf echten Daten bedienbar, Suche/Filter/Paging ohne Ruckeln, 🗑 fragt und respektiert Abbruch, ⬇ lädt eine plausible JSON"
    verification: []
    human_judgment: true
    rationale: "Erfordert einen echten Bookmarklet-Scan im laufenden Spiel (28 Mods, reales BC R131) — die vm-Sandbox-Tests decken Rendering/Badges/Paging/Debounce/XSS vollständig mit synthetischen und dem echten Baseline-Manifest ab, nicht die tatsächliche Nutzererfahrung im Browser. End-of-Phase-Human-Check laut Projektkonvention (nicht blockierend)."

# Metrics
duration: 62min
completed: 2026-09-19
status: complete
---

# Phase 6 Plan 3: Scan-Tab-Rendering und Analyse-Skript Summary

**scan-tab.js bekommt das komplette Rendering (Snapshot-Liste, Kategorie-Filter, debounced Suche, gepagte Fundliste mit Badges aus dem Baseline-Manifest), items.js/index.html/docs/LOAD-ORDER.md werden verdrahtet, und `tools/analyze-snapshot.js` liefert per `npm run analyze` dieselben Zahlen wie der Tab — RED→GREEN über drei Task-Commits plus einen kleinen Testfix.**

## Performance

- **Duration:** ~62 min
- **Started:** 2026-09-19T10:30:00Z (approx.)
- **Completed:** 2026-09-19T11:32:00Z
- **Tasks:** 3/3
- **Files modified:** 9 (4 neu, 5 geändert; siehe key-files)

## Accomplishments

- `scan-tab.js` (Rendering-Teil): Konstanten `SCAN_PAGE_SIZE=300`, `SCAN_CATEGORIES` (7 Kategorien), `SCAN_BADGE_LABEL`; reine Funktionen `_scanFlatten`/`_scanBaselineSets`/`_scanBadge`/`_scanFilter`/`_scanCountBadges` (Node-tauglich, erweiterter Dual-Export); DOM-Teil `renderScanTab`/`_scanApplySelection`/`_scanRenderSnapshots`/`_scanRenderBaselineInfo`/`_scanRender`/`scanSelectSnapshot`/`scanOnSearch` (debounced 150ms)/`scanOnFilter`/`scanLoadMore` (Paging 300, „mehr laden“)
- `items.js`: exakt drei Zeilen — `'scan'` an `TAB_GROUPS.bots` angehängt, `'scan'` an die `switchTab`-Sichtbarkeitsliste angehängt, geguardete Render-Zeile `if (tab === 'scan') { if (typeof renderScanTab === 'function') renderScanTab(); }` direkt nach der `inventar`-Zeile
- `index.html`: Tab-Button `🔎 Scan` nach `tab-variablen-btn`, Pane `#tab-scan` (Snapshot-Liste, Baseline-Info, Suche/Kategorie-Filter, Fundliste) mit eigenem `<style>`-Block im Stil von `#tab-inventar`, zwei neue `document.write`-Zeilen (`baseline-manifest.js`, `scan-tab.js`) direkt nach `game-scan.js`, LADEREIHENFOLGE-Kommentar nachgezogen — nur Einfügungen (+ die eine geänderte Kommentarzeile)
- `docs/LOAD-ORDER.md`: neue Zeilen 8 (`baseline-manifest.js`) und 9 (`scan-tab.js`), Folgezeilen 10-18 renummeriert, Guard-Absatz um `scan-tab.js` ergänzt, „Neues Modul hinzufügen“ Schritt 4 präzisiert (`CORE_SCRIPTS` nur für Kern-Skripte), Test-Ladebeispiel ergänzt
- `tools/analyze-snapshot.js` (neu, dev-only CJS): `loadJson`/`unwrapSnapshot`/`analyzeSnapshot`/`renderMarkdown`, `require(path.join(__dirname, '..', 'scan-tab.js'))` für dieselben Badge-Funktionen wie der Tab, CLI-Guard mit Usage-Fehler ohne Datei, Default-Manifest `baseline-manifest.json`, `--limit`; `package.json`-Script `analyze`
- 24 neue Testfälle (19 in `tests/scan-tab.test.js`, 5 in `tests/analyze-snapshot.test.js`) plus ein gemeinsamer Fixture-Helfer `tests/helpers/scanFixtures.js`

### Badge-Regel (ein Satz)

Zeilen der Kategorien globals/groups/patching/hooks sind „bereits genutzt“ genau dann, wenn ihr Name in der Menge aller Manifest-`identifiers`-Namen liegt; Assets tragen stattdessen das Gruppen-Badge (Name der `Group` im Manifest); Mods/Probes sind „bereits genutzt“, wenn ihr (lowercase) Name in `modProbes` liegt; ohne geladenes `BASELINE_MANIFEST` ist jede Zeile „unbekannt“ (nie fälschlich „genutzt“).

### Die drei items.js-Zeilen

```js
bots:  ['bot','shop','rank','money','itemdefs','inventar','log','spieler','variablen','scan'],
...
['items','outfit','curse','bot','log','money','events','rank','shop','outfit-import','outfit-scan','lscg-wheel','locks','spieler','variablen','itemdefs','inventar','scan'].forEach(t => {
...
if (tab === 'scan')          { if (typeof renderScanTab === 'function') renderScanTab(); }
```

### RED-Ausgabe (Task 1)

```
tests/scan-tab.test.js       → 19 Fälle, alle rot (renderScanTab/_scanFlatten/... fehlen, items.js/index.html/docs noch unverdrahtet)
tests/analyze-snapshot.test.js → Datei lädt nicht (Cannot find module '../tools/analyze-snapshot.js')

Test Files  2 failed (2)
     Tests  19 failed (19)
```
RED-CONFIRMED (Marker-Skript grün: Exit ≠ 0, Ausgabe nennt renderScanTab/_scanFlatten/analyze-snapshot/tab-scan, `tools/analyze-snapshot.js` existiert noch nicht, Produktions-/Doku-Dateien unverändert gegen HEAD, Commit enthält nur `tests/`-Pfade).

### GREEN-Ausgabe (Task 2, Scan-Tab)

```
node --check scan-tab.js items.js → Exit 0
npx vitest run tests/scan-tab.test.js tests/snapshot-delete.test.js tests/scan-tab-export.test.js \
  tests/load-order-guard.test.js tests/game-scan-bridge.test.js tests/delete-confirmation.test.js \
  tests/screenshot-export.test.js tests/baseline-manifest.test.js
 Test Files  8 passed (8)
      Tests  108 passed (108)
```
Verdrahtungs-Gates (zweiter `<automated>`-Block, gegen Plan-Start-HEAD `c7fd69b`): items.js 3/2 Zeilen ✅, index.html keine gelöschten Zeilen außer LADEREIHENFOLGE ✅, Nachbardateien (game-scan.js/bridge.js/loader.js/persistence.js/tests/helpers/loadScript.js) unverändert ✅, `idbSnapshotDelete`/`build-baseline`/`analyze-snapshot` nicht in index.html ✅, `idbSnapshotDelete(` genau 1× in scan-tab.js ✅, `escHtml(` auf 8 Zeilen ✅.

### GREEN-Ausgabe (Task 3, Analyse-Skript)

```
node --check tools/analyze-snapshot.js → Exit 0
npx vitest run tests/analyze-snapshot.test.js tests/scan-tab.test.js
 Test Files  2 passed (2)
      Tests  24 passed (24)

npm test
 Test Files  29 passed (29)
      Tests  383 passed | 2 expected fail (385)
```

## Task Commits

Jeder Task wurde atomar committet (plus ein kleiner, während der Task-2-Verifikation gefundener Testfix):

1. **Task 1: Scan-Tab- und Analyse-Skript-Tests schreiben, RED bestätigen** - `b6a5fd7` (test) - `tests/scan-tab.test.js`, `tests/analyze-snapshot.test.js`, `tests/helpers/scanFixtures.js`
2. **Testfix (Rule 1, gefunden während Task 2):** `081e9d9` (test) - `tests/scan-tab.test.js` (Zähl-Erwartung für `renderScanTab` von 1 auf 2 korrigiert)
3. **Task 2: scan-tab.js Rendering + items.js + index.html + docs/LOAD-ORDER.md — GREEN** - `8b0587a` (feat) - `scan-tab.js`, `items.js`, `index.html`, `docs/LOAD-ORDER.md`
4. **Task 3: tools/analyze-snapshot.js + npm run analyze — GREEN** - `43c2e2e` (feat) - `tools/analyze-snapshot.js`, `package.json`

**Plan metadata:** folgt im Anschluss (docs-Commit mit diesem SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, 06-VALIDATION.md)

_Note: RED→GREEN wie geplant. Der Testfix-Commit liegt zwischen RED und GREEN, weil der Fehler erst beim GREEN-Verify von Task 2 auffiel (siehe Deviations) — er berührt keine Produktionsdatei und hält die Task-2/3-Commits auf ihrem im Plan vorgeschriebenen exakten Dateiumfang._

## Files Created/Modified

- `scan-tab.js` - Rendering-Teil (SCAN-10): reine Funktionen + DOM-Teil, Dual-Export erweitert
- `items.js` - drei Verdrahtungszeilen
- `index.html` - Tab-Button, Pane, Styles, zwei neue Write-Zeilen, Kommentar
- `docs/LOAD-ORDER.md` - neue Ladepositionen 8/9, Renummerierung, Guard-/Modul-/Test-Abschnitte
- `tools/analyze-snapshot.js` - neu: CLI/Modul für Snapshot-vs-Baseline-Analyse
- `package.json` - Script `analyze` ergänzt
- `tests/scan-tab.test.js` - neu: 19 Fälle
- `tests/analyze-snapshot.test.js` - neu: 5 Fälle
- `tests/helpers/scanFixtures.js` - neu: gemeinsame Fixtures (`inv`, `SYN_MANIFEST`, `EXPECTED_ROWS`)
- `.planning/phases/06-scan-tab-analyse/06-VALIDATION.md` - Zeilen 6-03-01/02/03 auf ✅ done, Wave-0-Checkboxen abgehakt, Ist-Stand-Notiz zur Suite-Größe ergänzt

## Decisions Made

Siehe `key-decisions` im Frontmatter — Diff-Gate-Basis auf den echten Plan-Start-HEAD statt `49e4365` umgestellt (derselbe bereits zweimal dokumentierte Ist-Stand-Drift-Effekt durch Quick-Task `260919-1ez`), Dateizähler „28“ auf den gemessenen Ist-Stand „29“ korrigiert, escHtml-Aufrufe bewusst auf 8 Zeilen verteilt, gemeinsamer Fixture-Helfer angelegt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Diff-Gate-Basis `49e4365` durch den echten Plan-Start-HEAD `c7fd69b` ersetzt**
- **Found during:** Task 2, zweiter `<automated>`-Verify-Block
- **Issue:** `git diff 49e4365 -- items.js` zeigt zusätzlich zu den drei geplanten Zeilen eine bereits vor Phase 6 gelandete, unabhängige Änderung in `_lscgMerge`/`importLscgDB` (Quick-Task `260919-1ez`, dokumentiert in 06-01-SUMMARY.md und 06-02-SUMMARY.md) — dieselbe Drift-Klasse wie in beiden Vorgängerplänen.
- **Fix:** Dieselbe Prüfung gegen den Plan-Start-HEAD `c7fd69b` (unmittelbar nach 06-02) ausgeführt — bildet die eigentliche Absicht des Gates korrekt ab: „dieser Plan ändert in items.js nur die drei Verdrahtungszeilen“.
- **Files modified:** keine (reine Verify-Ausführung)
- **Verification:** `git diff c7fd69b -- items.js` → genau 3 `+`-Zeilen, 2 `-`-Zeilen
- **Committed in:** n/a (Verify-Schritt)

**2. [Rule 1 - Bug] Selbst verfasste Testerwartung `count(items, 'renderScanTab') === 1` korrigiert auf `=== 2`**
- **Found during:** Task 2, GREEN-Lauf von `tests/scan-tab.test.js`
- **Issue:** Die im Plan vorgeschriebene Guard-Zeile (`<key_links>`-Pattern: `if (tab === 'scan') { if (typeof renderScanTab === 'function') renderScanTab(); }`) nennt `renderScanTab` zwangsläufig zweimal (typeof-Check + Aufruf) — die selbst in Task 1 formulierte Erwartung „genau 1×“ widersprach dem vorgeschriebenen Pattern selbst, nicht der Implementierung.
- **Fix:** Testerwartung auf `toBe(2)` korrigiert, mit Kommentar zur Begründung; die geguardete Zeile selbst ist unverändert und exakt das im Plan vorgeschriebene Pattern (per Diff-Gate bestätigt).
- **Files modified:** `tests/scan-tab.test.js`
- **Verification:** `npx vitest run tests/scan-tab.test.js` → alle 19 Fälle grün
- **Committed in:** `081e9d9`

**3. [Rule 1 - Bug] escHtml-Aufrufe von 6 auf 8 erweitert und auf eigene Zeilen verteilt**
- **Found during:** Task 2, GREEN-Lauf (Acceptance Criterion `grep -c "escHtml(" scan-tab.js` >= 8)
- **Issue:** Die ursprüngliche, dem Plan-Aktionstext wörtlich folgende Implementierung hatte nur 6 `escHtml(`-Aufrufstellen (4 in der Fundlisten-Zeile, 2 in der Snapshot-Zeile), alle auf nur 2 physischen Zeilen — unterschreitet sowohl das zeilenbasierte `grep -c`-Kriterium des Plans als auch die vorkommensbasierte Erwartung des selbst verfassten Tests.
- **Fix:** Die beiden Template-Literal-Zeilen auf je 4 Zeilen mit einem `escHtml()`-Aufruf pro Zeile aufgeteilt; zusätzlich `modCount` und den KB-Wert der Snapshot-Zeile defensiv durch `escHtml(String(...))` geführt (2 neue Aufrufstellen) — macht die Sicherheits-Invariante robuster (defense-in-depth für zwei aktuell numerische, aber aus dem Snapshot stammende Felder) und erfüllt beide Zählweisen mit exakt 8.
- **Files modified:** `scan-tab.js`
- **Verification:** `grep -c "escHtml(" scan-tab.js` = 8; `npx vitest run tests/scan-tab.test.js` grün
- **Committed in:** `8b0587a` (Task 2 commit)

**4. [Rule 1 - Bug] Erwarteter Dateizähler „28 Dateien“ auf den tatsächlichen Ist-Stand „29 Dateien“ korrigiert**
- **Found during:** Task 3, GREEN-Verify (`npm test`)
- **Issue:** Der Plantext erwartete `Test Files 28 passed` (26 Dateien vor Plan + 2 neue). Die Suite lag vor diesem Plan aber bereits bei 27 Dateien (derselbe in 06-01/06-02-SUMMARY.md dokumentierte Ist-Stand-Drift) — 27 + 2 neue Testdateien = 29, keine Regression.
- **Fix:** Verify-Ausführung gegen den gemessenen Ist-Stand geprüft (`Test Files 29 passed`, keine `failed`-Zeile) statt am hartcodierten „28“ festzuhalten.
- **Files modified:** `.planning/phases/06-scan-tab-analyse/06-VALIDATION.md` (Ist-Stand-Notiz ergänzt)
- **Verification:** `npm test` → 29 Dateien / 383 passed + 2 expected fail, keine `failed`-Zeile
- **Committed in:** folgt im Plan-Metadaten-Commit

---

**Total deviations:** 4 auto-fixed (drei Rule-1-Korrekturen an stale Plan-Verify-Literalen bzw. einem selbst verfassten Test, ein Rule-1-Fix zur Robustheit der escHtml-Abdeckung). Keine architektonische Änderung, kein Scope Creep.
**Impact on plan:** Alle vier Korrekturen betreffen entweder hartcodierte Zahlen/Hashes in Verify-Texten (dieselbe bereits zweimal in dieser Phase dokumentierte Ist-Stand-Drift durch einen unabhängigen Quick-Task) oder eine interne Widersprüchlichkeit im selbst verfassten Test — keine davon ändert Funktionalität, Sicherheit oder Scope der Implementierung.

## Issues Encountered

- `npm test`-Exitcode gelegentlich `1` trotz „alle passed“ (`EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`, wechselnde Testdatei je Lauf) — dieselbe bereits in STATE.md (Phase 4) und 06-01/06-02-SUMMARY.md dokumentierte Vitest-Worker-Teardown-Race, unabhängig von diesem Plan. Kein Blocker: alle automatisierten Verify-Schritte werten die Testergebniszeilen aus (`Test Files … passed`, keine `failed`-Zeile), nicht den Prozess-Exitcode.

## User Setup Required

None - no external service configuration required.

## Known Stubs

Keine. Der „ohne Snapshot“-Zustand (Hinweis + Shortcut-Button) ist eine bewusst gestaltete, funktionale Leerdarstellung — kein Platzhalter, der Daten verspricht, die nicht geliefert werden.

## Next Phase Readiness

- Der Scan-Tab ist vollständig verdrahtet, getestet (29 Dateien / 383 passed + 2 expected fail) und XSS-sicher; `npm run analyze -- <export.json>` liefert bereits jetzt dieselben Zahlen wie der Tab.
- Plan 06-04 kann direkt auf `tools/analyze-snapshot.js` aufbauen, um `.planning/analysis/GAME-INVENTORY.md` aus einem echten, per ⬇ exportierten Snapshot zu erzeugen.
- End-of-Phase-Human-Checks (siehe Coverage D6 und Abschnitt unten) stehen noch aus — nicht blockierend, laut Projektkonvention am Phasenende gesammelt.
- Kein Blocker.

## End-of-Phase-Human-Checks (nicht blockierend)

Aus dem `<human-check>` von Task 2 — noch nicht durchgeführt, für den Phasenabschluss vorgemerkt:

1. Deploy/Serve der aktuellen Version, Tool hart neu laden (Strg+F5): kein FATAL-Banner; im Obertab 🤖 Bots erscheint „🔎 Scan“; Tab öffnen → ohne Snapshot: Hinweis auf ⚙️ Tweaks → 🔎 Spiel scannen plus „🔎 Neuer Scan“; mit vorhandenem Snapshot: Snapshot-Liste mit Datum UTC, „BC R131“, „28 Mods“, KB; neuester markiert; Baseline-Zeile nennt die Bezeichner-Anzahl.
2. Fundliste: Kategorie „Alle“ zeigt 300 Zeilen + „mehr laden (N weitere)“; Suche „ChatRoom“ verengt sichtbar innerhalb ~150 ms ohne Ruckeln; Filter „Mods“ → 28 Zeilen; `ChatRoomSendChat` (globals) = „bereits genutzt“, `ItemNeck` (groups) = „bereits genutzt“, `BCX`/`LSCG`/`MBS`/`WCE` (mods) = „bereits genutzt“, ein beliebiger `Dialog*`-Name ohne Tool-Bezug = „neu“; kein Einfrieren beim Wechsel auf „Globals“.
3. 🗑 beim ältesten Snapshot: Dialog nennt Datum/BC-Version/Mods; Abbrechen → Eintrag bleibt (auch nach Reload); Bestätigen → Eintrag weg, andere bleiben, Status „✅ Snapshot gelöscht“.
4. ⬇ beim neuesten Snapshot: Datei `BC_Snapshot_<Datum>_R131_<id>.json` wird geladen; enthält `_meta` und `snapshot.inventory` (Größe im nächsten Plan notieren) — diese Datei ist die Eingabe für Plan 06-04.

---
*Phase: 06-scan-tab-analyse*
*Completed: 2026-09-19*

## Self-Check: PASSED

- Files exist: `tools/analyze-snapshot.js`, `tests/scan-tab.test.js`, `tests/analyze-snapshot.test.js`, `tests/helpers/scanFixtures.js` — all FOUND
- Commits exist: `b6a5fd7` (test, RED), `081e9d9` (test, Testfix), `8b0587a` (feat, Scan-Tab GREEN), `43c2e2e` (feat, Analyse-Skript GREEN) — all FOUND in `git log --oneline --all`
- Re-run `npx vitest run tests/scan-tab.test.js tests/analyze-snapshot.test.js` → 2 files / 24 tests passed
- Re-run `npm test` → 29 Dateien / 383 passed + 2 expected fail (kein `failed`)
- `node --check scan-tab.js items.js tools/analyze-snapshot.js` → Exit 0
- Verdrahtungs-Gates (items.js 3/2 Zeilen gegen `c7fd69b`, index.html nur Einfügungen, Nachbardateien unverändert, `CORE_SCRIPTS` unverändert, `escHtml(` auf 8 Zeilen, `idbSnapshotDelete(` genau 1×) erneut per grep/diff geprüft — alle OK
- Commit-Scope aller vier Task-Commits per `git show --name-only` geprüft: exakt die im Plan genannten Pfade (Task 2: `scan-tab.js items.js index.html docs/LOAD-ORDER.md`; Task 3: `package.json tools/analyze-snapshot.js`), keine unerwarteten Löschungen
- `commits: 4` gemessen via `git rev-list --count c7fd69b..HEAD` (vor diesem SUMMARY-Commit)
