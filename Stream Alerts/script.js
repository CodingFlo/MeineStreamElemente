const alertContainer = document.getElementById('alert-container');
const alertMessage = document.getElementById('alert-message');
const alertTextBackground = document.getElementById('alert-text-background');

// Erstelle Audio-Elemente einmalig
// Der Pfad ist relativ zur index.html, also 'sounds/...'
const followSound = new Audio('sounds/FollowSound.ogg');
const raidSound = new Audio('sounds/RaidSound.mp3');
const subSound = new Audio('sounds/SubSound.ogg');
const alertingSound = new Audio('sounds/alertingSound.mp3');

// Jumpscare-Sounds als Map, um sie später zufällig abzuspielen
const jumpscareSounds = [
    "jumpscareSounds/Cave18.mp3",
    "jumpscareSounds/Cave3.mp3",
    "jumpscareSounds/sound1.m4a",
    "jumpscareSounds/getOut.m4a",
    "jumpscareSounds/MarioMaaaaa.m4a",
    "jumpscareSounds/Windows ShutDown Sound Effect.mp3",
    "jumpscareSounds/AAAAUUUGHHHH-Meme-Sound-Effect-vidiget-dot-com-450181.mp3",
    "jumpscareSounds/Goat_scream5.mp3",
    "jumpscareSounds/Ender_dragon_death.mp3",
]

// Sound-Variablen für die neuen Alert-Typen, initialisiert mit null
const cheerSound = subSound;
const hypeTrainBeginSound = null;
const channelPointsRedemptionSound = null;
const goalBeginSound = null;
const newCustomAlertSound = null; // Bleibt bestehen

const alertQueue = []; // Warteschlange für Alerts
let isAlertShowing = false; // Flag, um zu prüfen, ob gerade ein Alert angezeigt wird
let queueProcessingInterval = null; // Variable für das Intervall zum erneuten Starten der Schleife

// Map zum Speichern des letzten Follow-Zeitpunkts pro Benutzer
const lastFollowTimes = new Map();
const FOLLOW_COOLDOWN_MS = 10 * 60 * 1000; // 10 Minuten in Millisekunden

let offlineGotShown = false; // Flag, um zu prüfen, ob der Offline-Alert bereits angezeigt wurde

// Variable für den Test-Schleifen-Intervall-ID
let testLoopIntervalId = null;

// --- WebSocket Initialisierung ---
// Stelle sicher, dass die Adresse und der Port mit deinem Node.js-Server übereinstimmen
let ws = null;
intializeWebsocket();

function intializeWebsocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('[Frontend] WebSocket-Verbindung zum Backend hergestellt.');
        offlineGotShown = false;

        ws.send(JSON.stringify({
            action: 'identify', // Eine Aktion, damit der Server weiß, was zu tun ist
            clientType: 'alert', // Der spezifische Typ dieses Clients
            app: 'c7' // Die dazugehörige App des Clients
        }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'alert') {
            const alertData = message.data;
            console.log('[Frontend] Alert vom Backend erhalten:', alertData);

            switch (alertData.type) {
                case 'follow':
                    // Prüfe den Follow-Cooldown
                    const now = Date.now();
                    const lastFollowTime = lastFollowTimes.get(alertData.username);

                    if (!message.realert && (lastFollowTime && (now - lastFollowTime < FOLLOW_COOLDOWN_MS))) {
                        console.log(`[Frontend] Follow-Alert für ${alertData.username} unterdrückt (Cooldown).`);
                        break; // Beende den Switch, ohne den Alert anzuzeigen
                    }

                    // Wenn kein Cooldown, Alert anzeigen und Zeit aktualisieren
                    lastFollowTimes.set(alertData.username, now);
                    showFollow(alertData.username);
                    break;

                case 'subscription':
                    showSub(alertData.username, alertData.tier, alertData.is_gift, alertData.cumulative_months);
                    break;

                case 'cheer':
                    showCheer(alertData.username, alertData.bits, alertData.message); // Eigene Funktion aufrufen
                    break;

                case 'raid':
                    showRaid(alertData.from_broadcaster_name, alertData.viewers);
                    break;

                case 'hype_train_begin':
                    showHypeTrainBegin(alertData.level); // Eigene Funktion aufrufen
                    break;

                case 'channel_points_redemption':
                    showChannelPointsRedemption(alertData.username, alertData.reward_title, alertData.input); // Eigene Funktion aufrufen
                    break;

                case 'goal_begin':
                    showGoalBegin(alertData.description, alertData.current_amount, alertData.target_amount, alertData.goal_type); // Eigene Funktion aufrufen
                    break;

                case 'stream_offline':
                    showOffline(alertData.broadcaster_user_name)
                    break;

                case 'new_custom_alert':
                    showNewCustomAlert(alertData.message);
                    break;

                // do nothing here (ignore it)
                case 'channel_update':
                case 'stream_online':
                    break;

                default:
                    console.warn('[Frontend] Unbekannter Alert-Typ empfangen:', alertData.type);
                    break;
            }
        }
        else if (message.type === 'streamStatusUpdate' || message.type === 'liveStatsUpdate' || message.type === 'chatMessage') {
            // do nothing here (ignore it)
        }
        else if (message.type === 'jumpscare') {
            playRandomSoundFromMap(jumpscareSounds); // Funktion zum Abspielen eines zufälligen Jumpscare-Sounds
        }
        else {
            console.log('[Frontend] Unbekannte Nachricht vom Backend empfangen:', message);
        }
    };

    ws.onclose = () => {
        console.warn('[Frontend] WebSocket-Verbindung geschlossen. Versuche, in 5 Sekunden erneut zu verbinden...');

        setTimeout(() => {
            intializeWebsocket(); // Versuche, die Verbindung nach 5 Sekunden wiederherzustellen
        }, 5000);

        setTimeout(() => {
            if (!offlineGotShown && ws.readyState === WebSocket.CLOSED) {
                showOffline("Flo_Ced_CoB");
                offlineGotShown = true; // Setze das Flag, um zu verhindern, dass der Alert mehrfach angezeigt wird
            }
        }, 30 * 1000); // Nach 30 Sekunden, wenn die Verbindung immer noch geschlossen ist
    };

    ws.onerror = (error) => {
        console.error('[Frontend] WebSocket-Fehler:', error);
    };
}

// async function showNextAlert() {
//     if (alertQueue.length > 0 && !isAlertShowing) {
//         isAlertShowing = true;
//         const nextAlert = alertQueue.shift();

//         alertMessage.innerHTML = nextAlert.text;

//         alertTextBackground.className = 'alert-panel';
//         alertTextBackground.classList.add(nextAlert.gradientClass);

//         alertContainer.classList.remove('hidden');
//         alertContainer.classList.add('visible');

//         let soundDuration = 0;
//         if (nextAlert.sound) {
//             nextAlert.sound.currentTime = 0;
//             nextAlert.sound.play().catch(e => console.error("Fehler beim Abspielen des Sounds:", e));

//             soundDuration = await new Promise(resolve => {
//                 const onCanPlayThrough = () => {
//                     nextAlert.sound.removeEventListener('canplaythrough', onCanPlayThrough);
//                     resolve(nextAlert.sound.duration * 1000);
//                 };
//                 const onEnded = () => {
//                     nextAlert.sound.removeEventListener('ended', onEnded);
//                     nextAlert.sound.removeEventListener('canplaythrough', onCanPlayThrough);
//                     resolve(0);
//                 };
//                 nextAlert.sound.addEventListener('canplaythrough', onCanPlayThrough);
//                 nextAlert.sound.addEventListener('ended', onEnded);

