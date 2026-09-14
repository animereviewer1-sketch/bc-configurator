---
phase: 04-entflechtung
verified: 2026-09-15T00:55:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/04-entflechtung/04-01-PLAN.md"
  - ".planning/phases/04-entflechtung/04-01-SUMMARY.md"
  - ".planning/phases/04-entflechtung/04-02-PLAN.md"
  - ".planning/phases/04-entflechtung/04-02-SUMMARY.md"
  - ".planning/phases/04-entflechtung/04-03-PLAN.md"
  - ".planning/phases/04-entflechtung/04-03-SUMMARY.md"
  - ".planning/phases/04-entflechtung/04-04-PLAN.md"
  - ".planning/phases/04-entflechtung/04-04-SUMMARY.md"
  - ".planning/phases/04-entflechtung/04-RESEARCH.md"
  - ".planning/phases/04-entflechtung/04-REVIEW.md"
  - ".planning/phases/04-entflechtung/04-VALIDATION.md"
  - "bot-ui.js"
  - "bridge.js"
  - "docs/LOAD-ORDER.md"
  - "index.html"
  - "items.js"
  - "persistence.js"
  - "tests/bridge-protocol.test.js"
  - "tests/bridge-registry.test.js"
  - "tests/delete-confirmation.test.js"
  - "tests/delete-consistency.test.js"
  - "tests/exec-log.test.js"
  - "tests/helpers/loadScript.js"
  - "tests/injected-code-origin.test.js"
  - "tests/load-order-guard.test.js"
  - "tests/load-script.test.js"
  - "tests/persistence-module.test.js"
  - "tests/screenshot-export.test.js"
  - "tests/screenshot-migration.test.js"
  - "tests/screenshot-store.test.js"
  - "tests/screenshot-sync.test.js"
covered_digest: "v1:sha256:bc74775249ec1bc54b3863d8c4d33b5b0fe673c3342b41d17ad703a839d5ac9b"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Alle Tabs (Items, Outfit, Curse, Inventar, Shop, Rang, Geld, Bot) im echten Browser öffnen, Cache aus dem Spiel laden, einen Bot starten, ein Profil-Screenshot aufnehmen."
    expected: "Kein sichtbarer Verhaltensunterschied gegenüber vor der Phase; keine Konsolenfehler; alle Tabs bedienbar."
    why_human: "Visuelles/funktionales UI-Verhalten über den gesamten Tab-Satz ist nicht per grep/Unit-Test prüfbar (Erfolgskriterium 2)."
  - test: "Tool hart neu laden (Strg+F5); anschließend in DevTools persistence.js blockieren und neu laden."
    expected: "Ohne Blockade: kein `FATAL`-Banner. Mit blockiertem persistence.js: rotes Banner „FATAL: persistence.js wurde nicht vor items.js geladen …“ erscheint oben."
    why_human: "Echtes Laden von `<script src>`-Tags im Browser-DOM ist von der vm-Sandbox der Tests nicht abgedeckt (Erfolgskriterium 3)."
  - test: "Migration auf echten Nutzerdaten: Tool mit bestehenden Scan-Daten laden, DevTools → Application → IndexedDB öffnen."
    expected: "Object-Store `screenshots` ist befüllt; `BC_PROFILE_SCREENSHOTS_v1`/`BC_LSCG_SCREENSHOTS_v1`/`BC_MBS_WHEEL_SS_v1` sind weiterhin vorhanden (nicht gelöscht); Marker-Key `BC_SCREENSHOT_MIGRATION_v1` ist gesetzt und `done: true`."
    why_human: "Erfordert echte, bereits gesammelte Scan-Daten in einer echten IndexedDB-Instanz — die fake-indexeddb-Tests simulieren dies, aber der Kernwert „kein Datenverlust“ verdient eine reale Stichprobe (Erfolgskriterium 5)."
  - test: "Zwei-Tab-Test: Tool in zwei Browser-Tabs gleichzeitig öffnen, in einem Tab einen Reload auslösen, der die IDB-Versionsanhebung anstößt, während der andere Tab die Verbindung offen hält."
    expected: "Der blockierte Tab zeigt sichtbar eine Fehlermeldung/einen Status-Hinweis (`onblocked`), anstatt still hängen zu bleiben oder den anderen Tab zu crashen; nach Schließen des zweiten Tabs läuft das Upgrade durch."
    why_human: "Cross-Tab-`versionchange`/`onblocked`-Interaktion ist ein Zwei-Prozess-Browser-Verhalten, das die Unit-Test-Sandbox nicht real herstellen kann (Erfolgskriterium 5)."
