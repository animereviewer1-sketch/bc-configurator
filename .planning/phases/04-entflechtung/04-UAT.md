---
status: testing
phase: 04-entflechtung
source: [04-VERIFICATION.md]
started: 2026-09-15T00:00:00Z
updated: 2026-09-15T00:00:00Z
---

## Current Test

number: 1
name: Vor dem ersten Start: Screenshots exportieren
expected: |
  Tool neu laden (Bookmarklet ebenfalls neu ausführen). Tweaks-Panel → „🖼️ Screenshot-Speicher" → „Screenshots exportieren" → eine JSON-Datei wird heruntergeladen und enthält deine Profil-, Outfit-Scan- und Wheel-Bilder. (Sicherung, bevor die Migration läuft — die Migration selbst löscht nichts, aber sicher ist sicher.)
awaiting: user response

## Tests

### 1. Vor dem ersten Start: Screenshots exportieren
expected: JSON-Export über „🖼️ Screenshot-Speicher" enthält alle drei Bild-Maps; Datei lässt sich mit „Alles importieren" wieder einspielen
result: [pending]

### 2. Alle Tabs unverändert
expected: Items, Outfit, Curse, Inventar, Shop, Rang, Geld, Bot — jeder Tab öffnet, Cache laden, Bot starten, Screenshot aufnehmen funktionieren wie vorher; keine roten Fehler in der Konsole
result: [pending]

### 3. Migration auf echten Daten
expected: DevTools → Application → IndexedDB → BCKonfigurator: Store `screenshots` ist gefüllt; im Store `kv` sind `BC_PROFILE_SCREENSHOTS_v1` / `BC_LSCG_SCREENSHOTS_v1` weiterhin vorhanden (Alt-Blobs eingefroren) und `BC_SCREENSHOT_MIGRATION_v1` = {done:true, count:…}. Die Sektion „🖼️ Screenshot-Speicher" zeigt „Migration abgeschlossen" und die Anzahl. Alle Bilder sind im Tool sichtbar wie vorher.
result: [pending]

### 4. Zweiter Tab blockiert das DB-Update
expected: Tool in Tab A offen lassen, Tool in Tab B öffnen → in einem der beiden erscheint die rote Meldung „Datenbank-Update blockiert – bitte andere Tool-Tabs schließen"; nach Schließen des anderen Tabs und Reload läuft alles normal. Keine Bilder verloren.
result: [pending]

### 5. Ladereihenfolge-Guard
expected: In den DevTools (Network-Tab) `persistence.js` blockieren, Tool neu laden → statt einer leeren/kaputten Seite erscheint eine sichtbare rote FATAL-Box mit Hinweis auf persistence.js. Blockierung wieder aufheben.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
