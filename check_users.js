import fs from 'fs';
import path from 'path';

const appData = process.env.APPDATA;
const dbPath = path.join(appData, 'mpim', 'mpim-db.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log("Users found:", data.users.length);
    data.users.forEach(u => {
        console.log(`ID: ${u.id}, Name: '${u.name}', Username: '${u.username}', Email: '${u.email}'`);
    });
} catch (err) {
    console.error('Error:', err);
}
