---
phase: 05-gamecode-inventar
plan: 03
subsystem: game-inventory-bridge
tags: [game-scan, bridge-handler, snapshot, tweaks-panel, load-order, red-green]

# Dependency graph
requires:
  - phase: 05-gamecode-inventar
    provides: "05-01: persistence.js idbSnapshotPut/GetAll/Get/Keys (IDB v3, add-only Store `snapshots`); 05-02: loader.js buildGameInventory + Case GET_GAME_INVENTORY (GAME_INVENTORY_PROGRESS/GAME_INVENTORY_DATA)"
provides:
  - "game-scan.js: Ladereihenfolge-Guard, triggerGameScan() (reqId-Korrelation über Plain-Object _giPending), Handler GAME_INVENTORY_PROGRESS/GAME_INVENTORY_DATA über onBridgeMessage, _saveGameInventorySnapshot (add-only), _renderGameScanInfo, Init-Hook"
  - "Tweaks-Panel-Sektion 🔎 Spiel-Scan (#gameScanBtn, #gameScanInfo) zwischen Screenshot-Speicher und Item-Katalog"
  - "CORE_SCRIPTS = ['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']; expandLoadOrder mit Vor-/Nach-items-Regel"
affects: [06-scan-tab-analyse]

# Actuals (#2632)
actuals:
  tokens: 9393
  tasks: 2
  commits: 2
plan_head_before: d31ad76aa61df587c4e33fa89e23bc2e56fc1585

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Object statt Map für Pending-Korrelation: statische Sicherheits-Gates verbieten jede Lösch-Operation im Quelltext (0× Lösch-Aufruf) — eine verbrauchte reqId wird auf null gesetzt (_giPending[reqId] = null) statt aus einer Map entfernt zu werden; _giPendingHas prüft hasOwnProperty + Truthy"
    - "expandLoadOrder mit Vor-/Nach-items-Split: CORE_SCRIPTS trennt an der Position von 'items.js' — alles davor wird vor dem ersten items.js-Eintrag eingefügt, alles danach (aktuell nur game-scan.js) direkt danach, ohne die 45 bestehenden loadScript([...])-Aufrufstellen anzufassen"
    - "onBridgeMessage-Registrierung ohne items.js/bridge.js-Änderung (SPLIT-02-Muster, jetzt zweites lebendes Beispiel nach dem docs/LOAD-ORDER.md-Referenzabschnitt)"

key-files:
  created:
    - game-scan.js
    - tests/game-scan-bridge.test.js
  modified:
    - index.html
    - tests/helpers/loadScript.js
    - tests/persistence-module.test.js
    - docs/LOAD-ORDER.md

key-decisions:
  - "Pending-Map als Plain-Object statt echter Map (Planer-Vorgabe übernommen): das statische Verbotsgate zählt Lösch-Aufrufe im Quelltext (SCAN-08); eine Map.delete-Aufruf hätte das Gate ausgelöst, obwohl er nur RAM-State betrifft, keine IDB-Operation ist"
  - "Task-1-Testassertion korrigiert (Deviation, siehe unten): `typeof triggerGameScan === 'undefined'` nach Guard-Throw ist wegen Funktionsdeklarations-Hoisting in Node-vm technisch nicht erreichbar — ersetzt durch eine Prüfung, dass keine Bridge-Handler registriert wurden"

requirements-completed: [SCAN-01, SCAN-08]

