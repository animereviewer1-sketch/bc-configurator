---
phase: 03-bridge-haertung
plan: 02
subsystem: bridge
tags: [postmessage, origin, injected-code, loader, source-pinning, vitest, red-green]

# Dependency graph
requires:
  - phase: 03-bridge-haertung/03-01
    provides: "vm-Sandbox-Listener-Registry, SANDBOX_ORIGIN/location-Stub in tests/helpers/loadScript.js; _bridgeSenderOk als Muster für die Tool-Seite"
provides:
  - "TOOL_ORIGIN = window.location.origin als einzige Tool-seitige Origin-Konstante (items.js), konsumiert von bot-engine.js (_TOOL_ORIGIN im generierten Code) und bot-ui.js"
  - "Alle 36 injizierten postMessage-Stellen (17 items.js, 18 bot-engine.js, 1 bot-ui.js) senden an den Tool-Origin statt an '*'; nur die 2 dokumentierten Bootstrap-PINGs bleiben Wildcard"
  - "loader.js: ALLOWED_ORIGIN aus POPUP_URL abgeleitet (eine Origin-Quelle statt zweitem Literal); Source-Pinning-Guard blockiert Nachrichten von nicht gepinnter Quelle (außer PING)"
  - "tests/injected-code-origin.test.js, tests/loader-origin.test.js: 15 neue Testfälle (behavioral + statischer Audit)"
affects: [03-bridge-haertung/03-03]

actuals:
  tokens: 7510
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Origin-Literal-Einbettung: Tool-Fenster berechnet window.location.origin zur Generierungszeit und bettet es als String-Literal in injizierten Spiel-Code ein, statt es im Spiel-Tab (cross-origin) zur Laufzeit zu berechnen"
    - "Origin-Ableitung statt Zweitdefinition: ALLOWED_ORIGIN = new URL(POPUP_URL).origin ersetzt ein unabhängiges zweites Literal"
    - "Source-Pinning mit PING-Ausnahme: gepinnte Referenz wird gegen jede eingehende Nachricht geprüft, außer PING (erlaubt legitimes Re-Pinning nach Tool-Reload/Reconnect)"

key-files:
  created:
    - tests/injected-code-origin.test.js
    - tests/loader-origin.test.js
  modified:
    - tests/bot-engine-escaping.test.js
    - loader.js
    - items.js
    - bot-engine.js
    - bot-ui.js

key-decisions:
  - "TOOL_ORIGIN einmalig in items.js definiert (nicht in bot-engine.js/bot-ui.js dupliziert) — Ladereihenfolge in index.html garantiert items.js vor bot-engine.js/bot-ui.js, daher genügt ein globales const"
  - "bot-engine.js bettet TOOL_ORIGIN als _TOOL_ORIGIN-Kopfzeile im generierten Code ein (JSON.stringify zur sicheren String-Einbettung), statt bei jeder der 18 Stellen erneut zu interpolieren"
  - "loader.js Source-Pinning erlaubt PING immer neu zu pinnen — sonst könnte ein legitimer Tool-Reload/manueller Reconnect nach dem ersten Handshake dauerhaft ausgesperrt werden"

requirements-completed: [STAB-05, STAB-06]

