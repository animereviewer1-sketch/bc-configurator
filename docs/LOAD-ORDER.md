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
| 5 | `bridge.js` | `APP`, `bcSend`, `onBridgeMessage`, `offBridgeMessage`, `_bridgeSenderOk`, `manualReconnect`, `startPingRetry`, `_heartbeatCheck`, `_connected`/`_bcOrigin` | — zur Parse-Zeit nichts; zur Laufzeit `showStatus`, `stopRoomScan`, `_execLogAppend`, `_botRueckschreibStart` aus items.js (alle `typeof`-geguardet oder erst nach dem Handshake erreichbar) |
| 6 | `items.js` | Koordinator: Tabs, Rendering, `showStatus`, 35 `onBridgeMessage`-Registrierungen, Batch-Scheduler | persistence.js (`idbGet`/`idbSet`/`_debounce`), bridge.js (`bcSend`/`onBridgeMessage`) |
| 7 | `game-scan.js` | Spiel-Scan: `triggerGameScan`, Handler `GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA`, Snapshot-Speicherung (`idbSnapshotPut`), Statuszeile `#gameScanInfo` | persistence.js (`idbSnapshotPut`/`idbSnapshotKeys`), bridge.js (`bcSend`/`onBridgeMessage`), items.js (`showStatus`) |
| 8 | `baseline-manifest.js` | `BASELINE_MANIFEST` — generiert per `npm run baseline`, nicht von Hand editieren | — |
| 9 | `scan-tab.js` | `renderScanTab`, `deleteGameSnapshot` (einzige Aufrufstelle von `idbSnapshotDelete`, hinter `confirm()`), `exportGameSnapshot`, `scanOnSearch`/`scanOnFilter`/`scanLoadMore`/`scanSelectSnapshot` | persistence.js (`idbSnapshotGetAll`/`idbSnapshotGet`/`idbSnapshotDelete`/`_debounce`), items.js (`showStatus`/`escHtml`/`escJsAttr`/`_jsonParts`), optional game-scan.js (`triggerGameScan`, `typeof`-geguardet), baseline-manifest.js (`typeof`-geguardet) |
| 10 | `money.js` | Geld-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 11 | `rank.js` | Rang-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 12 | `shop.js` | Shop-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 13 | `inventar.js` | Inventar/Keywarden-Tab | idbGet/idbSet (persistence.js), Globals aus items.js |
| 14 | `bot-data.js` | Bot-Trigger/Aktions-Definitionen | idbGet/idbSet (persistence.js), Globals aus items.js |
| 15 | `bot-ui.js` | Bot-Editor-UI | idbGet/idbSet (persistence.js), bcSend/onBridgeMessage (bridge.js), Globals aus items.js/bot-data.js |
| 16 | `bot-engine.js` | Bot-Code-Generator | Globals aus items.js/bot-data.js |
| 17 | `outfit-import.js` | Outfit-Code-Parser | idbGet/idbSet (persistence.js), Globals aus items.js |
| 18 | `bc-autobackup.js` | Automatische Backups | idbGet/idbSet (persistence.js), Globals aus items.js |
| 19 | `vendor/gsap.min.js` | GSAP 3.13 (lokal, Animationen des Nova-Designs) | — |
| 20 | `nova/nova.js` | Nova-Design: Seitenleiste, Befehlspalette, Toasts, WebGL-Hintergrund, Umschalter alt ↔ neu. Umhüllt `switchTab`/`showStatus` (ruft das Original immer zuerst auf) | zur Laufzeit `switchTab`, `showStatus`, `toggleTweaksPanel` aus items.js/index.html, `bcIcon` aus bc-icons.js (alle `typeof`-geguardet) — muss deshalb **nach** allen Feature-Modulen stehen |

`nova/nova-boot.js` steht zusätzlich als plain `<script src>` im `<head>` (vor dem ersten `<style>`): Es setzt `data-ui="nova" | "classic"` auf `<html>` und schreibt den Stylesheet-Link `nova/nova.css` mit Cache-Buster, bevor der Body gezeichnet wird. Alle Regeln in `nova/nova.css` sind unter `html[data-ui="nova"]` gescoped (Test: `tests/nova-design.test.js`) — im klassischen Design ist Nova wirkungslos.

## Guard-Verhalten (SPLIT-04)

`items.js` prüft in seiner **ersten Anweisung** (vor jeder anderen Deklaration), ob die von ihm benötigten Vorläufer-Globals existieren — `idbGet` aus `persistence.js` und `bcSend`/`onBridgeMessage` aus `bridge.js` (`typeof window[...] !== 'function'`). `bot-ui.js` prüft dieselben drei plus zusätzlich `showStatus` aus `items.js` (die vollständige Kette persistence.js → bridge.js → items.js). `game-scan.js` prüft dieselbe Kette plus zusätzlich `idbSnapshotPut` aus `persistence.js` (persistence.js → bridge.js → items.js → game-scan.js). Fehlt eines, passiert Folgendes, statt eines stillen, tief in einer Tab-Funktion auftretenden `ReferenceError`:

1. Eine sichtbare rote Box (`id="loadOrderFatal"`) wird oben in die Seite gerendert, Text beginnt mit `FATAL: ` und nennt das/die fehlenden Module sowie den Hinweis, in `docs/LOAD-ORDER.md` nachzusehen.
2. `console.error('[BCK-Popup] ...')` protokolliert dieselbe Meldung.
3. Ein `Error` wird geworfen — das ladende Skript bricht sofort ab, statt mit fehlenden Funktionen weiterzulaufen.

