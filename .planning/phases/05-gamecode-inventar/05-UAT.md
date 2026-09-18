---
status: testing
phase: 05-gamecode-inventar
source: [05-VERIFICATION.md]
started: 2026-09-19T00:00:00Z
updated: 2026-09-19T00:00:00Z
---

## Current Test

number: 1
name: Live-Scan im echten Spiel
expected: |
  WICHTIG: Bookmarklet im BC-Tab neu ausführen (Loader hat den Enumerator bekommen) und Tool neu laden. Tweaks-Panel → „🔎 Spiel-Scan" → „🔎 Spiel scannen". Die Statuszeile zählt „Scan läuft… Schritt 1/6 … 6/6" hoch, der Button ist währenddessen gesperrt, der BC-Tab bleibt die ganze Zeit bedienbar (Chat scrollen, klicken). Am Ende: „Letzter Scan … · BC R131 · 28 Mods · N KB · 1 Snapshot gespeichert".
awaiting: user response

## Tests

### 1. Live-Scan im echten Spiel
expected: Nach Bookmarklet + Reload: Scan-Klick → Fortschritt 1/6…6/6, Button gesperrt, BC-Tab bleibt bedienbar, Abschluss-Status mit BC-Version, Mod-Anzahl (28), Größe
result: [pending]

### 2. Snapshot-Größe aus der Konsole
expected: In der Tool-Konsole erscheint `[GameScan] Snapshot-Größe (JSON-Zeichen): <Zahl> · Mods: 28 · BC R131 · Dauer ms: <Zahl>`. Bitte die Zahl hier melden (Erwartung aus der Recherche: 2–3 Mio. Zeichen; alles unter 20 Mio. ist okay)
result: [pending]

### 3. Snapshot in den DevTools
expected: DevTools → Application → IndexedDB → BCKonfigurator → `snapshots`: ein Datensatz mit `gameVersion: "R131"`, `modCount: 28`, `inventory.globals` (~18.700 Einträge gruppiert), `inventory.assets` (4764), `inventory.bcModSdk.patching` (546)
result: [pending]

### 4. Zweiter Scan behält den ersten
expected: Erneut scannen → `snapshots` hat zwei Datensätze, der erste unverändert; Statuszeile „2 Snapshots gespeichert"
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
