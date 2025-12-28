import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, FileText, Activity, Database, BarChart3, HardDrive, History, CircleHelp, Settings, Key, X, Eye, EyeOff, Table, ClipboardList } from 'lucide-react';
import ActivityLogger from '../utils/ActivityLogger';
import AboutModal from './AboutModal';

export default function Sidebar() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Password Change Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  React.useEffect(() => {
    const loadUser = async () => {
      // Use LocalStorage for both Web and Electron (Renderer)
      const saved = localStorage.getItem('mpim_user');
      if (saved) setCurrentUser(JSON.parse(saved));
    };
    loadUser();

    // Listen for Menu Actions (e.g., from Electron Menu)
    if (window.api && window.api.onMenuAction) {
      const cleanup = window.api.onMenuAction((action) => {
        if (action === 'navigate-help') {
          navigate('/help');
        } else if (action === 'open-about') {
          setShowAboutModal(true);
        }
      });
      return cleanup;
    }
  }, [navigate]);

  const handleLogout = () => {
    const user = JSON.parse(localStorage.getItem('mpim_user') || '{}');

    ActivityLogger.log('LOGOUT', {
      module: 'Authentication',
      description: `User ${user.name || 'Unknown'} logged out`,
      target: user.email || 'N/A'
    }, user);

    // Backend logout not needed/defined yet
    localStorage.removeItem('mpim_user');
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Semua field harus diisi');
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordError('Password baru minimal 4 karakter');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Password baru dan konfirmasi tidak sama');
      return;
    }

    setChangingPassword(true);

    try {
      if (window.api && window.api.auth && window.api.auth.changePassword) {
        // Electron mode
        const result = await window.api.auth.changePassword({
          userId: currentUser.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });

        if (result.success) {
          setPasswordSuccess('Password berhasil diubah!');
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

          ActivityLogger.log('UPDATE', {
            module: 'Authentication',
            description: 'User changed their password',
            target: currentUser.email
          }, currentUser);

          setTimeout(() => {
            setShowPasswordModal(false);
            setPasswordSuccess('');
          }, 2000);
        } else {
          setPasswordError(result.message || 'Gagal mengubah password');
        }
      } else {
        // Web mode - update localStorage
        const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (userIndex === -1) {
          setPasswordError('User tidak ditemukan');
        } else if (users[userIndex].password !== passwordData.currentPassword) {
          setPasswordError('Password lama salah');
        } else {
          users[userIndex].password = passwordData.newPassword;
          localStorage.setItem('mpim_users', JSON.stringify(users));
          setPasswordSuccess('Password berhasil diubah!');
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

          setTimeout(() => {
            setShowPasswordModal(false);
            setPasswordSuccess('');
          }, 2000);
        }
      }
    } catch (error) {
      setPasswordError('Terjadi kesalahan: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // NOTIFICATION BADGE COUNTS
  const [counts, setCounts] = useState({ requests: 0, handover: 0 });

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Polling interval (every 10 seconds for "live" feel)
    const intervalId = setInterval(fetchCounts, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchCounts = async () => {
    if (!window.api) return;
    try {
      // 1. Requests: Count with status 'Pending' or 'Proses'
      if (window.api.requests) {
        const reqs = await window.api.requests.getAll();
        const pendingCount = reqs.filter(r => ['Pending', 'Proses'].includes(r.status)).length;
        setCounts(prev => ({ ...prev, requests: pendingCount }));
      }

      // 2. Handover: Count active notes (isCompleted === false)
      // Filter for current shift if needed, but 'active' globally is good for now
      if (window.api.handover) {
        const notes = await window.api.handover.list();
        const activeCount = notes.filter(n => !n.isCompleted).length;
        setCounts(prev => ({ ...prev, handover: activeCount }));
      }
    } catch (e) {
      console.error("Failed to fetch notification counts:", e);
    }
  };

  const menuGroups = [
    {
      label: null, // No header for main group
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        {
          icon: FileText,
          label: 'Permintaan Medis',
          path: '/requests',
          badge: counts.requests > 0 ? counts.requests : null,
          badgeColor: 'bg-amber-500' // Custom color for requests
        },
        {
          icon: ClipboardList,
          label: 'Operan Dinas',
          path: '/handover',
          badge: counts.handover > 0 ? counts.handover : null,
          badgeColor: 'bg-red-500' // Custom color for handover
        },
        { icon: BarChart3, label: 'Laporan', path: '/reports' },
      ]
    },
    // Super Admin only groups
    ...(currentUser?.role === 'Super Admin' ? [
      {
        label: 'ADMINISTRASI',
        items: [
          { icon: Users, label: 'Manajemen User', path: '/users' },
          { icon: Database, label: 'Data Master', path: '/master' },
          { icon: History, label: 'Activity Log', path: '/activity-log' },
        ]
      },
      {
        label: 'PENGATURAN',
        items: [
          { icon: Settings, label: 'Pengaturan Instansi', path: '/settings' },
          { icon: HardDrive, label: 'Backup & Restore', path: '/backup' },
          { icon: Table, label: 'Manajemen Database', path: '/database' },
        ]
      }
    ] : []),
    {
      label: 'BANTUAN',
      items: [
        { icon: CircleHelp, label: 'Panduan', path: '/help' }
      ]
    }
  ];

  return (
    <div className={`h-screen sticky top-0 flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out border-r border-slate-700/50 z-30 flex-shrink-0 ${isCollapsed ? 'w-20' : 'w-64'
      }`}>
      {/* Sidebar Header Brand */}
      <div className="flex items-center h-16 px-4 bg-slate-900 border-b border-slate-800">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl shadow-lg ring-2 ring-blue-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="ml-3 overflow-hidden animate-in fade-in duration-300">
            <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap">MPIM</h1>
            <p className="text-xs text-slate-400 font-medium truncate">Medical Portal Information Management</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-slate-800 border border-slate-700 p-1 rounded-full shadow-sm text-slate-300 hover:text-white hover:bg-blue-600 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation - Scrollable Area */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={group.label ? 'mt-5' : ''}>
            {/* Group Header */}
            {group.label && !isCollapsed && (
              <p className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.label && isCollapsed && (
              <div className="w-6 h-px bg-slate-700 mx-auto my-3"></div>
            )}

            {/* Group Items */}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center text-sm font-medium rounded-lg transition-all duration-200 
                    ${isCollapsed
                      ? 'justify-center w-10 h-10 mx-auto p-0'
                      : 'px-4 py-2.5'
                    }
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                  title={isCollapsed ? item.label : ''}
                >
                  {({ isActive }) => (
                    <>
                      {/* Icon Container with Badge Dot (Collapsed) */}
                      <div className="relative">
                        <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : ''}`} />
                        {/* Collapsed Badge Dot */}
                        {isCollapsed && item.badge > 0 && (
                          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${item.badgeColor || 'bg-red-500'}`}></span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {/* Expanded Badge Pill */}
                          {item.badge > 0 && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${item.badgeColor || 'bg-red-500'}`}>
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile - Fixed at bottom */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>

          {/* User Info */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {currentUser?.name ? currentUser.name.substring(0, 2) : 'GT'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'Guest'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{currentUser?.role || 'Visitor'}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} gap-1`}>
            {/* Change Password Button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className={`
                flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all rounded-lg p-2
                ${isCollapsed ? 'w-10 h-10' : ''}
              `}
              title="Ubah Password"
            >
              <Key size={18} />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`
                flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg p-2
                ${isCollapsed ? 'w-10 h-10' : ''}
              `}
              title="Keluar / Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Ubah Password</h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password Lama</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Masukkan password lama"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Masukkan password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ulangi password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
                  {passwordError}
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-2 rounded-lg border border-emerald-100">
                  {passwordSuccess}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingPassword ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Ubah Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  );
}

