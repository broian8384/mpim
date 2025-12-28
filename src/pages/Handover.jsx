import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ClipboardList, Plus, Trash2, CheckCircle, User, Calendar, Clock, Search, AlertTriangle, Info, Link as IconLink, ChevronRight, MessageSquare, Send, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIORITIES = {
    normal: { label: 'Biasa', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    high: { label: 'Penting', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    critical: { label: 'Kritis', color: 'bg-red-100 text-red-700 border-red-200' }
};

const CATEGORIES = {
    general: { label: 'Umum', icon: Info },
    patient: { label: 'Pasien', icon: User },
    facility: { label: 'Sarana', icon: AlertTriangle }
};

// Sub-component for individual card logic
const NoteCard = ({ note, requests, toggleNote, onDelete, currentUser, refreshData, shiftName }) => {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get linked request
    const getRequestDetails = (id) => requests.find(r => String(r.id) === String(id));
    const linkedReq = note.relatedRequestId ? getRequestDetails(note.relatedRequestId) : null;

    // Safety fallback
    const notePriority = note.priority || 'normal';
    const priorityConfig = PRIORITIES[notePriority] || PRIORITIES['normal'];
    const priorityAlert = notePriority === 'critical' || notePriority === 'high';
    const comments = note.comments || [];

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmitting(true);
        try {
            if (window.api && window.api.handover) {
                const author = currentUser?.name || currentUser?.username || 'Admin';
                await window.api.handover.comment({
                    id: note.id,
                    content: commentText,
                    author
                });
                setCommentText('');
                refreshData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`group relative bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${note.isCompleted ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200'} ${priorityAlert && !note.isCompleted ? 'ring-2 ring-red-500/10' : ''}`}>

            {/* Priority Badge Absolute */}
            {!note.isCompleted && notePriority !== 'normal' && (
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-xl text-[10px] font-bold uppercase tracking-wider border-b border-l ${priorityConfig.color}`}>
                    Prioritas {priorityConfig.label}
                </div>
            )}

            <div className="flex gap-5">
                {/* Checkbox */}
                <button
                    onClick={() => toggleNote(note.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${note.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent hover:border-emerald-400 shadow-sm'}`}
                    title={note.isCompleted ? "Tandai Belum Selesai" : "Tandai Selesai"}
                >
                    <CheckCircle size={14} fill={note.isCompleted ? "currentColor" : "none"} />
                </button>

                <div className="flex-1 min-w-0 pt-0.5">
                    {/* Header Meta */}
                    <div className="flex items-center gap-3 mb-2">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-600">
                            <User size={10} /> {note.author}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}

                            {/* Shift Badge - NOW VISIBLE */}
                            {shiftName && (
                                <>
                                    <span>•</span>
                                    <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px]">{shiftName}</span>
                                </>
                            )}
                        </span>
                        {CATEGORIES[note.category] && (
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide border px-1.5 rounded border-slate-200">
                                {CATEGORIES[note.category].label}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <p className={`text-slate-800 text-sm leading-relaxed whitespace-pre-wrap mb-3 ${note.isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {note.content}
                    </p>

                    {/* Request Link */}
                    {linkedReq ? (
                        <div
                            onClick={() => navigate('/requests', { state: { highlightId: linkedReq.id } })}
                            className={`mt-3 flex items-center gap-4 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 p-3 rounded-xl cursor-pointer group/link transition-colors ${note.isCompleted ? 'opacity-50' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {linkedReq.patientName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                                    {linkedReq.patientName}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${linkedReq.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                        {linkedReq.status}
                                    </span>
                                </h4>
                                <p className="text-xs text-slate-500 truncate">{linkedReq.regNumber} • {linkedReq.insuranceName}</p>
                            </div>
                            <div className="text-blue-400 group-hover/link:text-blue-600">
                                <ChevronRight size={18} />
                            </div>
                        </div>
                    ) : note.relatedRequestId && (
                        <div className="mt-3 bg-red-50 border border-red-100 p-2 rounded-lg text-xs text-red-500 flex items-center gap-2">
                            <AlertTriangle size={12} /> Data Pasien Terkait Tidak Ditemukan
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3">
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${comments.length > 0 || showComments ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <MessageSquare size={14} />
                            {comments.length > 0 ? `${comments.length} Komentar` : 'Beri Komentar'}
                        </button>

                        {note.isCompleted && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle size={12} />
                                {note.completedBy} • {new Date(note.completedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    {/* COMMENTS SECTION */}
                    {showComments && (
                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Comment List */}
                            {comments.length > 0 && (
                                <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="pl-3 relative">
                                            <div className="absolute -left-[17px] top-2.5 w-2 h-2 rounded-full bg-slate-200 ring-2 ring-white"></div>
                                            <div className="bg-slate-50 p-2.5 rounded-lg rounded-tl-none">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-slate-700">{comment.author}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="flex items-start gap-2 pt-2">
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 shrink-0 mt-1">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Tulis balasan..."
                                        className="w-full text-xs py-2 px-3 pr-9 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim() || isSubmitting}
                                        className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded-md disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
                                    >
                                        <Send size={12} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                <button
                    onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 self-start p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                    title="Hapus Permanen"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default function Handover() {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [requests, setRequests] = useState([]);

    // Form States
    const [newNote, setNewNote] = useState('');
    const [priority, setPriority] = useState('normal');
    const [category, setCategory] = useState('general');
    const [selectedRequest, setSelectedRequest] = useState('');
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('active');

    // PAGINATION STATE
    const [visibleCount, setVisibleCount] = useState(10);
    const ITEMS_PER_PAGE = 10;

    // DELETE MODAL STATES
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [filter, searchTerm]);

    const loadData = async () => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) setCurrentUser(JSON.parse(userStr));

        if (window.api) {
            try {
                if (window.api.handover) {
                    const data = await window.api.handover.list();
                    setNotes(data);
                }
                if (window.api.requests) {
                    const reqs = await window.api.requests.getAll();
                    setRequests(reqs.sort((a, b) => {
                        const scoreA = ['Pending', 'Proses'].includes(a.status) ? 1 : 0;
                        const scoreB = ['Pending', 'Proses'].includes(b.status) ? 1 : 0;
                        return scoreB - scoreA || new Date(b.createdAt) - new Date(a.createdAt);
                    }));
                }
            } catch (e) { console.error(e); }
        }
    };

    const addNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim() && !selectedRequest) return;
        if (!window.api?.handover) return;

        try {
            const author = currentUser?.name || currentUser?.username || 'Admin';
            await window.api.handover.add({
                content: newNote,
                author,
                priority,
                category: selectedRequest ? 'patient' : category,
                relatedRequestId: selectedRequest || null
            });

            setNewNote('');
            setPriority('normal');
            setCategory('general');
            setSelectedRequest('');
            loadData();
        } catch (e) { console.error(e); }
    };

    const toggleNote = async (id) => {
        if (!window.api?.handover) return;
        try {
            const author = currentUser?.name || currentUser?.username || 'Admin';
            await window.api.handover.toggle({ id, by: author });
            loadData();
        } catch (e) { console.error(e); }
    };

    // TRIGGER MODAL
    const confirmDelete = (id) => {
        setNoteToDelete(id);
        setShowDeleteModal(true);
    };

    // EXECUTE DELETE
    const executeDelete = async () => {
        if (!window.api?.handover || !noteToDelete) return;
        try {
            await window.api.handover.delete(noteToDelete);
            loadData();
            setShowDeleteModal(false);
            setNoteToDelete(null);
        } catch (e) { console.error(e); }
    };

    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' ? true :
            filter === 'active' ? !note.isCompleted :
                note.isCompleted;
        return matchesSearch && matchesFilter;
    });

    const visibleNotes = filteredNotes.slice(0, visibleCount);

    // HELPER: Get Shift Name based on hour
    const getShiftName = (dateStr) => {
        const hour = new Date(dateStr).getHours();
        if (hour >= 7 && hour < 14) return 'Shift Pagi';
        if (hour >= 14 && hour < 21) return 'Shift Siang';
        return 'Shift Malam';
    };

    // HELPER: Group notes by Date
    const groupedNotes = visibleNotes.reduce((groups, note) => {
        const date = new Date(note.createdAt).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Cek if today or yesterday
        const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        let displayDate = date;
        if (date === today) displayDate = 'Hari Ini';
        else if (date === yesterday) displayDate = 'Kemarin';

        if (!groups[displayDate]) {
            groups[displayDate] = [];
        }
        groups[displayDate].push(note);
        return groups;
    }, {});

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            Operan Dinas
                        </h1>
                        <p className="text-slate-500 mt-1 ml-14">Log aktivitas & serah terima tugas antar shift.</p>
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 font-medium text-sm">
                        {['active', 'completed', 'all'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-lg transition-all capitalize ${filter === f ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f === 'active' ? 'Aktif / Pending' : f === 'completed' ? 'Selesai' : 'Semua'}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                    {/* LEFT: Powerful Input Form */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-slate-500" />
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Buat Catatan Baru</h3>
                            </div>

                            <form onSubmit={addNote} className="p-6 space-y-5">
                                {/* Configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Prioritas</label>
                                        <div className="flex gap-2">
                                            {Object.entries(PRIORITIES).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setPriority(key)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${priority === key ? config.color + ' ring-2 ring-offset-1 ring-slate-200' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    {config.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Kategori</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                            disabled={!!selectedRequest}
                                        >
                                            {Object.entries(CATEGORIES).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Isi Catatan</label>
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Ketik instruksi atau info penting disini..."
                                        className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none bg-slate-50"
                                    ></textarea>
                                </div>

                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative">
                                    <label className="block text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                                        <IconLink size={12} />
                                        LAMPIRKAN DATA PASIEN (Opsional)
                                    </label>

                                    {/* Selected Item Display */}
                                    {selectedRequest ? (
                                        <div className="flex items-center justify-between bg-white border border-blue-200 p-2 rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                    {requests.find(r => String(r.id) === String(selectedRequest))?.patientName?.charAt(0)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-700 truncate">
                                                        {requests.find(r => String(r.id) === String(selectedRequest))?.patientName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono truncate">
                                                        {requests.find(r => String(r.id) === String(selectedRequest))?.regNumber}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRequest('');
                                                    setPatientSearchTerm('');
                                                }}
                                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={patientSearchTerm}
                                                    onChange={(e) => {
                                                        setPatientSearchTerm(e.target.value);
                                                        setIsSearchingPatient(true);
                                                    }}
                                                    onFocus={() => setIsSearchingPatient(true)}
                                                    placeholder="Ketik nama pasien atau No. RM..."
                                                    className="w-full text-xs py-2.5 pl-9 pr-3 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder:text-blue-300 transition-all"
                                                />
                                            </div>

                                            {/* Dropdown Suggestions */}
                                            {isSearchingPatient && patientSearchTerm && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                    {requests
                                                        .filter(r =>
                                                            r.patientName.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
                                                            (r.regNumber && r.regNumber.includes(patientSearchTerm))
                                                        )
                                                        .slice(0, 5) // Limit to 5 results
                                                        .map(req => (
                                                            <button
                                                                key={req.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRequest(req.id);
                                                                    setIsSearchingPatient(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{req.patientName}</p>
                                                                    <p className="text-[10px] text-slate-400 font-mono">{req.regNumber || 'No RM'}</p>
                                                                </div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${req.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                                    {req.status}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    {requests.filter(r => r.patientName.toLowerCase().includes(patientSearchTerm.toLowerCase())).length === 0 && (
                                                        <div className="p-4 text-center text-xs text-slate-400">
                                                            Data tidak ditemukan
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[10px] text-blue-400 mt-2 leading-relaxed">
                                        Cari dan pilih pasien untuk menautkan data medis ke catatan ini.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newNote.trim() && !selectedRequest}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Post Catatan
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT: Timeline List */}
                    <div className="xl:col-span-2 space-y-6 pb-20">
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari catatan operan berdasarkan konten atau penulis..."
                                className="w-full pl-12 pr-4 py-4 bg-white border-none shadow-sm rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                            />
                        </div>

                        {filteredNotes.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="bg-white mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <ClipboardList className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-lg mb-1">Belum ada catatan</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto">
                                    {filter === 'active' ? 'Tidak ada catatan aktif saat ini. Kerja bagus!' : 'Mulai tulis operan dinas untuk komunikasi antar shift.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6"> {/* Increased gap for sections */}
                                {Object.entries(groupedNotes).map(([dateLabel, notesInGroup]) => (
                                    <div key={dateLabel} className="animate-in fade-in transition-all">
                                        {/* Date Separator */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
                                                {dateLabel}
                                            </span>
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                        </div>

                                        <div className="space-y-4">
                                            {notesInGroup.map((note) => (
                                                <div key={note.id} className="relative">
                                                    {/* Shift Badge (Overlaid on NoteCard via wrapper?) No, let's pass formatting to NoteCard or just overlay here? 
                                                        Actually, NoteCard component handles rendering. Let's modify NoteCard or just render it. 
                                                        Wait, I can't easily modify NoteCard props without editing NoteCard component.
                                                        Let's just update the list wrapper.
                                                     */}
                                                    <div className="absolute -left-3 top-[-8px] z-10 hidden xl:block">
                                                        {/* Optional visual connector or time marker could go here */}
                                                    </div>
                                                    <NoteCard
                                                        note={note}
                                                        requests={requests}
                                                        currentUser={currentUser}
                                                        toggleNote={toggleNote}
                                                        onDelete={confirmDelete}
                                                        refreshData={loadData}
                                                        shiftName={getShiftName(note.createdAt)} // Pass shift name
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* LOAD MORE BUTTON */}
                                {visibleCount < filteredNotes.length && (
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                                        className="w-full py-3 text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors border border-dashed border-slate-200"
                                    >
                                        Tampilkan Lebih Banyak ({filteredNotes.length - visibleCount} lagi)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Catatan?</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Tindakan ini tidak dapat dibatalkan. Catatan dan semua komentar di dalamnya akan hilang permanen.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={executeDelete}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                    >
                                        Ya, Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
