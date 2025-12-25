import fs from 'fs';
import path from 'path';
import os from 'os';

const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
const dbPath = path.join(appData, 'mpim', 'mpim-db.json');

try {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        console.log(data);
    } else {
        console.log("DB file not found at", dbPath);
    }
} catch (err) {
    console.error('Error reading DB:', err);
}
