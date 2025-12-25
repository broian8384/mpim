import { ipcMain } from 'electron';
import { getDB } from '../db.js';

export function setupRequestHandlers() {
    ipcMain.handle('requests:get-all', async () => {
        const db = getDB();
        await db.read();
        return db.data.requests || [];
    });

    ipcMain.handle('requests:create', async (event, data) => {
        const db = getDB();
        await db.read();

        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const pattern = new RegExp(`^ASS\/(\\d{4})\/${month}\/${year}$`);

        let maxSeq = 0;
        const requests = db.data.requests || [];
        requests.forEach(r => {
            if (r.regNumber) {
                const match = r.regNumber.match(pattern);
                if (match) {
                    const seq = parseInt(match[1], 10);
                    if (seq > maxSeq) maxSeq = seq;
                }
            }
        });
        const nextSeq = String(maxSeq + 1).padStart(4, '0');
        const regNumber = `ASS/${nextSeq}/${month}/${year}`;

        const newId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1;

        const newReq = {
            ...data,
            id: newId,
            regNumber,
            createdAt: now.toISOString(),
            history: [{
                date: now.toISOString().split('T')[0], // Creation Date
                status: data.status,
                note: 'Permintaan dibuat baru',
                user: data.receiver,
                timestamp: now.toISOString()
            }]
        };

        if (!db.data.requests) db.data.requests = [];
        db.data.requests.push(newReq);
        await db.write();
        return newReq;
    });

    ipcMain.handle('requests:add-history', async (event, { id, historyItem }) => {
        const db = getDB();
        await db.read();
        const index = db.data.requests.findIndex(r => r.id === id);
        if (index !== -1) {
            const req = db.data.requests[index];
            if (!req.history) req.history = [];
            req.history.push(historyItem);

            // Update main status based on latest history
            req.status = historyItem.status;

            await db.write();
            return req;
        }
        return null;
    });

    ipcMain.handle('requests:update', async (event, data) => {
        const db = getDB();
        await db.read();
        if (!db.data.requests) return null;
        const index = db.data.requests.findIndex(r => r.id === data.id);
        if (index !== -1) {
            db.data.requests[index] = { ...db.data.requests[index], ...data };
            await db.write();
            return db.data.requests[index];
        }
        return null;
    });

    ipcMain.handle('requests:delete', async (event, id) => {
        const db = getDB();
        await db.read();
        if (!db.data.requests) return id;
        db.data.requests = db.data.requests.filter(r => r.id !== id);
        await db.write();
        return id;
    });
}