coverage:
  - id: D1
    description: "SCAN-01 Tool-Hälfte: Klick auf 🔎 Spiel scannen → triggerGameScan() sendet GET_GAME_INVENTORY mit eindeutiger reqId über den handshake-geprüften bcSend-Pfad; ohne Handshake sichtbar abgewiesen (Statuszeile nennt Verbinden), nichts pending"
    requirement: "SCAN-01"
    verification:
      - kind: unit
        ref: "tests/game-scan-bridge.test.js#triggerGameScan (SCAN-01) (3 Fälle)"
        status: pass
      - kind: unit
        ref: "tests/game-scan-bridge.test.js#Ladereihenfolge-Guard (game-scan.js) (2 Fälle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "GAME_INVENTORY_PROGRESS aktualisiert die Statuszeile für die pendende reqId (Schritt x/y – Label); fremde/unbekannte reqIds werden ignoriert; fehlendes DOM-Element wirft nicht"
    requirement: "SCAN-01"
    verification:
      - kind: unit
        ref: "tests/game-scan-bridge.test.js#GAME_INVENTORY_PROGRESS (2 Fälle)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SCAN-08: GAME_INVENTORY_DATA für pendende reqId → add-only-Datensatz {id, ts, gameVersion, modCount, mods, sizeBytes, inventory} über idbSnapshotPut, Größenlog, Erfolgs-/Fehlerstatus sichtbar; zwei gleichzeitige Scans werden beide gespeichert; zweiter Scan lässt den ersten unverändert; Quota-Fehler sichtbar ('Speicher voll', 'NICHT gespeichert'); Init zeigt vorhandene Snapshot-Anzahl"
    requirement: "SCAN-08"
    verification:
      - kind: unit
        ref: "tests/game-scan-bridge.test.js#GAME_INVENTORY_DATA → Snapshot (SCAN-08) (8 Fälle)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ladeordnung: game-scan.js lädt als viertes Kern-Skript direkt nach items.js (index.html, nur Einfügungen + eine Kommentarzeile); CORE_SCRIPTS/expandLoadOrder und docs/LOAD-ORDER.md konsistent nachgezogen; alle 45 bestehenden loadScript([...])-Aufrufstellen unverändert lauffähig"
    requirement: "SCAN-01"
    verification:
      - kind: unit
        ref: "tests/game-scan-bridge.test.js#statisch: Ladeordnung, index.html, docs, game-scan.js (2 Fälle)"
        status: pass
      - kind: integration
        ref: "npm test — 23 Dateien grün, 321 passed + 2 expected fail"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live-Scan gegen die echte 28-Mod-BC-Session (Bookmarklet neu ausführen, Verbindung, Tab bleibt bedienbar, DevTools-Snapshot, zweiter Scan behält den ersten, Payload-Größe aus der Konsole) — End-of-Phase-Human-Check, nicht blockierend"
    human_judgment: true
    rationale: "Erfordert eine echte Browser-/BC-Session mit den 28 realen Mods; laut Plan-Text End-of-Phase gesammelt (Orchestrator-Entscheidung 6), nicht Bestandteil dieses Plans automatisierbar"

# Metrics
duration: 22min
completed: 2026-09-19
status: complete
---

# Phase 5 Plan 3: game-scan.js — Spiel-Scan-Trigger, Fortschritt, Snapshot-Speicherung Summary

**Neues `game-scan.js` als viertes Kern-Skript: Klick auf „🔎 Spiel scannen" löst `GET_GAME_INVENTORY` über den bestehenden Handshake-Pfad aus, `GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA` werden per `onBridgeMessage` ohne jede Änderung an items.js/bridge.js konsumiert, jeder Scan landet add-only als Snapshot-Datensatz in IndexedDB — 17/17 neue Tests grün, volle Suite 23 Dateien grün (321 passed + 2 expected fail).**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-18T23:55:00+02:00 (geschätzt aus Session-Kontext)
- **Completed:** 2026-09-19T00:16:23+02:00
- **Tasks:** 2
- **Files modified:** 6 (2 neu, 4 geändert)

## Accomplishments

