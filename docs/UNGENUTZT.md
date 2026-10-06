# Ungenutzter Code und ungenutzte gespeicherte Daten (Stand 6.10.2026)

Ergebnis einer reinen Leseprüfung. **Nichts davon wurde gelöscht.** Entfernt wird nur nach ausdrücklicher Freigabe.
Gesucht wurde in allen Produktionsdateien (ohne Tests, `tools/`, `docs/`, `node_modules/`, `archiv/`).

## 1. Dateien, die `index.html` nicht lädt

| Datei | Zweck | Einschätzung |
|---|---|---|
| `loader.js` | Bookmarklet-Brücke im BC-Tab | **in Benutzung** (wird per Bookmarklet geladen) |
| `dogs-lock-remover.user.js` | Userscript | eigenständig, in Benutzung falls installiert |
| `vitest.config.js`, `vitest.no-idb.config.js` | Test-Konfiguration | in Benutzung (Tests) |
| `spielerprofile.js` | ausgebauter Tab „Spielerprofile“ | **ungenutzt** – Vorlage für eine Lösung direkt im Spiel; hängt an `tests/spielerprofile*.test.js` |
| `lscg-rettung.js` | einmaliges Wiederherstellungsskript (20.8.2026) | **ungenutzt** |
| `lscg-namen.js` | einmaliges Skript: Namen nachtragen (20.8.2026) | **ungenutzt** |
| `wheel-rettung.js` | einmaliges Rettungsskript (28.8.2026) | **ungenutzt** |
| `wheel-import-rettung.js` | einmaliges Rettungsskript (19.8.2026) | **ungenutzt** |

Vorschlag: die vier Rettungsskripte nach `archiv/rettung/` verschieben (nicht löschen).

## 2. Funktionen ohne einen einzigen Aufrufer (30)

Gesucht wurde jedes Vorkommen des Namens in allen Produktionsdateien einschließlich Inline-Handlern in `index.html` und Code-Vorlagen in Zeichenketten.

| Datei | Funktionen |
|---|---|
| `items.js` (15) | `openOutfit`, `closeOutfit`, `openProfiles`, `closeProfiles`, `_profileDupSet`, `profileExportSingle`, `loadProfileByIdx`, `_getAnyLscgScreenshot`, `openOsCanvasTab`, `toggleOsChar`, `applyFusamLock`, `mbsWheelToggleItems`, `osThumbClick`, `saveOutfitToLscg`, `copyLscgOutfitCode` |
| `bot-ui.js` (4) | `condSetZone`, `_quelleCrafts`, `_actBeiF`, `_loadLogsFromStorage` |
| `shop.js` (3) | `_shopKatalogAuffrischen`, `_shopSaveFormState`, `_shopRestoreFormState` |
| `bot-data.js` (2) | `_logKnownPlayers`, `evFire` |
| `bot-engine.js` (1) | `_nsUnregister` |
| `spielerprofile.js` (5) | `spielerDbReparieren`, `spSuche`, `spSetFilter`, `spModFilter`, `spSortWechseln` (Teil des ungenutzten Moduls) |

Nur noch von Tests oder Werkzeugen aufgerufen (im Produktionscode ohne Aufrufer): `_backupZuExport`, `osToggleFavFilter`, `_osItemCount` (`items.js`) und `spielerSichtung`, `spBilderAusCache`, `spAutoBilderSetzen`, `spielerProfileExport` (`spielerprofile.js`).

Vor dem Entfernen jeweils prüfen, ob ein Test die Funktion absichert (dann Test mit entfernen).

## 3. Gespeicherte Daten, die die aktuelle Version nicht mehr benutzt

Die Liste der benutzten Schlüssel steht in `speicher.js` (`SPEICHER_AKTIV`) und wird von `tests/speicher.test.js` gegen den Code geprüft.
Das Tool zeigt unter **Einstellungen → Speicher** live, was in *deiner* Datenbank liegt und nicht dazugehört, und entfernt es nach Rückfrage.

| Gruppe | Schlüssel | Hinweis |
|---|---|---|
| Eingefrorene Alt-Kopien der Bilder | `BC_PROFILE_SCREENSHOTS_v1`, `BC_LSCG_SCREENSHOTS_v1`, `BC_MBS_WHEEL_SS_v1` | Stand von vor dem Umzug der Bilder in den Bild-Speicher; früher laut Export-Info über 400 MB. Wird nur entfernt, wenn die geprüfte Übernahme (`BC_SCREENSHOT_MIGRATION_v1`) abgeschlossen ist. |
| Ausgebauter Tab „Spielerprofile“ | `BC_SPIELERPROFILE_v1`, `BC_SPIELERCACHE_META_v1`, `BC_SPIELERBILD_v1:<nr>` (ein Schlüssel je Spieler), `BC_SPIELERPROFILE_SORT_v1`, `BC_SPIELERPROFILE_AUTOBILD_v1` | Lässt sich im Spiel aus dem WCE/FBC-Speicher neu einlesen. |
| Früher benutzt, heute ersetzt | `BC_CURSE_DEFAULT_OUTFIT_v1`, `BC_CURSE_DEFAULT_OUTFIT_v2`, `BC_CACHE_v11`, `BC_RoomEver_v1` | Der Code entfernt einige beim Start selbst. |
| Alles andere, was nicht in der Liste steht | – | wird als „unbekannt“ einzeln angeboten |

## 4. Warum das auch eine Speicher-Frage war

`idbKvAlle()` (Gesamt-Backup, Auto-Backup, Export-Info, Einspielen) las bisher **alle** Werte der Datenbank in den Arbeitsspeicher – auch die eingefrorenen Alt-Kopien der Bilder. Das waren laut früherer Export-Info rund 436 MB, kurzzeitig doppelt (Lesen und Aussortieren) – der Sprung von etwa 800 auf 1.700 MB, der den Tool-Tab mit „Out of Memory“ abstürzen ließ. Seit dieser Änderung werden die Alt-Kopien beim Lesen übersprungen (`idbKvAlle({ mitAltKopien: true })` liest sie ausdrücklich doch).
