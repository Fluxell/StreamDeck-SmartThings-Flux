var websocket = null;
var pluginUUID = null;
var settings = {};
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
    if (!settings.pat || !settings.deviceId) {
        setTitle(context, "Setup Required");
        return;
    }

    var url = `https://api.smartthings.com/v1/devices/${settings.deviceId}/status`;

    fetch(url, {
        headers: {
            "Authorization": `Bearer ${settings.pat}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Simple logic to find "switch" or "contactSensor" status
            // SmartThings status is complex, looking for main component
            let main = data.components.main;
            let status = "Unknown";

            if (main.switch) {
                status = main.switch.switch.value;
            } else if (main.contactSensor) {
                status = main.contactSensor.contact.value;
            } else if (main.doorControl) {
                status = main.doorControl.door.value;
            }

            // Capitalize
            status = status.charAt(0).toUpperCase() + status.slice(1);
            setTitle(context, status);

            // Update Image
            if (status.toLowerCase() === "on") {
                setImage(context, "on.png");
            } else if (status.toLowerCase() === "off") {
                setImage(context, "off.png");
            } else {
                // Revert to default icon if unknown or other state
                setImage(context, "icon.png");
            }

        })
        .catch(error => {
            console.error("Error fetching status:", error);
            setTitle(context, "Error");
        });
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
