// WebSocket-Verbindung zum Backend (optional für Multi-Viewer)
const socket = io('http://localhost:3001');

// Joystick-Elemente
const leftStick = document.getElementById('leftStick');
const rightStick = document.getElementById('rightStick');

// Maximale Bewegung der Joysticks in Pixeln (wird dynamisch berechnet)
function getMaxStickMovement() {
    // Berechne basierend auf der Größe der Joystick-Base
    const joystickBase = document.querySelector('.joystick-base');
    if (joystickBase) {
        const baseSize = joystickBase.offsetWidth;
        return baseSize * 0.25; // 25% der Base-Größe (reduziert damit nicht abgeschnitten)
    }
    return 25; // Fallback
}

// Gamepad-Status
let gamepadConnected = false;
let previousButtonStates = {};
let animationFrameId = null;
let isNintendoProController = false;

// Nintendo Pro Controller Button-Mapping
// Beim Pro Controller sind die Buttons vertauscht
const NINTENDO_BUTTON_MAP = {
    0: 1,  // A -> B
    1: 0,  // B -> A
    2: 3,  // X -> Y
    3: 2   // Y -> X
};

function remapButton(buttonIndex, gamepadId) {
    // Prüfe ob es ein Nintendo Pro Controller ist
    if (gamepadId && (gamepadId.toLowerCase().includes('nintendo') ||
        gamepadId.toLowerCase().includes('057e') ||
        gamepadId.toLowerCase().includes('wireless gamepad'))) {
        // Remap nur die Face Buttons (0-3)
        if (buttonIndex >= 0 && buttonIndex <= 3) {
            return NINTENDO_BUTTON_MAP[buttonIndex];
        }
    }
    return buttonIndex;
}

// Browser Gamepad API Events
window.addEventListener('gamepadconnected', (e) => {
    console.log('Controller verbunden:', e.gamepad);
    gamepadConnected = true;

    // Prüfe ob es ein Nintendo Pro Controller ist
    isNintendoProController = e.gamepad.id.toLowerCase().includes('nintendo') ||
        e.gamepad.id.toLowerCase().includes('057e') ||
        e.gamepad.id.toLowerCase().includes('wireless gamepad');

    if (isNintendoProController) {
        console.log('🎮 Nintendo Pro Controller erkannt - Button-Mapping aktiviert');
        console.log('Mapping: A↔B, X↔Y');
    }

    // Sende Status an Server
    socket.emit('controller-status', {
        connected: true,
        controllerId: e.gamepad.index,
        name: e.gamepad.id
    });

    // Starte Polling-Loop
    if (!animationFrameId) {
        pollGamepad();
    }
});

window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Controller getrennt:', e.gamepad);
    gamepadConnected = false;
    isNintendoProController = false;

    // Sende Status an Server
    socket.emit('controller-status', {
        connected: false,
        controllerId: e.gamepad.index
    });

    // Stoppe Polling wenn kein Controller mehr verbunden
    const gamepads = navigator.getGamepads();
    const hasGamepad = Array.from(gamepads).some(gp => gp !== null);
    if (!hasGamepad && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
});

// Verbindungsstatus
socket.on('connect', () => {
    console.log('Mit Server verbunden');
    checkForGamepads();
});

socket.on('disconnect', () => {
    console.log('Verbindung zum Server getrennt');
});

// Empfange Controller-Eingaben von anderen Clients
socket.on('controller-input', (data) => {
    if (data.type === 'button') {
        handleButtonInput(data.button, data.pressed);
    } else if (data.type === 'axis') {
        handleAxisInput(data.axis, data.value);
    }
});

// Prüfe initial auf bereits verbundene Gamepads
function checkForGamepads() {
    const gamepads = navigator.getGamepads();
    let foundGamepad = false;

    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            foundGamepad = true;
            gamepadConnected = true;

            // Prüfe ob es ein Nintendo Pro Controller ist
            isNintendoProController = gamepads[i].id.toLowerCase().includes('nintendo') ||
                gamepads[i].id.toLowerCase().includes('057e') ||
                gamepads[i].id.toLowerCase().includes('wireless gamepad');

            if (isNintendoProController) {
                console.log('🎮 Nintendo Pro Controller erkannt - Button-Mapping aktiviert');
                console.log('Mapping: A↔B, X↔Y');
            }

            console.log('Controller gefunden:', gamepads[i].id);

            if (!animationFrameId) {
                pollGamepad();
            }
            break;
        }
    }

    if (!foundGamepad) {
        console.log('Warte auf Controller... (Drücke eine Taste am Controller)');
    }
}