//                 setTimeout(() => {
//                     nextAlert.sound.removeEventListener('canplaythrough', onCanPlayThrough);
//                     nextAlert.sound.removeEventListener('ended', onEnded);
//                     resolve(3000);
//                 }, 5000);
//             });
//         }

//         const totalAlertDuration = Math.max(5000 + (nextAlert.extraMilliSeconds || 0), soundDuration);
//         await new Promise(resolve => setTimeout(resolve, totalAlertDuration));

//         await new Promise(resolve => setTimeout(resolve, 500));

//         alertContainer.classList.remove('visible');
//         alertContainer.classList.add('hidden');
//         isAlertShowing = false;

//         await showNextAlert();
//     } else if (alertQueue.length === 0 && !isAlertShowing) {
//         clearInterval(queueProcessingInterval);
//         queueProcessingInterval = null;
//         console.log("Warteschlange leer. Warte auf neue Alerts vom Backend.");
//     }
// }

async function showNextAlert() {
    // 1. Prüfe, ob ein Alert angezeigt werden kann
    if (alertQueue.length > 0 && !isAlertShowing) {
        isAlertShowing = true;
        const nextAlert = alertQueue.shift();

        // **Anzeigen des Alerts**
        alertMessage.innerHTML = nextAlert.text;
        alertTextBackground.className = 'alert-panel';
        alertTextBackground.classList.add(nextAlert.gradientClass);
        alertContainer.classList.remove('hidden');
        alertContainer.classList.add('visible');

        // **Sound-Logik**
        let soundPromise = Promise.resolve(0); // Standardmäßig 0 Wartezeit
        const minDisplayTime = 5000 + (nextAlert.extraMilliSeconds || 0);

        if (nextAlert.sound) {
            nextAlert.sound.currentTime = 0;

            soundPromise = new Promise(resolve => {
                // Event-Listener zum Entfernen, wenn der Sound beendet ist
                const onSoundEnded = () => {
                    nextAlert.sound.removeEventListener('ended', onSoundEnded);
                    resolve(0); // Sound ist zu Ende gespielt, es muss nicht weiter gewartet werden.
                };

                // Füge den Listener hinzu
                nextAlert.sound.addEventListener('ended', onSoundEnded);

                // Starte die Wiedergabe
                nextAlert.sound.play().catch(e => {
                    console.error("Fehler beim Abspielen des Sounds:", e);
                    nextAlert.sound.removeEventListener('ended', onSoundEnded);
                    resolve(0); // Fehler: Warte nicht auf den Sound
                });
            });
        }

        // **Wartezeit-Bestimmung**
        // Warte auf die längere Dauer: Mindest-Anzeigedauer ODER Sound-Laufzeit
        // Hier benötigen wir die tatsächliche Dauer des Sounds nicht, sondern warten nur,
        // dass die *kürzere* Zeit vom Sound-Promise (bis zum Ende) oder der Timeout
        // für die Mindestzeit abgelaufen ist.

        // Warte auf das längere der beiden:
        await Promise.race([
            // 1. Warte auf das Ende des Sounds
            soundPromise,
            // 2. Warte auf die Mindest-Anzeigedauer
            new Promise(resolve => setTimeout(resolve, minDisplayTime))
        ]);

        // Stelle sicher, dass der Sound gestoppt wird, falls er noch läuft und wir wegen
        // der Mindest-Anzeigedauer weitergemacht haben (kann optional sein)
        if (nextAlert.sound) {
            // Entferne den 'ended' Listener, falls er nicht schon ausgelöst wurde
            // (um Speicherlecks zu vermeiden, falls er noch aktiv ist)
            nextAlert.sound.removeEventListener('ended', () => { });
            // nextAlert.sound.pause(); // Optional: Stoppe den Sound, wenn Mindestzeit erreicht
        }

        alertContainer.classList.remove('visible');
        alertContainer.classList.add('hidden');

        await new Promise(resolve => {
            // Definiere den Listener, der einmalig ausgeführt wird
            const onTransitionEnd = (event) => {
                // optional: Stelle sicher, dass nur die Transition des Hauptcontainers zählt
                if (event.target !== alertContainer) return;

                alertContainer.removeEventListener('transitionend', onTransitionEnd);
                resolve();
            };

            // Füge den Listener hinzu
            alertContainer.addEventListener('transitionend', onTransitionEnd);

            // **WICHTIGER Fallback:** Falls die Transition aus irgendeinem Grund nicht triggert
            // (z.B. wenn keine Transition definiert ist oder in älteren Browsern)
            // Empfehlung: Füge einen Timeout hinzu, der maximal so lange wartet, 
            // wie die längste Transition in deinem CSS dauern sollte (z.B. 1000ms).
            setTimeout(() => {
                alertContainer.removeEventListener('transitionend', onTransitionEnd);
                resolve();
            }, 1000); // Maximal 1 Sekunde warten.
        });

        // Status zurücksetzen und nächsten Alert starten
        isAlertShowing = false;

        await showNextAlert();
    }
    // 2. Warteschlange leer
    else if (alertQueue.length === 0 && !isAlertShowing) {
        clearInterval(queueProcessingInterval);
        queueProcessingInterval = null;
        console.log("Warteschlange leer. Warte auf neue Alerts vom Backend.");
    }
}

