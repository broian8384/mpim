const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    auth: {
        login: (creds) => ipcRenderer.invoke('auth:login', creds),
    },
    users: {
        getAll: () => ipcRenderer.invoke('users:get-all'),
        create: (user) => ipcRenderer.invoke('users:create', user),
        update: (user) => ipcRenderer.invoke('users:update', user),
        delete: (id) => ipcRenderer.invoke('users:delete', id),
    },
    requests: {
        getAll: () => ipcRenderer.invoke('requests:get-all'),
        create: (data) => ipcRenderer.invoke('requests:create', data),
        update: (data) => ipcRenderer.invoke('requests:update', data),
        delete: (id) => ipcRenderer.invoke('requests:delete', id),
        addHistory: (data) => ipcRenderer.invoke('requests:add-history', data),
    },
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        update: (data) => ipcRenderer.invoke('settings:update', data),
    },
    // Listeners
    onMenuAction: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('menu-action', subscription);
        return () => ipcRenderer.removeListener('menu-action', subscription);
    }
});