// Polling-Loop für Gamepad-Status
function pollGamepad() {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) continue;

        // Verarbeite Buttons
        gamepad.buttons.forEach((button, index) => {
            const wasPressed = previousButtonStates[`${i}-${index}`] || false;
            const isPressed = button.pressed;

            // Nur bei Änderung verarbeiten
            if (wasPressed !== isPressed) {
                // Remap Button für Nintendo Pro Controller
                const mappedIndex = remapButton(index, gamepad.id);
                handleButtonInput(mappedIndex, isPressed);

                // Sende an Server
                socket.emit('controller-input', {
                    type: 'button',
                    button: mappedIndex,
                    pressed: isPressed,
                    controllerId: i
                });
            }

            previousButtonStates[`${i}-${index}`] = isPressed;
        });

        // Verarbeite Achsen (Joysticks)
        gamepad.axes.forEach((value, index) => {
            handleAxisInput(index, value);
        });
    }

    // Nächster Frame
    animationFrameId = requestAnimationFrame(pollGamepad);
}

// Button-Eingaben verarbeiten
function handleButtonInput(buttonNum, pressed) {
    // Finde alle Elemente mit diesem Button
    const buttons = document.querySelectorAll(`[data-button="${buttonNum}"]`);

    buttons.forEach(button => {
        if (pressed) {
            button.classList.add('pressed');
            // Füge eine kurze Animation hinzu
            button.style.animation = 'buttonPress 0.2s ease';
        } else {
            button.classList.remove('pressed');
            button.style.animation = '';
        }
    });
}

// Achsen-Eingaben verarbeiten (Joysticks)
function handleAxisInput(axisNum, value) {
    // Deadzone anwenden
    const deadzone = 0.15;
    if (Math.abs(value) < deadzone) {
        value = 0;
    }

    // Bestimme welcher Joystick und welche Achse
    let stick = null;
    let isXAxis = false;

    // Linker Stick: Achse 0 (X) und 1 (Y)
    if (axisNum === 0 || axisNum === 1) {
        stick = leftStick;
        isXAxis = (axisNum === 0);
    }
    // Rechter Stick: Achse 2 (X) und 3 (Y)
    else if (axisNum === 2 || axisNum === 3) {
        stick = rightStick;
        isXAxis = (axisNum === 2);
    }

    if (stick) {
        updateJoystickPosition(stick, isXAxis, value);
    }
}

// Joystick-Position aktualisieren
function updateJoystickPosition(stick, isXAxis, value) {
    // Hole aktuelle Transform-Werte
    const currentTransform = stick.style.transform || 'translate(0px, 0px)';
    const matches = currentTransform.match(/translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/);

    let currentX = matches ? parseFloat(matches[1]) : 0;
    let currentY = matches ? parseFloat(matches[2]) : 0;

    // Berechne neue Position mit dynamischer Bewegungsreichweite
    const MAX_STICK_MOVEMENT = getMaxStickMovement();
    const movement = value * MAX_STICK_MOVEMENT;

    if (isXAxis) {
        currentX = movement;
    } else {
        currentY = movement;
    }

    // Begrenze die Bewegung auf einen Kreis
    const distance = Math.sqrt(currentX * currentX + currentY * currentY);
    if (distance > MAX_STICK_MOVEMENT) {
        const angle = Math.atan2(currentY, currentX);
        currentX = Math.cos(angle) * MAX_STICK_MOVEMENT;
        currentY = Math.sin(angle) * MAX_STICK_MOVEMENT;
    }

    // Wende Transform an
    stick.style.transform = `translate(${currentX}px, ${currentY}px)`;

    // Füge Glow-Effekt hinzu wenn Stick bewegt wird
    if (Math.abs(value) > 0.1) {
        stick.style.boxShadow = `
            0 4px 12px rgba(255, 51, 51, 0.6),
            0 0 ${Math.abs(value) * 30}px rgba(255, 51, 51, ${Math.abs(value) * 0.8}),
            inset 0 2px 8px rgba(255, 255, 255, 0.2)
        `;
    } else {
        stick.style.boxShadow = `
            0 4px 12px rgba(255, 51, 51, 0.4),
            inset 0 2px 8px rgba(255, 255, 255, 0.2)
        `;
    }
}

// Standard-Gamepad-Button-Mapping (für Referenz)
const BUTTON_MAPPING = {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    6: 'LT',
    7: 'RT',
    8: 'SELECT',
    9: 'START',
    10: 'L3',
    11: 'R3',
    12: 'D-PAD UP',
    13: 'D-PAD DOWN',
    14: 'D-PAD LEFT',
    15: 'D-PAD RIGHT'
};

// Achsen-Mapping (für Referenz)
const AXIS_MAPPING = {
    0: 'Left Stick X',
    1: 'Left Stick Y',
    2: 'Right Stick X',
    3: 'Right Stick Y'
};

// Starte die Überprüfung beim Laden
checkForGamepads();
