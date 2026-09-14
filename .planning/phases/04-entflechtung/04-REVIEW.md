---
phase: 04-entflechtung
reviewed: 2026-09-14T22:38:25Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - persistence.js
  - bridge.js
  - items.js
  - bot-ui.js
  - index.html
  - tests/screenshot-migration.test.js
  - tests/screenshot-store.test.js
  - tests/bridge-registry.test.js
  - tests/persistence-module.test.js
  - tests/load-order-guard.test.js
  - tests/screenshot-export.test.js
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 04: Code Review Report — Entflechtung (SPLIT-01…07)

**Reviewed:** 2026-09-14T22:38:25Z
**Depth:** standard (items.js strikt per Diff gegen `1190931`)
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Geprüft wurden `persistence.js` und `bridge.js` (neu, vollständig), der Diff von `items.js`/`bot-ui.js`/`index.html`, sowie alle sechs zur Phase gehörenden Testdateien. Die Ladereihenfolge-Guards, die Bridge-Sicherheitsschale (`_bridgeSenderOk` vor Dispatch) und die additive/idempotente Grundidee der Screenshot-Migration sind sauber umgesetzt und gut getestet.

Der Fokus dieser Review war der Kernwert "Scan-Daten gehen nie verloren". Dabei wurden zwei **reproduzierte, nicht nur theoretische** Datenverlust-Pfade gefunden, die genau die im Auftrag genannten Risiken treffen: (1) ein Nachladepfad kann ein frisch aufgenommenes Profil-Screenshot durch den alten Stand überschreiben, und (2) eine unvollständige Migration (Marker-Schreibfehler, z.B. Quota) kann bei einem Neustart ein vom Nutzer bereits gelöschtes Screenshot wiederauferstehen lassen. Beide wurden mit einem Wegwerf-Testskript gegen die echte fake-indexeddb-Umgebung nachgestellt (nicht Teil des Commits) und sind reproduzierbar, keine Spekulation.

Zusätzlich ein Design-/Robustheitsproblem in der neuen Bridge-Registry (werfender Handler bricht Dispatch für Geschwister-Handler desselben Typs ab) und eine Lücke im Test-Set, die genau den Migrations-Blocker hätte auffangen können, es aber nicht tut.

## Critical Issues

### CR-01: Frisches Profil-Screenshot wird durch den alten Store-Stand überschrieben (Datenverlust)

**File:** `items.js:576-579`
```js
let PROFILE_SCREENSHOTS = {};
_screenshotStoreReady().then(() => idbScreenshotGetAll('profile')).then(d => {
  if (d && typeof d === 'object') { Object.assign(PROFILE_SCREENSHOTS, d); _screenshotShadowMerge('profile', d); }
});
```

**Issue:** `Object.assign(PROFILE_SCREENSHOTS, d)` schreibt die aus dem Store geladenen (alten) Werte `d` **in** `PROFILE_SCREENSHOTS` — bei einem bereits existierenden Key gewinnt also immer der gespeicherte Alt-Stand, nicht der aktuelle In-Memory-Stand. Das ist die falsche Merge-Richtung: die beiden Schwester-Implementierungen für LSCG (`items.js:8446`, `LSCG_SCREENSHOTS = Object.assign({}, ssSaved, LSCG_SCREENSHOTS)`) und Wheel (`items.js:9425`, `_mbsWheelShots = Object.assign({}, d, _mbsWheelShots)`) machen es korrekt herum: Store-Stand zuerst, lokaler (frischerer) Stand gewinnt.

Da dieser Ladepfad automatisch bei jedem Tool-Start läuft (kein Trigger durch UI nötig) und `_screenshotStoreReady()` nach einer bereits abgeschlossenen Migration fast sofort auflöst, reicht ein normales Re-Scan eines **bereits vorher gespeicherten** Profils in den ersten Millisekunden nach dem Laden von `items.js`, um das neue Bild lautlos zu verlieren — sowohl im Speicher als auch danach dauerhaft im Store, weil der nächste Debounce-Flush (`_saveProfileScreenshotsJetzt`, Default-Delay 700ms in `_sammelSpeicher.plane`) keinen Unterschied zum (bereits überschriebenen) Shadow-Stand mehr sieht und nichts schreibt.

Reproduziert (Wegwerf-Test gegen `items.js` + fake-indexeddb, nicht eingecheckt): Alt-Blob enthält `Anna: 'old-value'`, Migration läuft einmal durch. Bei einem zweiten Tool-Start wird `PROFILE_SCREENSHOTS.Anna = 'fresh-value'` gesetzt und `_saveProfileScreenshots()` (echter Debounce-Pfad, kein Bypass) aufgerufen:
- t=30ms (weit vor dem 700ms-Debounce): `PROFILE_SCREENSHOTS.Anna` ist bereits wieder `'old-value'`.
- t=830ms (nach dem Debounce-Flush): sowohl Speicher als auch Store zeigen dauerhaft `'old-value'` — das frische Bild ist unwiederbringlich weg.

