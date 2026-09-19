# GAME-INVENTORY.md — Snapshot vs. Baseline (SCAN-12)

**Snapshot:** 2026-09-19T12:18:38.831Z · BC R132 · 38 Mods · 8308296 Zeichen (id 1789820318831_gi_1789820315130_1) · **Baseline:** baseline-manifest.json, 83 Bezeichner (19 function / 33 assetGroup / 31 unknown), Stand Commit 8cdfed0

Der Snapshot wurde im Tool über ⚙️ Tweaks → 🔎 Spiel scannen erzeugt (Enumerator-Dauer laut `inventory.durationMs`: 322 ms, `inventory.errors`: leer) und über den ⬇-Button des Scan-Tabs exportiert (`_meta.version` 1, `inventory.schema` 1). Die Baseline ist der generierte Katalog aller Spiel-Bezeichner, die das Tool heute in `bot-engine.js`, `items.js`, `bot-ui.js`, `bot-data.js` und `loader.js` referenziert.

## Zusammenfassung

| Kategorie | gesamt | genutzt | neu | unbekannt |
|---|---|---|---|---|
| globals | 14004 | 27 | 13977 | 0 |
| assets | 4894 | 1372 | 3522 | 0 |
| groups | 130 | 28 | 102 | 0 |
| hooks | 122 | 7 | 115 | 0 |
| mods | 38 | 5 | 33 | 0 |
| patching | 588 | 16 | 572 | 0 |
| probes | 184 | 99 | 85 | 0 |
| all | 19960 | 1554 | 18406 | 0 |

„genutzt" heißt: der Name steht in der Baseline, das Tool referenziert ihn also heute irgendwo (bei Assets zählt die Gruppe, bei Mods und Probes der Probe-Schlüssel bcx/lscg/mbs/themed/wce). „neu" heißt nur: das Tool kennt den Namen nicht — nicht, dass er sicher nutzbar wäre. Auffällig: Von 12.146 Funktionen auf `window` nutzt das Tool 19; von den 130 Asset-Gruppen sind 102 ohne Tool-Bezug, darunter 35 Gruppen mit Luzi-Kennung der Echo-Kleidungserweiterung (`_Luzi`/`笨笨蛋Luzi`, z. B. `Cloth_笨笨蛋Luzi` mit 174 Assets) und 10 weitere Mod-Gruppen (`ItemCanvas1`…`ItemCanvas3Vis`, `SingleGloveFX`). Die Patching-Dichte ist hoch: 588 Spielfunktionen sind von mindestens einem Mod gehookt, `ChatRoomMessage` von 19, `ChatRoomSync` von 18, `ServerSend` von 16 Mods — genau die drei Funktionen, über die auch das Tool spricht. Der Chat-Handler-Registry ist introspektierbar: `ChatRoomMessageHandlers` enthält 37 Handler mit Priorität −220 (MBCHC) bis 1024 (SugarChain), 18 davon aus dem Spiel selbst.

Präfix-Verteilung der Funktionen (gekürzt): Inventory 6188 (davon 3745 Item-Hooks außerhalb der 3 Gruppen-Buckets), Chat 447, Preference 293, Assets 279, Private 186, Asylum 161, Club 148, Dialog 141, Character 115, ChatRoom 361 (davon 78 `ChatRoomMapView*`), Server 47, Activity 36, Crafting 31, Wardrobe 75, Skill 13, Reputation 5, Timer 11. Die 188 Getter sind ausnahmslos Browser-APIs (`window`, `document`, `localStorage` …) und wurden nicht gelesen.

### Chat-Handler-Pipeline (`ChatRoomMessageHandlers`, 37 Handler)

