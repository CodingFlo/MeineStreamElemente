const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// Statische Dateien aus dem Frontend-Ordner bereitstellen
app.use(express.static(path.join(__dirname, '../Frontend')));

// Root-Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// WebSocket-Verbindung
io.on('connection', (socket) => {
    console.log('Client verbunden');

    // Empfange Controller-Daten vom Client (Browser nutzt Gamepad API)
    socket.on('controller-input', (data) => {
        // Broadcast an alle anderen Clients (falls mehrere Viewer)
        socket.broadcast.emit('controller-input', data);
    });

    socket.on('controller-status', (data) => {
        console.log('Controller Status:', data);
        socket.broadcast.emit('controller-status', data);
    });

    socket.on('disconnect', () => {
        console.log('Client getrennt');
    });
});

server.listen(PORT, () => {
    console.log(`🎮 Controller View Server läuft!`);
    console.log(`📡 Öffne http://localhost:${PORT} im Browser`);
    console.log(`🎯 Schließe einen Controller an und drücke beliebige Tasten`);
});
