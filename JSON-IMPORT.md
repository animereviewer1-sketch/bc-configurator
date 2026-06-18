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
| `delay` | – | ms Verzögerung vor Start (Standard `0`) |
| `cooldownSek` | – | Mindestabstand pro Spieler in Sekunden |
| `wiederholung` | – | `"immer"` / `"einmal"` / `"n_mal"` |
| `maxMal` | – | bei `n_mal`: wie oft |
| `von` | – | wer auslösen darf: `"alle"` / `"bot"` / `"whitelist"` |
| `vonNummern` | – | bei `whitelist`: `[12345, 67890]` |
| `bedingungen` | ✓ | Array von Bedingungen (siehe unten) |
| `aktionen` | ✓ | Array von Aktionen (siehe unten) |
| `aktionen_sonst` | – | Aktionen für den SONST-Zweig (IF/ELSE) |

### Bedingungen (`bedingungen[]`)

Jede Bedingung hat ein `typ`-Feld und optional `logik` (`"und"` Standard / `"oder"` / `"und_nicht"`).

| `typ` | Felder | Bedeutung |
|---|---|---|
| `wort` | `wort`, `modus` (`"enthält"`/`"fehlt"`), `typ_msg` (`"any"`/`"chat"`/`"emote"`/`"whisper"`) | Nachricht enthält/fehlt Wort |
| `zone` | `x`, `y`, `name`, `zoneMode` (`"eintritt"`/`"dauerhaft"`) | Spieler steht auf Punkt |
| `zone_rect` | `x1`,`y1`,`x2`,`y2`, `name`, `zoneMode` | Spieler im Rechteck |
| `item_traegt` | `item` | trägt Item/Gruppe |
| `item_traegt_nicht` | `item` | trägt Item/Gruppe NICHT |
| `trigger_war` | `trigId` | Vortrigger erfüllt |
| `player_betritt` | `betritt_typ` (`"alle"`/`"neu"`/`"rejoin"`) | Spieler betritt Raum |
| `rang` | `rang_op` (`"="`/`"min"`/`"max"`/`"kein"`), `rang_id` | Rang-Vergleich |
| `shop_kauf` | `shop_id` | bestimmter Shop-Kauf |
| `ev_timer` | `sek` | einmalig nach X s |
| `ev_interval` | `sek_min`, `sek_max` | wiederholt alle X–Y s |
| `variable` | `varName`, `varCmp` (`==` `!=` `>` `<` `>=` `<=` `gesetzt` `leer`), `varWert` | Variable vergleichen |
| `zufall` | `prozent` | X % Wahrscheinlichkeit |
| `erregung` | `arCmp` (`>=` `<=` `>` `<` `==`), `arWert` | Erregung (0–100) |

### Aktionen (`aktionen[]`)

Jede Aktion hat ein `typ`-Feld und optional `aktZiel` (`"ausloeser"` Standard / `"shop_kaeufer"` / `"alle"` / `"whitelist"`, bei whitelist zusätzlich `aktZielNummern`).

| `typ` | Felder | Bedeutung |
|---|---|---|
| `chat` / `emote` / `whisper` | `text`, `zufallstext` (bool) | Nachricht senden. Variablen: `{name} {wort} {x} {y} {v:varname}`. Bei `zufallstext` ist jede Zeile eine Variante. |
| `item` | *(im Tool wählen)* | Item/Curse/Outfit anlegen – Config danach im Tool |
| `item_entf` | `gruppen` (Array, z. B. `["ItemArms","ItemMouth"]`) | Items entfernen |
| `teleport` | *(im Tool wählen)* | Teleport (Punkte/Bereich im Tool setzen) |
| `money` | `money_op` (`"add"`/`"sub"`/`"set"`/`"reset"`), `money_val` | Money ändern |
| `rang` | `rang_op` (`"setzen"`/`"entfernen"`/`"naechster"`/`"vorheriger"`), `rang_id` | Rang ändern |
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
  { "name": "VIP-Zugang", "preis": 500, "reqRankId": "", "reqGroup": "pet", "shopHideLocked": true }
]
```

### Felder

| Feld | Bedeutung |
|---|---|
| `name` | **Pflicht.** Name, der im `!pay`-Befehl genutzt wird (Leerzeichen erlaubt) |
| `preis` | Kosten in Coins (Standard `0`) |
| `icon` | Emoji (Standard `🛒`) |
| `beschreibung` | optionaler Text |
| `aktiv` | `true`/`false` (Standard `true`) |
| `reqRankId` | Mindest-Rang-ID zum Freischalten (leer = alle) |
| `reqGroup` | Ranggruppe (z. B. `"pet"`), leer = alle Gruppen |
| `shopHideLocked` | `true` = bei `!shop` ausblenden, wenn nicht freigeschaltet |
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

## Kurz-Workflow

1. Im jeweiligen Tab auf **`{ }📥`** klicken.
2. JSON eintippen/einfügen (oder „📂 Aus Datei…").
3. **✓ Importieren**. Bei Konflikten (Shop/Rang) pro Eintrag entscheiden.
4. Bei Trigger-Item/Curse/Outfit-Aktionen: das konkrete Item im Tool wählen.
5. Bot **🔄 Sync** (bzw. neu starten), damit Änderungen aktiv werden.
