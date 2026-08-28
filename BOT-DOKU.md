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
- **⬇️/⬆️** – ganze Bot-Konfiguration als Datei exportieren/importieren.
- **{ }📥 / { }📤** – einzelne **Trigger per JSON** importieren (zum Bot hinzufügen) bzw. die Trigger des Bots als JSON exportieren (siehe Abschnitt 15).

## 4. Trigger – Aufbau

Jeder Trigger hat:

- **Name**, **Delay** (ms vor Start), **Wiederholung** (∞ / 1× / N×) und **⏳ Cooldown** (Mindestabstand pro Spieler, z.B. 3600 = 1×/Std).
- **🔑 Als Vorbedingung** – wie der Trigger als „Vortrigger" für andere zählt (global / pro Spieler).
- **🎯 Auslöser-Filter** – wer feuern darf (Alle / nur Bot / Whitelist).
- **🔎 Bedingungen** mit Verknüpfung **UND / ODER / UND NICHT** je Bedingung.
- **If/Else-Logik** – Auslöser-Bedingungen feuern, IF-Bedingungen entscheiden DANN vs. SONST.
- **⚡ Aktionen** – laufen nacheinander ab; jede mit eigenem Delay, Ziel und „bei Fehler"-Verhalten.
- **🔙 Fallback** – läuft, wenn eine Aktion den Trigger ungültig macht.

## 4a. Trigger – Wie oft, Vorrang, Klammern

### Wie oft soll er auslösen?

| Einstellung | Bedeutung |
|---|---|
| ∞ So oft wie es passt | keine Begrenzung |
| 1× Nur ein einziges Mal | insgesamt einmal |
| N× Höchstens N-mal | mit Zähler |
| 📅 Einmal pro Tag je Person | zählt ab Mitternacht neu |
| 🚪 Einmal pro Raumbesuch je Person | neu, sobald die Person den Raum verlässt und wiederkommt |

### Zwei Arten von Pause

- **Pause je Person** – Mindestabstand für jede Person einzeln.
- **Pause insgesamt** – Mindestabstand für den ganzen Trigger, egal wer auslöst.

Beide können gleichzeitig gesetzt sein; 0 heißt „keine Pause“.

### Vorrang

Passen mehrere Trigger auf dieselbe Nachricht, kommt der mit der **höheren Zahl** zuerst dran.
Gleiche Zahl = Reihenfolge wie in der Liste. Mit **🛑 danach keine weiteren** hört der Bot
nach diesem Trigger auf, weitere zu prüfen – praktisch für „erst die Sonderregel, sonst die
allgemeine“.

### Klammern in den Bedingungen

Mit **( ) Klammer** lassen sich Bedingungen gruppieren:

> **WENN** (sagt „hallo“ **oder** sagt „hi“) **und** ist gefesselt

In der Klammer wählst du, ob **eine davon genügt** (ODER) oder **alle davon nötig** sind (UND).
Mit ⤵ schiebst du eine bestehende Bedingung in die Klammer darüber, mit ⤴ wieder heraus.
Klammern dürfen ineinander stehen. Über den Bedingungen steht durchgehend der Satz in
Klartext – dort siehst du die Klammern genauso, wie der Bot sie auswertet.

Bestehende Trigger ohne Klammern bleiben unverändert.

### 🧪 Prüfen – warum feuert mein Trigger (nicht)?

Der Knopf **🧪 Prüfen** an jeder Trigger-Karte zeigt für jede Person im Raum, welche
Bedingung zutrifft und welche nicht – in ganzen Sätzen, und ohne irgendetwas auszuführen:

```
Anna #42
  ✓ ist gefesselt
  ✗ zwischen 20:00 und 23:59 Uhr
  → Löst nicht aus.
```

Trifft alles zu, steht darunter, welche Aktionen laufen würden – mit bereits eingesetzten
Platzhaltern. Der rote Knopf **▶ Jetzt wirklich auslösen** führt den Trigger dann echt aus
(Wiederholungsgrenze und Pause werden dabei übergangen).

Der Bot muss dafür **laufen** – nur dann kann er im Spiel nachsehen, wer wo steht und was er
trägt.

Zusätzlich steht ab sofort im Log **🔎 Bedingung nicht erfüllt**, wenn ein Trigger deswegen
geschwiegen hat – mit der Nummer der Bedingung, an der es lag.

### Wer darf auslösen, wen trifft die Aktion

