# BC Universal Configurator

## What This Is

Ein browserbasiertes Begleit-Tool für Bondage Club (BC), das in einem eigenen Fenster neben dem Spiel läuft und per Bookmarklet-Loader über `postMessage` mit dem Spiel-Tab spricht. Es verwaltet Outfits, Curses, Inventar, Shop, Rang und Geld, scannt Outfits aus dem Spiel (inkl. Screenshots) und enthält einen Bot-Editor, dessen Trigger/Aktionen/Events zu injizierbarem Spielcode kompiliert werden. Alle Daten liegen clientseitig in IndexedDB; gehostet wird statisch auf GitHub Pages. Einziger Nutzer ist der Autor selbst.

## Core Value

Gescannte Daten (Outfits, Versionen, Screenshots, Bots) gehen nie verloren — nichts wird automatisch gelöscht oder überschrieben, und jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen.

## Requirements

### Validated

- ✓ Loader-Bridge per Bookmarklet mit Origin-Prüfung, zweiseitige `postMessage`-Kommunikation Tool ↔ Spiel — existing
- ✓ Asset-Cache aus dem Spiel laden und in IndexedDB persistieren — existing
- ✓ Outfit-/Curse-/Lock-Verwaltung in Tabs, Outfit-Import per BC-Code (lz-string) — existing
- ✓ Outfit-Scan aus dem Spiel mit Versionen (LSCG_DB) und Screenshots pro Version/Profil — existing
- ✓ Bot-Editor: Trigger, Aktionen, Events, Bedingungen (AND/OR); Code-Generator (`bot-engine.js` 1.5.0) injiziert Base64-konfigurierten Spielcode über EXEC — existing
- ✓ Feature-Module Shop, Inventar/Keywarden, Rang, Geld — existing
- ✓ Automatische inkrementelle Backups ins Dateisystem (`bc-autobackup.js`) — existing
- ✓ Stroke-Icon-Bibliothek, Tab-Gruppen (Items / Bots), Dark-Theme mit Kontrast-Überarbeitung (lokal in Arbeit) — existing

### Active

**Stabilisierung**
- [ ] Screenshot-Sync liest denselben Schlüssel (`mk|fp`), unter dem gespeichert wurde — Bug in `_syncLscgScreenshotToProfiles`
- [ ] `idbSet()` erkennt `QuotaExceededError` und zeigt es dem Nutzer; kein stilles Fehlschlagen mehr
- [ ] Löschen von Bildern und einzelnen Outfits/Versionen ist nur manuell und nur nach Bestätigungsdialog möglich — niemals als Nebeneffekt
- [ ] `postMessage(..., "*")` im Tool und im injizierten Code durch origin-spezifische Targets ersetzt; EXEC-Aufrufe werden geloggt
- [ ] Vitest-Testsuite für browserfreie Logik (IDB-Helfer, Bot-Validatoren in `bot-data.js`, Outfit-Import-Parser)

**Entflechtung**
- [ ] Persistenz-Schicht (IDB/localStorage) aus `items.js` in eigenes Modul extrahiert
- [ ] `postMessage`-Protokoll aus `items.js` in eigenes Bridge-Modul extrahiert; `items.js` bleibt Koordinator
- [ ] Screenshots werden einzeln gespeichert statt als ein großes Objekt; keine Voll-Serialisierung von LSCG_DB pro Save

**Gamecode-Scan**
- [ ] Loader exportiert zur Laufzeit ein Inventar des laufenden Spiels: Globals/Funktionen (Player, ChatRoom, Inventory …), Chat-Hooks/Events, Asset-Katalog (Gruppen, Eigenschaften, Sperren, Farben) — einschließlich der von Mods (LSCG, BCX, FBC/WCE, MBS u.a.) hinzugefügten
- [ ] Einmaliges Analyse-Dokument: Abgleich des Inventars mit dem, was Tool und Bot-Editor heute nutzen; Vorschlagsliste neuer Bot-Aktionen/-Trigger und Tab-Funktionen
- [ ] Scan-Tab im Tool: durchsuchbare Fundliste mit Markierung „bereits genutzt“ vs. „neu“

