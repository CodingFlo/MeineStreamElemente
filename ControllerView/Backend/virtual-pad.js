let virtualEnabled = false;
let virtualPad = null;

function init() {
    try {
        const vgamepad = require('vgamepad');
        virtualPad = new vgamepad.Controller();
        virtualPad.connect();
        virtualEnabled = true;
        console.log('Virtual Pad: vgamepad connected');
    } catch (e) {
        // Fallback vigemclient etc. hier möglich
    }
}

function forward(data) {
    if (!virtualEnabled || !virtualPad) return;
    // Deine Mapping-Logik (button/axis) von oben hier rein...
}

module.exports = { init, forward };