Der **Auslöser-Filter** kennt jetzt: jeder · jeder außer dem Bot · nur der Bot · nur diese
Personen · alle außer diesen Personen · nur ab einem bestimmten Rang.

Beim **Ziel einer Aktion** kam dazu: alle außer der auslösenden Person · alle ab einem Rang ·
eine zufällige Person im Raum.

Personen wählst du aus der Liste der Anwesenden – mit Namen statt Nummern. Wer nicht im Raum
ist, bleibt trotzdem eingetragen; die Nummer lässt sich weiterhin von Hand eintippen.

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
| 🔢 **Variable** | Spieler-Variable/Punkte vergleichen (`== != > < >= <= gesetzt leer`). Wofür: Punkte-/Verstoß-Systeme, Zustände wie „gefangen". |
| 🎲 **Zufall** | Trifft mit X % Wahrscheinlichkeit zu. Wofür: Glücksspiele, zufällige Reaktionen. |
| 💗 **Erregung** | Vergleicht die Erregung (0–100 %, z.B. `≥ 99`). Wofür: Edging/Reaktionen ab Schwelle. |

## 5a. Bedingungen – Zustand, Zeit und Raum

Diese Bedingungen kamen neu dazu. In der Auswahlleiste stehen sie nach Gruppen sortiert
unter den bisherigen Knöpfen.

### Zustand

Prüft, wie jemand *dasteht* – unabhängig davon, welches Item genau dafür sorgt.
Ausgewertet werden die Effekte der getragenen Items, also dieselbe Quelle, aus der auch
der Scanner liest.

| Bedingung | Prüft |
|---|---|
| ⛓ **Gefesselt** | ist gefesselt / ist nicht gefesselt |
| 🤐 **Geknebelt** | kann nicht sprechen, mit wählbarer Mindeststufe (leicht / mittel / schwer) |
| 🙈 **Blind** | sieht nichts |
| 🦵 **Kann nicht gehen** | festgesetzt, am Boden, angeleint oder eingeschlossen |
| 📍 **Item an Slot** | trägt *irgendetwas* an einem Slot – anders als „Item trägt", das den genauen Namen braucht |
| ✏️ **Craft getragen** | trägt ein Craft mit diesem Namen – über **📦 Wählen** aus der Craft-Liste mit Suchfeld (kein Aufklappmenü, dafür sind es zu viele) |
| 🔒 **Schloss** | trägt ein Schloss; Typ leer lassen = irgendeines |

Jede dieser Bedingungen lässt sich umdrehen („ist NICHT“ / „trägt NICHT“).

### Zeit

| Bedingung | Prüft |
|---|---|
| 🕐 **Uhrzeit** | zwischen zwei Uhrzeiten. Über Mitternacht ist erlaubt: 23:00–01:00 gilt nachts |
| 📅 **Wochentag** | nur an angehakten Tagen. Kein Tag angehakt = an jedem Tag |
| 🗓 **Zeitraum** | zwischen zwei Daten. Leeres Feld = nach oben bzw. unten offen |

Die Zeit kommt vom Rechner, auf dem der Konfigurator läuft – nicht vom BC-Server.

### Raum und Werte

| Bedingung | Prüft |
|---|---|
| 👥 **Personen im Raum** | mindestens / höchstens / genau N Anwesende |
| 🏷 **Raumname** | Raum heißt genau so oder enthält den Text. Leer = jeder Raum |
| ⚖️ **Variable vs. Variable** | vergleicht zwei Variablen desselben Spielers miteinander |

### Beispiele

- *Nur abends und nur wenn gefesselt:* „Uhrzeit 20:00–02:00“ **UND** „Gefesselt: ist“
- *Freitags-Regel:* „Wochentag: Fr“ **UND** „Wort: guten abend“
- *Nur wenn niemand zusieht:* „Personen im Raum: höchstens 2“
- *Nicht sprechen können ausnutzen:* „Geknebelt: mind. mittel“ → Bot antwortet stellvertretend

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
| 🔑 **Map-Key geben/wegnehmen** | Vergibt/entzieht einen Karten-Schlüssel (🥉 Bronze / 🥈 Silver / 🥇 Gold) an das Aktions-Ziel. Wofür: Türen/Bereiche auf der Karte für bestimmte Spieler freischalten. *Benötigt Raum-Admin; erzeugt keine Raum-Meldung.* Vergebene Keys werden gespeichert und beim Rejoin automatisch neu vergeben. |
| 📖 **Szene starten** | Startet eine Story-Szene. |

