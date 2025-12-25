// Activity Logger Utility
// This will be used across the app to log all user actions

export const ActivityLogger = {
    log: (action, details, user) => {
        try {
            const logs = JSON.parse(localStorage.getItem('mpim_activity_logs') || '[]');

            const newLog = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                user: (typeof user === 'object' ? user?.name : user) || JSON.parse(localStorage.getItem('mpim_user') || '{}').name || 'Unknown',
                userEmail: user?.email || JSON.parse(localStorage.getItem('mpim_user') || '{}').email || 'unknown@email.com',
                action: action, // 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT'
                module: details.module, // 'Requests', 'Users', 'Master Data', 'Reports', etc.
                description: details.description,
                target: details.target || null, // e.g., Request ID, User name, etc.
                metadata: details.metadata || {}
            };

            logs.unshift(newLog); // Add to beginning

            // Keep only last 1000 logs
            const trimmedLogs = logs.slice(0, 1000);

            localStorage.setItem('mpim_activity_logs', JSON.stringify(trimmedLogs));

            return newLog;
        } catch (error) {
            console.error('Activity logging failed:', error);
            return null;
        }
    },

    getLogs: (filters = {}) => {
        try {
            let logs = JSON.parse(localStorage.getItem('mpim_activity_logs') || '[]');

            // Apply filters
            if (filters.user) {
                logs = logs.filter(log =>
                    log.user.toLowerCase().includes(filters.user.toLowerCase()) ||
                    log.userEmail.toLowerCase().includes(filters.user.toLowerCase())
                );
            }

            if (filters.action) {
                logs = logs.filter(log => log.action === filters.action);
            }

            if (filters.module) {
                logs = logs.filter(log => log.module === filters.module);
            }

            if (filters.dateRange?.start) {
                const startDate = new Date(filters.dateRange.start);
                logs = logs.filter(log => new Date(log.timestamp) >= startDate);
            }

            if (filters.dateRange?.end) {
                const endDate = new Date(filters.dateRange.end);
                endDate.setHours(23, 59, 59, 999);
                logs = logs.filter(log => new Date(log.timestamp) <= endDate);
            }

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                logs = logs.filter(log =>
                    log.description.toLowerCase().includes(searchLower) ||
                    log.user.toLowerCase().includes(searchLower) ||
                    log.module.toLowerCase().includes(searchLower) ||
                    (log.target && log.target.toString().toLowerCase().includes(searchLower))
                );
            }

            return logs;
        } catch (error) {
            console.error('Failed to get logs:', error);
            return [];
        }
    },

    clearLogs: () => {
        if (window.confirm('⚠️ Hapus semua activity logs? Tindakan ini tidak dapat dibatalkan!')) {
            localStorage.removeItem('mpim_activity_logs');
            return true;
        }
        return false;
    }
};

export default ActivityLogger;
