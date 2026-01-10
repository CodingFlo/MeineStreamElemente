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
        // Fall 1: Wir sind im Browser und die Seite wird vom Server ausgeliefert (http/https)
        if (window.location.protocol.startsWith('http')) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host; // Enthält Hostname und Port
            return `${protocol}//${host}/${APP_CONTEXT}`;
        }

        // Fall 2: Wir sind lokal geöffnet (z.B. OBS Browser Source als "Local File" oder file://)
        // Hier greifen wir auf die Standardeinstellungen zurück.
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
