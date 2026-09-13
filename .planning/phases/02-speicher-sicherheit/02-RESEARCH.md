# Phase 2: Speicher-Sicherheit - Research

**Researched:** 2026-09-13
**Domain:** IndexedDB-Persistenz, Quota-Fehlerbehandlung, Datenlöschung mit Bestätigung (Vanilla-JS, kein Framework)
**Confidence:** HIGH — jede Kernaussage wurde direkt am aktuellen `items.js` (Stand nach `82a9daa "Big Update"`) verifiziert, nicht aus `CONCERNS.md` übernommen. Zeilenangaben in `CONCERNS.md` sind teils veraltet; alle Zeilenangaben unten stammen aus dieser Session.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAB-01 | Screenshots unter `mk\|fp` werden beim Profil-Sync unter demselben Schlüssel gelesen | Bug verifiziert (`items.js:2734-2738` vs. `7551-7569`), Fix-Ansatz mit Codebeispiel dokumentiert |
| STAB-02 | `QuotaExceededError` → sofortige UI-Fehlermeldung, nie stillschweigend verschluckt | Bereits implementiert in `items.js:40-63` (verifiziert); nur TEST-04 offen |
| STAB-03 | Belegter/verfügbarer Speicher (`navigator.storage.estimate()`) im Tool ablesbar | Kein bestehender Code; UI-Vorbild (`index.html:4166-4181`) + Codevorschlag + Test-Stub-Hinweis dokumentiert |
| STAB-09 | Löschen von Bildern/Outfits/Versionen nur per explizitem Bestätigungsdialog | Vollständige 13-Zeilen-Tabelle aller Lösch-Pfade mit Klassifikation (a/b/c); 3 Verstöße identifiziert |
| STAB-10 | Bestätigtes Löschen entfernt konsistent aus LSCG_DB/LSCG_SCREENSHOTS/PROFILE_SCREENSHOTS | Root-Cause (fehlende zentrale Aufräumfunktion) identifiziert, Hilfsfunktion `_removeLscgScreenshotFromProfiles` vorgeschlagen |
| TEST-04 | `idbGet`/`idbSet` inkl. Quota-Fehlerpfad getestet | Live-verifiziertes Monkeypatch-Testpattern gegen echten Produktionscode, inkl. Cleanup-Hinweis und Throttle-Falle |
</phase_requirements>

## Summary

Phase 2 ist kleiner als CONCERNS.md nahelegt: **STAB-02 (Quota-Fehler sichtbar machen) ist in der Produktion bereits vollständig implementiert** — `idbSet()` fängt `QuotaExceededError` ab, zeigt `showStatus('❌ Speicher voll…', 'error')` und gibt `false` zurück, ohne Teilschreibvorgang zu hinterlassen (per Live-Probe gegen den echten Produktionscode verifiziert, siehe Abschnitt "Verifizierter Quota-Test-Pattern"). Der verbleibende Auftrag für STAB-02 ist **ausschließlich TEST-04** — den bereits korrekten Fehlerpfad mit einem Regressionstest absichern, den es laut `01-REVIEW.md` (WR-03) noch nicht gibt.

**STAB-01** (Screenshot-Sync-Bug) ist dagegen ein echter, weiterhin bestehender Bug: `_syncLscgScreenshotToProfiles(mk, fp)` wird mit zwei Argumenten aufgerufen (`items.js:2738`), die Funktion akzeptiert aber nur `mk` (`items.js:7551`) und liest `LSCG_SCREENSHOTS[mk]` statt `LSCG_SCREENSHOTS[mk+'|'+fp]` — bei jedem Outfit mit Fingerprint (`fp` gesetzt) liefert das immer `undefined`, der Sync bricht sofort ab (`if(!img) return;`).

**STAB-03** (Speicherplatz-Anzeige) existiert noch gar nicht — kein `navigator.storage`-Aufruf im gesamten Repo. Es gibt aber ein etabliertes UI-Muster dafür (das "🔁 Automatisches Backup"-Panel in `index.html`), das sich direkt kopieren lässt.

**STAB-09/STAB-10** (Löschen nur mit Bestätigung, konsistent über alle Speicherorte) sind teilweise erfüllt und teilweise verletzt: `deleteLscgVersion()` und die drei `clearAll*()`-Funktionen haben bereits `confirm()`, räumen aber **nie** die per `_syncLscgScreenshotToProfiles` in `PROFILE_SCREENSHOTS` kopierten Duplikate auf — das erzeugt genau die in `PITFALLS.md` (Pitfall 12) und `REQUIREMENTS.md` (Erfolgskriterium 5) beschriebenen verwaisten Einträge. Schwerwiegender: **zwei aktive UI-Buttons löschen Bilder komplett ohne `confirm()`** — `deleteOsScreenshotKey()` (verdrahtet über den 🗑-Button jeder Outfit-Version-Karte, `items.js:10259`) und `removeProfileScreenshot()` (verdrahtet über den "✕ Entfernen"-Button im Profil-Modal, `index.html:2894`). Das ist der eigentliche STAB-09-Verstoß, nicht die bereits mit `confirm()` abgesicherten Funktionen.

**Primary recommendation:** STAB-01 und die beiden fehlenden `confirm()`-Dialoge als gezielte, punktuelle Bugfixes in `items.js` behandeln (keine Architekturänderung nötig); STAB-10 durch eine einzige neue Hilfsfunktion lösen, die von allen Lösch-Pfaden aufgerufen wird, statt die Aufräumlogik viermal zu duplizieren; STAB-03 nach dem Vorbild des Backup-Status-Panels bauen; STAB-02 unverändert lassen und nur testen (TEST-04) — dafür den unten verifizierten Monkeypatch-Pattern für `IDBObjectStore.prototype.put` verwenden.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| IDB-Schreiben/Lesen + Quota-Fehlerbehandlung (`idbGet`/`idbSet`) | Browser/Client (IndexedDB) | — | Reine Client-Persistenz, kein Server; Fehlerbehandlung gehört an die Speicher-API-Grenze, nicht in die UI-Schicht |
| Speicherplatz-Anzeige (`navigator.storage.estimate()`) | Browser/Client | Presentation (Tweaks-Panel) | Browser-API liefert Rohwerte; Rendering ins bestehende Settings-Panel gehört zur Presentation-Schicht |
| Screenshot-Sync (`_syncLscgScreenshotToProfiles`) | Browser/Client (In-Memory-Orchestrierung) | Storage (IDB via `_saveProfileScreenshots`) | Reine RAM-zu-RAM-Kopie zwischen zwei globalen Objekten, mit anschließendem debounced IDB-Save |
| Lösch-Bestätigung + konsistente Multi-Store-Löschung | Presentation (`confirm()`-Dialog) | Storage (RAM-Objekte + IDB-Save) | Bestätigung ist UI-Verantwortung; die eigentliche Entfernung aus allen drei Speicherorten ist eine Storage-Invariante, die zentral (eine Hilfsfunktion) statt pro Aufrufer durchgesetzt werden sollte |
| Test-Infrastruktur (vm-Sandbox, fake-indexeddb) | Test-Tooling | — | Kein Produktionscode; lebt in `tests/` |