**Fix:** Gleiche Merge-Richtung wie bei LSCG/Wheel verwenden:
```js
let PROFILE_SCREENSHOTS = {};
_screenshotStoreReady().then(() => idbScreenshotGetAll('profile')).then(d => {
  if (d && typeof d === 'object') {
    PROFILE_SCREENSHOTS = Object.assign({}, d, PROFILE_SCREENSHOTS);
    _screenshotShadowMerge('profile', d);
  }
});
```

---

### CR-02: Unvollständige Migration (Marker-Schreibfehler) macht eine bereits erfolgte Nutzer-Löschung beim Retry rückgängig

**File:** `persistence.js:175-237` (`_migrateScreenshotsToStore`), insbesondere Zeile 198 (add-if-absent anhand `have`) und Zeile 226-227 (Marker erst nach Verifikation, aber in einer eigenen, späteren Transaktion)

**Issue:** Schreiben in den Screenshot-Store (eine Transaktion) und das Setzen des Markers (`idbSet`, eine zweite, spätere Transaktion) sind zwei getrennte Schritte. Schlägt **nur** der Marker-Schreibvorgang fehl (z.B. `QuotaExceededError` — im restlichen Code an mehreren Stellen als real erwarteter Fall behandelt, siehe `_idbSchreibfehler`), ist der Screenshot-Store zu diesem Zeitpunkt bereits vollständig und verifiziert befüllt, der Marker bleibt aber `null`. Löscht der Nutzer in genau diesem Fenster (Marker fehlt, Daten aber schon migriert) ein Bild ganz regulär über die UI, wird es korrekt aus dem Store entfernt — der Alt-Blob bleibt dabei laut Design unangetastet ("frozen"). Beim nächsten Tool-Start läuft die Migration erneut an (Marker fehlt ja), liest denselben unveränderten Alt-Blob, sieht anhand von `have = getAllKeys()`, dass der (gelöschte) Key fehlt, und fügt ihn per "add-if-absent" **erneut** in den Store ein — die bewusste Löschung des Nutzers wird stillschweigend rückgängig gemacht, und der danach gesetzte Marker friert diesen resurrected Zustand dauerhaft ein.

Reproduziert (Wegwerf-Test, nicht eingecheckt): Alt-Blob `Anna: 'v1'`, `IDBObjectStore.prototype.put` für den `kv`-Store gezielt zum Werfen von `QuotaExceededError` gebracht → Migration liefert `{done:false, reason:'marker'}`, Store enthält `profile|Anna = 'v1'`, Marker ist `null`. Danach `idbScreenshotDelete('profile','Anna')` (= genau der Pfad, den `_screenshotFlush` bei einer Nutzer-Löschung auslöst) → Store ist wieder leer für diesen Key. Neuer Tool-Start → Migration läuft erneut → **`profile|Anna` ist wieder `'v1'`**, obwohl der Nutzer es zuvor gelöscht hatte.

**Fix:** Store-Schreiben und Marker-Setzen in eine einzige, gemeinsame Transaktion über beide Object-Stores legen, sodass es keinen Zwischenzustand "Daten schon kopiert, Marker aber noch nicht gesetzt" mehr geben kann (entweder committet beides atomar, oder nichts):
```js
const tx = db.transaction([_IDB_SCREENSHOTS, _IDB_STORE], 'readwrite');
const st = tx.objectStore(_IDB_SCREENSHOTS);
const kv = tx.objectStore(_IDB_STORE);
// ... add-if-absent wie bisher über st ...
kv.put({ done: true, count, counts, ts: Date.now() }, SCREENSHOT_MIGRATION_KEY);
// tx.oncomplete → erst hier ist die Migration überhaupt sichtbar abgeschlossen
```
Damit verschwindet das Fenster, in dem eine Löschung "unmigrierte" Daten aus Nutzersicht betreffen könnte, vollständig — sobald der Marker sichtbar ist, hat auch der Store garantiert den finalen Stand, und ein Retry findet gar nicht mehr statt.

## Warnings

### WR-01: Ein werfender Bridge-Handler bricht den Dispatch für Geschwister-Handler desselben Typs ab

