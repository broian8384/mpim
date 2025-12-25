import { ipcMain } from 'electron';
import { getDB } from '../db.js';

export function setupSettingsHandlers() {
    // Get Settings
    ipcMain.handle('settings:get', async () => {
        const db = getDB();
        return db.data.settings;
    });

    // Update Settings
    ipcMain.handle('settings:update', async (_event, newSettings) => {
        const db = getDB();
        db.data.settings = { ...db.data.settings, ...newSettings };
        await db.write();
        return db.data.settings;
    });
}