## Package Legitimacy Audit

Diese Phase installiert **keine neuen Pakete**. Alle benötigten Werkzeuge (`vitest@5.0.0`, `fake-indexeddb@6.2.5`) sind bereits `devDependencies` aus Phase 1 (`package.json`, verifiziert per `Read`). `navigator.storage.estimate()` ist eine native Browser-API, kein npm-Paket. Kein Legitimacy-Check nötig.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Standard Stack

Kein neuer Stack. Bestehende Werkzeuge aus Phase 1 werden weiterverwendet:

| Werkzeug | Version | Verwendung | Quelle |
|----------|---------|------------|--------|
| vitest | 5.0.0 | Testrunner | `[VERIFIED: package.json:12]` |
| fake-indexeddb | 6.2.5 | IDB-Polyfill für Node | `[VERIFIED: package.json:14]` |
| Node `DOMException` (global) | Node ≥17 (Projekt fordert `>=22.12.0`) | Simuliert `QuotaExceededError` im Test | `[VERIFIED: package.json:8; live geprüft — siehe unten]` |
| `navigator.storage.estimate()` | Browser-natives Storage API (kein Polyfill) | STAB-03 | `[ASSUMED — Web-API-Kenntnis aus Trainingsdaten, nicht in dieser Session gegen MDN/Caniuse geprüft; Browser ist Chrome/Firefox Desktop laut Nutzerprofil, beide unterstützen die API seit Jahren]` |

**Installation:** keine — nichts Neues zu installieren.

## Verifizierter Ist-Zustand: idbGet/idbSet und Quota-Handling

**Datei:** `items.js:5-63` (gelesen per `Read`/`awk`, vollständig zitiert):

```javascript
const _IDB_NAME    = 'BCKonfigurator';
const _IDB_VERSION = 1;
const _IDB_STORE   = 'kv';
let   _IDB_DB      = null;

function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
    };
    req.onsuccess = e => { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbGet(key) {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readonly');
      const req = tx.objectStore(_IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] get:', err); return null; }
}

let _idbFehlerGemeldet = 0;
async function idbSet(key, value) {
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readwrite');
      const req = tx.objectStore(_IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) {
    console.error('[IDB] Schreiben fehlgeschlagen:', key, err);
    const voll = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.name || ''));
    if (Date.now() - _idbFehlerGemeldet > 10000 && typeof showStatus === 'function') {
      _idbFehlerGemeldet = Date.now();
      showStatus(voll
        ? '❌ Speicher voll – "' + key + '" wurde NICHT gesichert. Backup anlegen und aufräumen!'
        : '❌ Speichern fehlgeschlagen (' + key + '): ' + (err?.message || err), 'error');
    }
    return false;
  }
}
```

`[VERIFIED: items.js:5-63]`

