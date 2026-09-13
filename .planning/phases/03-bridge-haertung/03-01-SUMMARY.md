---
phase: 03-bridge-haertung
plan: 01
subsystem: bridge
tags: [postmessage, origin, source, vm-sandbox, heartbeat, reconnect, trust-on-first-use, vitest]

# Dependency graph
requires:
  - phase: 01-testfundament
    provides: "vm-Sandbox-Loader (tests/helpers/loadScript.js), loadScript/evalIn/makeElementStub-Muster"
provides:
  - "Sandbox-Listener-Registry (`_listeners`), `dispatch`/`dispatchMessage`, `SANDBOX_ORIGIN`, `location`-Stub in tests/helpers/loadScript.js — Grundlage für jeden weiteren Bridge-Test"
  - "`_bridgeSenderOk(ev)` als gemeinsame Origin+Source-Prüfung beider Empfangspfade (Haupt-Handler, debugOsOutfit)"
  - "Trust-on-first-use: `_bcOrigin` wird nur einmal gelernt (`null`-Check), danach erzwungen"
  - "`_heartbeatCheck()` als benannte Funktion, testbar ohne Timer"
  - "`manualReconnect()` setzt `_bcOrigin = null` vor dem PING — Reconnect nach Mirror-Wechsel funktioniert"
  - "tests/bridge-protocol.test.js: 21 Fälle für Absender-Doppelprüfung, Dispatch, bcSend-Origin, Heartbeat/Reconnect"
affects: [03-bridge-haertung/03-02, 03-bridge-haertung/03-03]

actuals:
  tokens: 5214
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "vm-Sandbox-Listener-Registry: addEventListener sammelt statt zu verwerfen; dispatch/dispatchMessage rufen Handler mit synthetischem Event auf"
    - "Trust-on-first-use Origin-Pinning mit explizitem Reset-Pfad (manualReconnect)"
    - "Ein gemeinsamer Absender-Helfer (_bridgeSenderOk) statt duplizierter Prüf-Logik an mehreren Empfangsstellen"

key-files:
  created:
    - tests/bridge-protocol.test.js
  modified:
    - tests/helpers/loadScript.js
    - tests/load-script.test.js
    - items.js

key-decisions:
  - "Trust-on-first-use (Origin-Lernen genau einmal, danach erzwungen) statt harter Allowlist — BC läuft auf mehreren Domains, Orchestrator-Entscheidung 1 aus 03-RESEARCH.md"
  - "Kein automatischer _bcOrigin-Reset im Heartbeat-Pfad — nur manualReconnect() darf neu vertrauen, sonst wäre die Origin-Erzwingung durch einen navigierten Opener umgehbar (STAB-07-Prohibition)"
  - "Bootstrap-PINGs (startPingRetry, Start-IIFE) bleiben bewusst bei '*' — dokumentierte Ausnahme, per statischem Audit auf genau 2 Stellen fixiert, statt versucht sie origin-zu-pinnen (Henne-Ei-Problem vor dem ersten Handshake)"
  - "Sandbox-Erweiterung (Listener-Registry + location-Stub) als eigener, isolierter Commit (Task 1) vor den Origin-Tests — verhindert falsches Grün durch eine kaputte Testinfrastruktur"

requirements-completed: [TEST-07, STAB-04, STAB-07]

coverage:
  - id: D1
    description: "vm-Sandbox sammelt registrierte message-Handler und kann sie mit simulierten Events aufrufen (dispatch/dispatchMessage), ohne bestehende Tests zu brechen"
    requirement: "TEST-07"
    verification:
      - kind: unit
        ref: "tests/load-script.test.js#addEventListener sammelt Handler pro Typ; dispatch ruft sie mit dem Event auf"
        status: pass
      - kind: unit
        ref: "tests/load-script.test.js#removeEventListener entfernt genau den übergebenen Handler"
        status: pass
      - kind: unit
        ref: "tests/load-script.test.js#items.js registriert seinen message-Handler in der Registry"
        status: pass
      - kind: integration
        ref: "npm test — 10 Dateien grün, 101 passed + 2 expected fail (vor Task 3)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tool-Seite prüft beide Absender-Merkmale (Origin UND Source) mit Trust-on-first-use; fremder Origin/fremde Source nach dem Handshake wird verworfen, ohne _lastMsgTs zu berühren"
    requirement: "STAB-04"
    verification:
      - kind: unit
        ref: "tests/bridge-protocol.test.js#Absender-Doppelprüfung: Origin + Source, Trust-on-first-use (STAB-06 Tool-Seite) (6 Fälle)"
        status: pass
      - kind: unit
        ref: "tests/bridge-protocol.test.js#statischer Audit: genau zwei direkte Wildcard-Sends, beide Bootstrap-PING; genau ein Fallback in bcSend"
        status: pass
    human_judgment: false
  - id: D3
    description: "Verbindungsverlust ist nach 15s Stille sichtbar (Verbindung verloren), Reconnect per manualReconnect() lernt einen neuen Origin nach Mirror-Wechsel"
    requirement: "STAB-07"
    verification:
      - kind: unit
        ref: "tests/bridge-protocol.test.js#Verbindungsverlust und Reconnect (STAB-07) (5 Fälle)"
        status: pass
    human_judgment: true
    rationale: "Sichtbarer Disconnect/Reconnect im echten Browser (Live-Smoke-Test) ist laut 03-RESEARCH.md nur durch den Nutzer prüfbar — automatisiert nur die Logik/DOM-Effekte in der Sandbox verifiziert; Manual-Only-Verifikation wird end-of-phase in Plan 03-03 gesammelt."

