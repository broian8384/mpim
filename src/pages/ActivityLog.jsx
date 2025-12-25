import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ActivityLogger from '../utils/ActivityLogger';
import { Activity, Search, Filter, Download, Trash2, User, Calendar, FileText, Eye, Edit, Plus, X, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        module: '',
        search: '',
        dateRange: { start: '', end: '' }
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const confirmDelete = () => {
        localStorage.removeItem('mpim_activity_logs');
        loadLogs();
        ActivityLogger.log('DELETE', {
            module: 'Activity Log',
            description: 'Menghapus semua activity logs',
            target: 'All Logs'
        });
        setIsDeleteModalOpen(false);
    };

    useEffect(() => {
        loadLogs();
    }, [filters]);

    const loadLogs = () => {
        let allLogs = ActivityLogger.getLogs(filters);

        // Sorting
        if (sortConfig.key) {
            allLogs.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle nested user name if object
                if (sortConfig.key === 'user') {
                    aVal = typeof a.user === 'object' ? a.user?.name || '' : a.user;
                    bVal = typeof b.user === 'object' ? b.user?.name || '' : b.user;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setLogs(allLogs);
        setFilteredLogs(allLogs);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Re-run sort when sortConfig changes
    useEffect(() => {
        loadLogs();
    }, [sortConfig]);

    const handleClearLogs = () => {
        if (ActivityLogger.clearLogs()) {
            loadLogs();
            ActivityLogger.log('DELETE', {
                module: 'Activity Log',
                description: 'Menghapus semua activity logs',
                target: 'All Logs'
            });
        }
    };

    const handleResetFilters = () => {
        setFilters({
            user: '',
            action: '',
            module: '',
            search: '',
            dateRange: { start: '', end: '' }
        });
    };

    const handleExportExcel = () => {
        const exportData = filteredLogs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString('id-ID'),
            'User': typeof log.user === 'object' ? log.user?.name || 'Unknown' : log.user,
            'Email': log.userEmail,
            'Action': log.action,
            'Module': log.module,
            'Description': log.description,
            'Target': log.target || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');

        const colWidths = [
            { wch: 20 }, // Timestamp
            { wch: 20 }, // User
            { wch: 25 }, // Email
            { wch: 12 }, // Action
            { wch: 18 }, // Module
            { wch: 50 }, // Description
            { wch: 20 }  // Target
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `activity-logs-${new Date().toISOString().split('T')[0]}.xlsx`);

        ActivityLogger.log('EXPORT', {
            module: 'Activity Log',
            description: `Export activity logs to Excel (${filteredLogs.length} records)`,
            target: 'Excel File'
        });
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTIVITY LOG REPORT', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 28);
        doc.text(`Total Records: ${filteredLogs.length}`, 14, 34);

        // Table
        const tableData = filteredLogs.map(log => [
            new Date(log.timestamp).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            }),
            typeof log.user === 'object' ? log.user?.name || 'Unknown' : log.user,
            log.action,
            log.module,
            log.description.substring(0, 40) + (log.description.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Time', 'User', 'Action', 'Module', 'Description']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 8 }
        });

        doc.save(`activity-logs-${new Date().toISOString().split('T')[0]}.pdf`);

        ActivityLogger.log('EXPORT', {
            module: 'Activity Log',
            description: `Export activity logs to PDF (${filteredLogs.length} records)`,
            target: 'PDF File'
        });
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <Plus className="w-4 h-4" />;
            case 'UPDATE': return <Edit className="w-4 h-4" />;
            case 'DELETE': return <Trash2 className="w-4 h-4" />;
            case 'VIEW': return <Eye className="w-4 h-4" />;
            case 'EXPORT': return <Download className="w-4 h-4" />;
            case 'LOGIN': return <User className="w-4 h-4" />;
            case 'LOGOUT': return <X className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
            case 'VIEW': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'EXPORT': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'LOGIN': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOGOUT': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Activity className="w-7 h-7 text-blue-600" />
                            Activity Log
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Riwayat aktivitas dan audit trail sistem</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                        >
                            <Download size={16} />
                            Excel
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                        >
                            <Download size={16} />
                            PDF
                        </button>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-slate-600" />
                        <h3 className="font-bold text-slate-800">Filter & Search</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* User Filter */}
                        <input
                            type="text"
                            placeholder="Filter by user..."
                            value={filters.user}
                            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        {/* Action Filter */}
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="VIEW">View</option>
                            <option value="EXPORT">Export</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                        </select>

                        {/* Module Filter */}
                        <select
                            value={filters.module}
                            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Modules</option>
                            <option value="Requests">Requests</option>
                            <option value="Users">Users</option>
                            <option value="Master Data">Master Data</option>
                            <option value="Reports">Reports</option>
                            <option value="Backup">Backup</option>
                            <option value="Activity Log">Activity Log</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Range */}
                        <div className="flex gap-2 items-center">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-slate-500">to</span>
                            <input
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Reset Button */}
                        <div className="flex items-center justify-end">
                            <button
                                onClick={handleResetFilters}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                            >
                                <RotateCcw size={16} />
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4 text-sm text-slate-600">
                    Showing <span className="font-bold text-slate-900">{filteredLogs.length}</span> activities
                </div>

                {/* Activity List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold tracking-wide border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('timestamp')}>
                                        <div className="flex items-center gap-2">
                                            Timestamp
                                            {sortConfig.key === 'timestamp' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                                            )}
                                            {sortConfig.key !== 'timestamp' && <ArrowUpDown size={14} className="text-slate-400" />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('user')}>
                                        <div className="flex items-center gap-2">
                                            User
                                            {sortConfig.key === 'user' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                                            )}
                                            {sortConfig.key !== 'user' && <ArrowUpDown size={14} className="text-slate-400" />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('action')}>
                                        <div className="flex items-center justify-center gap-2">
                                            Action
                                            {sortConfig.key === 'action' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                                            )}
                                            {sortConfig.key !== 'action' && <ArrowUpDown size={14} className="text-slate-400" />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('module')}>
                                        <div className="flex items-center gap-2">
                                            Module
                                            {sortConfig.key === 'module' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                                            )}
                                            {sortConfig.key !== 'module' && <ArrowUpDown size={14} className="text-slate-400" />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left">Description</th>
                                    <th className="px-6 py-4 text-left">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentLogs.length > 0 ? (
                                    currentLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {typeof log.user === 'object' ? log.user?.name || 'Unknown' : log.user}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{log.userEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-700">{log.module}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {log.description}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-500 font-mono text-xs">
                                                    {log.target || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">No activity logs found</p>
                                            <p className="text-xs mt-1">Try adjusting your filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredLogs.length > itemsPerPage && (
                        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-white gap-4 sm:gap-0">
                            <span>Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 border border-slate-200 rounded-lg transition-colors font-medium
                                        ${currentPage === 1
                                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                            : 'hover:bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                                >
                                    Previous
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
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
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

            {/* Delete Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Semua Log?</h3>
                            <p className="text-sm text-slate-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Batal</button>
                                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </Layout >
    );
}
