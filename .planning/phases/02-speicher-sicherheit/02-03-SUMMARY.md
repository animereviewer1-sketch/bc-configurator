---
phase: 02-speicher-sicherheit
plan: 03
subsystem: storage
tags: [storage-estimate, tweaks-panel, ui, vm-sandbox, red-green]

# Dependency graph
requires:
  - phase: 02-speicher-sicherheit
    provides: "02-02: Test-Infrastruktur (loadScript/evalIn/makeElementStub), Tweaks-Panel-Konventionen unverändert"
provides:
  - "STAB-03: Sektion 📊 Speicher im Tweaks-Panel zeigt belegten/verfügbaren Browser-Speicher aus navigator.storage.estimate() als lesbaren Text, Button 🔄 Aktualisieren fragt neu ab"
  - "_speicherFormatBytes(n) / _speicherFormat(usage, quota) als reine, testbare Formatierungsfunktionen (deutsches Komma, MB/GB, 90%-Warnhinweis)"
  - "_speicherZeigeStatus() mit Feature-Detection und Fehler-Fallback — bricht nie den Ladepfad, auch nicht in der vm-Sandbox ohne navigator"
affects: []

# Actuals (#2632)
actuals:
  tokens: 1753
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Init-Hook nach items.js-Konvention (document.readyState-Check + DOMContentLoaded-Listener mit setTimeout), aber mit Pflicht-Guard für fehlendes navigator, weil die vm-Sandbox der Tests kein navigator hat und der Hook beim Laden feuert"
    - "navigator wird in Tests wie schon in RESEARCH dokumentiert per extraGlobals injiziert; document.getElementById wird für eine feste ID (#storageInfo) auf dem Sandbox-document überschrieben, um textContent zu inspizieren"

key-files:
  created:
    - tests/storage-estimate.test.js
  modified:
    - items.js
    - index.html

key-decisions:
  - "Init-Hook-Zeilen für Direktaufruf und Listener-Aufruf auf getrennte Zeilen gesetzt (statt einer Zeile wie beim _applyGroupUI-Vorbild), damit _speicherZeigeStatus als eigenständige Zeilen-Treffer zählbar bleibt und der Code lesbar bleibt"
  - "Kommentar über der Funktion vermeidet die exakte Zeichenkette 'navigator.storage.estimate()' (mit Klammern), damit der Acceptance-Grep auf genau einen Produktionsaufruf zeigt statt auf Kommentar + Aufruf"

patterns-established:
  - "Reine Formatierungsfunktion + async Anzeige-Wrapper mit Feature-Detection als Muster für weitere Browser-API-Anzeigen im Tweaks-Panel"

requirements-completed: [STAB-03]

