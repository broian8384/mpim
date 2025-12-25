import React from 'react';
import Layout from '../components/Layout';
import { CircleHelp, Keyboard, Mouse, FileText, Zap, Shield, Book, Info } from 'lucide-react';

export default function Help() {


    const features = [
        {
            icon: <FileText className="w-6 h-6" />,
            title: 'Manajemen Permintaan',
            description: 'Buat, edit, dan kelola permintaan informasi medis pasien.',
            tips: [
                'Klik tombol "+ Permintaan Baru" untuk membuat permintaan',
                'Gunakan filter dan search untuk mencari data',
                'Export ke Excel atau PDF untuk laporan',
                'Klik icon Print untuk cetak bukti permintaan'
            ]
        },
        {
            icon: <Book className="w-6 h-6" />,
            title: 'Laporan & Analisis',
            description: 'Dashboard reporting dengan analisis data lengkap.',
            tips: [
                'Filter berdasarkan periode waktu',
                'Lihat grafik trend permintaan',
                'Download Laporan Executive dalam format PDF',
                'Reset filter untuk kembali ke periode default'
            ]
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Activity Log',
            description: 'Audit trail lengkap semua aktivitas sistem.',
            tips: [
                'Filter berdasarkan user, action, atau module',
                'Gunakan date range untuk period tertentu',
                'Export activity logs ke Excel/PDF',
                'Tersedia untuk Super Admin saja'
            ]
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'Backup & Restore',
            description: 'Cadangkan dan pulihkan data sistem.',
            tips: [
                'Lakukan backup berkala (minimal 1x seminggu)',
                'Simpan file backup di lokasi aman',
                'Restore data dari file backup JSON',
                'Verifikasi backup sebelum hapus data lama'
            ]
        }
    ];

    return (
        <Layout>
            <div className="p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <CircleHelp className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Panduan Pengguna MPIM</h1>
                    <p className="text-lg text-slate-700 font-medium">Medical Portal Information Management</p>
                    <p className="text-slate-500">Manajemen Penerimaan Informasi Medis</p>
                </div>



                {/* Features Guide */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Book className="w-6 h-6 text-blue-600" />
                        Panduan Fitur Utama
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                                        <p className="text-sm text-slate-600 mb-4">{feature.description}</p>
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tips:</p>
                                            <ul className="space-y-1.5">
                                                {feature.tips.map((tip, tipIndex) => (
                                                    <li key={tipIndex} className="text-sm text-slate-600 flex items-start gap-2">
                                                        <span className="text-blue-500 mt-1">•</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500 rounded-xl text-white">
                            <Info className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Tips & Trik</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span><strong>Zoom:</strong> Gunakan Ctrl + 0 untuk reset zoom jika tampilan terlalu kecil/besar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span><strong>Menu Bar:</strong> Akses File, Edit, View, dan Help dari menu bar di atas</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span><strong>Search:</strong> Semua tabel memiliki fitur search dan filter untuk mempermudah pencarian</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span><strong>Export:</strong> Tersedia format Excel dan PDF untuk semua data dan laporan</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span><strong>Security:</strong> Activity Log mencatat semua aktivitas untuk audit trail</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Version Info */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>MPIM Version 1.0.0</p>
                    <p className="mt-1">© 2025 Medical Portal Information Management</p>
                </div>
            </div>
        </Layout>
    );
}
