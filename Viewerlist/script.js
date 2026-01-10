document.addEventListener('DOMContentLoaded', () => {
    // Referenzen zu den HTML-Elementen, die wir manipulieren wollen
    const vipsListEl = document.getElementById('vips-list');
    const modsListEl = document.getElementById('mods-list');
    const viewersListEl = document.getElementById('viewers-list');
    const totalCountEl = document.getElementById('total-viewers');
    const statusEl = document.getElementById('status');
    const streamStatusEl = document.getElementById('stream-status');
    // Neue Referenz für die Aktualisierungszeit
    const lastUpdatedTimeEl = document.getElementById('last-updated-time');

    /**
     * Stellt die Verbindung zum WebSocket-Server her.
     */
    function connectWebSocket() {
        const ws = new WebSocket(C7_CONFIG.getWebsocketUrl());
        ws.onopen = () => {
            console.log('WebSocket-Verbindung erfolgreich hergestellt.');
            statusEl.textContent = 'Verbunden';
            statusEl.style.color = '#2ecc71';

            ws.send(JSON.stringify({
                action: 'identify', // Eine Aktion, damit der Server weiß, was zu tun ist
                clientType: 'viewerLists', // Der spezifische Typ dieses Clients
                app: 'c7' // Die dazugehörige App des Clients
            }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.category === 'viewerList') {
                    handleStreamStatus(message.data.streamIsOnline);
                    updateViewerDisplay(message.data.viewerLists, message.data.totalViewers);
                    // Aktualisiere die Zeit der letzten Datenaktualisierung
                    const now = new Date();
                    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    lastUpdatedTimeEl.textContent = formattedTime;
                }
            } catch (error) {
                console.error('Fehler beim Verarbeiten der Nachricht:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket-Fehler:', error);
            statusEl.textContent = 'Fehler';
            statusEl.style.color = '#e74c3c';
        };

        ws.onclose = () => {
            console.log('WebSocket-Verbindung geschlossen. Versuche in 5 Sekunden erneut...');
            statusEl.textContent = 'Getrennt - Verbinde neu...';
            statusEl.style.color = '#f39c12';
            setTimeout(connectWebSocket, 5000);
        };
    }

    /**
     * Verarbeitet den Stream-Status und aktualisiert die Anzeige.
     */
    function handleStreamStatus(isOnline) {
        if (isOnline) {
            streamStatusEl.textContent = 'ONLINE';
            streamStatusEl.style.color = '#2ecc71';
        } else {
            streamStatusEl.textContent = 'OFFLINE';
            streamStatusEl.style.color = '#e74c3c';
        }
    }

    /**
     * Aktualisiert die HTML-Listen mit den neuen Daten vom Server.
     * Beachtet die neue Datenstruktur aus der Datenbank.
     */
    function updateViewerDisplay(viewerLists, totalViewers) {
        totalCountEl.textContent = totalViewers || 0;

        vipsListEl.innerHTML = '';
        modsListEl.innerHTML = '';
        viewersListEl.innerHTML = '';

        const populateList = (element, names) => {
            if (names && names.length > 0) {
                names.forEach(name => {
                    const li = document.createElement('li');
                    li.textContent = name;
                    element.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.style.opacity = '0.5';
                li.textContent = 'Keine';
                element.appendChild(li);
            }
        };

        populateList(vipsListEl, viewerLists.vips);
        populateList(modsListEl, viewerLists.moderators);
        populateList(viewersListEl, viewerLists.viewers);
    }

    connectWebSocket();
});
