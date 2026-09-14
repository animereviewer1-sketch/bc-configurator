---
phase: 03-bridge-haertung
verified: 2026-09-14T00:00:00Z
status: human_needed
score: 6/8 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/phases/03-bridge-haertung/03-01-PLAN.md", ".planning/phases/03-bridge-haertung/03-01-SUMMARY.md", ".planning/phases/03-bridge-haertung/03-02-PLAN.md", ".planning/phases/03-bridge-haertung/03-02-SUMMARY.md", ".planning/phases/03-bridge-haertung/03-03-PLAN.md", ".planning/phases/03-bridge-haertung/03-03-SUMMARY.md", ".planning/phases/03-bridge-haertung/03-RESEARCH.md", ".planning/phases/03-bridge-haertung/03-REVIEW.md", ".planning/phases/03-bridge-haertung/03-VALIDATION.md", "bot-engine.js", "bot-ui.js", "index.html", "items.js", "loader.js", "tests/bot-engine-escaping.test.js", "tests/bridge-protocol.test.js", "tests/exec-log.test.js", "tests/helpers/loadScript.js", "tests/injected-code-origin.test.js", "tests/load-script.test.js", "tests/loader-origin.test.js"]
covered_digest: "v1:sha256:cbd132ee758fbd3f15ceba32f7895107baadf26de66ac56ebc16929ab162d861"
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "Loader-Seite (loader.js) prüft `event.origin` (`ALLOWED_ORIGIN`) UND die gepinnte `event.source` (`window.__BCK_popupRef`) und verwirft fremde Absender tatsächlich zur Laufzeit"
    test: "loader.js in einer Sandbox laden (JSDOM/vm), zwei unterschiedliche `ev.source`-Stubs simulieren: erste Nachricht pinnt `__BCK_popupRef`; zweite Nachricht mit anderer, nicht-PING-`source` an den `message`-Listener dispatchen"
    expected: "Die zweite Nachricht wird mit `BCK.warn('postMessage von nicht gepinnter Quelle blockiert:', ...)` verworfen; `window.__BCK_popupRef` bleibt auf der ersten Quelle; eine dritte Nachricht mit `type:'PING'` von der zweiten Quelle darf dagegen neu pinnen"
    why_human: "`tests/loader-origin.test.js` (4 Fälle) liest `loader.js` nur als Text und prüft Zeilenreihenfolge/String-Vorkommen per Regex — keiner der Tests lädt loader.js in eine Sandbox und dispatcht eine simulierte Nachricht; eine Logikumkehr (z. B. `!==` zu `===`) würde von keinem der vier Tests erkannt (siehe 03-REVIEW.md WR-05). Eine Loader-Sandbox ist laut Orchestrator-Entscheidung 4 bewusst auf Phase 5 verschoben"
human_verification:
  - test: "Live-Smoke-Test aller Bridge-Flows: Bookmarklet neu ausführen, Tool neu laden, `⚡ Laden` (Cache), Bot starten (EXEC/BOT_LOG), Screenshot einer Outfit-Version aufnehmen (SCREENSHOT_DATA), Raum-Scan (PLAYER_DATA)"
    expected: "Alle vier Flows liefern sichtbar Daten im Tool; in beiden Konsolen (Spiel-Tab und Tool) erscheint keine Meldung „von fremder Quelle/Origin ignoriert“, „nicht gepinnter Quelle blockiert“ oder `SecurityError`"
    why_human: "Erfordert echten Browser, laufendes Bondage-Club-Spiel und das Bookmarklet — explizit als Erfolgskriterium 5 der Phase mit „human — list as human verification item“ vorgegeben"
  - test: "Sichtbarer Disconnect + Reconnect (STAB-07) im echten Browser: BC-Tab neu laden → `#connStatus` wird nach ≤20s rot („Verbindung verloren“); Bookmarklet erneut ausführen → automatischer Reconnect; danach `🔄 Verbinden` klicken"
    expected: "Statusanzeige wechselt sichtbar auf „Verbindung verloren“ (rot) und danach auf „Verbunden“ (grün); nach manuellem Reconnect kurz „Nicht verbunden“, dann wieder „Verbunden“"
    why_human: "Reale `window.opener`-Lifecycle-Ereignisse (Tab-Reload, Bookmarklet-Neustart) sind nur im echten Browser auslösbar; die Sandbox-Tests beweisen nur die Zustandslogik (`_heartbeatCheck`, `manualReconnect`), nicht das sichtbare Verhalten im echten Fenster"
  - test: "EXEC-Log sichtbar im echten Tool (STAB-08): ⚙️ → `📜 EXEC-Log` nach Bot-Start; `🔄 Aktualisieren`; Tool-Reload"
    expected: "Ein Eintrag `HH:MM:SS · <desc> (<len> Zeichen)` erscheint; Liste bleibt nach Tool-Reload erhalten (IndexedDB)"
    why_human: "DOM-Rendering und IndexedDB-Persistenz über einen echten Seiten-Reload sind nur im Browser prüfbar, nicht in der vm-Sandbox"
  - test: "Loader-seitige Absender-Doppelprüfung mit simulierten Nachrichten (siehe behavior_unverified_items oben)"
    expected: "Fremde Quelle wird verworfen, gepinnte Quelle akzeptiert, PING pinnt neu"
    why_human: "Kein Loader-Sandbox-Testnetz vorhanden (Phase 5); aktuell nur statischer Text-Audit — Code wurde manuell gegen die Testfälle gelesen und ist logisch korrekt, aber unbewiesen durch einen automatisierten Verhaltenstest"