| Priorität | Handler-Beschreibung |
|---|---|
| -220 | MBCHC preprocessor |
| -219 | MBCHC autohack lookup |
| -210 | Reset minigame on room updates |
| -200 | Ghosted player handling |
| -200 | BCAR+ Ground flying players with chains |
| -200 | BCAR+ Emotes |
| -100 | Process status messages |
| -100 | Break leash after a server disconnect |
| -1 | Process hidden messages |
| 0 | Emote messages formatting |
| 90 | show OriginalMsg while deafened |
| 99 | EBCH Ungarbling |
| 100 | Sensory-deprivation processing |
| 109 | LSCG Hypnosis Trigger Checks |
| 110 | Save chats and whispers to the chat log |
| 120 | Handle action visual effects |
| 200 | Hide automatic actions that don't involve the player, per preferences |
| 210 | Handle stimulation events |
| 210 | Arousal processing |
| 290 | SugarChain Activity Handler v1.0.4 |
| 290 | SugarChain Activity Handler v0.6.1 |
| 290 | SugarChain Activity Handler v0.6.3 |
| 300 | Hide anything per sensory deprivation rules |
| 310 | Hide sexual activity messages, per preferences |
| 310 | Map room hearing distances |
| 499 | EBCH Ungarbling (final) |
| 500 | Audio system hook for sound effects |
| 500 | Raise a notification if required |
| 500 | Push message to the chat |
| 500 | EBCH handler |
| 600 | Moaner Orgasm |
| 600 | Moaner Target |
| 600 | BCAR+ Activites |
| 600 | BCAR+ Auto Reactions |
| 1024 | SugarChain ChatMessage Handler v1.0.4 |
| 1024 | SugarChain ChatMessage Handler v0.6.1 |
| 1024 | SugarChain ChatMessage Handler v0.6.3 |

Reihenfolge = Ausführungsreihenfolge bei jeder eingehenden Chat-Nachricht. Alles ab 300 (Sensory-Deprivation) kann Nachrichten verstecken oder verändern, bevor ein Hook auf `ChatRoomMessage` mit niedriger Priorität sie sieht — relevant für Vorschlag 19 und 22.

## Top-Vorschläge

Alle Aritäten stammen aus `Function.length` des Deskriptors; BC nutzt oft Default-Parameter, dann steht dort 0, obwohl die Funktion Argumente nimmt. Aufwand ist eine Kontextkosten-Schätzung: S = ein Aktions-/Bedingungstyp plus eine Codegen-Zeile in `bot-engine.js` und ein Test; M = neuer Trigger inkl. Hook-Registrierung über die Bridge, Handler-Test und Doku-Zeile; L = neuer Tab mit eigener Persistenz und Load-Order-Eintrag.

### Bot-Aktionen

| # | Fund (Kategorie · Name) | Badge | Was es ermöglicht | Aufwand |
|---|---|---|---|---|
| 1 | globals · `CharacterSetFacialExpression` (Arität 0) | neu | Aktion „Gesichtsausdruck setzen" (Ziel: Auslöser/Alle): Blush, Eyes, Mouth per Gruppe und Wert, optional mit Zeit — passt zu Erregung/Orgasmus-Aktionen. | S |
| 2 | globals · `CharacterSetActivePose` (0) / `PoseSetActive` (0) | neu | Aktion „Pose setzen" (Knien, Hände hinter dem Rücken, …) ohne ein Pose-erzwingendes Item anzulegen; Gegenstück zur Bedingung „Kann nicht gehen". | S |
| 3 | globals · `TimerInventoryRemoveSet` (3) / `TimerInventoryRemove` (0) + `InventoryLock` (0) | neu / bereits genutzt | Native Ablaufzeit für ein angelegtes Item: Timer-Schloss (`TimerPadlock`, `OwnerTimerPadlock` …) mit `Property.RemoveTimer` + `RemoveItem: true` — das Spiel entfernt Item und Schloss selbst, überlebt Reload/Reconnect, anders als der heutige „⏳ Verfall" per eigenem Timer. Konsolentest 2026-09-19: ohne Schloss streicht `ValidationSanitizeLock` den `RemoveTimer` beim Sync; mit `TimerPadlock` (max. ~5 min) funktioniert es. | S |
| 4 | globals · `InventoryWearRandom` (3) / `CharacterFullRandomRestrain` (3) | neu | Aktion „Zufalls-Item an Gruppe" bzw. „Zufalls-Fesselung" als Alternative zur festen Item-/Profil-Aktion; Gruppe per Dropdown wie bei „Item entfernen". | S |
| 5 | globals · `InventoryLockRandom` (3) / `InventoryFullLockRandom` (2) / `InventoryConfiscateKey` (0) | neu | Aktion „Zufalls-Schloss auf Gruppe" und „Schlüssel einziehen" — ergänzt die Curse-Aktion um Schloss-Logik, die das Spiel selbst validiert. | S |
| 6 | globals · `CharacterRelease` (1) / `CharacterReleaseTotal` (0) | neu | Aktion „Alles lösen" (nur Fesseln, Kleidung bleibt) als Safeword-/Fallback-Aktion; heute muss man Gruppen einzeln entfernen. | S |
| 7 | globals · `ChatRoomPublishCustomAction` (0) / `ChatRoomPublishAction` (0, gepatcht von 服装拓展) | neu | Aktion „Raum-Meldung": systemartige Aktionsnachricht („X wurde …") statt Emote — anderes Rendering, andere Filter beim Empfänger. Patch-Konflikt mit der Echo-Kleidungserweiterung vorher prüfen. | S |
| 8 | globals · `ActivityRun` (0) + assets · `AllowActivity` (16 Typen: SpankItem, TickleItem, ShockItem, Inject, PourItem …) | neu | Aktion „Aktivität ausführen" mit Item-Bezug (z. B. Spank mit Paddle); Aktivitätsliste kommt aus dem Asset-Katalog des Snapshots. | M |
| 9 | globals · `ServerSendBeepMessage` (0) / `ServerAccountBeep` (0, 10 Mods hooken) | neu | Aktion „Beep senden" an Spieler außerhalb des Raums (Einladungen, Erinnerungen). Rate-Limit `ServerSendRateLimit` beachten; 10 Mods hängen an derselben Funktion. | M |
| 10 | globals · `ChatRoomAdminAction` (0) | neu | Aktion „Admin-Aktion" (Kick/Ban/Whitelist) als Konsequenz eines Triggers — benötigt Raum-Admin wie Teleport; Bestätigungs-Flag im Editor sinnvoll. | M |

