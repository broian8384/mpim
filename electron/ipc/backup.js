import { ipcMain, app } from 'electron';
import { getDB } from '../db.js';
import path from 'path';
import fs from 'fs';

let autoBackupInterval = null;

export function setupBackupHandlers() {
    // Get backup folder path
    const getBackupPath = () => {
        const backupDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        return backupDir;
    };

    // Create a backup
    ipcMain.handle('backup:create', async (_event, isAutomatic = false) => {
        try {
            const db = getDB();
            const backupDir = getBackupPath();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${isAutomatic ? 'auto' : 'manual'}_${timestamp}.json`;
            const filepath = path.join(backupDir, filename);

            const backupData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                isAutomatic,
                data: db.data
            };

            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

            // Clean old backups based on retention
            const settings = db.data.settings?.autoBackup || {};
            const retention = settings.retention || 7;
            await cleanOldBackups(backupDir, retention);

            return {
                success: true,
                message: `Backup berhasil disimpan: ${filename}`,
                path: filepath
            };
        } catch (error) {
            console.error('Backup Error:', error);
            return {
                success: false,
                message: 'Gagal membuat backup: ' + error.message
            };
        }
    });

    // List all backups
    ipcMain.handle('backup:list', async () => {
        try {
            const backupDir = getBackupPath();
            const files = fs.readdirSync(backupDir)
                .filter(f => f.endsWith('.json') && f.startsWith('backup_'))
                .map(f => {
                    const filepath = path.join(backupDir, f);
                    const stats = fs.statSync(filepath);
                    return {
                        name: f,
                        path: filepath,
                        size: stats.size,
                        createdAt: stats.mtime,
                        isAutomatic: f.includes('_auto_')
                    };
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return { success: true, backups: files, backupPath: backupDir };
        } catch (error) {
            return { success: false, backups: [], message: error.message };
        }
    });

    // Restore from backup
    ipcMain.handle('backup:restore', async (_event, filepath) => {
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            const backupData = JSON.parse(content);

            if (!backupData.data) {
                throw new Error('Format backup tidak valid');
            }

            const db = getDB();
            // Preserve superadmin
            const superAdmin = db.data.users?.find(u => u.role === 'Super Admin');

            db.data = backupData.data;

            // Ensure superadmin exists
            if (superAdmin && !db.data.users.some(u => u.role === 'Super Admin')) {
                db.data.users.push(superAdmin);
            }

            await db.write();

            return {
                success: true,
                message: 'Data berhasil di-restore dari backup'
            };
        } catch (error) {
            console.error('Restore Error:', error);
            return {
                success: false,
                message: 'Gagal restore: ' + error.message
            };
        }
    });

    // Delete backup
    ipcMain.handle('backup:delete', async (_event, filepath) => {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            return { success: true, message: 'Backup berhasil dihapus' };
        } catch (error) {
            return { success: false, message: 'Gagal menghapus: ' + error.message };
        }
    });

    // Get auto-backup settings
    ipcMain.handle('backup:get-settings', async () => {
        const db = getDB();
        return db.data.settings?.autoBackup || {
            enabled: false,
            frequency: 'daily', // daily, weekly
            time: '00:00',
            retention: 7, // days to keep
            lastBackup: null
        };
    });

    // Update auto-backup settings
    ipcMain.handle('backup:update-settings', async (_event, settings) => {
        const db = getDB();
        if (!db.data.settings) db.data.settings = {};
        db.data.settings.autoBackup = { ...db.data.settings.autoBackup, ...settings };
        await db.write();

        // Restart scheduler with new settings
        startAutoBackupScheduler();

        return db.data.settings.autoBackup;
    });
}

// Clean old backups based on retention period
async function cleanOldBackups(backupDir, retentionDays) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.json') && f.includes('_auto_'));

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        for (const file of files) {
            const filepath = path.join(backupDir, file);
            const stats = fs.statSync(filepath);
            if (stats.mtime < cutoffDate) {
                fs.unlinkSync(filepath);
                console.log(`Deleted old backup: ${file}`);
            }
        }
    } catch (error) {
        console.error('Clean old backups error:', error);
    }
}

// Start auto-backup scheduler
export async function startAutoBackupScheduler() {
    // Clear existing interval
    if (autoBackupInterval) {
        clearInterval(autoBackupInterval);
        autoBackupInterval = null;
    }

    try {
        const db = getDB();
        const settings = db.data.settings?.autoBackup;

        if (!settings?.enabled) {
            console.log('Auto-backup is disabled');
            return;
        }

        // Calculate interval based on frequency
        const intervalMs = settings.frequency === 'weekly'
            ? 7 * 24 * 60 * 60 * 1000  // 7 days
            : 24 * 60 * 60 * 1000;      // 1 day

        console.log(`Auto-backup scheduled: ${settings.frequency}, next in ${intervalMs / 1000 / 60 / 60} hours`);

        // Perform backup immediately if last backup is older than interval
        const lastBackup = settings.lastBackup ? new Date(settings.lastBackup) : null;
        const now = new Date();

        if (!lastBackup || (now - lastBackup) >= intervalMs) {
            console.log('Performing auto-backup now...');
            await performAutoBackup(db);
        }

        // Set interval for future backups
        autoBackupInterval = setInterval(async () => {
            console.log('Running scheduled auto-backup...');
            await performAutoBackup(getDB());
        }, intervalMs);

    } catch (error) {
        console.error('Failed to start auto-backup scheduler:', error);
    }
}

async function performAutoBackup(db) {
    try {
        const backupDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_auto_${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        const backupData = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            isAutomatic: true,
            data: db.data
        };

        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

        // Update last backup time
        if (!db.data.settings) db.data.settings = {};
        if (!db.data.settings.autoBackup) db.data.settings.autoBackup = {};
        db.data.settings.autoBackup.lastBackup = new Date().toISOString();
        await db.write();

        // Clean old backups
        const retention = db.data.settings.autoBackup.retention || 7;
        await cleanOldBackups(backupDir, retention);

        console.log(`Auto-backup created: ${filename}`);
    } catch (error) {
        console.error('Auto-backup failed:', error);
    }
}
