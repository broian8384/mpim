import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ActivityLogger from '../utils/ActivityLogger';
import { Download, Upload, Database, Shield, Clock, CheckCircle, AlertTriangle, Save, FileJson, RotateCcw, Trash2, FileSpreadsheet, Table } from 'lucide-react';
import * as XLSX from 'xlsx';

const isElectron = () => window.api && window.api.requests;

export default function Backup() {
    const [backupHistory, setBackupHistory] = useState([]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupStats, setBackupStats] = useState(null);
    const [notification, setNotification] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState({ isOpen: false, type: '', data: [], fileName: '' });

    useEffect(() => {
        loadBackupHistory();
        calculateStats();
    }, []);

    const loadBackupHistory = () => {
        const history = JSON.parse(localStorage.getItem('mpim_backup_history') || '[]');
        setBackupHistory(history);
    };

    const calculateStats = async () => {
        let requests = [];
        let users = [];
        let doctors = [];
        let insurances = [];
        let services = [];

        if (isElectron()) {
            try {
                requests = await window.api.requests.getAll();
                users = await window.api.users.getAll();
            } catch (e) {
                console.error("Failed to fetch requests/users from API:", e);
            }
        } else {
            requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
            users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
        }

        // Fetch Master Data from correct source
        if (window.api && window.api.master) {
            try {
                doctors = await window.api.master.getDoctors() || [];
                insurances = await window.api.master.getInsurances() || [];
                services = await window.api.master.getServices() || [];
            } catch (e) {
                console.error("Failed to fetch master data from API:", e);
            }
        } else {
            doctors = JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
            insurances = JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
            services = JSON.parse(localStorage.getItem('mpim_services') || '[]');
        }

        setBackupStats({
            requests: requests.length,
            users: users.length,
            doctors: doctors.length,
            insurances: insurances.length,
            services: services.length,
            totalSize: new Blob([JSON.stringify({ requests, users, doctors, insurances, services })]).size
        });
    };

    const handleBackup = async () => {
        setIsBackingUp(true);

        try {
            let requests = [];
            let users = [];

            if (isElectron()) {
                requests = await window.api.requests.getAll();
                users = await window.api.users.getAll();
            } else {
                requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
            }

            // Collect all data
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    requests: requests,
                    users: users,
                    doctors: JSON.parse(localStorage.getItem('mpim_doctors') || '[]'),
                    insurances: JSON.parse(localStorage.getItem('mpim_insurances') || '[]'),
                    services: JSON.parse(localStorage.getItem('mpim_services') || '[]')
                }
            };

            // Create blob and download
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mpim-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Save to history
            const newHistory = [
                {
                    id: Date.now(),
                    timestamp: backupData.timestamp,
                    recordCount: backupData.data.requests.length,
                    size: blob.size,
                    type: 'manual'
                },
                ...backupHistory
            ].slice(0, 10); // Keep last 10

            localStorage.setItem('mpim_backup_history', JSON.stringify(newHistory));
            setBackupHistory(newHistory);

            ActivityLogger.log('EXPORT', {
                module: 'Backup',
                description: `Created backup with ${backupData.data.requests.length} requests`,
                target: `mpim-backup-${new Date().toISOString().split('T')[0]}.json`
            });

            setNotification({ type: 'success', message: 'Backup berhasil didownload!' });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Backup error:', error);
            setNotification({ type: 'error', message: 'Gagal membuat backup!' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsRestoring(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);

                // Validate backup structure
                if (!backupData.data || !backupData.timestamp) {
                    throw new Error('Invalid backup file format');
                }

                // Confirm restore
                if (!window.confirm('⚠️ PERINGATAN: Restore akan menimpa semua data saat ini. Lanjutkan?')) {
                    setIsRestoring(false);
                    return;
                }

                localStorage.setItem('mpim_requests', JSON.stringify(backupData.data.requests || []));
                localStorage.setItem('mpim_users', JSON.stringify(backupData.data.users || []));
                localStorage.setItem('mpim_doctors', JSON.stringify(backupData.data.doctors || []));
                localStorage.setItem('mpim_insurances', JSON.stringify(backupData.data.insurances || []));
                localStorage.setItem('mpim_services', JSON.stringify(backupData.data.services || []));

                ActivityLogger.log('UPDATE', {
                    module: 'Backup',
                    description: `Restored data from backup(${backupData.data.requests?.length || 0} requests)`,
                    target: file.name
                });

                setNotification({ type: 'success', message: 'Data berhasil direstore!' });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (error) {
                console.error('Restore error:', error);
                setNotification({ type: 'error', message: 'Gagal restore data! File tidak valid.' });
                setTimeout(() => setNotification(null), 3000);
            } finally {
                setIsRestoring(false);
                event.target.value = ''; // Reset input
            }
        };

        reader.readAsText(file);
    };

    const handleDeleteBackup = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = () => {
        const id = deleteModal.id;
        const newHistory = backupHistory.filter(item => item.id !== id);
        setBackupHistory(newHistory);
        localStorage.setItem('mpim_backup_history', JSON.stringify(newHistory));
        setDeleteModal({ isOpen: false, id: null });
        setNotification({ type: 'success', message: 'Riwayat backup berhasil dihapus' });
        setTimeout(() => setNotification(null), 3000);
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Download Excel Template for Requests
    const downloadRequestsTemplate = () => {
        const templateData = [
            {
                'No RM': 'RM001',
                'Nama Pasien': 'Contoh Nama Pasien',
                'No HP': '081234567890',
                'Tanggal Permintaan': '2024-01-15',
                'Dokter': 'Dr. Contoh, Sp.PD',
                'Asuransi': 'BPJS Kesehatan',
                'Jenis Layanan': 'Rawat Jalan (RJ)',
                'Keperluan': 'Klaim Asuransi',
                'Keterangan': 'Catatan tambahan'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Permintaan Medis');

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
            { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
        ];

        XLSX.writeFile(wb, 'template_permintaan_medis.xlsx');
        setNotification({ type: 'success', message: 'Template Permintaan Medis berhasil diunduh!' });
        setTimeout(() => setNotification(null), 3000);
    };

    // Download Excel Template for Master Data
    const downloadMasterTemplate = () => {
        const wb = XLSX.utils.book_new();

        // Dokter Sheet
        const dokterData = [{ 'Nama Dokter': 'Dr. Contoh Nama, Sp.PD', 'Spesialisasi': 'Penyakit Dalam' }];
        const wsDokter = XLSX.utils.json_to_sheet(dokterData);
        wsDokter['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsDokter, 'Dokter');

        // Asuransi Sheet
        const asuransiData = [{ 'Nama Asuransi': 'Contoh Nama Asuransi' }];
        const wsAsuransi = XLSX.utils.json_to_sheet(asuransiData);
        wsAsuransi['!cols'] = [{ wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsAsuransi, 'Asuransi');

        // Layanan Sheet
        const layananData = [{ 'Nama Layanan': 'Contoh Jenis Layanan' }];
        const wsLayanan = XLSX.utils.json_to_sheet(layananData);
        wsLayanan['!cols'] = [{ wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsLayanan, 'Layanan');

        XLSX.writeFile(wb, 'template_master_data.xlsx');
        setNotification({ type: 'success', message: 'Template Master Data berhasil diunduh!' });
        setTimeout(() => setNotification(null), 3000);
    };

    // Handle Excel Import for Requests
    const handleImportRequests = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    setNotification({ type: 'error', message: 'File Excel kosong!' });
                    setTimeout(() => setNotification(null), 3000);
                    return;
                }

                setImportPreview({ isOpen: true, type: 'requests', data: jsonData, fileName: file.name });
            } catch (error) {
                console.error('Import error:', error);
                setNotification({ type: 'error', message: 'Gagal membaca file Excel!' });
                setTimeout(() => setNotification(null), 3000);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    // Handle Excel Import for Master Data
    const handleImportMaster = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const masterData = {
                    doctors: [],
                    insurances: [],
                    services: []
                };

                // Parse each sheet
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (sheetName.toLowerCase().includes('dokter')) {
                        masterData.doctors = jsonData;
                    } else if (sheetName.toLowerCase().includes('asuransi')) {
                        masterData.insurances = jsonData;
                    } else if (sheetName.toLowerCase().includes('layanan')) {
                        masterData.services = jsonData;
                    }
                });

                const totalCount = masterData.doctors.length + masterData.insurances.length + masterData.services.length;
                if (totalCount === 0) {
                    setNotification({ type: 'error', message: 'Tidak ada data yang ditemukan!' });
                    setTimeout(() => setNotification(null), 3000);
                    return;
                }

                setImportPreview({ isOpen: true, type: 'master', data: masterData, fileName: file.name });
            } catch (error) {
                console.error('Import error:', error);
                setNotification({ type: 'error', message: 'Gagal membaca file Excel!' });
                setTimeout(() => setNotification(null), 3000);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    // Confirm Import Requests
    const confirmImportRequests = async () => {
        setIsImporting(true);
        try {
            const newRequests = importPreview.data.map((row, index) => ({
                id: Date.now() + index,
                noRM: row['No RM'] || '',
                patientName: row['Nama Pasien'] || '',
                phone: row['No HP'] || '',
                requestDate: row['Tanggal Permintaan'] || new Date().toISOString().split('T')[0],
                doctor: row['Dokter'] || '',
                insurance: row['Asuransi'] || '',
                serviceType: row['Jenis Layanan'] || '',
                purpose: row['Keperluan'] || '',
                notes: row['Keterangan'] || '',
                status: 'Diterima',
                createdAt: new Date().toISOString()
            }));

            if (isElectron() && window.api.requests.create) {
                for (const req of newRequests) {
                    await window.api.requests.create(req);
                }
            } else {
                const existing = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                localStorage.setItem('mpim_requests', JSON.stringify([...existing, ...newRequests]));
            }

            ActivityLogger.log('IMPORT', {
                module: 'Backup',
                description: `Imported ${newRequests.length} requests from Excel`,
                target: importPreview.fileName
            });

            setNotification({ type: 'success', message: `${newRequests.length} permintaan berhasil diimport!` });
            setImportPreview({ isOpen: false, type: '', data: [], fileName: '' });
            calculateStats();
        } catch (error) {
            console.error('Import error:', error);
            setNotification({ type: 'error', message: 'Gagal mengimport data!' });
        } finally {
            setIsImporting(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Confirm Import Master Data
    const confirmImportMaster = async () => {
        setIsImporting(true);
        try {
            const { doctors, insurances, services } = importPreview.data;

            // Process doctors
            if (doctors.length > 0) {
                const newDoctors = doctors.map((row, i) => ({
                    id: Date.now() + i,
                    name: row['Nama Dokter'] || '',
                    specialist: row['Spesialisasi'] || ''
                }));

                if (window.api && window.api.master) {
                    const existing = await window.api.master.getDoctors() || [];
                    await window.api.master.saveDoctors([...existing, ...newDoctors]);
                } else {
                    const existing = JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
                    localStorage.setItem('mpim_doctors', JSON.stringify([...existing, ...newDoctors]));
                }
            }

            // Process insurances
            if (insurances.length > 0) {
                const newInsurances = insurances.map((row, i) => ({
                    id: Date.now() + 1000 + i,
                    name: row['Nama Asuransi'] || ''
                }));

                if (window.api && window.api.master) {
                    const existing = await window.api.master.getInsurances() || [];
                    await window.api.master.saveInsurances([...existing, ...newInsurances]);
                } else {
                    const existing = JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
                    localStorage.setItem('mpim_insurances', JSON.stringify([...existing, ...newInsurances]));
                }
            }

            // Process services
            if (services.length > 0) {
                const newServices = services.map((row, i) => ({
                    id: Date.now() + 2000 + i,
                    name: row['Nama Layanan'] || ''
                }));

                if (window.api && window.api.master) {
                    const existing = await window.api.master.getServices() || [];
                    await window.api.master.saveServices([...existing, ...newServices]);
                } else {
                    const existing = JSON.parse(localStorage.getItem('mpim_services') || '[]');
                    localStorage.setItem('mpim_services', JSON.stringify([...existing, ...newServices]));
                }
            }

            const totalImported = doctors.length + insurances.length + services.length;

            ActivityLogger.log('IMPORT', {
                module: 'Backup',
                description: `Imported master data: ${doctors.length} doctors, ${insurances.length} insurances, ${services.length} services`,
                target: importPreview.fileName
            });

            setNotification({ type: 'success', message: `${totalImported} data master berhasil diimport!` });
            setImportPreview({ isOpen: false, type: '', data: [], fileName: '' });
            calculateStats();
        } catch (error) {
            console.error('Import error:', error);
            setNotification({ type: 'error', message: 'Gagal mengimport data!' });
        } finally {
            setIsImporting(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Database className="w-7 h-7 text-blue-600" />
                        Backup & Restore Data
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Kelola cadangan data sistem untuk keamanan dan pemulihan</p>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`mb - 6 p - 4 rounded - xl border flex items - start gap - 3 animate -in fade -in slide -in -from - top - 2 ${notification.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium">{notification.message}</span>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <FileJson className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Data</p>
                                <p className="text-2xl font-bold text-slate-900">{backupStats?.requests || 0}</p>
                                <p className="text-xs text-slate-600 mt-1">Permintaan Medis</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <Database className="w-8 h-8 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Master Data</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {(backupStats?.doctors || 0) + (backupStats?.insurances || 0) + (backupStats?.services || 0)}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">Dokter, Asuransi, Layanan</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Clock className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Backup Terakhir</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {backupHistory.length > 0
                                        ? new Date(backupHistory[0].timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                                        : 'Belum Ada'}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                    {backupHistory.length > 0 && new Date(backupHistory[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Backup */}
                    <div className="bg-slate-900 p-8 rounded-2xl text-white relative overflow-hidden">
                        <div className="relative">
                            <div className="p-3 bg-blue-600 rounded-xl inline-block mb-4">
                                <Download className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Backup Data</h3>
                            <p className="text-slate-400 text-sm mb-6">Download semua data sistem ke file JSON untuk cadangan keamanan</p>
                            <button
                                onClick={handleBackup}
                                disabled={isBackingUp}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBackingUp ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        <span>Download Backup</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Restore */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-200 relative overflow-hidden">
                        <div className="relative">
                            <div className="p-3 bg-blue-50 rounded-xl inline-block mb-4">
                                <Upload className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Restore Data</h3>
                            <p className="text-slate-500 text-sm mb-6">Upload file backup untuk mengembalikan data sistem sebelumnya</p>
                            <label className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer inline-flex">
                                <Upload size={18} />
                                <span>Upload Backup</span>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleRestore}
                                    disabled={isRestoring}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Import Excel Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Import dari Excel</h3>
                            <p className="text-sm text-slate-500">Upload data dari file Excel (.xlsx)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Import Requests */}
                        <div className="border border-slate-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Table className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold text-slate-800">Permintaan Medis</h4>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Import data permintaan dari file Excel</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={downloadRequestsTemplate}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} />
                                    Download Template
                                </button>
                                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                                    <Upload size={16} />
                                    Upload Excel
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportRequests}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Import Master Data */}
                        <div className="border border-slate-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Database className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold text-slate-800">Data Master</h4>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Import Dokter, Asuransi, dan Layanan</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={downloadMasterTemplate}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} />
                                    Download Template
                                </button>
                                <label className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                                    <Upload size={16} />
                                    Upload Excel
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportMaster}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backup History */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-600" />
                            Riwayat Backup
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold tracking-wide">
                                <tr>
                                    <th className="px-6 py-4 text-left">Tanggal & Waktu</th>
                                    <th className="px-6 py-4 text-center">Jumlah Data</th>
                                    <th className="px-6 py-4 text-center">Ukuran File</th>
                                    <th className="px-6 py-4 text-center">Tipe</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {backupHistory.length > 0 ? (
                                    backupHistory.map((backup) => (
                                        <tr key={backup.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {new Date(backup.timestamp).toLocaleDateString('id-ID', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(backup.timestamp).toLocaleTimeString('id-ID')}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-blue-600">{backup.recordCount}</span> permintaan
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-700 font-medium">
                                                {formatBytes(backup.size)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                                                    {backup.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteBackup(backup.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus Riwayat"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">Belum ada riwayat backup</p>
                                            <p className="text-xs mt-1">Buat backup pertama untuk keamanan data Anda</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-900 mb-2">💡 Tips Backup Data:</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Lakukan backup secara berkala (minimal 1x seminggu)</li>
                                <li>• Simpan file backup di lokasi aman (cloud storage, external drive)</li>
                                <li>• Verifikasi file backup sebelum menghapus data lama</li>
                                <li>• Restore hanya dari sumber terpercaya untuk menghindari kehilangan data</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {
                deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Riwayat?</h3>
                            <p className="text-sm text-slate-500 mb-6">Log ini akan dihapus permanen dari daftar.</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Batal</button>
                                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Import Preview Modal */}
            {importPreview.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Preview Import</h3>
                                    <p className="text-sm text-slate-500">{importPreview.fileName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setImportPreview({ isOpen: false, type: '', data: [], fileName: '' })}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {importPreview.type === 'requests' && (
                                <>
                                    <p className="text-sm text-slate-600 mb-4">
                                        <span className="font-bold text-blue-600">{importPreview.data.length}</span> data permintaan akan diimport:
                                    </p>
                                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">No RM</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama Pasien</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Layanan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {importPreview.data.slice(0, 5).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-slate-700">{row['No RM'] || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-700">{row['Nama Pasien'] || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-700">{row['Jenis Layanan'] || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {importPreview.data.length > 5 && (
                                        <p className="text-xs text-slate-400 mt-2 text-center">...dan {importPreview.data.length - 5} data lainnya</p>
                                    )}
                                </>
                            )}

                            {importPreview.type === 'master' && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                            <p className="text-2xl font-bold text-blue-700">{importPreview.data.doctors?.length || 0}</p>
                                            <p className="text-xs text-blue-600">Dokter</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                            <p className="text-2xl font-bold text-green-700">{importPreview.data.insurances?.length || 0}</p>
                                            <p className="text-xs text-green-600">Asuransi</p>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                                            <p className="text-2xl font-bold text-purple-700">{importPreview.data.services?.length || 0}</p>
                                            <p className="text-xs text-purple-600">Layanan</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500">Data akan ditambahkan ke data master yang sudah ada.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setImportPreview({ isOpen: false, type: '', data: [], fileName: '' })}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={importPreview.type === 'requests' ? confirmImportRequests : confirmImportMaster}
                                disabled={isImporting}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Mengimport...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>Import Data</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
