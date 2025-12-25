import { ipcMain } from 'electron';
import { getDB } from '../db.js';

export function setupUserHandlers() {
    ipcMain.handle('users:get-all', async () => {
        const db = getDB();
        await db.read();
        return db.data.users;
    });

    ipcMain.handle('users:create', async (event, user) => {
        const db = getDB();
        await db.read();
        const newId = db.data.users.length > 0 ? Math.max(...db.data.users.map(u => u.id)) + 1 : 1;
        const newUser = { ...user, id: newId };
        db.data.users.push(newUser);
        await db.write();
        return { id: newId, ...user };
    });

    ipcMain.handle('users:update', async (event, user) => {
        const db = getDB();
        await db.read();
        const index = db.data.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            db.data.users[index] = { ...db.data.users[index], ...user };
            await db.write();
        }
        return user;
    });

    ipcMain.handle('users:delete', async (event, id) => {
        const db = getDB();
        await db.read();
        db.data.users = db.data.users.filter(u => u.id !== id);
        await db.write();
        return id;
    });
}