---

# Phase 4: Entflechtung Verification Report

**Phase Goal:** Persistenz und Bridge sind eigenständige, testbare Module, `items.js` koordiniert nur noch, und Screenshots liegen einzeln in einem eigenen Store — ohne Verhaltensänderung und ohne Datenverlust.
**Verified:** 2026-09-15T00:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `persistence.js`/`bridge.js` sind Dual-Export-Module, laufen als klassisches `<script>`, sind Vitest-importierbar; ein neuer Nachrichtentyp registriert sich per `onBridgeMessage` ohne items.js-Änderung | ✓ VERIFIED | `tests/bridge-registry.test.js` Fall 10 bootet `['persistence.js','bridge.js']` (ohne items.js), registriert `GAME_SCAN_DATA` und empfängt es; Fall 12 prüft den Dual-Export-Schwanz; `tests/persistence-module.test.js` prüft `createRequire`-Import und Sandbox-Dual-Export für persistence.js. Alle Fälle grün (`npx vitest run tests/bridge-registry.test.js` → 53 passed). |
| 2 | Alle Tabs unverändert; items.js hat keine eigene IDB-/postMessage-Logik mehr | ⚠️ statisch verifiziert, UI-Verhalten braucht Mensch | `grep -c "indexedDB.open(" items.js` = 0; `grep -c "addEventListener('message'" items.js` = 0; `grep -c "window.opener.postMessage(" items.js` = 0; `grep -c "function bcSend(" items.js` = 0. Funktionales Tab-Verhalten selbst ist nicht per grep/Unit-Test beweisbar → Human Verification Item 1. |
| 3 | Fehlendes Modul → sichtbarer Startfehler; Ladereihenfolge dokumentiert | ✓ VERIFIED | Guard-IIFE am Dateianfang von `items.js` (Zeilen 1-15) und `bot-ui.js` (Zeilen 1-15) rendert `#loadOrderFatal` und wirft; `tests/load-order-guard.test.js` deckt den Fehlerfall (kein persistence.js → Throw + Box) und den Erfolgsfall ab, grün. `index.html` lädt `persistence.js?_=` → `bridge.js?_=` → `items.js?_=` in dieser Reihenfolge im selben `_cbv`-Block mit vorangestelltem `LADEREIHENFOLGE`-Kommentar; `docs/LOAD-ORDER.md` existiert und dokumentiert Kette, Guard und Erweiterungsanleitung. Realer Browser-Ladefehler (blockiertes `<script src>`) bleibt Human-Item 2. |
| 4 | Ein Screenshot-Save schreibt genau einen Datensatz im neuen Store; keine Vollserialisierung von `PROFILE_SCREENSHOTS`/`LSCG_DB` | ✓ VERIFIED | `idbScreenshotBatch` (persistence.js) schreibt ein `put`/`delete` je verändertem Bild in einer Transaktion; `_screenshotFlush` (items.js) berechnet nur das Diff zum zuletzt persistierten Shadow-Stand. `tests/screenshot-store.test.js` "neues Profil-Bild: genau ein put" verifiziert genau 1 `put {id:'profile|Anna', img}` und 0 `kv`-Writes auf `BC_PROFILE_SCREENSHOTS_v1`/`BC_LSCG_OUTFITS_v3`. Grep: `grep -c "idbSet('BC_PROFILE_SCREENSHOTS_v1'" persistence.js items.js` = 0 (kein direkter Vollschreib-Pfad). |
| 5 | JSON-Export vor Migration möglich; nach Migration stimmen Anzahl/Schlüssel, Alt-Blob bleibt, Migration wird markiert, blockierter `versionchange` wird angezeigt | ✓ VERIFIED | `exportScreenshotsOnly()` (items.js:7222) exportiert alle drei Screenshot-Sammlungen unabhängig von der Migration. `_migrateScreenshotsToStore()` (persistence.js) liest Alt-Blobs nur lesend, schreibt Bilder + Verifikation + Marker (`BC_SCREENSHOT_MIGRATION_v1`) jetzt **in einer gemeinsamen Transaktion** (Fix CR-02, s.u.); `req.onblocked` (persistence.js:37) und `db.onversionchange` (persistence.js:46) rufen `showStatus(...,'error')` sichtbar auf statt still zu hängen. `tests/screenshot-migration.test.js` deckt Idempotenz, add-if-absent, Teilfehler und die neue Atomizität ab, alle grün. Reale Zwei-Tab-Blockade bleibt Human-Item 4, reale Nutzerdaten-Migration Human-Item 3. |