- `tests/game-scan-bridge.test.js` (neu, 17 Fälle über sechs describe-Blöcke): beweist den vollständigen Tool-seitigen Scan-Vertrag gegen die bestehende Sandbox (`loadScript`/`dispatchMessage`) — Ladereihenfolge-Guard, Trigger mit reqId-Format `gi_<ts>_<n>` und Handshake-Abweisung, PROGRESS-Statuszeile mit reqId-Filter, DATA→Snapshot-Datensatzform mit Größenlog, zweiter Scan behält den ersten, gleichzeitige Scans, fremde/fehlende reqId, `err`-Pfad, Quota-Fehlerpfad, Init-Anzeige, sowie ein statisches Gate gegen index.html/docs/CORE_SCRIPTS/game-scan.js
- `game-scan.js` (neu, 134 Zeilen): Ladereihenfolge-Guard (Muster bot-ui.js), `triggerGameScan()`, Handler `GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA` via `onBridgeMessage`, `_saveGameInventorySnapshot` (add-only über `idbSnapshotPut`, Größenlog `console.info('[GameScan] Snapshot-Größe...')`), `_renderGameScanInfo`, Init-Hook — keine eigene Bridge-/IDB-/Lösch-Logik (statisch verifiziert)
- `index.html`: Write-Zeile `game-scan.js?_=` direkt nach `items.js` im ersten `_cbv`-Block, `LADEREIHENFOLGE`-Kommentar ergänzt, Tweaks-Sektion `🔎 Spiel-Scan` (Button `#gameScanBtn`, Statuszeile `#gameScanInfo`) zwischen `🖼️ Screenshot-Speicher` und `📦 Item-Katalog` eingefügt — sonst keine gelöschten Zeilen
- `tests/helpers/loadScript.js` + `tests/persistence-module.test.js`: `CORE_SCRIPTS` um `game-scan.js` als Kern-Nachläufer NACH `items.js` erweitert; `expandLoadOrder` splittet jetzt an der `items.js`-Position (Vorläufer davor, Nachläufer direkt danach) — alle 45 bestehenden `loadScript([...])`-Aufrufstellen unverändert lauffähig
- `docs/LOAD-ORDER.md`: neue Tabellenzeile (Position 7), Folgezeilen auf 8–16 renummeriert, Guard-Absatz um `game-scan.js`/`idbSnapshotPut` ergänzt, veraltete „keine try/catch-Isolation"-Aussage durch den korrekten `332fc2d`-Hinweis ersetzt, `game-scan.js` als lebendes `onBridgeMessage`-Beispiel neben `GAME_SCAN_DATA` ergänzt, „Neues Modul hinzufügen"/„Tests"-Abschnitte um die Vor-/Nach-items-Regel ergänzt

### RED-Ausgabe (Task 1, vor game-scan.js)

```
npx vitest run tests/game-scan-bridge.test.js
 Test Files  1 failed (1)
      Tests  17 failed (17)
```

Alle 17 Fälle rot wie erwartet: `ENOENT ... game-scan.js` (Sandbox lädt `['items.js', 'game-scan.js']`), zwei statische Fälle rot mangels Datei/Doku-Ergänzung.

### GREEN-Ausgabe (Task 2, nach game-scan.js + Ladeordnung + Doku)

```
node --check game-scan.js  → Exit 0

npx vitest run tests/game-scan-bridge.test.js tests/load-order-guard.test.js tests/persistence-module.test.js tests/load-script.test.js tests/bridge-registry.test.js tests/screenshot-export.test.js
 Test Files  6 passed (6)
      Tests  121 passed (121)

npm test (volle Suite)
 Test Files  23 passed (23)
      Tests  321 passed | 2 expected fail (323)
```

### Snapshot-Datensatzform (bestätigt, Test 8)

```
{ id: ts, ts, gameVersion, modCount, mods: [{name, version}], sizeBytes, inventory }
```

`Object.keys(rec).sort()` → `['gameVersion', 'id', 'inventory', 'modCount', 'mods', 'sizeBytes', 'ts']`; `rec.id === rec.ts`; `rec.sizeBytes === JSON.stringify(inventory).length`.

### Statische Gates (bestätigt)

`game-scan.js`: 0× `addEventListener('message'`, 0× `postMessage(`, 0× `indexedDB.open(`, 0× Lösch-Operation (`.delete(`/`.clear(`/`idbSnapshotDelete`), 0× `location.origin`, 0× `toLocaleString`, 0× Tool-Host-String, keine Zeile matcht den Wildcard-Regex. `git diff f3973f6 HEAD -- items.js bridge.js tests/loader-origin.test.js` → leer (unverändert). `index.html`-Diff gegen `f3973f6` hat außer der `LADEREIHENFOLGE`-Kommentarzeile keine gelöschten Zeilen.

