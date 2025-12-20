const MOD_BADGE_URL = "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/"
const LEAD_MOD_BADGE_URL = "https://static-cdn.jtvnw.net/badges/v1/0822047b-65e0-46f2-94a9-d1091d685d33/"

document.addEventListener('DOMContentLoaded', () => {
    const chatMessagesContainer = document.getElementById('chat-messagbox');

    const WS_URL = 'ws://localhost:3000';
    let ws;

    // --- Konfiguration für Nachrichtenspeicher ---
    const MESSAGE_STORAGE_KEY = 'twitchChatMessages';
    const MESSAGE_EXPIRY_MS = 10 * 60 * 1000; // 10 Minuten in Millisekunden

    // --- Nachrichten aus dem Speicher laden und anzeigen ---
    function loadAndDisplayStoredMessages() {
        try {
            const storedMessagesJSON = localStorage.getItem(MESSAGE_STORAGE_KEY);
            if (storedMessagesJSON) {
                let storedMessages = JSON.parse(storedMessagesJSON);
                const currentTime = Date.now();

                // Nur Nachrichten anzeigen, die noch nicht abgelaufen sind
                storedMessages = storedMessages.filter(msg => (currentTime - msg.timestamp) < MESSAGE_EXPIRY_MS);

                // Nachrichten im DOM anzeigen
                storedMessages.forEach(msg => {
                    const messageElement = createMessageElement(msg.chatData, msg.timestamp); // Timestamp übergeben
                    chatMessagesContainer.appendChild(messageElement);
                });
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

                checkAndRemoveTopMessage()

                // Nach dem Laden sofort den Speicher bereinigen und aktuellen Zustand speichern
                saveCurrentMessagesToStorage();
            }
        } catch (e) {
            console.error('[Speicher] Fehler beim Laden oder Parsen gespeicherter Nachrichten:', e);
            localStorage.removeItem(MESSAGE_STORAGE_KEY); // Speicher bei Fehler löschen
        }
    }

    // --- Nachrichten im Speicher speichern (liest direkt aus dem DOM) ---
    function saveCurrentMessagesToStorage() {
        try {
            const currentTime = Date.now();
            const messagesToSave = Array.from(chatMessagesContainer.children).map(element => {
                // Nur Elemente berücksichtigen, die nicht gerade ausgeblendet werden
                if (element.classList.contains('fade-out')) { // Prüfe auf die 'fade-out' Klasse
                    return null; // Ausgeblendete Nachrichten nicht speichern
                }
                try {
                    const chatData = JSON.parse(element.dataset.chatData);
                    const timestamp = parseInt(element.dataset.timestamp);
                    // Auch hier Nachrichten filtern, die abgelaufen sein könnten (Sicherheit)
                    if ((currentTime - timestamp) < MESSAGE_EXPIRY_MS) {
                        return { chatData, timestamp };
                    }
                    return null; // Abgelaufene Nachrichten nicht speichern
                } catch (e) {
                    console.error("[Speicher] Fehler beim Parsen von chatData oder timestamp aus Element:", e, element);
                    return null;
                }
            }).filter(msg => msg !== null); // Entfernt alle null-Einträge (ausgeblendete, abgelaufene, fehlerhafte)

            localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messagesToSave));
        } catch (e) {
            console.error('[Speicher] Fehler beim Speichern von Nachrichten:', e);
        }
    }

    function connectWebSocket() {
        ws = new WebSocket(WS_URL);

        ws.onopen = (event) => {
            console.log('[WebSocket] Verbunden mit WebSocket-Server');

            ws.send(JSON.stringify({
                action: 'identify', // Eine Aktion, damit der Server weiß, was zu tun ist
                clientType: 'chat' // Der spezifische Typ dieses Clients
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'chatMessage') {
                addChatMessage(data);
                checkAndRemoveTopMessage(); // Überprüfen, ob Nachrichten entfernt werden müssen
            } else if (data.type === 'deleteEvent') {
                handleDeleteEvent(data);
            } else if (data.type === 'streamStatusUpdate' || data.type === 'liveStatsUpdate') {
                //do nothing
            }
            else {
                console.log('Unbekannter Datentyp:', data.type, data); // Für Debugging, falls unbekannte Typen empfangen werden
            }
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Fehler im Frontend:', error);
        };

        ws.onclose = (event) => {
            console.warn('[WebSocket] Verbindung geschlossen:', event.reason || 'Unbekannt');
            setTimeout(connectWebSocket, 3000); // Versuche, nach 3 Sekunden erneut zu verbinden
        };
    }

    // exampleMessages(); // Beispielnachrichten nur für Tests

    // Beim Laden der Seite zuerst gespeicherte Nachrichten anzeigen
    loadAndDisplayStoredMessages();
    connectWebSocket();

    function exampleMessages() {
        localStorage.clear();

        const exampleMessages = [
            {
                type: 'chatMessage', channel: 'debug', username: 'LongestPossibleTwitchName', messageId: 'testmsg1',
                message: 'Dies ist eine Testnachricht, um zu sehen, wie lange Namen im Layout aussehen! Kappa',
                color: '#FFD700', badges: [], emotes: { '25': ['61-65'] },
                isMod: false, isSub: false, isVIP: false, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'Flo_Ced_CoB', messageId: 'testmsg2',
                message: 'Hallo Welt! Dies ist eine normale Nachricht mit mehreren Badges und Emotes <3. PogChamp',
                color: '#8A2BE2',
                badges: [
                    { type: 'broadcaster', url: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1' },
                    { type: 'subscriber', url: 'https://static-cdn.jtvnw.net/badges/v1/5d9f0f15-a6e9-44d4-9549-9c59505c2a1b/1' }
                ],
                emotes: { emoteId: '1000', positions: ['56-57', '67-73'] },
                isMod: true, isSub: true, isVIP: false, isBroadcaster: true
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'ModMan_Test', messageId: 'testmsg3',
                message: 'Ich bin ein Moderator! Meine Nachrichtenbox sollte anders aussehen.',
                color: '#00FF00',
                badges: [{ type: 'moderator', url: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1' }],
                emotes: {},
                isMod: true, isSub: false, isVIP: false, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'VeryImportantP', messageId: 'testmsg4',
                message: 'Ein VIP ist hier! Lasst die Glitzer fallen ✨',
                color: '#FF00FF',
                badges: [{ type: 'vip', url: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3' }],
                emotes: {},
                isMod: false, isSub: false, isVIP: true, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'Der_Subber', messageId: 'testmsg5',
                message: 'Ich bin ein Sub und unterstütze den Stream!',
                color: '#FF4500',
                badges: [{ type: 'subscriber', url: 'https://static-cdn.jtvnw.net/badges/v1/5d9f0f15-a6e9-44d4-9549-9c59505c2a1b/1' }],
                emotes: {},
                isMod: false, isSub: true, isVIP: false, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'ModVIP_User', messageId: 'testmsg6',
                message: 'Ich bin Mod UND VIP! Eine tolle Kombi.',
                color: '#FFFF00',
                badges: [
                    { type: 'moderator', url: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1' },
                    { type: 'vip', url: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3' }
                ],
                emotes: {},
                isMod: true, isSub: false, isVIP: true, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'SubVIP_User', messageId: 'testmsg7',
                message: 'Sub und VIP vereint!',
                color: '#DAA520',
                badges: [
                    { type: 'subscriber', url: 'https://static-cdn.jtvnw.net/badges/v1/5d9f0f15-a6e9-44d4-9549-9c59505c2a1b/1' },
                    { type: 'vip', url: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3' }
                ],
                emotes: {},
                isMod: false, isSub: true, isVIP: true, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'NormalerZuschauer', messageId: 'testmsg8',
                message: 'Eine ganz normale Nachricht. Schön, hier zu sein!',
                color: '#FFFFFF',
                badges: [],
                emotes: {},
                isMod: false, isSub: false, isVIP: false, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'NormalerZuschauer', messageId: 'testmsg9',
                message: "Loremipsumdolorsitamet,consecteturadipiscingelit.Seddoeiusmodtemporincididuntutlaboreetdoloremagnaaliqua.Utenimadminimveniam,quisnostrudexercitationullamcolaborisnisiutaliquipexcommodoConsequat.DuisauteiruredolorinreprehenderitinvoluptatevelitesselillumdoloreEufugiatnullapariatur.Excepteursintoccaecatcupidatatnonproident,suntinculpaquiofficiadeseruntmollitanimidestlaborum.(Thismessageisexactly500characterslong,includingspacesandpunctuation.ItisdesignedtodemonstratethemaximumlengthallowedinasingleTwitchchatmessage,ensuringfullvisibilityandtestingofyouroverlay'shandlingoflongmessages.)",
                color: '#FFFFFF',
                badges: [],
                emotes: {},
                isMod: false, isSub: false, isVIP: false, isBroadcaster: false
            },
            {
                type: 'chatMessage', channel: 'debug', username: 'twitch partner', messageId: 'testmsg10',
                message: "wowie zowie",
                color: '#FFFFFF',
                badges: [{ type: 'subscriber', url: 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/3' }],
                emotes: {},
                isMod: false, isSub: false, isVIP: false, isTwitchPartner: true, isBroadcaster: false
            }
        ];

        exampleMessages.forEach(msg => addChatMessage(msg));
    }

    // --- createMessageElement: Erstellt nur das DOM-Element ---
    function createMessageElement(chatData, timestamp = Date.now()) { // timestamp als optionales Argument
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        // messageId und username als data-Attribute speichern
        messageElement.dataset.messageId = chatData.messageId;
        messageElement.dataset.username = chatData.username;

        // chatData und Timestamp als data-Attribute speichern
        messageElement.dataset.chatData = JSON.stringify(chatData);
        messageElement.dataset.timestamp = timestamp.toString();

        // Bestehende Klassen für das gesamte Nachrichten-Element
        if (chatData.isBroadcaster) messageElement.classList.add('is-broadcaster');
        if (chatData.isMod) messageElement.classList.add('is-mod');
        if (chatData.isSub) messageElement.classList.add('is-sub');
        if (chatData.isVIP) messageElement.classList.add('is-vip');
        if (chatData.isTwitchPartner) messageElement.classList.add('is-twitch-partner');

        const badgesSpan = document.createElement('span');
        badgesSpan.classList.add('badges-container');

        if (chatData.badges && Array.isArray(chatData.badges) && chatData.badges.length > 0) {
            const allowedBadges = ['broadcaster', 'lead_moderator', 'moderator', 'vip', 'subscriber', 'partner', 'cheerer', 'gifter', 'prime gaming', 'staff'];

            chatData.badges.forEach(badge => {
                if (!allowedBadges.includes(badge.type)) {
                    return;
                }

                const badgeImg = document.createElement('img');

                if (badge.url.startsWith(MOD_BADGE_URL)) {
                    badgeImg.src = "./ModSchwert.png";
                } else if (badge.url.startsWith(LEAD_MOD_BADGE_URL)) {
                    badgeImg.src = "./ModHammer.png";
                    messageElement.classList.add('is-lead-mod');
                } else {
                    badgeImg.src = badge.url;
                }

                badgeImg.alt = badge.type;
                badgeImg.classList.add('badge-image');
                badgesSpan.appendChild(badgeImg);
            });
            if (badgesSpan.children.length > 0) {
                messageElement.appendChild(badgesSpan);
            }
        }

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.textContent = chatData.username;

        // Spezialklassen für Benutzername basierend auf Rolle
        if (chatData.isBroadcaster) {
            usernameSpan.classList.add('is-broadcaster-username');
        } else if (chatData.isMod) {
            usernameSpan.classList.add('is-mod-username');
        }

        // Die direkt vom Chat gesendete Farbe wird nur angewendet, wenn keine Spezialklasse greift
        if (!chatData.isBroadcaster && !chatData.isMod && chatData.color) {
            usernameSpan.style.color = chatData.color;
        } else if (!chatData.isBroadcaster && !chatData.isMod) {
            usernameSpan.style.color = '#FFFFFF';
        }

        messageContent.appendChild(usernameSpan);

        const messageTextContainer = document.createElement('span');
        messageTextContainer.classList.add('message-text');

        if (chatData.emotes && Object.keys(chatData.emotes).length > 0) {
            let lastIndex = 0;
            const emotePositions = [];

            for (const emoteCounter in chatData.emotes) {
                const emote = chatData.emotes[emoteCounter];

                try {
                    emote.positions.forEach(currentPosition => {
                        const [start, end] = currentPosition.split('-').map(Number);
                        emotePositions.push({ emoteId: emote.emoteId, start, end });
                    });
                } catch { }
            }

            emotePositions.sort((a, b) => a.start - b.start);

            emotePositions.forEach(emote => {
                if (emote.start > lastIndex) {
                    messageTextContainer.appendChild(document.createTextNode(chatData.message.substring(lastIndex, emote.start)));
                }

                const emoteImg = document.createElement('img');
                emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.emoteId}/default/dark/1.0`;
                emoteImg.alt = chatData.message.substring(emote.start, emote.end + 1);
                emoteImg.classList.add('chat-emote');
                messageTextContainer.appendChild(emoteImg);

                lastIndex = emote.end + 1;
            });

            if (lastIndex < chatData.message.length) {
                messageTextContainer.appendChild(document.createTextNode(chatData.message.substring(lastIndex)));
            }

        } else {
            messageTextContainer.textContent = chatData.message;
        }

        messageContent.appendChild(messageTextContainer);
        messageElement.appendChild(messageContent);

        return messageElement;
    }

    // --- addChatMessage: Erstellt das Element und speichert es ---
    function addChatMessage(chatData) {
        const messageElement = createMessageElement(chatData); // Element erstellen

        chatMessagesContainer.appendChild(messageElement); // Element zum DOM hinzufügen
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // Nachrichten im Speicher aktualisieren, da eine neue hinzugefügt wurde
        saveCurrentMessagesToStorage();

        const MAX_MESSAGES = 50; // Diese Regel ist eine harte Begrenzung der Anzahl von Nachrichten
        if (chatMessagesContainer.children.length > MAX_MESSAGES) {
            // Finde das älteste Element, das nicht gerade ausgeblendet wird
            const oldestMessage = Array.from(chatMessagesContainer.children).find(msg => !msg.classList.contains('fade-out'));
            if (oldestMessage) {
                oldestMessage.remove(); // Direkt entfernen, ohne Animation
                saveCurrentMessagesToStorage(); // Speicher aktualisieren, da eine Nachricht entfernt wurde
            }
        }
    }

    // Funktion zur Verarbeitung von Löschbefehlen
    function handleDeleteEvent(data) {
        console.log('[Overlay] Löschbefehl empfangen:', data);

        if (data.action === 'deleteMessage') {
            // Lösche eine spezifische Nachricht anhand ihrer ID
            console.log(data)
            const messageToDelete = chatMessagesContainer.querySelector(`[data-message-id="${data.messageId}"]`);

            if (messageToDelete) {
                removeSingleMessage(messageToDelete)
            } else {
                console.warn(`[Overlay] Nachricht mit ID ${data.messageId} zum Löschen nicht gefunden.`);
            }
        } else if (data.action === 'userTimeOut' || data.action === 'userBan') {
            const userMessages = chatMessagesContainer.querySelectorAll(`[data-username="${data.username}"]`);

            // Leere den gesamten Chat-Container
            Array.from(userMessages).forEach(msg => {
                removeSingleMessage(msg)
            });
        } else if (data.action === 'clearChat') {
            // Leere den gesamten Chat-Container
            Array.from(chatMessagesContainer.children).forEach(msg => {
                if (msg.classList.contains("is-mod") || msg.classList.contains("is-broadcaster")) return;

                removeSingleMessage(msg)
            });
        }
        else {
            console.log("[ERROR] Delete case not found: " + JSON.stringify(data))
        }
    }

    function removeSingleMessage(childElement) {
        // Wenn das Element bereits ausgeblendet wird, tue nichts
        if (childElement.classList.contains('deleted')) {
            return;
        }

        // Markiere das Element als ausgeblendet, um doppelte Aufrufe zu vermeiden
        childElement.classList.add('deleted');

        // Warte auf das Ende der Anbimation, bevor das Element entfernt wird
        childElement.addEventListener('animationend', () => {
            if (childElement.parentNode) {
                childElement.remove();
                saveCurrentMessagesToStorage(); // Speicher aktualisieren, nachdem das Element entfernt wurde
            }
        }, { once: true }); // Listener nur einmal ausführen
    }

    // Diese Funktionen (removeIfOutsideParent und checkAndRemoveTopMessage) sind für das Entfernen von Nachrichten,
    // die aus dem Sichtfeld scrollen, gedacht.
    function removeIfOutsideParent(childElement, parentElement, thresholdPercentage = 1) {
        if (!childElement || !parentElement) {
            return;
        }

        const childRect = childElement.getBoundingClientRect();
        const parentRect = parentElement.getBoundingClientRect();

        const childArea = childRect.width * childRect.height;

        if (childArea <= 0) {
            return;
        }

        const overlapLeft = Math.max(childRect.left, parentRect.left);
        const overlapRight = Math.min(childRect.right, parentRect.right);
        const overlapTop = Math.max(childRect.top, parentRect.top);
        const overlapBottom = Math.min(childRect.bottom, parentRect.bottom);

        const overlapWidth = Math.max(0, overlapRight - overlapLeft);
        const overlapHeight = Math.max(0, overlapBottom - overlapTop);

        const overlapArea = overlapWidth * overlapHeight;
        const outsideArea = childArea - overlapArea;
        const percentageOutside = (outsideArea / childArea) * 100;

        if (percentageOutside > thresholdPercentage) {
            // Wenn das Element bereits ausgeblendet wird, tue nichts
            if (childElement.classList.contains('fade-out')) {
                return;
            }

            // Markiere das Element als ausgeblendet, um doppelte Aufrufe zu vermeiden
            childElement.classList.add('fade-out');

            // Warte auf das Ende der Animation, bevor das Element entfernt wird
            childElement.addEventListener('animationend', () => {
                if (childElement.parentNode) {
                    childElement.remove();
                    saveCurrentMessagesToStorage(); // Speicher aktualisieren, nachdem das Element entfernt wurde
                }
            }, { once: true }); // Listener nur einmal ausführen
        } else {
            // Wenn das Element ausgeblendet wurde, aber jetzt wieder sichtbar ist, entferne die fade-out-Klasse
            if (childElement.classList.contains('fade-out')) {
                childElement.classList.remove('fade-out');
            }
        }
    }

    function checkAndRemoveTopMessage() {
        // Diese Funktion wird nach jeder neuen Nachricht aufgerufen.
        // Sie prüft, ob die älteste (oberste) Nachricht aus dem Sichtfeld gerutscht ist.
        setTimeout(() => {
            console.log("Checken ob eine Element draußen ist")
            if (chatMessagesContainer.children.length > 0) {
                const topMessage = chatMessagesContainer.children[0];
                removeIfOutsideParent(topMessage, chatMessagesContainer);
            }
        }, 400); // Kurze Verzögerung nach Hinzufügen einer Nachricht
    }

    //erkennen ob es in OBS offen ist oder im browser
    if (window.obsstudio) {
        console.log("Die Seite läuft als OBS-Browserquelle.");
        document.body.classList.add('is-obs'); // Füge eine Klasse zum Body hinzu
    } else {
        console.log("Die Seite läuft in einem Standard-Browser.");
    }
});