---
phase: 02-speicher-sicherheit
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - items.js
  - index.html
  - tests/idb-helpers.test.js
  - tests/screenshot-sync.test.js
  - tests/delete-confirmation.test.js
  - tests/delete-consistency.test.js
  - tests/storage-estimate.test.js
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Review beschränkt sich strikt auf `git diff 0d9ddbe..HEAD` für `items.js`/`index.html` sowie die fünf neuen/erweiterten Testdateien. Geprüft wurden gezielt: Fehlverhalten des neuen LSCG→Profil-Aufräum-Helfers (`_removeLscgScreenshotFromProfiles` & Co.), Umgehbarkeit der neu eingeführten `confirm()`-Dialoge, Robustheit von `_speicherZeigeStatus()` gegenüber fehlendem/fehlerhaftem `navigator.storage`, XSS in neuer Markup/Statustext-Ausgabe sowie False-Green-Risiken in den Tests. Die 57 Tests der fünf betroffenen Dateien wurden selbst ausgeführt (`vitest run`) und laufen alle grün.

Kein Blocker gefunden. Die Kernlogik ist korrekt: `confirm()` wird bei allen neu markierten Lösch-Pfaden genau einmal aufgerufen und bricht bei `false` sauber ab (per Byte-Vergleich-Snapshot in `delete-confirmation.test.js` verifiziert). `_speicherZeigeStatus()` fängt fehlendes `navigator`/`navigator.storage` sowie eine verwerfende `estimate()`-Promise ab und schreibt ausschließlich über `textContent` (kein XSS-Vektor, keine `innerHTML`-Nutzung in den neuen Zeilen). Es bleiben drei Warnings: ein realer UI-Inkonsistenz-Bug beim Abbrechen des Lightbox-Löschens, ein Design-Risiko durch Byte-Gleichheits-Heuristik statt Herkunfts-Tracking beim Cross-Version-Cleanup, und eine Inkonsistenz zwischen dem alten `repairOsOutfitCode`-Pfad und dem neuen Cleanup-Vertrag.

## Warnings

### WR-01: `deleteOsScreenshotFromLb` schließt die Lightbox auch, wenn der Nutzer den Lösch-Dialog abbricht

**File:** `items.js:10482-10495`
**Issue:** Die Funktion unterscheidet drei Zweige. Im Wheel-Zweig wird bei `confirm()===false` per `return` sofort abgebrochen und die Lightbox bleibt offen (korrekt). Im `_osLightboxKey`- bzw. `_osLightboxMk`-Zweig wird dagegen an `deleteOsScreenshotKey(...)`/`deleteOsScreenshot(...)` delegiert — beide brechen bei `confirm()===false` intern per `return` ab, ohne dass der Aufrufer das erfährt. `deleteOsScreenshotFromLb` läuft danach unconditioned in `closeOsLightbox()` weiter (Zeile 10494) und setzt `_osLightboxMk`/`_osLightboxKey`/`_osLightboxWheelFp` zurück, obwohl gar nichts gelöscht wurde. Das ist keine Umgehung der Bestätigung selbst (es wird nichts ungefragt gelöscht), aber ein inkonsistentes und irreführendes UI-Verhalten: Abbrechen im Wheel-Zweig lässt die Lightbox offen, Abbrechen im Key/Mk-Zweig schließt sie kommentarlos, als wäre gelöscht worden. `delete-confirmation.test.js` deckt nur den Wheel-Zweig dieser Funktion ab (Zeile 74-78), die Key/Mk-Zweige sind hier ungetestet — der Bug fällt also nicht auf.
**Fix:**
```javascript
function deleteOsScreenshotFromLb() {
  if (_osLightboxWheelFp !== null) {
    if (!confirm('Wheel-Bild löschen?')) return;
    delete _mbsWheelShots[_osLightboxWheelFp];
    _saveMbsWheelShots();
    if (_activeTab === 'lscg-wheel') _renderMbsWheelTab();
  } else if (_osLightboxKey) {
    if (LSCG_SCREENSHOTS[_osLightboxKey] && !confirm(/* gleicher Text wie deleteOsScreenshotKey */)) return;
    deleteOsScreenshotKey(_osLightboxKey);
  } else if (_osLightboxMk) {
    if (LSCG_SCREENSHOTS[_osLightboxMk] && !confirm(/* gleicher Text wie deleteOsScreenshot */)) return;
    deleteOsScreenshot(_osLightboxMk);
  }
  closeOsLightbox();
}
```
Alternativ: `deleteOsScreenshotKey`/`deleteOsScreenshot` so umbauen, dass sie einen Boolean zurückgeben, und `closeOsLightbox()` nur bei `true` aufrufen.

