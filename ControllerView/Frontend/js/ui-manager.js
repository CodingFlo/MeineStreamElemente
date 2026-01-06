import { CONFIG } from './config.js';

export const UIManager = {
    updateButton(buttonNum, pressed) {
        const els = document.querySelectorAll(`[data-button="${buttonNum}"]`);
        els.forEach(el => {
            el.classList.toggle('pressed', pressed);
            el.style.animation = pressed ? 'buttonPress 0.2s ease' : '';
        });
    },

    updateJoystick(axisNum, value) {
        const isLeft = axisNum <= 1;
        const stick = document.getElementById(isLeft ? 'leftStick' : 'rightStick');
        if (!stick) return;

        const isX = (axisNum === 0 || axisNum === 2);
        const val = Math.abs(value) < CONFIG.DEADZONE ? 0 : value;

        // Speichere Achsen-Werte direkt am Element
        if (isX) stick.dataset.x = val; else stick.dataset.y = val;

        const x = parseFloat(stick.dataset.x || 0) * CONFIG.STICK_MAX;
        const y = parseFloat(stick.dataset.y || 0) * CONFIG.STICK_MAX;

        // Kreis-Begrenzung (Pythagoras)
        const dist = Math.sqrt(x * x + y * y);
        let finalX = x, finalY = y;
        if (dist > CONFIG.STICK_MAX) {
            const angle = Math.atan2(y, x);
            finalX = Math.cos(angle) * CONFIG.STICK_MAX;
            finalY = Math.sin(angle) * CONFIG.STICK_MAX;
        }

        stick.style.transform = `translate(${finalX}px, ${finalY}px)`;
    }
};