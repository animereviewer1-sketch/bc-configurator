# Requirements: BC Universal Configurator

**Defined:** 2026-09-12
**Core Value:** Gescannte Daten (Outfits, Versionen, Screenshots, Bots) gehen nie verloren — nichts wird automatisch gelöscht oder überschrieben, und jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Stabilisierung (STAB)

- [x] **STAB-01**: Screenshots, die unter `mk|fp` gespeichert wurden, werden beim Profil-Sync unter demselben Schlüssel gelesen — ein Screenshot einer Outfit-Version erscheint danach im Profil (`_syncLscgScreenshotToProfiles(mk, fp)`)
- [x] **STAB-02**: Schlägt ein IDB-Schreibvorgang mit `QuotaExceededError` fehl, sieht der Nutzer sofort eine Fehlermeldung in der UI; der Fehler wird nie still verschluckt
- [x] **STAB-03**: Der Nutzer kann den belegten und verfügbaren Speicher (`navigator.storage.estimate()`) im Tool einsehen
- [x] **STAB-04**: Alle `postMessage`-Aufrufe vom Tool zum Spiel verwenden den beim Handshake gelernten Spiel-Origin statt `"*"`
- [x] **STAB-05**: Alle `postMessage`-Aufrufe im injizierten Code (Bot-Engine-Generator, Watcher) zum Tool verwenden den statischen Tool-Origin statt `"*"`
- [x] **STAB-06**: Beide Seiten der Bridge prüfen `event.origin` und `event.source` gegen eine einzige gemeinsame Origin-Konstante; es gibt keine zweite Definition des Origins im Code
- [x] **STAB-07**: Verliert das Tool die Verbindung zum Spiel-Tab (`window.opener` null oder kein Heartbeat), zeigt es das sichtbar an und bietet erneutes Verbinden an
- [x] **STAB-08**: Jeder EXEC-Aufruf wird mit Zeitstempel und Kurzbeschreibung protokolliert und ist im Tool einsehbar
- [x] **STAB-09**: Das Löschen von Bildern, einzelnen Outfits oder Outfit-Versionen ist nur über eine explizite Nutzeraktion mit Bestätigungsdialog möglich; kein Code-Pfad löscht gespeicherte Scan-Daten als Nebeneffekt
- [x] **STAB-10**: Ein bestätigter Löschvorgang entfernt den Datensatz konsistent aus allen Speicherorten (LSCG_DB, LSCG_SCREENSHOTS, PROFILE_SCREENSHOTS) — keine verwaisten Einträge

### Tests (TEST)

- [x] **TEST-01**: `npm test` führt eine Vitest-Suite lokal aus; die Produktionsauslieferung (GitHub Pages, `<script>`-Tags) bleibt unverändert und ohne Build-Schritt
- [x] **TEST-02**: Bestehende Global-Scope-Dateien (`items.js`, `bot-data.js`, `outfit-import.js`) sind ohne Quelländerung per Node-`vm`-Sandbox testbar
- [x] **TEST-03**: Ein Canary-Test schlägt fehl, wenn `fake-indexeddb` nicht aktiv ist (verhindert stilles Zurückfallen auf den localStorage-Pfad)
- [x] **TEST-04**: IDB-Helfer (`idbGet`/`idbSet`) sind getestet inkl. Quota-Fehlerpfad
- [x] **TEST-05**: Bot-Validatoren aus `bot-data.js` und der Outfit-Import-Parser sind mit gültigen und ungültigen Eingaben getestet
- [x] **TEST-06**: Der Bot-Code-Generator erzeugt für Nutzerdaten mit Backticks, `${` und Sonderzeichen syntaktisch gültigen Code (Escaping-Test)
- [x] **TEST-07**: Das Bridge-Protokoll (Nachrichtentypen, Origin-Prüfung, Handler-Dispatch) ist mit simulierten Nachrichten getestet

### Entflechtung (SPLIT)

