# Bilder werden nur bei Bedarf geladen

Seit diesem Umbau liest das Tool beim Start **nur die Schlüssel** der Bilder (Millisekunden). Die Bilder selbst (zusammen über 1 GB) liegen
in der Datenbank (`screenshots`) und kommen erst in den Arbeitsspeicher, wenn sie gebraucht werden. Am Datenbankformat hat sich nichts geändert.

## Die eine Regel

> **„Nicht im Speicher“ heißt nicht „kein Bild“.**

`PROFILE_SCREENSHOTS[k]`, `LSCG_SCREENSHOTS[k]` und `_mbsWheelShots[k]` sind nur noch ein **Zwischenspeicher**. Wer wissen will, ob es ein Bild gibt,
fragt `_hatBild(art, key)` (prüft Speicher **und** Schlüssel). Wer ein Bild braucht, holt es:

| Ich brauche … | Dann … |
|---|---|
| zu wissen, ob ein Bild existiert | `_hatBild(art, key)` – nie `MAP[key]`. Ist unbekannt, welche es gibt (`!_bildExistenzSicher(art)`): nichts erzeugen. |
| ein bestimmtes Bild (Großansicht, Kopieren, …) | `await _bildHolen(art, [keys])`, danach aus der Map lesen |
| ein Bild löschen, das evtl. nicht geladen ist | `if (MAP[k]) delete MAP[k]; else idbScreenshotDelete(art, k);` und `_bildKeyWeg(art, k)` |
| das **ganze** Archiv (Serien, „Alle löschen“, Vergleiche) | `bilderVollLaden([arten])` – das Archiv bleibt dann im Speicher (`_bilderVollstaendig` für Funktionen mit Rückfrage) |
| das ganze Archiv **nur kurz** (Sicherung, Export) | `const leihe = await bilderAusleihen(); try { … } finally { leihe.zurueck(); }` – danach nimmt das Tool die unveränderten Bilder wieder aus dem Speicher |

## Was nie passieren darf

- Ein vorhandenes Bild durch ein neues ersetzen, nur weil es nicht in der Map steht (Import, Auto-Bild, Kopie ins Profil, „fehlende Bilder erzeugen“).
- Eine Datenbankzeile löschen, weil ihr Schlüssel nicht in der Map steht. `_screenshotFlush` löscht nur Schlüssel, die der **Schatten** kennt
  und die aus der Map entfernt wurden. Freigeben (`_bilderFreigeben`) entfernt darum immer aus **Map und Schatten zugleich** und nur Bilder, die
  genau so in der Datenbank stehen.
- Eine Sicherung/Export aus einer unvollständigen Map schreiben. Immer `bilderAusleihen()`.

## Bausteine (items.js, Abschnitt „Bilder nur bei Bedarf“)

`_bildStart` (Start: Schlüssel) · `_bildHolen` (einzelne Bilder) · `bilderVollLaden` / `bcBilderGeladen` (alles, bleibt) · `bilderAusleihen`
(alles, geliehen) · `_bilderFreigeben` · `_bildAnzahl` (geladen + noch nicht geladen) · `_lscgBildAusstehend`/`_lscgBildDann` (LSCG-Großansicht mit
Rückfall auf Profil-Kopien) · `_lscgKopienAusstehend`/`_lscgKopienLaden` (Löschen mit Profil-Kopien).

Ließen sich die Schlüssel beim Start nicht lesen, lädt das Tool wie früher alles – sonst wüsste es nie, welche Bilder es gibt.

## Tests

`tests/bilder-bei-bedarf.test.js` (Schutzstellen, Leihe/Freigeben, Auto-Backup), `tests/bilder-laden.test.js` (Lade-Mechanik). Test-Helfer: `loadScript(…, { bilderEcht: true })`
lädt wie im Tool; ohne den Schalter gilt das Archiv in Tests als vollständig geladen.

## Noch offen

- Wer viel durch die Listen scrollt, lädt nach und nach wieder viele Bilder (kein Höchstwert für den Zwischenspeicher).
- Die tägliche Auto-Sicherung und die Sicherung von Hand laden das ganze Archiv kurz (Spitze wie früher, aber nur dann). Ein Streamen direkt aus der Datenbank würde auch die Spitze beseitigen.
- `openOsCanvasTab` und `osThumbClick` (in `docs/UNGENUTZT.md` als ohne Aufrufer geführt) lesen noch direkt aus der Map; vor einer Wiederverwendung auf `_hatBild`/`_bildHolen` umstellen.
