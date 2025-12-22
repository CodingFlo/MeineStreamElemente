# Controller View

Eine animierte Visualisierung für Controller-Eingaben mit Backend und Frontend.

## 🎮 Features

- **Echtzeit Controller-Erkennung**: Erkennt automatisch angeschlossene Controller
- **Animierte Visualisierung**: 
  - Runde Buttons für Action-Buttons (A, B, X, Y)
  - Realistische Joysticks mit Bewegungsanimation
  - D-Pad (Steuerkreuz) mit Druckanimation
  - Schultertasten (LB, RB, LT, RT)
- **WebSocket-Kommunikation**: Niedrige Latenz zwischen Backend und Frontend
- **Modernes Design**: Glassmorphismus, Gradients und Glow-Effekte

## 📁 Struktur

```
ControllerView/
├── Backend/
│   ├── server.js       # Node.js Server mit Gamepad-Erkennung
│   └── package.json    # Dependencies
└── Frontend/
    ├── index.html      # HTML-Struktur
    ├── style.css       # Styling und Animationen
    └── app.js          # WebSocket-Client und Visualisierung
```

## 🚀 Installation

### Backend

1. Navigiere zum Backend-Ordner:
```bash
cd Backend
```

2. Installiere die Dependencies:
```bash
npm install
```

3. Starte den Server:
```bash
npm start
```

Der Server läuft auf `http://localhost:3000`

### Frontend

Das Frontend wird automatisch vom Backend-Server bereitgestellt.
Öffne einfach `http://localhost:3000` in deinem Browser.

## 🎯 Verwendung

1. Schließe einen Controller (Xbox, PlayStation, etc.) an deinen Computer an
2. Starte den Backend-Server
3. Öffne `http://localhost:3000` im Browser
4. Die Controller-Eingaben werden in Echtzeit visualisiert

## 🔧 Technologien

### Backend
- **Node.js**: Runtime-Umgebung
- **Express**: Web-Server
- **Socket.IO**: WebSocket-Kommunikation
- **Gamepad**: Controller-Erkennung für Node.js

### Frontend
- **HTML5**: Struktur
- **CSS3**: Styling mit modernen Features
- **Vanilla JavaScript**: Logik und Animationen
- **Socket.IO Client**: WebSocket-Verbindung

## 🎨 Button-Mapping

Standard-Gamepad-Layout (Xbox-Style):

- **0**: A (Grün)
- **1**: B (Rot)
- **2**: X (Blau)
- **3**: Y (Gelb)
- **4**: LB (Linke Schultertaste)
- **5**: RB (Rechte Schultertaste)
- **6**: LT (Linker Trigger)
- **7**: RT (Rechter Trigger)
- **8**: SELECT/BACK
- **9**: START
- **10**: L3 (Linker Stick-Button)
- **11**: R3 (Rechter Stick-Button)
- **12**: D-Pad Oben
- **13**: D-Pad Unten
- **14**: D-Pad Links
- **15**: D-Pad Rechts

### Achsen
- **0**: Linker Stick X-Achse
- **1**: Linker Stick Y-Achse
- **2**: Rechter Stick X-Achse
- **3**: Rechter Stick Y-Achse

## 💡 Anpassungen

### Farben ändern
Bearbeite die CSS-Variablen in `Frontend/style.css`:

```css
:root {
    --accent-primary: #6c5ce7;
    --accent-green: #00f5a0;
    --accent-red: #ff6b6b;
    /* ... weitere Farben */
}
```

### Port ändern
Ändere den Port in `Backend/server.js`:

```javascript
const PORT = 3000; // Ändere zu deinem gewünschten Port
```

Vergiss nicht, auch die URL im Frontend (`Frontend/app.js`) anzupassen:

```javascript
const socket = io('http://localhost:3000'); // Neuer Port
```

## 🐛 Troubleshooting

**Controller wird nicht erkannt:**
- Stelle sicher, dass der Controller richtig angeschlossen ist
- Teste den Controller in den Systemeinstellungen
- Starte den Server neu

**Verbindungsprobleme:**
- Prüfe ob der Backend-Server läuft
- Überprüfe die Browser-Konsole auf Fehler
- Stelle sicher, dass Port 3000 nicht blockiert ist

**Keine Animationen:**
- Aktualisiere den Browser (Strg+F5)
- Prüfe ob JavaScript aktiviert ist
- Öffne die Browser-Konsole für Fehlermeldungen

## 📝 Lizenz

Frei verwendbar für Stream-Overlays und persönliche Projekte.