---

# Phase 3: Bridge-Härtung Verification Report

**Phase Goal:** Die Bridge ist die einzige, nachvollziehbare Vertrauensgrenze — beide Seiten sprechen nur mit dem bekannten Gegen-Origin, Verbindungsverlust ist sichtbar, und jeder EXEC ist protokolliert.
**Verified:** 2026-09-14
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | STAB-04: Kein `postMessage(..., '*')` mehr außer den 2 dokumentierten Bootstrap-PINGs; `bcSend` weist jeden Nicht-PING-Send vor dem Handshake zentral ab | ✓ VERIFIED | `grep -oE "window\.opener\.postMessage\(.*, '\*'\)" items.js` → genau 2 Zeilen, beide `type: 'PING'` (Zeilen 5877, 6868); `grep -Fc "_bcOrigin \|\| '*'" items.js` = 1; Commit `90e5f71` fügt `if (!_bcOrigin && msg.type !== 'PING') { ...; return false; }` **vor** `window.opener.postMessage(...)` ein (behoben nach Review WR-01); Test „vor dem Handshake weist bcSend alles außer PING zentral ab“ in `tests/bridge-protocol.test.js` grün |
| 2 | STAB-06 (Tool-Seite): `_bridgeSenderOk(ev)` prüft `ev.source === window.opener` UND (nach TOFU-Lernen) `ev.origin === _bcOrigin`; beide Empfangspfade (Haupt-Handler, `debugOsOutfit`) nutzen denselben Helfer; mit simulierten Nachrichten getestet | ✓ VERIFIED | `grep -oF "_bridgeSenderOk(ev)" items.js` = 3 (Definition + 2 Aufrufstellen); `tests/bridge-protocol.test.js` describe „Absender-Doppelprüfung“ (6 Fälle, u. a. Fremd-Origin nach Handshake, Fremd-Source trotz korrektem Origin, Debug-Listener) — alle grün |
| 3 | STAB-06 (Loader-Seite): `loader.js` prüft `ev.origin !== ALLOWED_ORIGIN` und pinnt zusätzlich `ev.source` gegen `window.__BCK_popupRef`; `ALLOWED_ORIGIN` aus einer einzigen Quelle (`POPUP_URL`) abgeleitet | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code korrekt und manuell verifiziert (`loader.js:32,840,846-847`); `tests/loader-origin.test.js` (4 Fälle) prüft dies aber ausschließlich statisch per Text-Regex, nie mit einer simulierten `dispatch`-Nachricht (03-REVIEW.md WR-05) — siehe `behavior_unverified_items` |
| 4 | STAB-07: Verbindungsverlust nach 15s Stille wird sichtbar (`#connStatus` → „Verbindung verloren“/`off`), `manualReconnect()` bietet Reconnect und lernt nach Origin-Wechsel neu | ✓ VERIFIED | `items.js:5888` `function _heartbeatCheck()`, `items.js:5900` `setInterval(_heartbeatCheck, 5000)`, `items.js:5990` `_bcOrigin = null` in `manualReconnect()`; `tests/bridge-protocol.test.js` describe „Verbindungsverlust und Reconnect“ (5 Fälle) grün; DOM-Wiring `#connStatus`/`#reconnectBtn` in `index.html:2365,2369` bestätigt |
| 5 | STAB-05: Alle 36 injizierten `postMessage`-Stellen (17 items.js, 18 bot-engine.js, 1 bot-ui.js) senden an den im Tool-Fenster berechneten `TOOL_ORIGIN` statt an `'*'` | ✓ VERIFIED | Statische Zählung bestätigt: `+ TOOL_ORIGIN +` in items.js = 17, `,_TOOL_ORIGIN)` in bot-engine.js = 18, `JSON.stringify(TOOL_ORIGIN)` = 1, `+ TOOL_ORIGIN +` in bot-ui.js = 1; 0 Wildcards in bot-engine.js/bot-ui.js/loader.js; `location.origin` genau 1× über items.js+bot-engine.js+bot-ui.js; `tests/injected-code-origin.test.js` (11 Fälle, behavioral + statisch) grün |
| 6 | STAB-08: Jeder tatsächlich gesendete EXEC erzeugt genau einen Log-Eintrag `{ts, desc, len}`, persistiert unter `BC_ExecLog_v1`, Ringpuffer 200, sichtbar im Tweaks-Panel `📜 EXEC-Log` | ✓ VERIFIED | `items.js:5929` `function _execLogAppend(msg)`, Hook `items.js:6015` `if (msg.type === 'EXEC') _execLogAppend(msg);` **vor** `postMessage`; `index.html:2466-2471` Panel-Sektion (`#execLogInfo`, `onclick="_renderExecLog()"`), nur Einfügungen (`git diff --numstat 44c0ada HEAD -- index.html` = `9 0`); `tests/exec-log.test.js` (11 Fälle inkl. Rotations-Invarianz gegen `LSCG_DB`/`PROFILE_SCREENSHOTS`) grün |
| 7 | TEST-07: Bridge-Protokoll (Nachrichtentypen, Origin-Prüfung, Handler-Dispatch) ist mit simulierten Nachrichten getestet | ✓ VERIFIED | Tool-Seite vollständig behavioral getestet über die neue Sandbox-Listener-Registry (`tests/helpers/loadScript.js` `dispatch`/`dispatchMessage`) — `tests/bridge-protocol.test.js` (23 Fälle), `tests/injected-code-origin.test.js` (11 Fälle); scope bewusst auf die Tool-Seite begrenzt (Orchestrator-Entscheidung 4), Loader-Seite bleibt bei Truth 3 offen |
| 8 | Erfolgskriterium 5: Live-Smoke-Test aller Bridge-Flows im echten Spiel unverändert (Cache, EXEC, Screenshot, Raum-Scan) | ? UNCERTAIN (human) | Kann nicht programmatisch geprüft werden — erfordert echten Browser + laufendes BC-Spiel + Bookmarklet; explizit als Human-Verification-Item vorgegeben |