**Aktions-Ziel:** Auslöser / Käufer (Shop) / Alle im Raum / Whitelist. Bestimmt, **wen** die Aktion betrifft.

## 7. Szenen-/Story-Modus (📖)

Lineare, verzweigte Abläufe als „Drehbuch". Schritt-Typen:

- 💬 **Nachricht** (mit Pause danach)
- ⏳ **Warte**
- ❓ **Frage** – wartet auf Spieler-Antwort, verzweigt je nach Wort, mit Timeout-Ziel
- 🔢 **Variable setzen** / ❔ **Wenn** (bedingter Sprung)
- 🔀 **Sprung** / 🏁 **Ende**

Reihenfolge per ▲▼, Sprungziele aus Dropdown. **▶ Test** spielt die Szene sofort auf dir ab (Bot muss laufen).

## 8. Systeme

- **💰 Money** – Währung pro Spieler (Verdienen via Aktionen, Ausgeben im Shop). Wofür: Belohnungs-/Wirtschaftssystem.
- **🏆 Ränge** – Stufen/Level pro Spieler; als Bedingung und Aktion nutzbar. **Ranggruppen** (z.B. „Pet", „Drohne") bündeln Ränge, die über `level` aufeinander aufbauen; im Rang-Tab seitlich gruppiert dargestellt. Wofür: Rollen/Progression.
- **🛒 Shop** – Spieler kaufen Items/Outfits per Befehl (`!pay "Name"`) mit Money. Artikel können **direkt im Shop** ein Item/Outfit beim Kauf anlegen (kein Trigger nötig) und per **Mindest-Rang / Ranggruppe** freigeschaltet werden (gesperrte werden bei `!shop` optional ausgeblendet). Zusätzlich **Freischaltung/Bezahlung per Variable**: „Voraussetzung" (z.B. ≥100 Gehorsamkeit, bleibt erhalten) oder „Bezahlen" (Wert wird beim Kauf abgezogen – Variable als zweite Währung). Pro Artikel ist einstellbar, ob die Sperre **unsichtbar** (Artikel wird ausgeblendet) oder **sichtbar mit Hinweis** „… benötigt" ist (Haken „unsichtbar, solange nicht freigeschaltet"). Am Ende der `!shop`-Liste zeigt der Bot die **aktuellen Stände** des Spielers (Money + die im Shop genutzten Variablen). Wofür: kaufbare Belohnungen/Strafen, gestaffelte Freischaltung.
- **🔢 Variablen / Profile** – beliebige Werte pro Spieler (`punkte`, `verstoesse`, `leben`, `gefangen` …), **persistent über Sessions**. Auto-getrackt: `besuche`, `letzterBesuch`. Wofür: Zustände, Punkte, Story-Fortschritt.
- **📊 Dashboard** – Übersicht aller gespeicherten Profile (Punkte, Rang, Money, Besuche).
- **👤 Spieler-Tab** – siehe Abschnitt 13.

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

> **Geändert:** UND / ODER / UND-NICHT wirken jetzt bei **allen** Auslösern.
> Bisher wertete nur der Chat-Weg das Verknüpfungsfeld aus; Trigger, die über
> Zone, Item, Erregung oder Beitritt feuern, verbanden ihre Bedingungen immer
> mit UND. Ein Trigger „Zone A **ODER** Zone B" konnte darum über die Zone nie
> auslösen — zwei Zonen gleichzeitig sind unmöglich. Solche Trigger feuern
> jetzt. Wenn ein Trigger plötzlich häufiger auslöst als früher, hier zuerst
> nachsehen.


- Nach jeder Änderung **🔄 Sync** (oder Bot neu starten).
- Viele Aktionen kurz hintereinander: BC drosselt Chat/Updates → der Bot hält automatisch kleine Abstände ein; bei sehr großen Outfits wird gewartet, bis alles sitzt.
- Zonen-Trigger, die teleportieren, können sich selbst neu auslösen (Position ändert sich) – ggf. Cooldown/Wiederholung setzen.
- In-game-abhängige Effekte (Teleport, Erregung, Map-Keys) am besten mit offener Browser-Konsole (F12) testen; die `[Bot:…]`-Logzeilen zeigen, was passiert.

## 12. Oberfläche & Navigation (Obertabs)

Die Tabs sind in **drei Obertabs** gruppiert – damit die vielen Funktionen übersichtlich bleiben:

