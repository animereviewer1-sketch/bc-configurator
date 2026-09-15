# SCAN-13 — Konsolen-Klärung im laufenden Spiel

**Datum:** 2026-09-15 · **BC-Version:** R131 · **Quelle:** Nutzer hat das unten stehende Snippet in der Konsole des BC-Tabs ausgeführt (Mods geladen). Ergebnis-Rohdaten: `05-CONSOLE-RESULT.json`.

## Antworten auf die offenen Fragen

### Q1 — bcModSdk-Rückgabeform (verifiziert, v1.2.0)
- API-Keys: `version`, `apiVersion`, `registerMod`, `getModsInfo`, `getPatchingInfo`, `errorReporterHooks`. Zusätzlich existiert der Alias-Global `bcModSDK` (gleiche Instanz).
- `getModsInfo()` → **Array** von `{name, fullName, version, repository}` — 28 Mods registriert (u.a. BCT 0.7.0, FUSAM, WCE 6.3.19, LSCG, MBS, BCX, Themed).
- `getPatchingInfo()` → **Map** (546 Einträge) `functionName → {name, original, originalHash, sdkEntrypoint, currentEntrypoint, hookedByMods[], patchedByMods[]}`. Beispiel: `CommonDrawAppearanceBuild` gehookt von `["LSCG","BCT"]`.
- **Konsequenz für den Enumerator:** `original`/`sdkEntrypoint`/`currentEntrypoint` sind Funktionen → beim Serialisieren nur `name`, `originalHash`, `hookedByMods`, `patchedByMods` übernehmen.

### Q2 — Mod-Globals (WCE/FBC & Co.)
| Mod | Erkennung | Öffentliche API |
|-----|-----------|-----------------|
| **WCE/FBC** | `FBC_VERSION` (string); in bcModSdk als `WCE` registriert | `fbcDisplayText`, `fbcChatNotify`, `fbcSendAction`, `fbcSettingValue`, `fbcDebug`, `fbcPushEvent`, `wceServerAppearance` |
| **BCX** | `BCX_Loaded` (bool); `bcx` Objekt mit **0 enumerierbaren Keys** — API nicht-enumerierbar | `bcx.version` lesbar (`1.1.19-2516cf88`); Probe muss `Object.getOwnPropertyNames(bcx)` nutzen, nicht `Object.keys` |
| **MBS** | `mbs` Objekt | `API_VERSION {major:1, minor:5}`, `MBS_VERSION 1.10.25`, `wheelEvents`, `wheelOutfits`, `getDebug`, `runTests`, `css`, `_toItemBundles`… |
| **LSCG** | `LSCG_Loaded` (bool); `LSCG` Objekt | `getModule`, `Outfits`, `ExportSettings`, `ImportSettings`, `GetDataSizeReport`, `HypnoTriggers`, `DrugKeywords`, `NetgunKeywords`, `sendLSCGBeep`, `ConfiguredActivities`, `CraftableItemSpellNames` + Screen-Funktionen `LSCG_*MiniGame*` |
| **Themed** | `ThemedLoaded` (bool); `Themed` selbst ist `undefined` | Screen-Funktionen `Themed_<screen>Load/Run/Click/Exit/Unload/Resize` |
| **BCT, FUSAM** | nur über bcModSdk | — |

**Korrektur einer Recherche-Annahme:** `LSCG_DB` ist **kein** Spiel-Global — das ist der Schlüssel des *Tools* in IndexedDB. LSCG-Erkennung im Spiel läuft über `LSCG_Loaded` / `LSCG`.

### Q3 — Getter-Nebenwirkungen
- `window` hat **18.700** eigene Properties, davon **189 Getter** — alle im Sample sind Standard-DOM (`document`, `location`, `navigator`, `screen`, `innerWidth`…). Spiel- und Mod-Globals sind Daten-Properties.
- **Konsequenz:** Enumeration über `Object.getOwnPropertyNames(window)` + `getOwnPropertyDescriptor`; Getter **nie lesen** (nur als „getter" markieren); 18.700 Einträge in Chunks (z.B. 500/Tick via `setTimeout(0)`) abarbeiten.

### Q4 — Kern-API und Asset-Verschachtelung
- Präfix-Zählung (12.557 Treffer): `Inventory` **11.000** (Extended-Item-Funktionen je Asset!), `Chat` 573, `Assets` 278, `Dialog` 166, `Character` 143, `Common` 121, `Server` 64, `Item` 51, `Asset` 43, `Player` 33 … `ChatRoomRegisterMessageHandler` vorhanden.
- **Konsequenz:** Core-Inventar nach Präfix gruppieren; `Inventory*` mit Unter-Präfix (`InventoryItem<Group><Asset>…`) zusammenfassen statt 11.000 Einzelzeilen; Signatur = `fn.length` + Name, kein `toString()` im Massenlauf.
- Assets: **4.764** Assets, **120** Gruppen, **100 Keys** pro Asset (vollständige Liste in der JSON), Verschachtelungstiefe 5, **zirkuläre Referenz** `Asset.Group.Asset` bestätigt.
- **Konsequenz:** Asset-Serialisierung mit Allowlist skalarer/array Keys (`Name, Description, Group→Group.Name, Category, IsLock, IsRestraint, AllowLock, AllowLockType, Extended, Layer→count, DefaultColor, Value, Difficulty, Effect, Block, Prerequisite, Activity, AllowActivity, Attribute, Gender…`); `Group`/`ParentItem` nur als Name; Tiefe ≤ 2.

## Snippet (read-only, ausgeführt)

Siehe Chat-Verlauf / `05-CONSOLE-RESULT.json` — das Snippet enumeriert nur Deskriptoren und Keys, ruft keine Spielfunktion auf, begrenzt alle Ausgaben.

## Status
SCAN-13 ✓ erfüllt — Befehle und Ergebnisse dokumentiert; Enumerator-Design kann darauf aufbauen.