**Score:** 5/5 Erfolgskriterien inhaltlich erfüllt (4 vollautomatisch verifiziert, 1 mit ergänzendem UI-Human-Check); 0 present-behavior-unverified.

### Post-Review-Fixes (explizit angefordert)

| Fix-Commit | Review-Finding | Geprüft | Ergebnis |
|---|---|---|---|
| `3ba37c5` | CR-01 (falsche Merge-Richtung beim Profil-Screenshot-Ladepfad überschreibt frisches Bild) | Code gelesen (`items.js:576-585`): Ladeschleife füllt jetzt nur fehlende Keys (`if (!(k in PROFILE_SCREENSHOTS)) PROFILE_SCREENSHOTS[k] = d[k]`) — exakt das Muster, das LSCG/Wheel bereits verwenden. Statische Testzählung `PROFILE_SCREENSHOTS[` = 34 (+1) in `tests/screenshot-store.test.js` bestätigt die neue Zeile. | ✓ Fix korrekt und konsistent mit LSCG/Wheel-Vorbild. **Anmerkung:** kein dedizierter Verhaltenstest reproduziert exakt das Race-Fenster (frischer Capture-Wert wird VOR Auflösung des `_screenshotStoreReady().then()` gesetzt); nur eine statische Zeilenzählung deckt den Commit ab. Nicht blockierend, da die Fix-Logik strukturell identisch mit bereits verhaltensgetesteten Pfaden (LSCG/Wheel) ist — als kleine Coverage-Lücke vermerkt. |
| `3ba37c5` | CR-02 (Marker-Schreibfehler kann gelöschte Screenshots beim Retry wiederbeleben) | `persistence.js:198-231`: Bild-Kopie, Verifikation und Marker-`put` laufen jetzt in EINER `db.transaction([_IDB_SCREENSHOTS, _IDB_STORE], 'readwrite')`; schlägt der Marker-Put fehl, wird die gesamte Transaktion abgebrochen (`tx.abort()`), Bilder werden nicht committet. | ✓ Dedizierter Regressionstest `tests/screenshot-migration.test.js:192` "Atomizität (Review CR-02)" simuliert genau das Szenario (nur `kv`-Put für den Marker wirft) und prüft: `rA.done === false`, Marker `null`, Store leer (0 Keys), Alt-Blob unverändert, Retry migriert vollständig. `npx vitest run tests/screenshot-migration.test.js` → grün. |
| `332fc2d` | WR-01 (werfender Bridge-Handler blockiert Geschwister-Handler) | `bridge.js:143-151` (`_bridgeDispatch`): `try/catch` um jeden Handler-Aufruf, Fehler werden geloggt statt den Dispatch abzubrechen. | ✓ Test `tests/bridge-registry.test.js:100` "ein werfender Handler blockiert keine Geschwister (Review WR-01)" registriert einen werfenden und einen normalen Handler für denselben Typ, prüft dass der zweite trotzdem läuft und kein Throw nach außen dringt. Grün. |
| `332fc2d` | WR-02 (`onBridgeMessage` schützt nicht vor Doppelregistrierung) | `bridge.js:127-132`: `if (!list.includes(handler)) list.push(handler);` | ✓ Test `tests/bridge-registry.test.js:111` "Doppelregistrierung desselben Handlers ist ein No-op (Review WR-02)" registriert denselben Handler zweimal, prüft `n === 1` nach einem Dispatch. Grün. |
| `342a49e` | Flaky Teardown (asynchrones Bootstrap-Logging kollidiert mit Vitest-Worker-Teardown) | Diff gelesen: `console`-Stub (`quietConsole`) übergeben + `await settle(150)` nach dem Laden von items.js in den betroffenen Fällen; keine Assertion wurde entfernt oder geschwächt. | ✓ Legitimer Test-Hygiene-Fix, keine Verdeckung eines echten Bugs. `npm test` läuft seither reproduzierbar durch (255 passed + 2 expected fail, 20 Dateien, im wiederholten Lauf bestätigt). |