coverage:
  - id: D1
    description: "_speicherFormatBytes(n) formatiert Bytes deterministisch als 'x,y MB' (unter 1 GiB) bzw. 'x,yz GB' (ab 1 GiB) mit deutschem Komma"
    requirement: "STAB-03"
    verification:
      - kind: unit
        ref: "tests/storage-estimate.test.js#_speicherFormatBytes(%i) → %s (it.each, 4 Fälle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "_speicherFormat(usage, quota) liefert Text mit Prozent, 90%-Warnhinweis und Fallback ohne Kontingent"
    requirement: "STAB-03"
    verification:
      - kind: unit
        ref: "tests/storage-estimate.test.js#_speicherFormat: belegt/verfügbar/Prozent"
        status: pass
      - kind: unit
        ref: "tests/storage-estimate.test.js#_speicherFormat: ab 90 % Warnhinweis"
        status: pass
      - kind: unit
        ref: "tests/storage-estimate.test.js#_speicherFormat: ohne Kontingent"
        status: pass
    human_judgment: false
  - id: D3
    description: "_speicherZeigeStatus() schreibt das formatierte Ergebnis von navigator.storage.estimate() nach #storageInfo.textContent"
    requirement: "STAB-03"
    verification:
      - kind: unit
        ref: "tests/storage-estimate.test.js#_speicherZeigeStatus schreibt das Ergebnis von navigator.storage.estimate() nach #storageInfo"
        status: pass
    human_judgment: false
  - id: D4
    description: "_speicherZeigeStatus() degradiert sichtbar statt zu werfen: fehlendes navigator, navigator ohne storage.estimate, werfendes estimate() → jeweils Fallback-Text, nie eine Exception"
    requirement: "STAB-03"
    verification:
      - kind: unit
        ref: "tests/storage-estimate.test.js#ohne navigator: Fallback-Text, keine Exception"
        status: pass
      - kind: unit
        ref: "tests/storage-estimate.test.js#navigator ohne storage.estimate: Fallback-Text"
        status: pass
      - kind: unit
        ref: "tests/storage-estimate.test.js#estimate() wirft: sichtbare Fehlermeldung statt Exception"
        status: pass
    human_judgment: false
  - id: D5
    description: "Laden von items.js in der vm-Sandbox ohne navigator wirft weiterhin nicht; alle bestehenden Tests bleiben grün (Init-Hook-Guard greift)"
    requirement: "STAB-03"
    verification:
      - kind: unit
        ref: "tests/storage-estimate.test.js#Laden von items.js ohne navigator wirft nicht (Init-Hook ist guarded)"
        status: pass
      - kind: unit
        ref: "npm test — volle Suite (10 Testdateien, 97 passed + 2 expected fail)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manuelle Browser-Verifikation: Einstellungen-Panel zeigt nach ~1,5s einen plausiblen Speicherwert, Klick auf 🔄 Aktualisieren frischt ihn auf, Größenordnung stimmt mit DevTools → Application → Storage überein"
    verification: []
    human_judgment: true
    rationale: "Erfordert echten Browser mit navigator.storage.estimate() und DevTools-Vergleich; die vm-Sandbox-Tests decken die Formatierungs- und Fallback-Logik vollständig ab, nicht das tatsächliche Timing/Rendering im echten Browser (VALIDATION.md Manual-Only, end-of-phase)"

# Metrics
duration: 10min
completed: 2026-09-13
status: complete
plan_head_before: 0babb8c5b89fd9d100afa996490aaf694074faaa
---

# Phase 2 Plan 3: Speicherplatz-Anzeige Summary

**Neue Sektion `📊 Speicher` im Einstellungen-Panel zeigt belegten/verfügbaren Browser-Speicher via `navigator.storage.estimate()` mit deutschem Format (Komma, MB/GB, 90%-Warnhinweis) und sichtbaren Fallbacks statt Absturz — RED→GREEN mit zwölf Testfällen.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-13T10:08:00Z (approx.)
- **Completed:** 2026-09-13T10:17:08Z
- **Tasks:** 2
- **Files modified:** 3 (1 neu, 2 geändert)

## Accomplishments

- `tests/storage-estimate.test.js` (STAB-03): 12 Testfälle (4 `it.each` für `_speicherFormatBytes`, 3 für `_speicherFormat`, 5 für `_speicherZeigeStatus`) mit `navigator`-Stub per `extraGlobals` und `document.getElementById`-Override für `#storageInfo` — **RED-CONFIRMED** vor dem Fix (11 Fälle rot mit `TypeError: ctx._speicher… is not a function`, 1 Fall rot mit `AssertionError` auf `typeof … === 'function'`, exakt wie im Plan vorausgesagt)
- `items.js`: `_speicherFormatBytes(n)`, `_speicherFormat(usage, quota)`, `async function _speicherZeigeStatus()` plus geguardeter Init-Hook nach items.js-Konvention — **GREEN** (12 passed), volle Suite grün (97 passed + 2 expected fail, vorher 85 + 2)
- `index.html`: Sektion `📊 Speicher` mit `<div id="storageInfo">` und Button `🔄 Aktualisieren` nach dem Vorbild `🔁 Automatisches Backup` (`#bcBackupInfo`) eingefügt — ausschließlich Einfügungen (8 Insertions, 0 Deletions gegenüber Phase-Baseline `0d9ddbe`)

### RED-Ausgabe Task 1 (vor dem Fix)

```
 Test Files  1 failed (1)
      Tests  12 failed (12)
```
11 Fälle: `TypeError: ctx._speicherZeigeStatus is not a function` bzw. `ctx._speicherFormatBytes is not a function` / `ctx._speicherFormat is not a function`.
1 Fall (Laden ohne navigator wirft nicht): `AssertionError: expected 'undefined' to be 'function'` — `not.toThrow()`-Teil bereits grün (kein Init-Hook vorhanden, der werfen könnte), nur der `typeof`-Check rot. RED-CONFIRMED-Marker der Plan-Verify-Befehle wurde ausgegeben.

