# Ladereihenfolge der Script-Tags

## Warum die Reihenfolge zählt

Das Tool hat keinen Bundler und keinen Build-Schritt (siehe `.claude/CLAUDE.md`, Constraints). Alle `<script>`-Tags sind klassische Skripte und teilen sich **einen** globalen Scope — es gibt keinen Modul-Loader, der Abhängigkeiten auflöst. `document.write()` fügt während des Parsens sofort ein neues `<script>`-Tag ein und führt es aus, bevor der Rest der Seite weitergeparst wird. Die einzige Abhängigkeitsauflösung ist deshalb die **physische Reihenfolge** der `document.write`-Aufrufe in `index.html`. Steht ein Modul an der falschen Stelle, ist das Ergebnis nicht "langsamer" oder "leicht anders", sondern ein sofortiger Fehler (Funktionen/Konstanten, die es referenziert, existieren schlicht noch nicht).

## Reihenfolge-Tabelle

| Reihenfolge | Datei | Stellt bereit | Braucht |
|---|---|---|---|
| 1 | `bc-icons.js` (im `<head>`, plain `<script src>`) | Icon-Definitionen | — |
| 2 | `bc-icons-ergaenzung.js` (im `<head>`, plain `<script src>`) | Zusätzliche Icons | bc-icons.js |
| 3 | lz-string (CDN) | Kompression für Outfit-Codes | — |
| 4 | `persistence.js` | `idbGet`, `idbSet`, `_idbOpen`, `_debounce`, localStorage→IDB-Migrations-IIFE | — (self-contained) |
| 5 | `items.js` | Koordinator: Tabs, Rendering, `showStatus`, postMessage-Handling, Batch-Scheduler | persistence.js (`idbGet`/`idbSet`/`_debounce`) |
| 6 | `money.js` | Geld-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 7 | `rank.js` | Rang-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 8 | `shop.js` | Shop-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 9 | `inventar.js` | Inventar/Keywarden-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 10 | `bot-data.js` | Bot-Trigger/Aktions-Definitionen | idbGet/idbSet (persistence.js), Globals aus items.js |
| 11 | `bot-ui.js` | Bot-Editor-UI | idbGet/idbSet (persistence.js), Globals aus items.js/bot-data.js |
| 12 | `bot-engine.js` | Bot-Code-Generator | Globals aus items.js/bot-data.js |
| 13 | `outfit-import.js` | Outfit-Code-Parser | idbGet/idbSet (persistence.js), Globals aus items.js |
| 14 | `bc-autobackup.js` | Automatische Backups | idbGet/idbSet (persistence.js), Globals aus items.js |

Zukünftige Module (Plan 04-02: `bridge.js`) reihen sich zwischen `persistence.js` und `items.js` ein — siehe die noch offene `docs/LOAD-ORDER.md`-Erweiterung in Plan 04-02.

## Guard-Verhalten (SPLIT-04)

`items.js` prüft in seiner **ersten Anweisung** (vor jeder anderen Deklaration), ob die von ihm benötigten Vorläufer-Globals existieren — aktuell nur `idbGet` aus `persistence.js` (`typeof window['idbGet'] !== 'function'`). Fehlt eines, passiert Folgendes, statt eines stillen, tief in einer Tab-Funktion auftretenden `ReferenceError`:

1. Eine sichtbare rote Box (`id="loadOrderFatal"`) wird oben in die Seite gerendert, Text beginnt mit `FATAL: ` und nennt das fehlende Modul sowie den Hinweis, in `docs/LOAD-ORDER.md` nachzusehen.
2. `console.error('[BCK-Popup] ...')` protokolliert dieselbe Meldung.
3. Ein `Error` wird geworfen — `items.js` bricht sofort ab, statt mit fehlenden Funktionen weiterzulaufen.

Der Guard ist bewusst ohne Abhängigkeit zu den geprüften Modulen geschrieben (kein Aufruf von `idbGet(...)`, nur ein `typeof`-Check), damit er auch dann funktioniert, wenn genau das geprüfte Modul fehlt.

## Neues Modul hinzufügen

1. Neue `document.write('<scr'+'ipt src="modul.js?_='+_cbv+'"><\/scr'+'ipt>');`-Zeile im richtigen `<script>`-Block von `index.html` einfügen (vor allem, was das neue Modul braucht; nach allem, was es selbst braucht).
2. Diese Tabelle um eine Zeile erweitern.
3. Falls das neue Modul eine Laufzeit-Voraussetzung für `items.js` ist: die `required`-Tabelle im Ladereihenfolge-Guard in `items.js` (`const required = [['idbGet', 'persistence.js'], ...]`) um `['<globalName>', 'modul.js']` ergänzen.
4. `CORE_SCRIPTS` in `tests/helpers/loadScript.js` um `'modul.js'` ergänzen, an der richtigen Position relativ zu `persistence.js`/`items.js`.
5. Diese Doku-Datei nachziehen.

## Tests

`tests/helpers/loadScript.js` exportiert `CORE_SCRIPTS` (aktuell `['persistence.js', 'items.js']`) und `expandLoadOrder(files)`. `loadScript(files)` ruft `expandLoadOrder` intern auf und fügt fehlende Kern-Vorläufer automatisch vor dem ersten `'items.js'`-Eintrag ein — bestehende Testaufrufe wie `loadScript(['items.js'])` mussten deshalb nicht angepasst werden, obwohl `persistence.js` jetzt existiert.

`loadInto(sandbox, file)` bleibt bewusst **roh** und expandiert nichts — genau das macht `tests/load-order-guard.test.js` testbar: es lädt `items.js` absichtlich allein (ohne `persistence.js`) in eine frische Sandbox und prüft, dass der Guard greift (`#loadOrderFatal`-Box + Throw), statt einen rohen `idbGet is not defined`-Fehler durchzulassen.