**WR-03** (fehlender Testfall für den Marker-only-Fehlerpfad) ist durch den neuen CR-02-Atomizitätstest abgedeckt — derselbe Test simuliert exakt "nur der Marker-Put scheitert, Bild-Puts laufen durch" und ist damit WR-03s geforderter Testfall.

**IN-01** (Guard-Duplizierung zwischen `items.js` und `bot-ui.js`) bleibt wie im Review als "nicht dringend" eingestuft bestehen — Advisory, kein Verhaltensfehler, kein Blocker für diese Phase.

**04-REVIEW.md neu bewertet:** Der Bericht datiert vor den drei Fix-Commits (`342a49e`, `3ba37c5`, `332fc2d`, alle 2026-09-15 00:2x-00:4x) und trägt entsprechend noch `status: issues_found`. Beide Critical-Findings (CR-01, CR-02) und beide Warnings (WR-01, WR-02) sind durch die genannten Commits mit dediziertem Regressionstest behoben; WR-03 ist durch denselben CR-02-Test miterledigt; IN-01 ist als Advisory unverändert offen. Der aktuelle Codestand ist damit fortgeschrittener als der im Review dokumentierte Stand.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `persistence.js` | IDB-Helfer, Migrations-IIFE, `_debounce`, Screenshot-Store-Primitive, Dual-Export | ✓ VERIFIED | Existiert, `node --check` grün, alle 3 Ebenen (exists/substantive/wired) erfüllt; Dual-Export-Schwanz vorhanden. |
| `bridge.js` | Verbindungszustand, `bcSend`, Registry (`onBridgeMessage`/`offBridgeMessage`/`_bridgeDispatch`), einziger `message`-Listener | ✓ VERIFIED | Existiert, `node --check` grün, Registry inkl. Fehlerisolierung (WR-01) und Dedupe (WR-02). |
| `items.js` | Koordiniert nur noch; keine eigene IDB-/Bridge-Logik | ✓ VERIFIED | Statische Gates 0/0/0 für `indexedDB.open`/`addEventListener('message'`/`window.opener.postMessage(`. |
| `bot-ui.js` | Ladereihenfolge-Guard vor persistence.js/bridge.js/items.js | ✓ VERIFIED | Guard-IIFE vorhanden, `node --check` grün. |
| `index.html` | Lädt persistence.js → bridge.js → items.js; nur Einfügungen | ✓ VERIFIED | Reihenfolge korrekt, Kommentar aktuell. |
| `docs/LOAD-ORDER.md` | Dokumentiert Kette, Guard, Erweiterungsanleitung | ✓ VERIFIED | Existiert, nennt persistence.js/bridge.js/`loadOrderFatal`/`CORE_SCRIPTS`. |
| Testdateien (12 phasenspezifische) | Decken alle must_haves ab | ✓ VERIFIED | Alle existieren, `npm test` = 20 Dateien, 255 passed + 2 expected fail. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `bridge.js` message-Listener | `items.js` Handler-Körper | `_bridgeDispatch(ev)` → `_bridgeHandlers.get(type)` | ✓ WIRED | 35 `onBridgeMessage('<TYP>', …)`-Registrierungen in items.js, statisch gezählt und per Test verifiziert. |
| `items.js` Guard-IIFE | `persistence.js`/`bridge.js` Globals | `typeof window[name] !== 'function'` | ✓ WIRED | Guard-Tabelle enthält `idbGet`/`bcSend`/`onBridgeMessage`. |
| `index.html` `_cbv`-Block | `persistence.js`, `bridge.js`, `items.js` | drei `document.write`-Zeilen in korrekter Reihenfolge | ✓ WIRED | Verifiziert per grep-Zeilennummern. |
| `_screenshotFlush` (items.js) | `idbScreenshotBatch` (persistence.js) | Diff aus Shadow-Map | ✓ WIRED | Ein put/delete je geändertem Bild, per Test bestätigt. |
| `_migrateScreenshotsToStore` (persistence.js) | Screenshot-Store + `kv`-Marker | eine gemeinsame Transaktion (Fix CR-02) | ✓ WIRED | Test "Atomizität (Review CR-02)" bestätigt Alles-oder-nichts-Verhalten. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Volle Test-Suite | `npm test` | `Test Files 20 passed`, `Tests 255 passed \| 2 expected fail (257)` | ✓ PASS |
| `node --check` auf allen vier Kern-Dateien | `node --check persistence.js bridge.js items.js bot-ui.js` | Exit 0 für alle vier | ✓ PASS |
| Neuer Nachrichtentyp ohne items.js | `tests/bridge-registry.test.js` Fall "bridge.js allein: GAME_SCAN_DATA registrieren und empfangen" | grün | ✓ PASS |
| CR-02-Regression | `npx vitest run tests/screenshot-migration.test.js` (Fall "Atomizität … Review CR-02") | grün | ✓ PASS |
| WR-01/WR-02-Regression | `npx vitest run tests/bridge-registry.test.js` (Fälle "Review WR-01"/"Review WR-02") | grün | ✓ PASS |

