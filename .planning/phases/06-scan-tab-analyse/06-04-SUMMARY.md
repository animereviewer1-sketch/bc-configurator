---
phase: 06-scan-tab-analyse
plan: 04
subsystem: docs
tags: [analysis, game-inventory, baseline-diff, proposals, human-action, docs-only]

# Dependency graph
requires:
  - phase: 06-scan-tab-analyse
    provides: "06-01: baseline-manifest.json (83 Bezeichner, modProbes); 06-02: ⬇-Export (`exportGameSnapshot`, Export-Form `{_meta, snapshot}`); 06-03: tools/analyze-snapshot.js (`npm run analyze`) mit den Badge-Funktionen des Scan-Tabs"
provides:
  - ".planning/analysis/snapshot.json — echter Export aus dem Scan-Tab (BC R132, 38 Mods, 8.308.296 Zeichen JSON, 8.391.668 Bytes auf Platte, schema 1, durationMs 322, errors leer)"
  - ".planning/analysis/GAME-INVENTORY.md — Snapshot vs. Baseline: Übersichtstabelle (7 Kategorien + all, byte-gleich aus `npm run analyze`), 27 nummerierte Vorschläge (10 Bot-Aktionen / 9 Bot-Trigger / 8 Tab-Funktionen), 8 lohnende Mods + Tabelle aller 38 Mods mit Hook-/Patch-Zahlen, Chat-Handler-Pipeline (37 Handler), Nicht übernommen (9 Punkte), Sicherheitshinweis (T-6-07), Methodik"
affects: [phase-verify, next-milestone-planning]

# Actuals
actuals:
  tokens: 21000
  tasks: 2
  commits: 1
plan_head_before: 2399a7a

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Große Snapshot-JSON nie in den Kontext laden: Übersicht über `npm run analyze`, Details über gezielte node-Skripte im Scratchpad (Präfix-Gruppierung, hookedByMods-Ranking, Mod-/Probe-/Handler-Listen, Effect-/AllowActivity-Mengen), Ausgabe gekappt"
    - "Generierte Tabellen (Mod-Liste, Handler-Pipeline) per node-Skript direkt aus dem Snapshot in das Markdown eingefügt — keine handabgeschriebenen Zahlen"

key-files:
  created:
    - .planning/analysis/snapshot.json
    - .planning/analysis/GAME-INVENTORY.md
  modified: []

key-decisions:
  - "Das Dokument wurde nach dem ersten Entwurf (113 Zeilen) auf 202 Zeilen erweitert, um die Plan-Vorgabe 150–350 zu erfüllen — mit zwei inhaltlichen Blöcken (Tabelle aller 38 Mods mit Hook-/Patch-Zahlen und Badge; Chat-Handler-Pipeline mit Prioritäten), beide aus dem Snapshot generiert, kein Fülltext."
  - "NO-CODE-Gate gegen den 06-03-Analyse-Skript-Commit meldet ein Delta in `vitest.config.js` — das ist der bereits vor diesem Plan committete Flaky-Fix `2399a7a` (disableConsoleIntercept), kein Inhalt von 06-04 (Rule 1). Der 06-04-Commit selbst enthält exakt die zwei Analyse-Dateien."
  - "Erwarteter Dateizähler „28 Dateien“ im NO-CODE-Gate auf den Ist-Stand 29 korrigiert (derselbe Drift wie in 06-01/02/03-SUMMARY)."
  - "Mod-Tabelle im Abschnitt „lohnende Mods“ auf 8 Mods (statt Minimum 4) erweitert, weil ULTRAbc (158 Hooks, 13 Patches inkl. Safeword-Funktionen), die Echo-Erweiterungen (44 eigene Asset-Gruppen) und BCAR+ (Chat-Handler @600) direkte Auswirkungen auf konkrete Vorschläge haben."

patterns-established:
  - "Snapshot-Analyse-Workflow: (1) Schema-Check per node-Einzeiler, (2) `npm run analyze -- <file> --limit N`, (3) gezielte Skripte je Frage, (4) Tabellen generieren statt tippen."

requirements-completed: [SCAN-12]

