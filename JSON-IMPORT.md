# JSON-Import – Anleitung (Bot-Trigger · Shop · Ränge)

Du kannst Trigger, Shop-Artikel und Ränge per JSON schreiben und importieren.
Jeder der drei Tabs hat dafür einen **`{ }📥`**-Button:

- **Bot** → `{ }📥` (Trigger werden zum **aktuell gewählten Bot hinzugefügt**) · `{ }📤` exportiert die Trigger des Bots als Vorlage.
- **Rang** → `{ }📥` (Ränge werden **zusammengeführt**) · `⬇️` exportiert alle Ränge.
- **Shop** → `{ }📥` (Artikel werden **zusammengeführt**) · `⬇️` exportiert den ganzen Shop.

Im Import-Fenster kannst du JSON **direkt eintippen/einfügen** oder über **„📂 Aus Datei…"** laden.

**Wichtig:**
- **Items, Curse und Outfits müssen NICHT in der JSON stehen.** Du legst eine Aktion z. B. als `{"typ":"item"}` an und wählst das konkrete Item/Curse/Outfit danach im Tool (Item Manager / „📂 Wählen").
- Jede Datei darf **ein einzelnes Objekt** `{ … }` **oder ein Array** `[ { … }, { … } ]` enthalten.
- **Zusammenführen (Shop/Rang):** Gibt es schon einen Eintrag mit gleichem **Namen** oder gleicher **ID**, fragt das Tool **pro Eintrag**, ob überschrieben wird. `id` ist optional – ohne `id` wird automatisch eine vergeben.
- **Tipp:** Der einfachste Weg an ein korrektes Schema zu kommen: einen Eintrag im Tool anlegen, exportieren, und die exportierte JSON als Vorlage bearbeiten.

---

## 1) Trigger (Bot)

Ein Trigger folgt dem Schema **WENN _Bedingungen_ → DANN _Aktionen_**.

### Minimalbeispiel (eine Datei, ein Trigger)

```json
{
  "name": "Begrüßung",
  "bedingungen": [ { "typ": "wort", "wort": "hallo" } ],
  "aktionen":    [ { "typ": "chat", "text": "Willkommen, {name}!" } ]
}
```

### Mehrere Trigger auf einmal

```json
[
  {
    "name": "Pflichtwort Master",
    "cooldownSek": 5,
    "bedingungen": [ { "typ": "wort", "wort": "master", "modus": "fehlt" } ],
    "aktionen": [
      { "typ": "variable", "varOp": "add", "varName": "verstoesse", "varWert": "1" },
      { "typ": "whisper", "text": "⚠️ Du musst „Master" sagen! Verstoß +1." }
    ]
  },
  {
    "name": "Käfig bei !cage",
    "bedingungen": [ { "typ": "wort", "wort": "!cage" } ],
    "aktionen": [ { "typ": "item" } ]
  }
]
```

> Beim zweiten Trigger ist die Item-Aktion absichtlich leer (`{"typ":"item"}`) – das konkrete Item wählst du danach im Tool.

### Trigger-Felder

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `name` | empfohlen | Anzeigename |
| `aktiv` | – | `true`/`false` (Standard `true`) |
| `delay` | – | ms Verzögerung vor Start (Standard `0`). Alias: `delayMs` |
| `cooldownSek` | – | Mindestabstand pro Spieler in Sekunden. Alias: `cooldown` |
| `wiederholung` | – | `"immer"` (= unbegrenzt) / `"einmal"` / `"n_mal"`. Akzeptiert auch `"unbegrenzt"` oder eine **Zahl** (z. B. `3` → 3×, setzt `maxMal`) |
| `maxMal` | – | bei `n_mal`: wie oft |
| `global` | – | **Als Vorbedingung-Modus** (einfach): `true` = 🌐 Global (einmal gilt für alle), `false` = 👤 Pro Spieler. Alternativen: `proSpieler:true` oder Feld `charSpec` (`true`=pro Spieler) |
| `resetOnLeave` | – | bei Pro-Spieler: State beim Verlassen zurücksetzen (`true`/`false`) |
| `von` | – | wer auslösen darf: `"alle"` / `"bot"` / `"whitelist"` |
| `vonNummern` | – | bei `whitelist`: `[12345, 67890]` |
| `bedingungen` | ✓ | Array von Bedingungen (siehe unten) |
| `aktionen` | ✓ | Array von Aktionen (siehe unten) |
| `aktionen_sonst` | – | Aktionen für den SONST-Zweig (IF/ELSE) |

> **Kopf-Felder gehören auf die oberste Ebene des Triggers** (neben `name`), nicht in `bedingungen`/`aktionen`. Beispiel mit allen Einstellungen:
>
> ```json
> {
>   "name": "!pet Anmeldung",
>   "delay": 0,
>   "cooldown": 10,
>   "wiederholung": "unbegrenzt",
>   "global": false,
>   "resetOnLeave": true,
>   "bedingungen": [ { "typ": "wort", "wort": "!pet" } ],
>   "aktionen": [ { "typ": "rang", "rang_op": "setzen", "rang": "Bunny" } ]
> }
> ```

### Bedingungen (`bedingungen[]`)

Jede Bedingung hat ein `typ`-Feld und optional `logik` (`"und"` Standard / `"oder"` / `"und_nicht"`).

| `typ` | Felder | Bedeutung |
|---|---|---|
| `wort` | `wort`, `modus` (`"enthält"`/`"fehlt"`), `typ_msg` (`"any"`/`"chat"`/`"emote"`/`"whisper"`) | Nachricht enthält/fehlt Wort |
| `zone` | `x`, `y`, `name`, `zoneMode` (`"eintritt"`/`"dauerhaft"`) | Spieler steht auf Punkt |
| `zone_rect` | `x1`,`y1`,`x2`,`y2`, `name`, `zoneMode` | Spieler im Rechteck |
| `item_traegt` | `item` | trägt Item/Gruppe |
| `item_traegt_nicht` | `item` | trägt Item/Gruppe NICHT |
| `trigger_war` | `trigId` **oder** `trigger` (Name) | Vortrigger erfüllt – am einfachsten per Name des anderen Triggers |
| `player_betritt` | `betritt_typ` (`"alle"`/`"neu"`/`"rejoin"`) | Spieler betritt Raum |
| `rang` | `rang_op` (`"="`/`"min"`/`"max"`/`"kein"`), `rang_id` **oder** `rang` (Name) | Rang-Vergleich |
| `shop_kauf` | `shop_id` | bestimmter Shop-Kauf |
| `ev_timer` | `sek` | einmalig nach X s |
| `ev_interval` | `sek_min`, `sek_max` | wiederholt alle X–Y s |
| `variable` | `varName`, `varCmp` (`==` `!=` `>` `<` `>=` `<=` `gesetzt` `leer`), `varWert` | Variable vergleichen |
| `zufall` | `prozent` | X % Wahrscheinlichkeit |
| `erregung` | `arCmp` (`>=` `<=` `>` `<` `==`), `arWert` | Erregung (0–100) des auslösenden Spielers. **Funktioniert auch als alleinige Bedingung** – wird dann alle 2 s für alle Raumspieler geprüft und feuert beim Überschreiten. Setzt voraus, dass der Spieler seine Erregung teilt (BC-Sichtbarkeit „Everyone/Access"). |

### Aktionen (`aktionen[]`)

Jede Aktion hat ein `typ`-Feld und optional `aktZiel` (`"ausloeser"` Standard / `"shop_kaeufer"` / `"alle"` / `"whitelist"`, bei whitelist zusätzlich `aktZielNummern`).

| `typ` | Felder | Bedeutung |
|---|---|---|
| `chat` / `emote` / `whisper` | `text`, `zufallstext` (bool) | Nachricht senden. Variablen: `{name} {wort} {x} {y} {v:varname}`. Bei `zufallstext` ist jede Zeile eine Variante. |
| `item` | *(im Tool wählen)* | Item/Curse/Outfit anlegen – Config danach im Tool |
| `item_entf` | `gruppen` (Array, z. B. `["ItemArms","ItemMouth"]`) | Items entfernen |
| `teleport` | *(im Tool wählen)* | Teleport (Punkte/Bereich im Tool setzen) |
| `money` | `money_op` (`"add"`/`"sub"`/`"set"`/`"reset"`), `money_val` | Money ändern |
| `rang` | `rang_op` (`"setzen"`/`"entfernen"`/`"naechster"`/`"vorheriger"`), bei `setzen`: `rang_id` **oder** `rang` (Name) | Rang ändern. **Empfohlen: Rang per Name**, z. B. `{"typ":"rang","rang_op":"setzen","rang":"Bunny"}` |
| `variable` | `varOp` (`"set"`/`"add"`/`"sub"`/`"toggle"`), `varName`, `varWert` | Variable setzen |
| `erregung` | `erregOp` (`"set"`/`"add"`/`"sub"`/`"orgasm"`/`"stop"`), `erregVal` | Erregung/Orgasmus (zuverlässig nur bei dir selbst) |
| `mapkey` | `mapKey` (`"bronze"`/`"silver"`/`"gold"`), `mapKeyOp` (`"geben"`/`"wegnehmen"`) | Map-Schlüssel vergeben/entziehen (Raum-Admin) |
| `szene` | `szeneId` | Story-Szene starten |

> Für `rang_id` und `shop_id` brauchst du die jeweilige ID. Am einfachsten: Rang/Shop-Artikel anlegen, exportieren und die ID aus der JSON kopieren. Bei der Trigger-Aktion `rang` kannst du den Rang sonst auch im Tool auswählen.

---

## 2) Shop-Artikel

Einzeln oder als Array. `name` ist Pflicht, alles andere optional.

### Beispiel

```json
[
  { "name": "Gag", "preis": 50, "icon": "🤐", "beschreibung": "Ein einfacher Knebel" },
  { "name": "VIP-Zugang", "preis": 500, "reqGroup": "pet", "shopHideLocked": true },
  { "name": "Belohnung", "preis": 0, "varName": "gehorsamkeit", "varWert": 100, "varModus": "voraussetzung" },
  { "name": "Freikauf", "preis": 0, "varName": "verstoesse", "varWert": 3, "varModus": "abziehen" }
]
```

> „Belohnung" ist nur kaufbar, wenn der Käufer ≥ 100 `gehorsamkeit` hat (bleibt erhalten). „Freikauf" zieht beim Kauf 3 `verstoesse` ab (Variable als Währung).

### Felder

| Feld | Bedeutung |
|---|---|
| `name` | **Pflicht.** Name, der im `!pay`-Befehl genutzt wird (Leerzeichen erlaubt) |
| `preis` | Kosten in Coins (Standard `0`) |
| `icon` | Emoji (Standard `🛒`) |
| `beschreibung` | optionaler Text |
| `aktiv` | `true`/`false` (Standard `true`) |
| `reqRankId` / `reqRankName` | Mindest-Rang zum Freischalten – per ID **oder** per Name `reqRankName` (leer = alle) |
| `reqGroup` | Ranggruppe (z. B. `"pet"`), leer = alle Gruppen |
| `shopHideLocked` | `true` = **unsichtbar**, solange nicht freigeschaltet (Rang/Gruppe **und** Variable). `false` = sichtbar mit Hinweis „… benötigt". |
| `varName` / `varWert` / `varModus` | Freischaltung/Bezahlung per Variable: `varName` = Variablenname, `varWert` = Mindestwert, `varModus` = `"voraussetzung"` (bleibt) oder `"abziehen"` (wird beim Kauf abgezogen) |
| `preisU` / `preisNostrip` | Aufpreis für `/u` bzw. `/nostrip` (leer = globale Einstellung) |
| `confirmMsg`, `announceMsg`, `announceAllMsg`, `errorMsg` | optionale Texte (leer = Standard) |
| `kaufItem`, `kaufItemAktiv` | Item/Outfit beim Kauf anlegen – **am besten im Tool** über „📂 Wählen" setzen |

> Bei gleichem Namen/ID fragt der Import pro Artikel, ob überschrieben wird.

---

## 3) Ränge

Einzeln oder als Array. `name` ist Pflicht.

### Beispiel

```json
[
  { "name": "Bunny",   "icon": "🐰", "level": 1, "group": "pet" },
  { "name": "Häschen", "icon": "🐇", "level": 2, "group": "pet" },
  { "name": "Drohne",  "icon": "🤖", "level": 1, "group": "drohne", "farbe": "#88aaff" }
]
```

### Felder

| Feld | Bedeutung |
|---|---|
| `name` | **Pflicht.** Anzeigename |
| `icon` | Emoji (Standard `🏅`) |
| `level` | Stufe innerhalb der Gruppe (Standard `1`) |
| `group` | Ranggruppe (klein geschrieben, z. B. `"pet"`); leer = ohne Gruppe |
| `farbe` | Hex-Farbe (Standard `#c4b5fd`) |

> Ränge derselben `group` bauen über `level` aufeinander auf. Bei gleichem Namen/ID fragt der Import pro Rang, ob überschrieben wird.

---

## 4) Platzhalter in Texten

In `chat`/`emote`/`whisper`-Texten kannst du Platzhalter nutzen:

| Platzhalter | Wert |
|---|---|
| `{name}` | Name des Spielers |
| `{wort}` | die auslösende Nachricht |
| `{x}` / `{y}` | Position des Spielers |
| `{v:NAME}` | Wert einer Variable, z. B. `{v:gehorsamkeit}` |

Im Shop zusätzlich (Bestätigungs-/Fehlertexte): `{ziel} {item} {preis} {waehrung} {kontostand}` · bei All-Kauf `{anzahl} {gesamt}`.

---

## 5) Rezepte (Komplett-Beispiele zum Kopieren)

### Auto-Uprank bei 100 Gehorsamkeit
Prüft regelmäßig und steigt auf, sobald die Variable den Wert erreicht. (Den aktuellen Stand siehst du im **🔢 Variablen-Tab**.)

```json
{
  "name": "Auto-Uprank Gehorsamkeit",
  "cooldown": 10,
  "bedingungen": [
    { "typ": "ev_interval", "sek_min": 15, "sek_max": 15 },
    { "typ": "variable", "varName": "gehorsamkeit", "varCmp": ">=", "varWert": "100", "logik": "und" }
  ],
  "aktionen": [
    { "typ": "rang", "rang_op": "naechster" },
    { "typ": "variable", "varOp": "set", "varName": "gehorsamkeit", "varWert": "0" },
    { "typ": "whisper", "text": "🏆 Aufgestiegen! Gehorsamkeit zurückgesetzt." }
  ]
}
```

### Gehorsamkeit per Stichwort sammeln

```json
{
  "name": "Brav sein",
  "cooldown": 30,
  "bedingungen": [ { "typ": "wort", "wort": "ja master" } ],
  "aktionen": [
    { "typ": "variable", "varOp": "add", "varName": "gehorsamkeit", "varWert": "10" },
    { "typ": "whisper", "text": "Brav. Gehorsamkeit: {v:gehorsamkeit}" }
  ]
}
```

### Pflichtwort mit Eskalation (zwei Trigger, Vortrigger per Name)

```json
[
  {
    "name": "Verstoss zaehlen",
    "bedingungen": [ { "typ": "wort", "wort": "master", "modus": "fehlt" } ],
    "aktionen": [
      { "typ": "variable", "varOp": "add", "varName": "verstoesse", "varWert": "1" },
      { "typ": "whisper", "text": "⚠️ Sag „Master"! ({v:verstoesse}/3)" }
    ]
  },
  {
    "name": "Strafe ab 3 Verstoessen",
    "bedingungen": [
      { "typ": "trigger_war", "trigger": "Verstoss zaehlen" },
      { "typ": "variable", "varName": "verstoesse", "varCmp": ">=", "varWert": "3", "logik": "und" }
    ],
    "aktionen": [
      { "typ": "item" },
      { "typ": "variable", "varOp": "set", "varName": "verstoesse", "varWert": "0" }
    ]
  }
]
```

### Map-Key als Belohnung bei Stichwort

```json
{
  "name": "Bronze-Key Belohnung",
  "cooldown": 3600,
  "bedingungen": [ { "typ": "wort", "wort": "!schluessel" } ],
  "aktionen": [
    { "typ": "mapkey", "mapKey": "bronze", "mapKeyOp": "geben" },
    { "typ": "whisper", "text": "🔑 Du hast den Bronze-Schlüssel erhalten." }
  ]
}
```

### Reaktion ab Erregung 80 (eigenständig, ohne weiteren Auslöser)

```json
{
  "name": "Edging-Ansage",
  "cooldown": 60,
  "bedingungen": [ { "typ": "erregung", "arCmp": ">=", "arWert": 80 } ],
  "aktionen": [ { "typ": "whisper", "text": "Nicht kommen ohne Erlaubnis~" } ]
}
```

---

## Kurz-Workflow

1. Im jeweiligen Tab auf **`{ }📥`** klicken.
2. JSON eintippen/einfügen (oder „📂 Aus Datei…").
3. **✓ Importieren**. Bei Konflikten (Shop/Rang) pro Eintrag entscheiden.
4. Bei Trigger-Item/Curse/Outfit-Aktionen: das konkrete Item im Tool wählen.
5. Bot **🔄 Sync** (bzw. neu starten), damit Änderungen aktiv werden.
