---
status: testing
phase: 06-scan-tab-analyse
source: [06-VERIFICATION.md, 06-REVIEW.md]
started: 2026-09-19T13:30:00Z
updated: 2026-09-19T13:30:00Z
---

## Current Test

number: 1
name: Scan-Tab auf echten Daten
expected: |
  WICHTIG: Tool hart neu laden (Strg+F5) — scan-tab.js hat nach dem Review einen Fix bekommen. Obertab 🤖 Bots → „🔎 Scan". Kein FATAL-Banner. Der neueste Snapshot ist markiert („BC R132 · 38 Mods · ~8113 KB"). Zählzeile bei Kategorie „Alle" ohne Suchbegriff: „300 von 19960 Einträgen (1554 genutzt · 18406 neu)" — identisch mit der Zeile `| all |` in .planning/analysis/GAME-INVENTORY.md.
awaiting: user response

## Tests

### 1. Scan-Tab auf echten Daten
expected: Nach Strg+F5: Tab „🔎 Scan" öffnet ohne FATAL; neuester Snapshot markiert; Zählzeile „300 von 19960 Einträgen (1554 genutzt · 18406 neu)"
result: [pending]

### 2. Suche und Filter
expected: Suche „ChatRoom" verengt die Liste innerhalb ~150 ms ohne Ruckeln; Kategorie „Mods" zeigt 38 Zeilen, BCX/LSCG/MBS/WCE/Themed mit Badge „bereits genutzt", die übrigen 33 „neu"; Kategorie „Probes": Zeilen wie `mbs.wheelOutfits` und `lscg.LSCG_SleepyMiniGameRun` sichtbar, KEINE Zeile mit „[object Object]"; Kategorie „Globals" (14004 Zeilen) friert nicht ein, „mehr laden" erscheint
result: [pending]

### 3. Löschen fragt und respektiert Abbruch
expected: 🗑 bei einem Snapshot → nativer Bestätigungsdialog mit Datum, BC-Version und Mod-Anzahl; „Abbrechen" → Snapshot bleibt, kein Status; erneut 🗑 → „OK" → Status „✅ Snapshot gelöscht", die anderen Snapshots bleiben (nur wenn du wirklich einen entbehren kannst — sonst nur den Abbruch-Fall testen)
result: [pending]

### 4. Export
expected: ⬇ bei einem Snapshot → Download `BC_Snapshot_<Datum>_R132_<id>.json`, Status „✅ Snapshot exportiert – N KB"; die Datei beginnt mit `{"_meta":{"version":1`
result: [pending]

### 5. Vorschläge plausibel
expected: .planning/analysis/GAME-INVENTORY.md gelesen: Die 27 Vorschläge sind konkret (echter Funktions-/Hook-Name, klarer Nutzen, Aufwand S/M/L) und für deinen Spielalltag plausibel. Nenne die 3–5, die du als nächstes willst — oder welche nicht.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

