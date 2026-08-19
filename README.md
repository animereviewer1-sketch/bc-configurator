# BC Konfigurator

Browser-Tool für **Bondage Club** zum Scannen, Verwalten und Anlegen von Crafts, Curses,
Outfits und Wheel-Sets — mit Trigger-Bot, Shop-, Rang- und Money-System.

Läuft als eigenes Fenster neben BC und verbindet sich per Bookmarklet mit dem laufenden Spiel.
Keine Installation, keine Erweiterung, keine Überschreibung von BC-Funktionen.

> Getestet mit Bondage Club **R125** · Bot-Engine **v1.5.0**

---

## Screenshots

| Übersicht | Craft & Curse |
|---|---|
| ![Übersicht](docs/screenshots/overview.png) | ![Craft & Curse](docs/screenshots/craft-curse.png) |

| MBS Wheel | Item Manager |
|---|---|
| ![MBS Wheel](docs/screenshots/mbs-wheel.png) | ![Item Manager](docs/screenshots/item-manager.png) |

| LSCG Outfits | Bot |
|---|---|
| ![LSCG Outfits](docs/screenshots/lscg-outfits.png) | ![Bot](docs/screenshots/bot.png) |

---

## Installation

Das Tool wird über ein **Bookmarklet** geladen — ein Lesezeichen, dessen URL JavaScript ist.
Einmal einrichten, danach ein Klick pro BC-Sitzung.

### 1 — Lesezeichen anlegen

1. Lesezeichenleiste einblenden: <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
2. Rechtsklick in die Leiste → **Seite hinzufügen** / **Lesezeichen hinzufügen**
3. **Name:** `BC Konfigurator`
4. **URL:** den folgenden Code komplett einfügen

```js
javascript:(function(){let s=document.createElement('script');s.src='https://animereviewer1-sketch.github.io/bc-configurator/loader.js?_='+Date.now();document.head.appendChild(s);})();
```

5. Speichern

> **Beim Einfügen aufpassen:** Der Code muss exakt so übernommen werden — kein Leerzeichen
> davor, kein `https://` ergänzen. Manche Editoren wandeln das Apostroph in `%27` um; dann
> lädt das Skript nicht. Im Zweifel den Block oben direkt über den Kopier-Button übernehmen.

### 2 — Starten

1. **Bondage Club** öffnen und einloggen
2. Auf das Lesezeichen **BC Konfigurator** klicken
3. Das Konfigurator-Fenster öffnet sich, der Status wechselt auf **● Verbunden**
4. **Laden** klicken, um den Item-Katalog aus dem laufenden Spiel zu übernehmen

> Das Bookmarklet muss nach jedem BC-Neuladen erneut geklickt werden.
> Das Konfigurator-Fenster selbst kann offen bleiben.

---

## Funktionen

### Items & Outfits

| Tab | Was es macht |
|---|---|
| **Item Manager** | Durchsucht den kompletten Item-Katalog aus dem laufenden Spiel, inklusive modularer Items. Baut Item-Codes zum direkten Ausführen. |
| **Outfit & Profile** | Outfits als Profile speichern, benennen, favorisieren und mit Screenshot ablegen. Standard-Haare als Baseline scannen. |
| **Outfit Import** | `.txt`-Dateien mit Outfit-Codes stapelweise importieren und sequenziell ausführen, mit einstellbarer Verzögerung. |

### Scanner

| Tab | Was es macht |
|---|---|
| **Craft & Curse** | Scannt alle Crafts und Curses der Personen im aktuellen Raum. Curse auf dich selbst oder eine andere Person anlegen, Outfit-Tags vergeben, Auto-Scan alle 30 s, Curse-Test der Reihe nach. |
| **LSCG Outfits** | Erfasst LSCG-Outfit-Codes der Spieler im Raum, mit Screenshot pro Outfit. |
| **MBS Wheel** | Liest die MBS-Fortune-Wheel-Itemsets der Spieler im Raum. Karten mit Bild, Favoriten je Spieler und je Outfit, Duplikaterkennung über den Outfit-Fingerprint. |
| **Locks** | Zeigt alle aktiven Locks, erlaubt Bearbeiten (Timer, Kombination, Passwort) und das Entfernen festgefahrener DOGS-Locks. |