coverage:
  - id: D1
    description: "Echter Snapshot als Beleg im Repo (Nutzer-Checkpoint Task 1): schema 1, gameVersion R132, modCount 38, sizeBytes 8308296"
    requirement: "SCAN-12"
    verification:
      - kind: integration
        ref: "node -e Schema-Check → OK R132 38 Mods; `npm run analyze -- .planning/analysis/snapshot.json --limit 5` druckt `| all | 19942 | 1536 | 18406 | 0 |`"
        status: pass
    human_judgment: false
  - id: D2
    description: "GAME-INVENTORY.md erfüllt alle automatisierten Gates (DOC-OK): BC-Version und „38 Mods“ im Text, `| all |`-Zeile byte-gleich, alle Pflichtüberschriften genau einmal, 27 nummerierte Vorschlagszeilen (≥ 15), 0 Fenced-Code-Blöcke, Methodik-Befehl vorhanden; Acceptance: ≥ 5 Zeilen je Gruppe (10/9/8), Mod-Tabelle 9 Zeilen (≥ 6), T-6-07 genannt, 0× „stunden“, 202 Zeilen (150–350)"
    requirement: "SCAN-12"
    verification:
      - kind: integration
        ref: "Gate-Kette aus 06-04-PLAN.md Task 2 → DOC-OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "Kein Produktions-/Test-/Tool-Code geändert; Commit enthält genau die zwei Analyse-Pfade; Suite unverändert grün (29 Dateien, 383 passed + 2 expected fail)"
    requirement: "SCAN-12"
    verification:
      - kind: integration
        ref: "git show --name-only HEAD → 2 Pfade; git diff 43c2e2e..HEAD -- '*.js' index.html tests tools docs package.json → nur vitest.config.js (Vor-Plan-Commit 2399a7a); npm test exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Stichprobe: jeder in den Vorschlägen genannte Bezeichner kommt in den Skriptausgaben vor — `CharacterSetFacialExpression` (Arität 0), `TimerInventoryRemoveSet` (3), `ChatRoomSyncMemberLeave` (7 Mods), `CraftingSerialize` (1), `Cloth_笨笨蛋Luzi` (174 Assets)"
    requirement: "SCAN-12"
    verification:
      - kind: integration
        ref: "node-Skript-Ausgaben (Aritäts-Liste, hookedByMods-Ranking, assets.groups) im Ausführungsprotokoll"
        status: pass
    human_judgment: false
  - id: D5
    description: "Human-Check (nicht blockierend): Nutzer liest GAME-INVENTORY.md — sind die Vorschläge konkret und plausibel für den eigenen Spielalltag? Stimmen die Übersichtszahlen mit der Zählzeile des Scan-Tabs („Alle“, ohne Suchbegriff) beim selben Snapshot überein?"
    verification: []
    human_judgment: true
    rationale: "Plausibilität der Vorschläge und Abgleich mit der Tab-Anzeige im echten Browser sind Nutzer-Urteile; die Zahlen selbst sind über die gemeinsamen Badge-Funktionen (Plan 06-03) gesichert."

# Metrics
duration: 25min
completed: 2026-09-19
status: complete
---

# Phase 6 Plan 4: Analyse-Dokument Summary

**Der Nutzer hat einen echten Snapshot (BC R132, 38 Mods, 8,3 MB) über den ⬇-Button exportiert; daraus entstand `.planning/analysis/GAME-INVENTORY.md` mit den Zahlen aus `npm run analyze`, 27 konkreten Vorschlägen in drei Gruppen, einer Bewertung von 8 Mods plus der vollständigen Mod- und Chat-Handler-Liste — ohne eine Zeile Code zu ändern.**

## Performance

- 1 Commit, 2 Dateien, 25 min inklusive Nutzer-Checkpoint.
- Snapshot-Auswertung mit 5 Scratchpad-Skripten, die JSON (8,4 MB) wurde nie in den Kontext geladen.

## Accomplishments

