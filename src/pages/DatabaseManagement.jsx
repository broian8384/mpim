import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Database, Table, RefreshCw, HardDrive, FileJson, Users, Stethoscope, Shield, Activity, Target, FileText, Clock, Trash2, Eye, ChevronDown, Search, X, AlertTriangle, Plus, Edit2, Save } from 'lucide-react';

const isElectron = () => window.api && window.api.requests;
const isMasterElectron = () => window.api && window.api.master;

export default function DatabaseManagement() {
    const [activeTable, setActiveTable] = useState('requests');
    const [tableData, setTableData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);
    const [dbStats, setDbStats] = useState({
        requests: 0,
        users: 0,
        doctors: 0,
        insurances: 0,
        services: 0,
        requestPurposes: 0,
        activityLogs: 0,
        totalSize: 0,
        dbPath: ''
    });

    // Delete Modal
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, table: '', name: '' });
    const [notification, setNotification] = useState(null);

    // CRUD Modal
    const [crudModal, setCrudModal] = useState({ isOpen: false, mode: 'create', data: {} });
    const [formData, setFormData] = useState({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Check if user is superadmin
    const currentUser = JSON.parse(localStorage.getItem('mpim_user') || '{}');
    const isSuperAdmin = currentUser.role === 'Super Admin';

    useEffect(() => {
        loadDatabaseStats();
        loadTableData(activeTable);
    }, []);

    useEffect(() => {
        loadTableData(activeTable);
        setCurrentPage(1); // Reset page when table changes
    }, [activeTable]);

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const loadDatabaseStats = async () => {
        let stats = {
            requests: 0,
            users: 0,
            doctors: 0,
            insurances: 0,
            services: 0,
            requestPurposes: 0,
            activityLogs: 0,
            totalSize: 0,
            dbPath: ''
        };

        try {
            if (isElectron()) {
                const requests = await window.api.requests.getAll() || [];
                const users = await window.api.users.getAll() || [];
                stats.requests = requests.length;
                stats.users = users.length;
                const settings = await window.api.settings.get();
                stats.dbPath = settings?.dbPath || '%APPDATA%/mpim/mpim-db.json';
            } else {
                stats.requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]').length;
                stats.users = JSON.parse(localStorage.getItem('mpim_users') || '[]').length;
                stats.dbPath = 'localStorage (Browser)';
            }

            if (isMasterElectron()) {
                const doctors = await window.api.master.getDoctors() || [];
                const insurances = await window.api.master.getInsurances() || [];
                const services = await window.api.master.getServices() || [];
                const purposes = await window.api.master.getRequestPurposes() || [];
                stats.doctors = doctors.length;
                stats.insurances = insurances.length;
                stats.services = services.length;
                stats.requestPurposes = purposes.length;
            } else {
                stats.doctors = JSON.parse(localStorage.getItem('mpim_doctors') || '[]').length;
                stats.insurances = JSON.parse(localStorage.getItem('mpim_insurances') || '[]').length;
                stats.services = JSON.parse(localStorage.getItem('mpim_services') || '[]').length;
                stats.requestPurposes = JSON.parse(localStorage.getItem('mpim_request_purposes') || '[]').length;
            }

            const logs = JSON.parse(localStorage.getItem('mpim_activity_logs') || '[]');
            stats.activityLogs = logs.length;

            const allData = { requests: stats.requests, users: stats.users, doctors: stats.doctors, insurances: stats.insurances, services: stats.services, requestPurposes: stats.requestPurposes };
            stats.totalSize = new Blob([JSON.stringify(allData)]).size;
        } catch (error) {
            console.error('Failed to load database stats:', error);
        }

        setDbStats(stats);
    };

    const loadTableData = async (table) => {
        setIsLoading(true);
        let data = [];

        try {
            switch (table) {
                case 'requests':
                    data = isElectron() ? await window.api.requests.getAll() || [] : JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                    break;
                case 'users':
                    data = isElectron() ? await window.api.users.getAll() || [] : JSON.parse(localStorage.getItem('mpim_users') || '[]');
                    data = data.map(u => ({ ...u, password: '••••••••' }));
                    break;
                case 'doctors':
                    data = isMasterElectron() ? await window.api.master.getDoctors() || [] : JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
                    break;
                case 'insurances':
                    data = isMasterElectron() ? await window.api.master.getInsurances() || [] : JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
                    break;
                case 'services':
                    data = isMasterElectron() ? await window.api.master.getServices() || [] : JSON.parse(localStorage.getItem('mpim_services') || '[]');
                    break;
                case 'requestPurposes':
                    data = isMasterElectron() ? await window.api.master.getRequestPurposes() || [] : JSON.parse(localStorage.getItem('mpim_request_purposes') || '[]');
                    break;
                case 'activityLogs':
                    data = JSON.parse(localStorage.getItem('mpim_activity_logs') || '[]');
                    break;
            }
        } catch (error) {
            console.error(`Failed to load ${table}:`, error);
        }

        setTableData(data);
        setIsLoading(false);
    };

    const handleRefresh = () => {
        loadDatabaseStats();
        loadTableData(activeTable);
    };

    // Get editable fields for each table
    const getEditableFields = (table) => {
        switch (table) {
            case 'doctors':
                return [{ key: 'name', label: 'Nama Dokter', type: 'text', required: true }, { key: 'specialist', label: 'Spesialisasi', type: 'text' }];
            case 'insurances':
                return [{ key: 'name', label: 'Nama Asuransi', type: 'text', required: true }];
            case 'services':
                return [{ key: 'name', label: 'Nama Layanan', type: 'text', required: true }];
            case 'requestPurposes':
                return [{ key: 'name', label: 'Nama Keperluan', type: 'text', required: true }];
            case 'users':
                return [
                    { key: 'name', label: 'Nama Lengkap', type: 'text', required: true },
                    { key: 'username', label: 'Username', type: 'text', required: true },
                    { key: 'email', label: 'Email', type: 'email', required: true },
                    { key: 'role', label: 'Role', type: 'select', options: ['User', 'Admin', 'Super Admin'], required: true },
                    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] }
                ];
            case 'requests':
                return [
                    { key: 'patientName', label: 'Nama Pasien', type: 'text', required: true },
                    { key: 'medRecordNumber', label: 'No. Rekam Medis', type: 'text', required: true },
                    { key: 'type', label: 'Jenis Layanan', type: 'text' },
                    { key: 'insuranceName', label: 'Asuransi', type: 'text' },
                    { key: 'doctorName', label: 'Dokter', type: 'text' },
                    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Proses', 'Selesai', 'Sudah Diambil', 'Ditolak'] },
                    { key: 'notes', label: 'Catatan', type: 'textarea' }
                ];
            default:
                return [];
        }
    };

    // Check if table supports CRUD
    const canCreate = (table) => ['doctors', 'insurances', 'services', 'requestPurposes'].includes(table);
    const canEdit = (table) => ['doctors', 'insurances', 'services', 'requestPurposes', 'users', 'requests'].includes(table);
    const canDelete = (table) => ['doctors', 'insurances', 'services', 'requestPurposes', 'users', 'requests', 'activityLogs'].includes(table);

    // Open CRUD Modal
    const handleOpenCrudModal = (mode, item = null) => {
        if (mode === 'create') {
            const fields = getEditableFields(activeTable);
            const defaultData = {};
            fields.forEach(f => { defaultData[f.key] = ''; });
            setFormData(defaultData);
        } else {
            setFormData({ ...item });
        }
        setCrudModal({ isOpen: true, mode, data: item });
    };

    // Save CRUD
    const handleSaveCrud = async () => {
        const { mode } = crudModal;

        try {
            if (mode === 'create') {
                const newItem = { ...formData, id: Date.now() };
                await saveRecord(activeTable, newItem, 'create');
                setNotification({ type: 'success', message: 'Data berhasil ditambahkan!' });
            } else {
                await saveRecord(activeTable, formData, 'update');
                setNotification({ type: 'success', message: 'Data berhasil diperbarui!' });
            }
            setCrudModal({ isOpen: false, mode: 'create', data: {} });
            loadTableData(activeTable);
            loadDatabaseStats();
        } catch (error) {
            setNotification({ type: 'error', message: 'Gagal menyimpan data: ' + error.message });
        }
        setTimeout(() => setNotification(null), 3000);
    };

    // Save record helper
    const saveRecord = async (table, item, operation) => {
        switch (table) {
            case 'doctors':
                if (isMasterElectron()) {
                    const doctors = await window.api.master.getDoctors() || [];
                    if (operation === 'create') {
                        await window.api.master.saveDoctors([...doctors, item]);
                    } else {
                        const updated = doctors.map(d => d.id === item.id ? item : d);
                        await window.api.master.saveDoctors(updated);
                    }
                } else {
                    const doctors = JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
                    if (operation === 'create') {
                        localStorage.setItem('mpim_doctors', JSON.stringify([...doctors, item]));
                    } else {
                        localStorage.setItem('mpim_doctors', JSON.stringify(doctors.map(d => d.id === item.id ? item : d)));
                    }
                }
                break;
            case 'insurances':
                if (isMasterElectron()) {
                    const insurances = await window.api.master.getInsurances() || [];
                    if (operation === 'create') {
                        await window.api.master.saveInsurances([...insurances, item]);
                    } else {
                        await window.api.master.saveInsurances(insurances.map(i => i.id === item.id ? item : i));
                    }
                } else {
                    const insurances = JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
                    if (operation === 'create') {
                        localStorage.setItem('mpim_insurances', JSON.stringify([...insurances, item]));
                    } else {
                        localStorage.setItem('mpim_insurances', JSON.stringify(insurances.map(i => i.id === item.id ? item : i)));
                    }
                }
                break;
            case 'services':
                if (isMasterElectron()) {
                    const services = await window.api.master.getServices() || [];
                    if (operation === 'create') {
                        await window.api.master.saveServices([...services, item]);
                    } else {
                        await window.api.master.saveServices(services.map(s => s.id === item.id ? item : s));
                    }
                } else {
                    const services = JSON.parse(localStorage.getItem('mpim_services') || '[]');
                    if (operation === 'create') {
                        localStorage.setItem('mpim_services', JSON.stringify([...services, item]));
                    } else {
                        localStorage.setItem('mpim_services', JSON.stringify(services.map(s => s.id === item.id ? item : s)));
                    }
                }
                break;
            case 'requestPurposes':
                if (isMasterElectron()) {
                    const purposes = await window.api.master.getRequestPurposes() || [];
                    if (operation === 'create') {
                        await window.api.master.saveRequestPurposes([...purposes, item]);
                    } else {
                        await window.api.master.saveRequestPurposes(purposes.map(p => p.id === item.id ? item : p));
                    }
                } else {
                    const purposes = JSON.parse(localStorage.getItem('mpim_request_purposes') || '[]');
                    if (operation === 'create') {
                        localStorage.setItem('mpim_request_purposes', JSON.stringify([...purposes, item]));
                    } else {
                        localStorage.setItem('mpim_request_purposes', JSON.stringify(purposes.map(p => p.id === item.id ? item : p)));
                    }
                }
                break;
            case 'users':
                if (isElectron()) {
                    await window.api.users.update(item);
                } else {
                    const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                    localStorage.setItem('mpim_users', JSON.stringify(users.map(u => u.id === item.id ? { ...u, ...item, password: u.password } : u)));
                }
                break;
            case 'requests':
                if (isElectron()) {
                    await window.api.requests.update(item);
                } else {
                    const requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                    localStorage.setItem('mpim_requests', JSON.stringify(requests.map(r => r.id === item.id ? item : r)));
                }
                break;
        }
    };

    // Delete record
    const handleDeleteRecord = async () => {
        const { id, table } = deleteModal;

        try {
            switch (table) {
                case 'requests':
                    if (isElectron()) {
                        await window.api.requests.delete(id);
                    } else {
                        const requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                        localStorage.setItem('mpim_requests', JSON.stringify(requests.filter(r => r.id !== id)));
                    }
                    break;
                case 'users':
                    if (isElectron()) {
                        await window.api.users.delete(id);
                    } else {
                        const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                        localStorage.setItem('mpim_users', JSON.stringify(users.filter(u => u.id !== id)));
                    }
                    break;
                case 'doctors':
                    if (isMasterElectron()) {
                        const doctors = await window.api.master.getDoctors() || [];
                        await window.api.master.saveDoctors(doctors.filter(d => d.id !== id));
                    } else {
                        const doctors = JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
                        localStorage.setItem('mpim_doctors', JSON.stringify(doctors.filter(d => d.id !== id)));
                    }
                    break;
                case 'insurances':
                    if (isMasterElectron()) {
                        const insurances = await window.api.master.getInsurances() || [];
                        await window.api.master.saveInsurances(insurances.filter(i => i.id !== id));
                    } else {
                        const insurances = JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
                        localStorage.setItem('mpim_insurances', JSON.stringify(insurances.filter(i => i.id !== id)));
                    }
                    break;
                case 'services':
                    if (isMasterElectron()) {
                        const services = await window.api.master.getServices() || [];
                        await window.api.master.saveServices(services.filter(s => s.id !== id));
                    } else {
                        const services = JSON.parse(localStorage.getItem('mpim_services') || '[]');
                        localStorage.setItem('mpim_services', JSON.stringify(services.filter(s => s.id !== id)));
                    }
                    break;
                case 'requestPurposes':
                    if (isMasterElectron()) {
                        const purposes = await window.api.master.getRequestPurposes() || [];
                        await window.api.master.saveRequestPurposes(purposes.filter(p => p.id !== id));
                    } else {
                        const purposes = JSON.parse(localStorage.getItem('mpim_request_purposes') || '[]');
                        localStorage.setItem('mpim_request_purposes', JSON.stringify(purposes.filter(p => p.id !== id)));
                    }
                    break;
                case 'activityLogs':
                    const logs = JSON.parse(localStorage.getItem('mpim_activity_logs') || '[]');
                    localStorage.setItem('mpim_activity_logs', JSON.stringify(logs.filter(l => l.id !== id)));
                    break;
            }

            setNotification({ type: 'success', message: 'Record berhasil dihapus!' });
            loadTableData(table);
            loadDatabaseStats();
        } catch (error) {
            setNotification({ type: 'error', message: 'Gagal menghapus record!' });
        }

        setDeleteModal({ isOpen: false, id: null, table: '', name: '' });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredData = tableData.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return Object.values(item).some(val => String(val).toLowerCase().includes(term));
    });

    const tables = [
        { id: 'requests', label: 'Permintaan Medis', icon: FileText, count: dbStats.requests },
        { id: 'users', label: 'Users', icon: Users, count: dbStats.users },
        { id: 'doctors', label: 'Dokter', icon: Stethoscope, count: dbStats.doctors },
        { id: 'insurances', label: 'Asuransi', icon: Shield, count: dbStats.insurances },
        { id: 'services', label: 'Layanan', icon: Activity, count: dbStats.services },
        { id: 'requestPurposes', label: 'Keperluan', icon: Target, count: dbStats.requestPurposes },
        { id: 'activityLogs', label: 'Activity Logs', icon: Clock, count: dbStats.activityLogs }
    ];

    const formatValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
        if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
        if (String(value).length > 50) return String(value).substring(0, 50) + '...';
        return String(value);
    };

    const getColumns = (data) => {
        if (!data || data.length === 0) return [];
        const allKeys = new Set();
        data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
        return Array.from(allKeys);
    };

    if (!isSuperAdmin) {
        return (
            <Layout>
                <div className="p-8 flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
                        <p className="text-slate-500">Halaman ini hanya dapat diakses oleh Super Admin.</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Database className="w-6 h-6 text-slate-800" /> Manajemen Database
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Lihat dan kelola data langsung dari database (CRUD)</p>
                    </div>
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Database Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-blue-100 rounded-xl">
                                <HardDrive className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-slate-600">Database Storage</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">{dbStats.totalSize ? (dbStats.totalSize / 1024).toFixed(2) : '0'} KB</div>
                        <div className="text-slate-500 text-xs truncate" title={dbStats.dbPath}>📁 {dbStats.dbPath}</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                <Table className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="font-medium text-slate-600">Total Tabel</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">7</div>
                        <div className="text-slate-500 text-xs">Requests, Users, Master Data, Logs</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-purple-100 rounded-xl">
                                <FileJson className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="font-medium text-slate-600">Total Records</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">
                            {dbStats.requests + dbStats.users + dbStats.doctors + dbStats.insurances + dbStats.services + dbStats.requestPurposes + dbStats.activityLogs}
                        </div>
                        <div className="text-slate-500 text-xs">Across all tables</div>
                    </div>
                </div>

                {/* Table Selector */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {tables.map(table => (
                            <button key={table.id} onClick={() => setActiveTable(table.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTable === table.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                <table.icon size={16} />
                                {table.label}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTable === table.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{table.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Header with Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Table className="w-4 h-4 text-blue-600" />
                                Tabel: {tables.find(t => t.id === activeTable)?.label}
                            </h3>
                            {canCreate(activeTable) && (
                                <button onClick={() => handleOpenCrudModal('create')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all">
                                    <Plus className="w-4 h-4" /> Tambah Data
                                </button>
                            )}
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="Cari dalam tabel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />Loading data...</div>
                        ) : filteredData.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic">Tidak ada data.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 uppercase text-xs">
                                        <th className="py-3 px-4 w-10">#</th>
                                        {getColumns(filteredData).slice(0, 5).map(col => (
                                            <th key={col} className="py-3 px-4 font-semibold">{col}</th>
                                        ))}
                                        <th className="py-3 px-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => (
                                        <React.Fragment key={item.id || index}>
                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                {getColumns(filteredData).slice(0, 5).map(col => (
                                                    <td key={col} className="py-3 px-4 text-slate-700">{formatValue(item[col])}</td>
                                                ))}
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Lihat Detail">
                                                            {expandedRow === item.id ? <ChevronDown className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                        {canEdit(activeTable) && (
                                                            <button onClick={() => handleOpenCrudModal('edit', item)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-100 rounded transition-colors" title="Edit">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete(activeTable) && (
                                                            <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, table: activeTable, name: item.patientName || item.name || item.username || `#${item.id}` })}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors" title="Hapus">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRow === item.id && (
                                                <tr>
                                                    <td colSpan={7} className="bg-slate-50 p-4">
                                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                            <h4 className="font-semibold text-slate-800 mb-3">Detail Record #{item.id}</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                                {Object.entries(item).map(([key, value]) => (
                                                                    <div key={key} className="bg-slate-50 p-3 rounded-lg">
                                                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">{key}</div>
                                                                        <div className="text-slate-800 break-words">
                                                                            {typeof value === 'object' ? (
                                                                                <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                                                                            ) : String(value || '-')}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {filteredData.length > 0 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}-{Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} records
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Prev
                                </button>
                                <span className="px-3 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded-lg">
                                    {currentPage}
                                </span>
                                <span className="text-sm text-slate-500">/ {Math.ceil(filteredData.length / itemsPerPage)}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / itemsPerPage), p + 1))}
                                    disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg text-white font-medium z-50 ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                        {notification.message}
                    </div>
                )}

                {/* CRUD Modal */}
                {crudModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {crudModal.mode === 'create' ? '➕ Tambah Data Baru' : '✏️ Edit Data'}
                                </h3>
                                <button onClick={() => setCrudModal({ isOpen: false, mode: 'create', data: {} })} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                {getEditableFields(activeTable).map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {field.type === 'select' ? (
                                            <select value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                                <option value="">Pilih {field.label}</option>
                                                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <textarea value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" />
                                        ) : (
                                            <input type={field.type} value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button onClick={() => setCrudModal({ isOpen: false, mode: 'create', data: {} })} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                                    Batal
                                </button>
                                <button onClick={handleSaveCrud} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Record?</h3>
                            <p className="text-sm text-slate-500 mb-2">Yakin ingin menghapus record ini?</p>
                            <p className="text-sm font-semibold text-slate-700 mb-6 bg-slate-100 py-2 px-3 rounded-lg">{deleteModal.name}</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteModal({ isOpen: false, id: null, table: '', name: '' })}
                                    className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors">Batal</button>
                                <button onClick={handleDeleteRecord} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