coverage:
  - id: D1
    description: "Alle 36 injizierten postMessage-Stellen (17 items.js, 18 bot-engine.js, 1 bot-ui.js) senden an den Tool-Origin statt an '*'; behavioral bewiesen an debugOsOutfit, bcKeys, _buildBotCode"
    requirement: "STAB-05"
    verification:
      - kind: unit
        ref: "tests/injected-code-origin.test.js#Injizierter Code sendet an den Tool-Origin statt an \"*\" (STAB-05) (4 Fälle)"
        status: pass
      - kind: unit
        ref: "tests/injected-code-origin.test.js#Statischer Quell-Audit (STAB-05 / STAB-06 Tool-Seite) (7 Fälle)"
        status: pass
      - kind: integration
        ref: "npm test — 13 Testdateien grün, 137 passed + 2 expected fail"
        status: pass
    human_judgment: false
  - id: D2
    description: "Genau eine Tool-seitige Origin-Konstante (TOOL_ORIGIN in items.js); loader.js leitet ALLOWED_ORIGIN aus POPUP_URL ab statt zweitem Literal; GitHub-Pages-Origin-String steht nur noch in loader.js"
    requirement: "STAB-06"
    verification:
      - kind: unit
        ref: "tests/loader-origin.test.js#loader.js Origin-Ableitung und Source-Pinning (STAB-06) (4 Fälle)"
        status: pass
      - kind: unit
        ref: "tests/injected-code-origin.test.js#Tool-Origin ist genau einmal definiert; kein GitHub-Pages-Origin-String in Tool-Dateien"
        status: pass
    human_judgment: false
  - id: D3
    description: "loader.js pinnt die Nachrichtenquelle (ev.source) gegen window.__BCK_popupRef; jede Nachricht von einer anderen Quelle wird verworfen, außer PING (legitimes Re-Pinning)"
    requirement: "STAB-06"
    verification:
      - kind: unit
        ref: "tests/loader-origin.test.js#Listener pinnt die Quelle: Guard steht zwischen ev.source-Lesen und Pin-Zuweisung"
        status: pass
    human_judgment: true
    rationale: "Der Live-Effekt des Source-Pinning-Guards im echten Spiel-Tab (z.B. nach Bookmarklet-Neustart) ist nur durch den Nutzer im Browser prüfbar; automatisiert ist nur die statische Reihenfolge/Struktur des Guards verifiziert. Manual-Only-Verifikation wird end-of-phase in Plan 03-03 gesammelt."

duration: 20min
completed: 2026-09-13
status: complete
---

# Phase 3 Plan 2: Injizierter Code sendet an den Tool-Origin, Loader pinnt die Quelle Summary

**Alle 36 injizierten `postMessage`-Stellen (items.js, bot-engine.js, bot-ui.js) senden an eine einzige `TOOL_ORIGIN = window.location.origin`-Konstante statt an `"*"`; `loader.js` leitet `ALLOWED_ORIGIN` aus `POPUP_URL` ab und pinnt zusätzlich die Nachrichtenquelle gegen `window.__BCK_popupRef`.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-13T20:04:00Z (ca.)
- **Completed:** 2026-09-13T20:24:54Z
- **Tasks:** 3
- **Files modified:** 7 (2 neue Tests, 1 erweiterter Test, 4 Produktionsdateien)

## Accomplishments

- `TOOL_ORIGIN = window.location.origin` einmalig in `items.js` definiert — einzige Tool-seitige Origin-Definition; `bot-engine.js` und `bot-ui.js` konsumieren das Global (keine Zweitdefinition, `location.origin` kommt über alle drei Dateien genau 1× vor).
- 17 injizierte Stellen in `items.js` konkatenieren `TOOL_ORIGIN` statt `"*"`; die zwei Bootstrap-PINGs (`type: 'PING'` über `window.opener.postMessage`) bleiben als dokumentierte Henne-Ei-Ausnahme bei `'*'`.
- `bot-engine.js`: generierter Bot-Code deklariert `const _TOOL_ORIGIN=${JSON.stringify(TOOL_ORIGIN)};` einmal am Kopf des IIFE; alle 18 Sendestellen enden mit `,_TOOL_ORIGIN)`; die Emote-Erkennung `startsWith('*')` (Zeile 2938) blieb unverändert.
- `bot-ui.js`: `bcKeys()` konkateniert `TOOL_ORIGIN` statt `'*'`.
- `loader.js`: `const ALLOWED_ORIGIN = new URL(POPUP_URL).origin;` ersetzt das unabhängige zweite Literal (GitHub-Pages-Origin-String steht danach nur noch 1× in der Datei, in `POPUP_URL`); ein Source-Pinning-Guard zwischen `const src = ev.source;` und der Pin-Zuweisung verwirft Nachrichten von einer nicht gepinnten Quelle, außer `PING` (erlaubt Re-Pinning nach Tool-Reload/manuellem Reconnect). Diff: +4/−2 Zeilen.
- Zwei neue Testdateien (`tests/injected-code-origin.test.js` mit 11 Fällen, `tests/loader-origin.test.js` mit 4 Fällen) plus ein erweiterter Sandbox-Eintrag in `tests/bot-engine-escaping.test.js` (`TOOL_ORIGIN: 'https://tool.test'`) — RED vor der Implementierung, GREEN danach.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED-Tests für injizierten Code und Loader schreiben, Escaping-Sandbox erweitern** - `e7467e2` (test)
2. **Task 2: loader.js — ALLOWED_ORIGIN aus POPUP_URL ableiten, Quelle pinnen** - `da578fb` (fix)
3. **Task 3: TOOL_ORIGIN in items.js definieren, 36 Stellen umstellen — GREEN** - `44e1bf4` (fix)

