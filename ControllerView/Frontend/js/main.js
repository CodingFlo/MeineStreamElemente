import { UIManager } from './ui-manager.js';

// Nutze die io Instanz von der Socket-Library
const socket = io('http://localhost:3001');

socket.on('connect', () => console.log("Overlay mit Server verbunden!"));

// Wir hören nur auf das, was der Server uns schickt
socket.on('controller-input', (data) => {
    if (data.type === 'button') {
        UIManager.updateButton(data.button, data.pressed);
    } else if (data.type === 'axis') {
        UIManager.updateJoystick(data.axis, data.value);
    }
});