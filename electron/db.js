import path from 'path';
import { JSONFilePreset } from 'lowdb/node';

// Safe import for Electron 'app'
let app;
try {
    // Only try to import electron if we are in an electron process
    if (process.versions.electron) {
        const electron = await import('electron');
        app = electron.app;
    }
} catch (e) {
    // Ignore error, we are in Node server mode
    console.log("Running in Node Server mode (no Electron)");
}

let db;

export async function initDB() {
    let dbPath;

    if (app) {
        dbPath = path.join(app.getPath('userData'), 'mpim-db.json');
    } else {
        // Fallback for Node Server (Windows typically)
        const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
        // We assume the same folder structure as Electron: AppData/Roaming/<AppName>
        // Note: Electron usually uses 'productName' or 'name' from package.json.
        // Let's assume 'mpim' based on package name, or check if folder exists.
        const appName = 'mpim'; // Must match whatever Electron uses. Usually 'mpim' if not set in build.
        dbPath = path.join(appData, appName, 'mpim-db.json');
    }
    const defaultData = {
        users: [], // Empty - will be created via Setup Wizard
        requests: [],
        doctors: [], // Empty - user adds their own
        insurances: [], // Empty - user adds their own
        services: [], // Empty - user adds their own
        settings: {
            isSetupComplete: false, // Flag for first-time setup
            appName: 'MPIM System',
            hospitalName: '',
            address: '',
            phone: '',
            email: '',
            logo: null, // Base64 string
            // Print Footer Settings
            printFooter: {
                reminder: 'HARAP MEMBAWA TANDA TERIMA SAAT PENGAMBILAN DOKUMEN.',
                workDays: 'Senin s.d Sabtu',
                workHours: '08.00 s.d 16.00 WIB',
                contactInfo: ''
            }
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

    // Migration: Ensure doctors array exists (empty)
    if (!db.data.doctors) {
        db.data.doctors = [];
        hasChanges = true;
    }

    // Migration: Ensure insurances array exists (empty)
    if (!db.data.insurances) {
        db.data.insurances = [];
        hasChanges = true;
    }

    // Migration: Ensure services array exists (empty)
    if (!db.data.services) {
        db.data.services = [];
        hasChanges = true;
    }

    // Migration: Ensure handoverNotes array exists (empty)
    if (!db.data.handoverNotes) {
        db.data.handoverNotes = [];
        hasChanges = true;
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