Der Guard ist bewusst ohne Abhängigkeit zu den geprüften Modulen geschrieben (kein Aufruf von `idbGet(...)`/`onBridgeMessage(...)`, nur ein `typeof`-Check), damit er auch dann funktioniert, wenn genau das geprüfte Modul fehlt.

`scan-tab.js` prüft dieselbe Kette wie `game-scan.js`, aber ohne `bridge.js` (persistence.js → items.js): `idbSnapshotGetAll`/`idbSnapshotGet`/`idbSnapshotDelete` aus persistence.js, `showStatus`/`escHtml`/`escJsAttr`/`_jsonParts` aus items.js. In Node (ohne `window`) springt der Guard als erste Anweisung ohne Prüfung heraus und lädt ohne Throw — das macht die Datei über `require('../scan-tab.js')` für `tools/analyze-snapshot.js` (Plan 06-03) direkt nutzbar (Dual-Export der reinen Badge-/Flatten-Funktionen).

## Neuen Nachrichtentyp registrieren (SPLIT-02, Erfolgskriterium 1)

Ein neuer Nachrichtentyp aus dem Spiel (z. B. `GAME_SCAN_DATA` für eine spätere Phase) braucht **keine Änderung an items.js**. In einem beliebigen Modul, das nach `bridge.js` lädt:

```javascript
onBridgeMessage('GAME_SCAN_DATA', function (ev) {
  // ev.data enthält die Nutzlast; app/Absender/Origin wurden bereits von der
  // Sicherheitsshell in bridge.js geprüft, bevor der Handler läuft.
});
```

Für einen einmaligen, selbst-entfernenden Handler (Muster: `debugOsOutfit`/`OUTFIT_DEBUG_RESULT`) `offBridgeMessage(type, handler)` innerhalb des Handlers aufrufen. Seit Commit `332fc2d` isoliert `_bridgeDispatch` jeden Handler per try/catch (`console.error('[Bridge] Handler-Fehler bei …')`) — ein werfender Handler blockiert seine Geschwister nicht; die Registrierung derselben Funktion ein zweites Mal ist ein No-op.

Lebendes Beispiel seit Phase 5: `game-scan.js` registriert `GAME_INVENTORY_PROGRESS` und `GAME_INVENTORY_DATA` genau so und speichert über `idbSnapshotPut`.

## Neues Modul hinzufügen

1. Neue `document.write('<scr'+'ipt src="modul.js?_='+_cbv+'"><\/scr'+'ipt>');`-Zeile im richtigen `<script>`-Block von `index.html` einfügen (vor allem, was das neue Modul braucht; nach allem, was es selbst braucht).
2. Diese Tabelle um eine Zeile erweitern.
3. Falls das neue Modul eine Laufzeit-Voraussetzung für `items.js` oder `bot-ui.js` ist: die jeweilige `required`-Tabelle im Ladereihenfolge-Guard (`const required = [['idbGet', 'persistence.js'], ...]`) um `['<globalName>', 'modul.js']` ergänzen.
4. `CORE_SCRIPTS` in `tests/helpers/loadScript.js` um `'modul.js'` ergänzen, an der richtigen Position relativ zu `persistence.js`/`bridge.js`/`items.js` — Skripte, die NACH `items.js` laden, stehen in `CORE_SCRIPTS` hinter `'items.js'` und werden von `expandLoadOrder` direkt nach dem ersten `items.js` eingefügt. Wichtig: `CORE_SCRIPTS` ist nur für **Kern-Skripte** gedacht — Laufzeit-Voraussetzungen von `items.js`/`bot-ui.js` oder Skripte, die jede `items.js`-Sandbox ohnehin braucht. Blatt-Module ohne diese Eigenschaft (z. B. `money.js`, `rank.js`, `scan-tab.js`) gehören NICHT in `CORE_SCRIPTS` — Tests laden sie explizit über `loadScript([...])`.
5. Diese Doku-Datei nachziehen.

## Tests

`tests/helpers/loadScript.js` exportiert `CORE_SCRIPTS` (aktuell `['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']`) und `expandLoadOrder(files)`. `loadScript(files)` ruft `expandLoadOrder` intern auf und fügt fehlende Kern-Vorläufer automatisch vor dem ersten `'items.js'`-Eintrag ein, fehlende Kern-Nachläufer (aktuell nur `game-scan.js`) direkt danach — bestehende Testaufrufe wie `loadScript(['items.js'])` mussten deshalb nicht angepasst werden, obwohl `persistence.js`/`bridge.js`/`game-scan.js` jetzt existieren.

Blatt-Module wie `scan-tab.js` werden in Tests explizit geladen, z. B. `loadScript(['items.js', 'baseline-manifest.js', 'scan-tab.js'])` — `expandLoadOrder` fügt `persistence.js`/`bridge.js`/`items.js`/`game-scan.js` automatisch davor ein, `baseline-manifest.js` und `scan-tab.js` bleiben in der angegebenen Reihenfolge dahinter.

`loadInto(sandbox, file)` bleibt bewusst **roh** und expandiert nichts — genau das macht `tests/load-order-guard.test.js` testbar: es lädt `items.js`/`bot-ui.js` absichtlich ohne Vorläufer in eine frische Sandbox und prüft, dass der jeweilige Guard greift (`#loadOrderFatal`-Box + Throw), statt einen rohen `... is not defined`-Fehler durchzulassen.