## Task Commits

Each task was committed atomically (RED → GREEN):

1. **Task 1: Tool-seitige Scan-Tests schreiben und RED bestätigen** - `417ded8` (test)
2. **Task 2: game-scan.js + index.html-Einfügungen + CORE_SCRIPTS/expandLoadOrder + docs/LOAD-ORDER.md — GREEN** - `d2e8351` (feat)

**Plan metadata:** folgt in separatem Commit (docs)

_Note: RED→GREEN wie geplant — Task 1 committet die roten Tests, bevor game-scan.js angefasst wird._

## Files Created/Modified

- `game-scan.js` - Neu: Ladereihenfolge-Guard, `triggerGameScan`, Handler `GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA`, `_saveGameInventorySnapshot`, `_renderGameScanInfo`, Init-Hook
- `tests/game-scan-bridge.test.js` - Neu: 17 Testfälle über sechs describe-Blöcke, Op-Spy auf `IDBObjectStore.prototype.add`, statisches Gate gegen index.html/docs/CORE_SCRIPTS/game-scan.js
- `index.html` - Write-Zeile nach items.js, `LADEREIHENFOLGE`-Kommentar, Tweaks-Sektion `🔎 Spiel-Scan`
- `tests/helpers/loadScript.js` - `CORE_SCRIPTS` um `game-scan.js` erweitert, `expandLoadOrder` mit Vor-/Nach-items-Split
- `tests/persistence-module.test.js` - Zwei Erwartungen an das gewachsene `CORE_SCRIPTS`/`expandLoadOrder` angepasst
- `docs/LOAD-ORDER.md` - Tabellenzeile 7, Guard-Absatz, Isolations-Korrektur, lebendes Beispiel, Vor-/Nach-items-Regel

## Decisions Made

Siehe `key-decisions` im Frontmatter — Plain-Object statt Map für die Pending-Korrelation (statisches Lösch-Verbot), korrigierte Testassertion nach Hoisting-Befund.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kommentar in game-scan.js enthielt zufällig die verbotene Zeichenkette `.delete(`**
- **Found during:** Task 2, erster GREEN-Lauf (`statisch: Ladeordnung, index.html, docs, game-scan.js`)
- **Issue:** Der erklärende Kopfkommentar zum Plain-Object-Pending-Store zitierte wörtlich `.delete(`, um das statische Verbotsgate zu erläutern — dadurch zählte genau dieses Gate den eigenen Erklärtext als Verstoß (1 statt 0 Vorkommen).
- **Fix:** Kommentar umformuliert, ohne die literale Zeichenkette zu verwenden ("jede Lösch-Operation" statt `.delete(`).
- **Files modified:** `game-scan.js`
- **Verification:** `npx vitest run tests/game-scan-bridge.test.js` → 17/17 grün
- **Committed in:** `d2e8351` (Task 2)

