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
                'Gunakan filter dan search untuk mencari data spesifik',
                'Export ke Excel atau PDF untuk laporan fisik',
                'Klik icon Print untuk cetak bukti penerimaan berkas'
            ]
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Manajemen Pengguna (User)',
            description: 'Kelola akun pengguna, hak akses, dan keamanan sistem.',
            tips: [
                'Hanya Super Admin yang dapat menambah user baru',
                'Reset password user jika lupa kata sandi',
                'Nonaktifkan akun staff yang sudah tidak aktif',
                'Pantau aktivitas login user di Activity Log'
            ]
        },
        {
            icon: <Book className="w-6 h-6" />,
            title: 'Data Master',
            description: 'Kelola data referensi seperti Dokter, Asuransi, dan Layanan.',
            tips: [
                'Input data dokter & asuransi agar muncul di autocomplete',
                'Standarisasi nama layanan untuk laporan yang rapi',
                'Import data master dari Excel untuk input massal',
                'Hapus data master yang tidak lagi digunakan'
            ]
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'Laporan & Analisis',
            description: 'Dashboard reporting dengan analisis data lengkap.',
            tips: [
                'Filter laporan berdasarkan periode tanggal custom',
                'Analisis tren permintaan per bulan',
                'Download Laporan Executive dalam format PDF',
                'Pantau kinerja dan volume permintaan'
            ]
        },
        {
            icon: <Keyboard className="w-6 h-6" />,
            title: 'Pengaturan Sistem',
            description: 'Konfigurasi identitas instansi dan preferensi aplikasi.',
            tips: [
                'Upload Logo Instansi untuk kop surat otomatis',
                'Isi data alamat & kontak untuk footer laporan',
                'Konfigurasi auto-backup jadwal harian/mingguan',
                'Pastikan data instansi selalu terupdate'
            ]
        },
        {
            icon: <Info className="w-6 h-6" />,
            title: 'Backup & Restore',
            description: 'Amankan data sistem dengan cadangan rutin.',
            tips: [
                'Sistem melakukan auto-backup sesuai jadwal (Default: Mingguan)',
                'Download file backup JSON untuk disimpan di Cloud',
                'Fitur Restore akan menggantikan seluruh data saat ini',
                'Selalu cek folder %APPDATA%/mpim/backups'
            ]
        }
    ];

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8 flex items-center gap-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl flex-shrink-0">
                        <CircleHelp className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">Panduan Pengguna MPIM</h1>
                        <p className="text-lg text-slate-700 font-medium">Medical Portal Information Management</p>
                        <p className="text-slate-500 text-sm">Dokumentasi lengkap penggunaan Medical Portal Information Management.</p>
                    </div>
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
