import fs from 'fs';
import path from 'path';

const appData = process.env.APPDATA;
const dbPath = path.join(appData, 'mpim', 'mpim-db.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    data.users.forEach(u => {
        const hasUsername = u.hasOwnProperty('username');
        console.log(`[${u.id}] Name:${u.name} | User:${hasUsername ? u.username : 'MISSING'} | Email:${u.email}`);
    });
} catch (err) {
    console.error('Error:', err);
}