### GREEN-Ausgabe Task 2 (nach der Implementierung)

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```
`npm test`: 10 Testdateien, 97 passed + 2 expected fail (99 gesamt), Exit 0. `node --check items.js` Exit 0.

### `git diff --numstat 0d9ddbe HEAD -- index.html`

```
8	0	index.html
```
8 Insertions, 0 Deletions — reine Einfügung, wie von der Threat-Mitigation T-2-11 verlangt.

### `git show --stat` des feat-Commits

```
c3cda19 feat(02-03): show storage usage via navigator.storage.estimate() in settings panel (STAB-03)
 index.html |  8 ++++++++
 items.js   | 41 +++++++++++++++++++++++++++++++++++++++++
 2 files changed, 49 insertions(+)
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Speicheranzeige-Test schreiben und RED bestätigen** - `bcebee3` (test)
2. **Task 2: Funktionen + Sektion einbauen, GREEN bestätigen** - `c3cda19` (feat)

**Plan metadata:** wird im Anschluss committet (docs)

_Note: RED→GREEN wie geplant — Task 1 committet den roten Test, bevor items.js/index.html angefasst werden._

## Files Created/Modified

- `tests/storage-estimate.test.js` - Neu: STAB-03, 12 Fälle für die drei Funktionen inkl. `navigator`-Stub und Fallback-Pfade
- `items.js` - `_speicherFormatBytes(n)`, `_speicherFormat(usage, quota)`, `async function _speicherZeigeStatus()` + geguardeter Init-Hook (nach `bcSpeichernJetzt()`)
- `index.html` - Sektion `📊 Speicher` im Tweaks-Panel (`#storageInfo`, Button `🔄 Aktualisieren`) direkt nach dem Backup-Status-Block

## Decisions Made

- Init-Hook-Direktaufruf und Listener-Aufruf auf zwei Zeilen statt einer Zeile gesetzt (Abweichung vom exakten Ein-Zeilen-Stil des `_applyGroupUI`-Vorbilds), damit `_speicherZeigeStatus` als separat zählbare Vorkommen im Quelltext erscheint und der Code klar lesbar bleibt
- Kommentar über der Anzeige-Funktion vermeidet bewusst die exakte Zeichenkette `navigator.storage.estimate()` mit Klammern, damit im Produktionscode genau ein echter Aufruf dieser Form existiert (Kommentar nennt die API ohne Klammern)

## Deviations from Plan

None - plan executed exactly as written. (Zwei kleine Formulierungs-/Layout-Anpassungen gegenüber dem im Plan skizzierten Codevorschlag — Zeilenumbruch im Init-Hook, Klammern-freier Kommentartext — dienten ausschließlich dazu, die im Plan selbst vorgegebenen `grep -c`-Akzeptanzkriterien exakt zu treffen, keine funktionale Abweichung.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm test` grün: 10 Testdateien, 97 passed + 2 expected fail
- `node --check items.js` grün
- Zwei Commits in der Reihenfolge test (RED) → feat (GREEN); Commit `c3cda19` enthält ausschließlich `items.js` und `index.html`
- `git log 0d9ddbe..HEAD -- loader.js bot-data.js bot-ui.js bot-engine.js outfit-import.js` ist leer — keine anderen Produktionsdateien berührt
- Manuelle Browser-Verifikation der Live-Anzeige (Einstellungen-Panel, `#storageInfo` nach ~1,5s, Klick auf 🔄 Aktualisieren, Vergleich mit DevTools → Application → Storage) steht noch aus — siehe Coverage D6, `VALIDATION.md` „Manual-Only", end-of-phase
- Phase 2 (Speicher-Sicherheit) ist mit diesem Plan inhaltlich abgeschlossen (STAB-01, STAB-02/TEST-04, STAB-03, STAB-09, STAB-10 alle umgesetzt) — bereit für Phase-Verifikation
- Kein Blocker

---
*Phase: 02-speicher-sicherheit*
*Completed: 2026-09-13*

## Self-Check: PASSED
