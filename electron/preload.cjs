const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    auth: {
        login: (creds) => ipcRenderer.invoke('auth:login', creds),
        changePassword: (data) => ipcRenderer.invoke('auth:change-password', data),
        checkSetup: () => ipcRenderer.invoke('auth:check-setup'),
        completeSetup: (data) => ipcRenderer.invoke('auth:complete-setup', data),
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
    master: {
        getDoctors: () => ipcRenderer.invoke('master:get-doctors'),
        saveDoctors: (data) => ipcRenderer.invoke('master:save-doctors', data),
        getInsurances: () => ipcRenderer.invoke('master:get-insurances'),
        saveInsurances: (data) => ipcRenderer.invoke('master:save-insurances', data),
        getServices: () => ipcRenderer.invoke('master:get-services'),
        saveServices: (data) => ipcRenderer.invoke('master:save-services', data),
        getRequestPurposes: () => ipcRenderer.invoke('master:get-request-purposes'),
        saveRequestPurposes: (data) => ipcRenderer.invoke('master:save-request-purposes', data),
    },
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        update: (data) => ipcRenderer.invoke('settings:update', data),
        resetDatabase: (options) => ipcRenderer.invoke('settings:reset-database', options),
    },
    backup: {
        create: (isAuto) => ipcRenderer.invoke('backup:create', isAuto),
        list: () => ipcRenderer.invoke('backup:list'),
        restore: (path) => ipcRenderer.invoke('backup:restore', path),
        delete: (path) => ipcRenderer.invoke('backup:delete', path),
        getSettings: () => ipcRenderer.invoke('backup:get-settings'),
        updateSettings: (settings) => ipcRenderer.invoke('backup:update-settings', settings),
    },
    handover: {
        list: () => ipcRenderer.invoke('handover:list'),
        add: (data) => ipcRenderer.invoke('handover:add', data),
        toggle: (data) => ipcRenderer.invoke('handover:toggle', data),
        comment: (data) => ipcRenderer.invoke('handover:comment', data),
        delete: (id) => ipcRenderer.invoke('handover:delete', id),
    },
    // Listeners
    onMenuAction: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('menu-action', subscription);
        return () => ipcRenderer.removeListener('menu-action', subscription);
    }
});