duration: 25min
completed: 2026-09-13
status: complete
---

# Phase 3 Plan 1: Bridge-Härtung (Tool-Seite) Summary

**Trust-on-first-use Origin+Source-Prüfung (`_bridgeSenderOk`), benannter Heartbeat-Check und Origin-Reset bei Reconnect in items.js — abgesichert durch eine neue vm-Sandbox-Listener-Registry und 21 neue Bridge-Protokoll-Tests (RED→GREEN in getrennten Commits).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-13T20:05:00Z (ca.)
- **Completed:** 2026-09-13T20:13:03+02:00
- **Tasks:** 3
- **Files modified:** 4 (2 Test-Helfer/Tests neu/erweitert, 1 neue Testdatei, 1 Produktionsdatei)

## Accomplishments

- `tests/helpers/loadScript.js` sammelt `addEventListener`-Registrierungen pro Typ in `sandbox._listeners` und bietet `dispatch(sandbox, type, event)` / `dispatchMessage(sandbox, data, {origin, source})`, dazu einen `location`-Stub (`SANDBOX_ORIGIN = 'https://tool.test'`, per `extraGlobals` überschreibbar) — Grundlage für Plan 03-02 (`TOOL_ORIGIN`) und 03-03.
- `tests/bridge-protocol.test.js` (neu, 21 Fälle in vier `describe`-Blöcken): Absender-Doppelprüfung inkl. Debug-Listener, Handler-Dispatch nach Typ, `bcSend`-Sendepfad + statischer PING-Audit, Verbindungsverlust/Reconnect.
- `items.js`: `_bridgeSenderOk(ev)` als gemeinsame Prüfung für Haupt-Handler und `debugOsOutfit`-Debug-Listener; Origin wird nur noch einmal gelernt (`if (!_bcOrigin && ...)`); `_heartbeatCheck()` als benannte, testbare Funktion; `manualReconnect()` setzt `_bcOrigin = null` vor dem PING.
- Die zwei verbleibenden Bootstrap-PINGs (`startPingRetry`, Start-IIFE) sind als dokumentierte STAB-04-Ausnahme kommentiert und per statischem Audit (Regex über den Quelltext) auf genau 2 Stellen fixiert.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sandbox-Listener-Registry + `location`-Stub** - `3f68c9d` (test)
2. **Task 2: Bridge-Protokoll-Test schreiben, RED bestätigt** - `a61c3a9` (test)
3. **Task 3: `_bridgeSenderOk`, `_heartbeatCheck`, `manualReconnect`-Reset — GREEN** - `74e739d` (fix)

**Plan metadata:** siehe `final_commit` unten (docs)

## RED-Ausgabe (Task 2, vor der Implementierung)

```
npx vitest run tests/bridge-protocol.test.js
...
 Test Files  1 failed (1)
      Tests  7 failed | 14 passed (21)
```

7 rote Fälle wie erwartet: "verwirft Nachrichten von fremdem Origin nach dem Handshake" (Fremd-Origin wurde noch verarbeitet), "_bridgeSenderOk ist die gemeinsame Prüfung" + Debug-Listener-Fall (`_bridgeSenderOk is not a function`), beide `_heartbeatCheck`-Fälle (`is not a function`), "manualReconnect setzt _bcOrigin zurück" und "Origin-Wechsel ohne Reconnect bleibt gesperrt" (`_bcOrigin` wurde nicht zurückgesetzt bzw. bei jeder Nachricht umgelernt). Bereits grün (Regressionsschutz): Source-Check, Dispatch-nach-Typ, `bcSend`-Origin-Pfad, statischer PING-Audit.

## GREEN-Ausgabe (Task 3, nach der Implementierung)

```
node --check items.js            → Exit 0
npx vitest run tests/bridge-protocol.test.js
 Test Files  1 passed (1)
      Tests  21 passed (21)

npm test
 Test Files  11 passed (11)
      Tests  122 passed | 2 expected fail (124)
```

## `git show --stat` der drei Commits

