# Bot-Doku – BC Universal Configurator

Kurzüberblick über den Trigger-Bot: was er ist, womit er sich verbindet und was man einstellen kann.

---

## 1. Was ist der Bot?

Ein **trigger-basierter Automatik-Bot** für Bondage Club. Du definierst Regeln nach dem Schema **WENN _Bedingung_ → DANN _Aktion_**. Zusätzlich gibt es einen **Szenen-/Story-Modus** für geführte, verzweigte Abläufe.

Der Bot läuft **im BC-Browser-Tab** (über den Loader/das Bookmarklet). Der **Configurator** (dieses Tool) ist die Bedienoberfläche: hier baust du Bots, startest sie und siehst Logs.

## 2. Verbindung & Technik

- **BC-Tab:** Der eigentliche Bot-Code wird generiert und im Spiel ausgeführt. Kommunikation zwischen Tool und Spiel läuft über `postMessage`.
- **Persistenz:** Bots, Profile, Variablen, Money, Ränge und Shop werden lokal in **IndexedDB** gespeichert (überleben Neuladen/Sessions).
- **Andere Spieler brauchen nichts zu installieren.** Interaktion läuft über Chat-Befehle (z.B. `!spin`) oder Bewegung auf Karten-Zonen.
- **Start/Sync:** Mit **▶️ Starten** wird der Bot ins Spiel geladen. Nach Änderungen **🔄 Sync** klicken.

## 3. Bot-Einstellungen (pro Bot, obere Leiste)

- **Chat / *Emote* / Whisper** – welche Nachrichtenarten der Bot „hört".
- **Nur eigene** – nur eigene Nachrichten überwachen.
- **Log** – Aktivitäts-Log mitschreiben.
- **Modus:** Nur Chat / Nur Zone / Chat + Zone.
- **📊 Dashboard** – Spieler-Profile (Punkte, Rang, Money, Besuche, letzter Besuch).
- **⬇️/⬆️** – Bot-Konfiguration exportieren/importieren.

## 4. Trigger – Aufbau

Jeder Trigger hat:

- **Name**, **Delay** (ms vor Start), **Wiederholung** (∞ / 1× / N×) und **⏳ Cooldown** (Mindestabstand pro Spieler, z.B. 3600 = 1×/Std).
- **🔑 Als Vorbedingung** – wie der Trigger als „Vortrigger" für andere zählt (global / pro Spieler).
- **🎯 Auslöser-Filter** – wer feuern darf (Alle / nur Bot / Whitelist).
- **🔎 Bedingungen** mit Verknüpfung **UND / ODER / UND NICHT** je Bedingung.
- **If/Else-Logik** – Auslöser-Bedingungen feuern, IF-Bedingungen entscheiden DANN vs. SONST.
- **⚡ Aktionen** – laufen nacheinander ab; jede mit eigenem Delay, Ziel und „bei Fehler"-Verhalten.
- **🔙 Fallback** – läuft, wenn eine Aktion den Trigger ungültig macht.

## 5. Bedingungen

| Bedingung | Funktion |
|---|---|
| 💬 **Wort/Chat** | Nachricht enthält Wort. Modus **„fehlt"** = Pflichtwort (löst aus, wenn Wort fehlt, z.B. „Master"). Filter Chat/Emote/Whisper. |
| 🗺️ **Zone Punkt** / 📐 **Zone Bereich** | Spieler steht auf Punkt/in Rechteck. Benennbar; Koordinaten per **📍 Set**-Button oder Admin-Befehl `!set`. |
| 👗 **Item trägt / trägt NICHT** | Prüft getragenes Item/Gruppe. |
| 🔗 **Vortrigger** | Ein anderer Trigger muss vorher ausgelöst haben. |
| 👋 **Spieler betritt** | Jedes Mal / erstes Mal / Rejoin. |
| 🏆 **Rang** | Genau / mind. / höchstens / kein Rang. |
| 🛒 **Shop-Kauf** | Beim Kauf eines Shop-Artikels. |
| ⏱ **Timer** | Einmalig nach X Sekunden. |
| 🔁 **Intervall** | Wiederholt alle X–Y Sekunden. |
| 🔢 **Variable** | Spieler-Variable/Punkte vergleichen (`== != > < >= <= gesetzt leer`). |
| 🎲 **Zufall** | Trifft mit X % Wahrscheinlichkeit zu. |

## 6. Aktionen

