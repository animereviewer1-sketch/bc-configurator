# BC Universal Configurator Bookmarklet v13

Ein leistungsstarkes Bookmarklet für Bondage Club, das Item-Konfiguration und Outfit-Erstellung mit direkter Code-Ausführung ermöglicht.

## ✨ Features

- 🎯 **Automatische Spieler-Erkennung**: Findet alle Spieler im aktuellen Raum
- ⚡ **Direkte Code-Ausführung**: Kein Kopieren/Einfügen mehr nötig
- 👥 **Zielauswahl**: Wende Items auf dich selbst oder andere Spieler an
- 🎨 **Vollständige Item-Konfiguration**: Farben, Module, Optionen, Schlösser
- 📦 **Outfit-Management**: Erstelle komplexe Outfits mit mehreren Items
- 🪟 **Separates Fenster**: Übersichtliche UI in eigenem Fenster

## 📦 Installation

### Methode 1: GitHub Pages (Empfohlen)

1. Besuche: `https://DEIN-GITHUB-USERNAME.github.io/bc-universal-configurator/`
2. Ziehe den Bookmarklet-Button in deine Lesezeichen-Leiste
3. Fertig!

### Methode 2: Manuelle Installation

1. Erstelle ein neues Lesezeichen in deinem Browser
2. Kopiere den Inhalt aus `bookmarklet.txt`
3. Füge es als URL des Lesezeichens ein
4. Speichern!

## 🚀 Verwendung

1. Öffne Bondage Club und gehe in einen Raum
2. Klicke auf das Bookmarklet in deiner Lesezeichen-Leiste
3. Ein neues Fenster öffnet sich mit dem Konfigurator
4. Wähle ein Ziel (Spieler im Raum)
5. Wähle Items aus der Sidebar
6. Konfiguriere und füge sie zum Outfit hinzu
7. Klicke auf "Code generieren & ausführen"
8. Der Code wird automatisch im Spiel ausgeführt!

## 🎯 Funktionen im Detail

### Zielauswahl
- **Du**: Wendet Items auf deinen eigenen Charakter an
- **Andere Spieler**: Wendet Items auf andere Spieler im Raum an (wenn erlaubt)
- **Automatische Erkennung**: Spieler werden automatisch aus dem Raum geladen
- **Aktualisieren**: Klicke auf "🔄 Aktualisieren" um die Spielerliste zu erneuern

### Item-Konfiguration
- **Archetype-Unterstützung**: Modular, Vibrating, Classic
- **Farbauswahl**: Mehrschichtige Farbkonfiguration
- **Module & Optionen**: Vollständige Konfiguration aller Item-Eigenschaften
- **Schlösser**: Verschiedene Schlosstypen mit Parametern

### Outfit-Erstellung
- **Multi-Target**: Ein Outfit kann Items für mehrere Spieler enthalten
- **Übersichtlich**: Zeigt Ziel für jedes Item an
- **Bearbeiten**: Items können jederzeit entfernt werden
- **Direkte Ausführung**: Kein manuelles Kopieren mehr nötig

## 🔧 Technische Details

- **Cache-Generierung**: Scannt alle BC Items beim Start (~500KB Cache)
- **Popup-Kommunikation**: Verwendet `postMessage` für sichere Kommunikation
- **Code-Ausführung**: Führt Code im BC-Kontext aus (eval in BC-Fenster)
- **Spieler-API**: Greift auf `ChatRoomCharacter` zu

## ⚠️ Wichtige Hinweise

1. **Popup-Blocker**: Stelle sicher, dass Popups für BC erlaubt sind
2. **Berechtigungen**: Du kannst nur auf Spieler zugreifen, die dir Berechtigungen gegeben haben
3. **Sicherheit**: Der Code wird in deinem eigenen BC-Kontext ausgeführt
4. **Updates**: Cache wird bei jedem Start neu generiert

## 🐛 Fehlerbehebung

**Popup öffnet sich nicht:**
- Überprüfe Popup-Blocker-Einstellungen
- Erlaube Popups für die BC-Domain

**Spieler werden nicht gefunden:**
- Stelle sicher, dass du in einem Raum bist
- Klicke auf "🔄 Aktualisieren"
- Lade BC neu falls nötig

**Code wird nicht ausgeführt:**
- Überprüfe die Browser-Konsole (F12) auf Fehler
- Stelle sicher, dass BC vollständig geladen ist
- Versuche es mit einem einfacheren Outfit

**Items erscheinen nicht:**
- Überprüfe deine Berechtigungen für den Zielspieler
- Stelle sicher, dass die Items für den Body-Typ verfügbar sind
- Prüfe ob Items durch andere Items blockiert werden

## 📝 Changelog

### v13 (2024)
- ✅ Kombiniert Dump-Script + UI
- ✅ Automatische Spieler-Erkennung
- ✅ Direkte Code-Ausführung
- ✅ Zielauswahl bei jedem Item
- ✅ Separates Konfigurator-Fenster
- ✅ Echtzeit-Kommunikation zwischen Fenstern

### v12
- Outfit-Profile
- Verbesserte Farbauswahl
- LSCG-Unterstützung

### v11
- Vollständiger Cache mit allen Item-Eigenschaften
- Modular/Vibrating/Classic Archetype-Unterstützung

## 📄 Lizenz

Dieses Projekt ist Open Source. Nutze es frei für deine Zwecke.

## 🤝 Beitragen

Gefunden einen Bug? Hast eine Idee für ein Feature?
- Öffne ein Issue auf GitHub
- Erstelle einen Pull Request
- Teile deine Erfahrungen!

## ⚡ Support

Bei Fragen oder Problemen:
1. Überprüfe die Fehlerbehebung oben
2. Schau in die Browser-Konsole (F12)
3. Öffne ein Issue auf GitHub mit Details:
   - Browser & Version
   - Fehlermeldung
   - Schritte zum Reproduzieren

---

**Viel Spaß beim Konfigurieren! 🎮**
