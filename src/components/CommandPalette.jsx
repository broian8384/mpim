import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    LayoutDashboard,
    FileText,
    ClipboardList,
    BarChart3,
    Users,
    Database,
    Settings,
    CornerDownLeft,
    CreditCard,
    History
} from 'lucide-react';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // DEFINISI COMMANDS
    const commands = [
        {
            section: 'Navigasi Utama',
            items: [
                { icon: LayoutDashboard, label: 'Buka Dashboard', path: '/dashboard', shortcut: 'D' },
                { icon: FileText, label: 'Permintaan Medis', path: '/requests', shortcut: 'R' },
                { icon: ClipboardList, label: 'Operan Dinas', path: '/handover', shortcut: 'O' },
                { icon: BarChart3, label: 'Laporan & Statistik', path: '/reports', shortcut: 'L' },
            ]
        },
        {
            section: 'Administrasi',
            items: [
                { icon: Users, label: 'Manajemen User', path: '/users' },
                { icon: Database, label: 'Data Master', path: '/master' },
                { icon: History, label: 'Activity Log', path: '/activity-log' },
                { icon: Settings, label: 'Pengaturan', path: '/settings' },
            ]
        }
    ];

    // Filter logic
    const filteredCommands = commands.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(section => section.items.length > 0);

    // Flatten for keyboard navigation
    const flatItems = filteredCommands.flatMap(section => section.items);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Toggle with Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            // Close with Escape
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
            setSearch('');
            setActiveIndex(0);
        }
    }, [isOpen]);

    // Keyboard Navigation in List
    const handleListKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % flatItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = flatItems[activeIndex];
            if (selected) {
                navigate(selected.path);
                setIsOpen(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-2 duration-200">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleListKeyDown}
                        placeholder="Ketik perintah atau nama halaman..."
                        className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded border border-slate-200">ESC</kbd>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[300px] overflow-y-auto py-2">
                    {flatItems.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-500">Tidak ada hasil ditemukan.</p>
                        </div>
                    ) : (
                        filteredCommands.map((section, sIndex) => (
                            <div key={section.section}>
                                <div className="px-4 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {section.section}
                                </div>
                                {section.items.map((item) => {
                                    // Calculate global index for highlight
                                    const globalIndex = flatItems.indexOf(item);
                                    const isActive = globalIndex === activeIndex;

                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsOpen(false);
                                            }}
                                            onMouseEnter={() => setActiveIndex(globalIndex)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer text-left
                                                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                                                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                                            </div>
                                            {isActive && <CornerDownLeft className="w-4 h-4 text-blue-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex gap-3">
                        <span><strong className="font-medium text-slate-600">↑↓</strong> Navigasi</span>
                        <span><strong className="font-medium text-slate-600">↵</strong> Pilih</span>
                    </div>
                    <span>MPIM Pro v1.0</span>
                </div>
            </div>
        </div>
    );
}
