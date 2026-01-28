require('dotenv').config();
const fs = require('fs');
const path = require('path');

const PAT = process.env.SMARTTHINGS_PAT;
const TARGET_DEVICE_NAME = "Thelma";
const OUT_FILE = path.join(__dirname, '../data/thelma.json');

if (!PAT) {
    console.error("Error: SMARTTHINGS_PAT must be set in .env file.");
    process.exit(1);
}

console.log(`Searching for device: ${TARGET_DEVICE_NAME}...`);

// Step 1: Find the device ID
fetch('https://api.smartthings.com/v1/devices', {
    headers: {
        "Authorization": `Bearer ${PAT}`
    }
})
    .then(res => {
        if (!res.ok) throw new Error(`List devices failed: ${res.status} ${res.statusText}`);
        return res.json();
    })
    .then(data => {
        const device = data.items.find(d => (d.label === TARGET_DEVICE_NAME || d.name === TARGET_DEVICE_NAME));

        if (!device) {
            throw new Error(`Device '${TARGET_DEVICE_NAME}' not found.`);
        }

        console.log(`Found device: ${device.label || device.name} (${device.deviceId})`);
        return device.deviceId;
    })
    .then(deviceId => {
        // Step 2: Fetch full device details
        return fetch(`https://api.smartthings.com/v1/devices/${deviceId}`, {
            headers: {
                "Authorization": `Bearer ${PAT}`
            }
        });
    })
    .then(res => {
        if (!res.ok) throw new Error(`Get device details failed: ${res.status} ${res.statusText}`);
        return res.json();
    })
    .then(deviceData => {
        // Step 3: Save to file
        fs.writeFileSync(OUT_FILE, JSON.stringify(deviceData, null, 4));
        console.log(`Device data saved to ${OUT_FILE}`);
    })
    .catch(err => {
        console.error("Error:", err.message);
        process.exit(1);
    });
