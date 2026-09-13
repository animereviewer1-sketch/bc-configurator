---
phase: 03-bridge-haertung
plan: 03
subsystem: bridge
tags: [exec-log, bridge, tweaks-panel, indexeddb, ring-buffer, red-green]

# Dependency graph
requires:
  - phase: 03-bridge-haertung/03-02
    provides: "TOOL_ORIGIN als einzige Tool-seitige Origin-Konstante; alle 36 injizierten postMessage-Stellen origin-gepinnt; loader.js leitet ALLOWED_ORIGIN ab und pinnt die Quelle"
provides:
  - "RAM-Ringpuffer `_execLog` (Cap 200) mit Einträgen `{ ts, desc, len }`, befüllt ausschließlich in `bcSend` (einziger Sendepfad aller ≥40 EXEC-Aufrufstellen, keine davon geändert)"
  - "Gedrosselte Persistenz unter IDB-Schlüssel `BC_ExecLog_v1` (`_debounce`-Muster, 1200 ms); `_loadExecLog()` mergt gespeicherte Einträge vor die im RAM liegenden, kappt auf 200 — nie überschreibend"
  - "Tweaks-Panel-Sektion `📜 EXEC-Log` (`#execLogInfo`, Button `🔄 Aktualisieren`) — index.html nur um 9 Zeilen erweitert, 0 Löschungen"
  - "Invarianz-Beweis: Rotation berührt nach 250 EXECs + Save weder `LSCG_DB` noch `PROFILE_SCREENSHOTS`"
affects: []

# Actuals (#2632)
actuals:
  tokens: 3297
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Einziger Sendepfad als Log-Hakenpunkt: bcSend() ist eine function-Deklaration (kein const), daher globaler Anker für alle ≥40 EXEC-Aufrufstellen — ein Log-Append direkt in bcSend erfasst jeden EXEC ohne eine Aufrufstelle anzufassen"
    - "Betriebs-Telemetrie vs. Scan-Daten: Kapazitätsbegrenzte Rotation ist für ein neues, additives IDB-Log zulässig und beabsichtigt (Diagnose/Audit) — im Unterschied zum Kernwert 'Scan-Daten gehen nie verloren' (LSCG_DB, PROFILE_SCREENSHOTS, Bot-Definitionen)"
    - "Merge-Load statt Replace-Load: `_loadExecLog()` stellt gespeicherte Einträge VOR die bereits im RAM liegenden (`stored.concat(_execLog)`), damit ein EXEC, der zwischen Skriptstart und abgeschlossenem IDB-Load auftritt, nicht verloren geht"

key-files:
  created:
    - tests/exec-log.test.js
  modified:
    - items.js
    - index.html

key-decisions:
  - "EXEC-Log-Block direkt vor `_bridgeSenderOk` platziert (nicht am Dateianfang) — hält den gesamten Bridge-/EXEC-Abschnitt lokal zusammen, wie vom Plan vorgegeben"
  - "`_execLogDesc` bevorzugt ein explizites `msg.desc`-Label, fällt sonst auf die ersten 60 (whitespace-kollabierten) Zeichen des Codes zurück — keine der ≥40 Aufrufstellen musste um ein `desc`-Feld ergänzt werden (optional, nicht Pflicht)"
  - "Keine Korrelations-IDs, kein EXEC_OK/EXEC_ERR-Matching (RESEARCH Anti-Pattern) — reines Sende-Log mit Zeitstempel und Kurzbeschreibung, exakt wie STAB-08 fordert"

requirements-completed: [STAB-08]

