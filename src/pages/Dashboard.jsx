import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users, FileText, Activity, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const isElectron = () => window.api && window.api.requests;

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState([
        { label: 'Total Permintaan', value: 0, icon: FileText, style: { bg: 'bg-blue-100', text: 'text-blue-600' } },
        { label: 'Pending', value: 0, icon: Clock, style: { bg: 'bg-slate-100', text: 'text-slate-600' } },
        { label: 'Proses', value: 0, icon: Activity, style: { bg: 'bg-amber-100', text: 'text-amber-600' } },
        { label: 'Selesai', value: 0, icon: CheckCircle, style: { bg: 'bg-emerald-100', text: 'text-emerald-600' } },
    ]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [alerts, setAlerts] = useState([]);

    // Initial Load
    useEffect(() => {
        const loadInitialData = async () => {
            let reqs = [];

            if (isElectron()) {
                try {
                    reqs = await window.api.requests.getAll();
                } catch (err) { console.error(err); }
            } else {
                const saved = localStorage.getItem('mpim_requests');
                reqs = saved ? JSON.parse(saved) : [];
            }

            // Calculate Stats
            const total = reqs.length;
            const process = reqs.filter(r => r.status === 'Proses').length;
            const done = reqs.filter(r => r.status === 'Selesai').length;
            const pending = reqs.filter(r => r.status === 'Pending').length;

            setStats([
                { label: 'Total Permintaan', value: total, icon: FileText, style: { bg: 'bg-blue-100', text: 'text-blue-600' } },
                { label: 'Pending', value: pending, icon: Clock, style: { bg: 'bg-slate-100', text: 'text-slate-600' } },
                { label: 'Proses', value: process, icon: Activity, style: { bg: 'bg-amber-100', text: 'text-amber-600' } },
                { label: 'Selesai', value: done, icon: CheckCircle, style: { bg: 'bg-emerald-100', text: 'text-emerald-600' } },
            ]);

            // Calculate Alerts
            const alertItems = [];
            const today = new Date();

            reqs.forEach(r => {
                // 1. Time Alert (Pending/Proses > 3 days)
                if (['Pending', 'Proses'].includes(r.status)) {
                    const created = new Date(r.createdAt);
                    const diffTime = Math.abs(today - created);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays >= 3) {
                        alertItems.push({
                            id: `time-${r.id}`,
                            reqId: r.id, // Important for navigation
                            type: 'time',
                            text: `Permintaan ${r.patientName} (${r.status}) sudah ${diffDays} hari belum selesai.`,
                            priority: 'high'
                        });
                    }
                }

                // 2. Frequency/History Alert (Stuck)
                if (r.status === 'Proses') {
                    // Check history length
                    const historyCount = r.history ? r.history.length : 0;
                    if (historyCount >= 3) { // Threshold 3 updates
                        alertItems.push({
                            id: `history-${r.id}`,
                            reqId: r.id,
                            type: 'freq',
                            text: `Pengajuan ${r.patientName} sudah ${historyCount}x update progres (Macet).`,
                            priority: 'high'
                        });
                    }
                }
            });

            setAlerts(alertItems);
            setRecentActivity([...reqs].sort((a, b) => b.id - a.id).slice(0, 5));
        };

        loadInitialData();
    }, []);

    return (
        <Layout>
            <div className="p-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                        <p className="text-slate-500 text-sm mt-1">Ringkasan aktivitas sistem</p>
                    </div>
                    {/* Date Widget? */}
                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </header>

                {/* Modern Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            {/* Accent Strip */}
                            <div className={`absolute right-0 top-0 h-full w-1 ${stat.style.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}></div>

                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3.5 rounded-xl ${stat.style.bg} ${stat.style.text} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded-full ${stat.style.bg} ${stat.style.text}`}>
                                    {stat.label === 'Total Permintaan' ? 'Total' : stat.label}
                                </div>
                            </div>
                            <h3 className="text-4xl font-bold text-slate-800 mb-1 tracking-tight">{stat.value}</h3>
                            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Modern Alerts Section */}
                {alerts.length > 0 && (
                    <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Perhatian Diperlukan</h3>
                                <p className="text-slate-500 text-sm mt-1">Terdeteksi <span className="font-bold text-red-600">{alerts.length} pengajuan</span> yang membutuhkan tindak lanjut segera.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/requests', { state: { filterAlerts: true } })}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2"
                        >
                            Lihat Semua Kasus ({alerts.length})
                            <ChevronRight className="w-4 h-4 text-white/70" />
                        </button>
                    </div>
                )}

                {/* Recent Activity Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Permintaan Terbaru</h3>
                            <p className="text-sm text-slate-400 mt-0.5">5 aktivitas terakhir masuk</p>
                        </div>
                        <button onClick={() => navigate('/requests')} className="text-sm bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-100 hover:text-blue-600 transition-colors">
                            Lihat Semua
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold tracking-wide">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-xl border-b border-slate-100">Pasien</th>
                                    <th className="px-6 py-4 border-b border-slate-100">Layanan & Penjamin</th>
                                    <th className="px-6 py-4 border-b border-slate-100">Tanggal</th>
                                    <th className="px-6 py-4 border-b border-slate-100 text-right rounded-tr-xl">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/20 rounded-b-xl">
                                            Belum ada aktivitas terbaru hari ini.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 ring-1 ring-blue-100/50">
                                                        {req.patientName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-sm">{req.patientName}</p>
                                                        <p className="text-[11px] text-slate-500 font-mono">{req.regNumber || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-slate-700 text-xs font-medium">{req.type}</p>
                                                <p className="text-[11px] text-slate-400">{req.insuranceName}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                {new Date(req.createdAt || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                <span className="text-[10px] ml-1 text-slate-400 block">{new Date(req.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${req.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    req.status === 'Proses' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                        req.status === 'Ditolak' ? 'bg-red-50 text-red-600 border-red-200' :
                                                            'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout >
    );
}