**2. [Rule 1 - Bug] Testassertion `typeof triggerGameScan === 'undefined'` nach Guard-Throw ist durch Funktionsdeklarations-Hoisting in Node-vm technisch nicht erreichbar**
- **Found during:** Task 2, erster GREEN-Lauf (`Ladereihenfolge-Guard (game-scan.js)`)
- **Issue:** `function triggerGameScan() {...}` wird als Funktionsdeklaration VOR jeder Anweisung im Skript-Scope gehoisted — auch wenn der Guard synchron vorher wirft, existiert `sb.triggerGameScan` danach bereits als Funktion (empirisch mit einem isolierten `vm`-Testfall bestätigt: `throw ...; function foo(){}` lässt `sandbox.foo` trotzdem als Funktion zurück). Kein Fehler in `game-scan.js` — reines Node-`vm`-Plattformverhalten, dieselbe Fehlerklasse wie die vm-Intrinsics-Diskrepanz aus `05-02-SUMMARY.md`.
- **Fix:** Assertion durch eine funktional gleichwertige Prüfung ersetzt: `_bridgeHandlers.get('GAME_INVENTORY_DATA')` bleibt nach dem Guard-Throw leer (0 Handler) — beweist, dass die Registrierung nie erreicht wurde, ohne sich auf das Hoisting-Detail zu verlassen.
- **Files modified:** `tests/game-scan-bridge.test.js`
- **Verification:** `npx vitest run tests/game-scan-bridge.test.js` → 17/17 grün
- **Committed in:** `d2e8351` (Task 2, zusammen mit game-scan.js — analog zum Vorgehen in `05-02-SUMMARY.md`, das bereits committete RED-Testdatei-Assertionen im GREEN-Commit korrigiert)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 — ein Kommentartext-Kollisionsfall, eine Testauthoring-Korrektur wegen einer Node-vm-Plattformeigenheit).
**Impact on plan:** Kein Scope-Creep — beide Fixes waren notwendig, damit die vom Plan selbst geforderten statischen Gates und Testassertionen tatsächlich (und korrekt) grün werden. Die Enumerator-/Snapshot-Logik entspricht vollständig dem Plan.

## Issues Encountered

None.

## User Setup Required

**Bookmarklet nach Deploy neu ausführen.** Der Loader (aus Plan 05-02) trägt jetzt den Case `GET_GAME_INVENTORY`; ohne einen erneuten Bookmarklet-Lauf im Spiel-Tab antwortet der alte, bereits injizierte Loader nicht auf Scan-Anfragen. Keine externe Service-Konfiguration nötig.

## Known Stubs

Keine.

## Threat Flags

Keine neuen. Alle im Plan-Threat-Register genannten Bedrohungen sind durch die 17 neuen Testfälle bzw. statischen Gates mitigiert:
- T-5-04 (gefälschte/veraltete `GAME_INVENTORY_DATA`): reqId-Korrelation über `_giPending` — unbekannte reqId → kein add (Test 11), verbrauchte reqId → kein zweiter add (Test 10)
- T-5-05 (Snapshot überschrieben/gelöscht): add-only über `idbSnapshotPut` (Test 9: zwei Datensätze, erster unverändert); statisch 0× Lösch-/Leer-Operation in `game-scan.js`
- T-5-06 (Quota-Fehler bleibt still): `_idbSchreibfehler` + Statuszeile „NICHT gespeichert" + kein Erfolgs-Status (Test 14); `err`-Nachricht → Fehler-Status (Test 12/13)
- T-5-11 (Modul bricht die Ladekette): Guard mit `#loadOrderFatal` (Test 1), `node --check`, Write-Zeile direkt nach items.js (Test 16), `CORE_SCRIPTS`-Regel (Test 17), volle Suite mit game-scan.js in jeder items.js-Sandbox grün
- T-5-12 (Information Disclosure): akzeptiertes Risiko laut Plan — Daten bleiben clientseitig, kein Netzwerkpfad, Einzelnutzer-Tool
- T-5-13 (Repudiation): Datensatz mit `ts`/`gameVersion`/`modCount`/`sizeBytes`, Statuszeile mit ISO-Zeit, Konsolen-Log der Größe
- T-5-SC (npm/pip/cargo installs): keine Installationen in diesem Plan

## End-of-Phase-Human-Checks (nicht blockierend — Orchestrator-Entscheidung 6)

Aus `<human-check>` (Task 2), noch offen — im Spiel-Tab bzw. Tool-Konsole zu verifizieren:

