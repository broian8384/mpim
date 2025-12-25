import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import PrintPreview from '../components/PrintPreview';
import ActivityLogger from '../utils/ActivityLogger';
import { Plus, Search, Edit2, Trash2, X, FileText, Filter, Calendar, User, Clock, CheckCircle, ChevronRight, ChevronDown, Printer, Eye, AlertCircle, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Download, MessageCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TYPES = ['Rawat Jalan (RJ)', 'Rawat Inap (RI)', 'Riwayat Berobat', 'Vaksin', 'Visum et Repertum', 'Lainnya'];
const STATUSES = ['Pending', 'Proses', 'Selesai', 'Sudah Diambil', 'Ditolak'];

const isElectron = () => window.api && window.api.requests;
const isMasterElectron = () => window.api && window.api.master;

export default function MedicalRequests() {
    const [requests, setRequests] = useState([]);
    const location = useLocation();
    const [filterMode, setFilterMode] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Semua');
    const [dateRange, setDateRange] = useState({ start: '', end: '' }); // 'all' | 'alerts'
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Handle Navigation State
    useEffect(() => {
        if (location.state?.filterAlerts) {
            setFilterMode('alerts');
            // Clean state
            window.history.replaceState({}, document.title);
        } else if (location.state?.openId) {
            // ... existing logic ...
            if (requests.length > 0) {
                const target = requests.find(r => r.id === location.state.openId);
                if (target) handleViewDetail(target);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, requests]);

    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Initial Load
    useEffect(() => {
        const session = localStorage.getItem('mpim_user');
        if (session) setCurrentUser(JSON.parse(session));
        loadData();
        loadMasterData();
        loadSettings();
    }, []);

    const [settings, setSettings] = useState(null);

    const loadSettings = async () => {
        try {
            let data;
            if (window.api && window.api.settings) {
                data = await window.api.settings.get();
            } else {
                const localData = localStorage.getItem('mpim_settings');
                data = localData ? JSON.parse(localData) : null;
            }
            if (data) setSettings(data);
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    // Master Data State
    const [doctors, setDoctors] = useState([]);
    const [insurances, setInsurances] = useState([]);
    const [services, setServices] = useState([]);

    const loadMasterData = async () => {
        if (isMasterElectron()) {
            const d = await window.api.master.getDoctors();
            const i = await window.api.master.getInsurances();
            const s = await window.api.master.getServices();
            if (d) setDoctors(d);
            if (i) setInsurances(i);
            if (s) setServices(s);
        } else {
            const savedDoc = localStorage.getItem('mpim_doctors');
            const savedIns = localStorage.getItem('mpim_insurances');
            const savedSvc = localStorage.getItem('mpim_services');

            if (savedDoc) setDoctors(JSON.parse(savedDoc));
            if (savedIns) setInsurances(JSON.parse(savedIns));

            if (savedSvc) {
                setServices(JSON.parse(savedSvc));
            } else {
                // Initial Default for Services if nothing saved yet
                setServices(TYPES);
            }

            // Default fallbacks if empty (optional, or force user to add via master)
            if (!savedDoc) setDoctors(['Dr. Budi Santoso, Sp.PD', 'Dr. Siti Aminah, Sp.A']);
            if (!savedIns) setInsurances(['BPJS Kesehatan', 'Prudential', 'Umum/Pribadi']);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        if (isElectron()) {
            try {
                const data = await window.api.requests.getAll();
                setRequests(data.sort((a, b) => b.id - a.id));
            } catch (err) { console.error(err); }
        } else {
            const saved = localStorage.getItem('mpim_requests');
            setRequests(saved ? JSON.parse(saved) : []);
        }
        setIsLoading(false);
    };

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReq, setCurrentReq] = useState(null);
    const [formData, setFormData] = useState({
        medRecordNumber: '', patientName: '', email: '', whatsapp: '',
        type: 'Rawat Jalan (RJ)', visitDateStart: '', visitDateEnd: '',
        insuranceName: 'BPJS Kesehatan', doctorName: '', status: 'Pending',
        notes: '', applicantName: '', isPatientApplicant: true
    });

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [timelineReq, setTimelineReq] = useState(null);
    const [progressForm, setProgressForm] = useState({ date: '', status: 'Pending', note: '', collectedBy: '' });
    const [isCorrectionMode, setIsCorrectionMode] = useState(false);

    // Detail View State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailReq, setDetailReq] = useState(null);

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Print State
    const [printReq, setPrintReq] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filter Logic
    const filteredRequests = requests.filter(req => {
        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchName = req.patientName?.toLowerCase().includes(term);
            const matchRM = req.medRecordNumber?.toLowerCase().includes(term);
            if (!matchName && !matchRM) return false;
        }

        // Status Filter
        if (filterStatus !== 'Semua' && req.status !== filterStatus) return false;

        // Date Range Filter (Based on CreatedAt)
        if (dateRange.start) {
            const reqDate = new Date(req.createdAt).setHours(0, 0, 0, 0);
            const startDate = new Date(dateRange.start).setHours(0, 0, 0, 0);
            if (reqDate < startDate) return false;
        }
        if (dateRange.end) {
            const reqDate = new Date(req.createdAt).setHours(0, 0, 0, 0);
            const endDate = new Date(dateRange.end).setHours(0, 0, 0, 0);
            if (reqDate > endDate) return false;
        }

        if (filterMode === 'alerts') {
            const now = new Date();

            // 1. Time Alert (> 3 days)
            if (['Pending', 'Proses'].includes(req.status)) {
                const created = new Date(req.createdAt || 0);
                const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                if (diffDays >= 3) return true;
            }

            // 2. History Alert (>= 3 updates in Proses)
            if (req.status === 'Proses' && (req.history?.length || 0) >= 3) {
                return true;
            }

            return false;
        }
        return true;
    });

    // Sorting Handler
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Apply Sorting
    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle date fields
        if (sortConfig.key === 'createdAt') {
            aValue = new Date(aValue || 0).getTime();
            bValue = new Date(bValue || 0).getTime();
        }

        // Handle string comparisons (case-insensitive)
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = (bValue || '').toLowerCase();
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Pagination Logic (now uses sortedRequests instead of filteredRequests)
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRequests = sortedRequests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Export to Excel
    const handleExportExcel = () => {
        // Prepare COMPLETE data for export with ALL fields
        const exportData = sortedRequests.map((req, index) => ({
            'No': index + 1,
            'No. RM': req.medRecordNumber || '-',
            'Nama Pasien': req.patientName || '-',
            'Nama Pemohon': req.applicantName || '-',
            'Email': req.email || '-',
            'WhatsApp': req.whatsapp || '-',
            'Jenis Layanan': req.serviceType || req.type || '-',
            'Nama Asuransi': req.insuranceName || '-',
            'Nama Dokter': req.doctorName || '-',
            'Tanggal Berobat (Mulai)': req.visitDateStart ? new Date(req.visitDateStart).toLocaleDateString('id-ID') : '-',
            'Tanggal Berobat (Selesai)': req.visitDateEnd ? new Date(req.visitDateEnd).toLocaleDateString('id-ID') : '-',
            'Tanggal Pengajuan': req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-',
            'Status': req.status || '-',
            'Catatan/Keterangan': req.notes || '-',
            'Diterima Oleh': req.receiver || '-',
            'Jumlah Update History': req.history ? req.history.length : 0
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto-width kolom
        const colWidths = [
            { wch: 5 },  // No
            { wch: 15 }, // No RM
            { wch: 25 }, // Nama Pasien
            { wch: 25 }, // Nama Pemohon
            { wch: 30 }, // Email
            { wch: 18 }, // WhatsApp
            { wch: 20 }, // Jenis Layanan
            { wch: 20 }, // Asuransi
            { wch: 30 }, // Dokter
            { wch: 18 }, // Tgl Berobat Mulai
            { wch: 18 }, // Tgl Berobat Selesai
            { wch: 18 }, // Tgl Pengajuan
            { wch: 15 }, // Status
            { wch: 40 }, // Catatan
            { wch: 20 }, // Diterima Oleh
            { wch: 15 }  // Jumlah History
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Permintaan Medis');

        // Generate filename with current date
        const fileName = `Permintaan_Medis_Lengkap_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        ActivityLogger.log('EXPORT', {
            module: 'Requests',
            description: `Exported ${exportData.length} requests to Excel`,
            target: fileName
        });
    };

    // Export to PDF
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Laporan Lengkap - Penerimaan Informasi Medis', 14, 15);

            // Add date info
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const currentDate = new Date();
            const dateStr = currentDate.toLocaleDateString('id-ID');
            const timeStr = currentDate.toLocaleTimeString('id-ID');
            doc.text(`Dicetak: ${dateStr} ${timeStr} `, 14, 22);
            doc.text(`Total Data: ${sortedRequests.length} permintaan`, 14, 27);

            // Prepare COMPLETE table data with ALL fields
            const tableData = sortedRequests.map((req, index) => [
                index + 1,
                req.medRecordNumber || '-',
                req.patientName || '-',
                req.applicantName || '-',
                req.email || '-',
                req.whatsapp || '-',
                req.serviceType || req.type || '-',
                req.insuranceName || '-',
                req.doctorName || '-',
                req.visitDateStart ? new Date(req.visitDateStart).toLocaleDateString('id-ID') : '-',
                req.visitDateEnd ? new Date(req.visitDateEnd).toLocaleDateString('id-ID') : '-',
                req.status || '-',
                (req.notes || '-').substring(0, 50) + (req.notes && req.notes.length > 50 ? '...' : '')
            ]);

            // Generate table using autoTable
            autoTable(doc, {
                startY: 32,
                head: [[
                    'No',
                    'No. RM',
                    'Pasien',
                    'Pemohon',
                    'Email',
                    'WA',
                    'Layanan',
                    'Asuransi',
                    'Dokter',
                    'Tgl Mulai',
                    'Tgl Selesai',
                    'Status',
                    'Catatan'
                ]],
                body: tableData,
                theme: 'striped',
                styles: {
                    fontSize: 7,
                    cellPadding: 1.5,
                    overflow: 'linebreak',
                    cellWidth: 'wrap'
                },
                headStyles: {
                    fillColor: [51, 65, 85],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 7
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },   // No
                    1: { cellWidth: 18 },                     // No RM
                    2: { cellWidth: 25 },                     // Pasien
                    3: { cellWidth: 25 },                     // Pemohon
                    4: { cellWidth: 30 },                     // Email
                    5: { cellWidth: 20 },                     // WA
                    6: { cellWidth: 22 },                     // Layanan
                    7: { cellWidth: 22 },                     // Asuransi
                    8: { cellWidth: 28 },                     // Dokter
                    9: { cellWidth: 18, halign: 'center' },  // Tgl Mulai
                    10: { cellWidth: 18, halign: 'center' }, // Tgl Selesai
                    11: { cellWidth: 18, halign: 'center' }, // Status
                    12: { cellWidth: 35 }                     // Catatan
                },
                margin: { left: 5, right: 5 }
            });

            // Save PDF
            const fileName = `Permintaan_Medis_Lengkap_${dateStr.replace(/\//g, '-')}.pdf`;
            doc.save(fileName);

            ActivityLogger.log('EXPORT', {
                module: 'Requests',
                description: `Exported ${sortedRequests.length} requests to PDF`,
                target: fileName
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Gagal membuat PDF. Silakan coba lagi.');
        }
    };

    const handleOpenModal = (req = null) => {
        if (req) {
            setCurrentReq(req);
            setFormData(req);
        } else {
            setCurrentReq(null);
            setFormData({
                medRecordNumber: '', patientName: '', email: '', whatsapp: '',
                type: 'Rawat Jalan (RJ)', visitDateStart: '', visitDateEnd: '',
                insuranceName: '', doctorName: '', status: 'Pending',
                notes: '', applicantName: '', isPatientApplicant: true
            });
        }
        setIsModalOpen(true);
    };

    const handleOpenHistory = (req) => {
        setTimelineReq(req);
        setProgressForm({
            date: new Date().toISOString().split('T')[0],
            status: req.status,
            note: '',
            collectedBy: ''
        });
        setIsCorrectionMode(false);
        setHistoryModalOpen(true);
    };

    const handleViewDetail = (req) => {
        setDetailReq(req);
        setDetailModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const dataToSave = { ...formData, receiver: currentUser ? currentUser.name : 'Unknown' };

        if (currentReq) {
            // UPDATE
            if (isElectron()) await window.api.requests.update({ ...currentReq, ...dataToSave });
            else {
                const updated = requests.map(r => r.id === currentReq.id ? { ...r, ...dataToSave } : r);
                setRequests(updated);
                localStorage.setItem('mpim_requests', JSON.stringify(updated));
            }

            ActivityLogger.log('UPDATE', {
                module: 'Requests',
                description: `Updated request for patient ${dataToSave.patientName}`,
                target: `Request #${currentReq.id}`
            });
        } else {
            // CREATE
            if (isElectron()) await window.api.requests.create(dataToSave);
            else {
                const newR = {
                    id: Date.now(),
                    regNumber: `ASS/BRW/${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    doctorSubmissionCount: 1,
                    ...dataToSave,
                    history: []
                };
                setRequests([newR, ...requests]);
                localStorage.setItem('mpim_requests', JSON.stringify([newR, ...requests]));
            }

            ActivityLogger.log('CREATE', {
                module: 'Requests',
                description: `Created new request for patient ${dataToSave.patientName}`,
                target: `${dataToSave.medRecordNumber}`
            });
        }
        await loadData();
        setIsModalOpen(false);
    };

    const handleFollowUp = async (req) => {
        if (!confirm(`Catat follow - up ke dokter untuk pasien ${req.patientName}?`)) return;

        const newCount = (req.doctorSubmissionCount || 1) + 1;
        const updatedReq = { ...req, doctorSubmissionCount: newCount };

        // Add to history
        const historyItem = {
            status: req.status, // Status doesn't change, just a log
            note: `Follow - up ke - ${newCount} ke Dokter`,
            user: currentUser ? currentUser.name : 'Unknown',
            timestamp: new Date().toISOString()
        };
        updatedReq.history = [historyItem, ...(req.history || [])];

        if (isElectron()) await window.api.requests.update(updatedReq);
        else {
            const updatedList = requests.map(r => r.id === req.id ? updatedReq : r);
            setRequests(updatedList);
            localStorage.setItem('mpim_requests', JSON.stringify(updatedList));
        }
    };

    const handleSaveProgress = async (e) => {
        e.preventDefault();

        let finalNote = progressForm.note;
        if (progressForm.status === 'Sudah Diambil' && progressForm.collectedBy) {
            finalNote = `${finalNote ? finalNote + '. ' : ''} Pengambil: ${progressForm.collectedBy} `;
        }

        const historyItem = {
            ...progressForm,
            note: finalNote,
            user: currentUser ? currentUser.name : 'Unknown',
            timestamp: new Date().toISOString()
        };

        const updatedHistory = [...(timelineReq.history || []), historyItem];
        const updatedReq = {
            ...timelineReq,
            status: progressForm.status,
            history: updatedHistory
        };

        if (isElectron()) {
            // Use update only to ensure atomicity (assuming update replaces the record)
            await window.api.requests.update(updatedReq);
        } else {
            // Local update logic
            const updated = requests.map(r => {
                if (r.id === timelineReq.id) {
                    return updatedReq;
                }
                return r;
            });
            setRequests(updated);
            localStorage.setItem('mpim_requests', JSON.stringify(updated));
        }
        await loadData();
        setHistoryModalOpen(false);
    };

    const handleDelete = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            const deletedReq = requests.find(r => r.id === itemToDelete);

            if (isElectron()) await window.api.requests.delete(itemToDelete);
            else {
                const filtered = requests.filter(r => r.id !== itemToDelete);
                setRequests(filtered);
                localStorage.setItem('mpim_requests', JSON.stringify(filtered));
            }

            ActivityLogger.log('DELETE', {
                module: 'Requests',
                description: `Deleted request for patient ${deletedReq?.patientName || 'Unknown'}`,
                target: `Request #${itemToDelete}`
            });

            await loadData();
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handlePrint = (req) => {
        setPrintReq(req);
        // Preview is now shown immediately. Printing is triggered manually from preview.
    };

    const triggerPrint = () => {
        window.print();
    };

    const closePreview = () => {
        setPrintReq(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Sudah Diambil': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Selesai': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Proses': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Ditolak': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const getTimelineItemColor = (status) => {
        switch (status) {
            case 'Sudah Diambil': return { border: 'border-purple-500', text: 'text-purple-700' };
            case 'Selesai': return { border: 'border-emerald-500', text: 'text-emerald-700' };
            case 'Proses': return { border: 'border-blue-500', text: 'text-blue-700' };
            case 'Ditolak': return { border: 'border-red-500', text: 'text-red-700' };
            default: return { border: 'border-amber-500', text: 'text-amber-700' };
        }
    };

    const handleWhatsApp = (req) => {
        if (!req.whatsapp) {
            alert('Nomor WhatsApp tidak tersedia untuk pasien ini.');
            return;
        }

        let message = '';
        const greeting = `Halo ${req.patientName},`;
        const details = `Terkait permintaan informasi medis Anda No. Reg: *${req.regNumber || '-'}*\nRM: ${req.medRecordNumber}`;

        if (req.status === 'Selesai') {
            message = `${greeting}\n\n${details}\n\nKabar baik! Dokumen Anda sudah *SELESAI* dan siap diambil.\n\nSilakan datang ke bagian administrasi pada jam kerja dengan membawa identitas diri/tanda terima.\n\nTerima kasih.`;
        } else if (req.status === 'Sudah Diambil') {
            message = `${greeting}\n\n${details}\n\nTerima kasih, dokumen Anda tercatat sudah diambil. Jika ada pertanyaan lebih lanjut, silakan hubungi kami.\n\nTerima kasih.`;
        } else if (req.status === 'Ditolak') {
            message = `${greeting}\n\n${details}\n\nMohon maaf, permintaan Anda saat ini *DITOLAK* atau tidak dapat diproses.\n\nHarap hubungi bagian informasi untuk detail lebih lanjut.\n\nTerima kasih.`;
        } else {
            // Pending atau Proses
            message = `${greeting}\n\n${details}\n\nSaat ini status permintaan Anda masih: *${req.status.toUpperCase()}* (Sedang Diproses).\n\nMohon menunggu informasi selanjutnya dari kami jika dokumen sudah siap.\n\nTerima kasih.`;
        }

        const encodedMessage = encodeURIComponent(message);
        // Format phone number to international format without + (already likely in '62xxx' format from input logic, but ensuring safety)
        let phone = req.whatsapp.toString().replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);

        const url = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(url, '_blank');
    };

    // Helper Component for Receipt
    const ReceiptView = ({ title, showFooterNotes, isCopy }) => (
        <div className="flex flex-col items-center text-slate-900 w-full max-w-2xl mx-auto py-8 font-sans">
            {/* Receipt Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-6 w-full">
                <div className="flex items-center justify-center gap-4 mb-2">
                    {/* Dynamic Logo */}
                    {settings?.logo ? (
                        <img src={settings.logo} alt="Logo" className="h-16 w-auto object-contain" />
                    ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                            <span className="text-xs font-bold text-slate-400">LOGO</span>
                        </div>
                    )}
                    <div className="text-left">
                        <h1 className="text-xl font-bold text-slate-900 uppercase leading-none">{settings?.hospitalName || 'NAMA RUMAH SAKIT'}</h1>
                        <p className="text-xs text-slate-500 mt-1">{settings?.address || 'Alamat Lengkap Instansi, Kota, Kode Pos'}</p>
                        <p className="text-xs text-slate-500">Telp: {settings?.phone || '(021) ...............'} | Email: {settings?.email || 'info@rumah-sakit.com'}</p>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-900 inline-block pb-1 uppercase">{title}</h2>
            </div>

            {/* Content */}
            <table className="w-full mb-6 text-sm">
                <tbody>
                    <tr><td className="py-1 w-40 font-bold">No. Registrasi</td><td>: <span className="font-mono font-bold text-base">{printReq.regNumber}</span></td></tr>
                    <tr><td className="py-1 font-bold">Tanggal</td><td>: {new Date(printReq.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
                    <tr><td className="py-1 font-bold">No. Rekam Medis</td><td>: {printReq.medRecordNumber}</td></tr>
                    <tr><td className="py-1 font-bold">Nama Pasien</td><td>: {printReq.patientName}</td></tr>
                    <tr><td className="py-1 font-bold">Jenis Permintaan</td><td>: {printReq.type}</td></tr>
                    <tr><td className="py-1 font-bold">Asuransi</td><td>: {printReq.insuranceName}</td></tr>
                    <tr><td className="py-1 font-bold">Dokter Tujuan</td><td>: {printReq.doctorName}</td></tr>
                    {printReq.notes && (
                        <tr><td className="py-1 font-bold align-top">Catatan</td><td>: {printReq.notes}</td></tr>
                    )}
                </tbody>
            </table>

            {/* Manual Timeline Table (Only for Doctor's Copy) */}
            {isCopy && (
                <div className="w-full mb-6">
                    <p className="text-xs font-bold text-slate-700 mb-1">Riwayat Berkas (Diisi Manual):</p>
                    <table className="w-full text-xs box-border border border-slate-400 border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-400 py-1 px-2 text-left w-24">Tanggal</th>
                                <th className="border border-slate-400 py-1 px-2 text-left">Status / Keterangan</th>
                                <th className="border border-slate-400 py-1 px-2 text-center w-16">Paraf</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map(i => (
                                <tr key={i}>
                                    <td className="border border-slate-400 h-6"></td>
                                    <td className="border border-slate-400 h-6"></td>
                                    <td className="border border-slate-400 h-6"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Signatures */}
            <div className="w-full flex justify-between mt-4">
                <div className="text-center w-40">
                    <p className="mb-12 text-xs">Petugas Penerima,</p>
                    <p className="font-bold border-t border-slate-400 pt-1 text-sm">{printReq.receiver || 'Admin'}</p>
                </div>
                <div className="text-center w-40">
                    <p className="mb-12 text-xs">{isCopy ? 'Dokter / Petugas RM' : 'Pemohon / Pasien'},</p>
                    <p className="font-bold border-t border-slate-400 pt-1 text-sm">( {printReq.applicantName || '...........................'} )</p>
                </div>
            </div>

            {/* Notes only for Patient Copy */}
            {showFooterNotes && (
                <div className="w-full mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-700 space-y-0.5">
                    <p className="font-bold uppercase">Harap membawa tanda terima saat pengambilan dokumen.</p>
                    <p>Pengambilan dokumen hanya pada hari dan jam kerja:</p>
                    <p className="font-semibold">Senin s.d Sabtu | Jam 08.00 s.d 16.00 WIB</p>
                    <p className="pt-1 text-[10px] text-slate-500">Konfirmasi: 021 588 5120 (Telp/WA)</p>
                </div>
            )}

            {!showFooterNotes && (
                <div className="w-full mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 italic">
                    *Lembar pengajuan ke Dokter
                </div>
            )}

            <div className="w-full text-right mt-2 text-[8px] text-slate-400 italic">
                Dicetak: {new Date().toLocaleString('id-ID')}
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="p-8">
                {/* Header & Table */}
                {/* Modern Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Penerimaan Informasi Medis</h2>
                        <p className="text-slate-500 text-sm mt-1">Kelola data penjaminan & rekam medis pasien</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {/* Export Buttons */}
                        {/* Export Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                                title="Export ke Excel"
                            >
                                <Download size={16} />
                                Excel
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                                title="Export ke PDF"
                            >
                                <Download size={16} />
                                PDF
                            </button>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-95"
                        >
                            <Plus size={18} />
                            Buat Permintaan
                        </button>
                    </div>
                </div>

                {/* Filter Control Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

                        {/* Left: Search & Status */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Cari nama pasien atau No. RM..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full transition-all"
                                />
                            </div>
                            <div className="relative w-full sm:w-48">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full bg-white appearance-none cursor-pointer transition-all"
                                >
                                    <option value="Semua">Semua Status</option>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>

                        {/* Right: Date, Alerts, Reset */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                            {/* Date Range */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="bg-transparent text-xs font-medium text-slate-600 outline-none w-24"
                                />
                                <span className="text-slate-300">|</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="bg-transparent text-xs font-medium text-slate-600 outline-none w-24"
                                />
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                            {/* Actions */}
                            <button
                                onClick={() => setFilterMode(filterMode === 'all' ? 'alerts' : 'all')}
                                title={filterMode === 'alerts' ? 'Matikan Filter Alert' : 'Tampilkan Alert Saja'}
                                className={`p-2.5 rounded-xl transition-all border ${filterMode === 'alerts' ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                <AlertCircle size={20} />
                            </button>

                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStatus('Semua');
                                    setFilterMode('all');
                                    setDateRange({ start: '', end: '' });
                                }}
                                title="Reset Filter"
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all border border-slate-200"
                            >
                                <RotateCcw size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-700 uppercase leading-normal border-b border-slate-200">
                                    <th className="py-3 px-4 text-left rounded-tl-lg">
                                        <button
                                            onClick={() => handleSort('createdAt')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                        >
                                            <span>Tgl Penerimaan</span>
                                            {sortConfig.key === 'createdAt' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                        <button
                                            onClick={() => handleSort('regNumber')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                        >
                                            <span>No. Registrasi</span>
                                            {sortConfig.key === 'regNumber' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                        <button
                                            onClick={() => handleSort('patientName')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                        >
                                            <span>No.RM / Nama</span>
                                            {sortConfig.key === 'patientName' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                        <button
                                            onClick={() => handleSort('serviceType')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide"
                                        >
                                            <span>Jenis / Asuransi</span>
                                            {sortConfig.key === 'serviceType' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => handleSort('createdAt')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide mx-auto"
                                        >
                                            <span>Tanggal Berobat</span>
                                            {sortConfig.key === 'createdAt' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => handleSort('status')}
                                            className="flex items-center gap-2 hover:text-blue-600 transition-colors font-semibold text-xs tracking-wide mx-auto"
                                        >
                                            <span>Status</span>
                                            {sortConfig.key === 'status' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4 text-center rounded-tr-lg">
                                        <span className="font-semibold text-xs tracking-wide">Aksi</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.length === 0 ? (
                                    <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">Belum ada data.</td></tr>
                                ) : (
                                    currentRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 border-r border-slate-100/50">
                                                <div className="flex flex-col">
                                                    <div className="text-xs text-slate-500 font-medium">{new Date(req.createdAt).toLocaleDateString('id-ID')}</div>
                                                    <div className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit text-slate-600">{req.regNumber || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                <div className="font-medium text-slate-900">{req.patientName}</div>
                                                <div className="text-xs text-slate-500">RM: {req.medRecordNumber}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-900">{req.type}</div>
                                                <div className="text-xs text-green-600 font-medium">{req.insuranceName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-center">
                                                {new Date(req.visitDateStart).toLocaleDateString('id-ID')} - {new Date(req.visitDateEnd).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                                                    ${req.status === 'Pending' ? 'bg-orange-50 text-orange-600' : ''}
                                                    ${req.status === 'Proses' ? 'bg-blue-50 text-blue-600' : ''}
                                                    ${req.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600' : ''}
                                                    ${req.status === 'Sudah Diambil' ? 'bg-purple-50 text-purple-600' : ''}
                                                    ${req.status === 'Ditolak' ? 'bg-red-50 text-red-600' : ''}
                                                `}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleViewDetail(req)} title="Lihat Detail Lengkap" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handlePrint(req)} title="Cetak Bukti" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenHistory(req)} title="Update Progres" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors">
                                                        <Clock className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenModal(req)} title="Edit Data Pasien" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(req.id)} title="Hapus" className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleWhatsApp(req)} title="Kirim WhatsApp" className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded hover:bg-emerald-50 transition-colors">
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {requests.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-white gap-4 sm:gap-0">
                            <span>Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, requests.length)} dari {requests.length} data</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 border border-slate-200 rounded-lg transition-colors font-medium
                                        ${currentPage === 1
                                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                            : 'hover:bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                                >
                                    Prev
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => paginate(i + 1)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all
                                                ${currentPage === i + 1
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 border border-slate-200 rounded-lg transition-colors font-medium
                                        ${currentPage === totalPages
                                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                            : 'hover:bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Overlay */}
            {
                printReq && (
                    <div className="fixed inset-0 bg-white z-[9999] p-0 visible overflow-auto">
                        <style>{`
@media print {
    body * { visibility: hidden; }
    #printable-area, #printable-area * { visibility: visible; }
    #printable-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
    @page { size: landscape; margin: 0; }
    .no-print { display: none!important; }
}
`}</style>

                        {/* Floating Toolbar */}
                        <div className="fixed top-6 right-8 flex gap-3 no-print z-[10000]">
                            <button onClick={closePreview} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded shadow font-medium transition-colors">
                                Batal / Tutup
                            </button>
                            <button onClick={triggerPrint} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded shadow font-bold flex items-center transition-colors">
                                <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
                            </button>
                        </div>

                        <div id="printable-area" className="w-full h-full p-8 bg-white min-h-[500px]">
                            <div className="flex flex-row w-full h-[55vh] gap-10">
                                {/* Copy 1: Patient (Left) */}
                                <div className="w-1/2 h-full flex flex-col justify-between pr-10 border-r-2 border-dashed border-slate-300 relative">
                                    <ReceiptView title="TANDA TERIMA PASIEN" showFooterNotes={true} isCopy={false} />
                                    <span className="absolute -right-3 top-1/2 bg-white text-slate-400 rotate-90 text-[10px] flex items-center gap-1">✂️ Potong</span>
                                </div>

                                {/* Copy 2: Doctor (Right) */}
                                <div className="w-1/2 h-full flex flex-col justify-between pl-6 h-full">
                                    <ReceiptView title="ARSIP / PENGANTAR DOKTER" showFooterNotes={false} isCopy={true} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modals (Edit, History, Detail, Delete) */}
            {/* Input Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-lg text-slate-800">{currentReq ? 'Edit Data Permintaan' : 'Input Permintaan Baru'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Patient Identity */}
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-2 mb-4">
                                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <User size={16} className="text-blue-600" /> Identitas Pasien
                                            </h4>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Rekam Medis</label>
                                            <input type="text" required value={formData.medRecordNumber} onChange={e => setFormData({ ...formData, medRecordNumber: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Contoh: 00-12-34" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-semibold text-slate-700">Nama Pasien</label>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                                        checked={formData.isPatientApplicant}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setFormData({
                                                                ...formData,
                                                                isPatientApplicant: checked,
                                                                applicantName: checked ? formData.patientName : ''
                                                            });
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">Pemohon = Pasien</span>
                                                </label>
                                            </div>
                                            <input type="text" required value={formData.patientName} onChange={e => setFormData({ ...formData, patientName: e.target.value, applicantName: formData.isPatientApplicant ? e.target.value : formData.applicantName })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        </div>

                                        {!formData.isPatientApplicant && (
                                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pemohon (Wali/Keluarga)</label>
                                                <input
                                                    type="text"
                                                    required={!formData.isPatientApplicant}
                                                    value={formData.applicantName}
                                                    onChange={e => setFormData({ ...formData, applicantName: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                                                    placeholder="Nama lengkap pemohon..."
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="nama@email.com" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp <span className="text-red-500">*</span></label>
                                                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                                    <div className="bg-slate-100 text-slate-600 px-3 py-2 border-r border-slate-300 font-medium flex items-center text-sm">+62</div>
                                                    <input type="text" required value={formData.whatsapp ? (formData.whatsapp.toString().startsWith('62') ? formData.whatsapp.toString().substring(2) : formData.whatsapp) : ''}
                                                        onChange={e => {
                                                            let val = e.target.value.replace(/\D/g, '');
                                                            if (val.startsWith('0')) val = val.substring(1);
                                                            setFormData({ ...formData, whatsapp: '62' + val });
                                                        }}
                                                        className="w-full px-3 py-2 outline-none placeholder:text-slate-300 text-slate-800" placeholder="812..." />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Request Details */}
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-2 mb-4">
                                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <FileText size={16} className="text-blue-600" /> Detail Layanan
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Layanan</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                >
                                                    {services.length > 0 ? services.map((t, idx) => {
                                                        const val = typeof t === 'string' ? t : t.name;
                                                        return <option key={idx} value={val}>{val}</option>;
                                                    }) : TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Asuransi Penjamin</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                    value={formData.insuranceName}
                                                    onChange={e => setFormData({ ...formData, insuranceName: e.target.value })}
                                                >
                                                    <option value="">Pilih Asuransi...</option>
                                                    {insurances.map((i, idx) => {
                                                        const val = typeof i === 'string' ? i : i.name;
                                                        return <option key={idx} value={val}>{val}</option>;
                                                    })}
                                                    {/* Fallback for legacy data */}
                                                    {(formData.insuranceName && !insurances.some(i => (typeof i === 'string' ? i : i.name) === formData.insuranceName)) && (
                                                        <option value={formData.insuranceName}>{formData.insuranceName}</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Dokter Penanggung Jawab (DPJP)</label>
                                            <select
                                                required
                                                value={formData.doctorName}
                                                onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            >
                                                <option value="">Pilih Dokter...</option>
                                                {doctors.map((d, idx) => {
                                                    const label = typeof d === 'string' ? d : (d.specialist ? `${d.name}, ${d.specialist} ` : d.name);
                                                    return <option key={idx} value={label}>{label}</option>;
                                                })}
                                                {/* Fallback for legacy data */}
                                                {(formData.doctorName && !doctors.some(d => {
                                                    const label = typeof d === 'string' ? d : (d.specialist ? `${d.name}, ${d.specialist} ` : d.name);
                                                    return label === formData.doctorName;
                                                })) && (
                                                        <option value={formData.doctorName}>{formData.doctorName}</option>
                                                    )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Kunjungan / Rawat</label>
                                            <div className="flex items-center gap-2">
                                                <input type="date" required value={formData.visitDateStart} onChange={e => setFormData({ ...formData, visitDateStart: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                                <span className="text-slate-400 font-medium">-</span>
                                                <input type="date" required value={formData.visitDateEnd} onChange={e => setFormData({ ...formData, visitDateEnd: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                                            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none placeholder:text-slate-300" placeholder="Keterangan diagnosa atau permintaan khusus..."></textarea>
                                        </div>

                                        {/* Status Hidden/Managed Separately usually, or kept small at bottom if needed */}
                                        <div className="hidden">
                                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 mt-2 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium">Batal</button>
                                    <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold transform active:scale-[0.98]">
                                        Simpan Data
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                deleteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Permintaan?</h3>
                            <p className="text-sm text-slate-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Batal</button>
                                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Detail Modal */}
            {
                detailModalOpen && detailReq && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-0 animate-in zoom-in-95 flex overflow-hidden max-h-[90vh]">
                            <div className="w-3/5 p-8 overflow-y-auto">
                                <div className="flex justify-between items-start mb-6">
                                    <div><h3 className="text-2xl font-bold text-slate-900 mb-1">{detailReq.regNumber}</h3><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border ${getStatusColor(detailReq.status)}`}>{detailReq.status}</span></div>
                                    <button onClick={() => handlePrint(detailReq)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                                        <Printer size={16} /> Cetak Struk
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 border-b pb-1">Identitas Pasien</h4>
                                        <div className="grid grid-cols-2 gap-y-4">
                                            <div><label className="text-xs text-slate-400 block">Nama Pasien</label><span className="font-medium text-slate-800">{detailReq.patientName}</span></div>
                                            <div><label className="text-xs text-slate-400 block">No. Rekam Medis</label><span className="font-medium text-slate-800">{detailReq.medRecordNumber}</span></div>
                                            <div><label className="text-xs text-slate-400 block">Email</label><span className="font-medium text-slate-800">{detailReq.email || '-'}</span></div>
                                            <div><label className="text-xs text-slate-400 block">WhatsApp / HP</label><span className="font-medium text-slate-800">{detailReq.whatsapp || '-'}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 border-b pb-1">Detail Permintaan</h4>
                                        <div className="grid grid-cols-2 gap-y-4">
                                            <div><label className="text-xs text-slate-400 block">Jenis Permintaan</label><span className="font-medium text-slate-800">{detailReq.type}</span></div>
                                            <div><label className="text-xs text-slate-400 block">Asuransi</label><span className="font-medium text-slate-800">{detailReq.insuranceName}</span></div>
                                            <div><label className="text-xs text-slate-400 block">Dokter Tujuan</label><span className="font-medium text-slate-800">{detailReq.doctorName}</span></div>
                                            <div><label className="text-xs text-slate-400 block">Tanggal Masuk</label><span className="font-medium text-slate-800">{new Date(detailReq.createdAt).toLocaleDateString()}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 border-b pb-1">Kunjungan Berobat</h4>
                                        <div className="grid grid-cols-2 gap-y-4">
                                            <div><label className="text-xs text-slate-400 block">Dari Tanggal</label><span className="font-medium text-slate-800">{detailReq.visitDateStart}</span></div>
                                            <div><label className="text-xs text-slate-400 block">Sampai Tanggal</label><span className="font-medium text-slate-800">{detailReq.visitDateEnd}</span></div>
                                        </div>
                                    </div>
                                    {detailReq.notes && (<div className="bg-amber-50 p-3 rounded border border-amber-100 mt-2"><h4 className="text-sm font-semibold text-amber-800 mb-1">Catatan Tambahan</h4><p className="text-sm text-slate-700">{detailReq.notes}</p></div>)}
                                </div>
                            </div>
                            <div className="w-2/5 border-l border-slate-100 bg-slate-50 p-8 overflow-y-auto">
                                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">Timeline Perjalanan</h3><button onClick={() => setDetailModalOpen(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button></div>
                                <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                                    {detailReq.history && detailReq.history.slice().reverse().map((h, i) => {
                                        const colors = getTimelineItemColor(h.status);
                                        return (
                                            <div key={i} className="pl-6 relative">
                                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 ${colors.border}`}></div>
                                                <div className={`text-xs font-bold mb-1 ${colors.text}`}>{h.date}</div>
                                                <div><div className="text-sm font-semibold text-slate-800">{h.status}</div><p className="text-sm text-slate-600 mt-1 bg-white p-2 rounded border border-slate-100">{h.note}</p><div className="text-xs text-slate-400 mt-2 flex items-center gap-1"><User size={10} /> {h.user}</div></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* History Modal */}
            {
                historyModalOpen && timelineReq && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-0 animate-in zoom-in-95 flex overflow-hidden max-h-[85vh]">
                            <div className="w-1/2 p-6 border-r border-slate-100 bg-slate-50 overflow-y-auto">
                                <h3 className="font-bold text-slate-800 mb-1">Riwayat Progres</h3>
                                <p className="text-xs text-slate-500 mb-6">{timelineReq.regNumber} - {timelineReq.patientName}</p>
                                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-4">
                                    {timelineReq.history && timelineReq.history.slice().reverse().map((h, i) => {
                                        const colors = getTimelineItemColor(h.status);
                                        return (
                                            <div key={i} className="pl-6 relative"><div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 ${colors.border}`}></div><div className={`text-xs font-semibold mb-1 ${colors.text}`}>{h.date}</div><div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(h.status)}`}>{h.status}</span><span className="text-[10px] text-slate-400 flex items-center gap-1"><User size={10} /> {h.user}</span></div><p className="text-sm text-slate-700">{h.note}</p></div></div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="w-1/2 p-6 flex flex-col">
                                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">Update Progres Baru</h3><button onClick={() => setHistoryModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>

                                {timelineReq.status === 'Sudah Diambil' && !isCorrectionMode ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-purple-50 rounded-xl border border-purple-100 animate-in zoom-in-95">
                                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 text-3xl">🎉</div>
                                        <h4 className="text-xl font-bold text-slate-800 mb-2">Dokumen Sudah Diambil</h4>
                                        <p className="text-sm text-slate-600 mb-6">Status dokumen sudah final. Tidak perlu update timeline lagi kecuali ada kesalahan data.</p>

                                        <div className="bg-white p-4 rounded-lg border border-purple-100 w-full mb-6 shadow-sm">
                                            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1 block">Pengambil</label>
                                            <p className="font-medium text-slate-800 text-lg">
                                                {(() => {
                                                    const lastHistory = timelineReq.history.slice().reverse().find(h => h.status === 'Sudah Diambil');
                                                    if (!lastHistory) return '-';
                                                    const parts = lastHistory.note.split('Pengambil: ');
                                                    return parts.length > 1 ? parts[1] : (lastHistory.note || '-');
                                                })()}
                                            </p>
                                        </div>

                                        {currentUser?.role === 'Super Admin' && (
                                            <button onClick={() => setIsCorrectionMode(true)} className="text-sm text-slate-400 hover:text-blue-600 underline">
                                                Koreksi Data (Edit)
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveProgress} className="space-y-4 flex-1">
                                        {isCorrectionMode && <div className="bg-amber-50 p-2 text-xs text-amber-700 border border-amber-200 rounded mb-2">Mode Koreksi Aktif: Silakan update status atau nama pengambil jika ada kesalahan.</div>}
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal & Waktu</label>
                                            <input type="date" required value={progressForm.date} onChange={e => setProgressForm({ ...progressForm, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-500 mb-3" />

                                            <label className="block text-sm font-medium text-slate-700 mb-2">Status Baru</label>
                                            <select value={progressForm.status} onChange={e => setProgressForm({ ...progressForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-500 mb-3">
                                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>

                                            {progressForm.status === 'Sudah Diambil' && (
                                                <div className="mb-3 animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-sm font-medium text-purple-700 mb-1">Nama Pengambil Dokumen <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Nama lengkap pengambil..."
                                                        value={progressForm.collectedBy}
                                                        onChange={e => setProgressForm({ ...progressForm, collectedBy: e.target.value })}
                                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                                    />
                                                </div>
                                            )}

                                            <label className="block text-sm font-medium text-slate-700 mb-2">Catatan Progres</label>
                                            <textarea value={progressForm.note} onChange={e => setProgressForm({ ...progressForm, note: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-500 h-20 resize-none" placeholder="Contoh: Berkas sedang dicarikan..."></textarea>
                                        </div>
                                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium shadow-sm transition-colors">
                                            {isCorrectionMode ? 'Simpan Perubahan (Koreksi)' : 'Update Progres'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Print Preview Modal */}
            {/* Print Preview Modal (DISABLED - Using Inline Receipt Overlay) */}
            {/* {printReq && (
                <PrintPreview request={printReq} onClose={() => setPrintReq(null)} />
            )} */}
        </Layout >
    );
}
