import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';
import { setupAuthHandlers } from './ipc/auth.js';
import { setupUserHandlers } from './ipc/users.js';
import { setupRequestHandlers } from './ipc/requests.js';
import { setupSettingsHandlers } from './ipc/settings.js';
import { setupMasterHandlers } from './ipc/master.js';
import { setupBackupHandlers, startAutoBackupScheduler } from './ipc/backup.js';
import { setupHandoverHandlers } from './ipc/handover.js';
import '../server.js'; // Start embedded web server


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Application Menu
function createApplicationMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        // App Menu (Mac only)
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),

        // File Menu
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' }
            ]
        },

        // Edit Menu
        {
            label: 'Edit',
            submenu: [
                { role: 'undo', label: 'Undo' },
                { role: 'redo', label: 'Redo' },
                { type: 'separator' },
                { role: 'cut', label: 'Cut' },
                { role: 'copy', label: 'Copy' },
                { role: 'paste', label: 'Paste' },
                { role: 'selectAll', label: 'Select All' }
            ]
        },

        // View Menu
        {
            label: 'View',
            submenu: [
                { role: 'reload', label: 'Reload' },
                { role: 'forceReload', label: 'Force Reload' },
                { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Reset Zoom' },
                { role: 'zoomIn', label: 'Zoom In' },
                { role: 'zoomOut', label: 'Zoom Out' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Toggle Fullscreen' }
            ]
        },

        // Help Menu
        {
            label: 'Help',
            submenu: [
                {
                    label: 'User Guide',
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow();
                        if (win) {
                            win.webContents.send('menu-action', 'navigate-help');
                        }
                    }
                },
                {
                    label: 'Keyboard Shortcuts',
                    accelerator: 'F1',
                    click: () => {
                        console.log('Show Keyboard Shortcuts');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About MPIM',
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow();
                        if (win) {
                            win.webContents.send('menu-action', 'open-about');
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'MPIM | Medical Portal Information Management',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

app.whenReady().then(async () => {
    try {
        await initDB();
        createApplicationMenu(); // Create application menu
        app.setName('Medical Portal Information Management');

        // Setup IPC Handlers
        setupAuthHandlers();
        setupUserHandlers();
        setupRequestHandlers();
        setupSettingsHandlers();
        setupMasterHandlers();
        setupBackupHandlers();
        setupHandoverHandlers();

        // Start auto-backup scheduler
        startAutoBackupScheduler();

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    } catch (err) {
        console.error("Failed to initialize app:", err);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
