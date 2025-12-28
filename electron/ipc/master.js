import { ipcMain } from 'electron';
import { getDB } from '../db.js';

export function setupMasterHandlers() {
    // ======= DOCTORS =======
    ipcMain.handle('master:get-doctors', async () => {
        const db = getDB();
        return db.data.doctors || [];
    });

    ipcMain.handle('master:save-doctors', async (_event, doctors) => {
        const db = getDB();
        db.data.doctors = doctors;
        await db.write();
        return db.data.doctors;
    });

    // ======= INSURANCES =======
    ipcMain.handle('master:get-insurances', async () => {
        const db = getDB();
        return db.data.insurances || [];
    });

    ipcMain.handle('master:save-insurances', async (_event, insurances) => {
        const db = getDB();
        db.data.insurances = insurances;
        await db.write();
        return db.data.insurances;
    });

    // ======= SERVICES =======
    ipcMain.handle('master:get-services', async () => {
        const db = getDB();
        return db.data.services || [];
    });

    ipcMain.handle('master:save-services', async (_event, services) => {
        const db = getDB();
        db.data.services = services;
        await db.write();
        return db.data.services;
    });

    // ======= REQUEST PURPOSES (KEPERLUAN) =======
    ipcMain.handle('master:get-request-purposes', async () => {
        const db = getDB();
        return db.data.requestPurposes || [];
    });

    ipcMain.handle('master:save-request-purposes', async (_event, requestPurposes) => {
        const db = getDB();
        db.data.requestPurposes = requestPurposes;
        await db.write();
        return db.data.requestPurposes;
    });
}
