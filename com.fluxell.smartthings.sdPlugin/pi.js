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

        // Request Global Settings
        var globalJson = {
            "event": "getGlobalSettings",
            "context": uuid
        };
        websocket.send(JSON.stringify(globalJson));

        // Restore local settings
        if (actionInfo.payload.settings) {
            document.getElementById('refreshInterval').value = actionInfo.payload.settings.refreshInterval || "5";
            // We might have a saved deviceID but no list yet.
            // We'll store it in the hidden input or just rely on the user to fetch again if missing.
            //Ideally we auto-fetch if pat is present, but let's wait for button click to avoid rate limits/errors on load.
            const savedDeviceId = actionInfo.payload.settings.deviceId;
            if (savedDeviceId) {
                // Add a temporary option so it shows up
                let select = document.getElementById('deviceSelect');
                let option = document.createElement("option");
                option.text = savedDeviceId; // Name not available yet
                option.value = savedDeviceId;
                option.selected = true;
                select.add(option);
            }
        }
    };

    websocket.onmessage = function (evt) {
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj['event'];
        var payload = jsonObj['payload'];

        if (event == "didReceiveGlobalSettings") {
            if (payload.settings && payload.settings.pat) {
                document.getElementById('pat').value = payload.settings.pat;
            }
        }
    };

    document.getElementById('getDevicesBtn').addEventListener('click', fetchDevices);
    document.getElementById('savePatBtn').addEventListener('click', saveSettings);
    document.getElementById('togglePatBtn').addEventListener('click', togglePatVisibility);

    // Display Version
    fetch('manifest.json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('pluginVersion').textContent = data.Version;
        })
        .catch(err => console.error("Could not read manifest version", err));
}

function togglePatVisibility() {
    var patInput = document.getElementById('pat');
    var btn = document.getElementById('togglePatBtn');

    // SVGs
    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeSlashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    if (patInput.type === "password") {
        patInput.type = "text";
        btn.innerHTML = eyeSlashIcon;
    } else {
        patInput.type = "password";
        btn.innerHTML = eyeIcon;
    }
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
        .then(async response => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`${response.status} ${response.statusText}: ${text}`);
            }
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

                // Reselect if we have one saved
                if (actionInfo.payload.settings && actionInfo.payload.settings.deviceId) {
                    select.value = actionInfo.payload.settings.deviceId;
                }
            }
            btn.textContent = "Get Devices";
            btn.disabled = false;
        })
        .catch(err => {
            console.error(err);
            alert("Error fetching devices:\n" + err.message);
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

    // Save Local Settings
    var json = {
        "event": "setSettings",
        "context": uuid,
        "payload": {
            "deviceId": deviceId,
            "refreshInterval": refreshInterval
        }
    };
    websocket.send(JSON.stringify(json));

    // Save Global Settings (PAT)
    var globalJson = {
        "event": "setGlobalSettings",
        "context": uuid,
        "payload": {
            "pat": pat
        }
    };
    websocket.send(JSON.stringify(globalJson));
}
