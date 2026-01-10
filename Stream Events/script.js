// frontend/script.js
const DEBUG = true;

document.addEventListener('DOMContentLoaded', () => {
    const alertList = document.getElementById('alert-list');
    const MAX_STORED_ALERTS = 50;
    const LOCAL_STORAGE_KEY = 'twitchAlertsHistory';

    // Referenzen zu den neuen UI-Elementen
    const connectionStatusDisplay = document.getElementById('connection-status-display');
    const muteButton = document.getElementById('mute-Button');
    const fullMuteButton = document.getElementById('full-mute-button');

    // Setze die WebSocket-URL über die globale Config
    const websocketUrl = C7_CONFIG.getWebsocketUrl();

    let ws;
    let firstAlertReceived = false;

    const followerCooldowns = {};
    const FOLLOW_COOLDOWN_MS = 10 * 60 * 1000;

    const RECONNECT_INTERVAL_MS = 10 * 1000;

    // const CONNECTION_STATUS_MESSAGE_ID = 'connection-status-message'; // Nicht mehr benötigt als LI-ID
    let reconnectTimer = null;

    // Cache für geladene Icons (jetzt für <img> Elemente)
    const svgIconCache = {}; // Umbenannt, da es nicht mehr nur SVGs im DOM sind

    const isRealBrowser = !(
        window.obsstudio ||
        navigator.userAgent.includes("OBS")
    );

    // Test-Events nur im echten Browser hinzufügen
    if (isRealBrowser) {
        addTestAlerts();
    }

    function addTestAlerts() {
        const testAlerts = [
            {
                type: "raid",
                from_broadcaster_name: "oneman133708",
                viewers: 3,
                timestamp: new Date().toISOString()
            },
            {
                type: "follow",
                username: "boccithiefishy",
                timestamp: new Date().toISOString()
            },
            {
                type: "follow",
                username: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                timestamp: new Date().toISOString()
            }
        ];

        testAlerts.forEach(alert => {
            addAlertToDisplay(alert); // <- deine bestehende Funktion
        });
    }

    async function loadIcon(iconName) {
        if (svgIconCache[iconName]) {
            return svgIconCache[iconName].cloneNode(true);
        }
        try {
            const svgSourceElement = document.getElementById(`${iconName}SVG`);
            if (!svgSourceElement) {
                throw new Error(`SVG element with ID "${iconName}SVG" not found in DOM.`);
            }

            const svgElement = svgSourceElement.cloneNode(true);
            svgElement.style.display = '';
            svgElement.classList.add('icon-svg');
            svgElement.setAttribute('width', '16');
            svgElement.setAttribute('height', '16');

            svgIconCache[iconName] = svgElement;
            return svgElement.cloneNode(true);
        } catch (error) {
            console.error(`Error loading SVG icon "${iconName}":`, error);
            const fallbackDiv = document.createElement('div');
            fallbackDiv.textContent = `[${iconName}]`;
            return fallbackDiv;
        }
    }

    // Lade Icons für die neuen Buttons
    loadIcon('muteIcon').then(icon => muteButton.appendChild(icon));
    loadIcon('fullMuteIcon').then(icon => fullMuteButton.appendChild(icon));


    function showNoAlertsMessage() {
        // Diese Funktion ist nun hauptsächlich dafür da, eine initiale Nachricht anzuzeigen,
        // falls keine Alerts und keine Statusnachricht im alertList sind.
        // Der Verbindungsstatus hat jetzt seinen eigenen festen Platz.
        if (alertList.querySelectorAll('.alert-item').length === 0 && !document.getElementById('initial-no-alerts-message')) {
            const messageItem = document.createElement('li');
            messageItem.textContent = 'Noch keine Alerts empfangen. Warte auf eingehende Daten...';
            messageItem.id = 'initial-no-alerts-message';
            // alertList.innerHTML = ''; // Entferne diese Zeile, um den Status-Text nicht zu überschreiben
            alertList.appendChild(messageItem);
        }
    }

    //  Verbindungsstatus in der neuen Leiste anzeigen
    function displayConnectionStatus(messageText, isDisconnected = false) {
        connectionStatusDisplay.textContent = messageText;
        if (isDisconnected) {
            connectionStatusDisplay.classList.add('disconnected');
        } else {
            connectionStatusDisplay.classList.remove('disconnected');
        }

        const initialMessage = document.getElementById('initial-no-alerts-message');
        if (initialMessage) {
            initialMessage.remove(); // Entferne die initiale "Warte auf Alerts..." Nachricht, wenn Status gesetzt wird
        }
    }

    // Verbindungsstatus-Text leeren (oder Standardtext setzen)
    function removeConnectionStatus() {
        connectionStatusDisplay.textContent = 'Verbunden'; // Oder leer lassen
        connectionStatusDisplay.classList.remove('disconnected');
    }

    function startReconnectCountdown() {
        let timeLeft = RECONNECT_INTERVAL_MS / 1000;

        displayConnectionStatus(`Verbindung getrennt. Neuverbindung in ${timeLeft}s...`, true); // true für disconnected-Stil

        if (reconnectTimer) {
            clearInterval(reconnectTimer);
        }

        reconnectTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                displayConnectionStatus(`Verbindung getrennt. Neuverbindung in ${timeLeft}s...`, true);
            } else {
                clearInterval(reconnectTimer);
                reconnectTimer = null;
                connectWebSocket();
            }
        }, 1000);
    }

    function loadAlertsFromLocalStorage() {
        try {
            const storedAlerts = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedAlerts) {
                const alerts = JSON.parse(storedAlerts);
                if (alerts.length > 0) {
                    firstAlertReceived = true;
                    alertList.innerHTML = ''; // Leere die Liste nur hier, nicht im showNoAlertsMessage
                    alerts.slice().reverse().forEach(alertData => {
                        addAlertToDisplay(alertData, false);
                    });
                } else {
                    showNoAlertsMessage();
                }
            } else {
                showNoAlertsMessage();
            }
        } catch (error) {
            console.error('Fehler beim Laden der Alerts aus dem localStorage:', error);
            showNoAlertsMessage();
        }
    }

    function saveAlertToLocalStorage(alertData) {
        try {
            let alerts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
            alerts.unshift(alertData);
            if (alerts.length > MAX_STORED_ALERTS) {
                alerts = alerts.slice(0, MAX_STORED_ALERTS);
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alerts));
        } catch (error) {
            console.error('Fehler beim Speichern des Alerts im localStorage:', error);
        }
    }

    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }

        if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
        }

        displayConnectionStatus('Verbindung wird hergestellt...');
        ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
            console.log('WebSocket-Verbindung hergestellt. Warte auf Alerts...');
            removeConnectionStatus(); // Setzt den Status auf "Verbunden" oder leer
            reconnectAttempts = 0;
            // Falls nach dem Laden der Alerts immer noch keine da sind
            if (!firstAlertReceived && alertList.querySelectorAll('.alert-item').length === 0) {
                showNoAlertsMessage();
            }

            ws.send(JSON.stringify({
                action: 'identify', // Eine Aktion, damit der Server weiß, was zu tun ist
                clientType: 'alert', // Der spezifische Typ dieses Clients
                app: 'c7' // Die dazugehörige App des Clients
            }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Nachricht vom Server empfangen:', message);

                if (message.realert) {
                    console.log('Empfange Re-Alert. Wird nicht im LocalStorage gespeichert.');
                    return;
                }

                if (message.type === 'alert' && message.data) {
                    if (message.data.type === 'follow') {
                        const username = message.data.username;
                        const currentTime = Date.now();

                        if (followerCooldowns[username] && (currentTime - followerCooldowns[username] < FOLLOW_COOLDOWN_MS)) {
                            console.log(`Follow-Alert von ${username} ignoriert wegen Cooldown.`);
                            return;
                        } else {
                            followerCooldowns[username] = currentTime;
                        }
                    }

                    // Entferne die initiale Nachricht, wenn der erste echte Alert kommt
                    if (!firstAlertReceived) {
                        const initialMessage = document.getElementById('initial-no-alerts-message');
                        if (initialMessage) {
                            initialMessage.remove();
                        }
                        firstAlertReceived = true;
                    }
                    // `save` ist `false`, wenn es ein Re-Alert ist, basierend auf dem `realert`-Flag
                    addAlertToDisplay(message.data, !message.realert);
                } else {
                    console.log('Unbekannter oder unbehandelter Nachrichtentyp vom Server:', message.type);
                }
            } catch (error) {
                console.error('Fehler beim Parsen der WebSocket-Nachricht:', error);
            }
        };

        ws.onclose = () => {
            console.warn(`WebSocket-Verbindung getrennt. Versuche Reconnect in ${RECONNECT_INTERVAL_MS / 1000} Sekunden...`);
            firstAlertReceived = false;
            startReconnectCountdown();
        };

        ws.onerror = (error) => {
            console.error('WebSocket-Fehler:', error);
            if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                console.log("WebSocket ist bereits geschlossen oder wird geschlossen, Reconnect wird über onclose gehandhabt.");
            } else {
                console.warn(`WebSocket-Fehler. Versuche Reconnect in ${RECONNECT_INTERVAL_MS / 1000} Sekunden...`);
                startReconnectCountdown();
                ws.close();
            }
        };
    }

    // Funktion zum Hinzufügen eines Alerts zur Anzeige in der Liste
    function addAlertToDisplay(alertData, save = true) {
        const listItem = document.createElement('li');
        const eventDate = alertData.timestamp ? new Date(alertData.timestamp) : new Date();

        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const displayDate = eventDate.toLocaleDateString('de-DE', dateOptions);

        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const displayTime = eventDate.toLocaleTimeString('de-DE', timeOptions);

        let alertMainContent = '';
        let usernameForButton = '';

        switch (alertData.type) {
            case 'follow':
                usernameForButton = alertData.username;
                alertMainContent += `<strong>${usernameForButton}</strong> hat ein Follow dagelassen! :D`;
                break;
            case 'subscription':
                usernameForButton = alertData.username;
                const subType = alertData.sub_type === 'resub' ? 'erneut abonniert' : 'abonniert';
                alertMainContent += `<strong>${usernameForButton}</strong> hat den Kanal ${subType}!`;
                if (alertData.tier) {
                    alertMainContent += ` (Tier <strong>${alertData.tier / 1000}</strong>)`;
                }
                if (alertData.cumulative_months) {
                    alertMainContent += ` für <strong>${alertData.cumulative_months}</strong> Monate`;
                }
                if (alertData.streak_months) {
                    alertMainContent += ` mit einem Streak von <strong>${alertData.streak_months}</strong> Monaten!`;
                }
                if (alertData.is_gift) {
                    alertMainContent += ' (Geschenk)';
                }
                if (alertData.message) {
                    alertMainContent += `: "<strong>${alertData.message}</strong>"`;
                }
                break;
            case 'cheer':
                usernameForButton = alertData.username || 'Anonym';
                alertMainContent += `<strong>${usernameForButton}</strong> hat mit <strong>${alertData.bits}</strong> Bits gecheert! :O`;
                if (alertData.message) alertMainContent += `: "<strong>${alertData.message}</strong>"`;
                break;
            case 'raid':
                usernameForButton = alertData.from_broadcaster_name;
                alertMainContent += `<strong>${usernameForButton}</strong> hat mit <strong>${alertData.viewers}</strong> Zuschauern rüber geraidet! :D`;
                break;
            case 'channel_points_redemption':
                usernameForButton = alertData.username;
                alertMainContent += `<strong>${usernameForButton}</strong> löste mit seinen Kanalpunkten <strong>${alertData.reward_title}</strong> ein!`;
                if (alertData.input) alertMainContent += `: "<strong>${alertData.input}</strong>"`;
                break;
            case 'hype_train_begin':
                alertMainContent += `Der Hype Train hat Level <strong>${alertData.level}</strong> gestartet! Total erreicht: <strong>${alertData.total}</strong>`;
                break;
            case 'hype_train_progress':
                alertMainContent += `Der Hype Train ist auf Level <strong>${alertData.level}</strong>! Fortschritt: <strong>${alertData.progress}/${alertData.goal}</strong>`;
                break;
            case 'hype_train_end':
                alertMainContent += `Der Hype Train endete auf Level <strong>${alertData.level}</strong>! Gesamtwert: <strong>${alertData.total}</strong>`;
                break;
            case 'gift_sub':
                usernameForButton = alertData.username || 'Anonym';
                if (alertData.amount > 1) {
                    alertMainContent += `<strong>${usernameForButton}</strong> hat <strong>${alertData.amount}</strong> Subs an die Community verschenkt!`;
                } else {
                    alertMainContent += `<strong>${usernameForButton}</strong> hat <strong>1</strong> Sub an <strong>${alertData.recipient_name}</strong> verschenkt!`;
                }
                break;
            case 'stream_online':
            case 'stream_offline':
                // no need to display these in the list
                break;
            default:
                alertMainContent += `Unbekannter Alert: <strong>${JSON.stringify(alertData)}</strong>`;
                break;
        }

        if (alertMainContent === "") return;

        listItem.classList.add('alert-item');
        listItem.style.position = 'relative';

        const alertMessageDiv = document.createElement('span');
        alertMessageDiv.classList.add('alert-message');
        alertMessageDiv.innerHTML = alertMainContent;

        const alertMetaDiv = document.createElement('div');
        alertMetaDiv.classList.add('alert-meta');
        alertMetaDiv.innerHTML = `
            <span class="alert-date">${displayDate}</span>
            <span class="alert-time">${displayTime}</span>
        `;

        listItem.appendChild(alertMessageDiv);
        listItem.appendChild(alertMetaDiv);

        const cornerButton = document.createElement('button');
        cornerButton.classList.add('corner-action-button');
        cornerButton.title = `Aktion für ${usernameForButton}`;

        // Store the alertData directly on the button for easy access in the click handler
        cornerButton.dataset.alertJson = JSON.stringify(alertData);

        loadIcon('reloadIcon').then(iconElement => {
            cornerButton.appendChild(iconElement);
        }).catch(e => console.error("Could not add reloadIcon to corner button:", e));

        cornerButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the click from bubbling up to the list item if it has its own handler

            // Retrieve the stored alertData
            const clickedAlertData = JSON.parse(event.currentTarget.dataset.alertJson);
            console.log(`Aktion-Button in Ecke geklickt für Benutzer: ${clickedAlertData.username || clickedAlertData.from_broadcaster_name || 'Unbekannt'}`);

            // Check if WebSocket is open before sending
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Send the original alertData object, wrapped in a type for the server to understand
                ws.send(JSON.stringify({
                    category: 'reAlert', // A new type to identify this message on the server
                    data: {
                        type: 'alert',
                        data: clickedAlertData,
                        realert: true,
                    },
                    app: 'c7' // Die dazugehörige App des Clients
                }));
                console.log('Re-Alert request sent:', clickedAlertData);
            } else {
                console.warn('WebSocket connection not open. Cannot send re-alert request.');
                alert('WebSocket-Verbindung ist nicht offen. Re-Alert-Anfrage konnte nicht gesendet werden.');
            }
        });

        listItem.appendChild(cornerButton);

        // Füge das neue Element immer am Anfang der Liste ein
        alertList.prepend(listItem);

        let currentAlertItems = alertList.querySelectorAll('.alert-item');
        while (currentAlertItems.length > MAX_STORED_ALERTS) {
            currentAlertItems[currentAlertItems.length - 1].remove();
            currentAlertItems = alertList.querySelectorAll('.alert-item');
        }

        if (save) {
            const alertDataToSave = { ...alertData, timestamp: Date.now() };
            saveAlertToLocalStorage(alertDataToSave);
        }
    }

    // Event Listener für die neuen Buttons
    muteButton.addEventListener('click', () => {
        alert("not implemented yet");

        // TODO: get current mute state

        if (ws && ws.readyState === WebSocket.OPEN) {
            // Send the original alertData object, wrapped in a type for the server to understand
            ws.send(JSON.stringify({
                category: 'alertMute', // A new type to identify this message on the server
                state: 'true', // or 'false' to unmute,
                app: 'c7' // Die dazugehörige App des Clients
            }));
            console.log('Re-Alert request sent:', clickedAlertData);
        } else {
            console.warn('WebSocket connection not open. Cannot send re-alert request.');
            alert('WebSocket-Verbindung ist nicht offen. Re-Alert-Anfrage konnte nicht gesendet werden.');
        }
    });

    fullMuteButton.addEventListener('click', () => {
        alert("not implemented yet");

        // TODO: get current mute state

        if (ws && ws.readyState === WebSocket.OPEN) {
            // Send the original alertData object, wrapped in a type for the server to understand
            ws.send(JSON.stringify({
                category: 'alertMute', // A new type to identify this message on the server
                state: null, // or 'false' to unmute
                app: 'c7' // Die dazugehörige App des Clients
            }));
            console.log('Re-Alert request sent:', clickedAlertData);
        } else {
            console.warn('WebSocket connection not open. Cannot send re-alert request.');
            alert('WebSocket-Verbindung ist nicht offen. Re-Alert-Anfrage konnte nicht gesendet werden.');
        }
    });

    if (DEBUG || !isRealBrowser) {
        loadAlertsFromLocalStorage();
        connectWebSocket();
    }
});