- [ ] **SPLIT-01**: IDB-/localStorage-Helfer liegen in `persistence.js`, funktionieren unverändert als klassisches `<script>` und sind per Dual-Export in Vitest importierbar
- [ ] **SPLIT-02**: Das postMessage-Protokoll liegt in `bridge.js` mit einer Handler-Registry (`onBridgeMessage(type, handler)`); neue Nachrichtentypen brauchen keine Änderung an `items.js`
- [ ] **SPLIT-03**: `items.js` enthält keine eigene IDB- oder postMessage-Logik mehr, sondern nutzt `persistence.js` und `bridge.js`; alle bestehenden Tabs funktionieren unverändert
- [ ] **SPLIT-04**: Die Ladereihenfolge der Script-Tags ist dokumentiert und wird zur Laufzeit defensiv geprüft (fehlendes Modul → sichtbare Fehlermeldung statt stiller Ausfall)
- [ ] **SPLIT-05**: Screenshots werden als einzelne IDB-Datensätze in einem eigenen Store gespeichert; das Speichern eines Screenshots serialisiert nicht mehr das gesamte `PROFILE_SCREENSHOTS`-Objekt oder `LSCG_DB`
- [ ] **SPLIT-06**: Die Migration in den neuen Screenshot-Store ist additiv: der Alt-Blob bleibt erhalten, die Migration wird verifiziert (Anzahl/Schlüssel stimmen überein) und als abgeschlossen markiert; ein blockierter `versionchange` (zweiter Tab) wird dem Nutzer angezeigt statt still zu scheitern
- [ ] **SPLIT-07**: Vor der Migration kann der Nutzer einen JSON-Export aller Screenshot-Daten auslösen

### Gamecode-Scan (SCAN)

- [ ] **SCAN-01**: Der Nutzer kann im Tool einen Scan auslösen; der Loader erstellt daraufhin ein Inventar des laufenden Spiels und sendet es über die Bridge zurück (`GET_GAME_INVENTORY` / `GAME_INVENTORY_DATA`)
- [ ] **SCAN-02**: Das Inventar enthält die Core-Globals und -Funktionen des Spiels (Player, ChatRoom, Inventory*, Character*, Server* u.a.) mit Typ und Signatur (Parameteranzahl)
- [ ] **SCAN-03**: Das Inventar enthält den Asset-Katalog: Gruppen, Items, Eigenschaften, Sperren, Farben/Layer — auch solche, die der bestehende Cache nicht abdeckt
- [ ] **SCAN-04**: Das Inventar enthält die registrierten Chat-Handler und Ereignis-Hooks (u.a. `ChatRoomRegisterMessageHandler`)
- [ ] **SCAN-05**: Das Inventar liest `bcModSdk.getModsInfo()` und `getPatchingInfo()` aus: registrierte Mods mit Version sowie jede gehookte Spielfunktion und welche Mods sie hooken
- [ ] **SCAN-06**: Bekannte Mods, die nicht (nur) über bcModSdk registrieren (`window.bcx`, `globalThis.mbs`, LSCG, WCE/FBC), werden per Fallback-Probe erkannt und ihre öffentliche API mit erfasst
- [ ] **SCAN-07**: Die Enumeration ist read-only, ruft keine entdeckten Funktionen auf, meidet Getter mit Nebenwirkungen, begrenzt Tiefe und Umfang und läuft gechunkt, sodass der Spiel-Tab nicht einfriert
- [ ] **SCAN-08**: Jeder Scan wird als versionierter Snapshot (BC-Version, Zeitstempel, Mod-Liste) gespeichert; Snapshots werden nie automatisch entfernt
- [ ] **SCAN-09**: Ein Baseline-Manifest listet, welche Spielfunktionen, Assets und Hooks das Tool und der Bot-Editor heute bereits nutzen
- [ ] **SCAN-10**: Ein Scan-Tab zeigt die Fundliste durchsuchbar und nach Kategorie gefiltert, jeder Eintrag mit Badge „bereits genutzt“ oder „neu“ gegenüber dem Baseline-Manifest
- [ ] **SCAN-11**: Der Nutzer kann Snapshots im Scan-Tab manuell und nur mit Bestätigung löschen
- [ ] **SCAN-12**: Ein einmaliges Analyse-Dokument (`.planning/analysis/GAME-INVENTORY.md`) gleicht einen echten Snapshot mit dem Baseline-Manifest ab und listet konkrete Vorschläge für neue Bot-Aktionen, -Trigger und Tab-Funktionen
- [ ] **SCAN-13**: Vor der Implementierung des Enumerators werden die offenen Fragen (bcModSdk-Rückgabeform, WCE/FBC-Global, Getter-Nebenwirkungen, Asset-Verschachtelungstiefe) per Konsolenbefehl im Spiel geklärt; die Befehle und Ergebnisse sind dokumentiert

