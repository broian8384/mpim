import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ActivityLogger from '../utils/ActivityLogger';
import { Plus, Trash2, Database, Stethoscope, Shield, Edit2, Search, X, ChevronLeft, ChevronRight, Activity, ArrowUpDown, ArrowUp, ArrowDown, Target } from 'lucide-react';

const isMasterElectron = () => window.api && window.api.master;

// Helper to migrate legacy string data to objects if needed
const migrateDoctors = (data) => {
    if (!data) return [];
    if (typeof data[0] === 'string') {
        return data.map((d, i) => ({ id: i + 1, name: d, specialist: '' }));
    }
    return data;
};

const migrateInsurances = (data) => {
    if (!data) return [];
    if (typeof data[0] === 'string') {
        return data.map((d, i) => ({ id: i + 1, name: d }));
    }
    return data;
};

export default function MasterData() {
    // Data States
    const [doctors, setDoctors] = useState([]);
    const [insurances, setInsurances] = useState([]);
    const [services, setServices] = useState([]);
    const [requestPurposes, setRequestPurposes] = useState([]);
    const [activeTab, setActiveTab] = useState('doctors'); // 'doctors', 'insurances', 'services', 'purposes'

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ id: null, name: '', specialist: '' });
    const [isEditMode, setIsEditMode] = useState(false);

    // Sort & Search State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

    // Initial Load
    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        if (isMasterElectron()) {
            const d = await window.api.master.getDoctors();
            const i = await window.api.master.getInsurances();
            const s = await window.api.master.getServices();
            const p = await window.api.master.getRequestPurposes();
            setDoctors(migrateDoctors(d) || []);
            setInsurances(migrateInsurances(i) || []);
            setServices(migrateInsurances(s) || []);
            setRequestPurposes(migrateInsurances(p) || []);
        } else {
            // Web mode - use localStorage, default to empty arrays for clean install
            const savedDoc = localStorage.getItem('mpim_doctors');
            const savedIns = localStorage.getItem('mpim_insurances');
            const savedSvc = localStorage.getItem('mpim_services');
            const savedPurposes = localStorage.getItem('mpim_request_purposes');

            const docData = savedDoc ? JSON.parse(savedDoc) : [];
            const insData = savedIns ? JSON.parse(savedIns) : [];
            const svcData = savedSvc ? JSON.parse(savedSvc) : [];
            const purposesData = savedPurposes ? JSON.parse(savedPurposes) : [];

            setDoctors(migrateDoctors(docData));
            setInsurances(migrateInsurances(insData));
            setServices(migrateInsurances(svcData));
            setRequestPurposes(migrateInsurances(purposesData));
        }
    };

    const saveData = (type, newData) => {
        if (type === 'doctors') {
            setDoctors(newData);
            if (isMasterElectron()) window.api.master.saveDoctors(newData);
            else localStorage.setItem('mpim_doctors', JSON.stringify(newData));
        } else if (type === 'insurances') {
            setInsurances(newData);
            if (isMasterElectron()) window.api.master.saveInsurances(newData);
            else localStorage.setItem('mpim_insurances', JSON.stringify(newData));
        } else if (type === 'services') {
            setServices(newData);
            if (isMasterElectron()) window.api.master.saveServices(newData);
            else localStorage.setItem('mpim_services', JSON.stringify(newData));
        } else if (type === 'purposes') {
            setRequestPurposes(newData);
            if (isMasterElectron()) window.api.master.saveRequestPurposes(newData);
            else localStorage.setItem('mpim_request_purposes', JSON.stringify(newData));
        }
    };

    // Handlers
    const handleOpenModal = (item = null) => {
        if (item) {
            setModalData(item);
            setIsEditMode(true);
        } else {
            setModalData({ id: null, name: '', specialist: '' });
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const list = activeTab === 'doctors' ? [...doctors] :
            activeTab === 'insurances' ? [...insurances] :
                activeTab === 'services' ? [...services] : [...requestPurposes];
        const moduleName = activeTab === 'doctors' ? 'Doctors' :
            activeTab === 'insurances' ? 'Insurances' :
                activeTab === 'services' ? 'Services' : 'Request Purposes';

        if (isEditMode) {
            // Edit
            const index = list.findIndex(i => i.id === modalData.id);
            if (index !== -1) list[index] = { ...modalData };

            ActivityLogger.log('UPDATE', {
                module: 'Master Data',
                description: `Updated ${moduleName.slice(0, -1).toLowerCase()}: ${modalData.name}`,
                target: `${moduleName} - ${modalData.name}`
            });
        } else {
            // Add
            const newItem = { ...modalData, id: Date.now() };
            list.push(newItem);

            ActivityLogger.log('CREATE', {
                module: 'Master Data',
                description: `Created new ${moduleName.slice(0, -1).toLowerCase()}: ${modalData.name}`,
                target: `${moduleName} - ${modalData.name}`
            });
        }

        saveData(activeTab, list);
        setIsModalOpen(false);
    };

    const handleDelete = (id, name) => {
        setDeleteModal({ isOpen: true, id, name });
    };

    const confirmDelete = () => {
        const id = deleteModal.id;
        const list = activeTab === 'doctors' ? [...doctors] :
            activeTab === 'insurances' ? [...insurances] :
                activeTab === 'services' ? [...services] : [...requestPurposes];
        const moduleName = activeTab === 'doctors' ? 'Doctors' :
            activeTab === 'insurances' ? 'Insurances' :
                activeTab === 'services' ? 'Services' : 'Request Purposes';
        const deletedItem = list.find(item => item.id === id);

        const newList = list.filter(item => item.id !== id);
        saveData(activeTab, newList);

        ActivityLogger.log('DELETE', {
            module: 'Master Data',
            description: `Deleted ${moduleName.slice(0, -1).toLowerCase()}: ${deletedItem?.name || 'Unknown'}`,
            target: `${moduleName} - ${deletedItem?.name || 'N/A'}`
        });

        setDeleteModal({ isOpen: false, id: null, name: '' });
    };

    // Sorting Handler
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Get Current List and Apply Search
    let currentList = activeTab === 'doctors' ? doctors :
        activeTab === 'insurances' ? insurances :
            activeTab === 'services' ? services : requestPurposes;

    // Apply Search Filter
    if (searchTerm) {
        currentList = currentList.filter(item => {
            const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const specialistMatch = item.specialist?.toLowerCase().includes(searchTerm.toLowerCase());
            return nameMatch || specialistMatch;
        });
    }

    // Apply Sorting
    const sortedList = [...currentList].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Handle string comparisons (case-insensitive)
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Calculate Pagination
    const totalPages = Math.ceil(sortedList.length / itemsPerPage);
    const paginatedItems = sortedList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1); // Reset page on tab switch
    }, [activeTab]);

    return (
        <Layout>
            <div className="p-8">
                {/* Modern Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Database className="w-6 h-6 text-slate-800" /> Data Master
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Kelola referensi Dokter, Asuransi, Layanan, dan Keperluan</p>
                    </div>
                </div>

                {/* Control Bar & Tabs */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                        {/* Segmented Tabs */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                            {[
                                { id: 'doctors', label: 'Dokter', icon: Stethoscope, count: doctors.length },
                                { id: 'insurances', label: 'Asuransi', icon: Shield, count: insurances.length },
                                { id: 'services', label: 'Layanan', icon: Activity, count: services.length },
                                { id: 'purposes', label: 'Keperluan', icon: Target, count: requestPurposes.length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'} />
                                    {tab.label}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Cari data..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => handleOpenModal()}
                            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-95"
                        >
                            <Plus size={18} />
                            Tambah {activeTab === 'doctors' ? 'Dokter' : activeTab === 'insurances' ? 'Asuransi' : activeTab === 'services' ? 'Layanan' : 'Keperluan'}
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-700 uppercase leading-normal border-b border-slate-200">
                                    <th className="py-3 px-6 text-left font-bold">No</th>
                                    {activeTab === 'doctors' ? (
                                        <>
                                            <th className="py-3 px-6 text-left">
                                                <button
                                                    onClick={() => handleSort('name')}
                                                    className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                                >
                                                    <span>Nama Dokter</span>
                                                    {sortConfig.key === 'name' ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3 px-6 text-left">
                                                <button
                                                    onClick={() => handleSort('specialist')}
                                                    className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                                >
                                                    <span>Spesialisasi</span>
                                                    {sortConfig.key === 'specialist' ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                                                    )}
                                                </button>
                                            </th>
                                        </>
                                    ) : (
                                        <th className="py-3 px-6 text-left">
                                            <button
                                                onClick={() => handleSort('name')}
                                                className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                            >
                                                <span>{activeTab === 'insurances' ? 'Nama Asuransi' : activeTab === 'services' ? 'Nama Layanan' : 'Nama Keperluan'}</span>
                                                {sortConfig.key === 'name' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                                                )}
                                            </button>
                                        </th>
                                    )}
                                    <th className="py-3 px-6 text-right font-bold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500 italic">Belum ada data.</td>
                                    </tr>
                                ) : (
                                    paginatedItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 w-12 text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            {activeTab === 'doctors' ? (
                                                <>
                                                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {item.specialist ? (
                                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-100">{item.specialist}</span>
                                                        ) : '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors" title="Hapus">
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
                </div>

                {/* Pagination */}
                {currentList.length > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 sm:gap-0">
                        <span>Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, currentList.length)} dari {currentList.length} data</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1.5 border border-slate-200 bg-white rounded-lg transition-colors font-medium
                                    ${currentPage === 1
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'hover:bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                            >
                                Prev
                            </button>
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all
                                            ${currentPage === i + 1
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1.5 border border-slate-200 bg-white rounded-lg transition-colors font-medium
                                    ${currentPage === totalPages
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'hover:bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>



            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-lg text-slate-800">
                                    {isEditMode ? 'Edit Data' : 'Tambah Data Baru'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        {activeTab === 'doctors' ? 'Nama Dokter' : activeTab === 'insurances' ? 'Nama Asuransi' : activeTab === 'services' ? 'Nama Layanan' : 'Nama Keperluan'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={modalData.name}
                                        onChange={e => setModalData({ ...modalData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={activeTab === 'doctors' ? 'Contoh: Dr. Budi Santoso' : activeTab === 'insurances' ? 'Contoh: BPJS Kesehatan' : activeTab === 'services' ? 'Contoh: Rawat Jalan' : 'Contoh: Klaim Asuransi'}
                                    />
                                </div>

                                {activeTab === 'doctors' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Spesialisasi</label>
                                        <input
                                            type="text"
                                            value={modalData.specialist || ''}
                                            onChange={e => setModalData({ ...modalData, specialist: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Contoh: Sp.PD, Sp.JP (Opsional)"
                                        />
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {isEditMode ? 'Simpan Perubahan' : 'Tambah Data'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Data?</h3>
                        <p className="text-sm text-slate-500 mb-2">Yakin ingin menghapus data ini?</p>
                        <p className="text-sm font-semibold text-slate-700 mb-6 bg-slate-100 py-2 px-3 rounded-lg">{deleteModal.name}</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                                className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
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