**Score:** 6/8 truths verified (1 present-behavior-unverified: Loader-Absenderprüfung nur statisch getestet; 1 zusätzlich strukturell human-only: Live-Smoke-Test)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `items.js` `_bridgeSenderOk(ev)` | Gemeinsame Origin+Source-Prüfung, TOFU-Lernen | ✓ VERIFIED | 3 Vorkommen (Definition + 2 Aufrufstellen), wired in Haupt-Handler (Zeile 6058) und `debugOsOutfit` (Zeile 8069) |
| `items.js` `_heartbeatCheck()` / `manualReconnect()` | Sichtbarer Verbindungsverlust, Reconnect | ✓ VERIFIED | Benannt, per `setInterval` verdrahtet; `_bcOrigin = null` vor PING in `manualReconnect` |
| `items.js` `TOOL_ORIGIN` | Einzige Tool-Origin-Konstante | ✓ VERIFIED | `const TOOL_ORIGIN = window.location.origin;`, 1× in items.js, konsumiert von bot-engine.js/bot-ui.js |
| `bot-engine.js` `_TOOL_ORIGIN`-Kopfzeile | Generierter Code sendet an Tool-Origin | ✓ VERIFIED | `JSON.stringify(TOOL_ORIGIN)` 1×, 18× `,_TOOL_ORIGIN)`, `startsWith('*')` (Emote-Erkennung) unverändert |
| `loader.js` `ALLOWED_ORIGIN` / Source-Pinning | Origin aus einer Quelle, Quelle gepinnt | ✓ VERIFIED (statisch) / ⚠️ nicht behavioral getestet | `new URL(POPUP_URL).origin`, Guard zwischen `const src = ev.source;` und Pin-Zuweisung; siehe Truth 3 |
| `items.js` EXEC-Log-Block (`EXEC_LOG_KEY`, `_execLogAppend`, `_saveExecLog`, `_loadExecLog`, `_renderExecLog`) | Ringpuffer + Persistenz + Anzeige | ✓ VERIFIED | Alle Funktionen vorhanden, Hook vor `postMessage`, Merge-Load statt Replace |
| `index.html` Sektion `📜 EXEC-Log` | `#execLogInfo`, Aktualisieren-Button | ✓ VERIFIED | Vorhanden, nur Einfügungen gegenüber Baseline |
| `tests/bridge-protocol.test.js`, `tests/injected-code-origin.test.js`, `tests/loader-origin.test.js`, `tests/exec-log.test.js` | Behavioral + statische Absicherung | ✓ VERIFIED (bis auf Loader-Sandbox-Lücke) | 14 Testdateien, 149 passed + 2 expected fail, `npm test` grün |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `items.js bcSend(msg, silent)` | `_execLogAppend(msg)` | Hook-Zeile vor `postMessage` | ✓ WIRED | `awk`-Gate bestätigt Reihenfolge; Test „ein EXEC erzeugt genau einen Eintrag“ grün |
| `items.js` Haupt-Handler + `debugOsOutfit` | `_bridgeSenderOk(ev)` | Gemeinsamer Helfer | ✓ WIRED | 3 Vorkommen, beide Empfangspfade rufen denselben Helfer |
| `bot-engine.js _buildBotCode` | `items.js const TOOL_ORIGIN` | Globales `const`, Ladereihenfolge in index.html | ✓ WIRED | `JSON.stringify(TOOL_ORIGIN)` löst zur Generierungszeit im Tool-Fenster auf; Test bestätigt konkreten Wert |
| `loader.js message-Listener` | `window.__BCK_popupRef` | Pin nach Origin-Check, PING-Ausnahme | ✓ WIRED (Text-Ebene) / ⚠️ nicht durch simulierten Dispatch bewiesen | Siehe Truth 3 |
| `index.html #execLogInfo` / `onclick="_renderExecLog()"` | `items.js _renderExecLog` | Globale Funktionsdeklaration | ✓ WIRED | Test „Append aktualisiert die Anzeige automatisch“ grün |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Volle Test-Suite grün | `npm test` | `Test Files 14 passed`, `Tests 149 passed \| 2 expected fail` | ✓ PASS |
| Syntax aller Bridge-Dateien | `node --check items.js loader.js bot-engine.js bot-ui.js` | Exit 0 (je Datei) | ✓ PASS |
| Statische Wildcard-Gates | `grep`-Zählungen items.js=2 (nur PING), bot-engine.js=0, bot-ui.js=0, loader.js=0 | wie erwartet | ✓ PASS |
| `index.html` nur Einfügungen | `git diff --numstat 44c0ada HEAD -- index.html` | `9 0` | ✓ PASS |
| WR-01-Fix vorhanden | `git show 90e5f71` | Guard `if (!_bcOrigin && msg.type !== 'PING')` vor `postMessage` eingefügt, 3 Tests ergänzt | ✓ PASS |
| Live-Browser-Flows | — | nicht ausführbar in dieser Umgebung | ? SKIP → human_verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STAB-04 | 03-01 | Tool→Spiel nutzt gelernten Origin statt `'*'` | ✓ SATISFIED | Truth 1 |
| STAB-05 | 03-02 | Injizierter Code nutzt statischen Tool-Origin | ✓ SATISFIED | Truth 5 |
| STAB-06 | 03-01, 03-02 | Beide Seiten prüfen Origin+Source gegen eine Konstante | ✓ SATISFIED (Tool) / ⚠️ NEEDS HUMAN (Loader, Testabdeckung) | Truth 2, Truth 3 |
| STAB-07 | 03-01 | Verbindungsverlust sichtbar + Reconnect | ✓ SATISFIED (Code) / ? NEEDS HUMAN (visuell) | Truth 4, human_verification #2 |
| STAB-08 | 03-03 | Jeder EXEC protokolliert und einsehbar | ✓ SATISFIED | Truth 6 |
| TEST-07 | 03-01, 03-02 | Bridge-Protokoll mit simulierten Nachrichten getestet | ✓ SATISFIED (Tool-Seite, bewusst gescoped) | Truth 7 |

