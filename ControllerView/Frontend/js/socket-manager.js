import { CONFIG } from './config.js';

export class SocketManager {
    constructor() {
        this.socket = io(CONFIG.BACKEND_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        this.setupStandardEvents();
    }

    setupStandardEvents() {
        this.socket.on('connect', () => {
            console.log('%c✅ Mit Backend verbunden', 'color: #00ff00; font-weight: bold');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('%c❌ Verbindung verloren:', 'color: #ff0000', reason);
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log(`Versuche Wiederverbindung... (Versuch ${attempt})`);
        });
    }

    // Methode zum Senden von Controller-Daten
    emitInput(type, index, value, controllerId) {
        this.socket.emit('controller-input', {
            type: type,
            button: type === 'button' ? index : undefined,
            axis: type === 'axis' ? index : undefined,
            value: value,
            controllerId: controllerId
        });
    }

    // Methode zum Senden des Status (Connect/Disconnect des Gamepads)
    emitStatus(isConnected, controllerId, name = '') {
        this.socket.emit('controller-status', {
            connected: isConnected,
            controllerId: controllerId,
            name: name
        });
    }

    // Callback-Registrierung für eingehende Daten von anderen Clients
    onRemoteInput(callback) {
        this.socket.on('controller-input', (data) => {
            callback(data);
        });
    }
}