### Out of Scope

- Big-Bang-Rewrite oder Framework-Wechsel — das Tool funktioniert; Entflechtung erfolgt schrittweise hinter Tests
- Build-Toolchain (Bundler, Transpiler) für die Auslieferung — GitHub-Pages-Static-Hosting ohne Build-Schritt bleibt; Vitest läuft nur lokal
- Server-Backend oder Cloud-Sync — alles bleibt clientseitig
- Mehrbenutzer-/Login-Funktionen — einziger Nutzer ist der Autor
- Kopie des BC-Gamecodes im Repo — das Inventar wird zur Laufzeit exportiert; lokal bereitgestellter Code wird nur ergänzend ausgewertet, wenn vorhanden

## Context

- Codebase-Map liegt unter `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- Vanilla JS (ES6+), kein Framework, kein Build; einzige Abhängigkeit lz-string 1.5.0 per CDN. Hosting: GitHub Pages, Origin `https://animereviewer1-sketch.github.io`.
- Größenverhältnisse: `items.js` 11.684 Zeilen (Core-Controller + Persistenz + Bridge + Tab-Rendering), `bot-ui.js` 3.548, `bot-engine.js` 3.356, `loader.js` 1.636.
- Keine automatisierten Tests; bisher nur `node --check`.
- Bekannte Bugs und Sicherheitsfragen sind in `.planning/codebase/CONCERNS.md` mit Zeilenangaben dokumentiert.
- Lokal liegen ~900 uncommittete Änderungen (Kontrast-/Theme-Durchgang in `index.html`, kleinere Anpassungen in Modulen). Sie sind noch in Arbeit und werden nicht durch das Planning committet; der Milestone baut auf ihnen auf.
- Der Nutzer kann bei Bedarf Befehle in der Ingame-Browserkonsole ausführen und die Ausgabe zurückliefern — Research- und Scan-Phasen dürfen darauf bauen (konkrete Befehle vorgeben statt raten).
- Mods, die das Spiel erweitern (LSCG, BCX, FBC/WCE, MBS …), hängen eigene Globals und Hooks ein und müssen beim Gamecode-Scan mit erfasst werden.

## Constraints

- **Datenschutz-Regel**: Gespeicherte Scan-Daten werden nie automatisch gelöscht oder überschrieben — Kernwert des Tools; manuelles Löschen nur mit Bestätigung
- **Tech-Stack**: Vanilla JS ohne Build-Schritt in Produktion — das Tool muss weiterhin als statische Seite deploybar sein
- **Kompatibilität**: Bestehende IDB-Schlüssel (`BC_Bots_v2`, `BC_Outfits_v1`, `LSCG_DB`, `PROFILE_SCREENSHOTS` …) müssen beim Refactoring migrierbar bleiben; kein Datenverlust beim Update
- **Sicherheit**: Die Bridge ist die einzige Vertrauensgrenze — Origin-Prüfung auf beiden Seiten, EXEC nur aus dem Tool-Origin
- **Reihenfolge**: Refactoring erst, wenn die Tests aus der Stabilisierung existieren

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Milestone-Reihenfolge Stabilisierung → Entflechtung → Gamecode-Scan | Refactoring ohne Tests wäre blind; Scan-Feature profitiert von sauberer Bridge | — Pending |
| Löschen bleibt möglich, aber nur manuell mit Bestätigung | Nutzer will Bilder und einzelne Outfits entfernen können; die „nie löschen“-Regel richtet sich gegen automatische Verluste | — Pending |
| Gamecode-Inventar zur Laufzeit über den Loader exportieren | Nutzt die vorhandene Bridge; kein Gamecode im Repo nötig; erfasst Mods automatisch | — Pending |
| Vitest nur für browserfreie Logik, kein E2E in diesem Milestone | Schnellster Weg zu einem Sicherheitsnetz vor dem Refactoring | — Pending |
| Kein Bundler | Static-Hosting-Deployment bleibt trivial; Modulschnitt über normale Script-Includes | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-12 after initialization*
