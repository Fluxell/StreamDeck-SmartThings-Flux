require('dotenv').config();

const PAT = process.env.SMARTTHINGS_PAT;

if (!PAT) {
    console.error("Error: SMARTTHINGS_PAT must be set in .env file.");
    process.exit(1);
}

console.log("Fetching devices...");

fetch('https://api.smartthings.com/v1/devices', {
    headers: {
        "Authorization": `Bearer ${PAT}`
    }
})
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.items && data.items.length > 0) {
            console.log("\nFound Devices:");
            console.log("---------------------------------------------------");
            console.log(`${"Name".padEnd(30)} | ${"ID"}`);
            console.log("---------------------------------------------------");
            data.items.forEach(device => {
                console.log(`${device.label || device.name}`.padEnd(30) + ` | ${device.deviceId}`);
            });
            console.log("---------------------------------------------------");
        } else {
            console.log("No devices found.");
        }
    })
    .catch(err => console.error("Error fetching devices:", err));
