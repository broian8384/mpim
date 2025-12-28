// Web Adapter to Polyfill window.api when running in Browser mode
export const setupWebAdapter = () => {
    if (window.api) return; // Already present (Electron)

    console.log("Initializing Web Adapter (Browser Mode)");

    const API_BASE = 'http://localhost:3000/api'; // In production this should be dynamic

    // Helper for fetch
    const fetchJson = async (endpoint, options = {}) => {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
        options.headers = { 'Content-Type': 'application/json', ...options.headers };
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    };

    window.api = {
        requests: {
            getAll: () => fetchJson('/requests'),
            create: (data) => fetchJson('/requests', { method: 'POST', body: JSON.stringify(data) }),
            update: (data) => fetchJson(`/requests/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id) => fetchJson(`/requests/${id}`, { method: 'DELETE' }),
            addHistory: (id, historyItem) => fetchJson(`/requests/${id}/history`, { method: 'POST', body: JSON.stringify({ historyItem }) })
        },
        auth: {
            login: (email, password) => fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
            // ... other auth methods
        },
        master: {
            getDoctors: () => fetchJson('/master/doctors'),
            getInsurances: () => fetchJson('/master/insurances'),
            getServices: () => fetchJson('/master/services'),
            getRequestPurposes: () => Promise.resolve([]) // Mock or implement
        },
        handover: {
            list: () => fetchJson('/handover'),
            // ... add implement add/toggle/comment
        },
        settings: {
            get: () => Promise.resolve(null), // Or implement settings API
            set: () => Promise.resolve(true)
        }
    };
};
