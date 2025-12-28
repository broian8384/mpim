import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users, FileText, Activity, Clock, CheckCircle, AlertCircle, ChevronRight, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const isElectron = () => window.api && window.api.requests;

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, pending: 0, process: 0, done: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [alerts, setAlerts] = useState([]);

    // Chart Data States
    const [trendData, setTrendData] = useState([]);
    const [insuranceData, setInsuranceData] = useState([]);

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

            // 1. Calculate Core Stats
            const total = reqs.length;
            const process = reqs.filter(r => r.status === 'Proses').length;
            const done = reqs.filter(r => r.status === 'Selesai').length;
            const pending = reqs.filter(r => r.status === 'Pending').length;

            setStats({ total, pending, process, done });

            // 2. Process Trend Data (Last 7 Days)
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const trend = last7Days.map(date => {
                const count = reqs.filter(r => r.createdAt.startsWith(date)).length;
                return {
                    date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short' }),
                    fullDate: date,
                    value: count
                };
            });
            setTrendData(trend);

            // 3. Process Insurance Distribution & Poli
            const insuranceCounts = reqs.reduce((acc, curr) => {
                const polite = curr.type?.split(' - ')[0] || 'Lainnya'; // Simple grouping
                acc[polite] = (acc[polite] || 0) + 1;
                return acc;
            }, {});

            const insChartData = Object.entries(insuranceCounts).map(([name, value]) => ({ name, value }));
            setInsuranceData(insChartData);


            // 4. Calculate Alerts
            const alertItems = [];
            const today = new Date();

            reqs.forEach(r => {
                if (['Pending', 'Proses'].includes(r.status)) {
                    const created = new Date(r.createdAt);
                    const diffTime = Math.abs(today - created);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays >= 3) {
                        alertItems.push({
                            id: `time-${r.id}`,
                            reqId: r.id,
                            type: 'time',
                            text: `Permintaan ${r.patientName} (${r.status}) sudah ${diffDays} hari belum selesai.`,
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

    const metricCards = [
        { label: 'Total Permintaan', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: '+12%' },
        { label: 'Pending (Menunggu)', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Perlu Tindakan' },
        { label: 'Sedang Proses', value: stats.process, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Aktif' },
        { label: 'Selesai', value: stats.done, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: 'Completed' },
    ];

    return (
        <Layout>
            <div className="p-8 pb-20 space-y-8">
                {/* Header */}
                <header className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="w-6 h-6 text-blue-600" />
                            Executive Dashboard
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Ringkasan performa & aktivitas unit rekam medis.</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-xs text-slate-400">Update Realtime</p>
                    </div>
                </header>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {metricCards.map((card, idx) => (
                        <div key={idx} className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border ${card.border} group hover:shadow-md transition-all`}>
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <card.icon className={`w-24 h-24 ${card.color}`} />
                            </div>
                            <div className="relative z-10">
                                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <h3 className="text-slate-500 text-sm font-medium mb-1">{card.label}</h3>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-800">{card.value}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 ${card.label.includes('Pending') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {card.trend}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Trend Chart (Area) */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                    Tren Permintaan (7 Hari Terakhir)
                                </h3>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Poli Distribution (Bar) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">Distribusi Layanan</h3>
                        <div className="h-[280px] w-full">
                            {insuranceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={insuranceData} margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {insuranceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][index % 4]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-xs">Belum ada data visual</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* GRID BOTTOM SECTION */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Recent Activity Table */}
                    <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Aktivitas Terkini</h3>
                            <button onClick={() => navigate('/requests')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                                LIHAT SEMUA <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Pasien</th>
                                        <th className="px-6 py-3">Waktu</th>
                                        <th className="px-6 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentActivity.length === 0 ? (
                                        <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-xs">Belum ada data.</td></tr>
                                    ) : (
                                        recentActivity.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${req.type?.includes('IGD') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {req.patientName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-xs">{req.patientName}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{req.regNumber}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Clock size={12} />
                                                        {new Date(req.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        <span className="text-[10px] text-slate-300">•</span>
                                                        <span>{new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${req.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            req.status === 'Proses' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-slate-50 text-slate-500 border-slate-100'
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

                    {/* Alerts Panel */}
                    <div className="xl:col-span-1 space-y-4">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={80} /></div>
                            <h3 className="font-bold text-lg mb-1 relative z-10">Pusat Notifikasi</h3>
                            <p className="text-slate-400 text-xs mb-4 relative z-10">Item yang memerlukan perhatian segera.</p>

                            <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-dark">
                                {alerts.length === 0 ? (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                                        <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-xs text-slate-300">Semua aman terkendali!</p>
                                    </div>
                                ) : (
                                    alerts.map((alert) => (
                                        <div key={alert.id} onClick={() => navigate('/requests')} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl hover:bg-red-500/20 transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <div>
                                                    <p className="text-xs font-medium text-red-200 leading-relaxed group-hover:text-white transition-colors">
                                                        {alert.text}
                                                    </p>
                                                    <span className="text-[10px] text-red-400/70 mt-1 block uppercase tracking-wider font-bold">Prioritas Tinggi</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Action Mini Card */}
                        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                            <h3 className="font-bold text-lg mb-2">Buat Permintaan Baru?</h3>
                            <p className="text-blue-100 text-xs mb-4 opacity-90">Input data pasien rawat inap atau jalan dengan cepat.</p>
                            <button onClick={() => navigate('/requests')} className="w-full py-2.5 bg-white text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                                + Input Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
