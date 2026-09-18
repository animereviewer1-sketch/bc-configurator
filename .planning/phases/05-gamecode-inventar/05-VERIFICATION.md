---
phase: 05-gamecode-inventar
verified: 2026-09-18T22:36:33Z
status: human_needed
score: 8/8 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/phases/05-gamecode-inventar/05-01-PLAN.md", ".planning/phases/05-gamecode-inventar/05-01-SUMMARY.md", ".planning/phases/05-gamecode-inventar/05-02-PLAN.md", ".planning/phases/05-gamecode-inventar/05-02-SUMMARY.md", ".planning/phases/05-gamecode-inventar/05-03-PLAN.md", ".planning/phases/05-gamecode-inventar/05-03-SUMMARY.md", ".planning/phases/05-gamecode-inventar/05-CONSOLE-FINDINGS.md", ".planning/phases/05-gamecode-inventar/05-CONSOLE-RESULT.json", ".planning/phases/05-gamecode-inventar/05-RESEARCH.md", ".planning/phases/05-gamecode-inventar/05-REVIEW.md", ".planning/phases/05-gamecode-inventar/05-VALIDATION.md", "docs/LOAD-ORDER.md", "game-scan.js", "index.html", "loader.js", "persistence.js", "tests/game-inventory-enumerator.test.js", "tests/game-scan-bridge.test.js", "tests/helpers/loadScript.js", "tests/helpers/loaderSandbox.js", "tests/loader-sandbox.test.js", "tests/persistence-module.test.js", "tests/screenshot-migration.test.js"]
covered_digest: "v1:sha256:3a0ab7e5105a83f4240504c01990ea18af0c01c6f6e93440d56cbc8654de9253"
behavior_unverified: 0
overrides_applied: 0
behavior_unverified_items: []
human_verification:
  - test: "Live-Scan gegen die echte, laufende BC-Session mit 28 Mods (Bookmarklet nach Deploy neu ausführen, Tool hart neu laden, Verbinden, „🔎 Spiel scannen“ klicken)"
    expected: "Statuszeile zählt „Schritt 1/6 … 6/6“ hoch; der Spiel-Tab bleibt während des gesamten Scans bedienbar (chatten/scrollen/Menü öffnen, kein Einfrieren); nach wenigen Sekunden „✅ Spiel-Scan gespeichert – 28 Mods, N KB“"
    why_human: "Erfordert eine echte Browser-/BC-Session mit den 28 realen Mods (BCT, FUSAM, WCE, LSCG, MBS, BCX, Themed …) — in der vm-Sandbox nur simuliert, nie am echten Spielcode/Netzwerk-Timing gemessen"
  - test: "Tool-Konsole nach dem Live-Scan lesen: `[GameScan] Snapshot-Größe (JSON-Zeichen): <Zahl> …` notieren"
    expected: "Eine plausible Zahl (Größenordnung mehrere MB laut RESEARCH-Schätzung für 18.700 Globals/4.764 Assets/28 Mods); erst ab > 20 MB wäre Mehrteiligkeit zu erwägen"
    why_human: "Reale Payload-Größe ist nur mit echten Spieldaten messbar; 05-03-SUMMARY.md führt das Feld noch als „noch nicht gemessen“"
  - test: "DevTools → Application → IndexedDB → `BCKonfigurator` (Version 3) → Store `snapshots` öffnen und einen Datensatz aus dem echten Scan inspizieren"
    expected: "`gameVersion: \"R131\"`, `modCount: 28`, plausible Mod-Liste, `inventory.globals.total` ≈ 18700, `inventory.assets.count` = 4764, `inventory.assets.groupCount` = 120, `inventory.modSdk.patchingCount` ≈ 546, `inventory.probes.bcx.version` gesetzt, `inventory.errors` leer"
    why_human: "Erfordert visuelle Inspektion der echten DevTools-Ansicht; die Sandbox-Tests prüfen nur synthetische Fixtures in denselben Formen, nicht die echten Zahlen aus einer realen Session"
  - test: "Zweiter Live-Scan auslösen und die IndexedDB erneut prüfen"
    expected: "Zwei Datensätze im Store `snapshots`; der erste bleibt inhaltlich unverändert (gleiche `id`/`ts`/Inhalt); Statuszeile zeigt „2 Snapshots gespeichert“ und übersteht einen Tool-Reload"
    why_human: "Bestätigt den Kernwert „nie automatisch entfernt“ end-to-end mit echten Browser-IDB-Persistenz-Semantiken, nicht nur der fake-indexeddb-Simulation in Tests"