### WR-02: Cross-Version-Screenshot-Entfernung basiert auf Byte-Gleichheit statt Herkunfts-Tracking

**File:** `items.js:7618-7654`
**Issue:** `_removeLscgScreenshotKeyFromProfiles(key)` sammelt für die Entfernung **alle** Fingerprints aller Versionen des Members (`for (const v of LSCG_DB[mk]?.versions ?? [])`), nicht nur den zur gelöschten `key` gehörenden. `_removeLscgScreenshotFromProfiles(fp, img)` löscht dann jeden Profil-Slot, dessen Bild exakt `=== img` ist. Das eigene Test-Fixture (`delete-consistency.test.js:29`, Slot `Anna_v2c: 'data:img1'`) zeigt, dass dieses Verhalten bewusst so vorgesehen ist ("Cross-Version-Kopie", getestet in Zeile 56-61 und 92-98) — vermutlich um einen bestehenden Sync-Nebeneffekt zu kompensieren: `_syncLscgScreenshotToProfiles` (Schleifenlogik unverändert, Zeile 7604-7614) kopiert ein für **eine** Version aufgenommenes Bild in **alle** Fingerprint-Gruppen des Members, sofern der Ziel-Slot noch leer ist — dadurch können Slots eines anderen Fingerprints fälschlich das Bild einer anderen Version erhalten. Die neue Lösch-Logik räumt das symmetrisch wieder auf, was in diesem Sync-Restfall korrekt ist.
Das eigentliche Risiko: Es gibt in `PROFILE_SCREENSHOTS` keinerlei Herkunfts-Markierung ("synced" vs. "manuell hochgeladen"), es wird ausschließlich über Byte-Gleichheit (`===` auf den Data-URL-String) entschieden. Lädt ein Nutzer bewusst genau dieselbe Bild-Datei erneut manuell für ein anderes Profil desselben Charakters hoch (das zufällig einen anderen Fingerprint-Cluster desselben Members belegt), wird dieses manuelle Bild beim Löschen des ursprünglichen LSCG-Screenshots ohne gesonderten Hinweis mitentfernt — der Confirm-Text nennt nur pauschal "Synchronisierte Kopien … werden mit entfernt", nicht dass dabei auch inhaltsgleiche, aber eigenständig hochgeladene Bilder in fremden Fingerprint-Gruppen desselben Members betroffen sein können. Das steht im Spannungsfeld zum Kernwert "Daten gehen nie verloren / manuelles Löschen nur mit Bestätigung", auch wenn ein exakter Byte-Treffer bei echten Fotos/Screenshots praktisch selten vorkommen dürfte.
**Fix:** Herkunft explizit tracken statt über Bildinhalt zu raten, z.B. eine parallele Map `_profileScreenshotSyncSource = { [slotName]: 'mk|fp' }`, die beim Sync gesetzt und beim Entfernen ausgelesen wird (kein `===`-Bildvergleich mehr nötig). Minimal-Fix ohne neue Datenstruktur: `_removeLscgScreenshotKeyFromProfiles` nur mit dem zur `key` gehörenden Fingerprint aufrufen statt mit allen Versions-Fingerprints des Members — das schränkt den Blast-Radius auf die tatsächlich betroffene Version ein (idealerweise zusammen mit einer Korrektur von `_syncLscgScreenshotToProfiles`, den Sync ebenfalls nur auf den korrekten Fingerprint zu beschränken).

### WR-03: `repairOsOutfitCode` löscht den LSCG-Screenshot ohne den neuen Cleanup-Helfer aufzurufen