### Bot & Wirtschaft

| Tab | Was es macht |
|---|---|
| **Bot** | Trigger-Bot mit Bedingungen, Aktionen, Szenen und Variablen. Reagiert auf Chat, Beitritte, Käufe und mehr. Siehe [BOT-DOKU.md](BOT-DOKU.md). |
| **Shop** | Kaufbare Artikel mit Preisen, Flag-Aufpreisen, Rang-Freischaltung und Kauf-Verlauf. |
| **Rang** | Rang-Definitionen, Abfrage-Befehl, Map-Keys pro Spieler (Bronze / Silver / Gold). |
| **Money** | Währungs- und Kontostände der Spieler. |
| **Spieler / Variablen / Logs** | Übersicht aller bekannten Spieler mit Rang, Money und Keys · Bot-Variablen pro Spieler · Bot-Logs. |

Trigger, Shop-Artikel und Ränge lassen sich auch per JSON schreiben und importieren —
siehe [JSON-IMPORT.md](JSON-IMPORT.md).

---

## Daten & Backup

Alle Daten liegen lokal in **IndexedDB** des Browsers, in dem der Konfigurator läuft.
Sie sind an Browser *und* Domain gebunden — ein Wechsel erfordert Export/Import.

### Sichern

**Einstellungen** (Zahnrad oben rechts) → Abschnitt **Komplett-Backup** → **⬇️ Alles**
schreibt eine JSON-Datei mit allem: Profile, Curse-Datenbank, LSCG- und Wheel-Daten,
Favoriten und Screenshots.

> **Regelmäßig sichern.** Die Wheel- und Curse-Bestände wachsen über Monate und lassen sich
> nicht nachscannen — sie entstehen nur, während die betreffenden Spieler mit dir im Raum sind.

### Wiederherstellen

**Einstellungen → Komplett-Backup → ⬆️ Restore** führt die Datei mit dem vorhandenen Bestand
zusammen. Bestehende Einträge bleiben erhalten, es wird nur ergänzt.

### Notfall-Werkzeuge

Falls die Wheel-Datenbank verloren geht, lassen sich aus den überlebenden Screenshot-Schlüsseln
die Item-Zusammensetzungen zurückholen:

| Skript | Zweck |
|---|---|
| [`wheel-rettung.js`](wheel-rettung.js) | Liest die Reste aus IndexedDB und schreibt sie in eine JSON-Datei. Verändert nichts. |
| [`wheel-import-rettung.js`](wheel-import-rettung.js) | Schreibt diese JSON als Eintrag „Wiederhergestellt" zurück ins Wheel. |

Beide werden in der Browser-Konsole (<kbd>F12</kbd>) des Konfigurators ausgeführt.
Sobald ein gerettetes Outfit später bei einem echten Spieler auftaucht — erkannt am identischen
Fingerprint — verschwindet die namenlose Kopie automatisch. Der Platzhalter löst sich mit der
Zeit von selbst auf.

---

## Hinweise

- Der Scanner erfasst nur Personen im **selben Raum**. In der Lobby wird nichts gefunden.
- LSCG-Daten erscheinen nur, wenn die Person LSCG geladen hat.
- Zum Anlegen von Items bei anderen Personen sind die entsprechenden BC-Rechte nötig.
- Das Tool überschreibt keine BC-Funktionen und löst keine BCX-Warnung aus.
- Der Craft-Cache wächst über die Zeit; alte Einträge bleiben, bis sie bewusst gelöscht werden.

---

## Projektstruktur

```
index.html                 Oberfläche, Styles, Tabs
loader.js                  Wird per Bookmarklet in BC geladen, Brücke zum Spiel
items.js                   Item-Katalog, Scanner, Curse/LSCG/Wheel-Verwaltung
bot-engine.js              Trigger-Auswertung
bot-ui.js / bot-data.js    Bot-Oberfläche und Datenhaltung
shop.js rank.js money.js   Shop-, Rang- und Money-System
outfit-import.js           Stapelimport von Outfit-Codes
bc-icons.js                Icon-Set (Stroke-Icons, ersetzt Emojis)
bc-icons-ergaenzung.js     Ergänzende Icons und Selektoren
```
