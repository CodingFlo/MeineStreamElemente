/**
 * Globale Konfiguration für alle C7 StreamElemente.
 * Wird in den Unterordnern via <script src="../config.js"></script> geladen.
 */
const C7_CONFIG = (() => {
    // --- STANDARDEINSTELLUNGEN (Anpassen, falls Server nicht lokal läuft) ---
    const DEFAULT_SERVER_HOST = 'localhost';
    const DEFAULT_SERVER_PORT = '3000';
    const APP_CONTEXT = 'c7'; // Der Pfad-Präfix für die App (z.B. /c7 oder /bottario)

    // ------------------------------------------------------------------------

    // Logik zur Ermittlung der korrekten WebSocket-URL
    function getWebsocketUrl() {
        const protocol = window.location.protocol;
        const host = window.location.host;

        console.log('[Connection Check] Protocol:', protocol, 'Host:', host);

        // Fall 1: Wir sind im Browser und die Seite wird vom Server ausgeliefert (http/https)
        // ABER: Wenn der Host 'absolute' ist (OBS internal), dann ignoriere das und nutze Localhost defaults.
        if (protocol.startsWith('http') && host !== 'absolute') {
            const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
            return `${wsProtocol}//${host}/${APP_CONTEXT}`;
        }

        // Fall 2: Wir sind lokal geöffnet (File, OBS 'absolute', etc.)
        return `ws://${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}/${APP_CONTEXT}`;
    }

    return {
        // Konstanten (falls man sie direkt braucht)
        DEFAULT_HOST: DEFAULT_SERVER_HOST,
        DEFAULT_PORT: DEFAULT_SERVER_PORT,
        APP_CONTEXT: APP_CONTEXT,

        // Die wichtigste Funktion für alle Skripte
        getWebsocketUrl: getWebsocketUrl
    };
})();

console.log('[C7 Config] Geladen. WS URL:', C7_CONFIG.getWebsocketUrl());
