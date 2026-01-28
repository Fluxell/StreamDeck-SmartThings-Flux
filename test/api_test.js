require('dotenv').config();

const PAT = process.env.SMARTTHINGS_PAT;
const DEVICE_ID = process.env.DEVICE_ID;

if (!PAT || !DEVICE_ID) {
    console.error("Error: SMARTTHINGS_PAT and DEVICE_ID must be set in .env file.");
    process.exit(1);
}


console.log(`Resolving device with ID/Label from env...`);

async function checkStatus() {
    try {
        // Step 1: Resolve Name to ID
        const devicesRes = await fetch('https://api.smartthings.com/v1/devices', {
            headers: { "Authorization": `Bearer ${PAT}` }
        });

        if (!devicesRes.ok) throw new Error(`Failed to list devices: ${devicesRes.status}`);

        const devicesData = await devicesRes.json();
        const device = devicesData.items.find(d =>
            d.deviceId === DEVICE_ID ||
            d.label === DEVICE_ID ||
            d.name === DEVICE_ID
        );

        if (!device) {
            console.error(`Error: Device '${DEVICE_ID}' not found.`);
            console.log("Available devices:");
            devicesData.items.forEach(d => console.log(` - ${d.label || d.name} (${d.deviceId})`));
            process.exit(1);
        }

        const actualDeviceId = device.deviceId;
        console.log(`Found device: ${device.label || device.name} (${actualDeviceId})`);

        // Step 2: Get Status
        const url = `https://api.smartthings.com/v1/devices/${actualDeviceId}/status`;
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${PAT}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Successfully fetched status!");

        let main = data.components.main;
        let status = "Unknown";

        if (main.switch) {
            status = `Switch: ${main.switch.switch.value}`;
        } else if (main.contactSensor) {
            status = `Contact: ${main.contactSensor.contact.value}`;
        } else if (main.doorControl) {
            status = `Door: ${main.doorControl.door.value}`;
        } else {
            // Fallback to inspect keys
            status = `Components found: ${Object.keys(main).join(", ")}`;
        }

        console.log(`Device Status: ${status}`);

    } catch (error) {
        console.error("API Test Failed:", error);
        process.exit(1);
    }
}

checkStatus();
