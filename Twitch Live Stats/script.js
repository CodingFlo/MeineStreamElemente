// client.js

const websocketUrl = 'ws://localhost:3000'; // Passe dies an deine Backend-Adresse an!
let ws;
let initialDataReceived = false; // Flag, um zu verfolgen, ob jemals Daten empfangen wurden

const RECONNECT_INTERVAL_MS = 10 * 1000; // 10 Sekunden in Millisekunden
let reconnectTimer = null; // Timer für den Reconnect-Countdown
let timeLeftForReconnect = 0; // Verbleibende Zeit für den Reconnect-Countdown

const elements = {
    streamStatus: document.getElementById('stream-status'),
    currentViewers: document.getElementById('current-viewers'),
    totalFollowers: document.getElementById('total-followers'),
    totalSubscribers: document.getElementById('total-subscribers'),
    streamTitle: document.getElementById('stream-title'),
    gameName: document.getElementById('game-name'),
    clipsCreated: document.getElementById('clips-created'),
    lastUpdateTime: document.getElementById('last-update-time'),
    connectionStatusDisplay: document.getElementById('connection-status-display') // Element für den Verbindungsstatus
};

/**
 * Aktualisiert das Element für den Verbindungsstatus im HTML.
 * @param {string} message - Der anzuzeigende Text.
 * @param {string} statusClass - Die CSS-Klasse ('connected', 'disconnected', 'connecting'), die den Stil bestimmt.
 */
function updateConnectionStatus(message, statusClass = '') {
    if (elements.connectionStatusDisplay) {
        elements.connectionStatusDisplay.textContent = message;
        // Entferne alle Status-Klassen und füge die neue hinzu
        elements.connectionStatusDisplay.classList.remove('connected', 'disconnected', 'connecting');
        if (statusClass) {
            elements.connectionStatusDisplay.classList.add(statusClass);
        }
    }
}

/**
 * Startet den Countdown für die Neuverbindung.
 */
function startReconnectCountdown() {
    // Falls ein alter Timer läuft, diesen zuerst stoppen
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
    }

    timeLeftForReconnect = RECONNECT_INTERVAL_MS / 1000; // Startzeit in Sekunden

    // Aktualisiere den Status sofort beim Start
    updateConnectionStatus(`Verbindung getrennt. Neuverbindung in ${timeLeftForReconnect}s...`, 'disconnected');

    reconnectTimer = setInterval(() => {
        timeLeftForReconnect--;
        if (timeLeftForReconnect > 0) {
            updateConnectionStatus(`Verbindung getrennt. Neuverbindung in ${timeLeftForReconnect}s...`, 'disconnected');
        } else {
            clearInterval(reconnectTimer); // Timer stoppen
            reconnectTimer = null;
            // Der connectWebSocket-Aufruf wird von onclose/onerror behandelt,
            // wenn der Timeout abgelaufen ist. Hier nur den Status zurücksetzen.
            updateConnectionStatus('Verbindung wird hergestellt...', 'connecting');
        }
    }, 1000); // Alle 1 Sekunde aktualisieren
}

/**
 * Setzt den Status der letzten Aktualisierung (im "Letztes Update:"-Bereich)
 * auf einen Standardwert oder auf einen Fehlerzustand.
 * @param {boolean} errorState - Wenn true, wird ein Fehlertext angezeigt.
 */
function setInitialOrErrorUpdateStatus(errorState = false) {
    if (elements.lastUpdateTime) {
        if (errorState) {
            elements.lastUpdateTime.textContent = 'Fehler beim Laden der Daten...';
            elements.lastUpdateTime.style.color = '#F44336'; // Rot für Fehler
        } else {
            elements.lastUpdateTime.textContent = 'Warte auf Daten...';
            elements.lastUpdateTime.style.color = ''; // Farbe zurücksetzen
        }
    }
}

/**
 * Stellt eine WebSocket-Verbindung zum Backend her.
 */
