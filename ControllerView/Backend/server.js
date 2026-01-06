const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const processManager = require('./process-manager');
const virtualPad = require('./virtual-pad');
const gamepadProvider = require('./gamepad-provider');

const PORT = 3001;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// 1. Initialisierungen
virtualPad.init();

// 2. Hardware-Reader starten (Daten kommen vom Backend, nicht vom Browser!)
gamepadProvider.start((data) => {
    // Sende Daten an das OBS-Frontend
    io.emit('controller-input', data);
    // Optional: Weitergabe an virtuellen Controller
    virtualPad.forward(data);
});

// 3. Webserver Setup
app.use(express.static(path.join(__dirname, '../Frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../Frontend/index.html')));

io.on('connection', (socket) => {
    console.log('OBS Client verbunden');
    // Falls ein Browser-Fenster doch senden will (als Fallback)
    socket.on('controller-input', (data) => {
        socket.broadcast.emit('controller-input', data);
        virtualPad.forward(data);
    });
});

// 4. Shutdown handling
const shutdown = () => {
    processManager.killAllChildren();
    process.exit();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
    console.log(`🎮 Controller View Server läuft!`);
    console.log(`📡 Öffne http://localhost:${PORT} im Browser`);
    console.log(`🎯 Schließe einen Controller an und drücke beliebige Tasten`);
});