```
commit 3f68c9d
test(03-01): sandbox listener registry, dispatch helper and location stub for bridge tests (TEST-07)
 tests/helpers/loadScript.js | 50 +++++++++++++++++++++++++++++++++++++++++++--
 tests/load-script.test.js   | 39 +++++++++++++++++++++++++++++++++--
 2 files changed, 85 insertions(+), 4 deletions(-)

commit a61c3a9
test(03-01): add failing bridge protocol tests – origin+source check, dispatch, heartbeat, reconnect (TEST-07, STAB-04, STAB-07)
 tests/bridge-protocol.test.js | 267 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 267 insertions(+)

commit 74e739d
fix(03-01): enforce learned game origin + source on tool side, named heartbeat check, reconnect relearns origin (STAB-04, STAB-06, STAB-07)
 items.js | 34 ++++++++++++++++++++++++++--------
 1 file changed, 26 insertions(+), 8 deletions(-)
```

## Statische Grep-Zählungen (Gates aus PLAN.md)

| Check | Ergebnis |
|---|---|
| `grep -Fc "function _bridgeSenderOk(ev)" items.js` | 1 |
| `grep -oF "_bridgeSenderOk(ev)" items.js \| wc -l` | 3 (Definition + Haupt-Handler + Debug-Listener) |
| `grep -c "_bcOrigin = ev.origin" items.js` | 1 |
| `grep -Fc "function _heartbeatCheck()" items.js` | 1 |
| `grep -Fc "setInterval(_heartbeatCheck, 5000)" items.js` | 1 |
| `grep -oE "window\.opener\.postMessage\(.*, '\*'\)" items.js \| wc -l` | 2 |
| `grep -Fc "_bcOrigin \|\| '*'" items.js` | 1 |
| `grep -o "STAB-04-Ausnahme" items.js \| wc -l` | 2 |
| Origin-Reset im Heartbeat-Body (`awk`-Guard) | keiner gefunden (korrekt) |
| `git show --name-only --format= HEAD` (GREEN-Commit) | `items.js` (genau ein Pfad) |
| `git status --short` nach Task 3 | nur `?? .planning/milestone.lock` |

## Files Created/Modified

- `tests/helpers/loadScript.js` - Listener-Registry (`_listeners`), `dispatch`/`dispatchMessage`, `SANDBOX_ORIGIN`, `location`-Stub
- `tests/load-script.test.js` - 4 neue Fälle für Registry, remove, items.js-Handler-Registrierung, `location`-Override
- `tests/bridge-protocol.test.js` (neu) - 21 Fälle: Absender-Doppelprüfung, Dispatch nach Typ, bcSend-Origin, Heartbeat/Reconnect
- `items.js` - `_bridgeSenderOk(ev)`, einmaliges Origin-Lernen, `_heartbeatCheck()`, `_bcOrigin = null` in `manualReconnect()`, Bootstrap-Ausnahme dokumentiert

## Decisions Made

Siehe `key-decisions` im Frontmatter — Trust-on-first-use statt Allowlist, kein Origin-Reset im Heartbeat-Pfad, Bootstrap-PINGs bleiben dokumentierte Ausnahme, Sandbox-Erweiterung als isolierter erster Commit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Beim ersten RED-Lauf erfüllte die Assertion `expect(opener.postMessage).toHaveBeenCalledWith({ app: APP, type: 'PING' }, '*')` nicht die geforderte Acceptance-Grep-Zählung (`"type: 'PING' }, '*']"` >= 2, weil `toHaveBeenCalledWith` kein Array-Literal im Quelltext erzeugt. Behoben durch Umstellung auf `expect(opener.postMessage.mock.calls.at(-1)).toEqual([{ app: APP, type: 'PING' }, '*'])` — inhaltlich identische Prüfung, jetzt mit passendem Literal. Kein Rule-N-Deviation (reine Testformulierung, keine Produktionslogik betroffen).

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Known Stubs

Keine.

## Next Phase Readiness

- Plan 03-02 kann den `location`-Stub aus Task 1 direkt verwenden (`window.location.origin` für `TOOL_ORIGIN`), ohne die Sandbox erneut anzufassen.
- Plan 03-03 kann `dispatchMessage`/`evalIn`-Muster aus `tests/bridge-protocol.test.js` für die EXEC-Log-Tests wiederverwenden.
- Manual-Only-Verifikation (sichtbarer Disconnect/Reconnect im echten Browser) bleibt offen und wird laut PLAN.md `<verification>` in Plan 03-03 gesammelt (end-of-phase).
- Keine Blocker für Plan 03-02.

---
*Phase: 03-bridge-haertung*
*Completed: 2026-09-13*

## Self-Check: PASSED

Alle referenzierten Dateien gefunden (`tests/helpers/loadScript.js`, `tests/load-script.test.js`, `tests/bridge-protocol.test.js`, `items.js`, dieses SUMMARY.md); alle drei Task-Commits (`3f68c9d`, `a61c3a9`, `74e739d`) in `git log --oneline --all` gefunden.