### Statische Gates (aus dem Verifikationsauftrag)

| Gate | Erwartung | Ist-Wert | Status |
|---|---|---|---|
| `grep -c "indexedDB.open(" items.js` | 0 | 0 | ✓ |
| `grep -c "addEventListener('message'" items.js` | 0 | 0 | ✓ |
| `grep -c "window.opener.postMessage(" items.js` | 0 | 0 | ✓ |
| `idbSet` schreibt Legacy-Blob-Keys direkt in persistence.js | 0 | 0 (kein direkter idbSet-Aufruf auf `BC_Money_v1`/`…`/`BC_PROFILE_SCREENSHOTS_v1`/etc.) | ✓ |
| `npm test` | 255 passed + 2 expected fail, 20 Dateien | 255 passed + 2 expected fail, 20 Dateien | ✓ |
| `node --check` (4 Dateien) | Exit 0 | Exit 0 | ✓ |
| Bootstrap-Wildcard-Sends | genau 1 (`bridge.js`, PING), 0 in items.js | 1 / 0 | ✓ |
| `_bcOrigin || '*'`-Fallback | genau 1 (`bridge.js`), 0 in items.js | 1 / 0 | ✓ |
| `TOOL_ORIGIN` | genau 1× in items.js, 0× in bridge.js/persistence.js | 1 / 0 | ✓ |

### Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidenz |
|---|---|---|---|---|
| SPLIT-01 | 04-01 | IDB-/localStorage-Helfer in `persistence.js`, Dual-Export | ✓ SATISFIED | `persistence.js` existiert, Vitest-Import + klassisches Skript verifiziert. |
| SPLIT-02 | 04-02 | postMessage-Protokoll in `bridge.js` mit Handler-Registry | ✓ SATISFIED | `onBridgeMessage`/`offBridgeMessage`/`_bridgeDispatch` vorhanden und getestet. |
| SPLIT-03 | 04-02 | `items.js` ohne eigene IDB-/postMessage-Logik; Tabs unverändert | ✓ SATISFIED (Code) / ⚠️ UI braucht Mensch | Statische Gates grün; UI-Smoke-Test ausstehend (Human Item 1). |
| SPLIT-04 | 04-01/04-02 | Ladereihenfolge dokumentiert + defensiv geprüft | ✓ SATISFIED | Guard + `docs/LOAD-ORDER.md` + `index.html`-Kommentar. |
| SPLIT-05 | 04-04 | Screenshots als Einzeldatensätze in eigenem Store | ✓ SATISFIED | `idbScreenshotBatch`/Shadow-Diff-Flush verifiziert. |
| SPLIT-06 | 04-04 | Additive, verifizierte, als abgeschlossen markierte Migration; blockierter `versionchange` sichtbar | ✓ SATISFIED | Atomare Transaktion (CR-02-Fix), `onblocked`/`onversionchange`-Handler mit `showStatus`. |
| SPLIT-07 | 04-03 | JSON-Export vor Migration | ✓ SATISFIED | `exportScreenshotsOnly()` vorhanden und getestet. |

Keine verwaisten (orphaned) Requirements gefunden — REQUIREMENTS.md ordnet SPLIT-01..07 ausschließlich Phase 4 zu, alle sieben sind in den vier Plänen abgedeckt.

### Anti-Patterns Found

Keine TBD/FIXME/XXX-Marker in den phasenrelevanten Dateien gefunden. Keine Platzhalter-Returns oder leeren Handler in `persistence.js`/`bridge.js` festgestellt. Die einzigen offenen Punkte sind die im Review dokumentierten und hier neu bewerteten Findings (siehe oben) — alle bis auf das Advisory IN-01 sind behoben.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `items.js` / `bot-ui.js` | 1-16 / 1-16 | Duplizierter Ladereihenfolge-Guard (IN-01) | ℹ️ Info | Wartungsaufwand bei künftigen Guard-Änderungen an zwei Stellen; kein Verhaltensfehler; im Review als "nicht dringend" eingestuft. |

### Human Verification Required

Siehe `human_verification` im Frontmatter — vier Items:
1. Alle Tabs im echten Browser (Erfolgskriterium 2 — funktionales UI-Verhalten).
2. Hartes Neuladen + blockiertes `persistence.js` im echten Browser (Erfolgskriterium 3 — reales `<script>`-Ladeversagen).
3. Migration auf echten Nutzerdaten (Erfolgskriterium 5 — reale IndexedDB-Instanz mit Bestandsdaten).
4. Zwei-Tab-`onblocked`-Interaktion (Erfolgskriterium 5 — Cross-Tab-Browserverhalten).

Diese vier Items waren bereits in den Plänen (04-01 Task 3, 04-04) als `<human-check>`-Ende-der-Phase-Verifikationen vorgesehen und werden hier gebündelt übernommen.

### Gaps Summary

Keine Gaps im Sinne von "fehlt/kaputt". Alle fünf Erfolgskriterien sind im Code nachweisbar erfüllt, die volle Testsuite ist grün (255 passed + 2 expected fail, 20 Dateien unverändert gegenüber der Baseline-Erwartung), alle vier vom Auftrag explizit genannten Post-Review-Fixes (CR-01, CR-02, WR-01, WR-02) sind im Code vorhanden und durch dedizierte, benannte Regressionstests abgesichert; der Flaky-Test-Fix (342a49e) ist legitim. Der Status ist `human_needed`, nicht `passed`, weil vier Erfolgskriterien-Aspekte (reales UI-Verhalten über alle Tabs, reales Browser-Ladeversagen, reale Migration auf Bestandsdaten, Cross-Tab-`onblocked`) grundsätzlich nur im echten Browser/Zwei-Tab-Szenario beobachtbar sind und nicht per Unit-Test/grep abschließend bewiesen werden können. Als kleine, nicht blockierende Anmerkung: CR-01 hat keinen dedizierten Verhaltenstest für das exakte Race-Fenster (nur eine statische Zeilenzählung), obwohl der Code-Fix selbst korrekt und strukturell mit den bereits getesteten LSCG-/Wheel-Pfaden identisch ist.

---

_Verified: 2026-09-15T00:55:00Z_
_Verifier: Claude (gsd-verifier)_