## v2 Requirements

Deferred to a later milestone. Tracked but not in current roadmap.

### Scan-Differenziatoren (SCAN-P2)

- **SCAN-P2-01**: Vorschläge für neue Bot-Aktionen/-Trigger werden im Scan-Tab angezeigt und können nach manueller Prüfung in den Bot-Editor übernommen werden
- **SCAN-P2-02**: Pro Mod ein Kompatibilitäts-Badge (erkannt / Version / API vorhanden)
- **SCAN-P2-03**: Hook-Konflikt-Ansicht: welche Spielfunktion wird von mehreren Mods gehookt
- **SCAN-P2-04**: Diff zwischen zwei Snapshots (was ist seit dem letzten Scan neu/entfallen)

### Weitere Entflechtung (SPLIT-P2)

- **SPLIT-P2-01**: Tab-Rendering aus `items.js` in eigene Module
- **SPLIT-P2-02**: `bot-engine.js` in Aktionen / Bedingungen / Generator aufteilen; `bot-ui.js` Rendering trennen
- **SPLIT-P2-03**: Zentrale Debounce-Konfiguration statt 100+ verstreuter Delays

### Tests (TEST-P2)

- **TEST-P2-01**: E2E-Tests der Cross-Window-Flows (Puppeteer/Playwright)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Bundler / Transpiler / `<script type="module">` in Produktion | Static-Hosting ohne Build bleibt; `type="module"` bricht unter `file://` |
| Big-Bang-Rewrite oder Framework | Tool funktioniert; schrittweise Extraktion hinter Tests |
| Eval-basiertes Fuzzing oder Aufruf entdeckter Spielfunktionen | Nebenwirkungen im laufenden Spiel; verletzt Read-only-Prinzip des Scans |
| Automatisch generierter Bot-Code ohne Review | Sicherheits- und Datenrisiko; Vorschläge bleiben manuell zu prüfen |
| Automatisches Aufräumen/Pruning von Snapshots oder Scan-Daten | Verletzt den Kernwert „nie Daten verlieren“ |
| Kopie des BC-Gamecodes oder von Mod-Code im Repo | Inventar wird zur Laufzeit exportiert |
| Server-Backend, Cloud-Sync, Mehrbenutzer | Einziger Nutzer ist der Autor; alles bleibt clientseitig |
| Löschen des Alt-Blobs `PROFILE_SCREENSHOTS` nach Migration | Bleibt als permanenter Rollback-Pfad |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 2 | Complete |
| STAB-02 | Phase 2 | Complete |
| STAB-03 | Phase 2 | Complete |
| STAB-04 | Phase 3 | Complete |
| STAB-05 | Phase 3 | Complete |
| STAB-06 | Phase 3 | Complete |
| STAB-07 | Phase 3 | Complete |
| STAB-08 | Phase 3 | Complete |
| STAB-09 | Phase 2 | Complete |
| STAB-10 | Phase 2 | Complete |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 2 | Complete |
| TEST-05 | Phase 1 | Complete |
| TEST-06 | Phase 1 | Complete |
| TEST-07 | Phase 3 | Complete |
| SPLIT-01 | Phase 4 | Pending |
| SPLIT-02 | Phase 4 | Pending |
| SPLIT-03 | Phase 4 | Pending |
| SPLIT-04 | Phase 4 | Pending |
| SPLIT-05 | Phase 4 | Pending |
| SPLIT-06 | Phase 4 | Pending |
| SPLIT-07 | Phase 4 | Pending |
| SCAN-01 | Phase 5 | Pending |
| SCAN-02 | Phase 5 | Pending |
| SCAN-03 | Phase 5 | Pending |
| SCAN-04 | Phase 5 | Pending |
| SCAN-05 | Phase 5 | Pending |
| SCAN-06 | Phase 5 | Pending |
| SCAN-07 | Phase 5 | Pending |
| SCAN-08 | Phase 5 | Pending |
| SCAN-09 | Phase 6 | Pending |
| SCAN-10 | Phase 6 | Pending |
| SCAN-11 | Phase 6 | Pending |
| SCAN-12 | Phase 6 | Pending |
| SCAN-13 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-12*
*Last updated: 2026-09-12 after roadmap creation (traceability filled)*
