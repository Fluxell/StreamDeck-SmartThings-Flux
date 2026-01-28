var websocket = null;
var pluginUUID = null;
var globalSettings = {};
var context = null;

var DestinationEnum = Object.freeze({ HARDWARE_AND_SOFTWARE: 0, HARDWARE_ONLY: 1, SOFTWARE_ONLY: 2 });

var timers = {};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;

    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    function registerPlugin(inPluginUUID) {
        var json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };

        websocket.send(JSON.stringify(json));
    }

    websocket.onopen = function () {
        registerPlugin(pluginUUID);

        // Request Global Settings on startup
        var globalJson = {
            "event": "getGlobalSettings",
            "context": pluginUUID
        };
        websocket.send(JSON.stringify(globalJson));
    };

    websocket.onmessage = function (evt) {
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj['event'];
        var action = jsonObj['action'];
        var context = jsonObj['context'];
        var jsonPayload = jsonObj['payload'] || {};

        if (event == "keyDown") {
            // Refetch status on key press
            fetchStatus(context, settings);
        } else if (event == "willAppear") {
            settings = jsonPayload['settings'];
            fetchStatus(context, settings);
            updateTimer(context, settings);
        } else if (event == "didReceiveSettings") {
            settings = jsonPayload['settings'];
            fetchStatus(context, settings);
            updateTimer(context, settings);
        } else if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload['settings'];
            // We should probably refresh active contexts if we have them, 
            // but for now the timers will pick it up on next tick or keypress.
        }
    };

    websocket.onclose = function () {
        // Websocket is closed
    };
}


function updateTimer(context, settings) {
    if (timers[context]) clearInterval(timers[context]);

    // Default to 5 minutes if not set or invalid
    let intervalMins = parseInt(settings.refreshInterval);
    if (isNaN(intervalMins) || intervalMins < 1) intervalMins = 5;

    let intervalMs = intervalMins * 60 * 1000;

    timers[context] = setInterval(() => fetchStatus(context, settings), intervalMs);
}


function fetchStatus(context, settings) {
    var pat = globalSettings.pat || settings.pat; // Fallback to local if migrating or testing

    if (!pat || !settings.deviceId) {
        setTitle(context, "Setup Req");
        return;
    }

    var url = `https://api.smartthings.com/v1/devices/${settings.deviceId}/status`;

    fetch(url, {
        headers: {
            "Authorization": `Bearer ${pat}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // SmartThings status is complex, looking for main component
            let main = data.components.main;
            let status = "Unknown";
            let isThermostat = false;
            let thermostatMode = null;
            let heatingSetpoint = null;
            let coolingSetpoint = null;

            if (main.thermostatMode && main.temperatureMeasurement) {
                isThermostat = true;
                thermostatMode = main.thermostatMode.thermostatMode.value;
                let temp = main.temperatureMeasurement.temperature.value;
                status = `${temp}°`;

                if (main.thermostatHeatingSetpoint) {
                    heatingSetpoint = main.thermostatHeatingSetpoint.heatingSetpoint.value;
                }
                if (main.thermostatCoolingSetpoint) {
                    coolingSetpoint = main.thermostatCoolingSetpoint.coolingSetpoint.value;
                }
            } else if (main.switch) {
                status = main.switch.switch.value;
                // Capitalize for switch
                status = status.charAt(0).toUpperCase() + status.slice(1);
            } else if (main.contactSensor) {
                status = main.contactSensor.contact.value;
                status = status.charAt(0).toUpperCase() + status.slice(1);
            } else if (main.doorControl) {
                status = main.doorControl.door.value;
                status = status.charAt(0).toUpperCase() + status.slice(1);
            }

            // Update Image
            if (isThermostat) {
                let color = "#D3D3D3"; // Default light grey
                let subText = "";

                if (thermostatMode === 'heat') {
                    color = "#FF0000"; // Bright Red
                    if (heatingSetpoint) subText = `${heatingSetpoint}°`;
                } else if (thermostatMode === 'cool') {
                    color = "#0000FF"; // Medium Blue
                    if (coolingSetpoint) subText = `${coolingSetpoint}°`;
                }

                // Clear title so it doesn't overlap canvas text
                setTitle(context, "");
                renderThermostat(context, color, status, subText);
            } else {
                setTitle(context, status);
                if (status.toLowerCase() === "on") {
                    setImage(context, "on.png");
                } else if (status.toLowerCase() === "off") {
                    setImage(context, "off.png");
                } else {
                    // Revert to default icon if unknown or other state
                    setImage(context, "icon.png");
                }
            }

        })
        .catch(error => {
            console.error("Error fetching status:", error);
            setTitle(context, "Error");
        });
}

function renderThermostat(context, color, mainText, subText) {
    if (websocket) {
        var canvas = document.createElement('canvas');
        canvas.width = 144;
        canvas.height = 144;
        var ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        // Main Text (Current Temp)
        ctx.font = "bold 50px Arial";
        // If subtext exists, move main text up slightly
        let mainY = subText ? 80 : 90;
        ctx.fillText(mainText, canvas.width / 2, mainY);

        // Sub Text (Setpoint)
        if (subText) {
            ctx.font = "30px Arial";
            ctx.fillText(subText, canvas.width / 2, 120);
        }

        var dataURL = canvas.toDataURL('image/png');

        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                "image": dataURL,
                "target": DestinationEnum.HARDWARE_AND_SOFTWARE
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function sendColor(context, color) {
    if (websocket) {
        var canvas = document.createElement('canvas');
        canvas.width = 144;
        canvas.height = 144;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var dataURL = canvas.toDataURL('image/png');

        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                "image": dataURL,
                "target": DestinationEnum.HARDWARE_AND_SOFTWARE
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function setTitle(context, title) {
    if (websocket) {
        var json = {
            "event": "setTitle",
            "context": context,
            "payload": {
                "title": title,
                "target": DestinationEnum.HARDWARE_AND_SOFTWARE
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function setImage(context, imageName) {
    if (websocket) {
        // We typically need to load the image as base64, 
        // OR if the image is in the plugin folder, we might rely on the States in manifest,
        // BUT dynamic image loading usually requires SetImage with base64 data.

        // However, loading base64 from file in JS environment (StreamDeck uses CEF) requires FileReader or Canvas.
        // A simpler way for a "local" file in the plugin folder is often not directly supported by 'setImage' 
        // passing a path. It expects a Data URI.

        // Let's implement a helper to load image and send.
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL('image/png');

            var json = {
                "event": "setImage",
                "context": context,
                "payload": {
                    "image": dataURL,
                    "target": DestinationEnum.HARDWARE_AND_SOFTWARE
                }
            };
            websocket.send(JSON.stringify(json));
        };
        img.src = imageName;
    }
}
