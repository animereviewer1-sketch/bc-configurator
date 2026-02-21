# BC Konfigurator

Ein Bondage Club Outfit-Konfigurator als GitHub Pages App.
Wird per Bookmarklet gestartet und kommuniziert direkt mit dem Spiel.

## Setup

### 1. GitHub Pages aktivieren
1. Dieses Repository forken oder neu erstellen
2. `loader.js` öffnen → `GITHUB_USERNAME` durch deinen GitHub-Benutzernamen ersetzen
3. Settings → Pages → Branch: `main` / `root`
4. Warten bis Pages aktiv ist (`https://DEINNAME.github.io/bc-konfigurator/`)

### 2. Bookmarklet erstellen
Ersetze `GITHUB_USERNAME` in der URL unten, dann als Browser-Lesezeichen speichern:

```
javascript:(function(){let s=document.createElement('script');s.src='https://GITHUB_USERNAME.github.io/bc-konfigurator/loader.js?_='+Date.now();document.head.appendChild(s);})();
```

**Tipp:** Den Code oben in die Adressleiste eines neuen Lesezeichens einfügen (kein `http://` davor).

### 3. Verwenden
1. Bondage Club öffnen und einloggen
2. Bookmarklet klicken → Popup öffnet sich
3. **„⚡ Aus Spiel laden"** klicken → alle Items werden direkt aus dem Spiel gelesen
4. Item auswählen, konfigurieren
5. **„▶ Direkt ausführen"** → Befehl wird sofort im Spiel ausgeführt

## Funktionen

- 🔗 **Direkte BC-Integration** – kein Kopieren/Einfügen nötig
- ⚡ **Live-Ausführung** – Befehle werden direkt ins Spiel geschickt
- 🧩 **Modular Archetype** – ModularChastityBelt, FuturisticPanelGag etc.
- 🔊 **Vibrating Archetype** – VibratingEgg, FuturisticVibrator etc.
- 🎛️ **Classic Options** – BallGag, HarnessBallGag etc.
- 🎨 **Farb-Editor** – echte Asset-Farben oder eigene Wahl
- 🔒 **Alle Schlösser** inkl. Timer, Kombi, Passwort, BCX
- 👗 **Outfit Builder** – mehrere Items auf einmal anlegen
- 📁 **Profile** – Outfits speichern und laden

## Datenschutz

Alle Daten bleiben lokal (localStorage). Es werden keine Daten an externe Server gesendet.
Die Kommunikation erfolgt ausschließlich via `window.postMessage` zwischen BC-Tab und Popup.