Keine verwaisten Requirements: REQUIREMENTS.md ordnet Phase 3 genau STAB-04 bis STAB-08 und TEST-07 zu; alle sechs sind in den `requirements:`-Feldern der drei PLAN.md abgedeckt.

### Anti-Patterns Found

Keine Debt-Marker (`TBD`/`FIXME`/`XXX`) in `items.js`, `loader.js`, `bot-engine.js`, `bot-ui.js`, `index.html`. Keine Stub-Implementierungen gefunden (`grep` auf Platzhalter-Muster leer).

### Review-Befunde aus 03-REVIEW.md (nicht blockierend)

| ID | Befund | Disposition dieser Verifikation |
|----|--------|-----------------------------------|
| WR-01 | `bcSend` hatte keine strukturelle Sperre für EXEC vor dem Handshake | **Behoben** — Commit `90e5f71` fügt den zentralen Guard `if (!_bcOrigin && msg.type !== 'PING')` ein, mit 3 zusätzlichen Tests bestätigt (siehe Truth 1) |
| WR-02 | Trust-on-first-use ohne Domain-Allowlist | Akzeptierte Design-Entscheidung (mehrere BC-Mirror-Domains, keine gemeinsame Allowlist möglich) — kein Gap für diese Phase |
| WR-03 | `TOOL_ORIGIN` an 18 Stellen (items.js 17, bot-ui.js 1) roh konkateniert statt `JSON.stringify` wie in bot-engine.js | Bestätigt weiterhin vorhanden (`items.js:2548` etc.). Bewertung: **Advisory**, kein Blocker — `TOOL_ORIGIN` wird ausschließlich aus `window.location.origin` berechnet (kann laut Origin-Serialisierung nie `"`/`'`/`\` enthalten); STAB-05 ist dennoch erfüllt (kein Wildcard-Ziel mehr). Empfehlung: Konsolidieren auf `JSON.stringify(TOOL_ORIGIN)` für Konsistenz, nicht sicherheitskritisch |
| WR-04 | Loader-Source-Pinning lässt sich von jedem Sender mit demselben Origin per PING neu pinnen (zweites Tool-Fenster kapert `__BCK_popupRef`) | Bestätigt weiterhin vorhanden (`loader.js:846`). Bewertung: **Advisory**, kein Blocker gegen den Erfolgskriterien-Wortlaut — betrifft ausschließlich denselben (Tool-)Origin, nicht „fremde Origins“ im Sinne von STAB-06; ist eine bewusste, kommentierte Design-Entscheidung („PING darf immer neu pinnen“) zur Vermeidung von Aussperrung nach Tool-Reload |
| WR-05 | `loader-origin.test.js` prüft nur statisch (Text/Regex), nie zur Laufzeit | Bestätigt — siehe Truth 3 / `behavior_unverified_items`. Als Human-Verification-Item aufgenommen, nicht als Gap, da laut Plan explizit auf Phase 5 verschoben (Orchestrator-Entscheidung 4) |
| IN-01 | Debounced Auto-Save-Pfad (`_debouncedSaveExecLog`) wird in Tests nie durch einen echten Timer ausgelöst | Bestätigt, informativ — kein Einfluss auf STAB-08 (alle Tests rufen `_saveExecLog()` direkt und beweisen den Schreibvorgang selbst) |
| IN-02 | `_heartbeatCheck` dokumentiert den bewussten Nicht-Reset von `_bcOrigin` nicht direkt am Code | Bestätigt, informativ — reine Kommentarklarheit, kein Verhaltensproblem |

### Human Verification Required

Siehe `human_verification` im Frontmatter (4 Punkte): Live-Smoke-Test aller Bridge-Flows (Erfolgskriterium 5), sichtbarer Disconnect/Reconnect im echten Browser (STAB-07), EXEC-Log sichtbar und persistent nach Reload (STAB-08), sowie die loader-seitige Absenderprüfung mit einer simulierten Nachricht (STAB-06/TEST-07-Restlücke).

### Gaps Summary

Keine Gaps im Sinne von „fehlend/gestubbt/nicht verdrahtet“. Alle sechs Requirements (STAB-04 bis STAB-08, TEST-07) sind im Code umgesetzt, durch 14 grüne Testdateien (149 passed + 2 expected fail) automatisiert abgesichert, und der einzige vom Code-Review gefundene echte Blocker (WR-01: fehlende zentrale EXEC-vor-Handshake-Sperre) wurde nach dem Review in Commit `90e5f71` behoben und mit zusätzlichen Tests belegt. Die verbleibenden Review-Befunde (WR-02 bis WR-05, IN-01/IN-02) sind bewusste Design-Trade-offs bzw. Konsistenz-/Testabdeckungs-Hinweise ohne Auswirkung auf die Erfüllung der Erfolgskriterien 1–4. Der Status ist `human_needed`, weil (a) Erfolgskriterium 5 explizit einen Live-Smoke-Test im echten Browser verlangt, (b) STAB-07 und STAB-08 zusätzlich eine sichtbare Bestätigung im echten Tool-Fenster benötigen, und (c) die loader-seitige Absender-Doppelprüfung bisher nur statisch, nicht behavioral mit simulierten Nachrichten getestet ist (WR-05, bewusst auf Phase 5 verschoben).

---

_Verified: 2026-09-14_
_Verifier: Claude (gsd-verifier)_
