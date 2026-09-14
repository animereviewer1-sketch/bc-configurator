---
gsd_state_version: "1.0"
current_phase: 4
current_phase_name: Entflechtung
status: executing
stopped_at: Completed 04-02-PLAN.md
last_updated: "2026-09-14T16:47:11.186Z"
last_activity: 2026-09-14
last_activity_desc: Phase 4 execution started
state_head: f89ba37dcb2502dbe3129140900fe61595aaccae
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 13
  completed_plans: 11
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core value:** Gescannte Daten (Outfits, Versionen, Screenshots, Bots) gehen nie verloren — nichts wird automatisch gelöscht oder überschrieben, und jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen.
**Current focus:** Phase 4 — Entflechtung

## Current Position

Phase: 4 (Entflechtung) — EXECUTING
Plan: 3 of 4
Status: Ready to execute
Last activity: 2026-09-14 — Phase 4 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01-testfundament P01 | 12min | 2 tasks | 7 files |
| Phase 01-testfundament P02 | 11min | 3 tasks | 6 files |
| Phase 01-testfundament P03 | 8min | 2 tasks | 2 files |
| Phase 02-speicher-sicherheit P01 | 4min | 3 tasks | 3 files |
| Phase 02-speicher-sicherheit P02 | 15min | 3 tasks | 3 files |
| Phase 02-speicher-sicherheit P03 | 10min | 2 tasks | 3 files |
| Phase 03-bridge-haertung P01 | 25 min | 3 tasks | 4 files |
| Phase 03-bridge-haertung P02 | 20min | 3 tasks | 7 files |
| Phase 03-bridge-haertung P03 | 18min | 2 tasks | 3 files |
| Phase 04-entflechtung P01 | 8min | 3 tasks | 7 files |
| Phase 04-entflechtung P02 | 29min | 3 tasks | 13 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Reihenfolge Tests (Phase 1) → Speicher-Sicherheit (2) → Bridge-Härtung (3) → Entflechtung (4) → Gamecode-Inventar (5) → Scan-Tab & Analyse (6); Refactoring erst hinter grünen Tests
- [Roadmap]: Vitest + fake-indexeddb nur als devDependencies; Produktion bleibt `<script>`-Tags ohne Build; bestehende Dateien per Node-`vm`-Sandbox testen (Pattern A), extrahierte Module per Dual-Export (Pattern B)
- [Roadmap]: Origin-Pinning (STAB-04..06) landet in Phase 3 vor der Bridge-Extraktion (SPLIT-02) in Phase 4
- [Roadmap]: Screenshot-Migration additiv — Alt-Blob `PROFILE_SCREENSHOTS` bleibt als Rollback-Pfad; JSON-Export vor Migration
- [Roadmap]: Gamecode-Inventar zur Laufzeit über den Loader, read-only und gechunkt; kein Gamecode im Repo
- [Phase 1]: type: commonjs in package.json statt module, damit node --check *.js auf Produktionsdateien gueltig bleibt; Vitest liest vitest.config.js trotzdem als ESM
- [Phase 1]: vitest.no-idb.config.js ueberschreibt setupFiles per Objekt-Spread statt mergeConfig, da mergeConfig Arrays konkateniert haette
- [Phase 1]: tests/package.json mit type:module angelegt, damit ESM-Import des Loaders per node -e funktioniert, ohne Root type:commonjs (node --check Kompatibilitaet) zu aendern — Node loest Modultyp pro Datei ueber das naechstgelegene package.json auf; ein Scope unter tests/ betrifft Produktionsdateien im Repo-Root nicht
- [Phase 1]: vm.createContext erzeugt eigene Realm mit eigenen Intrinsics; toThrow(SyntaxError) mit Host-Konstruktor kann nie greifen wenn der Fehler aus der Sandbox stammt — Doppellade-Test leitet den SyntaxError-Konstruktor stattdessen aus dem gefangenen Fehler ab (Object.getPrototypeOf(caught).constructor)
- [Phase 1]: safeName escaped zusaetzlich ' \r \n (TEST-06); \r/\n auf Planer-Ermessen mitgenommen, gleiche Zeile/Fehlerklasse wie escJsAttr in items.js
- [Phase 2]: Fix an _syncLscgScreenshotToProfiles beschraenkt auf Leseseite (Signatur + Schluesselzeile, 3/2 Zeilen); Schleife ueber entry.versions bleibt unveraendert
- [Phase 2]: STAB-02 unveraendert gelassen - Task 1 (TEST-04) lieferte auf Anhieb 10/10 gruene Tests, bestaetigt bereits korrekten Quota-Pfad in idbSet
- [Phase 2]: Helfer-Signatur _removeLscgScreenshotFromProfiles(fp, img) statt nur (fp) — Identitaetspruefung === img unterscheidet synchronisierte Kopie von manuellem Upload
- [Phase 2]: Wheel-Zweig von deleteOsScreenshotFromLb als sechster confirm-loser Pfad mitgefixt (Planer-Probe-Fund)
- [Phase 2]: Init-Hook-Direktaufruf und Listener-Aufruf auf zwei Zeilen gesetzt, damit _speicherZeigeStatus als separat zaehlbare Vorkommen erscheint
- [Phase 3]: Trust-on-first-use Origin-Pinning statt Allowlist; kein Origin-Reset im Heartbeat-Pfad; Bootstrap-PINGs bleiben dokumentierte '*'-Ausnahme — BC läuft auf mehreren Domains (Orchestrator-Entscheidung 1); Heartbeat-Reset würde die Origin-Erzwingung durch einen navigierten Opener umgehbar machen (STAB-07)
- [Phase 03-bridge-haertung]: TOOL_ORIGIN einmalig in items.js definiert; bot-engine.js/bot-ui.js konsumieren das Global statt zu duplizieren
- [Phase 03-bridge-haertung]: bot-engine.js bettet TOOL_ORIGIN als _TOOL_ORIGIN-Kopfzeile im generierten Code ein (JSON.stringify), statt es an jeder der 18 Stellen zu interpolieren
- [Phase 03-bridge-haertung]: loader.js Source-Pinning erlaubt PING immer neu zu pinnen, damit Tool-Reload/manueller Reconnect nach dem ersten Handshake nicht dauerhaft ausgesperrt wird
- [Phase 3]: [Phase 03-bridge-haertung]: EXEC-Log-Block direkt vor _bridgeSenderOk platziert, kein Korrelations-ID-Matching (RESEARCH Anti-Pattern) - reines Sende-Log mit Zeitstempel/Kurzbeschreibung fuer STAB-08
- [Phase 04-entflechtung]: Byte-identische Extraktion (Orchestrator-Entscheidung 1): items.js Zeilen 5-96 per sed/awk extrahiert, nicht abgetippt - diff-Gate leer — Verhindert stille Verhaltensaenderung bei der Extraktion (T-4-01)
- [Phase 04-entflechtung]: Nur die generische localStorage-Migrations-IIFE zieht nach persistence.js um; die 36 Ad-hoc-localStorage-Stellen bleiben in items.js — RESEARCH-Scope-Guardrail gegen ungeplantes Sweeping
- [Phase 04-entflechtung]: bridge.js byte-identisch extrahiert (Node-Skript, nicht abgetippt); Handler-Registry onBridgeMessage/offBridgeMessage; items.js registriert 35 Handler statt switch — Erfolgskriterium 1 (neue Nachrichtentypen ohne items.js) und Sicherheits-Invarianz (Verbatim-Diff-Gates, EXEC-Zaehlung 41/41 unveraendert)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 5]: SCAN-13 muss vor dem Enumerator abgeschlossen sein — Konsolenbefehle für bcModSdk-Rückgabeform, WCE/FBC-Global, Getter-Nebenwirkungen und Asset-Tiefe an den Nutzer geben, Ausgabe dokumentieren
- [Phase 3]: Nach Origin-Pinning Live-Smoke-Test aller Bridge-Flows (Cache, EXEC, Screenshot, Raum-Scan) nötig — nur der Nutzer kann das im Spiel prüfen
- [Repo]: ~900 uncommittete lokale Änderungen (Kontrast-/Theme-Durchgang in `index.html`, Modulanpassungen) — nie durch Planning-Commits stagen; nur `.planning/`-Dateien committen

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-09-14T16:47:11.080Z
Stopped at: Completed 04-02-PLAN.md
Resume file: None