**Plan metadata:** siehe `final_commit` unten (docs)

## RED-Ausgabe (Task 1, vor der Implementierung)

```
npx vitest run tests/injected-code-origin.test.js tests/loader-origin.test.js
 Test Files  2 failed (2)
      Tests  12 failed | 3 passed (15)
```

Rote Fälle wie erwartet: `TOOL_ORIGIN is not defined` (Sandbox ohne Global), `debugOsOutfit`/`bcKeys`-EXEC-Code enthielt noch `"*"`, Wildcard-Zeilenzählung 17/18/1 statt 2/0/0/0, Origin-String in `loader.js` 2× statt 1×, `ALLOWED_ORIGIN`-Ableitung fehlte, Source-Pinning-Guard-Indizes `-1`. `tests/bot-engine-escaping.test.js` blieb mit dem neuen `TOOL_ORIGIN`-Sandbox-Eintrag grün (14 passed).

## GREEN-Ausgabe (Task 2 — loader.js)

```
npx vitest run tests/loader-origin.test.js
 Test Files  1 passed (1)
      Tests  4 passed (4)
node --check loader.js → Exit 0
```
`tests/injected-code-origin.test.js` blieb erwartungsgemäß rot (Tool-Seite noch nicht geändert).

## GREEN-Ausgabe (Task 3 — Tool-Seite)

```
npx vitest run tests/injected-code-origin.test.js tests/bot-engine-escaping.test.js tests/loader-origin.test.js
 Test Files  3 passed (3)
      Tests  29 passed (29)

node --check items.js bot-engine.js bot-ui.js → Exit 0 je Datei

npm test
 Test Files  13 passed (13)
      Tests  137 passed | 2 expected fail (139)
```

## `git show --stat` der drei Commits

```
commit e7467e2
test(03-02): add failing injected-code and loader origin tests (STAB-05, STAB-06)
 tests/bot-engine-escaping.test.js  |   3 +-
 tests/injected-code-origin.test.js | 128 +++++++++++++++++++++++++++++++++++++
 tests/loader-origin.test.js        |  56 ++++++++++++++++
 3 files changed, 186 insertions(+), 1 deletion(-)

commit da578fb
fix(03-02): derive ALLOWED_ORIGIN from POPUP_URL and pin message source in loader (STAB-06)
 loader.js | 6 ++++--
 1 file changed, 4 insertions(+), 2 deletions(-)

commit 44e1bf4
fix(03-02): embed tool origin literal in all 36 injected postMessage sites (STAB-05, STAB-06)
 bot-engine.js | 38 ++++++++++++++++++++------------------
 bot-ui.js     |  2 +-
 items.js      | 39 ++++++++++++++++++++++-----------------
 3 files changed, 43 insertions(+), 36 deletions(-)
```

## Statische Grep-Zählungen (Gates aus PLAN.md)

| Check | Ergebnis |
|---|---|
| Wildcard-Zeilen items.js / bot-engine.js / bot-ui.js / loader.js | 2 / 0 / 0 / 0 |
| Origin-String `animereviewer1-sketch.github.io` in loader.js | 1 (nur `POPUP_URL`) |
| Origin-String in items.js/bot-engine.js/bot-ui.js | 0 |
| `location.origin` über items.js+bot-engine.js+bot-ui.js | 1 |
| `const TOOL_ORIGIN = window.location.origin;` in items.js | 1 |
| Konkatenationen `+ TOOL_ORIGIN +` in items.js | 17 |
| `,_TOOL_ORIGIN)` in bot-engine.js | 18 |
| `JSON.stringify(TOOL_ORIGIN)` in bot-engine.js | 1 |
| Konkatenationen `+ TOOL_ORIGIN +` in bot-ui.js | 1 |
| `startsWith('*')` in bot-engine.js (unverändert) | 1 |
| `ALLOWED_ORIGIN`-Vorkommen in loader.js (unverändert) | 34 |
| loader.js-Diff | +4/−2 (Bound ≤8/≤2 eingehalten) |
| `git log 012c6d5..HEAD -- index.html` | leer (unberührt) |
| `git status --short` nach Task 3 | nur `?? .planning/milestone.lock` |

