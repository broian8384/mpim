import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ActivityLogger from '../utils/ActivityLogger';
import { Plus, Search, Edit2, Trash2, X, Check, Filter } from 'lucide-react';

const ROLES = ['Super Admin', 'Admin', 'Staff'];
const STATUSES = ['Active', 'Inactive'];

// Helper to check environment
const isElectron = () => window.api && window.api.users;

export default function Users() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        if (isElectron()) {
            try {
                const data = await window.api.users.getAll();
                setUsers(data);
            } catch (error) {
                console.error("Database connection failed:", error);
            }
        } else {
            const saved = localStorage.getItem('mpim_users');
            if (saved) {
                setUsers(JSON.parse(saved));
            } else {
                const initial = [
                    { id: 1, name: 'Dr. Sarah Wilson', email: 'sarah.w@hospital.com', role: 'Super Admin', status: 'Active', joinDate: '2024-01-15' },
                    { id: 2, name: 'James Carter', email: 'james.c@hospital.com', role: 'Admin', status: 'Active', joinDate: '2024-02-01' },
                    { id: 3, name: 'Emily Chen', email: 'emily.c@hospital.com', role: 'Staff', status: 'Inactive', joinDate: '2024-03-10' },
                ];
                setUsers(initial);
                localStorage.setItem('mpim_users', JSON.stringify(initial));
            }
        }
    };

    // State for Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // If null, mode = Create. If set, mode = Edit.
    const [deleteId, setDeleteId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Staff', status: 'Active', password: '' });
    const [error, setError] = useState('');

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Handlers
    const handleOpenModal = (user = null) => {
        setError(''); // Reset error
        if (user) {
            setCurrentUser(user);
            setFormData({ name: user.name, email: user.email, role: user.role, status: user.status, password: '' });
        } else {
            setCurrentUser(null);
            setFormData({ name: '', email: '', role: 'Staff', status: 'Active', password: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');

        // Email Validation Check
        const emailExists = users.some(u =>
            u.email.toLowerCase() === formData.email.toLowerCase() &&
            u.id !== currentUser?.id // Ignore self when editing
        );

        if (emailExists) {
            setError('Email sudah terdaftar! Gunakan email lain.');
            return;
        }

        if (currentUser) {
            // Update
            if (isElectron()) {
                await window.api.users.update({ ...currentUser, ...formData });
                await loadUsers();
            } else {
                const updated = users.map(u => u.id === currentUser.id ? { ...u, ...formData } : u);
                setUsers(updated);
                localStorage.setItem('mpim_users', JSON.stringify(updated));
            }

            ActivityLogger.log('UPDATE', {
                module: 'Users',
                description: `Updated user ${formData.name}`,
                target: formData.email
            });
        } else {
            // Create
            const newUser = {
                ...formData,
                joinDate: new Date().toISOString().split('T')[0]
            };

            if (isElectron()) {
                await window.api.users.create(newUser);
                await loadUsers();
            } else {
                // Determine ID safely for mock
                const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
                const list = [...users, { id: newId, ...newUser }];
                setUsers(list);
                localStorage.setItem('mpim_users', JSON.stringify(list));
            }

            ActivityLogger.log('CREATE', {
                module: 'Users',
                description: `Created new user ${formData.name}`,
                target: formData.email
            });
        }
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        const deletedUser = users.find(u => u.id === deleteId);

        if (isElectron()) {
            await window.api.users.delete(deleteId);
            await loadUsers();
        } else {
            const filtered = users.filter(u => u.id !== deleteId);
            setUsers(filtered);
            localStorage.setItem('mpim_users', JSON.stringify(filtered));
        }

        ActivityLogger.log('DELETE', {
            module: 'Users',
            description: `Deleted user ${deletedUser?.name || 'Unknown'}`,
            target: deletedUser?.email || 'N/A'
        });

        setIsDeleteModalOpen(false);
        setDeleteId(null);
    };

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h2>
                        <p className="text-slate-500 text-sm mt-1">Kelola akses dan data pengguna sistem</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah User Baru
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="appearance-none pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All">Semua Role</option>
                                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Nama Pengguna</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Tanggal Bergabung</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">
                                            Tidak ada user yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'Super Admin' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <span className={`w-2 h-2 rounded-full mr-2 ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                    <span className={user.status === 'Active' ? 'text-slate-700' : 'text-slate-500'}>{user.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {user.joinDate}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteId(user.id); setIsDeleteModalOpen(true); }}
                                                        disabled={user.id === 1} // Prevent self-delete (Mock ID 1)
                                                        className={`p-1.5 rounded transition-colors ${user.id === 1
                                                            ? 'text-slate-200 cursor-not-allowed'
                                                            : 'hover:bg-slate-100 text-slate-400 hover:text-red-500'
                                                            }`}
                                                        title={user.id === 1 ? "Anda tidak dapat menghapus akun sendiri" : "Hapus User"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Placeholder */}
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                        <span>Menampilkan {filteredUsers.length} dari {users.length} data</span>
                        <div className="flex gap-1">
                            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Prev</button>
                            <button className="px-3 py-1 bg-slate-900 text-white rounded">1</button>
                            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800">{currentUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center">
                                    <span className="font-medium mr-1">Error:</span> {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password {currentUser && <span className="text-slate-400 font-normal text-xs">(Opsional)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={!currentUser} // Required only for new users
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder={currentUser ? "Kosongkan jika tidak ingin mengubah" : "••••••••"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {STATUSES.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    {currentUser ? 'Simpan Perubahan' : 'Tambah User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900 mb-2">Hapus Pengguna?</h3>
                        <p className="text-slate-500 text-sm mb-6">Tindakan ini tidak dapat dibatalkan. Data pengguna akan dihapus permanen.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
