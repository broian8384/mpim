import { ipcMain } from 'electron';
import { getDB } from '../db.js';

export function setupAuthHandlers() {
    ipcMain.handle('auth:login', async (event, args) => {
        try {
            const db = getDB();
            await db.read();
            const { loginIdentifier, email, password } = args;
            const targetUser = loginIdentifier || email;

            if (!targetUser || !password) {
                return { success: false, message: 'Mohon isi username/email dan password' };
            }

            if (!db.data || !db.data.users) {
                return { success: false, message: 'Database users bermasalah' };
            }

            // Check by Email OR Username OR Name (case insensitive)
            const user = db.data.users.find(u => {
                const uEmail = u.email ? u.email.toLowerCase() : '';
                const uUsername = u.username ? u.username.toLowerCase() : '';
                const uName = u.name ? u.name.toLowerCase() : '';
                const target = targetUser.toLowerCase();

                return uEmail === target || uUsername === target || uName === target;
            });

            if (!user) return { success: false, message: 'Username atau Email tidak ditemukan' };
            if (user.password !== password) return { success: false, message: 'Password salah' };
            if (user.status !== 'Active') return { success: false, message: 'Akun non-aktif' };

            const { password: _, ...userSafe } = user;
            return { success: true, user: userSafe };
        } catch (error) {
            console.error('Login Error:', error);
            return { success: false, message: 'Terjadi kesalahan di server: ' + error.message };
        }
    });
}