## Files Created/Modified

- `tests/injected-code-origin.test.js` (neu) - 11 Fälle: behavioral (TOOL_ORIGIN, debugOsOutfit, bcKeys, _buildBotCode) + statischer Audit über alle vier Tool-/Loader-Dateien
- `tests/loader-origin.test.js` (neu) - 4 Fälle: Origin-Ableitung, Zweitdefinition-Ausschluss, Guard-Reihenfolge, Wildcard-Audit
- `tests/bot-engine-escaping.test.js` - Sandbox um `TOOL_ORIGIN: 'https://tool.test'` erweitert (Global, das `_buildBotCode` jetzt braucht)
- `loader.js` - `ALLOWED_ORIGIN` aus `POPUP_URL` abgeleitet; Source-Pinning-Guard im `message`-Listener
- `items.js` - `const TOOL_ORIGIN = window.location.origin;` + 17 Stellen konkatenieren es statt `"*"`
- `bot-engine.js` - `_TOOL_ORIGIN`-Kopfzeile im generierten Code (`JSON.stringify(TOOL_ORIGIN)`) + 18 Stellen senden dorthin
- `bot-ui.js` - 1 Stelle in `bcKeys()` konkateniert `TOOL_ORIGIN`

## Decisions Made

Siehe `key-decisions` im Frontmatter — einmalige `TOOL_ORIGIN`-Definition in items.js, `_TOOL_ORIGIN`-Kopfzeile statt Wiederholung in bot-engine.js, PING-Ausnahme im Source-Pinning-Guard.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Keine — die statische Enumeration aus 03-RESEARCH.md/03-02-PLAN.md hatte sich seit `012c6d5` durch Plan 03-01 um wenige Zeilen verschoben (z.B. items.js-Stellen ab 7704 statt 7686); jede Ersetzung wurde per frischem Grep vor dem Edit neu lokalisiert, wie in den Task-Vorgaben gefordert. Kein Rule-N-Deviation.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Known Stubs

Keine.

## Betriebs-Hinweis

Nach dem Deploy dieser Änderungen muss der Nutzer:
1. Das Bookmarklet einmal neu ausführen (lädt `loader.js` neu, `__BCK_LISTENER_FN__`-Austausch ersetzt den alten Listener automatisch).
2. Das Tool-Fenster neu laden (damit `bot-engine.js`/`bot-ui.js` den neuen `TOOL_ORIGIN`-Wert verwenden).
3. Laufende Bots einmal neu deployen (der generierte Bot-Code wird beim Start neu erzeugt und trägt erst dann `_TOOL_ORIGIN`).

Alter Loader + neues Tool und neuer Loader + altes Tool bleiben kompatibel (gleicher `ALLOWED_ORIGIN`-Wert, gleiche Nachrichtentypen) — kein Big-Bang-Deploy nötig.

## Next Phase Readiness

- STAB-05 und STAB-06 (beide Bridge-Hälften: Tool-Seite aus Plan 03-01, Loader-Seite aus diesem Plan) sind vollständig automatisiert abgedeckt.
- Manual-Only-Verifikation (Bookmarklet neu ausführen, Tool neu laden, Bot starten → Bot-Log im Tool sichtbar) bleibt offen und wird laut PLAN.md `<verification>` in Plan 03-03 end-of-phase gesammelt.
- Keine Blocker für Plan 03-03.

---
*Phase: 03-bridge-haertung*
*Completed: 2026-09-13*

## Self-Check: PASSED

Alle referenzierten Dateien gefunden (`tests/injected-code-origin.test.js`, `tests/loader-origin.test.js`, `tests/bot-engine-escaping.test.js`, `loader.js`, `items.js`, `bot-engine.js`, `bot-ui.js`, dieses SUMMARY.md); alle drei Task-Commits (`e7467e2`, `da578fb`, `44e1bf4`) in `git log --oneline --all` gefunden; `npm test` 13 Dateien grün, 137 passed + 2 expected fail.

plan_head_before: ccaac25