**Befund:** STAB-02 ist bereits erfüllt.
- `QuotaExceededError` (per `.name`-Check, auch tolerant gegenüber anderen `*quota*`-Namen) wird erkannt.
- `showStatus(..., 'error')` wird aufgerufen — sichtbare UI-Fehlermeldung, keine stille Verschluckung.
- `idbSet` gibt `false` zurück; kein Teilschreibvorgang bleibt zurück (per Live-Test unten verifiziert: `idbGet` nach fehlgeschlagenem `idbSet` liefert weiterhin `null`).
- **Einzige Einschränkung:** ein 10-Sekunden-Throttle (`_idbFehlerGemeldet`) unterdrückt wiederholte Popups. Das ist plausibel gewolltes Anti-Spam-Verhalten ("Nicht bei jedem Tastendruck erneut aufpoppen", Kommentar `items.js:34`), aber ein Test, der zwei Quota-Fehler kurz hintereinander auslöst, muss dieses Verhalten kennen (siehe Testabschnitt) — sonst wirkt ein zweiter, unterdrückter Aufruf wie ein Bug.
- `idbGet`-Fehlerpfad (Zeile 22-31) gibt bei jedem Fehler `null` zurück und loggt nur per `console.warn` — kein sichtbarer UI-Hinweis. Das deckt sich NICHT mit der STAB-02-Formulierung (die sich explizit auf „Schreibvorgang" bezieht), ist aber für TEST-04 „idbGet/idbSet … getestet" trotzdem ein Verhalten, das ein Test explizit als Ist-Zustand festhalten sollte (kein Fix nötig, nur Testabdeckung — sonst bleibt unklar, ob das Verhalten beabsichtigt oder eine Lücke ist).

### Verifizierter Quota-Test-Pattern (live gegen echten Produktionscode ausgeführt)

fake-indexeddb erzwingt keine Quota. Der folgende Pattern injiziert einen echten `QuotaExceededError` in die reale `IDBObjectStore.prototype.put`-Methode — dieselbe Instanz, die die vm-Sandbox über `indexedDB: globalThis.indexedDB` nutzt (Referenzsemantik, kein Mock von `items.js` selbst). **Dieses Pattern wurde in dieser Session tatsächlich ausgeführt** (`node` gegen ein Scratch-Skript, das `tests/helpers/loadScript.js` importiert und `items.js` lädt):

```javascript
import 'fake-indexeddb/auto';
import { loadScript } from './helpers/loadScript.js';

const ctx = loadScript(['items.js']);

// showStatus ist eine Top-Level-function-Deklaration → Property des vm-Kontexts,
// von außen überschreibbar (bestätigt: idbSet() aus items.js ruft danach den Spy).
let calls = [];
ctx.showStatus = (msg, type) => { calls.push({ msg, type }); };

await ctx.idbGet('warmup'); // öffnet die DB einmal, IDBObjectStore existiert danach

const origPut = globalThis.IDBObjectStore.prototype.put;
globalThis.IDBObjectStore.prototype.put = function (...args) {
  throw new DOMException('Quota exceeded (simulated)', 'QuotaExceededError');
};

const result = await ctx.idbSet('SOME_KEY', { big: 'data' });
// result === false
// calls === [{ msg: '❌ Speicher voll – "SOME_KEY" wurde NICHT gesichert. Backup anlegen und aufräumen!', type: 'error' }]

globalThis.IDBObjectStore.prototype.put = origPut;

const after = await ctx.idbGet('SOME_KEY');
// after === null  →  kein Teilschreibvorgang
```

**Tatsächliche Ausgabe dieses Laufs** (`[VERIFIED: Live-Ausführung in dieser Session]`):
```
idbSet result: false
showStatus calls: [{"msg":"❌ Speicher voll – \"SOME_KEY\" wurde NICHT gesichert. Backup anlegen und aufräumen!","type":"error"}]
idbGet after failed set: null
```

**Warum `showStatus` überschreibbar ist:** `function showStatus(msg, type) {...}` ist eine Top-Level-`function`-Deklaration in `items.js` (`items.js:6281`) — im vm-Kontext wird sie zu einer **mutierbaren Property des Sandbox-Global-Objekts**. `idbSet` referenziert `showStatus` als freien Bezeichner, der zur Aufrufzeit über die Scope-Kette (endet beim Global-Objekt) aufgelöst wird — eine Neuzuweisung `ctx.showStatus = spy` wirkt daher auf den nächsten Aufruf. Das ist robuster als der WR-02-Ansatz (DOM-Stub inspizieren), weil kein Element-Stub-Zustand gelesen werden muss.

**Wichtig für den Planner:** `IDBObjectStore.prototype.put` muss nach dem Test **zurückgesetzt** werden (`globalThis.IDBObjectStore.prototype.put = origPut`), sonst leckt der Monkeypatch in andere Testdateien derselben Vitest-Worker-Instanz. Am saubersten: `afterEach(() => { globalThis.IDBObjectStore.prototype.put = origPut; })` oder `vi.spyOn(globalThis.IDBObjectStore.prototype, 'put').mockImplementationOnce(...)` (Vitest räumt `vi.spyOn` automatisch mit `restoreMocks`/`vi.restoreAllMocks()` auf — in `vitest.config.js` aktuell nicht gesetzt, also manuell restaurieren oder `restoreMocks: true` ergänzen).

**Analoges Pattern für `idbGet`-Fehlerpfad:** `globalThis.IDBObjectStore.prototype.get` genauso patchen (nicht separat verifiziert, aber identischer Mechanismus wie oben — dieselbe Promise-Executor-Semantik: ein synchroner Throw innerhalb `new Promise((resolve,reject)=>{...})` rejected die Promise automatisch, `idbGet`s äußeres `try/catch` fängt es ab).

**Throttle-Test (optional, für vollständige Abdeckung des `_idbFehlerGemeldet`-Zweigs):** `_idbFehlerGemeldet` ist eine `let`-Top-Level-Variable — genau wie `_bots`/`_botVars` aus Phase 1 **kein** direktes Sandbox-Property, nur über `evalIn(ctx, '_idbFehlerGemeldet = 0')` lesbar/schreibbar (Pattern aus `tests/helpers/loadScript.js`, bereits etabliert). Ein Test für „zweiter Quota-Fehler innerhalb 10s wird unterdrückt" müsste entweder `Date.now` mocken (`vi.useFakeTimers()` + `vi.advanceTimersByTime()`) oder `evalIn(ctx, '_idbFehlerGemeldet = 0')` vor jedem Fall zurücksetzen, um Testreihenfolge-Unabhängigkeit zu garantieren (vgl. `01-REVIEW.md` IN-02: kein automatischer State-Reset zwischen Tests in dieser Codebasis).

## STAB-01: Screenshot-Sync-Bug — verifizierter Ist-Zustand

**Schreibseite** `items.js:2731-2739`:
```javascript
const storeKey = fp ? (mk + '|' + fp) : mk;
LSCG_SCREENSHOTS[storeKey] = dataUrl;
_saveLscgScreenshots();
_syncLscgScreenshotToProfiles(mk, fp);
```
`[VERIFIED: items.js:2734-2738]`

**Leseseite** `items.js:7551-7569`:
```javascript
function _syncLscgScreenshotToProfiles(mk) {
  const img = LSCG_SCREENSHOTS[mk];
  if (!img) return;
  const entry = LSCG_DB[mk];
  if (!entry?.versions) return;
  let changed = false;
  for (const v of entry.versions) {
    const fp = v.fingerprint;
    if (!fp) continue;
    const keys = _lscgFpMap[fp] ?? [];
    for (const k of keys) {
      if (!PROFILE_SCREENSHOTS[k]) {
        PROFILE_SCREENSHOTS[k] = img;
        changed = true;
      }
    }
  }
  if (changed) _saveProfileScreenshots();
}
```
`[VERIFIED: items.js:7551-7569]`

**Bug bestätigt:** Aufruf übergibt `(mk, fp)`, Funktionssignatur akzeptiert nur `mk` — `fp` wird stillschweigend verworfen (kein Fehler, JS erlaubt Überzähligkeit). `img = LSCG_SCREENSHOTS[mk]` liest den **falschen Schlüssel**, sobald `fp` gesetzt ist (Screenshot liegt unter `mk+'|'+fp`), `img` ist dann `undefined` → sofortiger Return, kein Sync. Nur Outfits **ohne** Fingerprint (seltener Fall, `fp` ist `null`/falsy) syncen zufällig korrekt, weil dort `storeKey === mk`.

**Fix-Ansatz** (vom CONCERNS.md-Vorschlag übernommen, hier gegen den echten Code geprüft):
```javascript
function _syncLscgScreenshotToProfiles(mk, fp) {
  const key = fp ? (mk + '|' + fp) : mk;
  const img = LSCG_SCREENSHOTS[key];
  if (!img) return;
  // Rest unverändert — entry/versions-Schleife bleibt nötig, weil sie ALLE
  // Profile mit demselben Fingerprint syncen soll (auch andere Versionen
  // desselben Members), nicht nur den einen fp-Parameter.
  ...
}
```
**Wichtig:** Die Schleife über `entry.versions` bleibt trotz `fp`-Parameter nötig — der Zweck der Funktion ist, *alle* Profile mit passendem Fingerprint zu synchronisieren, nicht nur den einen aufrufenden `fp`. Der Fix betrifft nur die **Lesezeile** (`LSCG_SCREENSHOTS[mk]` → `LSCG_SCREENSHOTS[key]`), nicht die Schleifenlogik.

## STAB-09/STAB-10: Vollständige Lösch-Pfad-Tabelle (verifiziert per `Read`)

| # | Funktion | Zeile | Confirm? | Räumt LSCG_DB | Räumt LSCG_SCREENSHOTS | Räumt PROFILE_SCREENSHOTS | Klassifikation |
|---|----------|-------|----------|:---:|:---:|:---:|-----------------|
| 1 | `deleteProfile(name)` | `items.js:2075-2081` | ✅ `confirm()` | — (PROFILES) | — | ✅ eigener Eintrag | (a) korrekt |
| 2 | `removeProfileScreenshot(pname)` | `items.js:2890-2897` | ❌ **fehlt** | — | — | ✅ eigener Eintrag | **(b) STAB-09-Verstoß** — verdrahtet über `index.html:2894` (`pmodRemoveBtn`, "✕ Entfernen") |
| 3 | Bulk-Rename "(old)"-Markierung | `items.js:604-620` | ✅ `confirm()` (Zeile 608, außerhalb des zitierten Blocks — geprüft) | n/a (Rename, kein Delete) | n/a | rename mitgezogen (kein Verlust) | (a) korrekt, kein Lösch-Pfad |
| 4 | `profileRename(slot)` | `items.js:3100-3117` | teils (`confirm()` nur bei Namenskollision, Zeile 3113) | n/a | n/a | rename mitgezogen | (a)/Rename, kein Datenverlust |
| 5 | `enrichProfileNamesWithIDs()` | `items.js:6743-6813` | ❌ kein `confirm()` gefunden | n/a | n/a | ⚠️ **NICHT mitgezogen** — Funktion baut `PROFILES` komplett neu (`Object.keys(PROFILES).forEach(k=>delete PROFILES[k]); Object.assign(PROFILES,newProfiles);`, Zeile 6811-6812), migriert aber `PROFILE_SCREENSHOTS`-Keys nicht mit | (c) Nebeneffekt — kein Datenverlust (Screenshot bleibt unter altem Key liegen), aber Bild erscheint nach Rename als fehlend. **Nicht in REQUIREMENTS.md abgedeckt, hier nur dokumentiert, nicht als Pflichtfix.** |
| 6 | `deleteLscgVersion(mk, vIdx)` | `items.js:10451-10478` | ✅ `confirm()` (Zeile 10456) | ✅ (`delete LSCG_DB[mk]` falls letzte Version, Zeile 10473) | ✅ (`delete LSCG_SCREENSHOTS[key]`, Zeile 10461-10462) | ❌ **NICHT geräumt** | **(a) mit STAB-10-Lücke** — per `_syncLscgScreenshotToProfiles` kopierte Duplikate in `PROFILE_SCREENSHOTS` bleiben verwaist |
| 7 | `deleteOsScreenshot(mk)` | `items.js:10409-10415` | ❌ **fehlt** | — | ✅ eigener Eintrag | ❌ nicht geräumt | **(b) STAB-09-Verstoß + STAB-10-Lücke** — "legacy per-member"-Pfad, aufgerufen aus `deleteOsScreenshotFromLb()` (Zeile 10403) |
| 8 | `deleteOsScreenshotKey(key)` | `items.js:10418-10424` | ❌ **fehlt** | — | ✅ eigener Eintrag | ❌ nicht geräumt | **(b) STAB-09-Verstoß + STAB-10-Lücke** — verdrahtet über `items.js:10259` (🗑-Button jeder Version-Karte, `event.stopPropagation();deleteOsScreenshotKey(...)`) **und** über `deleteOsScreenshotFromLb()` (Zeile 10401, Lightbox) |
| 9 | `clearAllProfileScreenshots()` | `items.js:10480-10487` | ✅ `confirm()` (Zeile 10482) | n/a | n/a | ✅ (`PROFILE_SCREENSHOTS = {}`) | (a) korrekt, in sich abgeschlossen |
| 10 | `clearAllLscgScreenshots()` | `items.js:10490-10497` | ✅ `confirm()` (Zeile 10491) | — | ✅ (`LSCG_SCREENSHOTS = {}`) | ❌ **nicht geräumt** | **(a) mit STAB-10-Lücke** — dieselbe Verwaisungs-Klasse wie #6, nur als Bulk-Operation |
| 11 | `clearAllLscgOutfits()` | `items.js:10500-10510` | ✅ `confirm()` (Zeile 10501) | ✅ | ✅ | ❌ **nicht geräumt** | **(a) mit STAB-10-Lücke** — räumt `_lscgSlots`/`_lscgFpMap` mit, aber nicht `PROFILE_SCREENSHOTS` |
| 12 | `mbsWheelDeleteShot(mn, oi)` | `items.js:9635-9642` | ❌ **fehlt** | n/a (eigener Store `_mbsWheelShots`) | n/a | n/a | **(b)**, aber anderer Storage-Key (`_mbsWheelShots`, nicht `LSCG_SCREENSHOTS`/`PROFILE_SCREENSHOTS`) — **nicht in den drei von REQUIREMENTS.md genannten Speicherorten**, gleiche Bug-Klasse, siehe Open Questions |
| 13 | `window.repairOsOutfitCode(...)` | `items.js:7962-7994` | n/a (Konsolen-Shortcut, kein UI-Button) | — | löscht + plant Neuaufnahme (Zeile 7977-7980) | n/a | (c) beabsichtigter Reparatur-Nebeneffekt, nicht UI-erreichbar — kein Fix nötig, nur dokumentieren |

**Root Cause für alle STAB-10-Lücken (#6, #10, #11):** Es gibt keine zentrale "Lösche X überall"-Funktion. Jeder Aufrufer dupliziert einen Teil der Aufräumlogik von Hand. `_syncLscgScreenshotToProfiles` kopiert (fp-basiert über `_lscgFpMap`), aber keine Gegenstück-Funktion räumt (fp-basiert) wieder auf.

**Empfohlener Fix-Ansatz (eine Hilfsfunktion, an allen drei Stellen #6/#10/#11 aufgerufen):**
```javascript
// Spiegelbild von _syncLscgScreenshotToProfiles: entfernt statt zu kopieren.
function _removeLscgScreenshotFromProfiles(fp) {
  if (!fp) return;
  const keys = _lscgFpMap[fp] ?? [];
  let changed = false;
  for (const k of keys) {
    if (PROFILE_SCREENSHOTS[k]) { delete PROFILE_SCREENSHOTS[k]; changed = true; }
  }
  if (changed) _saveProfileScreenshots();
}
```
Für `clearAllLscgScreenshots()`/`clearAllLscgOutfits()` (kein Einzel-`fp` verfügbar) reicht eine Schleife über alle bekannten `fp`-Werte aus `LSCG_DB`/`_lscgFpMap` vor dem Leeren, oder — einfacher und im Sinne von "confirm sagt genau was passiert" (Pitfall 12) — der `confirm()`-Text erweitert sich um einen Hinweis, dass auch synchronisierte Profil-Bilder betroffen sind, und die Funktion ruft `_removeLscgScreenshotFromProfiles(fp)` für jeden `fp` in `Object.keys(_lscgFpMap)` auf, bevor sie `_lscgFpMap = {}` setzt.

## STAB-03: Speicherplatz-Anzeige — Ort und Vorbild

Es existiert **kein** `navigator.storage`-Aufruf im Repo `[VERIFIED: grep -n "navigator.storage" items.js index.html → keine Treffer]`. `navigator` selbst wird bereits verwendet (`navigator.clipboard.writeText`, sechs Stellen, u. a. `items.js:1644`), aber nie im Ladepfad — nur innerhalb von Button-Handlern, daher unkritisch für die vm-Sandbox beim Laden (nur relevant, wenn ein Test die neue Funktion tatsächlich *aufruft*, siehe Testabschnitt unten).

**Vorbild-Pattern** (`index.html:4166-4181`, existierendes "Automatisches Backup"-Status-Panel):
```javascript
async function _bcBackupZeigeStatus() {
  const el = document.getElementById('bcBackupInfo');
  if (!el || typeof bcBackupStatus !== 'function') return;
  const s = await bcBackupStatus();
  el.innerHTML = s.ordner
    ? 'Ordner: <b>' + s.ordner + '</b><br>...'
    : 'Kein Ordner gewählt – Backups laufen nicht automatisch.';
}
addEventListener('DOMContentLoaded', () => setTimeout(_bcBackupZeigeStatus, 1500));
```
`[VERIFIED: index.html:4166-4181]` — dazugehöriges Markup im Tweaks-Panel: `<div id="bcBackupInfo" ...>–</div>` innerhalb eines `.tweaks-section-title`-Blocks (`index.html:2452-2453`).

**Empfohlene Umsetzung (identisches Muster, neue Sektion im selben Tweaks-Panel, `index.html` ca. Zeile 2379-2470 — Panel-Body):**
```html
<div>
  <div class="tweaks-section-title">💾 Speicher</div>
  <div id="storageInfo" style="font-size:.6875rem;color:var(--text3);margin-top:5px;line-height:1.5">–</div>
</div>
```
```javascript
async function _speicherZeigeStatus() {
  const el = document.getElementById('storageInfo');
  if (!el || !navigator.storage?.estimate) { if (el) el.textContent = 'Speicher-API nicht verfügbar'; return; }
  const { usage, quota } = await navigator.storage.estimate();
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  const pct = quota ? Math.round((usage / quota) * 100) : 0;
  el.innerHTML = mb(usage) + ' von ' + mb(quota) + ' belegt (' + pct + '%)';
}
addEventListener('DOMContentLoaded', () => setTimeout(_speicherZeigeStatus, 1500));
```
**Feature-Detection ist Pflicht:** `navigator.storage?.estimate` kann in manchen Kontexten fehlen (z. B. privates Fenster in älteren Browsern, oder — praktisch relevanter für dieses Projekt, siehe Open Questions — falls das Popup-Fenster `file://` statt `https://` lädt). Die obige Guard-Klausel deckt das ab.

**Test-Implikation:** `navigator` ist in der vm-Sandbox standardmäßig `undefined` `[VERIFIED: Live-Probe in dieser Session — node --input-type=module gegen tests/helpers/loadScript.js: "navigator in ctx: undefined"]`. Ein Test für `_speicherZeigeStatus`/die STAB-03-Funktion muss `navigator` über den bereits vorhandenen `extraGlobals`-Parameter von `loadScript(files, extraGlobals)` injizieren — **keine Änderung an `tests/helpers/loadScript.js` selbst nötig**, da `makeSandbox()` `extraGlobals` bereits per Objekt-Spread in die Sandbox mischt:
```javascript
const ctx = loadScript(['items.js'], {
  navigator: { storage: { estimate: async () => ({ usage: 12345, quota: 999999 }) } }
});
```
`[VERIFIED: tests/helpers/loadScript.js — makeSandbox(extraGlobals={}) spread't extraGlobals zuletzt in das sandbox-Objekt, keine Kollision mit vordefinierten Keys]`

## Common Pitfalls

### Pitfall 1: `showStatus`-Throttle als falscher Testbefund missverstehen
**Was schiefgeht:** Ein Test feuert zwei Quota-Fehler kurz hintereinander und erwartet zwei `showStatus`-Aufrufe — bekommt aber nur einen, weil `_idbFehlerGemeldet` den zweiten innerhalb von 10s unterdrückt (`items.js:33-38`).
**Vermeidung:** Pro Testfall `evalIn(ctx, '_idbFehlerGemeldet = 0')` zurücksetzen oder den Throttle explizit als eigenen Testfall behandeln (Zeitmock).

### Pitfall 2: Monkeypatch von `IDBObjectStore.prototype.put` nicht zurücksetzen
**Was schiefgeht:** Ohne Restore in `afterEach` bleibt der Patch für alle folgenden Tests in derselben Vitest-Datei/demselben Worker aktiv — jeder weitere `idbSet`-Aufruf in anderen Tests schlägt plötzlich fehl.
**Vermeidung:** `afterEach(() => { globalThis.IDBObjectStore.prototype.put = origPut; })` oder `vi.spyOn` + `vi.restoreAllMocks()`/`restoreMocks: true` in `vitest.config.js`.

### Pitfall 3: "confirm() vorhanden" mit "STAB-09 erfüllt" verwechseln
**Was schiefgeht:** 4 von 6 Löschfunktionen haben bereits `confirm()` (Tabelle oben) — es ist verlockend, STAB-09 als praktisch erledigt zu betrachten. Die zwei fehlenden Fälle (`removeProfileScreenshot`, `deleteOsScreenshotKey`/`deleteOsScreenshot`) sind aber genau die im UI am häufigsten geklickten Lösch-Buttons (einzelnes Bild löschen — kein Bulk-Vorgang).
**Vermeidung:** Jede der 13 Zeilen in der Tabelle oben einzeln abhaken, nicht nur grep nach `confirm(` in Lösch-Funktionsnamen.

### Pitfall 4: STAB-10-Fix nur für `deleteLscgVersion` bauen, die zwei `clearAll*`-Fälle vergessen
**Was schiefgeht:** Die Hilfsfunktion `_removeLscgScreenshotFromProfiles(fp)` wird für Einzel-Löschung (`deleteLscgVersion`) eingebaut, aber `clearAllLscgScreenshots()`/`clearAllLscgOutfits()` bleiben unverändert, weil sie "sowieso schon `confirm()` haben" und daher optisch erledigt wirken.
**Vermeidung:** Tabelle oben als Checkliste verwenden — alle drei Zeilen mit ❌ bei PROFILE_SCREENSHOTS müssen denselben Fix bekommen.

### Pitfall 5 (aus `PITFALLS.md` Pitfall 12 übernommen, hier projektspezifisch zugespitzt): Confirm-Text bleibt generisch
**Was schiefgeht:** `confirm('Alle X löschen?')` sagt nicht, dass auch synchronisierte Profil-Bilder mit verschwinden. Nutzer bestätigt, ohne die volle Konsequenz zu kennen.
**Vermeidung:** Confirm-Text um einen Hinweis auf mitgelöschte `PROFILE_SCREENSHOTS`-Duplikate erweitern, sobald der STAB-10-Fix das tatsächlich tut.

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen | Warum |
|---------|-------------|-------------|-------|
| Quota-Fehler erkennen | eigene Fehlercode-Tabelle | `err.name === 'QuotaExceededError'` (bereits in `items.js:56` implementiert) | DOMException-Namen sind standardisiert, kein Wrapper nötig |
| Speicherplatz messen | Summe aller `JSON.stringify(...).length` über alle IDB-Keys | `navigator.storage.estimate()` | Native API liefert Browser-genaue Werte inkl. IDB-Overhead, ist trivial zu implementieren, eigene Berechnung wäre ungenau und aufwändig |
| Quota-Fehler in Tests simulieren | Fake-`indexeddb`-Fork mit eingebauter Quota | Monkeypatch `IDBObjectStore.prototype.put` (siehe oben, live verifiziert) | fake-indexeddb selbst hat keine Quota-Simulation eingebaut; ein Fork wäre Overkill für einen Testfall |

**Key insight:** Diese Phase braucht keine neue Abstraktion — nur punktuelle Fixes an bestehenden Funktionen plus eine neue, kleine Hilfsfunktion (`_removeLscgScreenshotFromProfiles`) und einen neuen UI-Block nach vorhandenem Muster.

## Code Examples

Siehe eingebettete Codeblöcke oben (idbGet/idbSet Ist-Zustand, Quota-Test-Pattern, STAB-01-Fix, STAB-10-Hilfsfunktion, STAB-03-Panel) — alle stammen entweder direkt aus dem gelesenen Produktionscode oder wurden in dieser Session live gegen ihn ausgeführt.

## State of the Art

| Alter Zustand | Aktueller Zustand | Wann geändert | Auswirkung |
|--------------|------------------|-----------------|------|
| CONCERNS.md dokumentiert STAB-02 als offenen Bug ("IDB Write Without Quota Check", Zeile ~175-186) | `idbSet` behandelt Quota bereits vollständig | Vermutlich im `82a9daa "Big Update"`-Commit (Datum unbekannt, STATE.md erwähnt den Commit als "lokaler WIP, seither committet") | Kein Produktions-Fix mehr für STAB-02 nötig, nur TEST-04 |
| CONCERNS.md nennt Zeilen 2735-2738/7551-7569 für den Screenshot-Sync-Bug | Identische Zeilennummern treffen in der aktuellen Datei noch zu (`items.js:2734-2738`, `items.js:7551-7569`) | unverändert seit Analyse | Bug ist real und noch nicht gefixt — CONCERNS.md ist hier zufällig noch aktuell |

**Veraltet:** Die Aussage in CONCERNS.md "Deletion happens in only one location (line 7979 deletes from LSCG_SCREENSHOTS but might not clean up PROFILE_SCREENSHOTS)" zeigt auf `items.js:7979`, was in der aktuellen Datei zu `window.repairOsOutfitCode` (Reparatur-Konsolenbefehl) gehört, nicht zu den eigentlichen UI-Lösch-Buttons — die tatsächlich relevanten Stellen für STAB-10 sind `deleteLscgVersion` (10451), `clearAllLscgScreenshots` (10490) und `clearAllLscgOutfits` (10500), siehe Tabelle oben.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `navigator.storage.estimate()` ist in der Zielumgebung (Chrome/Firefox Desktop, `https://`-Origin) verfügbar und liefert `usage`/`quota` in Bytes | Standard Stack, STAB-03 | Falls das Konfigurator-Popup tatsächlich über `file://` läuft (unwahrscheinlich laut `PROJECT.md` — GitHub-Pages-Hosting über `https://`), wäre die Storage-API evtl. eingeschränkt; Feature-Detection im vorgeschlagenen Code fängt das ab, zeigt dann nur "nicht verfügbar" statt Absturz |
| A2 | Der 10-Sekunden-Throttle in `idbSet` (`_idbFehlerGemeldet`) ist beabsichtigtes Verhalten und keine zu fixende Lücke | Verifizierter Ist-Zustand | Falls der Nutzer/Planner das als STAB-02-Verstoß werten will ("jeder Fehler muss sofort sichtbar sein, nicht nur der erste pro 10s"), wäre eine Anpassung nötig — aktuell nur als Ist-Zustand dokumentiert, nicht bewertet |
| A3 | `enrichProfileNamesWithIDs()` (Zeile 6743) und der fehlende Screenshot-Key-Mitzug sind **nicht** Teil des STAB-09/STAB-10-Scopes dieser Phase, da REQUIREMENTS.md nur "Bilder, Outfits, Outfit-Versionen löschen" nennt und dies ein Rename ohne Datenverlust ist | STAB-09/STAB-10-Tabelle, Zeile 5 | Falls der Planner das doch einschließen will, ist zusätzlicher Aufwand nötig (Screenshot-Migration bei Rename) |
| A4 | `mbsWheelDeleteShot()` (eigener Store `_mbsWheelShots`) liegt außerhalb des von REQUIREMENTS.md explizit genannten Drei-Speicherorte-Scopes (LSCG_DB/LSCG_SCREENSHOTS/PROFILE_SCREENSHOTS) | STAB-09/STAB-10-Tabelle, Zeile 12 | Gleiche Bug-Klasse (kein `confirm()`) bleibt bestehen, falls nicht mit adressiert — günstige Gelegenheit, es im selben Rutsch zu fixen, aber nicht formal von den Erfolgskriterien verlangt |

## Open Questions

1. **Soll `mbsWheelDeleteShot()` in dieser Phase mitgefixt werden?**
   - Was wir wissen: identischer Bug-Pattern (kein `confirm()`), aber anderer Storage-Key, nicht in den REQUIREMENTS.md-Erfolgskriterien namentlich erwähnt.
   - Was unklar ist: ob "Bilder ... nur über eine explizite Nutzeraktion mit Bestätigungsdialog löschbar" (STAB-09-Wortlaut) *alle* Bild-Lösch-Pfade meint oder nur die drei genannten Speicherorte.
   - Empfehlung: mitfixen (gleicher Aufwand, ein `confirm()` hinzufügen), aber als separate Plan-Task kennzeichnen, damit STAB-09/STAB-10-Verifikation nicht künstlich aufgebläht wird.

2. **Throttle-Verhalten in `idbSet` (`_idbFehlerGemeldet`) — Testfall oder Fix?**
   - Was wir wissen: Kommentar im Code deutet auf beabsichtigtes Anti-Spam-Design hin.
   - Was unklar ist: ob der Nutzer das als Teil von "der Fehler wird nie still verschluckt" (PROJECT.md Kernwert) für zu lax hält (zweiter Fehler binnen 10s bleibt UI-seitig unsichtbar, auch wenn er weiterhin `return false` liefert und geloggt wird).
   - Empfehlung: als Ist-Zustand dokumentieren und testen (nicht ändern), es sei denn der Nutzer äußert in `/gsd-discuss-phase` explizit Bedenken.

3. **`enrichProfileNamesWithIDs()` — Screenshot-Migration bei Rename nachziehen?**
   - Was wir wissen: kein Datenverlust (Screenshot bleibt unter altem Key), aber UX-Lücke (Bild "verschwindet" optisch nach Rename).
   - Was unklar ist: Priorität — nicht in REQUIREMENTS.md, aber im gleichen Themenfeld wie STAB-01.
   - Empfehlung: nicht in Phase 2 fixen (Scope-Disziplin), als Backlog-Kandidat notieren.

## Environment Availability

Diese Phase hat keine externen Tool-/Service-Abhängigkeiten über die bereits in Phase 1 etablierten `devDependencies` hinaus (kein neues npm-Paket, kein Server, keine Datenbank, kein Docker). `navigator.storage.estimate()` ist eine Browser-Laufzeit-API, keine Node/CLI-Abhängigkeit — ihre Verfügbarkeit wird zur Laufzeit per Feature-Detection geprüft (siehe STAB-03-Code oben), nicht über diesen Research-Schritt.

**Node/npm-Umgebung (für `npm test`):** `package.json:8` fordert `"node": ">=22.12.0"` `[VERIFIED: package.json:8]` — bereits in Phase 1 etabliert, hier nur bestätigt, keine Änderung nötig.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 `[VERIFIED: package.json:12]` |
| Config file | `vitest.config.js` (environment: node, setupFiles: `tests/setup/fake-indexeddb.js`) |
| Quick run command | `npx vitest run tests/idb-helpers.test.js` (oder neue Datei) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-01 | `_syncLscgScreenshotToProfiles(mk, fp)` liest denselben Schlüssel, unter dem gespeichert wurde | unit | `npx vitest run tests/screenshot-sync.test.js` | ❌ Wave 0 — neue Datei |
| STAB-02 | `idbSet` erkennt `QuotaExceededError`, ruft `showStatus(...,'error')`, gibt `false` zurück, kein Teilschreibvorgang | unit | `npx vitest run tests/idb-helpers.test.js` | ⚠️ Datei existiert (`tests/idb-helpers.test.js`), Quota-Fall fehlt noch (WR-03) — Test **ergänzen**, nicht neu anlegen |
| STAB-03 | `navigator.storage.estimate()`-Ergebnis wird im UI-Panel korrekt formatiert dargestellt (inkl. Fallback bei fehlender API) | unit | `npx vitest run tests/storage-estimate.test.js` | ❌ Wave 0 — neue Datei; erfordert `navigator`-Stub via `extraGlobals` (kein Loader-Change nötig, siehe oben) |
| STAB-09 | Jeder der 3 identifizierten confirm-losen Lösch-Pfade (`removeProfileScreenshot`, `deleteOsScreenshot`, `deleteOsScreenshotKey`) verlangt `confirm()`; bei `confirm()===false` bleibt der Datensatz unverändert | unit | `npx vitest run tests/delete-confirmation.test.js` | ❌ Wave 0 — neue Datei; `confirm` muss in `makeSandbox()`/`extraGlobals` als spionierbarer Stub übergeben werden (aktuell nicht in `makeSandbox()` vordefiniert → per `extraGlobals: { confirm: vi.fn(...) }` einspeisen, analog zum `navigator`-Muster oben) |
| STAB-10 | Nach bestätigtem Löschen (`deleteLscgVersion`, `clearAllLscgScreenshots`, `clearAllLscgOutfits`) existiert der Datensatz in keinem der drei Speicherorte mehr | unit | `npx vitest run tests/delete-consistency.test.js` | ❌ Wave 0 — neue Datei |
| TEST-04 | `idbGet`/`idbSet` inkl. Quota-Fehlerpfad getestet | unit | `npx vitest run tests/idb-helpers.test.js` | ⚠️ Erweitern (siehe STAB-02-Zeile) |

### Sampling Rate
- **Per task commit:** die jeweils neue/geänderte Testdatei gezielt (`npx vitest run tests/<datei>.test.js`)
- **Per wave merge:** `npm test` (volle Suite, aktuell 44 passed + 2 `it.fails`, siehe `01-02-SUMMARY.md`)
- **Phase gate:** `npm test` grün, `node --check items.js` weiterhin ohne Fehler (Projekt-Konvention, CLAUDE.md "Code checked via `node --check`")

### Wave 0 Gaps
- [ ] `tests/screenshot-sync.test.js` — deckt STAB-01 ab; muss `LSCG_DB`, `_lscgFpMap`, `PROFILE_SCREENSHOTS` über `evalIn`/direkte Sandbox-Property-Zuweisung vorbereiten (`_lscgFpMap` ist `let`-Top-Level → nur per `evalIn` schreibbar, analog zu `_bots` in Phase 1)
- [ ] `tests/storage-estimate.test.js` — deckt STAB-03 ab; `navigator`-Stub per `extraGlobals`, kein Loader-Change nötig
- [ ] `tests/delete-confirmation.test.js` — deckt STAB-09 ab; `confirm`-Stub per `extraGlobals` (Spy-Funktion, die `true`/`false` zurückgibt je nach Testfall) — **`makeSandbox()` definiert aktuell kein `confirm`**, muss also bei jedem betroffenen Testaufruf explizit mitgegeben werden, sonst wirft `items.js` beim Aufruf von `confirm(...)` einen `ReferenceError` in der Sandbox (nicht verifiziert, aber dieselbe Logik wie beim `navigator`-Befund oben: kein Browser-Global ist in `vm.createContext({})` automatisch vorhanden)
- [ ] `tests/delete-consistency.test.js` — deckt STAB-10 ab; muss vor dem Fix rot sein (zeigt die drei bestehenden Lücken auf), nach dem Fix grün
- [ ] `tests/idb-helpers.test.js` erweitern — Quota-Fall (verifiziertes Pattern oben), plus `afterEach`-Restore für den `IDBObjectStore.prototype.put`-Monkeypatch

## Security Domain

`security_enforcement` ist in `.planning/config.json` nicht explizit auf `false` gesetzt → Standardmäßig aktiv, hier aber mit sehr kleinem Radius: Diese Phase berührt keine Authentifizierung, Netzwerk-Grenzen oder Kryptographie — sie ist reine Client-seitige Persistenz-Härtung.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | Kein Login, Einzelnutzer-Tool |
| V3 Session Management | nein | Kein Server-Session-Konzept |
| V4 Access Control | nein | Kein Rollenmodell |
| V5 Input Validation | teilweise | `confirm()`-Rückgabewert ist bereits boolesch, keine Injection-Fläche; Lösch-Parameter (`mk`, `vIdx`, `fp`) stammen aus vertrauenswürdigen internen Datenstrukturen, nicht aus Nutzereingabe |
| V6 Cryptography | nein | Keine Kryptographie in dieser Phase |

### Known Threat Patterns für diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Datenverlust durch fehlende Bestätigung (STAB-09) | Repudiation/Denial-of-Service gegen die eigenen Daten des Nutzers | `confirm()` vor jeder destruktiven Aktion — Fokus dieser Phase |
| Inkonsistenter Zustand nach Teil-Löschung (STAB-10) | Tampering (impliziter Datenzustand, der nicht der UI-Anzeige entspricht) | Zentrale Aufräum-Hilfsfunktion statt verteilter Ad-hoc-Löschungen |

## Sources

### Primary (HIGH confidence)
- `items.js` (Produktionscode, direkt gelesen: Zeilen 5-63, 595-625, 2060-2140, 2870-2900, 3095-3120, 5355-5555, 6700-6820, 7495-7620, 7960-7995, 8160-8180, 8440-8460, 9630-9650, 10250-10520) — alle Kernaussagen zu STAB-01/02/09/10
- `index.html` (Zeilen 2360-2460, 3540-3560, 4160-4185) — STAB-03-Vorbild und `removeProfileScreenshot`-Verdrahtung
- `tests/helpers/loadScript.js`, `tests/idb-helpers.test.js`, `tests/idb-canary.test.js` — Test-Konventionen
- Live-Ausführung eines Node/ESM-Scratch-Skripts in dieser Session gegen `fake-indexeddb` + echtes `items.js` — Quota-Pattern und `navigator`-Verfügbarkeit

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` (Pitfall 10, 12) — Cross-Check der Lösch-/Migrations-Risiken, projektspezifisch bereits gegen `CONCERNS.md` verifiziert
- `.planning/phases/01-testfundament/01-REVIEW.md` (WR-02, WR-03) — Bestätigung der Testlücke, die TEST-04 schließen soll

### Tertiary (LOW confidence)
- `navigator.storage.estimate()`-Verhalten in Edge-Cases (privater Modus, `file://`) — nicht in dieser Session gegen MDN/Caniuse geprüft, siehe Assumption A1

## Metadata

**Confidence breakdown:**
- STAB-01/STAB-09/STAB-10 (Lösch-Pfad-Tabelle): HIGH — jede Zeile per `Read`/`awk` am aktuellen Code verifiziert, keine geratenen Zeilennummern
- STAB-02/TEST-04 (Quota-Pattern): HIGH — Pattern live gegen echten Produktionscode ausgeführt, Ausgabe zitiert
- STAB-03: MEDIUM — Code-Vorschlag folgt echtem Vorbild-Pattern, aber `navigator.storage`-Browser-Verhalten selbst nicht live getestet (kein Browser in dieser Session verfügbar)

**Research date:** 2026-09-13
**Valid until:** Bis zum nächsten Produktions-Commit an `items.js`/`index.html` (Zeilennummern sind stichtagsbezogen); danach mit `git blame`/erneutem `grep` gegenprüfen, bevor der Plan ausgeführt wird