coverage:
  - id: D1
    description: "Jeder über bcSend({type:'EXEC',...}) gesendete EXEC erzeugt genau einen Log-Eintrag {ts, desc, len}; Label-Vorrang vs. 60-Zeichen-Kürzung mit Whitespace-Kollaps; Nicht-EXEC und Sends ohne Opener erzeugen keinen Eintrag"
    requirement: "STAB-08"
    verification:
      - kind: unit
        ref: "tests/exec-log.test.js#EXEC-Log: Append in bcSend (STAB-08) (5 Fälle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ringpuffer EXEC_LOG_MAX=200 verwirft bei Überlauf nur die ältesten Log-Einträge; Rotation berührt nach 250 EXECs + Save weder LSCG_DB noch PROFILE_SCREENSHOTS (Kernwert-Invarianz)"
    requirement: "STAB-08"
    verification:
      - kind: unit
        ref: "tests/exec-log.test.js#EXEC-Log: Append in bcSend (STAB-08) > EXEC_LOG_MAX ist 200; Überlauf verwirft die ältesten Log-Einträge"
        status: pass
      - kind: unit
        ref: "tests/exec-log.test.js#EXEC-Log: Rotation berührt keine Scan-Daten (Kernwert) > nach 250 EXECs und Save ist LSCG_DB in IDB byte-identisch"
        status: pass
    human_judgment: false
  - id: D3
    description: "_saveExecLog persistiert den Puffer unter BC_ExecLog_v1 (gedrosselt via _debounce); eine neue Sandbox lädt und mergt ihn; ein EXEC vor abgeschlossenem IDB-Load bleibt erhalten und steht nach den gespeicherten Einträgen (kein Clobbering)"
    requirement: "STAB-08"
    verification:
      - kind: unit
        ref: "tests/exec-log.test.js#EXEC-Log: Persistenz unter BC_ExecLog_v1 (2 Fälle)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tweaks-Panel-Sektion 📜 EXEC-Log (#execLogInfo) zeigt Einträge im Format HH:MM:SS · desc (len Zeichen), neueste zuerst, gekappt auf EXEC_LOG_SHOWN=30 mit Hinweis auf ältere; leer → 'Noch kein EXEC gesendet'; Anzeige aktualisiert sich bei jedem Append automatisch"
    requirement: "STAB-08"
    verification:
      - kind: unit
        ref: "tests/exec-log.test.js#EXEC-Log: Anzeige im Tweaks-Panel (4 Fälle)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Statische Gates: index.html gegenüber 012c6d5 nur Einfügungen (+9/−0); keine der ≥40 EXEC-Aufrufstellen geändert (git show HEAD -- items.js enthält keine type:'EXEC'-Diffzeile); loader.js/bot-engine.js/bot-ui.js außerhalb von 03-02 unberührt; volle Suite grün (14 Dateien, 148 passed + 2 expected fail)"
    requirement: "STAB-08"
    verification:
      - kind: integration
        ref: "npm test — 14 Testdateien, 148 passed + 2 expected fail"
        status: pass
      - kind: other
        ref: "git diff --numstat 012c6d5 HEAD -- index.html; git show HEAD -- items.js | grep -cE \"^[-+].*type: *'EXEC'\" = 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-of-Phase Human-Checks (Erfolgskriterium 5, STAB-07, STAB-08 — nicht blockierend): Live-Smoke-Test aller Bridge-Flows im echten Spiel, sichtbarer Disconnect/Reconnect, EXEC-Log im echten Tool sichtbar und nach Reload persistent"
    verification: []
    human_judgment: true
    rationale: "Erfordert echten Browser + Bookmarklet + laufendes BC-Spiel; nur der Nutzer kann das prüfen (RESEARCH 'Missing dependencies with no fallback'). Bookmarklet muss neu ausgeführt, Tool neu geladen und Bots neu deployt werden, bevor die Checks aussagekräftig sind (siehe Betriebs-Hinweis unten)."

duration: 18min
completed: 2026-09-13
status: complete
plan_head_before: 31acaa2
---

# Phase 3 Plan 3: EXEC-Protokoll (STAB-08) Summary

**RAM-Ringpuffer `_execLog` (Cap 200) wird ausschließlich in `bcSend` befüllt — dem einzigen Sendepfad aller ≥40 EXEC-Aufrufstellen —, gedrosselt unter `BC_ExecLog_v1` persistiert und im Tweaks-Panel als `📜 EXEC-Log` neueste-zuerst angezeigt; Rotation beweist per Invarianz-Test, dass Scan-Daten (LSCG_DB, PROFILE_SCREENSHOTS) nie berührt werden.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-13T22:28:00Z (approx.)
- **Completed:** 2026-09-13T22:46:00Z (approx.)
- **Tasks:** 2
- **Files modified:** 3 (1 neu, 2 geändert)

## Accomplishments

