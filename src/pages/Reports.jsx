import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, AlertCircle, FileText, PieChart as PieIcon, Filter, Clock, CheckCircle, Activity, User, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateExecutiveReport, generateExcelReport } from '../utils/pdfGenerator';

const isElectron = () => window.api && window.api.requests;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
    const [requests, setRequests] = useState([]);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (isElectron()) {
            try {
                const data = await window.api.requests.getAll();
                setRequests(data);
            } catch (err) {
                console.error(err);
            }
        } else {
            const saved = localStorage.getItem('mpim_requests');
            setRequests(saved ? JSON.parse(saved) : []);
        }
    };

    // Filter data by date range
    const filteredData = requests.filter(req => {
        if (!req.createdAt) return false;
        const reqDate = new Date(req.createdAt);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999); // Include end date fully
        return reqDate >= start && reqDate <= end;
    });

    // Calculate Statistics
    const stats = {
        total: filteredData.length,
        pending: filteredData.filter(r => r.status === 'Pending').length,
        proses: filteredData.filter(r => r.status === 'Proses').length,
        selesai: filteredData.filter(r => r.status === 'Selesai').length,
        diambil: filteredData.filter(r => r.status === 'Sudah Diambil').length,
        ditolak: filteredData.filter(r => r.status === 'Ditolak').length,
    };

    // Calculate Alerts
    const today = new Date();
    const alerts = filteredData.filter(r => {
        if (!['Pending', 'Proses'].includes(r.status)) return false;
        const created = new Date(r.createdAt || 0);
        const diffDays = Math.floor((today - created) / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) return true;
        if (r.status === 'Proses' && (r.history?.length || 0) >= 3) return true;
        return false;
    }).length;

    // Group by Insurance
    const insuranceData = {};
    filteredData.forEach(r => {
        const ins = r.insuranceName || 'Tidak Diketahui';
        insuranceData[ins] = (insuranceData[ins] || 0) + 1;
    });

    const insuranceChartData = Object.entries(insuranceData).map(([name, value]) => ({
        name,
        value,
        percentage: ((value / filteredData.length) * 100).toFixed(1)
    }));

    // Status Chart Data
    const statusChartData = [
        { name: 'Pending', value: stats.pending, fill: '#f59e0b' },
        { name: 'Proses', value: stats.proses, fill: '#3b82f6' },
        { name: 'Selesai', value: stats.selesai, fill: '#10b981' },
        { name: 'Sudah Diambil', value: stats.diambil, fill: '#8b5cf6' },
        { name: 'Ditolak', value: stats.ditolak, fill: '#ef4444' }
    ].filter(item => item.value > 0);

    // Daily Trend Data (Group by Date)
    const dailyData = {};
    filteredData.forEach(r => {
        if (!r.createdAt) return;
        const dateStr = new Date(r.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dailyData[dateStr] = (dailyData[dateStr] || 0) + 1;
    });

    // Convert to array and sort by date
    const dailyTrendData = Object.entries(dailyData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
            return a.date.localeCompare(b.date);
        });

    // Performance Metrics Calculation
    const completedRequests = filteredData.filter(r => ['Selesai', 'Sudah Diambil'].includes(r.status));

    // 1. Average Processing Time (Pending/Proses -> Selesai/Sudah Diambil)
    let totalProcessingDays = 0;
    let processedCount = 0;

    completedRequests.forEach(r => {
        if (r.createdAt) {
            const createdDate = new Date(r.createdAt);
            let completionDate = new Date();
            if (r.history && r.history.length > 0) {
                const lastHistory = r.history[r.history.length - 1];
                if (lastHistory.date) {
                    completionDate = new Date(lastHistory.date);
                }
            }
            const diffTime = completionDate - createdDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
                totalProcessingDays += diffDays;
                processedCount++;
            }
        }
    });

    const avgProcessingTime = processedCount > 0 ? (totalProcessingDays / processedCount).toFixed(1) : 0;

    // 2. Completion Rate
    const completionRate = stats.total > 0 ? ((completedRequests.length / stats.total) * 100).toFixed(1) : 0;

    // 3. Average Response Time (Pending -> Proses)
    const processedOrCompleted = filteredData.filter(r => !['Pending', 'Ditolak'].includes(r.status));
    let totalResponseDays = 0;
    let responseCount = 0;

    processedOrCompleted.forEach(r => {
        if (r.createdAt && r.history && r.history.length > 0) {
            const createdDate = new Date(r.createdAt);
            const firstProcess = r.history.find(h => h.status === 'Proses');
            if (firstProcess && firstProcess.date) {
                const processDate = new Date(firstProcess.date);
                const diffTime = processDate - createdDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    totalResponseDays += diffDays;
                    responseCount++;
                }
            }
        }
    });

    const avgResponseTime = responseCount > 0 ? (totalResponseDays / responseCount).toFixed(1) : 0;

    // 4. Active Cases
    const activeCases = stats.pending + stats.proses;

    // Top Performance - Top Doctors
    const doctorStats = {};
    filteredData.forEach(r => {
        const doctor = r.doctorName || 'Tidak Diketahui';
        if (!doctorStats[doctor]) {
            doctorStats[doctor] = { name: doctor, count: 0 };
        }
        doctorStats[doctor].count++;
    });

    const topDoctors = Object.values(doctorStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((item, index) => ({
            ...item,
            rank: index + 1,
            percentage: stats.total > 0 ? ((item.count / stats.total) * 100).toFixed(1) : 0
        }));

    // Top Performance - Top Insurances
    const topInsurances = insuranceChartData
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((item, index) => ({
            name: item.name,
            count: item.value,
            rank: index + 1,
            percentage: item.percentage
        }));

    // Comparison Metrics
    const calculatePreviousPeriod = () => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1); // 1 day before current start
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - diffDays);

        return { prevStart, prevEnd };
    };

    const { prevStart, prevEnd } = calculatePreviousPeriod();

    const previousData = requests.filter(req => {
        if (!req.createdAt) return false;
        const reqDate = new Date(req.createdAt);
        return reqDate >= prevStart && reqDate <= prevEnd;
    });

    // Calculate Previous Stats
    const prevStats = {
        total: previousData.length,
        pending: previousData.filter(r => r.status === 'Pending').length,
        proses: previousData.filter(r => r.status === 'Proses').length,
        selesai: previousData.filter(r => r.status === 'Selesai').length,
    };

    // Calculate Trends
    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? { value: 100, isUp: true } : { value: 0, isUp: false };
        const change = ((current - previous) / previous) * 100;
        return { value: Math.abs(change).toFixed(1), isUp: change >= 0 };
    };

    const trends = {
        total: calculateTrend(stats.total, prevStats.total),
        pending: calculateTrend(stats.pending, prevStats.pending),
        proses: calculateTrend(stats.proses, prevStats.proses),
        selesai: calculateTrend(stats.selesai, prevStats.selesai),
    };

    // Handlers
    const handleExportExecutiveReport = async () => {
        try {
            await generateExecutiveReport({
                stats,
                trends,
                dateRange,
                completionRate,
                alerts,
                avgProcessingTime,
                avgResponseTime,
                topDoctors,
                topInsurances,
                statusChartData
            });
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Gagal membuat laporan. Silakan coba lagi.');
        }
    };

    const handleExportExcel = () => {
        generateExcelReport(filteredData, dateRange);
    };

    return (
        <Layout>
            <div className="p-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-blue-600" />
                            Laporan & Analisis
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Dashboard reporting & export center</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 active:scale-95"
                        >
                            <FileSpreadsheet size={18} />
                            Export Excel
                        </button>
                        <button
                            onClick={handleExportExecutiveReport}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-95"
                        >
                            <Download size={18} />
                            Laporan PDF
                        </button>
                    </div>
                </div>

                {/* Period Filter */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-slate-600" />
                        <h3 className="font-bold text-slate-800">Filter Periode</h3>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-100">
                        {['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Bulan Lalu', '3 Bulan Terakhir', 'Tahun Ini'].map((label, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    const today = new Date();
                                    if (label === 'Hari Ini') {
                                        setDateRange({ start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                                    } else if (label === 'Minggu Ini') {
                                        const weekStart = new Date(today);
                                        weekStart.setDate(today.getDate() - today.getDay());
                                        setDateRange({ start: weekStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                                    } else if (label === 'Bulan Ini') {
                                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                                        setDateRange({ start: monthStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                                    } else if (label === 'Bulan Lalu') {
                                        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                                        setDateRange({ start: lastMonthStart.toISOString().split('T')[0], end: lastMonthEnd.toISOString().split('T')[0] });
                                    } else if (label === '3 Bulan Terakhir') {
                                        const threeMonthsAgo = new Date(today);
                                        threeMonthsAgo.setMonth(today.getMonth() - 3);
                                        setDateRange({ start: threeMonthsAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                                    } else if (label === 'Tahun Ini') {
                                        const yearStart = new Date(today.getFullYear(), 0, 1);
                                        setDateRange({ start: yearStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                                    }
                                }}
                                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-all border border-slate-200 hover:border-blue-300 hover:text-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                {label}
                            </button>
                        ))}

                        <button
                            onClick={() => {
                                const today = new Date();
                                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                                setDateRange({
                                    start: monthStart.toISOString().split('T')[0],
                                    end: today.toISOString().split('T')[0]
                                });
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all border border-slate-300 hover:border-slate-400 flex items-center gap-2"
                        >
                            <RotateCcw size={14} />
                            Reset Filter
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Dari Tanggal</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="text-sm text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                            <span className="font-semibold">{filteredData.length}</span> permintaan ditemukan
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                    {/* Total */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-blue-600"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-50 text-slate-600`}>
                                {trends.total.isUp ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                                {trends.total.value}%
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.total}</h3>
                        <p className="text-slate-500 text-sm font-medium">Total Pengajuan</p>
                    </div>

                    {/* Pending */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-amber-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-50 text-slate-600`}>
                                {trends.pending.isUp ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                                {trends.pending.value}%
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.pending}</h3>
                        <p className="text-slate-500 text-sm font-medium">Pending</p>
                    </div>

                    {/* Active */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-50 text-slate-600`}>
                                {trends.proses.isUp ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                                {trends.proses.value}%
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.proses}</h3>
                        <p className="text-slate-500 text-sm font-medium">Dalam Proses</p>
                    </div>

                    {/* Completed */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-50 text-slate-600`}>
                                {trends.selesai.isUp ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                                {trends.selesai.value}%
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.selesai}</h3>
                        <p className="text-slate-500 text-sm font-medium">Selesai</p>
                    </div>

                    {/* Taken */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.diambil}</h3>
                        <p className="text-slate-500 text-sm font-medium">Sudah Diambil</p>
                    </div>

                    {/* Alert */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{alerts}</h3>
                        <p className="text-slate-500 text-sm font-medium">Kasus Alert</p>
                    </div>
                </div>

                {/* Performance Metrics Section */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-6 h-6 text-slate-700" />
                        <h3 className="font-bold text-slate-800 text-lg">Indikator Kinerja (KPI)</h3>
                        <span className="ml-auto text-xs bg-white text-slate-600 px-3 py-1 rounded-full border border-slate-300">
                            Performance Metrics
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Avg Processing Time */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-blue-50 rounded-lg">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Waktu Proses</p>
                                </div>
                            </div>
                            <h4 className="text-3xl font-bold text-slate-800 mb-1">
                                {avgProcessingTime}
                                <span className="text-lg text-slate-500 ml-1">hari</span>
                            </h4>
                            <p className="text-xs text-slate-600">Rata-rata penyelesaian</p>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                    <span className="font-semibold text-blue-600">{processedCount}</span> kasus diselesaikan
                                </p>
                            </div>
                        </div>

                        {/* Completion Rate */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-emerald-50 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completion Rate</p>
                                </div>
                            </div>
                            <h4 className="text-3xl font-bold text-slate-800 mb-1">
                                {completionRate}
                                <span className="text-lg text-slate-500 ml-1">%</span>
                            </h4>
                            <p className="text-xs text-slate-600">Tingkat penyelesaian</p>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${completionRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Avg Response Time */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-amber-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Response Time</p>
                                </div>
                            </div>
                            <h4 className="text-3xl font-bold text-slate-800 mb-1">
                                {avgResponseTime}
                                <span className="text-lg text-slate-500 ml-1">hari</span>
                            </h4>
                            <p className="text-xs text-slate-600">Waktu respon awal</p>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                    Pending → Proses
                                </p>
                            </div>
                        </div>

                        {/* Active Cases */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-purple-50 rounded-lg">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Cases</p>
                                </div>
                            </div>
                            <h4 className="text-3xl font-bold text-slate-800 mb-1">
                                {activeCases}
                                <span className="text-lg text-slate-500 ml-1">kasus</span>
                            </h4>
                            <p className="text-xs text-slate-600">Sedang ditangani</p>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                    <span className="text-amber-600 font-semibold">{stats.pending}</span> Pending +
                                    <span className="text-blue-600 font-semibold ml-1">{stats.proses}</span> Proses
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Insurance Distribution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <PieIcon className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-800">Distribusi Asuransi</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={insuranceChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.percentage}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {insuranceChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-800">Distribusi Status</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statusChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                    {statusChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Trend Line Chart - Full Width */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-bold text-slate-800">Trend Pengajuan Harian</h3>
                        <span className="ml-auto text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                            {dailyTrendData.length} hari dalam periode
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={dailyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                style={{ fontSize: '12px' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px' }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="circle"
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Jumlah Pengajuan"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: '#10b981', r: 5 }}
                                activeDot={{ r: 7 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Performance Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Top Doctors */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Top 5 Dokter</h3>
                            <span className="ml-auto text-xs bg-slate-50 text-slate-500 px-3 py-1 rounded-full border border-slate-200">
                                by Volume
                            </span>
                        </div>

                        <div className="space-y-0 divide-y divide-slate-50">
                            {topDoctors.map((doctor, index) => (
                                <div key={index} className="flex items-center gap-4 py-4 group">
                                    <div className={`
                                        flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                                        ${doctor.rank === 1 ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${doctor.rank === 2 ? 'bg-slate-100 text-slate-700' : ''}
                                        ${doctor.rank === 3 ? 'bg-amber-100 text-amber-700' : ''}
                                        ${doctor.rank > 3 ? 'bg-slate-50 text-slate-500' : ''}
                                    `}>
                                        {doctor.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-slate-800 truncate">
                                                {doctor.name}
                                            </p>
                                            <span className="text-sm font-bold text-slate-700">
                                                {doctor.count} <span className="text-slate-400 font-normal text-xs">kasus</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                                style={{ width: `${doctor.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Insurances */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Top 3 Asuransi</h3>
                            <span className="ml-auto text-xs bg-slate-50 text-slate-500 px-3 py-1 rounded-full border border-slate-200">
                                Most Used
                            </span>
                        </div>

                        <div className="space-y-0 divide-y divide-slate-50">
                            {topInsurances.map((insurance, index) => (
                                <div key={index} className="flex items-center gap-4 py-4 group">
                                    <div className={`
                                        flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                                        ${insurance.rank === 1 ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${insurance.rank === 2 ? 'bg-slate-100 text-slate-700' : ''}
                                        ${insurance.rank === 3 ? 'bg-amber-100 text-amber-700' : ''}
                                        ${insurance.rank > 3 ? 'bg-slate-50 text-slate-500' : ''}
                                    `}>
                                        {insurance.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-slate-800 truncate">
                                                {insurance.name}
                                            </p>
                                            <span className="text-sm font-bold text-slate-700">
                                                {insurance.count} <span className="text-slate-400 font-normal text-xs">kasus</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${index === 0 ? 'bg-emerald-600' : 'bg-emerald-400'}`}
                                                style={{ width: `${insurance.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Ringkasan Detail</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold tracking-wide">
                                <tr>
                                    <th className="px-6 py-4 text-left">Kategori</th>
                                    <th className="px-6 py-4 text-center">Jumlah</th>
                                    <th className="px-6 py-4 text-center">Persentase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">Total Pengajuan</td>
                                    <td className="px-6 py-4 text-center font-bold text-blue-600">{stats.total}</td>
                                    <td className="px-6 py-4 text-center">100%</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-700">Pending</td>
                                    <td className="px-6 py-4 text-center">{stats.pending}</td>
                                    <td className="px-6 py-4 text-center">{stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-700">Dalam Proses</td>
                                    <td className="px-6 py-4 text-center">{stats.proses}</td>
                                    <td className="px-6 py-4 text-center">{stats.total > 0 ? ((stats.proses / stats.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-700">Selesai</td>
                                    <td className="px-6 py-4 text-center">{stats.selesai}</td>
                                    <td className="px-6 py-4 text-center">{stats.total > 0 ? ((stats.selesai / stats.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-700">Sudah Diambil</td>
                                    <td className="px-6 py-4 text-center">{stats.diambil}</td>
                                    <td className="px-6 py-4 text-center">{stats.total > 0 ? ((stats.diambil / stats.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-700">Ditolak</td>
                                    <td className="px-6 py-4 text-center">{stats.ditolak}</td>
                                    <td className="px-6 py-4 text-center">{stats.total > 0 ? ((stats.ditolak / stats.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