function showAlert(text, gradientClass, sound = null, extraMilliSeconds = 0) {
    alertQueue.push({ text, gradientClass, sound, extraMilliSeconds });
    if (alertQueue.length === 1 && !isAlertShowing && !queueProcessingInterval) {
        queueProcessingInterval = setInterval(showNextAlert, 100);
        showNextAlert();
    }
}

function showOffline(userName) {
    let text = `${userName} ist offline!`;
    showAlert(text, "gradient-warn", alertingSound);
}

function showSub(userName, tier, isGift, cumulativeMonths) {
    let text = '';
    if (isGift) {
        text = `${userName} hat einen Sub geschenkt!`;
    } else {
        const displayTier = tier / 1000;
        if (cumulativeMonths > 1) {
            text = `${userName} hat einen Tier ${displayTier} Sub da gelassen für ${cumulativeMonths} Monate!`;
        } else {
            text = `${userName} hat einen Tier ${displayTier} Sub da gelassen!`;
        }
    }
    showAlert(text, "gradient-sub", subSound);
}

function showFollow(userName) {
    const text = `Willkommen in der Community ${userName}! :D`;
    showAlert(text, "gradient-follow", followSound);
}

function showRaid(userName, raiderAmount) {
    const text = `YOOOO! ${userName} raidet mit ${raiderAmount} Leuten zu uns rüber!<br>Schaut unbedingt dort vorbei und lasst ein Follow da für den Raid! :D`;
    showAlert(text, "gradient-raid", raidSound, 5000);
}

function showCheer(username, bits, message) {
    const cheerUser = username || 'Anonym';
    const text = `${cheerUser} hat ${bits} Bits gecheert!<br>"${message}"`;
    showAlert(text, "gradient-cheer", cheerSound); // Cheer hat eigenes Violett
}

function showHypeTrainBegin(level) {
    const text = `Hype Train startet! Aktuelles Level: ${level}!`;
    showAlert(text, "gradient-hype-train", hypeTrainBeginSound, 3000);
}

function showChannelPointsRedemption(username, rewardTitle, input) {
    const additionalInput = input ? `<br>"${input}"` : '';
    const text = `${username} hat "${rewardTitle}" eingelöst!${additionalInput}`;
    showAlert(text, "gradient-channel-points", channelPointsRedemptionSound); // Hier kannst du einen spezifischen Gradienten und Sound festlegen
}

function showGoalBegin(description, currentAmount, targetAmount, goalType) {
    const text = `Neues Ziel: ${description}! Aktuell: ${currentAmount}, Ziel: ${targetAmount} (${goalType})`;
    showAlert(text, "gradient-goal-begin", goalBeginSound, 5000);
}

