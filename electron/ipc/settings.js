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

    // Reset Database with selective options
    ipcMain.handle('settings:reset-database', async (_event, options = {}) => {
        try {
            const db = getDB();
            await db.read();

            const resetItems = [];

            // Default options if not provided
            const resetOptions = {
                requests: options.requests ?? true,
                users: options.users ?? true,
                doctors: options.doctors ?? false,
                insurances: options.insurances ?? false,
                services: options.services ?? false,
                activityLog: options.activityLog ?? true
            };

            // Reset Requests
            if (resetOptions.requests) {
                db.data.requests = [];
                resetItems.push('permintaan');
            }

            // Reset Users (keep only Super Admin)
            if (resetOptions.users) {
                const superAdmin = db.data.users.find(u => u.role === 'Super Admin');
                const defaultSuperAdmin = {
                    id: 1,
                    name: 'Super Admin',
                    email: 'admin@hospital.com',
                    username: 'superadmin',
                    role: 'Super Admin',
                    status: 'Active',
                    joinDate: new Date().toISOString().split('T')[0],
                    password: '123456'
                };
                db.data.users = [superAdmin || defaultSuperAdmin];
                resetItems.push('users non-admin');
            }

            // Reset Doctors
            if (resetOptions.doctors) {
                db.data.doctors = [];
                resetItems.push('dokter');
            }

            // Reset Insurances
            if (resetOptions.insurances) {
                db.data.insurances = [];
                resetItems.push('asuransi');
            }

            // Reset Services
            if (resetOptions.services) {
                db.data.services = [];
                resetItems.push('layanan');
            }

            // Activity log is handled in frontend (localStorage), not in LowDB

            await db.write();

            return {
                success: true,
                message: `Berhasil mereset: ${resetItems.join(', ')}`
            };
        } catch (error) {
            console.error('Reset Database Error:', error);
            return {
                success: false,
                message: 'Gagal mereset database: ' + error.message
            };
        }
    });
}
