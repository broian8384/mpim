import path from 'path';
import { app } from 'electron';
import { JSONFilePreset } from 'lowdb/node';

let db;

export async function initDB() {
    const dbPath = path.join(app.getPath('userData'), 'mpim-db.json');
    const defaultData = {
        users: [
            { id: 1, name: 'Super Admin', email: 'admin@hospital.com', username: 'superadmin', role: 'Super Admin', status: 'Active', joinDate: '2025-01-01', password: '123456' },
            { id: 2, name: 'James Carter', email: 'james.c@hospital.com', username: 'james.c', role: 'Admin', status: 'Active', joinDate: '2024-02-01', password: 'admin' },
            { id: 3, name: 'Emily Chen', email: 'emily.c@hospital.com', username: 'emily.c', role: 'Staff', status: 'Inactive', joinDate: '2024-03-10', password: 'staff' }
        ],
        requests: [],
        settings: {
            appName: 'MPIM System',
            hospitalName: 'NAMA RUMAH SAKIT',
            address: 'Alamat Lengkap Instansi, Kota, Kode Pos',
            phone: '(021) ...............',
            email: 'info@rumah-sakit.com',
            logo: null // Base64 string
        }
    };
    db = await JSONFilePreset(dbPath, defaultData);

    // Migration Logic
    let hasChanges = false;

    // Ensure settings object
    if (!db.data.settings) {
        db.data.settings = {
            appName: 'MPIM System',
            hospitalName: 'NAMA RUMAH SAKIT',
            address: 'Alamat Lengkap Instansi, Kota, Kode Pos',
            phone: '(021) ...............',
            email: 'info@rumah-sakit.com',
            logo: null
        };
        hasChanges = true;
    }

    if (!db.data.requests) {
        db.data.requests = [];
        hasChanges = true;
    } else {
        // Migration: Ensure 'history' array exists for existing requests
        db.data.requests = db.data.requests.map(r => {
            if (!r.history) {
                hasChanges = true;
                return {
                    ...r,
                    history: [{
                        date: r.date || r.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                        status: r.status,
                        note: 'Initial record (Migrated)',
                        user: r.receiver || 'System',
                        timestamp: r.createdAt || new Date().toISOString()
                    }]
                };
            }
            return r;
        });
    }

    // Ensure passwords and usernames (Standard Migration)
    db.data.users = db.data.users.map(u => {
        let updated = false;
        let userData = { ...u };

        // Default password if missing
        if (!userData.password) {
            updated = true;
            userData.password = '123456';
        }

        // Default username from email if missing
        if (!userData.username && userData.email) {
            updated = true;
            userData.username = userData.email.split('@')[0];
        }

        if (updated) {
            hasChanges = true;
            return userData;
        }
        return u;
    });

    if (hasChanges) {
        console.log("Migrating database (added usernames/passwords)...");
        await db.write();
    }
    console.log("Database initialized at:", dbPath);
    return db;
}

export function getDB() {
    if (!db) {
        throw new Error("Database not initialized. Call initDB() first.");
    }
    return db;
}
