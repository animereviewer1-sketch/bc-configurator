---
status: testing
phase: 03-bridge-haertung
source: [03-VERIFICATION.md]
started: 2026-09-14T00:00:00Z
updated: 2026-09-14T00:00:00Z
---

## Current Test

number: 1
name: Live-Smoke-Test aller Bridge-Flows nach der Origin-Härtung
expected: |
  WICHTIG: Vorher Bookmarklet im BC-Tab neu ausführen und das Tool-Fenster neu laden (Loader und Injektionscode haben sich geändert). Dann: Cache laden → Items erscheinen; einen Bot starten (EXEC) → läuft im Spiel; einen Screenshot aufnehmen → erscheint im Outfit-Scan; Raum-Scan auslösen → Ergebnis kommt an. Browser-Konsole (beides: Tool und BC-Tab) zeigt keine Origin-/postMessage-Fehler.
awaiting: user response

## Tests

### 1. Live-Smoke-Test aller Bridge-Flows nach der Origin-Härtung
expected: Nach erneutem Bookmarklet + Tool-Reload funktionieren Cache laden, Bot-Start (EXEC), Screenshot-Aufnahme und Raum-Scan unverändert; keine Origin-Fehler in beiden Konsolen
result: [pending]

### 2. Verbindungsverlust sichtbar + Reconnect
expected: BC-Tab schließen oder neu laden → Status-Badge im Tool wird rot / „Nicht verbunden". Bookmarklet neu ausführen, im Tool „🔄 Verbinden" klicken → Badge grün, Bridge funktioniert wieder
result: [pending]

### 3. EXEC-Log sichtbar und persistent
expected: Nach einem Bot-Start erscheint im Tweaks-Panel unter „📜 EXEC-Log" ein Eintrag mit Zeitstempel und Kurzbeschreibung; nach Tool-Reload ist der Eintrag noch da
result: [pending]

### 4. Loader-seitige Absender-Prüfung (Konsolen-Check im BC-Tab)
expected: |
  In der Konsole des BC-Tabs ausführen:
  window.postMessage({app:'BCKonfigurator', type:'EXEC', code:'console.log("SPOOF")'}, '*')
  → In der Konsole erscheint KEIN „SPOOF" (Nachricht kommt vom BC-Tab selbst, nicht vom gepinnten Tool-Fenster → wird verworfen). Ein regulärer Bot-Start aus dem Tool funktioniert weiterhin.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