| Aktion | Funktion |
|---|---|
| 💬/✨/🤫 **Chat/Emote/Whisper** | Text senden. **🎲 Zufallszeile**: je Zeile eine Variante, eine wird zufällig gewählt. Variablen: `{name} {wort} {x} {y} {v:name}`. |
| 📦 **Item / Curse / Profil anlegen** | Einzel-Item, Curse oder ganzes Outfit. Optionen: **🛡️ Fesseln/Items behalten**, **👗 Klamotten behalten**, **🔒 immer behalten**-Liste (Dropdown, Haare automatisch), **🧩 einzeln + Reihenfolge**, **⏳ Verfall** (auto-entfernen nach X s), **AntiStrip/NoStrip**. Nach dem Anlegen läuft ein Check, der fehlende Items bis zu 3× nachlegt. |
| 🗑️ **Item entfernen** | Gruppen per **Dropdown** wählen (mehrere). |
| 🌀 **Teleport** | **Punkte** (Primär + Fallbacks) oder **Bereich** (zufälliger freier Punkt). Set-Buttons für Koordinaten. *Benötigt Raum-Admin.* |
| 💰 **Money** | +/−/setzen/zurücksetzen. |
| 🏆 **Rang** | setzen / entfernen / nächster / vorheriger. |
| 🔢 **Variable** | setzen / + / − / umschalten. |
| 💗 **Erregung/Orgasmus** | Erregung setzen/±, Orgasmus erzwingen/stoppen. *Zuverlässig auf dich selbst.* |
| 📖 **Szene starten** | Startet eine Story-Szene. |

**Aktions-Ziel:** Auslöser / Käufer (Shop) / Alle im Raum / Whitelist.

## 7. Szenen-/Story-Modus (📖)

Lineare, verzweigte Abläufe als „Drehbuch". Schritt-Typen:

- 💬 **Nachricht** (mit Pause danach)
- ⏳ **Warte**
- ❓ **Frage** – wartet auf Spieler-Antwort, verzweigt je nach Wort, mit Timeout-Ziel
- 🔢 **Variable setzen** / ❔ **Wenn** (bedingter Sprung)
- 🔀 **Sprung** / 🏁 **Ende**

Reihenfolge per ▲▼, Sprungziele aus Dropdown. **▶ Test** spielt die Szene sofort auf dir ab (Bot muss laufen).

## 8. Systeme

- **💰 Money** – Währung pro Spieler (Verdienen via Aktionen, Ausgeben im Shop).
- **🏆 Ränge** – Stufen/Level; als Bedingung und Aktion nutzbar.
- **🛒 Shop** – Spieler kaufen Items/Outfits per Befehl mit Money.
- **🔢 Variablen / Profile** – beliebige Werte pro Spieler (`punkte`, `verstoesse`, `leben`, `gefangen` …), **persistent über Sessions**. Auto-getrackt: `besuche`, `letzterBesuch`.
- **📊 Dashboard** – Übersicht aller gespeicherten Profile.

## 9. Admin-Befehle & Voraussetzungen

- **`!set <ZonenName> X` / `X1` / `X2`** – setzt eine benannte Zone auf deine aktuelle Position (Admin = der Spieler, auf dem der Configurator läuft). Alternativ die **📍 Set**-Buttons.
- **Teleport benötigt Raum-Admin** (BC blockiert sonst).
- Befehle werden nur erkannt, wenn beim Bot **„Chat"** aktiv ist.
- **Erregung/Orgasmus** wirkt zuverlässig nur auf den eigenen Charakter (BC synchronisiert nur die eigene Erregung).

## 10. Vorlagen-Baukasten (📋)

Fertige Trigger-Sets per Klick einfügen, danach Felder anpassen:

- ⚠️ Pflichtwort „Master"  ·  📈 Eskalation bei Verstößen  ·  🎁 Tägliche Belohnung (!daily)
- 🎲 Glücksrad (!spin)  ·  🔒 Gefängnis  ·  🚪 Türsteher  ·  👕 Auto-Uniform  ·  🏆 Auto-Rang nach Punkten

## 11. Tipps & Grenzen

- Nach jeder Änderung **🔄 Sync** (oder Bot neu starten).
- Viele Aktionen kurz hintereinander: BC drosselt Chat/Updates → der Bot hält automatisch kleine Abstände ein; bei sehr großen Outfits wird gewartet, bis alles sitzt.
- Zonen-Trigger, die teleportieren, können sich selbst neu auslösen (Position ändert sich) – ggf. Cooldown/Wiederholung setzen.
- In-game-abhängige Effekte (Teleport, Erregung) am besten mit offener Browser-Konsole (F12) testen; die `[Bot:…]`-Logzeilen zeigen, was passiert.
