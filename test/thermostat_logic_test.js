const assert = require('assert');

console.log("Running Thermostat Logic Test...");

// 1. Mock Data (Generic Thermostat)
const mockData = {
    components: {
        main: {
            thermostatMode: {
                thermostatMode: { value: "heat" }
            },
            temperatureMeasurement: {
                temperature: { value: 70 }
            },
            thermostatHeatingSetpoint: {
                heatingSetpoint: { value: 70 }
            },
            thermostatCoolingSetpoint: {
                coolingSetpoint: { value: 75 }
            }
        }
    }
};

// Fix initial mock data to verify "heat" logic first
mockData.components.main.thermostatMode.thermostatMode.value = "heat";

const main = mockData.components.main;

// Logic to test (mimicking plugin.js)
let status = "Unknown";
let isThermostat = false;
let thermostatMode = null;
let color = null;
let heatingSetpoint = null;
let coolingSetpoint = null;
let subText = "";

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
    status = status.charAt(0).toUpperCase() + status.slice(1);
}

if (isThermostat) {
    color = "#D3D3D3"; // Default light grey
    if (thermostatMode === 'heat') {
        color = "#FF0000"; // Bright Red
        if (heatingSetpoint) subText = `${heatingSetpoint}°`;
    } else if (thermostatMode === 'cool') {
        color = "#0000FF"; // Medium Blue
        if (coolingSetpoint) subText = `${coolingSetpoint}°`;
    }
}

// Assertions for Heat
console.log(`Detected Mode: ${thermostatMode}`);
console.log(`Detected Status (Temp): ${status}`);
console.log(`Detected Setpoint (SubText): ${subText}`);
console.log(`Detected Color: ${color}`);

try {
    assert.strictEqual(isThermostat, true, "Should identify as thermostat");
    assert.strictEqual(thermostatMode, "heat", "Mode should be heat");
    assert.strictEqual(status, "70°", "Status should be 70°");
    assert.strictEqual(heatingSetpoint, 70, "Heating Setpoint should be 70");
    assert.strictEqual(subText, "70°", "Sub Text should be 70°");
    assert.strictEqual(color, "#FF0000", "Color should be Red (#FF0000)");
    console.log("PASS: Heat Mode Test");
} catch (e) {
    console.error("FAIL: Heat Mode Test", e.message);
    process.exit(1);
}

// 2. Test Cool Mode
console.log("\nTesting Cool Mode...");
main.thermostatMode.thermostatMode.value = "cool";
main.temperatureMeasurement.temperature.value = 75;
main.thermostatCoolingSetpoint.coolingSetpoint.value = 78;

// Reset vars
thermostatMode = null;
subText = "";
heatingSetpoint = null;
coolingSetpoint = null;

// Re-run logic
if (main.thermostatMode && main.temperatureMeasurement) {
    thermostatMode = main.thermostatMode.thermostatMode.value;
    let temp = main.temperatureMeasurement.temperature.value;
    status = `${temp}°`;

    if (main.thermostatHeatingSetpoint) {
        heatingSetpoint = main.thermostatHeatingSetpoint.heatingSetpoint.value;
    }
    if (main.thermostatCoolingSetpoint) {
        coolingSetpoint = main.thermostatCoolingSetpoint.coolingSetpoint.value;
    }
}

if (thermostatMode === 'heat') {
    color = "#FF0000";
    if (heatingSetpoint) subText = `${heatingSetpoint}°`;
} else if (thermostatMode === 'cool') {
    color = "#0000FF";
    if (coolingSetpoint) subText = `${coolingSetpoint}°`;
} else {
    color = "#D3D3D3";
}

try {
    assert.strictEqual(thermostatMode, "cool");
    assert.strictEqual(status, "75°");
    assert.strictEqual(coolingSetpoint, 78, "Cooling Setpoint should be 78");
    assert.strictEqual(subText, "78°", "Sub Text should be 78°");
    assert.strictEqual(color, "#0000FF", "Color should be Blue");
    console.log("PASS: Cool Mode Test");
} catch (e) {
    console.error("FAIL: Cool Mode Test", e.message);
    process.exit(1);
}

// 3. Test Other Mode (Off)
console.log("\nTesting Off Mode...");
main.thermostatMode.thermostatMode.value = "off";
subText = "";

if (main.thermostatMode && main.temperatureMeasurement) {
    thermostatMode = main.thermostatMode.thermostatMode.value;
}

if (thermostatMode === 'heat') {
    color = "#FF0000";
} else if (thermostatMode === 'cool') {
    color = "#0000FF";
} else {
    color = "#D3D3D3";
}

try {
    assert.strictEqual(thermostatMode, "off");
    assert.strictEqual(subText, "", "Sub Text should be empty");
    assert.strictEqual(color, "#D3D3D3", "Color should be Grey");
    console.log("PASS: Off Mode Test");
} catch (e) {
    console.error("FAIL: Off Mode Test", e.message);
    process.exit(1);
}