Auswahl nach Nähe zu bestehenden Aktionen (Item/Curse/Erregung/Teleport) und Alltagsfrequenz: 1–6 sind reine Charakter-Operationen mit lokalem Effekt plus Sync, 7–10 sprechen den Server bzw. andere Spieler an und brauchen deshalb Admin-/Rate-Limit-Hinweise im Editor.

### Bot-Trigger

| # | Fund (Kategorie · Name) | Badge | Was es ermöglicht | Aufwand |
|---|---|---|---|---|
| 11 | patching · `ChatRoomSyncMemberLeave` (7 Mods: CRABS, BCX, BCTweaks, AbundantiaFlorumChromatica, BC+, Liko - FCM, Liko - AEE) | neu | Trigger „Spieler verlässt" als Gegenstück zu „Spieler betritt" (`ChatRoomSyncMemberJoin` ist bereits genutzt): Abschiedstexte, Variablen zurücksetzen, Map-Keys sichern. | M |
| 12 | patching · `ActivityOrgasmStart` (9 Mods) / `ActivityOrgasmStop` | neu | Trigger „Orgasmus beginnt/endet" — bislang gibt es nur die Bedingung 💗 Erregung per Schwelle; der Hook liefert das Ereignis selbst, inkl. Ziel. | M |
| 13 | patching · `ChatRoomSyncItem` / `ChatRoomSyncSingle` (6 Mods) | neu | Trigger „Item an Spieler geändert" (wer zieht wem was an/aus) — Grundlage für Anti-Strip-Reaktionen und Curse-Verstöße als Ereignis statt Polling. | M |
| 14 | patching · `ChatRoomSafewordRelease` / `ChatRoomSafewordRevert` (gepatcht von ULTRAbc) | neu | Trigger „Safeword benutzt": Bot stoppt laufende Szenen, entfernt eigene Curses, schreibt ins Log — Sicherheitsfunktion mit höchster Priorität. | M |
| 15 | globals · `ChatRoomMapViewCharacterOnWhisperRange` (0) / `ChatRoomMapViewCharacterIsVisible` (1) / `ChatRoomMapViewCharacterOnInteractionRange` (1) | neu | Bedingung „in Sicht-/Flüster-/Interaktionsreichweite des Bots" auf der Karte — feiner als Zone Punkt/Bereich und nutzt die Perception-Masken des Spiels (`ChatRoomMapViewVisibilityMask`). | S |
| 16 | globals · `CharacterIsEdged` (1) / `InventoryCharacterHasLockedRestraint` (1) | neu | Bedingungen „ist am Edge" und „trägt verschlossene Fessel" — Zustandsbedingungen wie ⛓ Gefesselt, direkt aus Spiel-Helfern statt eigener Effekt-Auswertung. | S |
| 17 | globals · `ChatRoomIsOwnedByPlayer` (0) / `ChatRoomOwnershipOptionIs` (0) / `ChatRoomLovershipOptionIs` (0) | neu | Bedingung „Beziehung": Ziel ist Owner/Sub/Lover des Bots — heute nur über Whitelist nachbildbar. | S |
| 18 | patching · `ChatRoomStatusUpdate` (0, gehookt) | neu | Trigger „Status geändert" (Away/Talk/Whisper): Bots reagieren auf AFK oder rufen Spieler zurück. | M |
| 19 | hooks · `ChatRoomMessageHandlers` (37 Handler, Priorität −220 … 1024) via `ChatRoomRegisterMessageHandler` (1) | bereits genutzt (neue Verwendung) | Bot-Trigger als registrierter Handler mit eigener Priorität (z. B. 1100, nach SugarChain 1024) statt Hook auf `ChatRoomMessage`; sichtbar im Registry, entkoppelt von den 19 anderen Hookern. | M |