**File:** `bridge.js:143-148`
```js
function _bridgeDispatch(ev) {
  const list = _bridgeHandlers.get(ev.data.type);
  if (!list || !list.length) return 0;
  for (const fn of list.slice()) fn(ev); // Kopie: Selbst-Entfernung während Dispatch bleibt sicher
  return list.length;
}
```
**Issue:** Der Kommentar in `bridge.js` begründet das fehlende try/catch mit "verbatim-Semantik" zum alten `switch`. Das stimmt für den heutigen Stand (jeder der 35 Typen hat genau einen Handler), aber die Registry wurde laut eigenem Kommentar ("neue Typen ... brauchen keine Änderung an dieser Datei") gerade dafür gebaut, dass künftig **mehrere** Handler denselben Typ abonnieren. Sobald das passiert, reißt ein werfender erster Handler alle nachfolgenden für dasselbe Event mit — anders als bei einem einzelnen `switch`-`case` gab es dieses Nebenwirkungsrisiko vorher gar nicht. Der Registry-Test deckt Selbst-Entfernung während des Dispatch ab, aber keinen werfenden Handler.

**Fix:**
```js
for (const fn of list.slice()) {
  try { fn(ev); }
  catch (err) { console.error('[BCK-Popup] Bridge-Handler für ' + ev.data.type + ' warf:', err); }
}
```

### WR-02: `onBridgeMessage` schützt nicht vor doppelter Registrierung desselben Handlers

**File:** `bridge.js:127-132`
**Issue:** `onBridgeMessage` pusht ungeprüft in die Liste. Würde `items.js` (oder ein anderes Skript mit den 35 Top-Level-`onBridgeMessage(...)`-Aufrufen) jemals versehentlich zweimal ausgeführt — z.B. durch einen Fehler beim Cache-Busting oder eine künftige dynamische Nachlade-Logik — würde jede eingehende Nachricht doppelt verarbeitet: doppelte `_moneyApply`, doppelte `_rankApply`, doppelte Log-Einträge. Heute ausschließlich durch die Lade-Reihenfolge-Tests (genau ein `<script>`-Tag pro Datei) abgesichert, nicht durch die API selbst.
**Fix:** Entweder in `onBridgeMessage` selbst entdoppeln (`if (list.includes(handler)) return handler;`) oder den Vertrag ("nur einmal pro Handler-Funktion registrieren, keine Idempotenz eingebaut") explizit in den Kommentaren von `bridge.js` festhalten, damit ein künftiger Aufrufer nicht versehentlich mehrfach registriert.

### WR-03: Bestehender "Teilfehler"-Migrationstest deckt genau das CR-02-Szenario nicht ab

**File:** `tests/screenshot-migration.test.js:166-190`
**Issue:** Der Test "Teilfehler: put wirft QuotaExceededError" lässt **jeden** `put` (also auch die per-Bild-Schreibvorgänge in den `screenshots`-Store) fehlschlagen. Dadurch bleibt der Store nach dem Fehlschlag komplett leer — das ist der harmlose Fall. Der Test prüft nie den gefährlicheren Fall, dass die Bild-Kopien **und** die Verifikation erfolgreich durchlaufen und ausschließlich der Marker-`idbSet` scheitert (z.B. weil genau in diesem Moment die Quota erreicht wird). Genau dieser Fall ermöglicht CR-02 und wird von der Testsuite als "sicher, weil `Teilfehler`-Test grün" fehlinterpretierbar — der Test suggeriert "Retry ist immer sicher", deckt aber nicht den Fall ab, in dem zwischen zwei unvollständigen Migrationsläufen eine echte Nutzer-Löschung stattfindet.
**Fix:** Zusätzlichen Testfall ergänzen, der gezielt nur den `kv`-Put für `BC_SCREENSHOT_MIGRATION_v1` scheitern lässt (Store-Schreibvorgänge bleiben erfolgreich), danach ein reguläres `idbScreenshotDelete(...)` ausführt und beim nächsten `_screenshotStoreReady()`-Lauf erwartet, dass der gelöschte Key **nicht** wieder auftaucht.

## Info

### IN-01: Ladereihenfolge-Guard ist in `items.js` und `bot-ui.js` fast wortgleich dupliziert

**File:** `items.js:1-16`, `bot-ui.js:1-21`
**Issue:** Beide Guards prüfen `typeof window[...] !== 'function'` gegen fast identische Listen und rendern dieselbe rote Box mit fast identischem Code. Reine Quellcode-Duplikation (kein Verhaltensfehler) — bei einer künftigen Änderung (z.B. neue Box-Optik, neue Pflichtabhängigkeit) müssen beide Stellen synchron gehalten werden.
**Fix:** Nicht dringend angesichts des bewussten No-Build-Ansatzes; falls die Guard-Logik ein drittes Mal gebraucht wird, in eine kleine gemeinsam geladene Datei (z.B. `load-order-guard.js`, vor allen Feature-Modulen) auslagern.

---

_Reviewed: 2026-09-14T22:38:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