---

# Phase 5: Gamecode-Inventar Verification Report

**Phase Goal:** Der Nutzer löst im Tool einen Scan aus und erhält ein vollständiges, read-only erhobenes Inventar des laufenden Spiels inklusive Mods — dauerhaft als versionierter Snapshot gespeichert, ohne dass der Spiel-Tab einfriert.
**Verified:** 2026-09-18T22:36:33Z
**Status:** human_needed
**Re-verification:** No — initial verification (nach Post-Review-Fix-Commit `51917d7`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SCAN-13: Offene Fragen (bcModSdk-Form, WCE/FBC-Global, Getter-Nebenwirkungen, Asset-Tiefe) wurden per Konsolenbefehl im laufenden Spiel geklärt, Befehle/Ergebnisse dokumentiert | ✓ VERIFIED | `05-CONSOLE-FINDINGS.md` (R131, bcModSdk 1.2.0, 28 Mods, 18.700 Fenster-Properties/189 Getter, 4.764 Assets/120 Gruppen/100 Keys, `Asset.Group.Asset`-Zirkel) + `05-CONSOLE-RESULT.json` (49 Zeilen Rohdaten) beide auf Disk; jede Zahl in den Fixtures von `tests/helpers/loaderSandbox.js` stammt nachweislich daraus |
| 2 | Klick → `GET_GAME_INVENTORY`/`GAME_INVENTORY_DATA` liefert Core-Globals/-Funktionen (Typ+Arität), Asset-Katalog (Gruppen/Items/Eigenschaften/Sperren/Farben-Layer), Chat-Handler/Hooks | ✓ VERIFIED | `loader.js` Sektion `buildGameInventory` (Zeilen ~840-1424); 31/31 Fälle in `tests/game-inventory-enumerator.test.js` grün (Globals-Klassifizierung, Asset-Serialisierung, Chat-Hook-Registry); Snapshot-Vertrag `schema:1` bestätigt in 05-02-SUMMARY.md |
| 3 | bcModSdk-Mods + gehookte Funktionen; BCX/MBS/LSCG/WCE-FBC per Fallback-Probe mit öffentlicher API erkannt | ✓ VERIFIED | `giMods`/`giPatching`/fünf Probe-Blöcke in `loader.js`; describe-Blöcke „bcModSdk (SCAN-05)“ (2 Fälle) und „Fallback-Probes (SCAN-06)“ (7 Fälle) grün, inkl. `Object.getOwnPropertyNames` statt `Object.keys` für die nicht-enumerierbare `bcx`-API |
| 4 | Spiel-Tab bleibt bedienbar: keine Aufrufe entdeckter Funktionen (außer den zwei dokumentierten `bcModSdk`-Lesefunktionen), Getter nie gelesen, Tiefe/Umfang begrenzt, gechunkt | ✓ VERIFIED | Behavioraler Nachweis (nicht nur Presence): `hits.getter/fn/dynamic/patching` bleiben nach vollständigem Scan bei `0` (Test „SCAN-07: read-only, gechunkt, klonbar“, 6 Fälle); Chunking-Ticks gemessen (167 Ticks bei 80.133 Properties über `setTimeout`-Fallback, 31 Ticks über `requestIdleCallback`), erster Slice nachweislich asynchron |
| 5 | Jeder Scan wird als versionierter Snapshot `{gameVersion, ts, mods}` gespeichert; frühere Snapshots werden nie entfernt | ✓ VERIFIED | `persistence.js` `idbSnapshotPut` (add-only, `.add()` statt `.put()`), 0× Lösch-/Leer-Operation auf dem Store (statisch geprüft); `game-scan.js` `_saveGameInventorySnapshot`; Testfall „zweiter Scan behält den ersten“ grün |
| 6 | Post-Review-Fix CR-01: zwei Scans, die in derselben Millisekunde abgeschlossen werden, verlieren keinen Snapshot mehr (kollisionsfreie ID) | ✓ VERIFIED | `game-scan.js`: `id = ts + '_' + reqId` statt `id = ts`; `persistence.js` `idbSnapshotPut` akzeptiert jetzt Zahl ODER nicht-leeren String als `id`; neuer Regressionstest „Regression CR-01“ friert `Date.now` für beide Speichervorgänge ein und beweist `keys.length === n0 + 2` — echter Kollisionsbeweis, nicht die künstliche `settle(5)`-Verzögerung des ursprünglichen Tests (siehe WR-03-Neubewertung unten). Test einzeln erneut ausgeführt: 1 passed |
| 7 | Post-Review-Fix WR-01: Scan-Button wird während eines laufenden Scans gesperrt (verhindert den Hauptauslöser von CR-01) | ✓ VERIFIED | `_giSetBusy`/`_giAnyPending` in `game-scan.js`; Regressionstest „Regression WR-01“ (Button `disabled===true` nach Trigger, `false` nach Abschluss) einzeln erneut ausgeführt: 1 passed |
| 8 | Post-Review-Fix WR-02: `_renderGameScanInfo` erzeugt keine `RangeError` mehr, wenn der Store nicht-numerische/leere Schlüssel enthält | ✓ VERIFIED (judgment) | Code-Inspektion: `stamps.length ? … : ''` vermeidet `Math.max.apply(null, [])` vollständig, kein `-Infinity`/`Invalid time value`-Pfad mehr erreichbar; kein dedizierter Regressionstest vorhanden (WR-02 war Warning-Schwere, aktuell mit `Date.now()`-Zahlen praktisch unerreichbar) — Fix durch Lesen des Diffs bestätigt, nicht durch einen eigenen Testfall |

**Score:** 8/8 truths verified (0 present-but-behavior-unverified)

### WR-03-Neubewertung (false-green Concurrency-Test)

`05-REVIEW.md` bemängelte, dass der Test „gleichzeitige Scans …“ die CR-01-Kollision durch ein künstliches `await settle(5)` zwischen den beiden `GAME_INVENTORY_DATA`-Ereignissen verdeckt. Der Post-Review-Commit `51917d7` lässt diesen Test unverändert (wie im Fix-Vorschlag empfohlen: „den bestehenden Test unverändert lassen, aber nicht als alleinigen Beweis für ‚gleichzeitig‘ werten“) und ergänzt stattdessen „Regression CR-01“, das `Date.now` für beide Speichervorgänge auf denselben Wert einfriert und ohne jede künstliche Verzögerung beweist, dass beide Snapshots erhalten bleiben. Damit ist WR-03 sachlich aufgelöst: Es existiert jetzt ein echter, nicht durch Timing maskierter Kollisionsbeweis neben dem ursprünglichen (weiterhin gültigen, aber schwächeren) Test.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `loader.js` (Sektion `── Gamecode-Inventar`) | `buildGameInventory`, `giReadData`/`giBounded`/`giChunked`/`giNext`, `GI_ASSET_KEYS`, Case `GET_GAME_INVENTORY` | ✓ VERIFIED | Region-Gate: 0× `toString(`/`window[`/`eval(`/`new Function`/`JSON.parse(`; `ALLOWED_ORIGIN`-Zähler = 34 (unverändert); `node --check loader.js` Exit 0 |
| `persistence.js` | IDB v3, Store `snapshots`, `idbSnapshotPut/GetAll/Get/Keys`, add-only | ✓ VERIFIED | `idbSnapshotPut` akzeptiert nach Bug-Fix Zahl oder String-ID; 0× Lösch-/Leer-Operation auf dem Store |
| `game-scan.js` | Ladeordnung-Guard, `triggerGameScan`, Handler PROGRESS/DATA, `_saveGameInventorySnapshot`, `_giSetBusy` | ✓ VERIFIED | 0× eigene Bridge-/IDB-/Lösch-Logik; `node --check game-scan.js` Exit 0 |
| `index.html` | Tweaks-Sektion „🔎 Spiel-Scan“, Write-Zeile nach `items.js` | ✓ VERIFIED | statische Gates aus 05-03-PLAN.md bestätigt (Reihenfolge, Button, Statuszeile) |
| `tests/game-inventory-enumerator.test.js`, `tests/game-scan-bridge.test.js`, `tests/loader-sandbox.test.js`, `tests/persistence-module.test.js`, `tests/screenshot-migration.test.js` | Vollständige Testabdeckung SCAN-01..08/13 | ✓ VERIFIED | `npm test` → 23 Dateien grün, 323 passed + 2 expected fail (exakt wie in der Aufgabenstellung erwartet) |
| `docs/LOAD-ORDER.md` | game-scan.js dokumentiert, Isolationsaussage korrigiert | ✓ VERIFIED | Zeile 7 vorhanden, `332fc2d`-Referenz vorhanden |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `index.html` Button `onclick="triggerGameScan()"` | `game-scan.js` `triggerGameScan()` → `bcSend({type:'GET_GAME_INVENTORY', reqId})` | Handshake-geprüfter `bcSend`-Pfad | ✓ WIRED | statisches Gate + Testfälle 3-5 in `tests/game-scan-bridge.test.js` |
| `loader.js` `switch` Case `GET_GAME_INVENTORY` | `buildGameInventory(reqId, post)` | `post = msg => src.postMessage({app:APP, ...msg}, ev.origin)` | ✓ WIRED | `tests/game-inventory-enumerator.test.js` describe „GET_GAME_INVENTORY“ (5 Fälle) |
| `game-scan.js` `_saveGameInventorySnapshot` | `persistence.js` `idbSnapshotPut(record)` | add-only, ID jetzt `ts_reqId` | ✓ WIRED | Regression-CR-01-Test + bestehender Round-Trip-Test |
| `tests/helpers/loaderSandbox.js` `makeLoaderSandbox` | `loader.js` (IIFE) | `loadInto(ctx, 'loader.js')` | ✓ WIRED | `tests/loader-sandbox.test.js` (11 Fälle grün) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `#gameScanInfo` Statuszeile | `_gameScanInfo(text)`-Aufrufe | `triggerGameScan`/PROGRESS-Handler/`_renderGameScanInfo` (liest `idbSnapshotKeys()`) | Ja — reale Store-Abfrage, kein Platzhaltertext | ✓ FLOWING |
| `snapshots`-Store-Datensatz | `record.inventory` | echter `buildGameInventory`-Snapshot (Loader) via Bridge | Ja (Struktur bewiesen; reale 28-Mod-Zahlen ausstehend — siehe Human-Checks) | ✓ FLOWING (Struktur) / Live-Zahlen ⏳ human |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Volle Testsuite (einmalig) | `npm test` | 23 Dateien grün, 323 passed + 2 expected fail | ✓ PASS |
| `node --check` auf allen drei Produktionsdateien | `node --check loader.js game-scan.js persistence.js` | Exit 0 | ✓ PASS |
| Regression CR-01 (einzeln benannt) | `npx vitest run tests/game-scan-bridge.test.js -t "Regression CR-01"` | 1 passed \| 18 skipped | ✓ PASS |
| Regression WR-01 (einzeln benannt) | `npx vitest run tests/game-scan-bridge.test.js -t "Regression WR-01"` | 1 passed \| 18 skipped | ✓ PASS |
| `ALLOWED_ORIGIN`-Zähler | `grep -o 'ALLOWED_ORIGIN' loader.js \| wc -l` | 34 | ✓ PASS |
| items.js/bridge.js unverändert seit Baseline | `git diff --stat b7e0881 HEAD -- items.js bridge.js` | leer | ✓ PASS |
| loader.js Region-Gate (verbotene Aufrufe) | `awk`-Region zwischen den Sektionsmarken, grep auf `toString(`/`window[`/`eval(`/`new Function`/`JSON.parse(` | je 0 Treffer | ✓ PASS |
| game-scan.js Verbotsgates | grep auf `.delete(`/`.clear(`/`idbSnapshotDelete`/`postMessage(`/`addEventListener('message'` | je 0 Treffer | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCAN-01 | 05-02, 05-03 | Scan auslösen → Loader erstellt Inventar, sendet über Bridge zurück | ✓ SATISFIED | Trigger + Case + PROGRESS/DATA-Korrelation, 17+31 Testfälle |
| SCAN-02 | 05-02 | Core-Globals/-Funktionen mit Typ/Arität | ✓ SATISFIED | `snapshot.globals` (getters/functions/values/byPrefix/inventory-Bündelung) |
| SCAN-03 | 05-02 | Asset-Katalog (Gruppen, Items, Eigenschaften, Sperren, Farben/Layer) | ✓ SATISFIED | `snapshot.assets`, Allowlist `GI_ASSET_KEYS` (88 Keys), Waisen-/Zirkel-Fälle |
| SCAN-04 | 05-02 | Chat-Handler/Ereignis-Hooks | ✓ SATISFIED | `snapshot.chatHooks` (Registry-Introspektion ohne Callback-Aufruf) |
| SCAN-05 | 05-02 | `bcModSdk.getModsInfo()`/`getPatchingInfo()` | ✓ SATISFIED | `giMods`/`giPatching`, 4-Feld-Reduktion, `hits.patching===0` |
| SCAN-06 | 05-02 | BCX/MBS/LSCG/WCE-FBC Fallback-Probes | ✓ SATISFIED | fünf Probe-Blöcke, nicht-enumerierbare `bcx`-API korrekt behandelt |
| SCAN-07 | 05-02 | Read-only, kein Funktionsaufruf, gechunkt | ✓ SATISFIED | `hits`-Zähler 0, Chunking-Ticks gemessen, DataCloneError gemeldet statt verschluckt |
| SCAN-08 | 05-01, 05-03 | Versionierter Snapshot, nie automatisch entfernt | ✓ SATISFIED | add-only Store, CR-01-Fix, Regressionstest |
| SCAN-13 | 05-01 (verankert) | Konsolen-Klärung vor Enumerator-Implementierung | ✓ SATISFIED | `05-CONSOLE-FINDINGS.md`/`05-CONSOLE-RESULT.json` |

**Hinweis (dokumentarisch, nicht blockierend):** `.planning/REQUIREMENTS.md` zeigt in der Traceability-Tabelle (Zeilen ~126-131) für SCAN-02..07 noch „Pending“, obwohl die Checkbox-Liste weiter oben in derselben Datei dieselben IDs bereits als `[x]` markiert. Dies ist eine veraltete Statuszeile in der Doku, keine Codelücke — sollte vor Phasenabschluss nachgezogen werden.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `loader.js` | `GI_LIST_MAX`/`GI_STR_MAX`-Kürzungen | Stille Kürzung ohne `*_truncated`-Flag (REVIEW IN-01) | ℹ️ Info | Bereits im Review als Info erfasst, kein Fix erforderlich für den Phasengoal |
| `loader.js` | `GI_PREFIXES` (`'Asset'`/`'Assets'`) | Überlappende Präfixe → Doppelzählung in `byPrefix` (REVIEW IN-02) | ℹ️ Info | Rein deskriptive Statistik, keine funktionale Auswirkung |
| `loader.js` | `window.__BCK_buildGameInventory` | Test-Seam global exponiert (REVIEW IN-03) | ℹ️ Info | Musterkonform zu bestehenden Seams; kein Build-Schritt zum Entfernen verfügbar |
| `.planning/REQUIREMENTS.md` | Traceability-Tabelle | SCAN-02..07 als „Pending“ trotz erledigter Checkbox | ℹ️ Info | Dokumentations-Inkonsistenz, kein Code-Gap |

Keine 🛑 Blocker, keine unreferenzierten `TBD`/`FIXME`/`XXX`-Marker in den geänderten Dateien gefunden.

### Human Verification Required

### 1. Live-Scan gegen die echte 28-Mod-BC-Session

**Test:** Deploy auf GitHub Pages; im Spiel-Tab das Bookmarklet NEU ausführen (der Loader trägt jetzt den Enumerator); Tool hart neu laden (Strg+F5); Verbinden; „🔎 Spiel scannen“ klicken; währenddessen im Spiel-Tab chatten/scrollen/Menü öffnen.
**Expected:** Statuszeile zählt „Schritt 1/6 … 6/6“ hoch; kein Einfrieren des Spiel-Tabs; abschließend „✅ Spiel-Scan gespeichert – 28 Mods, N KB“.
**Why human:** Nur mit einer echten, laufenden BC-Session mit den 28 realen Mods überprüfbar — die vm-Sandbox-Tests beweisen Struktur und read-only-Disziplin, nicht das reale Timing/die reale Datenmenge.

### 2. Payload-Größe aus der Tool-Konsole

**Test:** Nach dem Live-Scan die Tool-Konsole lesen: `[GameScan] Snapshot-Größe (JSON-Zeichen): <Zahl> …`.
**Expected:** Eine Zahl im MB-Bereich; Feld in 05-03-SUMMARY.md nachtragen (Schwelle 20 MB für Mehrteiligkeit).
**Why human:** 05-03-SUMMARY.md führt dieses Feld noch explizit als „noch nicht gemessen“.

### 3. DevTools-Inspektion des echten Snapshots

**Test:** Application → IndexedDB → `BCKonfigurator` (v3) → Store `snapshots` öffnen, den neuen Datensatz ansehen.
**Expected:** `gameVersion: "R131"`, `modCount: 28`, `inventory.globals.total` ≈ 18700, `inventory.assets.count` = 4764, `inventory.assets.groupCount` = 120, `inventory.modSdk.patchingCount` ≈ 546, `inventory.errors` leer.
**Why human:** Reale Zahlen aus einer echten Session sind nur visuell in DevTools prüfbar.

### 4. Zweiter Scan behält den ersten (reale IDB)

**Test:** Zweiten Live-Scan auslösen, DevTools erneut öffnen.
**Expected:** Zwei Datensätze, der erste unverändert; Statuszeile „2 Snapshots gespeichert“ übersteht einen Tool-Reload.
**Why human:** Bestätigt den Kernwert „nie automatisch entfernt“ mit echten Browser-IDB-Semantiken statt der `fake-indexeddb`-Simulation.

### Gaps Summary

Keine blockierenden Codelücken gefunden. Alle acht abgeleiteten Wahrheiten (fünf Erfolgskriterien der Roadmap plus die drei im Auftrag benannten Post-Review-Fixes CR-01/WR-01/WR-02) sind im Code verifiziert, inklusive eines echten (nicht durch Timing maskierten) Regressionsbeweises für die zuvor als false-green kritisierte Kollisionslücke (WR-03). Die Phase ist code-seitig vollständig; der einzig offene Rest ist der laut Aufgabenstellung explizit als „Human-only“ deklarierte Live-Scan gegen die reale 28-Mod-Session (Responsiveness, DevTools-Zahlen, Payload-Größe, zweiter Scan) — diese vier Punkte stehen in `human_verification` und blockieren `passed`, nicht aber die grundsätzliche Zielerreichung.

---

_Verified: 2026-09-18T22:36:33Z_
_Verifier: Claude (gsd-verifier)_
