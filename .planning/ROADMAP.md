# Roadmap: BC Universal Configurator

## Overview

Das Tool funktioniert, ist aber ein 11.700-Zeilen-Monolith ohne Tests, mit einer Bridge, die an jeden Origin sendet, und einer Persistenz, die Fehler still verschluckt. Dieser Milestone legt zuerst ein Testnetz über den unveränderten Code, verankert dann den Kernwert („nichts geht verloren, jede Speicherung ist erfolgreich oder sichtbar fehlgeschlagen") in Persistenz und Bridge, extrahiert danach `persistence.js` und `bridge.js` hinter diesen Tests und baut auf den sauberen Schnittstellen den Gamecode-Scan: ein read-only erhobenes Inventar des laufenden Spiels samt Mods, dauerhaft als Snapshot gespeichert, im Scan-Tab durchsuchbar und als Analyse-Dokument mit konkreten Vorschlägen für neue Bot-Aktionen und Tab-Funktionen ausgewertet. Jede Phase hinterlässt ein voll funktionsfähiges Tool.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Testfundament** - Vitest-Harness mit Node-`vm`-Sandbox und fake-indexeddb-Canary läuft grün gegen den unveränderten Produktionscode; browserfreie Logik ist getestet
- [ ] **Phase 2: Speicher-Sicherheit** - Screenshot-Sync-Bug behoben, Quota-Fehler sichtbar, Speicherstand ablesbar, Löschen nur manuell mit Bestätigung und konsistent über alle Stores
- [ ] **Phase 3: Bridge-Härtung** - Origin-gepinnte postMessage auf beiden Seiten und im injizierten Code, gemeinsame Origin-Konstante, Verbindungsverlust sichtbar, EXEC-Log
- [ ] **Phase 4: Entflechtung** - `persistence.js` und `bridge.js` extrahiert, `items.js` nur noch Koordinator, Screenshots einzeln im eigenen Store mit additiver, verifizierter Migration
- [ ] **Phase 5: Gamecode-Inventar** - Konsolen-Klärung, dann Loader-Enumerator (Globals, Assets, Hooks, Mods) read-only und gechunkt; jeder Scan als versionierter Snapshot
- [ ] **Phase 6: Scan-Tab & Analyse** - Baseline-Manifest, durchsuchbarer Scan-Tab mit „genutzt/neu"-Badges und manuellem Löschen, Analyse-Dokument mit Vorschlagsliste

## Phase Details

### Phase 1: Testfundament
**Goal**: Der bestehende Code steht unter Test, bevor er angefasst wird — `npm test` läuft lokal grün gegen die unveränderten Produktionsdateien, und die browserfreie Logik ist abgedeckt.
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. `npm test` führt die Vitest-Suite lokal aus und endet grün; `index.html` und die `<script>`-Tags sind unverändert, es gibt keinen Build-Schritt für die GitHub-Pages-Auslieferung
  2. Die Tests laden `items.js`, `bot-data.js` und `outfit-import.js` ohne Quelländerung per Node-`vm`-Sandbox und greifen auf deren Globals zu
  3. Entfernt man `fake-indexeddb` aus den `setupFiles`, schlägt genau ein Canary-Test mit klarer Meldung fehl — ein stilles Zurückfallen auf den localStorage-Pfad ist ausgeschlossen
  4. Bot-Validatoren aus `bot-data.js` und der Outfit-Import-Parser sind mit gültigen und ungültigen Eingaben getestet; ungültige Eingaben werden nachweislich abgelehnt
  5. Der Bot-Code-Generator erzeugt für Nutzerdaten mit Backticks, `${` und Sonderzeichen Code, den `new Function()` ohne SyntaxError akzeptiert
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Vitest-Toolchain (package.json, .gitignore, vitest.config.js, Meta-Config) + IDB-Canary; Legitimitäts-Checkpoint vor `npm install` (TEST-01, TEST-03) — Wave 1
- [ ] 01-02-PLAN.md — vm-Sandbox-Loader `tests/helpers/loadScript.js`, Ladetest + idbGet/idbSet-Round-Trip, Bot-Validatoren-Tests (`_normLogik`/`_migriereLogik`), Outfit-Import-Parser-Tests mit echtem lz-string (TEST-02, TEST-05) — Wave 2
- [ ] 01-03-PLAN.md — Escaping-Test für `_buildBotCode` (RED) + minimaler Fix in bot-engine.js Zeile 49 (GREEN), chirurgischer Commit (TEST-06) — Wave 2, parallel zu 01-02

### Phase 2: Speicher-Sicherheit
**Goal**: Jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen, und gespeicherte Scan-Daten verschwinden nie als Nebeneffekt — der Kernwert ist im Code verankert und getestet.
**Depends on**: Phase 1
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-09, STAB-10, TEST-04
**Success Criteria** (what must be TRUE):
  1. Ein Screenshot einer gescannten Outfit-Version erscheint nach dem Profil-Sync im Profil — Schreib- und Leseschlüssel `mk|fp` sind identisch gebildet
  2. Läuft der Speicher voll (`QuotaExceededError`), sieht der Nutzer sofort eine Fehlermeldung in der UI; der Quota-Pfad von `idbSet` und die `idbGet`/`idbSet`-Helfer sind per Test abgedeckt
  3. Der Nutzer kann belegten und verfügbaren Speicher (`navigator.storage.estimate()`) im Tool ablesen
  4. Bilder, einzelne Outfits und Outfit-Versionen lassen sich nur über eine explizite Nutzeraktion mit Bestätigungsdialog löschen; kein anderer Code-Pfad entfernt gespeicherte Scan-Daten
  5. Nach einem bestätigten Löschvorgang existiert der Datensatz in keinem der Speicherorte mehr (LSCG_DB, LSCG_SCREENSHOTS, PROFILE_SCREENSHOTS) — keine verwaisten Einträge
**Plans**: TBD
**UI hint**: yes

### Phase 3: Bridge-Härtung
**Goal**: Die Bridge ist die einzige, nachvollziehbare Vertrauensgrenze — beide Seiten sprechen nur mit dem bekannten Gegen-Origin, Verbindungsverlust ist sichtbar, und jeder EXEC ist protokolliert.
**Depends on**: Phase 1
**Requirements**: STAB-04, STAB-05, STAB-06, STAB-07, STAB-08, TEST-07
**Success Criteria** (what must be TRUE):
  1. Kein `postMessage(..., "*")` mehr im Tool, im Loader und im generierten Bot-Code — Tool→Spiel nutzt den beim Handshake gelernten Spiel-Origin, Spiel→Tool den statischen Tool-Origin
  2. Beide Bridge-Seiten prüfen `event.origin` und `event.source` gegen eine einzige gemeinsame Origin-Konstante; Nachrichten von fremdem Origin werden ignoriert, und das ist mit simulierten Nachrichten (Typen, Origin-Prüfung, Handler-Dispatch) getestet
  3. Geht der Spiel-Tab verloren (`window.opener` null oder kein Heartbeat), zeigt das Tool den Verbindungsverlust sichtbar an und bietet erneutes Verbinden an
  4. Jeder EXEC-Aufruf erscheint mit Zeitstempel und Kurzbeschreibung in einer Log-Ansicht im Tool
  5. Alle bestehenden Bridge-Flows (Cache laden, EXEC, Screenshot-Aufnahme, Raum-Scan) funktionieren nach der Härtung im Live-Smoke-Test unverändert
**Plans**: TBD
**UI hint**: yes

### Phase 4: Entflechtung
**Goal**: Persistenz und Bridge sind eigenständige, testbare Module, `items.js` koordiniert nur noch, und Screenshots liegen einzeln in einem eigenen Store — ohne Verhaltensänderung und ohne Datenverlust.
**Depends on**: Phase 2, Phase 3
**Requirements**: SPLIT-01, SPLIT-02, SPLIT-03, SPLIT-04, SPLIT-05, SPLIT-06, SPLIT-07
**Success Criteria** (what must be TRUE):
  1. `persistence.js` und `bridge.js` laufen unverändert als klassische `<script>`-Tags auf GitHub Pages und sind in Vitest per Dual-Export importierbar; ein neuer Nachrichtentyp lässt sich per `onBridgeMessage(type, handler)` registrieren, ohne `items.js` zu ändern
  2. Alle bestehenden Tabs (Outfits, Curses, Inventar, Shop, Rang, Geld, Bots) funktionieren nach der Extraktion unverändert; `items.js` enthält keine eigene IDB- oder postMessage-Logik mehr
  3. Fehlt ein Modul in der Ladereihenfolge, zeigt das Tool beim Start eine sichtbare Fehlermeldung statt still auszufallen; die Reihenfolge der Script-Tags ist dokumentiert
  4. Das Speichern eines Screenshots schreibt genau einen Datensatz in den neuen Store und serialisiert weder das gesamte `PROFILE_SCREENSHOTS`-Objekt noch `LSCG_DB`
  5. Vor der Migration kann der Nutzer einen JSON-Export aller Screenshot-Daten auslösen; nach der Migration stimmen Anzahl und Schlüssel im neuen Store mit dem Alt-Blob überein, der Alt-Blob bleibt erhalten, die Migration ist als abgeschlossen markiert, und ein durch einen zweiten Tab blockierter `versionchange` wird dem Nutzer angezeigt
**Plans**: TBD

### Phase 5: Gamecode-Inventar
**Goal**: Der Nutzer löst im Tool einen Scan aus und erhält ein vollständiges, read-only erhobenes Inventar des laufenden Spiels inklusive Mods — dauerhaft als versionierter Snapshot gespeichert, ohne dass der Spiel-Tab einfriert.
**Depends on**: Phase 4
**Requirements**: SCAN-13, SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07, SCAN-08
**Success Criteria** (what must be TRUE):
  1. Die offenen Fragen (bcModSdk-Rückgabeform, WCE/FBC-Global, Getter-Nebenwirkungen, Asset-Verschachtelungstiefe) sind per Konsolenbefehl im Spiel geklärt, bevor der Enumerator gebaut wird; Befehle und Ergebnisse sind dokumentiert
  2. Ein Klick auf „Scan" im Tool liefert über `GET_GAME_INVENTORY` / `GAME_INVENTORY_DATA` ein Inventar mit Core-Globals und -Funktionen (Typ + Parameteranzahl), Asset-Katalog (Gruppen, Items, Eigenschaften, Sperren, Farben/Layer — auch jenseits des bestehenden Caches) und registrierten Chat-Handlern/Ereignis-Hooks
  3. Das Inventar listet alle über `bcModSdk` registrierten Mods mit Version sowie jede gehookte Spielfunktion samt hookenden Mods; BCX, MBS, LSCG und WCE/FBC werden auch ohne SDK-Registrierung per Fallback-Probe erkannt und ihre öffentliche API erfasst
  4. Während des Scans bleibt der Spiel-Tab bedienbar; die Enumeration ruft keine entdeckten Funktionen auf, meidet Getter mit Nebenwirkungen, ist in Tiefe und Umfang begrenzt und läuft gechunkt
  5. Jeder Scan liegt danach als Snapshot mit BC-Version, Zeitstempel und Mod-Liste in IndexedDB; frühere Snapshots bleiben unverändert erhalten und werden nie automatisch entfernt
**Plans**: TBD

### Phase 6: Scan-Tab & Analyse
**Goal**: Der Nutzer sieht auf einen Blick, was das Spiel und seine Mods bieten und was das Tool davon noch nicht nutzt — durchsuchbar im Tool und als konkrete Vorschlagsliste im Analyse-Dokument.
**Depends on**: Phase 5
**Requirements**: SCAN-09, SCAN-10, SCAN-11, SCAN-12
**Success Criteria** (what must be TRUE):
  1. Ein Baseline-Manifest listet nachvollziehbar, welche Spielfunktionen, Assets und Hooks Tool und Bot-Editor heute bereits verwenden
  2. Im Scan-Tab kann der Nutzer die Fundliste durchsuchen und nach Kategorie filtern; jeder Eintrag trägt das Badge „bereits genutzt" oder „neu" gegenüber dem Baseline-Manifest
  3. Snapshots lassen sich im Scan-Tab nur manuell und nach Bestätigungsdialog löschen; ohne Bestätigung bleibt alles erhalten
  4. `.planning/analysis/GAME-INVENTORY.md` gleicht einen echten Snapshot mit dem Baseline-Manifest ab und nennt konkrete Vorschläge für neue Bot-Aktionen, -Trigger und Tab-Funktionen
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Testfundament | 0/TBD | Not started | - |
| 2. Speicher-Sicherheit | 0/TBD | Not started | - |
| 3. Bridge-Härtung | 0/TBD | Not started | - |
| 4. Entflechtung | 0/TBD | Not started | - |
| 5. Gamecode-Inventar | 0/TBD | Not started | - |
| 6. Scan-Tab & Analyse | 0/TBD | Not started | - |