1. **Deploy + Bookmarklet neu ausführen:** GitHub Pages deployen; im Spiel-Tab das Bookmarklet NEU ausführen (Loader trägt jetzt den Enumerator); Tool hart neu laden (Strg+F5): kein FATAL-Banner; ⚙️ → Sektion `🔎 Spiel-Scan` zeigt „Noch kein Scan gespeichert".
2. **Scan auslösen:** Verbinden, dann „🔎 Spiel scannen"; Statuszeile zählt „Schritt 1/6 … 6/6 – Chat-Hooks" hoch; Spiel-Tab bleibt während des Scans bedienbar (chatten/scrollen/Menü öffnen, kein Einfrieren); nach wenigen Sekunden „✅ Spiel-Scan gespeichert – 28 Mods, N KB" und Statuszeile „Letzter Scan … · BC R131 · 28 Mods · N KB · 1 Snapshot gespeichert".
3. **Payload-Größe:** Tool-Konsole zeigt `[GameScan] Snapshot-Größe (JSON-Zeichen): <Zahl> …` — **Zahl hier nachtragen, sobald verfügbar** (RESEARCH Open Question 2; erst ab > 20 MB Mehrteiligkeit erwägen). Spiel-Tab-Konsole: `[BCK-BC] [OK] [GameScan] Inventar gesendet: ~18700 Globals, 4764 Assets, 28 Mods, <ms> ms`.
4. **DevTools-Verifikation:** IndexedDB → `BCKonfigurator` (Version 3) → Store `snapshots`: ein Datensatz mit `gameVersion: "R131"`, `modCount: 28`, plausibler Mod-Liste, `inventory.globals.total` ≈ 18700, `inventory.assets.count` = 4764, `inventory.assets.groupCount` = 120, `inventory.modSdk.patchingCount` ≈ 546, `inventory.probes.bcx.version` gesetzt, `inventory.errors` leer.
5. **Zweiter Scan:** zwei Datensätze, erster unverändert (id/ts/Inhalt identisch); Statuszeile „2 Snapshots gespeichert"; bleibt nach Tool-Reload bestehen.
6. **Bestehende Flows unverändert:** Cache laden, Raum-Scan, Outfit-Screenshot, Bot-Deploy (EXEC-Log-Eintrag), 🔄 Verbinden nach BC-Reload.

**Payload-Größe (Feld für Nachtrag):** _noch nicht gemessen — wird nach dem ersten echten Live-Scan hier ergänzt._

## Next Phase Readiness

- Phase 5 (Gamecode-Inventar) ist damit code-seitig vollständig: `loader.js` (05-02) liest das Spiel read-only aus, `persistence.js` (05-01) speichert add-only in IDB v3, `game-scan.js` (05-03) verbindet beides über die Bridge-Registry mit sichtbaren Erfolgs-/Fehlerpfaden.
- Snapshot-Vertrag `{id, ts, gameVersion, modCount, mods, sizeBytes, inventory}` im Store `snapshots` ist die Grundlage für Phase 6 (Scan-Tab, Baseline-Diff, Löschen mit Bestätigung).
- `npm test` grün (23 Dateien, 321 passed + 2 expected fail).
- `node --check game-scan.js` grün.
- Zwei Commits in der Reihenfolge test (RED) → feat (GREEN), wie geplant.
- Offen: die sechs End-of-Phase-Human-Checks oben (Live-Session, nicht blockierend) — sollten vor dem Phasenabschluss (`/gsd-verify-work`) durchgeführt und die Payload-Größe nachgetragen werden.
- Kein Blocker für Phase 6.

---
*Phase: 05-gamecode-inventar*
*Completed: 2026-09-19*

## Self-Check: PASSED

Beide erstellten Dateien und alle vier geänderten Dateien auf Disk gefunden (`game-scan.js`, `tests/game-scan-bridge.test.js`, `index.html`, `tests/helpers/loadScript.js`, `tests/persistence-module.test.js`, `docs/LOAD-ORDER.md`, diese SUMMARY). Beide Task-Commits (`417ded8`, `d2e8351`) im Log gefunden. Plan-Level-`<verification>` erneut ausgeführt: `npx vitest run tests/game-scan-bridge.test.js` → 17 passed; volle Suite → 23 Dateien grün, 321 passed + 2 expected fail; `node --check game-scan.js` → Exit 0; alle statischen Gates aus dem zweiten `<automated>`-Verifikationsblock (index.html-Diff, CORE_SCRIPTS, docs, game-scan.js ohne eigene Bridge-/IDB-/Lösch-Logik, items.js/bridge.js/loader-origin-Test unverändert) → bestätigt.
