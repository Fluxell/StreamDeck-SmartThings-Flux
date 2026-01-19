var websocket = null;
var uuid = null;
var actionInfo = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    actionInfo = JSON.parse(inActionInfo);
    websocket = new WebSocket('ws://localhost:' + inPort);

    websocket.onopen = function () {
        var json = {
            event: inRegisterEvent,
            uuid: inUUID
        };
        websocket.send(JSON.stringify(json));

        // Restore settings
        if (actionInfo.payload.settings) {
            document.getElementById('pat').value = actionInfo.payload.settings.pat || "";
            document.getElementById('refreshInterval').value = actionInfo.payload.settings.refreshInterval || "5";
            // We might have a saved deviceID but no list yet.
            // We'll store it in the hidden input or just rely on the user to fetch again if missing.
            //Ideally we auto-fetch if pat is present, but let's wait for button click to avoid rate limits/errors on load.
            const savedDeviceId = actionInfo.payload.settings.deviceId;
            if (savedDeviceId) {
                // Add a temporary option so it shows up
                let select = document.getElementById('deviceSelect');
                let option = document.createElement("option");
                option.text = savedDeviceId; // We don't have the name yet
                option.value = savedDeviceId;
                option.selected = true;
                select.add(option);
            }
        }
    };

    document.getElementById('getDevicesBtn').addEventListener('click', fetchDevices);
    document.getElementById('savePatBtn').addEventListener('click', saveSettings);

    // Display Version
    fetch('manifest.json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('pluginVersion').textContent = data.Version;
        })
        .catch(err => console.error("Could not read manifest version", err));
}

function fetchDevices() {
    var pat = document.getElementById('pat').value;
    if (!pat) {
        alert("Please enter a PAT first.");
        return;
    }

    var btn = document.getElementById('getDevicesBtn');
    btn.textContent = "Fetching...";
    btn.disabled = true;

    fetch('https://api.smartthings.com/v1/devices', {
        headers: {
            "Authorization": `Bearer ${pat}`
        }
    })
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch");
            return response.json();
        })
        .then(data => {
            var select = document.getElementById('deviceSelect');
            // Keep the "Select a device..."
            select.innerHTML = '<option value="">Select a device...</option>';

            if (data.items) {
                data.items.sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name));
                data.items.forEach(device => {
                    var option = document.createElement("option");
                    option.text = device.label || device.name;
                    option.value = device.deviceId;
                    select.add(option);
                });
            }
            btn.textContent = "Get Devices";
            btn.disabled = false;
        })
        .catch(err => {
            console.error(err);
            btn.textContent = "Error";
            setTimeout(() => {
                btn.textContent = "Get Devices";
                btn.disabled = false;
            }, 2000);
        });
}

function saveSettings() {
    var pat = document.getElementById('pat').value;
    var deviceSelect = document.getElementById('deviceSelect');
    var deviceId = deviceSelect.value;
    var refreshInterval = document.getElementById('refreshInterval').value;

    var json = {
        "event": "setSettings",
        "context": uuid,
        "payload": {
            "pat": pat,
            "deviceId": deviceId,
            "refreshInterval": refreshInterval
        }
    };
    websocket.send(JSON.stringify(json));
}
