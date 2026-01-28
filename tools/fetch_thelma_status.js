require('dotenv').config();
const fs = require('fs');
const path = require('path');

const PAT = process.env.SMARTTHINGS_PAT;
const TARGET_DEVICE_NAME = "Thelma";
const OUT_FILE = path.join(__dirname, '../data/thelma_status.json');

if (!PAT) {
    console.error("Error: SMARTTHINGS_PAT must be set in .env file.");
    process.exit(1);
}

// 1. Find Device ID (we'll just use the one we processed earlier or fetch again for safety)
// For simplicity, let's just fetch IDs again to be self-contained.
fetch('https://api.smartthings.com/v1/devices', {
    headers: { "Authorization": `Bearer ${PAT}` }
})
    .then(res => res.json())
    .then(data => {
        const device = data.items.find(d => (d.label === TARGET_DEVICE_NAME || d.name === TARGET_DEVICE_NAME));
        if (!device) throw new Error(`Device '${TARGET_DEVICE_NAME}' not found.`);
        return device.deviceId;
    })
    .then(deviceId => {
        return fetch(`https://api.smartthings.com/v1/devices/${deviceId}/status`, {
            headers: { "Authorization": `Bearer ${PAT}` }
        });
    })
    .then(res => {
        if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
        return res.json();
    })
    .then(statusData => {
        fs.writeFileSync(OUT_FILE, JSON.stringify(statusData, null, 4));
        console.log(`Status saved to ${OUT_FILE}`);
    })
    .catch(err => console.error("Error:", err));
