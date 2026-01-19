const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
console.log(`Looking for .env at: ${envPath}`);

if (fs.existsSync(envPath)) {
    console.log(".env file exists.");
    try {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        console.log("Keys found in .env:", Object.keys(envConfig));
    } catch (e) {
        console.error("Error parsing .env:", e);
    }
} else {
    console.error(".env file NOT found.");
}

require('dotenv').config();
console.log("process.env.DEVICE_ID type:", typeof process.env.DEVICE_ID);
console.log("process.env.SMARTTHINGS_PAT type:", typeof process.env.SMARTTHINGS_PAT);
