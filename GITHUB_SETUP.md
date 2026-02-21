# GitHub Pages Setup - Schritt für Schritt

## 1. Repository erstellen

1. Gehe zu GitHub.com und melde dich an
2. Klicke auf das "+" Symbol oben rechts → "New repository"
3. Repository-Name: `bc-universal-configurator` (oder einen anderen Namen)
4. Setze auf "Public" (wichtig für GitHub Pages)
5. Klicke "Create repository"

## 2. Dateien hochladen

### Via Web-Interface (einfach):

1. Im Repository, klicke "Add file" → "Upload files"
2. Ziehe diese Dateien hinein:
   - `bc-universal-bookmarklet.js` (das Hauptscript)
   - `index.html` (die Installations-Seite)
   - `README.md` (die Dokumentation)
   - `bookmarklet.txt` (manuelle Installation)
3. Klicke "Commit changes"

### Via Git (fortgeschritten):

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/bc-universal-configurator.git
cd bc-universal-configurator

# Dateien kopieren
# (Kopiere alle 4 Dateien in diesen Ordner)

# Commit und Push
git add .
git commit -m "Initial commit - BC Universal Configurator v13"
git push origin main
```

## 3. GitHub Pages aktivieren

1. Gehe zu deinem Repository auf GitHub
2. Klicke auf "Settings" (Zahnrad-Symbol)
3. Scrolle zu "Pages" im linken Menü
4. Bei "Source": Wähle "main" branch
5. Klicke "Save"
6. Warte 1-2 Minuten - GitHub Pages wird aktiviert

## 4. URLs anpassen

Jetzt musst du die URLs in den Dateien anpassen:

### In `index.html`:

Suche nach:
```html
s.src='https://RAW.GITHUBUSERCONTENT.COM/DEIN-USERNAME/bc-universal-configurator/main/bc-universal-bookmarklet.js'
```

Ersetze durch:
```html
s.src='https://raw.githubusercontent.com/IHR-USERNAME/bc-universal-configurator/main/bc-universal-bookmarklet.js'
```

Und ersetze auch:
```html
<a href="https://github.com/DEIN-USERNAME/bc-universal-configurator"
```

Mit deinem echten GitHub-Username!

### In `bookmarklet.txt`:

Ersetze `DEIN-USERNAME` mit deinem GitHub-Username.

### Änderungen speichern:

1. Klicke auf die Datei in GitHub
2. Klicke auf das Stift-Symbol ("Edit")
3. Mache die Änderungen
4. Klicke "Commit changes"

## 5. Testen

1. Öffne: `https://DEIN-USERNAME.github.io/bc-universal-configurator/`
2. Du solltest die Installations-Seite sehen
3. Ziehe den Bookmarklet-Button in deine Lesezeichen-Leiste
4. Öffne Bondage Club
5. Klicke das Bookmarklet
6. Der Konfigurator sollte sich öffnen!

## 6. Fehlerbehebung

### "404 Not Found" beim Öffnen der Seite:
- Warte 5-10 Minuten - GitHub Pages braucht Zeit
- Überprüfe ob GitHub Pages aktiviert ist (Settings → Pages)
- Stelle sicher, dass das Repository "Public" ist

### Bookmarklet lädt nicht:
- Öffne die Browser-Konsole (F12)
- Schau nach Fehler-Meldungen
- Überprüfe ob die Raw-URL korrekt ist:
  - Öffne `bc-universal-bookmarklet.js` auf GitHub
  - Klicke "Raw"
  - Kopiere diese URL und nutze sie im Bookmarklet

### Script funktioniert nicht:
- Stelle sicher, dass du in Bondage Club bist
- Erlaube Popups für die BC-Domain
- Überprüfe die Browser-Konsole auf Fehler

## 7. Updates hochladen

Wenn du Änderungen am Script machst:

1. Gehe zur Datei auf GitHub
2. Klicke das Stift-Symbol
3. Mache deine Änderungen
4. Klicke "Commit changes"
5. Die Änderungen sind sofort verfügbar (Cache kann 1-2 Minuten dauern)

## Tipps

- **Raw URL verwenden**: Verwende immer die Raw-URL für das Script (raw.githubusercontent.com)
- **Cache**: Browser cachen manchmal die .js Datei - bei Problemen Shift+F5 drücken
- **Testen**: Teste auf verschiedenen Browsern (Chrome, Firefox, Edge)
- **Backup**: GitHub speichert alle Versionen - du kannst jederzeit zurückgehen

## Alternative: jsDelivr CDN

Für bessere Performance kannst du statt der Raw-URL auch jsDelivr verwenden:

```javascript
s.src='https://cdn.jsdelivr.net/gh/DEIN-USERNAME/bc-universal-configurator@main/bc-universal-bookmarklet.js'
```

Vorteile:
- ✅ Schnellerer CDN
- ✅ Besseres Caching
- ✅ Höhere Verfügbarkeit

---

**Bei Fragen: Öffne ein Issue auf GitHub!**