function showNewCustomAlert(message) {
    showAlert(message, "gradient-custom", newCustomAlertSound); // "gradient-custom" ist der Name deines neuen Gradienten
}

// Testfunktionen für die Alerts
function runTestAlerts() {
    console.log("Starte Test-Alerts-Sequenz...");
    // Teste normalen Follow
    showFollow("TestFollowUser1");
    // Teste Follow innerhalb des Cooldowns
    setTimeout(() => {
        showFollow("TestFollowUser1"); // Sollte unterdrückt werden
    }, 5000);
    // Teste Follow nach Cooldown (oder anderen Benutzer)
    setTimeout(() => {
        showFollow("TestFollowUser2"); // Sollte angezeigt werden
    }, 15 * 1000); // 15 Sekunden später
    setTimeout(() => {
        showFollow("TestFollowUser1"); // Sollte jetzt wieder angezeigt werden (nach 10min > 10min)
    }, FOLLOW_COOLDOWN_MS + 1000); // Nach 10 Minuten + 1 Sekunde

    showSub("TestSubUser", 1000, false, 1);
    showSub("TestGiftSubUser", 1000, true, 0);
    showRaid("TestRaidUser", 42);
    showOffline("Flo_Ced_CoB")

    // Test der neuen ausgelagerten Alerts
    showChannelPointsRedemption("TestUser", "Du Stinkst", "iiih");
    showCheer("TestCheerUser", 500, "Das ist ein Test-Cheer!");
    showHypeTrainBegin(2);
    showGoalBegin("Follower-Ziel", 50, 100, "follower");

    // Test des neuen Custom Alerts (bleibt bestehen)
    showNewCustomAlert("Dies ist ein neuer benutzerdefinierter Alert!");
}

function startTestLoop() {
    if (testLoopIntervalId === null) {
        runTestAlerts();
        testLoopIntervalId = setInterval(runTestAlerts, 23 * 1000); // Interval beibehalten
        console.log("Test-Alert-Schleife gestartet.");
    }
}

/**
 * Spielt einen zufälligen Sound aus einem Array von Sound-Pfaden ab.
 * Diese Funktion ist für die Verwendung im Frontend (Browser-Umgebung) gedacht,
 * da sie 'new Audio()' verwendet.
 *
 * @param {string[]} soundPathsArray Ein Array von Strings, die Pfade zu Sounddateien (z.B. MP3) sind.
 */
function playRandomSoundFromMap(soundPathsArray) { // Parametername und Typ geändert
    if (!Array.isArray(soundPathsArray) || soundPathsArray.length === 0) { // Prüfung auf Array und Länge
        console.warn('[playRandomSoundFromMap] Ungültiges oder leeres Sound-Array bereitgestellt.');
        return;
    }

    // Einen zufälligen Sound-Pfad aus dem Array auswählen
    const randomIndex = Math.floor(Math.random() * soundPathsArray.length);
    const randomSoundPath = soundPathsArray[randomIndex];

    try {
        // Ein neues Audio-Objekt mit dem zufällig ausgewählten Pfad erstellen
        const audio = new Audio(randomSoundPath);

        audio.currentTime = 0; // Setze den Sound auf den Anfang zurück, falls er schon gespielt wurde
        audio.play()
            .then(() => {
                console.log(`[playRandomSoundFromMap] Zufälliger Sound erfolgreich abgespielt: ${randomSoundPath}`);
            })
            .catch(error => {
                console.error(`[playRandomSoundFromMap] Fehler beim Abspielen des zufälligen Sounds (${randomSoundPath}):`, error);
            });
    } catch (error) {
        console.error(`[playRandomSoundFromMap] Fehler beim Erstellen des Audio-Objekts für Pfad (${randomSoundPath}):`, error);
    }
}

// Beim Laden der Seite die Test-Schleife starten
// window.onload = startTestLoop;