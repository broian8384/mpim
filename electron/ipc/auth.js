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

    // Change Password Handler
    ipcMain.handle('auth:change-password', async (event, args) => {
        try {
            const db = getDB();
            await db.read();
            const { userId, currentPassword, newPassword } = args;

            if (!userId || !currentPassword || !newPassword) {
                return { success: false, message: 'Semua field harus diisi' };
            }

            if (newPassword.length < 6) {
                return { success: false, message: 'Password baru minimal 6 karakter' };
            }

            const userIndex = db.data.users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                return { success: false, message: 'User tidak ditemukan' };
            }

            const user = db.data.users[userIndex];
            if (user.password !== currentPassword) {
                return { success: false, message: 'Password lama salah' };
            }

            // Update password
            db.data.users[userIndex].password = newPassword;
            await db.write();

            return { success: true, message: 'Password berhasil diubah' };
        } catch (error) {
            console.error('Change Password Error:', error);
            return { success: false, message: 'Terjadi kesalahan: ' + error.message };
        }
    });

    // Check Setup Status
    ipcMain.handle('auth:check-setup', async () => {
        try {
            const db = getDB();
            await db.read();
            return {
                success: true,
                isSetupComplete: db.data.settings?.isSetupComplete || false
            };
        } catch (error) {
            console.error('Check Setup Error:', error);
            return { success: false, isSetupComplete: false };
        }
    });

    // Complete Setup - Create Admin and Save Institution Info
    ipcMain.handle('auth:complete-setup', async (event, args) => {
        try {
            const db = getDB();
            await db.read();

            const { admin, institution } = args;

            // Validate admin data
            if (!admin.name || !admin.email || !admin.password) {
                return { success: false, message: 'Data admin tidak lengkap' };
            }

            if (admin.password.length < 6) {
                return { success: false, message: 'Password minimal 6 karakter' };
            }

            // Create Super Admin user
            const newAdmin = {
                id: Date.now(),
                name: admin.name,
                email: admin.email,
                username: admin.email.split('@')[0],
                role: 'Super Admin',
                status: 'Active',
                joinDate: new Date().toISOString().split('T')[0],
                password: admin.password
            };

            db.data.users = [newAdmin];

            // Update institution settings
            db.data.settings = {
                ...db.data.settings,
                isSetupComplete: true,
                hospitalName: institution.hospitalName || '',
                address: institution.address || '',
                phone: institution.phone || '',
                email: institution.email || '',
                printFooter: {
                    ...db.data.settings.printFooter,
                    contactInfo: institution.phone || ''
                }
            };

            await db.write();

            // Return user without password
            const { password: _, ...userSafe } = newAdmin;
            return {
                success: true,
                message: 'Setup berhasil! Selamat datang di MPIM.',
                user: userSafe
            };
        } catch (error) {
            console.error('Complete Setup Error:', error);
            return { success: false, message: 'Gagal menyelesaikan setup: ' + error.message };
        }
    });
}