**File:** `items.js:8062-8066` (außerhalb des Diffs, aber im gleichen Datenpfad wie die neuen Helfer)
**Issue:** `window.repairOsOutfitCode` löscht `LSCG_SCREENSHOTS[vKey]` direkt (`delete LSCG_SCREENSHOTS[vKey]; _saveLscgScreenshots();`), ohne vorher `_removeLscgScreenshotKeyFromProfiles(vKey)` aufzurufen. `tests/delete-confirmation.test.js:150` listet dies bewusst als Ausnahme ("Konsolen-Reparatur, nicht UI-erreichbar"). Das führt zu keinem Datenverlust — im Gegenteil: Es bleibt eine jetzt veraltete Profil-Kopie des alten (fehlerhaften) Outfit-Screenshots stehen, während `LSCG_SCREENSHOTS` selbst beim nächsten Capture das neue Bild bekommt. Das unterläuft aber die mit dieser Phase eingeführte Konsistenz-Garantie "Löschen eines LSCG-Bildes hinterlässt keine verwaisten Kopien" partiell: Nach einem Code-Repair kann ein Profil-Slot dauerhaft ein Bild zeigen, das nicht mehr zum aktuellen Outfit-Code passt.
**Fix:** In `repairOsOutfitCode` vor dem `delete LSCG_SCREENSHOTS[vKey]` ebenfalls `_removeLscgScreenshotKeyFromProfiles(vKey)` aufrufen, analog zu `deleteLscgVersion`.

## Info

### IN-01: `_speicherFormatBytes`/`_speicherFormat` verschlucken NaN/negative Werte stillschweigend

**File:** `items.js:553-565`
**Issue:** `n = Number(n) || 0;` normalisiert sowohl `NaN` als auch echte `0`-Werte auf `0`; ein negativer Wert (z.B. durch eine kaputte `estimate()`-Response) würde unverändert durchgereicht und zu einer Anzeige wie "-0,0 MB" führen. Da `navigator.storage.estimate()` laut Spezifikation nur nicht-negative Zahlen liefert, ist das Risiko gering, aber die Funktion würde einen tatsächlich fehlerhaften API-Wert lautlos als "0 MB"/"Kontingent unbekannt" bzw. mit falschem Vorzeichen anzeigen statt sichtbar zu scheitern.
**Fix:** Optional `if (!Number.isFinite(n) || n < 0) return 'Speicherangabe ungültig';` als Guard ergänzen.

### IN-02: Init-Hook nutzt leeren Catch-Block (konsistent mit bestehendem Stil, aber erwähnenswert)

**File:** `items.js:584-587`
**Issue:** `try { if (document.readyState !== 'loading') _speicherZeigeStatus(); else document.addEventListener(...); } catch (e) {}` schluckt Fehler ohne Logging. Das entspricht exakt dem bereits vorhandenen Muster für andere DOMContentLoaded-Init-Hooks im selben File (z.B. `try { if (document.readyState!=='loading') _applyGroupUI('items'); else ... } catch(e){}` bei Zeile 4296), ist also keine neue Abweichung, sondern übernommener Stil. Nur der interne `catch` in `_speicherZeigeStatus` selbst loggt korrekt per `console.warn`. Praktisch unkritisch, da dieser äußere Codepfad kaum werfen kann.
**Fix:** Kein Handlungsbedarf für diese Phase; falls der Stil projektweit vereinheitlicht wird, `console.warn('[Speicher] Init-Hook:', e)` ergänzen.

### IN-03: Fixture-Duplikation zwischen `delete-confirmation.test.js` und `delete-consistency.test.js`

**File:** `tests/delete-confirmation.test.js:25-47`, `tests/delete-consistency.test.js:22-44`
**Issue:** Beide Dateien definieren dasselbe Fixture (`setState` mit identischen `db`/`shots`/`fpMap`/`profShots`-Literalen) redundant. Kein funktionaler Fehler, aber Wartungsrisiko: Ändert sich das Datenmodell (z.B. neues Feld an `versions`), muss es an zwei Stellen synchron gepflegt werden.
**Fix:** Fixture in ein gemeinsames `tests/helpers/lscgFixture.js` auslagern und in beiden Testdateien importieren.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
