const HID = require('node-hid');

function start(onInputCallback) {
    const VENDOR_ID = 2046;  // 0x057e
    const PRODUCT_ID = 8201; // 0x2009

    try {
        const device = new HID.HID(VENDOR_ID, PRODUCT_ID);
        console.log("✅ Nintendo Pro Controller via node-hid verbunden!");

        device.on("data", (data) => {
            // data ist ein Buffer der rohen USB-Pakete
            // Die Offsets können je nach Firmware leicht variieren, 
            // dies sind die Standard-Offsets für den Pro Controller:

            // 1. Buttons (Beispiel-Extraktion aus den Bytes)
            // Byte 3 und 4 enthalten meist die Button-Zustände
            const buttons1 = data[3];
            const buttons2 = data[4];

            // Wir senden beispielhaft Button 0 (A), wenn Bit 1 gesetzt ist
            // In einer vollen Version müsstest du hier alle Bits prüfen
            onInputCallback({
                type: 'button',
                button: 0,
                pressed: (buttons1 & 0x08) !== 0
            });

            // 2. Achsen (Sticks)
            // Byte 6-9 enthalten oft die Stick-Daten (0-255)
            const leftX = data[6];
            const leftY = data[7];

            onInputCallback({
                type: 'axis',
                axis: 0,
                value: (leftX / 128) - 1
            });
            onInputCallback({
                type: 'axis',
                axis: 1,
                value: (leftY / 128) - 1
            });
        });

        device.on("error", (err) => {
            console.error("HID Error:", err);
        });

    } catch (e) {
        console.error("❌ Hardware-Reader Fehler:", e.message);
        console.log("Stelle sicher, dass der Controller verbunden ist und nicht von Steam blockiert wird.");
    }
}

module.exports = { start };