Auswahl nach Ereignissen, die heute gar nicht oder nur per Polling erreichbar sind (Verlassen, Orgasmus, Item-Änderung, Safeword) — 11–14 und 18 sind Hook-Trigger auf Funktionen, die bereits von mehreren Mods gehookt werden, also erprobte Hook-Punkte des bcModSdk; 15–17 sind Bedingungen ohne Hook.

### Tab-Funktionen

| # | Fund (Kategorie · Name) | Badge | Was es ermöglicht | Aufwand |
|---|---|---|---|---|
| 20 | globals · `CraftingSerialize` (1) / `CraftingDeserialize` (1) / `CraftingLoadServer` (1) / `CraftingSaveServer` (0) / `CraftingGetAllAssetNames` (0) + `CraftingSlots` | neu | Craft-Tab: alle Crafts des Spielers sichern, versionieren und wiederherstellen — passt zur Bedingung „Craft getragen"; MBS patcht `CraftingJSON.encode`, Format vorher gegen MBS-Export abgleichen. | L |
| 21 | globals · `WardrobeFastLoad` (0) / `WardrobeFastSave` (2) / `WardrobeAssetBundle` (1) + `Wardrobe` (object), `CharacterCompressWardrobe` (0) | neu | Outfit-Tab: Wardrobe-Slots des Spiels importieren/exportieren, Slot-Diff gegen Tool-Outfits; heute kommen Outfits nur über den Scanner oder Outfit-Code. | M |
| 22 | hooks · `ChatRoomMessageHandlers` Registry (37 Handler mit Description/Priority) | bereits genutzt (neue Verwendung) | Scan-Tab-Ansicht „Chat-Pipeline": Handler in Prioritätsreihenfolge mit Mod-Zuordnung — erklärt, warum ein Bot-Trigger eine Nachricht (nicht) sieht (z. B. Sensory-Deprivation bei 300, EBCH Ungarbling bei 99/499). | S |
| 23 | patching · `modSdk.patching[].hookedByMods` (588 Einträge; Spitzenreiter `ChatRoomMessage` 19, `ChatRoomSync` 18, `ServerSend` 16, `LoginResponse` 14, `DrawCharacter` 13) | bereits genutzt (neue Verwendung) | Scan-Tab-Ansicht „Mod-Konflikte": Funktionen mit ≥ 5 Hookern und alle `patchedByMods`-Einträge (55) — Frühwarnung für Bot-Aktionen, die dieselbe Funktion nutzen. | S |
| 24 | assets · `items[].Effect` (70 verschiedene: GagHeavy, BlindTotal, DeafTotal, Freeze, Leash, Enclose …) / `items[].AllowActivity` (16) | Gruppen bereits genutzt (neue Verwendung) | Items-Tab-Filter nach Effekt und Aktivität („alle Items mit BlindTotal") — dieselbe Quelle, die die Zustandsbedingungen auswerten. | M |
| 25 | groups · 35 Luzi-Gruppen der Echo-Kleidungserweiterung (`Cloth_笨笨蛋Luzi` 174, `新前发_Luzi` 81, `ClothLower_笨笨蛋Luzi` 88 …) | neu | Outfit-Tab: Outfits mit Mod-Items markieren und beim Anlegen warnen, wenn der Ziel-Spieler die Erweiterung (Mod `服装拓展` 1.136.0-beta.0) nicht hat — sonst fehlen Items still. | M |
| 26 | globals · `ChatRoomLeashList` / `ChatRoomLeashPlayer` (values) + `ChatRoomDoHoldLeash` (0) / `ChatRoomCanBeLeashedBy` (0, 4 Mods) | neu | Spieler-Tab: Leinen-Status (wer führt wen) anzeigen; später Aktion „Leine nehmen/loslassen". | M |
| 27 | globals · `ReputationGet` (2) / `SkillGetLevel` (0) / `SkillGetProgress` + `SkillValidSkills`, `ReputationValidReputations` (values) | neu | Spieler-Tab: Reputation und Skill-Level des Ziels lesen (nur lesen) — Grundlage für Rang-Automatik oder Bedingungen „Skill ≥ N". | S |

Auswahl nach Datenbeständen, die das Tool bereits versioniert (Outfits, Crafts-Bedingung, Items, Spieler) und die der Snapshot jetzt vollständig beschreibt; 22 und 23 sind reine Ansichten über bereits gespeicherte Snapshot-Daten und damit die günstigsten Einstiege.

## Mods, die sich zu integrieren lohnen

| Mod | Version | Angebot laut Snapshot (API/Hooks/Probes) | Mögliche Nutzung im Tool | Aufwand |
|---|---|---|---|---|
| LSCG (Little Sera's Club Games) | 0.8.18 | 106 Hooks + 2 Patches; API (`window.LSCG`): `Outfits`, `HypnoTriggers`, `ExportSettings`, `ImportSettings`, `GetDataSizeReport`, `sendLSCGBeep`, `getModule`; 18 Screen-Funktionen (`LSCG_SuggestionMiniGame*`, `LSCG_InjectEnd_Sedative`, `LSCG_InjectEnd_Brainwash`); Chat-Handler „LSCG Hypnosis Trigger Checks" @109 | LSCG-Tab (existiert) um `Outfits()`-Abgleich und `HypnoTriggers()`-Anzeige erweitern; `ExportSettings`/`ImportSettings` als Backup-Quelle neben `LSCG_DB`; `GetDataSizeReport` für das Speicher-Panel. | M |
| MBS (Maid's Bondage Scripts) | 1.10.26 (API 1.5) | 13 Hooks + 4 Patches (`WheelFortuneRun`, `CraftingJSON.encode`, `SpeechTransformProcess`); API (`window.mbs`): `wheelOutfits`, `wheelEvents`, `_toItemBundles`, `runTests`, `getDebug` | Glücksrad-Outfits (`wheelOutfits`) als Outfit-Quelle importieren; `wheelEvents` als Trigger „Rad-Ergebnis"; `_toItemBundles` als Referenz für das Bundle-Format der eigenen Outfit-Aktion. | M |
| WCE (Wholesome Club Extensions) | 6.3.20 | 66 Hooks + 7 Patches (`ChatRoomSendChat`, `TimerProcess`, `ServerPlayerAppearanceSync`, `ActivitySetArousalTimer`); Funktionen `fbcSendAction`, `fbcChatNotify`, `fbcDisplayText`, `fbcSettingValue`, `wceServerAppearance` | `fbcChatNotify` als lokale Bot-Benachrichtigung ohne Raum-Nachricht; `fbcSendAction` für Raum-Meldungen (Vorschlag 7 als Alternative); Patch auf `ChatRoomSendChat` erklärt, warum Chat-Aktionen des Tools durch WCE laufen. | S |
| BCX (Bondage Club Extended) | 1.1.20-f4380481 | 131 Hooks + 9 Patches (`InformationSheetRun/Click`, `ChatAdminRun/Click`, `ServerUnPackItemPermissions`, `LoginMistressItems`); `bcx` nicht-enumerierbar, `api` im Snapshot leer, `BCX_Loaded` gesetzt; Tool-eigener Mod `BCK_BCXFilter` 1.0.0 hookt `ServerSend` | Rules/Curses aus BCX lesen nur über die offizielle Mod-API (vom Snapshot nicht erfasst, da nicht-enumerierbar) — vorher in der Konsole `Object.getOwnPropertyNames(bcx)` prüfen; der bestehende `BCK_BCXFilter` bleibt der einzige Berührungspunkt. | L |
| ULTRAbc | 6.2.1 | 158 Hooks + 13 Patches (Spitzenreiter): `ChatRoomSafewordRelease/Revert`, `FriendListLoadFriendList`, alle `PreferenceSubscreen*Load`, `WardrobeLoad`, `PrivateClick` | Safeword-Trigger (Vorschlag 14) muss ULTRAbc-kompatibel hooken (Patch ersetzt die Funktion); Wardrobe-Import (21) ebenfalls gegen den `WardrobeLoad`-Patch testen. | M |
| Echo-Erweiterungen (`服装拓展` Kleidung 1.136.0-beta.0, `动作拓展` Aktionen 0.38.0-beta.0) | s. links | 50 + 33 Hooks, 10 + 2 Patches (`DrawCharacter`, `GLDrawLoad`, `ChatRoomPublishAction`, `CharacterCheckHooks`); 35 eigene Asset-Gruppen (Luzi-Kennung); Chat-Handler „SugarChain ChatMessage/Activity Handler" (3 Versionen parallel @1024/@290) | Mod-Gruppen-Erkennung im Outfit-Tab (25); Aktivitäten (8) laufen durch die SugarChain-Handler — Trigger-Priorität > 1024 wählen, wenn Bot nach ihnen lesen soll. | M |
| BCOM (BC Outfit Manager) | 0.8.4.2 | 9 Hooks (`ChatRoomRun`, `CommonSetScreen`, `DialogDraw`, `DrawCharacter`) | Konkurrierender Outfit-Speicher — Import-Pfad im Outfit-Tab prüfen, ob BCOM-Outfits im Wardrobe-Format (`WardrobeAssetBundle`) vorliegen. | S |
| BCAR+ (Auto React) | 0.7.10-b | 7 Hooks; Chat-Handler „BCAR+ Auto Reactions"/„Activites" @600, „Emotes"/„Ground flying players" @−200 | Reagiert auf dieselben Aktivitäten wie Vorschlag 8/12 — Doppelreaktionen vermeiden, Bot-Handler nach 600 einordnen. | S |

### Alle 38 Mods der Session (sortiert nach Hook-Zahl)

| Mod | Version | Hooks | Patches | Badge |
|---|---|---|---|---|
| ULTRAbc (Ultra Bondage Club) | 6.2.1 | 158 | 13 | neu |
| BCX (Bondage Club Extended) | 1.1.20-f4380481 | 131 | 9 | bereits genutzt |
| LSCG (Little Sera's Club Games) | 0.8.18 | 106 | 2 | bereits genutzt |
| WCE (Wholesome Club Extensions) | 6.3.20 | 66 | 7 | bereits genutzt |
| Liko - AEE (Liko - Appearance Editor) | 0.9.4 | 62 | 0 | neu |
| 服装拓展 (Echo的服装拓展-beta) | 1.136.0-beta.0 | 50 | 10 | neu |
| AbundantiaFlorumChromatica (Abundantia Florum ─Chromatica─) | 0.7.3 | 47 | 0 | neu |
| DOGS (Devious Obligate Great Stuff) | 2.2.3 | 34 | 0 | neu |
| 动作拓展 (Echo的动作拓展-beta) | 0.38.0-beta.0 | 33 | 2 | neu |
| EBC (EmeryBC) | 9.1.8 | 33 | 0 | neu |
| MPA (Maya's Petplay Additions) | 0.6.1 | 27 | 0 | neu |
| BCTweaks (Bondage Club Tweaks) | 0.6.10 | 22 | 2 | neu |
| Liko - FCM (Friends and ChatRoom Manager) | 1.6.5 | 20 | 0 | neu |
| Themed (BC Themed) | 1.8.3 | 20 | 6 | bereits genutzt |
| Liko - HSC (Hypnotic Slave Club) | 1.0.2 | 19 | 0 | neu |
| CRABS (Crazy Roster Add-on By Sin) | 2.1.4.160 | 18 | 0 | neu |
| MoonCE (Moon Cards Editor) | 1.2.26 | 17 | 0 | neu |
| KikiLink | 0.30.0 | 17 | 0 | neu |
| BC+ (Bondage Club Plus) | 0.12.0 | 13 | 0 | neu |
| MBS (Maid's Bondage Scripts) | 1.10.26 | 13 | 4 | bereits genutzt |
| Advanced Drone Control System | 0.8.2 | 12 | 0 | neu |
| BC Notify Plus | 0.4.11 | 9 | 0 | neu |
| BC Outfit Manager (BCOM) | 0.8.4.2 | 9 | 0 | neu |
| Bondage Club XToys Integration (BC-XToys) | 0.5.9 | 8 | 0 | neu |
| FetishShare | 0.1.5 | 8 | 0 | neu |
| FUSAM (Fantastic Ultimate Solution to Addon Management) | a2685758 | 7 | 0 | neu |
| BCAR+ (Bondage Club Auto React +) | 0.7.10-b | 7 | 0 | neu |
| LianChat | 0.1.2 | 7 | 0 | neu |
| MBCHC (Mute's Bondage Club Hacks Collection) | 121.13.1 | 7 | 0 | neu |
| CATS (Chat Auto Translator System) | 1.1.0 | 2 | 0 | neu |
| ULTRAbc-manager (Ultra Bondage Club) | 6.2.1 | 2 | 0 | neu |
| emlalock (EmlaLock) | 0.3.3 | 2 | 0 | neu |
| cia (Community Information Addon (CIA)) | 0.4.1 | 2 | 0 | neu |
| EBCH (Eli's Bondage Club Helper) | 2.0.4 | 2 | 0 | neu |
| BCT (Bondage Club Tools) | 0.7.0 | 2 | 0 | neu |
| BondageClub Responsive | 1.2.5 | 1 | 0 | neu |
| BCK_BCXFilter (BCK BCX-Filter) | 1.0.0 | 1 | 0 | neu |
| NFT (Nest of Fluffy Treasures) | 1.4.0 | 0 | 0 | neu |

Hooks/Patches = Anzahl der Einträge in `modSdk.patching`, in denen der Mod unter `hookedByMods` bzw. `patchedByMods` steht. Fünf Mods gelten als „bereits genutzt", weil das Tool ihre Probe-Schlüssel kennt; `BCK_BCXFilter` ist der Tool-eigene Mini-Mod aus dem Bot-Deploy und steht deshalb im Snapshot.

DOGS 2.2.3 (34 Hooks) hat mit `dogs-lock-remover.user.js` bereits einen Berührungspunkt im Repo; Themed 1.8.3 (20 Hooks, 49 Screen-Funktionen) ist rein optisch und braucht keine Integration.

## Nicht übernommen (bewusst)

- `SkillChange` (5) / `SkillSetModifier` (4) / `ReputationChange` (3) / `LogAdd` (3) / `LogDelete`: schreiben server-persistente Fortschritts- und Regeldaten des Spielers; kein Bot-Nutzen, der das Risiko unumkehrbarer Änderungen rechtfertigt. Lesen (Vorschlag 27) ja, schreiben nein.
- `CharacterChangeMoney` (2) / `DialogChangeMoney` (1) / `ChatRoomReceiveSuitcaseMoney`: Spiel-Geld statt Tool-Money — das Tool hat sein eigenes Money-System (`BC_Money_v1`); Vermischung wäre verwirrend und serverseitig sichtbar.
- Die 78 `ChatRoomMapView*`-Funktionen jenseits von Reichweite/Teleport (Edit-Modus, `ChatRoomMapViewSyncMapData`, Fog, Conveyor): Karten-Editor ist Admin-Werkzeug, nicht Bot-Verhalten.
- `ServerRoomSearch` (2) / `ServerRoomJoin` (1) / `ChatSearchQuery` (1): automatisches Raumwechseln durch Bots ist Spam-Potenzial und kollidiert mit dem Reconnect-Handling der Bridge.
- `ChatRoomMessageProcessHidden` (0) und Hidden-Messages generell: Mod-zu-Mod-Protokolle (BCX, LSCG, MBS) — ohne Spezifikation nur zu erraten.
- `Private*` (186), `Asylum*` (161), `Pandora*` (107), `Club*`, `Maid*`, `College*`: NPC-/Offline-Dialogfunktionen, im Online-Chatraum ohne Wirkung.
- `bcx`-Objekt: im Snapshot mit leerer API, weil nicht-enumerierbar — keine Vorschläge auf Verdacht (siehe Mod-Tabelle).
- Die 188 Getter auf `window`: alle Browser-APIs, nie gelesen (SCAN-07) — kein Spielbezug.
- Keine automatische Löschung oder Pruning von Snapshots und kein automatisch generierter Bot-Code ohne Review (REQUIREMENTS.md Out-of-Scope) — dieses Dokument enthält deshalb ausschließlich Namen, Nutzen und Aufwand.

## Sicherheitshinweis

Jede Zeile mit Badge „neu" ist unverifiziert: Der Snapshot kennt Name, Typ und Arität (`Function.length`, bei Default-Parametern 0), aber nicht Signatur, Rückgabe oder Nebenwirkungen. Vor einer Nutzung im Spiel-Tab ist die Funktion in der BC-Konsole zu prüfen (`String(fn).slice(0, 400)` für die Signatur, dann ein Aufruf mit harmlosen Argumenten auf den eigenen Charakter) — Muster wie bei SCAN-13 / 05-CONSOLE-FINDINGS. Unbekannte Funktionen dürfen nie blind aus generiertem Bot-Code aufgerufen werden (T-6-07); bei Hook-Triggern zusätzlich prüfen, welche Mods dieselbe Funktion hooken oder patchen (Spalte `hookedByMods`/`patchedByMods`), da Patches die Originalfunktion ersetzen und Hook-Reihenfolgen verändern. Namen wandern mit BC-Releases: Dieser Snapshot gilt für R132.

## Methodik

- Übersichtstabelle: `npm run analyze -- .planning/analysis/snapshot.json --limit 5` — dieselben Funktionen `_scanFlatten`, `_scanBaselineSets`, `_scanBadge`, `_scanCountBadges` aus `scan-tab.js`, die auch der Scan-Tab benutzt; die Zeile `| all |` ist unverändert übernommen. Reproduzierbar mit `npm run analyze -- .planning/analysis/snapshot.json`.
- Detailauswertung per gezielten node-Skripten über `JSON.parse(fs.readFileSync('.planning/analysis/snapshot.json'))` (`inventory.globals.functions[].name/arity`, Präfix-Gruppierung nach `/^[A-Z][a-z]+/`, `inventory.globals.byPrefix`, `inventory.modSdk.patching` sortiert nach `hookedByMods.length`, `inventory.mods`, `inventory.probes.*`, `inventory.chatHooks.registry.handlers`, `inventory.assets.groups[].Name/assetCount`, Mengen der `Effect`- und `AllowActivity`-Werte über `inventory.assets.items`). Die JSON-Datei (8,4 MB) wurde nie vollständig in den Agentenkontext geladen.
- Badge-Regel: globals/groups/patching/hooks → Name in der Menge aller Baseline-Bezeichner; assets → nach Gruppe (ein Asset gilt als „genutzt", wenn das Tool seine Gruppe referenziert); mods/probes → Probe-Schlüssel `modProbes` (bcx, lscg, mbs, themed, wce). Die Baseline-Klassifikation function/assetGroup/unknown ist heuristisch (Regex `identifierPattern` über fünf Quelldateien).
- Grenzen: Assets nur gruppenweise bewertet (1372 „genutzt" heißt „Gruppe bekannt", nicht „Asset verwendet"); Aritäten aus `Function.length`; `hooks` und `probes` nur über Namen bzw. Probe-Schlüssel erkannt; `bcx` nicht-enumerierbar, daher API leer; Snapshot einer einzelnen BC-Version (R132) mit dieser Mod-Auswahl (38 Mods) — andere Sessions liefern andere Zahlen. Der Enumerator liest keine Werte, nur Deskriptoren (SCAN-07), Spieler- oder Chatdaten sind nicht enthalten.
- Korrektur nach Code-Review (CR-01): `_scanFlatten` reduzierte Mod-API-Einträge (`{name, kind}` aus `giDescribeApi`) nicht auf den Namen und ließ `screenFunctions.sample` fallen — die probes-Zeile lautete zunächst 166/81/85 (21 Zeilen `[object Object]`, 18 `LSCG_*`-Screens fehlten). Nach dem Fix in `scan-tab.js`: 184/99/85; Tabelle oben entsprechend aus `npm run analyze` neu übernommen.
- Verifikations-Stichprobe für das SUMMARY: `CharacterSetFacialExpression` (0), `TimerInventoryRemoveSet` (3), `ChatRoomSyncMemberLeave` (7 Mods), `CraftingSerialize` (1), `Cloth_笨笨蛋Luzi` (174 Assets) — alle in den Skriptausgaben belegt.