- `tests/exec-log.test.js` (STAB-08): 11 Testfälle in 4 describe-Blöcken (Append-Vertrag, Rotations-Invarianz gegen Scan-Daten, Persistenz/Merge über zwei Sandboxen, Anzeige/Auto-Render) — **RED-CONFIRMED** vor der Implementierung (alle 11 rot: `_execLog is not defined`, `ctx._saveExecLog/_renderExecLog/_execLogFormat is not a function`)
- `items.js`: EXEC-Log-Block direkt vor `_bridgeSenderOk` (`EXEC_LOG_KEY`, `EXEC_LOG_MAX=200`, `EXEC_LOG_SHOWN=30`, `EXEC_LOG_DESC_LEN=60`, `_execLog`, `_execLogDesc`, `_execLogAppend`, `_saveExecLog`/`_debouncedSaveExecLog`, `_loadExecLog`, `_execLogFormat`, `_renderExecLog`, geguardeter Init-Hook) + eine Hook-Zeile in `bcSend` — **GREEN** (11 passed)
- `index.html`: Sektion `📜 EXEC-Log` (`#execLogInfo`, Button `🔄 Aktualisieren`) direkt nach `📊 Speicher` eingefügt — ausschließlich Einfügungen (+9/−0 gegenüber `012c6d5`)
- Volle Suite grün: 14 Testdateien, 148 passed + 2 expected fail (vorher 13 Dateien, 137 passed + 2 expected fail)
- Keine der ≥40 `bcSend({type:'EXEC',...})`-Aufrufstellen wurde angefasst (Aufrufstellen-Zählung vorher/nachher identisch, siehe unten)

## RED-Ausgabe (Task 1, vor der Implementierung)

```
npx vitest run tests/exec-log.test.js
 Test Files  1 failed (1)
      Tests  11 failed (11)
```
Fehlerbilder wie im Plan vorausgesagt: `ReferenceError: _execLog is not defined` (evalIn), `TypeError: ctx._saveExecLog is not a function`, `TypeError: ctx._renderExecLog is not a function`, `TypeError: ctx._execLogFormat is not a function`, Längen-/Textassertions rot. Plan-Verify-Marker `RED-CONFIRMED` ausgegeben.

## GREEN-Ausgabe (Task 2, nach der Implementierung)

```
npx vitest run tests/exec-log.test.js
 Test Files  1 passed (1)
      Tests  11 passed (11)

node --check items.js → Exit 0

npm test
 Test Files  14 passed (14)
      Tests  148 passed | 2 expected fail (150)
```
Plan-Verify-Marker `EXECLOG-OK` (zweiter automatisierter Check) bestätigt.

## `git show --stat` beider Commits

```
commit 10bc194
test(03-03): add failing EXEC log tests – ring buffer, persistence, scan-data invariance, panel view (STAB-08)
 tests/exec-log.test.js | 162 +++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 162 insertions(+)

commit 7eedc48
feat(03-03): log every EXEC in bcSend to a capped ring buffer (BC_ExecLog_v1) with Tweaks-panel view (STAB-08)
 index.html |  9 +++++++++
 items.js   | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 71 insertions(+)
```

## `git diff --numstat 012c6d5 HEAD -- index.html`

```
9	0	index.html
```
9 Insertions, 0 Deletions — reine Einfügung (Threat-Mitigation T-3-14).

## Aufrufstellen-Zählung `bcSend({type:'EXEC',...})` (vorher/nachher identisch)

| Datei | Treffer |
|---|---|
| items.js | 41 (`bcSend({type:'EXEC'` / `bcSend({ type: 'EXEC'` kombiniert, Baseline aus RESEARCH: ≥35) |
| bot-engine.js | 5 |

Kein Diff an einer dieser Aufrufstellen: `git show HEAD -- items.js \| grep -cE "^[-+].*type: *'EXEC'"` = `0`. `git log --format=%h 012c6d5..HEAD -- loader.js` zeigt nur den Commit aus 03-02 (`da578fb`); `git diff 012c6d5 HEAD --stat -- bot-engine.js bot-ui.js` zeigt ausschließlich die 03-02-Änderungen (38/2 Zeilen).

## Task Commits

Each task was committed atomically:

1. **Task 1: EXEC-Log-Test schreiben und RED bestätigen** - `10bc194` (test)
2. **Task 2: EXEC-Log-Block + Hook in bcSend, Sektion im Tweaks-Panel, GREEN** - `7eedc48` (feat)

**Plan metadata:** siehe `final_commit` unten (docs)

_Note: RED→GREEN wie geplant — Task 1 committet den roten Test, bevor items.js/index.html angefasst werden._

## Files Created/Modified

- `tests/exec-log.test.js` - Neu: STAB-08, 11 Fälle (Append-Vertrag, Rotations-Invarianz, Persistenz/Merge, Anzeige)
- `items.js` - EXEC-Log-Block vor `_bridgeSenderOk` + eine Hook-Zeile in `bcSend`
- `index.html` - Sektion `📜 EXEC-Log` im Tweaks-Panel (`#execLogInfo`, Button `🔄 Aktualisieren`) nach `📊 Speicher`

