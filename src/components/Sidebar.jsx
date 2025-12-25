import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, FileText, Activity, Database, BarChart3, HardDrive, History, CircleHelp, Settings } from 'lucide-react';
import ActivityLogger from '../utils/ActivityLogger';
import AboutModal from './AboutModal';

export default function Sidebar() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);

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

  const menuGroups = [
    {
      label: null, // No header for main group
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'Permintaan Medis', path: '/requests' },
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
    <aside
      className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 h-screen sticky top-0 flex flex-col transition-all duration-300 z-20`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-slate-800 border border-slate-700 p-1 rounded-full shadow-sm text-slate-300 hover:text-white hover:bg-blue-600 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand */}
      <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-slate-700/50 flex-shrink-0`}>
        <div className={`p-2 bg-blue-600 rounded-lg text-white transition-all duration-300 ${isCollapsed ? '' : 'mr-3'}`}>
          <Activity size={20} />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-bold text-lg tracking-wide text-white">MPIM</h1>
            <p className="text-xs text-slate-400 font-medium truncate">Medical Portal Information Management</p>
          </div>
        )}
      </div>

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
                    `flex items-center text-sm font-medium rounded-lg transition-all duration-200 
                    ${isCollapsed
                      ? 'justify-center w-10 h-10 mx-auto p-0'
                      : 'px-4 py-2.5'
                    }
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                  title={isCollapsed ? item.label : ''}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : ''}`} />
                      {!isCollapsed && <span>{item.label}</span>}
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

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg p-2
              ${isCollapsed ? 'w-10 h-10' : ''}
            `}
            title="Keluar / Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </aside>
  );
}

