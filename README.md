# BC Konfigurator – README

Ein Browser-Tool zum Verwalten, Scannen und Anlegen von Crafts & Curses in Bondage Club.

---

## 📦 Voraussetzungen

- Einen modernen Browser (Chrome empfohlen)
- Ein Bondage Club Account
- Die `index.html` Datei (das Popup)

---

## 🔖 Schritt 1 – Bookmarklet einrichten

Das Bookmarklet lädt das Script direkt in BC. Es muss **einmalig** als Lesezeichen gespeichert werden.

1. Öffne den Browser und drücke **Strg+Shift+B** (Lesezeichenleiste einblenden)
2. Klicke mit der rechten Maustaste in die Lesezeichenleiste → **„Seite hinzufügen"** oder **„Lesezeichen hinzufügen"**
3. Als **Name** z.B. `BC Konfigurator` eintragen
4. Als **URL** folgenden Code einfügen:

```
javascript:(function(){let s=document.createElement('script');s.src='https://animereviewer1-sketch.github.io/bc-configurator/loader.js?_='+Date.now();document.head.appendChild(s);})();
```

5. Speichern

> ⚠️ Der Code muss exakt so eingefügt werden – kein Leerzeichen davor, kein `https://` ergänzen.

---

## 🚀 Schritt 2 – Verbinden

1. Öffne **Bondage Club** im Browser und betritt einen Raum (oder bleibe im Lobby)
2. Öffne die `index.html` in einem **neuen Tab oder Fenster** (nicht schließen!)
3. Klicke in BC auf das gespeicherte **Bookmarklet**
4. Klicke in der `index.html` auf **„Verbinden"**
5. Der Status wechselt zu 🟢 **Verbunden**

> 💡 Das Bookmarklet muss bei jedem BC-Seitenaufruf neu geklickt werden. Die `index.html` kann geöffnet bleiben.

---

## 🔍 Schritt 3 – Crafts & Curses scannen

1. Navigiere zum Tab **Craft & Curse**
2. Klicke auf **🔍 Scannen**
3. Alle Crafts der Personen im aktuellen Raum werden geladen

> Der Scanner erfasst nur Personen die sich **im selben Raum** befinden. Im Lobby werden keine Crafts gefunden.

---

## 💾 Caching – So funktioniert es

Das Tool speichert automatisch alle gefundenen Daten in zwei Schichten:

| Schicht | Wo | Was |
|---|---|---|
| **BC localStorage** | Im BC-Browser | Craft-Cache + LSCG-Cache – überleben Neustart |
| **Popup localStorage** | Im Popup-Browser | Gesamte DB – wiederhergestellt beim nächsten Öffnen |
| **JSON Export** | Als Datei | Alles zusammen – portierbar zwischen Browsern |

### Automatisches Caching
- Jeder Scan schreibt neue Crafts **sofort** in den lokalen Cache
- LSCG-Daten werden alle 6 Sekunden im Hintergrund aktualisiert
- Beim Verbinden werden alle gespeicherten Daten automatisch an BC übertragen

### Browser wechseln
1. In **altem Browser**: **⬇️ Export** klicken → JSON-Datei speichern
2. In **neuem Browser**: `index.html` öffnen → **⬆️ Import** → JSON-Datei laden
3. Bookmarklet klicken + Verbinden → Daten sind sofort verfügbar

---

## 👗 Curse anlegen

1. Scannen und den gewünschten Eintrag in der Liste finden
2. Auf **👤** klicken → Curse wird auf **dich selbst** angelegt
3. Auf **👥 #NUMMER** klicken → Curse wird auf die **ausgewählte Person** angelegt

> Die Person muss im selben Raum sein. Du benötigst die nötigen BC-Rechte um Items anzulegen.

---

## 📤 Export / Import

| Aktion | Wann |
|---|---|
| **⬇️ Export** | Nach dem Scannen – speichert alle Crafts + kompletten LSCG-Cache als JSON |
| **⬆️ Import** | Beim Öffnen in neuem Browser – lädt die JSON und schreibt alle Caches zurück |
| **🔄 Neu scannen** | Löscht alle gespeicherten Daten und startet frischen Scan |
| **🗑️ Leeren** | Löscht alle Daten ohne neu zu scannen |

> Beim Export (verbunden) werden automatisch die aktuellen BC-Caches abgerufen und mit eingeschlossen. Die exportierte JSON enthält immer den vollständigsten Stand.

---

## ⚠️ Hinweise

- Das Tool überschreibt **keine** BC-Funktionen (kein BCX-Warning)
- LSCG-Daten werden nur gecacht wenn die Person **LSCG geladen** hat
- Der Craft-Cache wächst über Zeit – alte Einträge bleiben erhalten bis du **Alles löschen** klickst
- `localStorage` ist **browser- und domain-gebunden** – zwischen Chrome und Firefox musst du exportieren/importieren
- Getestet mit Bondage Club **R125**