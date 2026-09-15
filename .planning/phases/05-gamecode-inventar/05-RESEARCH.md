# Phase 5: Gamecode-Inventar - Research

**Researched:** 2026-09-15
**Domain:** Read-only runtime introspection of a live Bondage Club (BC) game tab (window globals, `Asset[]`/`AssetGroup[]` catalog, `bcModSdk` mod registry, mod-specific globals) via the existing `postMessage` bridge; chunked so the game tab never freezes; result stored as a versioned IndexedDB snapshot.
**Confidence:** HIGH for everything anchored in `05-CONSOLE-RESULT.json`/`05-CONSOLE-FINDINGS.md` (real numbers from the user's live R131 session) and in the codebase (`loader.js`, `bridge.js`, `persistence.js` read directly this session); MEDIUM for browser-platform claims (postMessage size limits, `requestIdleCallback` support) confirmed via web search but not BC-specific; LOW/ASSUMED only for the exact shape of two probes that cannot be verified without re-running a console command (see Assumptions Log).

## Summary

SCAN-13 is already done — the user ran a real console probe in a live R131 session with 28 mods loaded, and `05-CONSOLE-RESULT.json`/`05-CONSOLE-FINDINGS.md` are the authoritative answers to every open question this phase used to have. This research does not re-derive those numbers; it reads them as ground truth and designs the enumerator, the bridge contract, and the storage layer around them. The three prior open questions from `.planning/research/FEATURES.md`/`ARCHITECTURE.md` (bcModSdk shape, WCE/FBC global, getter side effects) are now closed with real data, not assumptions.

The codebase context is more favorable than the milestone-level research assumed: `bridge.js`'s handler registry (`onBridgeMessage`/`_bridgeDispatch`) already isolates handler exceptions with a per-handler `try/catch` (`bridge.js:144-152`) and treats duplicate registration as a no-op (`bridge.js:131`) — both **more current and more correct** than the still-committed `docs/LOAD-ORDER.md` prose, which describes the pre-fix behavior ("keine try/catch-Isolation... ein werfender Handler bricht den Dispatch ab") from before commit `3ba37c5`. A new `GAME_INVENTORY_DATA`/`GAME_INVENTORY_PROGRESS` pair needs zero changes to `items.js` or `bridge.js` — `game-scan.js` registers both with `onBridgeMessage()` per the pattern already proven for 35 existing types. On the loader side, `loader.js` already imports and uses `bcModSdk` for its own `BCK_BCXFilter` mod (`loader.js:1372-1412`), already iterates `Asset[]` (`loader.js:541-548`, `loader.js:804-813`), and already has a proven chunk-across-idle-time helper (`_BCU_leerlauf`, `loader.js:1441-1444`) that can be reused verbatim for the new enumerator's chunking loop instead of inventing a new one.

The single biggest correctness risk is **not** payload size (a full estimate below puts the assembled snapshot at roughly 2-3 MB, well inside any documented `postMessage` limit) — it is that `postMessage`'s structured-clone algorithm **cannot clone functions** and throws `DataCloneError` synchronously if one slips through. `bcModSdk.getPatchingInfo()`'s 546 entries each carry three function-valued keys (`original`, `sdkEntrypoint`, `currentEntrypoint`) that must be stripped before the object ever reaches a `postMessage` call, not just "not read" — the same applies to any mod's function-valued globals (`mbs.getDebug`, `LSCG.getModule`, all `fbc*`/`Themed_*` functions) if a probe naively spreads a whole mod object instead of allowlisting scalar fields.

The second-biggest design gap is testability: `loader.js` has never been loaded in the Vitest sandbox (confirmed by re-reading `tests/helpers/loadScript.js` this session — no `window.open`, `screen`, `MutationObserver`, or `ServerSocket` stub exists, and `tests/loader-origin.test.js` tests `loader.js` only by reading its source as text, never by executing it). Phase 3's research explicitly deferred this ("Pitfall 4... zahlt auf Phase 5s Gamecode-Scan-Tests ein, die ohnehin eine `loader.js`-Sandbox brauchen werden") — this phase is where that bill comes due, and it is the largest Wave 0 gap.

**Primary recommendation:** Build the enumerator as a new, isolated function block inside `loader.js` (not touching the existing `switch`'s synchronous case bodies), chunk it with the same idle-time pattern `_BCU_leerlauf` already uses, allowlist every mod/asset/function payload down to scalars *before* it is ever assigned into an object that might reach `postMessage`, and invest first in a dedicated `loader.js` Vitest sandbox (stubs: `window.open`, `screen`, `MutationObserver`, `ServerSocket.on/off`, `bcModSdk` mock, a synthetic `window` with >100 own properties including a throwing getter) — this is the prerequisite for testing SCAN-02 through SCAN-07 at all, and it is reusable by Phase 6.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-13 | Konsolen-Klärung vor Enumerator-Bau | Already done — `05-CONSOLE-FINDINGS.md`/`05-CONSOLE-RESULT.json` are the ground truth this entire document builds on (Summary, all Pattern sections) |
| SCAN-01 | Scan auslösen; `GET_GAME_INVENTORY`/`GAME_INVENTORY_DATA` über die Bridge | Pattern 5 (Bridge-Vertrag), Code Examples §1-2 — reuses `onBridgeMessage`/`reqId` conventions verified in `bridge.js`/`items.js` |
| SCAN-02 | Core-Globals/-Funktionen mit Typ+Signatur | Pattern 1 (chunked window walk), Pattern 2 (Inventory\* grouping), Common Pitfall 1/5 |
| SCAN-03 | Asset-Katalog: Gruppen, Items, Eigenschaften, Sperren, Farben/Layer | Pattern 3 (Asset/AssetGroup allowlist serialization), Common Pitfall 2/6, quoted key list from `05-CONSOLE-RESULT.json` |
| SCAN-04 | Chat-Handler/Ereignis-Hooks | Pattern 4 (Chat-Hook-Probe), Open Question 1 — no introspectable registry confirmed to exist |
| SCAN-05 | `bcModSdk.getModsInfo()`/`getPatchingInfo()` | Pattern 3, Common Pitfall 6 — exact shape verified in `05-CONSOLE-RESULT.json` |
| SCAN-06 | Fallback-Probes BCX/MBS/LSCG/WCE-FBC/Themed | Pattern 3, Code Example §4 — exact detection globals verified in `05-CONSOLE-FINDINGS.md` |
| SCAN-07 | Read-only, kein Funktionsaufruf, Getter meiden, Tiefe/Umfang begrenzt, gechunkt | Pattern 1, Common Pitfall 1/3, Environment Availability (`requestIdleCallback`) |
| SCAN-08 | Versionierter Snapshot, nie automatisch entfernt | Pattern 6 (Snapshot-Store) |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scan-Trigger + Fortschrittsanzeige (Tweaks-Panel) | Tool-Fenster (Browser/Client) | — | Neue UI-Elemente, gleiches Muster wie `#execLogInfo`/`#screenshotStoreInfo` (`index.html:2466-2480`) |
| `GET_GAME_INVENTORY`/`GAME_INVENTORY_DATA`/`GAME_INVENTORY_PROGRESS`-Registrierung | Tool-Fenster (`game-scan.js`, via `bridge.js`) | — | `onBridgeMessage()` läuft ausschließlich im Tool-Fenster; keine Änderung an `items.js`/`bridge.js` nötig (bereits bewiesenes Muster, `bridge.js:120-133`) |
| Window-/Funktions-Enumeration | Injizierter Loader (Browser/Client, im Spiel-Tab) | — | Nur der Loader hat Zugriff auf `window`/`Asset`/`bcModSdk` des Spiel-Tabs |
| Asset-/AssetGroup-Katalogisierung | Injizierter Loader | — | Direkter Lesezugriff auf `Asset[]`/`AssetGroup[]`, wie der bestehende Cache-Builder (`loader.js:541-548`) |
| Mod-Registry-Lesen (`bcModSdk`) + Fallback-Probes | Injizierter Loader | — | `bcModSdk` ist ein Spiel-Tab-Global; der Loader nutzt es bereits (`loader.js:1376-1411`) |
| Read-only-/Chunking-Disziplin (keine Getter, keine Aufrufe, Idle-Time-Slicing) | Injizierter Loader | — | Ausführungsort der Enumeration; `_BCU_leerlauf` (`loader.js:1441-1444`) ist das bestehende Muster |
| Snapshot-Persistenz (neuer `snapshots`-Store) | Tool-Fenster + `persistence.js` + IndexedDB | — | Gleiche Schicht wie der bestehende `screenshots`-Store (additive IDB-Versionierung) |
| Scan-Ergebnis-Rendering (Tweaks-Panel-Statuszeile) | Tool-Fenster | — | Phase 5 braucht nur Status/Fortschritt; der durchsuchbare Scan-Tab ist Phase 6 |

## Standard Stack

Diese Phase installiert **keine** neuen Pakete — reine Erweiterung von bestehendem Vanilla-JS (`loader.js`, neues `game-scan.js`, `persistence.js`). Der Package-Legitimacy-Gate entfällt.

### Core
Kein neuer Code-Stack. Alle Änderungen nutzen vorhandene Browser-APIs plus das bereits im Spiel vorhandene `bcModSdk`-Global:

| API/Global | Zweck | Provenance |
|-----|-------|------------|
| `Object.getOwnPropertyNames(window)` + `Object.getOwnPropertyDescriptor` | Eigene Properties enumerieren, Getter erkennen ohne sie zu lesen | [VERIFIED: 05-CONSOLE-RESULT.json:38 — `"windowGetters": {"totalOwnProps": 18700, "getterCount": 189, "getterSampleAllStandardDOM": true}`] bestätigt, dass genau diese Unterscheidung (Getter vs. Daten-Property) nötig und ausreichend ist |
| `requestIdleCallback` mit `setTimeout`-Fallback | Chunking über mehrere Ticks, Haupt-Thread bleibt frei | [VERIFIED: loader.js:1441-1444 — `function _BCU_leerlauf(fn) {\n    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 });\n    else setTimeout(fn, 16);\n  }`] — bereits im Repo vorhanden und produktiv genutzt; [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback — Safari (macOS/iOS) unterstützt `requestIdleCallback` nicht ohne Feature-Flag, Fallback ist Pflicht, nicht optional] |
| `window.bcModSdk.getModsInfo()`/`getPatchingInfo()` | Mod-Registry + Hook-Registry lesen | [VERIFIED: 05-CONSOLE-RESULT.json:3-19 — API-Keys, Rückgabeformen, Beispieleinträge aus der echten R131-Session] |
| `MessageEvent`/`postMessage` (bestehende Bridge) | Transport | Bereits im Einsatz (`bridge.js`, `loader.js`); kein neuer Trust-Boundary-Übergang |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Einzelne finale `GAME_INVENTORY_DATA`-Nachricht (voller Snapshot) | Mehrteilige `{part, total, reqId}`-Chunks über mehrere Nachrichten | Verworfen für v1: geschätzte Payload-Größe (~2-3 MB, siehe Pattern 1) liegt weit unter jeder dokumentierten `postMessage`-Grenze [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/postMessage — WebKit erzwingt keine Größenbegrenzung außer verfügbarem Speicher; HTML-Standard definiert keine harte Grenze]. Mehrteiliges Chunking würde nur Komplexität (Reassemblierung, Teilausfall-Handling) ohne belegten Nutzen hinzufügen — Chunking gehört in die **Enumeration** (Pattern 1), nicht in den Transport. |
| `bcModSdk`-Mods per `getOwnPropertyNames` universell abklopfen | Pro-Mod fest codierte Probe-Liste (BCX/MBS/LSCG/WCE/Themed) | Feste Liste gewählt: die vier+eins benannten Mods haben in `05-CONSOLE-FINDINGS.md` bestätigte, stabile Erkennungs-Globals; ein universeller Sweep (`Object.keys(window).filter(/^(WCE|FBC|...)/)`) bleibt als **zusätzlicher**, nicht ersetzender Diagnose-Layer sinnvoll (siehe Pattern 3) |

**Installation:** Keine — reine Quelländerung, kein `npm install`.

## Package Legitimacy Audit

**Nicht anwendbar.** Diese Phase installiert keine externen Pakete (weder Produktions- noch Test-Dependencies).

## Architecture Patterns

### System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Tool-Fenster (index.html, Tweaks-Panel)                               │
│                                                                        │
│  [🔎 Spiel scannen]-Button ──► game-scan.js:                          │
│    reqId = 'gi_' + Date.now()                                         │
│    bcSend({type:'GET_GAME_INVENTORY', reqId})  ───┐                   │
│                                                     │ via bridge.js    │
│  onBridgeMessage('GAME_INVENTORY_PROGRESS', ev=>{  │ (bcSend/         │
│    zeigt "Scan läuft… <ev.data.step>/<ev.data.total>") │ onBridgeMessage,│
│                                                     │  unverändert)   │
│  onBridgeMessage('GAME_INVENTORY_DATA', ev=>{      │                  │
│    idbSet('snapshots'-Store, ev.data.snapshot)     │                  │
│    Tweaks-Panel-Statuszeile aktualisieren })        │                  │
└─────────────────────────────────────────────────┬──┴──────────────────┘
                                                    │ postMessage(msg, _bcOrigin)
                                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ loader.js (im Spiel-Tab, neuer case in bestehendem switch, ~loader.js:850) │
│                                                                        │
│  case 'GET_GAME_INVENTORY': {                                         │
│    _buildGameInventoryChunked(reqId, src);  // kehrt SOFORT zurück,   │
│    break;                                    // Rest läuft idle-getickt│
│  }                                                                    │
│                                                                        │
│  _buildGameInventoryChunked():                                        │
│   ①  window-Walk (Object.getOwnPropertyNames, 500/Tick via            │
│      requestIdleCallback||setTimeout — Muster _BCU_leerlauf)          │
│       → klassifiziert nach typeof, Getter markiert NIE gelesen        │
│       → Inventory*-Funktionen nach Gruppen-Präfix gebündelt           │
│   ②  Asset[]/AssetGroup[]-Walk (analog zum bestehenden Cache-Builder) │
│       → Allowlist-Keys, Group/ParentItem nur als Name, Tiefe ≤2       │
│   ③  bcModSdk.getModsInfo()/getPatchingInfo() (falls vorhanden)       │
│       → patchingInfo: NUR name/originalHash/hookedByMods/patchedByMods│
│   ④  Fallback-Mod-Probes (BCX/MBS/LSCG/WCE-FBC/Themed)                │
│       → jede Probe liest NUR bekannte, dokumentierte Felder           │
│   ⑤  Chat-Hook-Probe (ChatRoomRegisterMessageHandler + evtl. Registry)│
│    nach jedem Schritt: src.postMessage(GAME_INVENTORY_PROGRESS, …)    │
│    am Ende:            src.postMessage(GAME_INVENTORY_DATA, snapshot) │
└──────────────────────────────┬─────────────────────────────────────────┘
                                │ liest (nie schreibt/ruft auf)
                     BC-Spiel-Globals (window, Asset[], AssetGroup[],
                     bcModSdk, bcx, mbs, LSCG, fbc*, Themed*)
```

### Recommended Project Structure

```
bc-universal-configurator/
├── loader.js                    # WÄCHST — neuer case 'GET_GAME_INVENTORY' + _buildGameInventoryChunked()
├── game-scan.js                 # NEU — Scan-Trigger, GAME_INVENTORY_DATA/-PROGRESS-Handler, Snapshot-Speichern
├── persistence.js               # WÄCHST — _IDB_VERSION 2→3, neuer 'snapshots'-Store, idbSnapshotPut/GetAll/Delete
├── index.html                   # NUR Einfügung: game-scan.js-<script>-Zeile, Tweaks-Panel-Sektion "🔎 Spiel-Scan"
├── docs/LOAD-ORDER.md            # Zeile für game-scan.js, ggf. Korrektur der veralteten try/catch-Aussage
└── tests/
    ├── helpers/
    │   └── loaderSandbox.js      # NEU — dedizierte loader.js-Sandbox (Wave 0, siehe Validation Architecture)
    ├── game-inventory-enumerator.test.js   # NEU — SCAN-02..07 gegen die neue Sandbox
    ├── game-scan-bridge.test.js            # NEU — SCAN-01/08, Tool-seitige Handler
    └── helpers/loadScript.js               # unverändert — bleibt die Tool-Fenster-Sandbox
```

### Pattern 1: Chunked window enumeration (SCAN-02, SCAN-07)

**What:** `Object.getOwnPropertyNames(window)` liefert alle 18.700 eigenen Properties auf einmal — das Array selbst zu holen ist billig, aber jede davon einzeln zu klassifizieren (Deskriptor lesen, `typeof` prüfen, ggf. `fn.length`) in einer Schleife blockiert den Haupt-Thread messbar. Das bestehende `_BCU_leerlauf`-Muster (Idle-Callback mit `setTimeout`-Fallback) wird wiederverwendet, um die Liste in Batches von z. B. 500 Namen pro Tick abzuarbeiten.

**When to use:** Für den gesamten Global-/Funktions-Walk (SCAN-02) und den Asset-Walk (SCAN-03) — beide iterieren über tausende Einträge (18.700 bzw. 4.764).

**Example:**
```javascript
// loader.js — neuer Block, Muster von _BCU_leerlauf (loader.js:1441-1444) übernommen
function _giChunked(items, batchSize, onBatch, onDone) {
  let i = 0;
  function tick() {
    const end = Math.min(i + batchSize, items.length);
    for (; i < end; i++) onBatch(items[i], i);
    if (i < items.length) {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(tick, { timeout: 1500 });
      else setTimeout(tick, 16);
    } else {
      onDone();
    }
  }
  tick();
}

function _giClassifyGlobal(name, out) {
  const desc = Object.getOwnPropertyDescriptor(window, name);
  if (!desc) return;
  if (desc.get) { out.getters.push(name); return; }         // NIE lesen (SCAN-07)
  const v = desc.value;
  const t = typeof v;
  if (t === 'function') {
    out.functions.push({ name, arity: v.length });          // kein toString() im Massenlauf
  } else if (t === 'object' || t === 'string' || t === 'boolean' || t === 'number') {
    out.values.push({ name, type: t === 'object' ? (v === null ? 'null' : 'object') : t });
  }
}
```

**Trade-offs:** `requestIdleCallback` fehlt in Safari [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback — "Safari on macOS and iOS hide it behind a feature flag"] — der `setTimeout(fn, 16)`-Fallback ist Pflicht, nicht optional, und bereits im Repo vorhanden (`_BCU_leerlauf`). Ein Batch von 500 Namen × ~38 Ticks (18.700/500) dauert bei `setTimeout`-Fallback (16ms Floor je Tick) grob 600ms Wall-Time, aber jeder einzelne Tick bleibt kurz genug, dass der Tab bedienbar bleibt (SCAN-07-Kernanforderung).

### Pattern 2: Inventory\*-Gruppierung statt 11.000 Einzelzeilen (SCAN-02)

**What:** Von den 18.700 Window-Properties matchen 12.557 die in `05-CONSOLE-RESULT.json` gezählten Präfixe, davon allein 11.000 mit `Inventory` [VERIFIED: 05-CONSOLE-RESULT.json:41 — `"byPrefix": {"Character": 143, "Lock": 2, "Common": 121, "Player": 33, "Asset": 43, "Reputation": 6, "Skill": 20, "Pose": 10, "Dialog": 166, "Inventory": 11000, "Item": 51, "Server": 64, "Assets": 278, "Online": 24, "Wardrobe": 23, "Chat": 573}`]. Diese sind BC-Konvention `InventoryItem<Group><Asset>...`-Funktionen je Asset — eine flache Liste wäre für SCAN-10 (Phase 6) unbrauchbar und würde den Payload unnötig aufblähen. Statt individueller Namen: für jeden Namen, der mit `Inventory` beginnt, gegen die bereits im Loader vorhandene Gruppen-Liste [VERIFIED: loader.js:551-559 — `const gruppen = [\n      'ItemHandheld','ItemMisc','ItemAddon','ItemHands','ItemArms','ItemLegs','ItemFeet',\n      'ItemNeck','ItemHead','ItemMouth','ItemEyes','ItemEars','ItemNose','ItemTorso',\n      'ItemTorso2','ItemPelvis','ItemVulva','ItemVulvaPiercings','ItemButt','ItemNipples',\n      'ItemNipplesPiercings','ItemBoots','ItemHood','ItemDevices','ItemNeckAccessories',\n      'ItemNeckRestraints','ItemMouthAccessory','Cloth','ClothLower','ClothAccessory',\n      'Shoes','Hat','Gloves','Socks','Bracelet','Mask','Decals','Bra','Panties',\n      'Corset','SocksRight'\n    ];`] matchen (`InventoryItem<Gruppe>...`) und in Eimer gruppieren: `{ prefix: 'InventoryItemItemDevices', count: N, sample: [ersten 5 Namen] }`; alles, was nicht matcht, landet in einem `InventoryOther`-Eimer.

**When to use:** Ausschließlich für den `Inventory`-Präfix (11.000 von 12.557 Treffern) — die übrigen Präfixe (`Chat` 573, `Assets` 278, `Dialog` 166, `Character` 143 usw.) sind klein genug, um als flache Liste übernommen zu werden.

**Trade-offs:** Die Gruppen-Liste (`gruppen`, 38 Einträge) ist nicht vollständig (BC hat mehr als 38 Item-Gruppen laut `05-CONSOLE-RESULT.json:45` — 120 `AssetGroup`s insgesamt) — der `InventoryOther`-Eimer wird also nicht leer sein. Das ist akzeptabel für v1: Ziel ist Kompaktheit, nicht Vollständigkeit der Gruppierung; SCAN-09/10 (Phase 6, Baseline-Diff) kann bei Bedarf feiner nacharbeiten.

### Pattern 3: Asset/AssetGroup-Serialisierung ohne Zirkelbezug (SCAN-03)

**What:** `Asset[]` hat 4.764 Einträge, 100 Keys pro Asset, Verschachtelungstiefe 5, **bestätigter Zirkelbezug** `Asset.Group.Asset` [VERIFIED: 05-CONSOLE-RESULT.json:46 — `"assets": {"assetCount": 4764, "groupCount": 120, "maxDepthSample": 5, "hasCircularGroupRef": true, "sampleName": "LeatherJacket", "sampleGroup": "ClothOuter", ...}`]. Ein naives `JSON.stringify(Asset)` wirft `TypeError: Converting circular structure to JSON`. Die Lösung ist eine Allowlist skalarer/Array-Keys aus der tatsächlichen 100-Key-Liste [VERIFIED: 05-CONSOLE-RESULT.json:47 — `"assetKeys": ["Name","Description","Group","ParentItem","Enable","Visible","DrawOffset","NotVisibleOnScreen","Wear","Activity","ActivityAudio","AllowActivity","AllowActivityOn","ActivityExpression","BuyGroup","InventoryID","Effect","Bonus","Block","Expose","Hide","HideItem","HideItemExclude","HideItemAttribute","Require","SetPose","AllowActivePose","Value","NeverSell","Difficulty","SelfBondage","SelfUnlock","ExclusiveUnlock","Random","RemoveAtLogin","WearTime","RemoveTime","RemoveTimer","MaxTimer","HeightModifier","ZoomModifier","Prerequisite","Extended","AlwaysExtend","AlwaysInteract","AllowLock","LayerVisibility","IsLock","PickDifficulty","OwnerOnly","LoverOnly","FamilyOnly","ExpressionTrigger","RemoveItemOnRemove","AllowEffect","AllowBlock","AllowTighten","AllowHide","AllowHideItem","DefaultColor","EditOpacity","Audio","Category","Fetish","ArousalZone","IsRestraint","BodyCosplay","OverrideBlinking","DialogSortOverride","DynamicDescription","DynamicPreviewImage","DynamicAllowInventoryAdd","DynamicName","DynamicGroupName","DynamicActivity","DynamicAudio","AllowRemoveExclusive","InheritColor","DynamicBeforeDraw","DynamicAfterDraw","DynamicScriptDraw","CreateLayerTypes","AllowLockType","AvailableLocations","OverrideHeight","DrawLocks","AllowExpression","MirrorExpression","FixedPosition","Layer","ColorableLayerCount","CustomBlindBackground","Attribute","PreviewIcons","Tint","AllowTint","DefaultTint","Gender","CraftGroup","ExpressionPrerequisite","AllowColorize"]`], mit `Group`/`ParentItem` explizit nur als `.Name`-String übernommen (Tiefe 0 statt der zirkulären Objektreferenz):

```javascript
// loader.js — Asset-Serialisierung, Allowlist statt vollem Objekt
const ASSET_SCALAR_KEYS = ['Name','Description','Category','IsLock','IsRestraint',
  'AllowLock','AllowLockType','Extended','Value','Difficulty','Effect','Block',
  'Prerequisite','Activity','AllowActivity','Attribute','Gender','BuyGroup',
  'InventoryID','NeverSell','SelfBondage','SelfUnlock','OwnerOnly','LoverOnly',
  'FamilyOnly','ArousalZone','BodyCosplay','CraftGroup']; // Teilmenge von assetKeys, s.o.

function _giSerializeAsset(a) {
  const out = { Group: a.Group?.Name ?? null, ParentItem: a.ParentItem ?? null };
  for (const k of ASSET_SCALAR_KEYS) {
    const v = a[k];
    const t = typeof v;
    if (v === undefined || t === 'function') continue;       // Dynamic*-Keys sind Funktionen — nie übernehmen
    out[k] = v;                                                // Arrays/Skalare sind strukturierbar-klonbar
  }
  out.LayerCount = Array.isArray(a.Layer) ? a.Layer.length : 0; // "Farben/Layer" laut SCAN-03: Zähler statt Objekten
  out.DefaultColor = a.DefaultColor ?? null;
  return out;
}
```

**When to use:** Für jedes der 4.764 `Asset[]`-Elemente und für alle 120 `AssetGroup[]`-Elemente (eigene, kleinere Allowlist — Name/Category/Description reichen, `AssetGroup.Asset` ist derselbe Zirkelbezug in der anderen Richtung).

**Trade-offs:** Keys mit dem Präfix `Dynamic*` (`DynamicDescription`, `DynamicName`, `DynamicBeforeDraw`, …) sind laut `assetKeys`-Liste vorhanden — jeder davon ist in der BC-Codebasis eine Funktion (Callback-Hook). Sie erscheinen absichtlich **nicht** in `ASSET_SCALAR_KEYS`; würden sie aufgenommen, würde `postMessage` mit `DataCloneError` abbrechen (siehe Common Pitfall 6).

### Pattern 4: Mod-Erkennung — bcModSdk zuerst, dann feste Fallback-Probes (SCAN-05, SCAN-06)

**What:** Zwei unabhängige Ebenen, weil nicht jeder Mod sich bei `bcModSdk` registriert (`05-CONSOLE-FINDINGS.md` bestätigt für alle vier benannten Mods eine öffentliche API):

1. **bcModSdk-Ebene** (immer, wenn `typeof bcModSdk !== 'undefined'`): `getModsInfo()` liefert die 28 registrierten Mods direkt als Array [VERIFIED: 05-CONSOLE-RESULT.json:7-12 — `"modsSample": [{"name": "BCT", "fullName": "Bondage Club Tools", "version": "0.7.0", "repository": "https://github.com/Dutchie322/bclub-tools"}, {"name": "FUSAM", ...}, {"name": "WCE", "fullName": "Wholesome Club Extensions", "version": "6.3.19", "repository": "https://github.com/KittenApps/WCE.git"}], "modsCount": 28`] — keine Transformation nötig außer Kopieren der vier Felder.
2. **Fallback-Probes** je Mod, feste Liste (kein universeller Sweep als primäre Quelle):

| Mod | Erkennung | Zu erfassende Felder |
|-----|-----------|----------------------|
| WCE/FBC | `typeof FBC_VERSION !== 'undefined'` | `FBC_VERSION` (string) — Funktionsnamen (`fbcDisplayText`, `fbcChatNotify`, …) nur als Namensliste, nie aufrufen |
| BCX | `typeof BCX_Loaded !== 'undefined'` | `bcx.version` **über `Object.getOwnPropertyNames(bcx)`**, NICHT `Object.keys(bcx)` — [VERIFIED: 05-CONSOLE-RESULT.json:35 — `"bcx": {"version": "1.1.19-2516cf88", "keys": []}`] bestätigt: `Object.keys(bcx)` liefert `[]`, die API ist nicht-enumerierbar |
| MBS | `typeof mbs !== 'undefined'` | `mbs.MBS_VERSION`, `mbs.API_VERSION.major`/`.minor` — [VERIFIED: 05-CONSOLE-RESULT.json:36 — `"mbs": {"version": "1.10.25", "api": {"major": 1, "minor": 5}}`] |
| LSCG | `typeof LSCG_Loaded !== 'undefined'` | Nur Funktionsnamen der Top-Level-Keys von `LSCG` (`getModule`, `Outfits`, …) — [VERIFIED: 05-CONSOLE-RESULT.json:37 — `"lscg": "LSCG_DB not found (ist ein Tool-Schlüssel, kein Spiel-Global) — Erkennung über LSCG_Loaded/LSCG"`] korrigiert eine falsche Annahme aus `.planning/research/FEATURES.md` (dort als „bereits genutzter Probe" `LSCG_DB` geführt — das ist der **Tool**-IDB-Schlüssel, kein Spiel-Global) |
| Themed | `typeof ThemedLoaded !== 'undefined'` | Nur Anzahl der `Themed_*`-Funktionsnamen — `Themed` selbst ist laut Sample `undefined` |

Zusätzlich ein diagnostischer, nicht-primärer Sweep (aus `.planning/research/FEATURES.md`, Command #6) über bereits eingesammelte `getters`/`values`/`functions`-Listen (Pattern 1) nach den Präfixen `/^(WCE|FBC|LSCG|MBS|BCX|Themed)/i` — deckt zukünftige, noch unbekannte Mod-Versionen ab, ohne die feste Liste zu ersetzen.

**When to use:** In dieser Reihenfolge — bcModSdk zuerst (billig, ein Aufruf, deckt 28 Mods ab), dann die fünf festen Probes (deckt die vier Mods ab, die zusätzlich eigene Globals exponieren), dann der diagnostische Sweep.

**Trade-offs:** `bcModSdk.getPatchingInfo()` ist eine `Map`, keine Plain-Object — [VERIFIED: 05-CONSOLE-RESULT.json:13-19 — `"patchingType": "[object Map]", "patchingSize": 546, "patchingSample": {"key": "CommonDrawAppearanceBuild", "valueKeys": ["name", "original", "originalHash", "sdkEntrypoint", "currentEntrypoint", "hookedByMods", "patchedByMods"], "value": {"name": "CommonDrawAppearanceBuild", "originalHash": "B02DDFE3", "hookedByMods": ["LSCG", "BCT"], "patchedByMods": []}}`] — `Map` selbst ist strukturiert-klonbar, ihre 546 Werte enthalten aber die Funktionen `original`/`sdkEntrypoint`/`currentEntrypoint`; vor dem Senden **muss** in ein Array von Plain-Objects mit nur `name`/`originalHash`/`hookedByMods`/`patchedByMods` transformiert werden (siehe Common Pitfall 6).

### Pattern 5: Bridge-Vertrag mit Fortschritts-Nachricht (SCAN-01)

**What:** Der neue Nachrichtentyp folgt exakt dem bestehenden `reqId`-Korrelationsmuster [VERIFIED: items.js:2498 — `const reqId = 'ss_' + Date.now();`] und dem bestehenden `GET_POS`/`POS_DATA`-Echo-Muster [VERIFIED: loader.js:907-909 — `src.postMessage({ app: APP, type: 'POS_DATA', reqId: ev.data.reqId, x: P?.X ?? 0, y: P?.Y ?? 0 }, ALLOWED_ORIGIN);`]. Zwei Nachrichtentypen: `GAME_INVENTORY_PROGRESS` (mehrfach, während des Chunkings) und `GAME_INVENTORY_DATA` (einmal, am Ende) — beide mit demselben `reqId`, damit der Tool-seitige Handler eine parallel laufende Scan-Anforderung nicht mit einer alten verwechselt.

```javascript
// game-scan.js — neuer Trigger, folgt reqId-Konvention aus items.js:2498
function triggerGameScan() {
  const reqId = 'gi_' + Date.now();
  window._giActiveReqId = reqId;
  bcSend({ type: 'GET_GAME_INVENTORY', reqId });
  document.getElementById('gameScanInfo').textContent = 'Scan läuft…';
}

onBridgeMessage('GAME_INVENTORY_PROGRESS', function(ev) {
  if (ev.data.reqId !== window._giActiveReqId) return;
  document.getElementById('gameScanInfo').textContent =
    'Scan läuft… ' + ev.data.step + '/' + ev.data.total;
});

onBridgeMessage('GAME_INVENTORY_DATA', function(ev) {
  if (ev.data.reqId !== window._giActiveReqId) return;
  if (ev.data.err) { showStatus('❌ ' + ev.data.err, 'error'); return; }
  _saveGameInventorySnapshot(ev.data.snapshot); // Pattern 6
});
```

```javascript
// loader.js — neuer case, kehrt sofort zurück (kein break-Sync-Handler wie die anderen)
case 'GET_GAME_INVENTORY': {
  _buildGameInventoryChunked(ev.data.reqId, src);
  break;
}
```

**When to use:** `GET_GAME_INVENTORY` ist der einzige Nachrichtentyp in `loader.js`s `switch`, der **nicht** synchron innerhalb des `case`-Blocks antwortet — jeder bestehende `case` (`GET_CACHE`, `GET_PLAYER`, …) sendet seine Antwort vor dem `break`. Das muss im Plan explizit als bewusste Abweichung vom bisherigen Muster dokumentiert werden, weil ein Reviewer sie sonst als Bug liest.

**Trade-offs:** Ohne `reqId`-Filterung auf der Tool-Seite würde ein zweiter Scan-Klick während eines laufenden Scans zwei parallele `PROGRESS`-Ströme mischen; die `window._giActiveReqId`-Prüfung verwirft Nachrichten aus einem überholten Lauf, statt sie zu verarbeiten.

### Pattern 6: Snapshot-Store, additive IDB-Versionierung (SCAN-08)

**What:** Analog zum bestehenden `screenshots`-Store [VERIFIED: persistence.js:10-17 — `const _IDB_NAME    = 'BCKonfigurator';\nconst _IDB_VERSION = 2; // v2: Object-Store 'screenshots' (SPLIT-05/06). Nie senken – IDB kennt kein Downgrade.\nconst _IDB_STORE   = 'kv';\n...\nconst _IDB_SCREENSHOTS = 'screenshots';`] und dessen additivem `onupgradeneeded` [VERIFIED: persistence.js:32-36 — `req.onupgradeneeded = e => {\n      const db = e.target.result;\n      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);\n      if (!db.objectStoreNames.contains(_IDB_SCREENSHOTS)) db.createObjectStore(_IDB_SCREENSHOTS, { keyPath: 'id' });\n    };`]: `_IDB_VERSION` 2 → 3, neuer Store `snapshots` mit `keyPath: 'ts'` (Zeitstempel als natürlicher, eindeutiger Schlüssel — kein zweiter, redundanter `id`-String nötig, da ein Snapshot pro Millisekunde ausreichend eindeutig ist). Kein Migrationsschritt nötig (im Unterschied zum Screenshot-Store) — es gibt keine Alt-Daten, die verschoben werden müssten; dieser Store ist reine Neuanlage.

```javascript
// persistence.js — additive Erweiterung, Muster der Screenshot-Store-Anlage
const _IDB_SNAPSHOTS = 'snapshots';
// in onupgradeneeded ergänzen:
//   if (!db.objectStoreNames.contains(_IDB_SNAPSHOTS)) db.createObjectStore(_IDB_SNAPSHOTS, { keyPath: 'ts' });

async function idbSnapshotPut(snapshot) {
  // snapshot: { ts, gameVersion, mods: [...], ... } — ts ist der Primärschlüssel
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_SNAPSHOTS, 'readwrite');
      tx.objectStore(_IDB_SNAPSHOTS).put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
      tx.onabort = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) { _idbSchreibfehler('Spiel-Snapshot', err); return false; } // wiederverwendet (persistence.js:80)
}
// idbSnapshotGetAll()/idbSnapshotDelete(ts) analog zu idbScreenshotGetAll/-Delete — Delete NUR mit
// explizitem Bestätigungsdialog (Phase 6, SCAN-11) — Phase 5 fügt nur put/getAll hinzu, kein UI-Delete.
```

**When to use:** Jeder abgeschlossene Scan wird einmal per `idbSnapshotPut()` geschrieben — nie überschrieben (jeder Scan hat einen neuen `ts`), nie automatisch gelöscht (SCAN-08, Kernwert).

**Trade-offs:** Ein Snapshot von ~2-3 MB (siehe Payload-Schätzung, Pattern 1) mal mehrerer Scans über die Zeit kann relevanten IDB-Speicher belegen — das ist bewusst in Kauf genommen (Kernwert „nie automatisch löschen" schlägt Speichereffizienz, exakt wie bei der Screenshot-Store-Entscheidung in Phase 4). `navigator.storage.estimate()` (bereits STAB-03, Phase 2) zeigt dem Nutzer den Verbrauch; manuelles Löschen ist SCAN-11 (Phase 6).

### Anti-Patterns to Avoid

- **Funktionswerte ungeprüft in ein zu sendendes Objekt kopieren:** `bcModSdk.getPatchingInfo()`-Werte, `mbs`/`LSCG`-Objekte und jedes `Dynamic*`-Asset-Feld enthalten Funktionen. Ein `{...modObject}`-Spread oder `JSON.parse(JSON.stringify(...))` (das Funktionen still verwirft, aber bei zirkulären Referenzen wirft) ist kein Ersatz für eine explizite Allowlist — `postMessage` wirft bei einer verbliebenen Funktion sofort `DataCloneError` (siehe Common Pitfall 6).
- **Den ganzen `window`-Walk synchron in einem `case`-Block laufen lassen:** Widerspricht SCAN-07 direkt (Tab friert ein) und widerspricht dem einzigen Beispiel im Repo, das bereits Chunking macht (`_BCU_leerlauf`) — dieses Muster existiert, weil ein früherer synchroner Multi-Personen-Scan messbar ruckelte (`loader.js:1437-1440`, Kommentar im Code).
- **Eine der 189 Getter lesen, "nur um zu sehen was drin ist":** `05-CONSOLE-RESULT.json` bestätigt, dass alle im Sample Standard-DOM sind (`document`, `location`, …) — das ist kein Freibrief, sie zu lesen "weil sie harmlos aussehen"; die Regel ("Getter nie lesen") gilt unabhängig vom Sample-Befund, weil zukünftige BC-/Mod-Versionen neue Getter mit echten Nebenwirkungen einführen können.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idle-Zeit-Chunking | Eigene `requestAnimationFrame`-Batching-Schleife | `_BCU_leerlauf`-Muster (`loader.js:1441-1444`) wiederverwenden/kopieren | Bereits verifiziert produktiv im Einsatz, inkl. Safari-Fallback |
| Zirkelbezug-sichere Serialisierung | Eigener Zyklus-Detektor (WeakSet-Tracking wie `_BCU_safeClone`, `loader.js:814-818`) | Explizite Allowlist (Pattern 3) statt generischer Zyklus-Erkennung | Eine Allowlist ist zugleich die SCAN-07-Tiefenbegrenzung — ein genereller Zyklus-Detektor würde `Dynamic*`-Funktionen trotzdem durchlassen (Pitfall 6 bliebe offen) |
| Mod-Erkennungs-Heuristik | Eigenes Pattern-Matching über beliebige Fenster-Properties als *primäre* Quelle | `bcModSdk.getModsInfo()` + feste Fallback-Probes (Pattern 4) | `bcModSdk` ist die vom Ökosystem selbst bereitgestellte, stabile API für genau diesen Zweck; ein Custom-Sweep bleibt Diagnose-Layer, nicht Ersatz |
| Snapshot-Speicherformat | Eigenes binäres/komprimiertes Format | Plain-Object in eigenem IDB-Store (Pattern 6), gleiches Muster wie `screenshots` | Konsistent mit der Codebase-Konvention, kein neuer Format-Parser nötig |

**Key insight:** Jede der drei größten Fallgruben dieser Phase (Zirkelbezug, Funktionswerte im Payload, blockierender Massenlauf) hat bereits eine bewährte Lösung im selben Repo (`_BCU_safeClone`-Zyklen-Handling, `_BCU_leerlauf`-Chunking, Allowlist-Muster aus dem Cache-Builder) — die Aufgabe ist Wiederverwendung, nicht Neuerfindung.

## Common Pitfalls

### Pitfall 1: Getter versehentlich lesen

**What goes wrong:** Ein naiver Enumerator liest `window[name]` statt den Deskriptor zu prüfen — bei einem Getter löst das dessen Code aus, auch wenn der Rückgabewert nie verwendet wird.
**Why it happens:** `window[name]` ist der intuitive, kürzere Weg an einen Wert zu kommen; `Object.getOwnPropertyDescriptor(window, name).get` zu prüfen ist ein zusätzlicher Schritt, den man leicht vergisst.
**How to avoid:** Immer zuerst `Object.getOwnPropertyDescriptor` holen; nur bei `!desc.get` (Daten-Property) den Wert lesen. Getter werden als `{name, kind:'getter'}` erfasst, nie ausgewertet.
**Warning signs:** Ein Testfall mit einem absichtlich werfenden Getter (`Object.defineProperty(window, 'x', {get(){throw new Error('side effect!')}})`) muss grün bleiben — das ist der zentrale Vitest-Beweis für SCAN-07 (siehe Validation Architecture).
**Phase to address:** Diese Phase, im Enumerator selbst (Pattern 1).

### Pitfall 2: `Asset.Group.Asset`-Zirkelbezug bricht `JSON.stringify`

**What goes wrong:** `JSON.stringify(Asset)` oder auch nur `JSON.stringify(someAsset.Group)` wirft `TypeError: Converting circular structure to JSON`, weil `Group.Asset` zurück auf denselben Asset-Zweig zeigt [VERIFIED: 05-CONSOLE-RESULT.json:46 — `"hasCircularGroupRef": true`].
**Why it happens:** BC's interne Datenstruktur verknüpft Assets und Gruppen bidirektional für schnellen Zugriff in beide Richtungen — das ist beabsichtigtes Spieldesign, kein Bug.
**How to avoid:** Nie das komplette `Group`-Objekt übernehmen — immer nur `Group.Name` (Pattern 3). Gleiches gilt für `ParentItem`.
**Warning signs:** Ein Testfall mit einem synthetischen Asset-Mock, dessen `Group.Asset` zurück auf sich selbst zeigt, muss ohne Exception durchlaufen.
**Phase to address:** Diese Phase (Pattern 3).

### Pitfall 3: Massenlauf über 11.000 Funktionen mit `.toString()`

**What goes wrong:** `fn.toString().slice(0,200)` für jede der 11.000 `Inventory*`-Funktionen (statt nur `fn.length`) vervielfacht die Enumerationszeit spürbar — `toString()` auf minifizierten/großen Funktionskörpern ist nicht kostenlos.
**Why it happens:** `.toString()` liefert mehr Information (Parameter-Namen statt nur Anzahl) und wirkt deshalb verlockend "gründlicher".
**How to avoid:** Für den Massenlauf nur `fn.length` (Arity) erfassen — exakt wie in `05-CONSOLE-FINDINGS.md` als Konsequenz festgehalten [VERIFIED: 05-CONSOLE-FINDINGS.md:31 — `"Signatur = fn.length + Name, kein toString() im Massenlauf"`]. `.toString()` bleibt für gezielte Einzelabfragen (z. B. ein vom Nutzer in Phase 6 ausgewähltes Symbol) reserviert, nicht für den Bulk-Scan.
**Phase to address:** Diese Phase, in der Klassifizierungsfunktion (Pattern 1).

### Pitfall 4: `requestIdleCallback` in Safari nicht vorhanden

**What goes wrong:** Ein Enumerator, der `requestIdleCallback` ohne Fallback aufruft, wirft `ReferenceError: requestIdleCallback is not defined` in Safari (macOS/iOS) und bricht den gesamten Scan ab.
**Why it happens:** `requestIdleCallback` ist in Chromium/Firefox Standard, aber [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback — "Safari on macOS and iOS hide it behind a feature flag and Internet Explorer never added support"].
**How to avoid:** Immer `typeof requestIdleCallback === 'function'` prüfen und auf `setTimeout(fn, 16)` zurückfallen — das bestehende `_BCU_leerlauf`-Muster macht das bereits korrekt; einfach wiederverwenden statt neu schreiben.
**Warning signs:** Ein Vitest-Fall, der `requestIdleCallback` aus der Sandbox entfernt, muss trotzdem einen vollständigen, terminierenden Scan liefern.
**Phase to address:** Diese Phase (Pattern 1, Environment Availability).

### Pitfall 5: `bcx`s API ist nicht-enumerierbar — `Object.keys` liefert `[]`

**What goes wrong:** Eine BCX-Probe, die `Object.keys(bcx)` nutzt, um die API-Fläche zu dokumentieren, erfasst **nichts** (leeres Array), obwohl `bcx.version` sehr wohl lesbar ist.
**Why it happens:** BCX definiert seine öffentliche API mit nicht-enumerierbaren Property-Deskriptoren — verifiziert live: [VERIFIED: 05-CONSOLE-RESULT.json:25 — `{"name": "bcx", "type": "object", "keys": [], "note": "API nicht-enumerierbar; bcx.version = 1.1.19-2516cf88"}`].
**How to avoid:** Für `bcx` explizit `Object.getOwnPropertyNames(bcx)` verwenden, nicht `Object.keys(bcx)` (Pattern 4).
**Warning signs:** Ein Testfall mit einem `bcx`-Mock, dessen Properties via `Object.defineProperty(..., {enumerable:false})` gesetzt sind, muss trotzdem `version` finden.
**Phase to address:** Diese Phase (Pattern 4).

### Pitfall 6: Funktionswerte im Payload lösen `DataCloneError` aus

**What goes wrong:** Sobald irgendein Funktionswert (aus `getPatchingInfo()`s `original`/`sdkEntrypoint`/`currentEntrypoint`, aus `mbs.getDebug`/`runTests`, aus jedem `Dynamic*`-Asset-Feld, aus jeder `fbc*`/`Themed_*`-Funktion) in das an `postMessage` übergebene Objekt gerät, wirft der Browser **synchron** `DataCloneError: could not be cloned` — die gesamte Antwort geht verloren, nicht nur das eine Feld.
**Why it happens:** [CITED: developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm — Function-Objekte gehören nicht zu den klonbaren Typen] `postMessage` nutzt den Structured-Clone-Algorithmus; dieser unterstützt Objekte, Arrays, Maps, Sets, Datumswerte u. a., aber **keine** Funktionen.
**How to avoid:** Jede Serialisierungsfunktion (Pattern 3, Pattern 4) muss eine explizite Allowlist von Feldnamen verwenden, nie ein `{...obj}`-Spread eines Mod-/Asset-Objekts unbekannten Inhalts.
**Warning signs:** Ein Vitest-Fall, der `structuredClone()` (Node ≥17, in der Vitest-Node-Umgebung verfügbar) auf das fertig zusammengesetzte Snapshot-Objekt anwendet, muss ohne Exception durchlaufen — das ist der günstigste automatisierte Nachweis, dass kein Funktionswert übrig geblieben ist, ohne einen echten Browser zu brauchen.
**Phase to address:** Diese Phase — als eigener, verpflichtender Testfall (siehe Validation Architecture), nicht nur als Code-Review-Hinweis.

## Code Examples

### 1. Getter-sicherer Deskriptor-Check (SCAN-07)
```javascript
// loader.js — Kern der Klassifizierung, siehe Pattern 1
const desc = Object.getOwnPropertyDescriptor(window, name);
if (desc && desc.get) { /* als Getter erfassen, NIE desc.get() aufrufen */ }
```

### 2. bcModSdk-Lesen ohne Funktionswerte (SCAN-05)
```javascript
// loader.js — patchingInfo-Transformation, siehe Pattern 4
function _giPatchingInfo() {
  if (typeof bcModSdk === 'undefined' || typeof bcModSdk.getPatchingInfo !== 'function') return [];
  const out = [];
  for (const [fnName, info] of bcModSdk.getPatchingInfo()) {
    out.push({
      name: info.name ?? fnName,
      originalHash: info.originalHash ?? null,
      hookedByMods: Array.isArray(info.hookedByMods) ? info.hookedByMods.slice() : [],
      patchedByMods: Array.isArray(info.patchedByMods) ? info.patchedByMods.slice() : [],
      // NIE: original, sdkEntrypoint, currentEntrypoint — Funktionen, siehe Pitfall 6
    });
  }
  return out;
}
```

### 3. Automatisierter DataCloneError-Nachweis ohne Browser (SCAN-07-Gate)
```javascript
// tests/game-inventory-enumerator.test.js — günstigster Nachweis "kein Funktionswert im Payload"
const snapshot = ctx._buildGameInventorySync(); // Test-Only-Sync-Variante ohne Chunking, siehe Validation Architecture
expect(() => structuredClone(snapshot)).not.toThrow();
```

## State of the Art

| Old Approach (angenommen vor SCAN-13) | Current Approach (nach SCAN-13-Befund) | When Changed | Impact |
|--------------|------------------|---------------|--------|
| WCE/FBC-Global unbekannt, Probe müsste geraten werden (`.planning/research/FEATURES.md` Gap) | `FBC_VERSION` bestätigt, WCE zusätzlich unter `bcModSdk`-Namen `"WCE"` registriert | 2026-09-15, `05-CONSOLE-FINDINGS.md` | Kein Rate-Risiko mehr — Pattern 4 nutzt den bestätigten Namen |
| `LSCG_DB` als "bereits genutzter" Spiel-Global geführt (`.planning/research/FEATURES.md`) | `LSCG_DB` ist ein **Tool**-IDB-Schlüssel, kein Spiel-Global; Erkennung läuft über `LSCG_Loaded`/`LSCG` | 2026-09-15, `05-CONSOLE-FINDINGS.md:23` | Ein Probe-Fallback, der `window.LSCG_DB` geprüft hätte, wäre nie angeschlagen — korrigiert vor Implementierung |
| `docs/LOAD-ORDER.md` beschreibt Bridge-Dispatch ohne Fehler-Isolation zwischen Handlern | `bridge.js:144-152` isoliert jeden Handler bereits per `try/catch` (Commit `3ba37c5`) | Zwischen Phase 4 Plan 2 und heute | `game-scan.js`s Handler kann sich auf Fehler-Isolation verlassen; die Doku-Zeile in `docs/LOAD-ORDER.md` sollte im Zuge dieser Phase korrigiert werden (kleiner Nebenfund, kein Blocker) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Kein introspektierbares Array/Registry für bereits registrierte `ChatRoomRegisterMessageHandler`-Handler existiert in BC R131 (nur die Funktion selbst ist vorhanden) — Websuche fand keine primäre BC-Quelle, die eine solche Registry dokumentiert, nur die Handler-Registrierungsfunktion selbst | Pattern 4 (Chat-Hook-Probe), Open Question 1 | Falls doch eine Registry existiert (z. B. `ChatRoomMessageHandlers`), würde SCAN-04 unnötig auf "nicht introspektierbar" degradieren, obwohl mehr Information verfügbar wäre — geringes Risiko, da die Phase-Anforderung selbst genau diesen Fall ("sonst 'nicht introspektierbar' vermerken") vorsieht |
| A2 | Die geschätzte Snapshot-Payload-Größe (~2-3 MB) basiert auf synthetischen Beispielwerten für Asset-Objekte (nicht den echten 4.764 R131-Assets, deren Feldinhalte nicht vollständig vorliegen) | Standard Stack (Alternatives Considered), Pattern 5 | Falls echte Beschreibungstexte/Arrays deutlich länger sind als angenommen, könnte die tatsächliche Größe höher liegen — bleibt aber mit hoher Wahrscheinlichkeit weit unter jeder dokumentierten `postMessage`-Grenze (siehe Environment Availability); kein Blocker, aber der Plan sollte nach dem ersten echten Scan die tatsächliche Byte-Größe messen und dokumentieren |
| A3 | Die 38-Gruppen-Liste (`gruppen`, `loader.js:551-559`) ist ausreichend für eine nützliche `Inventory*`-Gruppierung, obwohl BC 120 `AssetGroup`s hat | Pattern 2 | Ein großer `InventoryOther`-Eimer bleibt übrig — kosmetisches Problem für Phase 6s Baseline-Diff, kein funktionaler Fehler dieser Phase |

**Risiko-Einordnung:** Alle drei Annahmen sind niedrig — keine betrifft Compliance/Datenschutz/Kryptografie oder eine im Nachhinein schwer korrigierbare Design-Entscheidung.

## Open Questions

1. **Gibt es in BC R131 eine introspektierbare Registry bereits angemeldeter `ChatRoomRegisterMessageHandler`-Handler?**
   - What we know: Die Registrierungsfunktion selbst existiert und ist bestätigt aufrufbar (`05-CONSOLE-RESULT.json:42 — "chatHandlers": "ChatRoomRegisterMessageHandler ok"`); die BC-Merge-Request, die sie eingeführt hat, zeigt nur die Registrierungs-API (`{Description, Priority, Callback}`), keine dokumentierte Leseschnittstelle für bereits registrierte Handler.
   - What's unclear: Ob intern ein Array (z. B. `ChatRoomMessageHandlers`) existiert, das man read-only auslesen könnte, ohne selbst einen Handler zu registrieren.
   - Recommendation: SCAN-04 erfasst zunächst nur `{name: 'ChatRoomRegisterMessageHandler', exists: true, arity: fn.length}` plus einen defensiven, geguardeten Check auf ein paar plausibel benannte Globals (`typeof window['ChatRoomMessageHandlers'] !== 'undefined' && Array.isArray(...)`) — schlägt der Check fehl, wird `"not introspectable"` vermerkt (exakt wie die Phase-Anforderung selbst vorsieht). Keine Registrierung eines eigenen Test-Handlers, das wäre ein Seiteneffekt.

2. **Reicht eine einzelne finale `GAME_INVENTORY_DATA`-Nachricht, oder wird mehrteiliges Chunking irgendwann doch nötig?**
   - What we know: Die Schätzung (Pattern 5, Standard Stack) liegt bei ~2-3 MB, dokumentierte `postMessage`-Grenzen liegen deutlich darüber oder sind unspezifiziert.
   - What's unclear: Die tatsächliche Byte-Größe eines echten R131-Snapshots mit allen 28 Mods ist nicht gemessen (nur die Struktur ist bekannt, nicht jeder Beschreibungstext).
   - Recommendation: Single-Message-Ansatz für v1 (Pattern 5); der Plan sollte nach dem ersten realen Scan `JSON.stringify(snapshot).length` loggen und im Snapshot selbst mitführen (`snapshot.byteEstimate`), damit ein künftiger Bedarf für Mehrteiligkeit datengestützt statt spekulativ entschieden wird.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `requestIdleCallback` | Chunking (Pattern 1) | Nur Chromium/Firefox garantiert; Safari hinter Feature-Flag [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback] | — | `setTimeout(fn, 16)` — bereits im Repo als `_BCU_leerlauf`-Fallback etabliert |
| `structuredClone()` (Node) | Testnachweis für Pitfall 6 (kein Funktionswert im Payload) | ✓ in Node ≥17 (Projekt fordert `"engines": {"node": ">=22.12.0"}` laut `package.json`) | Node 22.12+ | — kein Fallback nötig, Mindestversion bereits höher |
| `window.bcModSdk` im Spiel-Tab | SCAN-05/06 | Nur wenn der Nutzer mindestens einen SDK-registrierenden Mod geladen hat — bestätigt vorhanden in der realen Session (v1.2.0, 28 Mods) | 1.2.0 (verifiziert) | Fehlt `bcModSdk` komplett: Mod-Sektion des Snapshots bleibt leer/`{available:false}`, Fallback-Probes (Pattern 4) laufen trotzdem unabhängig weiter |
| Echter Browser + BC-Tab mit geladenen Mods | Live-Verifikation des fertigen Enumerators gegen echte 18.700 Properties/4.764 Assets | Nur durch den Nutzer prüfbar | — | Kein Fallback — als `checkpoint:human-verify` am Phasenende einplanen (Live-Smoke-Test: Scan auslösen, Tab bleibt bedienbar, Snapshot landet in IDB) |

**Missing dependencies with no fallback:**
- Live-Browser-Verifikation des vollständigen Enumerators gegen die reale 18.700-Property-/4.764-Asset-Umgebung — nur der Nutzer kann das im echten Spiel bestätigen.

**Missing dependencies with fallback:**
- `requestIdleCallback` in Safari — Fallback bereits im Repo etabliert (`_BCU_leerlauf`-Muster).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 [VERIFIED: package.json — `"vitest": "5.0.0"`] |
| Config file | `vitest.config.js` [VERIFIED: vitest.config.js — `environment: 'node'`, `include: ['tests/**/*.test.js']`, `setupFiles: ['./tests/setup/fake-indexeddb.js']`] |
| Quick run command | `npx vitest run tests/game-inventory-enumerator.test.js tests/game-scan-bridge.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | `GET_GAME_INVENTORY` löst `GAME_INVENTORY_PROGRESS`+`GAME_INVENTORY_DATA` mit passender `reqId` aus | unit | `npx vitest run tests/game-scan-bridge.test.js -t "GET_GAME_INVENTORY"` | ❌ Wave 0 |
| SCAN-02 | Core-Globals klassifiziert nach typeof, Funktionen mit `fn.length`, `Inventory*` gruppiert | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "Global-Klassifizierung"` | ❌ Wave 0 |
| SCAN-03 | Asset-Serialisierung ohne Zirkelbezug, Allowlist hält `Dynamic*` fern | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "Asset-Serialisierung"` | ❌ Wave 0 |
| SCAN-04 | Chat-Hook-Probe erfasst `ChatRoomRegisterMessageHandler`-Existenz, degradiert sauber ohne Registry | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "Chat-Hook"` | ❌ Wave 0 |
| SCAN-05 | `getModsInfo()`/`getPatchingInfo()` korrekt transformiert (keine Funktionswerte) | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "bcModSdk"` | ❌ Wave 0 |
| SCAN-06 | Alle fünf Fallback-Probes (BCX nicht-enumerierbar, MBS, LSCG, WCE/FBC, Themed) erkennen ihren Mock korrekt | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "Fallback-Probes"` | ❌ Wave 0 |
| SCAN-07 | Getter mit `throw` im Deskriptor wird nie ausgewertet; `structuredClone(snapshot)` wirft nicht; Chunking terminiert mit `requestIdleCallback` entfernt (Fallback) | unit | `npx vitest run tests/game-inventory-enumerator.test.js -t "SCAN-07"` | ❌ Wave 0 |
| SCAN-08 | `idbSnapshotPut`/`idbSnapshotGetAll` — additiver Store, kein Downgrade, keine Löschfunktion in dieser Phase aufgerufen | unit | `npx vitest run tests/persistence-module.test.js -t "snapshots"` | ❌ Wave 0 |
| — | Live-Smoke: Scan im echten BC-Tab mit mehreren Mods, Tab bleibt bedienbar, Snapshot erscheint in DevTools → IndexedDB → `snapshots` | manual | — (Browser + BC-Tab) | human_judgment |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/game-inventory-enumerator.test.js tests/game-scan-bridge.test.js`
- **Per wave merge:** `npm test` (volle Suite, aktuell 20 Testdateien / 252 passed + 2 expected fail vor dieser Phase, siehe `04-04-SUMMARY.md`)
- **Phase gate:** Volle Suite grün + Live-Smoke-Test (Scan im echten Spiel, Tab bedienbar, Snapshot persistiert) vor `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/helpers/loaderSandbox.js` — **größte Lücke dieser Phase.** `loader.js` wurde bislang nie in einer vm-Sandbox ausgeführt (bestätigt: `tests/loader-origin.test.js` liest nur den Quelltext als String, `tests/helpers/loadScript.js` hat keine Stubs für `window.open`, `screen`, `MutationObserver`, `ServerSocket.on/off`). Muss bereitstellen: `window.open` (Stub, gibt Fake-Fenster zurück), `screen.width`/`screen.height`, `MutationObserver`-Stub-Klasse, `ServerSocket.on/off`-No-ops, `Player`/`ChatRoomCharacter`/`ChatRoomData`-Minimal-Stubs, `Asset`/`AssetGroup`-Arrays mit synthetischen Einträgen (inkl. eines zirkulären `Group.Asset`-Rings zum Testen von Pitfall 2), `bcModSdk`-Mock (`registerMod` gibt ein Objekt mit `hookFunction`-No-op zurück, `getModsInfo`/`getPatchingInfo` konfigurierbar), einen synthetischen `window` mit >100 eigenen Properties inkl. mindestens einem werfenden Getter. **Muss vor allen anderen Wave-0-Tasks dieser Phase stehen**, da SCAN-02 bis SCAN-07 ohne sie nicht automatisiert testbar sind.
- [ ] `tests/game-inventory-enumerator.test.js` — neu, deckt SCAN-02 bis SCAN-07 gegen die neue Loader-Sandbox
- [ ] `tests/game-scan-bridge.test.js` — neu, deckt SCAN-01 (Tool-seitige `reqId`-Korrelation, Fortschritts-Handling), nutzt die bestehende `tests/helpers/loadScript.js` (Tool-Fenster-Sandbox, unverändert ausreichend)
- [ ] `tests/persistence-module.test.js` — Erweiterung um den neuen `snapshots`-Store (SCAN-08), Muster von `tests/screenshot-store.test.js` übernehmbar
- [ ] Framework-Install: keiner nötig — Vitest/fake-indexeddb bereits vorhanden

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nein | Kein Login/Auth-System, unverändert gegenüber Phase 3/4 |
| V3 Session Management | Nein | Kein neuer Session-Zustand — nutzt den bestehenden `_bcOrigin`/gepinnten `ev.source` (Phase 3) unverändert |
| V4 Access Control | Ja | `GET_GAME_INVENTORY` läuft über denselben Origin-/Source-geprüften Kanal wie jeder andere Nachrichtentyp (`loader.js:840-846`) — keine neue Trust-Boundary, aber die neue Payload ist die größte, die je über die Bridge lief |
| V5 Input Validation | Teilweise | `ev.data.reqId` wird nur als Korrelations-String genutzt, nie interpretiert/ausgeführt — kein neues Injection-Risiko |
| V6 Cryptography | Nein | Keine Kryptografie im System |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Ein zu ambitionierter Enumerator ruft versehentlich eine entdeckte Spielfunktion auf (z. B. um "die Signatur besser zu verstehen") | Tampering (Spielzustand) | Explizites Verbot in `.planning/REQUIREMENTS.md` Out-of-Scope-Tabelle ("Eval-basiertes Fuzzing... verletzt Read-only-Prinzip"); Code-Review-Gate: kein `(...)`-Aufruf auf einem Wert, dessen `typeof === 'function'` ist, irgendwo im neuen Loader-Code außer den bereits bestehenden, unveränderten `case`-Blöcken |
| `DataCloneError` durch Funktionswert im Payload wird als "Scan schlägt manchmal fehl" fehlgedeutet, Ursache bleibt lange unklar | Denial of Service (aus Nutzersicht, kein echter Angriff) | Pitfall 6 + verpflichtender `structuredClone()`-Testfall vor jedem Commit, der die Serialisierung ändert |
| Snapshot-Store wächst unbegrenzt (kein Auto-Pruning) und trifft irgendwann die IDB-Quota | Denial of Service (Speicher) | Bewusste Design-Entscheidung (Kernwert „nie automatisch löschen"); `navigator.storage.estimate()` (STAB-03) macht den Verbrauch sichtbar; manuelles Löschen folgt in Phase 6 (SCAN-11) |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/05-gamecode-inventar/05-CONSOLE-FINDINGS.md`, `05-CONSOLE-RESULT.json` (dieses Repo, gelesen 2026-09-15) — reale R131-Session-Daten, 28 Mods geladen; Grundlage fast aller Pattern-Abschnitte
- `loader.js`, `bridge.js`, `persistence.js`, `tests/helpers/loadScript.js`, `tests/loader-origin.test.js` (dieses Repo, gelesen 2026-09-15) — jede Zeilenangabe in diesem Dokument direkt gegen den aktuellen Arbeitsbaum gelesen
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (dieses Repo) — Scope, Erfolgskriterien, Out-of-Scope
- `.planning/phases/04-entflechtung/04-02-SUMMARY.md`, `04-04-SUMMARY.md`, `.planning/phases/03-bridge-haertung/03-RESEARCH.md` (dieses Repo) — Bridge-Registry-Verhalten, Loader-Sandbox-Lücke (Pitfall 4 dort vorausgesagt)

### Secondary (MEDIUM confidence)
- [Window: requestIdleCallback() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) — Browser-Support-Lücke (Safari)
- [Window: postMessage() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) — keine harte Größenbegrenzung dokumentiert
- [The structured clone algorithm — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) — Funktionen nicht klonbar (Grundlage Pitfall 6)
- [Refactor ChatRoomMessage (!3592) — BondageProjects/Bondage-College GitLab](https://gitgud.io/BondageProjects/Bondage-College/-/merge_requests/3592) — bestätigt `ChatRoomRegisterMessageHandler({Description, Priority, Callback})` als Kern-API, keine dokumentierte Leseschnittstelle für bereits registrierte Handler gefunden
- `.planning/research/FEATURES.md`, `.planning/research/ARCHITECTURE.md` (dieses Repo, Stand 2026-09-12) — Kontext vor SCAN-13; zwei konkrete Korrekturen dieser Dokumente in „State of the Art" oben festgehalten (WCE/FBC-Name, `LSCG_DB`-Fehlklassifikation)

### Tertiary (LOW confidence)
- Diagnostischer Mod-Sweep-Vorschlag aus `.planning/research/FEATURES.md` (Command #6, `Object.keys(window).filter(/^(WCE|FBC|...)/)`) — als Zusatzlayer übernommen, nicht als primäre Quelle (Pattern 4)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Pakete; jede API-Nutzung entweder bereits im Repo verifiziert oder gegen MDN zitiert
- Architecture: HIGH — jede Codestelle in diesem Dokument wurde mit `Read`/`Grep` gegen den aktuellen Arbeitsbaum gelesen, nicht aus älteren `.planning/research/`-Dokumenten übernommen; die realen SCAN-13-Zahlen ersetzen jede vorherige Schätzung
- Pitfalls: HIGH für Pitfall 1, 2, 3, 5 (direkt aus `05-CONSOLE-RESULT.json` abgeleitet) und Pitfall 6 (MDN-verifiziert); MEDIUM für Pitfall 4 (Browser-Support-Aussage extern, nicht BC-spezifisch)

**Research date:** 2026-09-15
**Valid until:** Bis zum nächsten Commit, der `loader.js`/`bridge.js`/`persistence.js` verändert, oder bis zu einer neuen BC-Version/neuen Mod-Versionen, die die in `05-CONSOLE-RESULT.json` festgehaltenen Zahlen/Globals verschieben (R131-Stand, 2026-09-15).

---
*Phase: 05-gamecode-inventar*
*Researched: 2026-09-15*