- **Task 1 (Nutzer-Checkpoint):** `.planning/analysis/snapshot.json` liegt vor — R132 statt des erwarteten R131, 38 statt 28 Mods (die Session hatte inzwischen mehr Addons); `durationMs` 322, `errors` leer. Damit sind auch UAT-Punkte 1–2 aus Phase 5 faktisch belegt (Scan lief, Export funktioniert).
- **Task 2:** GAME-INVENTORY.md — Übersicht: 19.942 Bezeichner, 1.536 genutzt, 18.406 neu; 12.146 Funktionen auf `window`, davon 19 im Tool; 130 Asset-Gruppen, 102 ohne Tool-Bezug (44 aus der Echo-Kleidungserweiterung); 588 gehookte Funktionen, `ChatRoomMessage` von 19 Mods.
- Vorschläge: 10 Bot-Aktionen (Gesichtsausdruck, Pose, nativer Item-Timer, Zufalls-Item/-Schloss, Alles lösen, Raum-Meldung, Aktivität, Beep, Admin-Aktion), 9 Bot-Trigger (Spieler verlässt, Orgasmus, Item-Änderung, Safeword, Map-Reichweite, Edge/verschlossene Fessel, Beziehung, Status, Handler-Registry), 8 Tab-Funktionen (Craft-Backup, Wardrobe-Import, Chat-Pipeline-Ansicht, Mod-Konflikte-Ansicht, Effekt-Filter, Mod-Gruppen-Warnung, Leinen-Status, Reputation/Skill lesen).
- Mods: LSCG (API `Outfits`/`HypnoTriggers`/`ExportSettings`…), MBS (`wheelOutfits`, `_toItemBundles`), WCE (`fbcChatNotify`, `fbcSendAction`), BCX (API nicht-enumerierbar → nur über Konsole), ULTRAbc (Safeword-Patches), Echo-Erweiterungen, BCOM, BCAR+.

## Task Commits

| Task | Commit | Beschreibung |
|---|---|---|
| 1 | 5d1296d (Nutzer) | Create snapshot.json — erster Upload; Datei anschließend vom Nutzer durch den finalen Export ersetzt |
| 2 | 979f5fa | docs(06-04): GAME-INVENTORY.md — Snapshot vs. Baseline, 27 Vorschläge, lohnende Mods; snapshot.json (R132, 38 Mods) als Beleg |

## Files Created/Modified

- `.planning/analysis/snapshot.json` — 8.391.668 Bytes (`ls -l`), Export-Form `{_meta, snapshot}`.
- `.planning/analysis/GAME-INVENTORY.md` — 202 Zeilen.

## Decisions Made

Siehe `key-decisions` im Frontmatter (Erweiterung auf 202 Zeilen mit generierten Tabellen; NO-CODE-Delta = Vor-Plan-Commit `2399a7a`; Dateizähler 29; 8 statt 4 Mods).

## Deviations from Plan

- **Snapshot-Kopfdaten weichen von der Planannahme ab** (R131/28 Mods → R132/38 Mods): kein Fehler, die BC-Session des Nutzers hat sich weiterentwickelt. Alle Gates prüfen gegen die echten Werte aus der Datei.
- **NO-CODE-Gate:** `git diff 43c2e2e..HEAD` auf Code-Pfade zeigt `vitest.config.js` (+6/−1) — Commit `2399a7a` vom Vortag dieses Plans (Flaky-Fix, im Verlauf dokumentiert). Der Plan-Commit `979f5fa` selbst ist codefrei.
- **Dateizähler 29 statt 28** im Gate (Ist-Stand-Drift, wie 06-01..03).
- Erster Entwurf mit 113 Zeilen unter der Untergrenze → zwei generierte Tabellen ergänzt (siehe key-decisions).

## Issues Encountered

- `ls` zeigt `snapshot.json` als „M“ gegenüber `5d1296d`: der Nutzer hatte die Datei zunächst über GitHub angelegt und danach lokal durch den echten Export ersetzt; der finale Stand ist in `979f5fa` committet.

## User Setup Required

Keine.

## Known Stubs

Keine.

## Next Phase Readiness

- Phase 6 vollständig ausgeführt (4/4 Pläne). Offen: Code-Review (advisory), Verifier, UAT-Datei, `phase.complete`.
- GAME-INVENTORY.md ist die Vorschlagsliste für die nächste Milestone-Planung (Kandidaten mit Aufwand S zuerst: Vorschläge 1–7, 15–17, 22–23, 27).

## End-of-Phase-Human-Checks (nicht blockierend)

1. GAME-INVENTORY.md lesen: Vorschläge konkret und plausibel?
2. Scan-Tab, Kategorie „Alle“, leeres Suchfeld: Zählzeile „N von N Einträgen (G genutzt · U neu)“ beim Snapshot `1789820318831_gi_1789820315130_1` gegen `| all | 19942 | 1536 | 18406 | 0 |` prüfen.
3. Aus 06-03 weiterhin offen: Suche „ChatRoom“ + Filter „Mods“ (38 Zeilen), 🗑 mit „Abbrechen“ beantworten.

## Self-Check: PASSED

- DOC-OK ✅ · Commit-Pfade exakt 2 ✅ · Code-Diff nur Vor-Plan-Commit ✅ · npm test exit 0 (29 Dateien) ✅ · Stichprobe 5 Namen ✅