- **🧩 Items** – alles rund ums Anziehen/Fesseln: *Item Manager, Outfit & Profile, Craft & Curse, LSCG Outfits, Outfit Import, Locks.* Wofür: Items/Outfits bauen und verwalten, die du dann in Trigger/Shop einsetzt.
- **🤖 Bots** – alles Bot-bezogene: *Bot, Shop, Rang, Money, Logs, Spieler, Variablen.* Wofür: Automatik, Wirtschaft, Progression und die Spieler-/Variablen-Übersicht an einem Ort.
- **⚙️ Einstellungen** – öffnet das Einstellungs-Panel (Theme, Akzentfarbe, Eck-Radius, Im-/Export von Curse- und Profildaten).

Beim Wechsel des Obertabs werden nur die passenden Untertabs angezeigt.

## 13. Spieler-Tab (Bot-Übersicht)

Zentrale Übersicht **aller bekannten Spieler** mit ihren Bot-Daten: **Name #Nummer**, **🏆 Rang** (inkl. Gruppe), **💰 Money** und den **Map-Keys** (🥉🥈🥇).

- **Wofür:** auf einen Blick sehen, wer welchen Rang/Money/Schlüssel hat – ohne einzeln nachzusehen.
- **Aktuell im Raum** stehen oben (grüner Punkt, hervorgehoben), darunter „Nicht im Raum".
- Die Liste **aktualisiert sich alle 10 Sekunden** automatisch (solange der Tab offen ist und eine Verbindung zum BC-Tab besteht).

## 14. Map-Keys (🥉 Bronze / 🥈 Silver / 🥇 Gold)

Karten-Schlüssel, mit denen BC verschlossene Bereiche/Türen auf der Map freigibt.

- **Vergeben/Entziehen** über die Aktion **🔑 Map-Key geben/wegnehmen** (Ziel = Aktions-Ziel, also auch andere Spieler).
- **Voraussetzung:** Du bist **Raum-Admin**. Es entsteht **keine** „updated the room"-Meldung (anders als beim Verändern der Karte selbst).
- **Persistenz & Rejoin:** Wer welchen Key hat, wird gespeichert. Betritt der Spieler den Raum erneut, vergibt der Bot die gespeicherten Keys automatisch neu (auch nach Neustart des Bots) – im Spieler-Tab sichtbar.

## 15. JSON-Import (Trigger / Shop / Ränge)

Du kannst Inhalte per JSON schreiben und importieren – pro Tab über den **`{ }📥`**-Button (Bot/Shop/Rang). Details und Feldreferenz: **`JSON-IMPORT.md`**.

- **Bot:** einzelne Trigger (oder mehrere) → werden zum **gewählten Bot hinzugefügt**. Ränge/Vortrigger lassen sich **per Name** referenzieren (z.B. `"rang":"Bunny"`, `"trigger":"Anmeldung"`). Kopf-Felder wie `cooldown`, `wiederholung`, `global` werden mit übernommen.
- **Shop & Rang:** ein oder mehrere Einträge → werden **zusammengeführt**; bei gleichem Namen/ID wird **pro Eintrag** gefragt, ob überschrieben wird.
- **Items/Curse/Outfits** müssen **nicht** in der JSON stehen – die stellst du danach im Tool ein (z.B. Item-Aktion `{"typ":"item"}` → konkretes Item über „📂 Wählen").
- **Export:** Trigger (`{ }📤`) bzw. Shop/Rang (`⬇️`) lassen sich als JSON exportieren – ideal als Vorlage.

## 16. Variablen-Tab (🔢)

Übersicht **aller Variablen pro Spieler** (z.B. `punkte`, `gehorsamkeit`, `verstoesse`, auto-getrackt `besuche`/`letzterBesuch`).

- **Wofür:** sehen, wie viel jemand von einer Variable hat – und Werte bei Bedarf **manuell bearbeiten** (setzen/ändern/löschen) oder neue Variablen anlegen.
- Änderungen werden gespeichert und bei **laufendem Bot sofort übernommen** (live).
- **Aktuell im Raum** stehen oben; die Liste aktualisiert sich alle 10 s.

**Uprank über Variablen** (z.B. „bei 100 Gehorsamkeit → nächster Rang") läuft über einen **Trigger**: Bedingung 🔢 *Variable* `gehorsamkeit ≥ 100` → Aktion 🏆 *Rang* `nächster`/`setzen`. Als Auslöser eignet sich z.B. ein 🔁 *Intervall* oder die Aktion, die die Variable erhöht. Den aktuellen Stand prüfst du im Variablen-Tab.