function connectWebSocket() {
    // Wenn ein Reconnect-Countdown läuft, diesen stoppen
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
    }

    // Setze den Initialstatus der "Letztes Update"-Zeile,
    // wenn die Verbindung versucht wird, aber noch keine Daten da sind
    if (!initialDataReceived) {
        setInitialOrErrorUpdateStatus();
    }
    // Setze den Verbindungsstatus auf "Verbindung wird hergestellt..."
    updateConnectionStatus('Verbindung wird hergestellt...', 'connecting');


    ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
        console.log('WebSocket-Verbindung erfolgreich hergestellt.');
        updateConnectionStatus('Verbunden', 'connected'); // Status auf "Verbunden" setzen

        ws.send(JSON.stringify({
            action: 'identify', // Eine Aktion, damit der Server weiß, was zu tun ist
            clientType: 'liveStats', // Der spezifische Typ dieses Clients
            app: 'c7' // Die dazugehörige App des Clients
        }));
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Nachricht vom Server erhalten:', message);

            if (message.type === 'liveStatsUpdate') {
                updateStatsDisplay(message.data);
                initialDataReceived = true; // Markiere, dass Daten empfangen wurden
                elements.lastUpdateTime.style.color = ''; // Farbe zurücksetzen, falls sie rot war
                updateConnectionStatus('Verbunden', 'connected'); // Sicherstellen, dass Status 'Verbunden' bleibt
            }
            // Hier könnten weitere Nachrichtentypen behandelt werden
        } catch (error) {
            console.error('Fehler beim Parsen der WebSocket-Nachricht:', error);
            setInitialOrErrorUpdateStatus(true); // Fehler in "Letztes Update"-Zeile anzeigen
            updateConnectionStatus('Fehler beim Empfangen von Daten', 'disconnected'); // Fehlerstatus im Verbindungsstatus anzeigen
        }
    };

    ws.onclose = (event) => {
        console.log('WebSocket-Verbindung geschlossen:', event.code, event.reason);
        // Setze den Status der "Letztes Update"-Zeile auf Fehler, wenn die Verbindung geschlossen wird
        setInitialOrErrorUpdateStatus(true);
        // Starte den Countdown für die Neuverbindung
        startReconnectCountdown();
        // Versuche, die Verbindung nach der definierten Zeit wiederherzustellen
        setTimeout(connectWebSocket, RECONNECT_INTERVAL_MS);
    };

    ws.onerror = (error) => {
        console.error('WebSocket-Fehler aufgetreten:', error);
        // Setze den Status der "Letztes Update"-Zeile auf Fehler bei einem Fehlerereignis
        setInitialOrErrorUpdateStatus(true);
        // Starte den Countdown für die Neuverbindung
        startReconnectCountdown();
        ws.close(); // Schließe die Verbindung bei einem Fehler, onclose wird dann Reconnect versuchen
    };
}

/**
 * Aktualisiert die Anzeige der Statistiken im HTML.
 * @param {object} statsData - Das Datenobjekt mit den Statistiken vom Backend.
 */
function updateStatsDisplay(statsData) {
    if (!statsData) {
        console.warn('Keine Statistikdaten zum Aktualisieren vorhanden.');
        setInitialOrErrorUpdateStatus(true); // Auch hier Fehler anzeigen, wenn keine Daten kommen
        return;
    }

    // Stream-Status
    if (elements.streamStatus) {
        elements.streamStatus.textContent = statsData.isOnline ? 'Online' : 'Offline';
        elements.streamStatus.classList.remove('online', 'offline');
        elements.streamStatus.classList.add(statsData.isOnline ? 'online' : 'offline');
    }

    // Aktuelle Zuschauer
    if (elements.currentViewers) {
        elements.currentViewers.textContent = statsData.currentViewers.toLocaleString('de-DE');
    }

    // Follower
    if (elements.totalFollowers) {
        elements.totalFollowers.textContent = statsData.totalFollowers.toLocaleString('de-DE');
    }

    // Subscriber
    if (elements.totalSubscribers) {
        elements.totalSubscribers.textContent = statsData.totalSubscribers.toLocaleString('de-DE');
    }

    // Stream-Titel
    if (elements.streamTitle) {
        elements.streamTitle.textContent = statsData.streamTitle || 'N/A';
    }

    // Spiel/Kategorie
    if (elements.gameName) {
        elements.gameName.textContent = statsData.gameName || 'N/A';
    }

    // Neue Clips
    if (elements.clipsCreated) {
        elements.clipsCreated.textContent = statsData.clipsCreated.toLocaleString('de-DE');
    }

    // Letztes Update
    if (elements.lastUpdateTime && statsData.timestamp) {
        const date = new Date(statsData.timestamp);
        elements.lastUpdateTime.textContent = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

// Starte die WebSocket-Verbindung, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    // Initialen Status für die "Letztes Update"-Zeile setzen
    setInitialOrErrorUpdateStatus();
    // Startet die Verbindung und setzt dabei auch den initialen Verbindungsstatus
    connectWebSocket();
});