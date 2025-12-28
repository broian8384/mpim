import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ActivityLogger from '../utils/ActivityLogger';
import { Download, Upload, Database, Shield, Clock, CheckCircle, AlertTriangle, Save, FileJson, RotateCcw, Trash2, FileSpreadsheet, Table, RefreshCw, AlertCircle, Timer, ToggleLeft, ToggleRight } from 'lucide-react';
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

    // Reset Database States
    const [resetModal, setResetModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetOptions, setResetOptions] = useState({
        requests: true,
        users: true,
        doctors: false,
        insurances: false,
        services: false,
        activityLog: true
    });

    // Auto-Backup States
    const [autoBackupSettings, setAutoBackupSettings] = useState({
        enabled: false,
        frequency: 'daily',
        retention: 7,
        lastBackup: null
    });
    const [savingAutoBackup, setSavingAutoBackup] = useState(false);
    const [autoBackupList, setAutoBackupList] = useState([]);

    useEffect(() => {
        loadBackupHistory();
        calculateStats();
        loadAutoBackupSettings();
    }, []);

    const loadBackupHistory = () => {
        const history = JSON.parse(localStorage.getItem('mpim_backup_history') || '[]');
        setBackupHistory(history);
    };

    // Load Auto-Backup Settings
    const loadAutoBackupSettings = async () => {
        try {
            if (window.api && window.api.backup) {
                const settings = await window.api.backup.getSettings();
                setAutoBackupSettings(settings);

                // Also load backup list
                const result = await window.api.backup.list();
                if (result.success) {
                    setAutoBackupList(result.backups);
                }
            }
        } catch (error) {
            console.error('Failed to load auto-backup settings:', error);
        }
    };

    // Save Auto-Backup Settings
    const saveAutoBackupSettings = async (newSettings) => {
        setSavingAutoBackup(true);
        try {
            if (window.api && window.api.backup) {
                const updated = await window.api.backup.updateSettings(newSettings);
                setAutoBackupSettings(updated);
                setNotification({ type: 'success', message: 'Pengaturan auto-backup berhasil disimpan!' });

                // Log activity
                ActivityLogger.log('BACKUP_SETTINGS', {
                    action: newSettings.enabled ? 'enabled' : 'disabled',
                    frequency: newSettings.frequency,
                    retention: newSettings.retention
                });
            } else {
                // Fallback for non-Electron
                localStorage.setItem('mpim_auto_backup_settings', JSON.stringify(newSettings));
                setAutoBackupSettings(newSettings);
                setNotification({ type: 'success', message: 'Pengaturan auto-backup disimpan (browser mode)' });
            }
        } catch (error) {
            console.error('Failed to save auto-backup settings:', error);
            setNotification({ type: 'error', message: 'Gagal menyimpan pengaturan: ' + error.message });
        } finally {
            setSavingAutoBackup(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Trigger manual auto-backup
    const triggerManualBackup = async () => {
        try {
            if (window.api && window.api.backup) {
                setIsBackingUp(true);
                const result = await window.api.backup.create(false);
                if (result.success) {
                    setNotification({ type: 'success', message: result.message });
                    loadAutoBackupSettings(); // Refresh list
                } else {
                    setNotification({ type: 'error', message: result.message });
                }
            }
        } catch (error) {
            setNotification({ type: 'error', message: 'Gagal membuat backup: ' + error.message });
        } finally {
            setIsBackingUp(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Delete auto-backup file
    const deleteAutoBackup = async (filepath) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus file backup ini secara permanen?')) {
            return;
        }

        try {
            if (window.api && window.api.backup) {
                const result = await window.api.backup.delete(filepath);
                if (result.success) {
                    setNotification({ type: 'success', message: result.message });
                    loadAutoBackupSettings(); // Refresh list
                } else {
                    setNotification({ type: 'error', message: result.message });
                }
            }
        } catch (error) {
            setNotification({ type: 'error', message: 'Gagal menghapus: ' + error.message });
        } finally {
            setTimeout(() => setNotification(null), 3000);
        }
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

    // Backup to Excel Format
    const handleBackupExcel = async () => {
        setIsBackingUp(true);
        try {
            let requests = [];
            let users = [];
            let doctors = [];
            let insurances = [];
            let services = [];

            if (isElectron()) {
                requests = await window.api.requests.getAll();
                users = await window.api.users.getAll();
                if (window.api.master) {
                    doctors = await window.api.master.getDoctors() || [];
                    insurances = await window.api.master.getInsurances() || [];
                    services = await window.api.master.getServices() || [];
                }
            } else {
                requests = JSON.parse(localStorage.getItem('mpim_requests') || '[]');
                users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                doctors = JSON.parse(localStorage.getItem('mpim_doctors') || '[]');
                insurances = JSON.parse(localStorage.getItem('mpim_insurances') || '[]');
                services = JSON.parse(localStorage.getItem('mpim_services') || '[]');
            }

            const wb = XLSX.utils.book_new();

            // Sheet 1: Permintaan Medis
            const requestsData = requests.map(req => ({
                'No Registrasi': req.regNumber || '',
                'No Rekam Medis': req.medRecordNumber || '',
                'Nama Pasien': req.patientName || '',
                'Nama Pemohon': req.applicantName || '',
                'Email': req.email || '',
                'WhatsApp': req.whatsapp || '',
                'Jenis Layanan': req.type || '',
                'Asuransi': req.insuranceName || '',
                'Dokter': req.doctorName || '',
                'Tanggal Kunjungan Mulai': req.visitDateStart || '',
                'Tanggal Kunjungan Selesai': req.visitDateEnd || '',
                'Status': req.status || '',
                'Catatan': req.notes || '',
                'Tanggal Dibuat': req.createdAt || ''
            }));
            const wsRequests = XLSX.utils.json_to_sheet(requestsData.length > 0 ? requestsData : [{ 'Info': 'Tidak ada data' }]);
            wsRequests['!cols'] = [
                { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
                { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
                { wch: 30 }, { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, wsRequests, 'Permintaan Medis');

            // Sheet 2: Users (tanpa password)
            const usersData = users.map(u => ({
                'ID': u.id || '',
                'Nama': u.name || '',
                'Username': u.username || '',
                'Email': u.email || '',
                'Role': u.role || '',
                'Status': u.status || '',
                'Tanggal Bergabung': u.joinDate || ''
            }));
            const wsUsers = XLSX.utils.json_to_sheet(usersData.length > 0 ? usersData : [{ 'Info': 'Tidak ada data' }]);
            wsUsers['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');

            // Sheet 3: Dokter
            const doctorsData = doctors.map(d => ({
                'ID': d.id || '',
                'Nama Dokter': typeof d === 'string' ? d : (d.name || ''),
                'Spesialisasi': typeof d === 'string' ? '' : (d.specialist || '')
            }));
            const wsDoctors = XLSX.utils.json_to_sheet(doctorsData.length > 0 ? doctorsData : [{ 'Info': 'Tidak ada data' }]);
            wsDoctors['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, wsDoctors, 'Dokter');

            // Sheet 4: Asuransi
            const insurancesData = insurances.map(i => ({
                'ID': i.id || '',
                'Nama Asuransi': typeof i === 'string' ? i : (i.name || '')
            }));
            const wsInsurances = XLSX.utils.json_to_sheet(insurancesData.length > 0 ? insurancesData : [{ 'Info': 'Tidak ada data' }]);
            wsInsurances['!cols'] = [{ wch: 8 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, wsInsurances, 'Asuransi');

            // Sheet 5: Layanan
            const servicesData = services.map(s => ({
                'ID': s.id || '',
                'Nama Layanan': typeof s === 'string' ? s : (s.name || '')
            }));
            const wsServices = XLSX.utils.json_to_sheet(servicesData.length > 0 ? servicesData : [{ 'Info': 'Tidak ada data' }]);
            wsServices['!cols'] = [{ wch: 8 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, wsServices, 'Layanan');

            // Download file
            const fileName = `mpim-backup-${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            // Save to history
            const newHistory = [
                {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    recordCount: requests.length,
                    size: 0, // Excel size not easily calculated
                    type: 'excel'
                },
                ...backupHistory
            ].slice(0, 10);

            localStorage.setItem('mpim_backup_history', JSON.stringify(newHistory));
            setBackupHistory(newHistory);

            ActivityLogger.log('EXPORT', {
                module: 'Backup',
                description: `Created Excel backup with ${requests.length} requests`,
                target: fileName
            });

            setNotification({ type: 'success', message: 'Backup Excel berhasil didownload!' });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Excel Backup error:', error);
            setNotification({ type: 'error', message: 'Gagal membuat backup Excel!' });
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

    // Handle Excel Restore
    const handleRestoreExcel = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsRestoring(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Parse each sheet
                const restoredData = {
                    requests: [],
                    users: [],
                    doctors: [],
                    insurances: [],
                    services: []
                };

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (sheetName.toLowerCase().includes('permintaan') || sheetName.toLowerCase().includes('request')) {
                        restoredData.requests = jsonData.map((row, index) => ({
                            id: row['ID'] || Date.now() + index,
                            noRM: row['No RM'] || '',
                            patientName: row['Nama Pasien'] || '',
                            phone: row['No HP'] || '',
                            requestDate: row['Tanggal Permintaan'] || '',
                            doctor: row['Dokter'] || '',
                            insurance: row['Asuransi'] || '',
                            serviceType: row['Jenis Layanan'] || '',
                            purpose: row['Keperluan'] || '',
                            notes: row['Keterangan'] || '',
                            status: row['Status'] || 'Diterima',
                            createdAt: row['Dibuat Pada'] || new Date().toISOString()
                        }));
                    } else if (sheetName.toLowerCase().includes('user')) {
                        restoredData.users = jsonData.map((row, index) => ({
                            id: row['ID'] || Date.now() + index,
                            name: row['Nama'] || '',
                            username: row['Username'] || '',
                            email: row['Email'] || '',
                            role: row['Role'] || 'user',
                            status: row['Status'] || 'active',
                            joinDate: row['Tanggal Bergabung'] || new Date().toISOString().split('T')[0]
                        }));
                    } else if (sheetName.toLowerCase().includes('dokter') || sheetName.toLowerCase().includes('doctor')) {
                        restoredData.doctors = jsonData.map((row, index) => ({
                            id: row['ID'] || Date.now() + index,
                            name: row['Nama Dokter'] || '',
                            specialist: row['Spesialisasi'] || ''
                        }));
                    } else if (sheetName.toLowerCase().includes('asuransi') || sheetName.toLowerCase().includes('insurance')) {
                        restoredData.insurances = jsonData.map((row, index) => ({
                            id: row['ID'] || Date.now() + index,
                            name: row['Nama Asuransi'] || ''
                        }));
                    } else if (sheetName.toLowerCase().includes('layanan') || sheetName.toLowerCase().includes('service')) {
                        restoredData.services = jsonData.map((row, index) => ({
                            id: row['ID'] || Date.now() + index,
                            name: row['Nama Layanan'] || ''
                        }));
                    }
                });

                const totalData = restoredData.requests.length + restoredData.users.length +
                    restoredData.doctors.length + restoredData.insurances.length +
                    restoredData.services.length;

                if (totalData === 0) {
                    throw new Error('Tidak ada data yang valid ditemukan dalam file Excel');
                }

                // Confirm restore
                if (!window.confirm(`⚠️ PERINGATAN: Restore akan menimpa data saat ini dengan:\n- ${restoredData.requests.length} Permintaan Medis\n- ${restoredData.users.length} Users\n- ${restoredData.doctors.length} Dokter\n- ${restoredData.insurances.length} Asuransi\n- ${restoredData.services.length} Layanan\n\nLanjutkan?`)) {
                    setIsRestoring(false);
                    event.target.value = '';
                    return;
                }

                // Restore data
                if (restoredData.requests.length > 0) {
                    localStorage.setItem('mpim_requests', JSON.stringify(restoredData.requests));
                }
                if (restoredData.users.length > 0) {
                    localStorage.setItem('mpim_users', JSON.stringify(restoredData.users));
                }
                if (restoredData.doctors.length > 0) {
                    localStorage.setItem('mpim_doctors', JSON.stringify(restoredData.doctors));
                }
                if (restoredData.insurances.length > 0) {
                    localStorage.setItem('mpim_insurances', JSON.stringify(restoredData.insurances));
                }
                if (restoredData.services.length > 0) {
                    localStorage.setItem('mpim_services', JSON.stringify(restoredData.services));
                }

                ActivityLogger.log('UPDATE', {
                    module: 'Backup',
                    description: `Restored data from Excel backup (${restoredData.requests.length} requests, ${restoredData.doctors.length} doctors, ${restoredData.insurances.length} insurances, ${restoredData.services.length} services)`,
                    target: file.name
                });

                setNotification({ type: 'success', message: 'Data berhasil direstore dari Excel!' });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (error) {
                console.error('Excel Restore error:', error);
                setNotification({ type: 'error', message: 'Gagal restore data! ' + error.message });
                setTimeout(() => setNotification(null), 3000);
            } finally {
                setIsRestoring(false);
                event.target.value = '';
            }
        };

        reader.readAsArrayBuffer(file);
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

    // Reset Database Handler
    const handleResetDatabase = async () => {
        if (resetConfirmText !== 'RESET') {
            setNotification({ type: 'error', message: 'Ketik "RESET" untuk mengkonfirmasi!' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        // Check if at least one option is selected
        const hasSelection = Object.values(resetOptions).some(v => v);
        if (!hasSelection) {
            setNotification({ type: 'error', message: 'Pilih minimal satu data untuk direset!' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        setIsResetting(true);

        try {
            const resetItems = [];

            if (isElectron() && window.api.settings && window.api.settings.resetDatabase) {
                // Electron mode - pass options to backend
                const result = await window.api.settings.resetDatabase(resetOptions);
                if (result.success) {
                    // Build description
                    if (resetOptions.requests) resetItems.push('permintaan');
                    if (resetOptions.users) resetItems.push('users non-admin');
                    if (resetOptions.doctors) resetItems.push('dokter');
                    if (resetOptions.insurances) resetItems.push('asuransi');
                    if (resetOptions.services) resetItems.push('layanan');
                    if (resetOptions.activityLog) resetItems.push('log aktivitas');

                    ActivityLogger.log('DELETE', {
                        module: 'System',
                        description: `Database reset - ${resetItems.join(', ')} dihapus`,
                        target: 'Database'
                    });

                    setNotification({ type: 'success', message: result.message });
                    setResetModal(false);
                    setResetConfirmText('');

                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    setNotification({ type: 'error', message: result.message });
                }
            } else {
                // Web mode - reset localStorage based on options
                if (resetOptions.requests) {
                    localStorage.setItem('mpim_requests', JSON.stringify([]));
                    resetItems.push('permintaan');
                }

                if (resetOptions.activityLog) {
                    localStorage.removeItem('mpim_activity_logs');
                    resetItems.push('log aktivitas');
                }

                if (resetOptions.users) {
                    // Keep only admin users
                    const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                    const adminUsers = users.filter(u => u.role === 'Super Admin' || u.role === 'Admin');
                    if (adminUsers.length > 0) {
                        localStorage.setItem('mpim_users', JSON.stringify(adminUsers));
                    } else if (users.length > 0) {
                        localStorage.setItem('mpim_users', JSON.stringify([users[0]]));
                    }
                    resetItems.push('users non-admin');
                }

                if (resetOptions.doctors) {
                    // Set empty array instead of removeItem to prevent default data from loading
                    localStorage.setItem('mpim_doctors', JSON.stringify([]));
                    resetItems.push('dokter');
                }

                if (resetOptions.insurances) {
                    localStorage.setItem('mpim_insurances', JSON.stringify([]));
                    resetItems.push('asuransi');
                }

                if (resetOptions.services) {
                    localStorage.setItem('mpim_services', JSON.stringify([]));
                    resetItems.push('layanan');
                }

                ActivityLogger.log('DELETE', {
                    module: 'System',
                    description: `Database reset - ${resetItems.join(', ')} dihapus`,
                    target: 'Database'
                });

                setNotification({ type: 'success', message: `Berhasil mereset: ${resetItems.join(', ')}` });
                setResetModal(false);
                setResetConfirmText('');

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            console.error('Reset Database Error:', error);
            setNotification({ type: 'error', message: 'Gagal reset database: ' + error.message });
        } finally {
            setIsResetting(false);
            setTimeout(() => setNotification(null), 5000);
        }
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

                {/* Notification Alert */}
                {notification && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${notification.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
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
                                <Database className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ukuran Database</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {backupStats?.totalSize
                                        ? (backupStats.totalSize / 1024).toFixed(2) + ' KB'
                                        : '0 KB'}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">Estimasi ukuran file backup JSON</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Backup Card */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-20 -mt-20"></div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-600 rounded-xl">
                                    <Download className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Backup Data</h3>
                                    <p className="text-slate-400 text-xs">Unduh semua data sistem</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mb-4">Simpan cadangan data dalam format JSON atau Excel untuk keamanan</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleBackup}
                                    disabled={isBackingUp}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isBackingUp ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <FileJson size={16} />
                                    )}
                                    <span>JSON</span>
                                </button>
                                <button
                                    onClick={handleBackupExcel}
                                    disabled={isBackingUp}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isBackingUp ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <FileSpreadsheet size={16} />
                                    )}
                                    <span>Excel</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Restore Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full -mr-20 -mt-20"></div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-amber-100 rounded-xl">
                                    <RotateCcw className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Restore Data</h3>
                                    <p className="text-slate-500 text-xs">Pulihkan dari file backup</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mb-4">Upload file backup JSON atau Excel untuk mengembalikan data sistem</p>
                            <div className="flex flex-wrap gap-2">
                                <label className={`bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${isRestoring ? 'opacity-50' : ''}`}>
                                    {isRestoring ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <FileJson size={16} />
                                    )}
                                    <span>JSON</span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleRestore}
                                        disabled={isRestoring}
                                        className="hidden"
                                    />
                                </label>
                                <label className={`bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${isRestoring ? 'opacity-50' : ''}`}>
                                    {isRestoring ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <FileSpreadsheet size={16} />
                                    )}
                                    <span>Excel</span>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleRestoreExcel}
                                        disabled={isRestoring}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto-Backup Section */}
                {window.api && window.api.backup && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-100 rounded-xl">
                                    <Timer className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Auto-Backup</h3>
                                    <p className="text-sm text-slate-500">Backup otomatis secara terjadwal</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newSettings = { ...autoBackupSettings, enabled: !autoBackupSettings.enabled };
                                    saveAutoBackupSettings(newSettings);
                                }}
                                disabled={savingAutoBackup}
                                className={`relative w-14 h-7 rounded-full transition-colors ${autoBackupSettings.enabled ? 'bg-purple-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoBackupSettings.enabled ? 'left-8' : 'left-1'}`}></span>
                            </button>
                        </div>

                        {autoBackupSettings.enabled && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Frekuensi</label>
                                        <select
                                            value={autoBackupSettings.frequency}
                                            onChange={(e) => {
                                                const newSettings = { ...autoBackupSettings, frequency: e.target.value };
                                                saveAutoBackupSettings(newSettings);
                                            }}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        >
                                            <option value="daily">Harian</option>
                                            <option value="weekly">Mingguan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Simpan Backup Selama</label>
                                        <select
                                            value={autoBackupSettings.retention}
                                            onChange={(e) => {
                                                const newSettings = { ...autoBackupSettings, retention: parseInt(e.target.value) };
                                                saveAutoBackupSettings(newSettings);
                                            }}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        >
                                            <option value={3}>3 Hari</option>
                                            <option value={7}>7 Hari</option>
                                            <option value={14}>14 Hari</option>
                                            <option value={30}>30 Hari</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Backup Terakhir</label>
                                        <div className="px-4 py-2.5 bg-slate-100 rounded-xl text-slate-700 text-sm">
                                            {autoBackupSettings.lastBackup
                                                ? new Date(autoBackupSettings.lastBackup).toLocaleString('id-ID')
                                                : 'Belum ada'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <p className="text-sm text-slate-500">
                                        💡 Backup akan disimpan di folder <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">%APPDATA%/mpim/backups</code>
                                    </p>
                                    <button
                                        onClick={triggerManualBackup}
                                        disabled={isBackingUp}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isBackingUp ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        Backup Sekarang
                                    </button>
                                </div>

                                {/* Removed inline Auto-Backup List */}
                            </>
                        )}

                        {!autoBackupSettings.enabled && (
                            <div className="text-center py-6 text-slate-500">
                                <Timer className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">Auto-backup dinonaktifkan. Aktifkan untuk backup otomatis.</p>
                            </div>
                        )}
                    </div>
                )}

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

                {/* Available Backup Files Table */}
                {window.api && window.api.backup && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Database className="w-5 h-5 text-purple-600" />
                                File Backup Tersedia
                            </h3>
                            <button
                                onClick={loadAutoBackupSettings}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold tracking-wide">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Nama File / Tanggal</th>
                                        <th className="px-6 py-4 text-center">Tipe</th>
                                        <th className="px-6 py-4 text-center">Ukuran</th>
                                        <th className="px-6 py-4 text-center">Lokasi</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {autoBackupList.length > 0 ? (
                                        autoBackupList.map((backup, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${backup.isAutomatic ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                                            <FileJson className={`w-5 h-5 ${backup.isAutomatic ? 'text-purple-600' : 'text-blue-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]" title={backup.name}>{backup.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {new Date(backup.createdAt).toLocaleDateString('id-ID', {
                                                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                                                })} • {new Date(backup.createdAt).toLocaleTimeString('id-ID')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${backup.isAutomatic
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {backup.isAutomatic ? 'Auto' : 'Manual'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-700 font-mono text-xs">
                                                    {(backup.size / 1024).toFixed(2)} KB
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded select-all font-mono" title={backup.path}>
                                                        DISK (Local)
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                // Use existing handleRestore logic but with direct file reading if implemented
                                                                // Or better, add specific restore method
                                                                if (window.confirm('Apakah Anda yakin ingin me-restore database dari file ini? Data saat ini akan digantikan.')) {
                                                                    setIsRestoring(true);
                                                                    try {
                                                                        const result = await window.api.backup.restore(backup.path);
                                                                        if (result.success) {
                                                                            setNotification({ type: 'success', message: 'Database berhasil dipulihkan!' });
                                                                            setTimeout(() => window.location.reload(), 1500);
                                                                        } else {
                                                                            setNotification({ type: 'error', message: result.message });
                                                                        }

                                                                        // Log Restore Activity
                                                                        ActivityLogger.log('RESTORE_DATA', {
                                                                            source: 'local_backup',
                                                                            filename: backup.name,
                                                                            type: backup.isAutomatic ? 'auto' : 'manual'
                                                                        });

                                                                    } catch (e) {
                                                                        setNotification({ type: 'error', message: 'Gagal restore: ' + e.message });
                                                                    } finally {
                                                                        setIsRestoring(false);
                                                                        setTimeout(() => setNotification(null), 3000);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Restore Data Ini"
                                                            disabled={isRestoring}
                                                        >
                                                            {isRestoring ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div> : <RotateCcw size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAutoBackup(backup.path)}
                                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus File"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p className="font-medium">Belum ada file backup tersimpan</p>
                                                <p className="text-xs mt-1">Aktifkan Auto-Backup atau lakukan Backup Manual</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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

                {/* Danger Zone - Reset Database */}
                <div className="mt-8 bg-red-50 border-2 border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 mb-1">⚠️ Zona Berbahaya</h3>
                            <p className="text-sm text-red-700 mb-4">
                                Reset database memungkinkan Anda menghapus data yang dipilih secara selektif.
                                Tindakan ini tidak dapat dibatalkan!
                            </p>
                            <button
                                onClick={() => setResetModal(true)}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw size={18} />
                                Reset Database
                            </button>
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

            {/* Reset Database Modal */}
            {resetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Reset Database?</h3>
                            <p className="text-sm text-slate-500">
                                Pilih data yang ingin direset. Tindakan ini <strong className="text-red-600">TIDAK DAPAT dibatalkan!</strong>
                            </p>
                        </div>

                        {/* Checkbox Options */}
                        <div className="mb-4 bg-slate-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-700 mb-3">Pilih data yang akan direset:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.requests}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, requests: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-slate-700">Permintaan Medis</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.users}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, users: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-slate-700">Users (Non-Admin)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.activityLog}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, activityLog: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-slate-700">Log Aktivitas</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.doctors}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, doctors: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Data Dokter</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.insurances}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, insurances: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Data Asuransi</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={resetOptions.services}
                                        onChange={(e) => setResetOptions(prev => ({ ...prev, services: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-slate-700">Data Layanan</span>
                                </label>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Ketik <span className="font-bold text-red-600">RESET</span> untuk mengkonfirmasi:
                            </label>
                            <input
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-center text-lg font-bold tracking-widest"
                                placeholder="RESET"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setResetModal(false);
                                    setResetConfirmText('');
                                }}
                                className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleResetDatabase}
                                disabled={resetConfirmText !== 'RESET' || isResetting || !Object.values(resetOptions).some(v => v)}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isResetting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Mereset...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        <span>Reset Database</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