## Decisions Made

Siehe `key-decisions` im Frontmatter — Platzierung des Blocks vor `_bridgeSenderOk`, Label-Vorrang in `_execLogDesc` ohne neue Parameter an den Aufrufstellen, bewusster Verzicht auf Korrelations-IDs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Known Stubs

Keine.

## Betriebs-Hinweis

Nach dem Deploy dieser Änderungen muss der Nutzer:
1. Das Bookmarklet einmal neu ausführen.
2. Das Tool-Fenster neu laden (damit das EXEC-Log im ⚙️-Panel sichtbar wird).
3. Laufende Bots einmal neu deployen (damit ein EXEC im Log erscheint, sobald der Bot feuert).

Der neue IDB-Schlüssel `BC_ExecLog_v1` ist additiv — ein Tool-Update ohne diesen Schritt bricht nichts, das Log bleibt bis zum nächsten EXEC leer (`Noch kein EXEC gesendet`).

## End-of-Phase Human-Checks (Erfolgskriterium 5, STAB-07, STAB-08 — nicht blockierend)

Voraussetzung: Deploy auf GitHub Pages, dann im BC-Tab das Bookmarklet neu ausführen, Tool-Fenster neu laden, laufende Bots neu deployen.

1. **Live-Smoke-Test aller Bridge-Flows (Kriterium 5):** `⚡ Laden` → Cache erscheint (`CACHE_DATA`); Bot starten → Bot-Log im Tool (`BOT_LOG`); Screenshot einer Outfit-Version aufnehmen → Bild erscheint (`SCREENSHOT_DATA`); Raum-Scan → Spielerliste aktualisiert (`PLAYER_DATA`). In beiden Konsolen keine Meldungen "von fremder Quelle/Origin ignoriert", "nicht gepinnter Quelle blockiert" oder `SecurityError`. **Status: ausstehend — löst den STATE.md-Blocker „[Phase 3]: Nach Origin-Pinning Live-Smoke-Test …" auf, sobald durchgeführt.**
2. **Sichtbarer Disconnect + Reconnect (STAB-07):** BC-Tab neu laden → nach ≤ 20 s zeigt `#connStatus` rot "Verbindung verloren"; Bookmarklet erneut ausführen → automatischer Reconnect ("Verbunden", grün); danach `🔄 Verbinden` klicken → kurz "Nicht verbunden", dann wieder "Verbunden". **Status: ausstehend.**
3. **EXEC-Log sichtbar (STAB-08):** ⚙️ → `📜 EXEC-Log` zeigt nach dem Bot-Start einen Eintrag mit Uhrzeit und Code-Präfix; `🔄 Aktualisieren` und Tool-Reload behalten die Einträge (IDB). **Status: ausstehend.**

Diese drei Checks sind laut Orchestrator-Entscheidung 6 nicht blockierend für den Abschluss dieses Plans — sie werden hier gesammelt für die End-of-Phase-Verifikation (`/gsd-verify-work`) und bleiben bis zur manuellen Durchführung offen.

## Next Phase Readiness

- STAB-08 vollständig automatisiert abgedeckt (Append, Rotation, Persistenz, Anzeige); volle Suite grün (14 Dateien, 148 passed + 2 expected fail)
- Phase 3 (Bridge-Härtung) ist mit diesem Plan inhaltlich abgeschlossen (STAB-04 bis STAB-08 sowie TEST-07 aus 03-01/03-02 umgesetzt) — bereit für Phase-Verifikation
- Drei End-of-Phase-Human-Checks stehen aus (siehe oben) — kein automatisierbarer Fallback, nur der Nutzer kann sie im echten Spiel/Browser durchführen
- Kein Blocker für die automatisierte Verifikation dieses Plans; der bestehende STATE.md-Blocker zum Live-Smoke-Test bleibt offen, bis Check 1 durchgeführt wurde

---
*Phase: 03-bridge-haertung*
*Completed: 2026-09-13*

## Self-Check: PASSED

Alle referenzierten Dateien gefunden (`tests/exec-log.test.js`, `items.js`, `index.html`, dieses SUMMARY.md); beide Task-Commits (`10bc194`, `7eedc48`) in `git log --oneline --all` gefunden; `npm test` 14 Dateien grün, 148 passed + 2 expected fail; `node --check items.js` Exit 0.
