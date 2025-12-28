import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Save, Upload, Building, Phone, Mail, FileText, CheckCircle, AlertCircle, Printer, Settings as SettingsIcon, Image, Clock, MapPin, X } from 'lucide-react';

export default function Settings() {
    const [settings, setSettings] = useState({
        appName: '',
        hospitalName: '',
        address: '',
        phone: '',
        email: '',
        logo: null,
        printFooter: {
            reminder: 'HARAP MEMBAWA TANDA TERIMA SAAT PENGAMBILAN DOKUMEN.',
            workDays: 'Senin s.d Sabtu',
            workHours: '08.00 s.d 16.00 WIB',
            contactInfo: '021 588 5120 (Telp/WA)'
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const isElectron = window.api && window.api.settings;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            let data;
            if (isElectron) {
                data = await window.api.settings.get();
            } else {
                const localData = localStorage.getItem('mpim_settings');
                data = localData ? JSON.parse(localData) : null;
            }
            if (data) setSettings(data);
        } catch (error) {
            console.error("Failed to load settings:", error);
            setMessage({ type: 'error', text: 'Gagal memuat pengaturan.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setSettings(prev => ({ ...prev, logo: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            if (isElectron) {
                await window.api.settings.update(settings);
            } else {
                localStorage.setItem('mpim_settings', JSON.stringify(settings));
            }
            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="p-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Instansi</h1>
                        <p className="text-slate-500 text-sm">Kelola identitas dan pengaturan cetak instansi Anda</p>
                    </div>
                    <button
                        type="submit"
                        form="settings-form"
                        disabled={saving}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Simpan Pengaturan</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Success/Error Message */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <form id="settings-form" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column - Main Info */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Identitas Instansi Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Building size={18} className="text-blue-600" />
                                    Identitas Instansi
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Nama Rumah Sakit / Klinik <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={settings.hospitalName}
                                            onChange={e => setSettings({ ...settings, hospitalName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Contoh: RS Harapan Sehat"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Nama Aplikasi <span className="text-slate-400 font-normal">(Opsional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.appName}
                                            onChange={e => setSettings({ ...settings, appName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="MPIM System"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Alamat Lengkap
                                        </label>
                                        <textarea
                                            required
                                            value={settings.address}
                                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                                            placeholder="Jalan Jenderal Sudirman No. 1, Jakarta Pusat..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Kontak Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Phone size={18} className="text-blue-600" />
                                    Informasi Kontak
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Nomor Telepon
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.phone}
                                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="(021) 1234567"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Email Resmi
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.email}
                                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="info@rumahsakit.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Logo & Footer */}
                        <div className="space-y-6">

                            {/* Logo Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Image size={18} className="text-blue-600" />
                                    Logo Instansi
                                </h3>
                                <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-colors group cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    {settings.logo ? (
                                        <div className="text-center relative">
                                            <img src={settings.logo} alt="Logo" className="h-20 object-contain mx-auto mb-2" />
                                            <p className="text-xs text-slate-500">Klik untuk mengganti</p>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-20"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-400 group-hover:text-slate-500 transition-colors">
                                            <Upload className="w-10 h-10 mx-auto mb-2" />
                                            <p className="font-medium text-sm">Upload Logo</p>
                                            <p className="text-xs mt-1">PNG, JPG (Max 2MB)</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-3">
                                    💡 Rekomendasi: Format PNG transparan, ukuran &lt;500KB
                                </p>
                            </div>

                            {/* Footer Struk Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Printer size={18} className="text-blue-600" />
                                    Footer Struk Cetak
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Pesan Pengingat</label>
                                        <input
                                            type="text"
                                            value={settings.printFooter?.reminder || ''}
                                            onChange={e => setSettings({
                                                ...settings,
                                                printFooter: { ...settings.printFooter, reminder: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="HARAP MEMBAWA TANDA TERIMA..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Hari Kerja</label>
                                            <input
                                                type="text"
                                                value={settings.printFooter?.workDays || ''}
                                                onChange={e => setSettings({
                                                    ...settings,
                                                    printFooter: { ...settings.printFooter, workDays: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="Senin-Sabtu"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Jam Kerja</label>
                                            <input
                                                type="text"
                                                value={settings.printFooter?.workHours || ''}
                                                onChange={e => setSettings({
                                                    ...settings,
                                                    printFooter: { ...settings.printFooter, workHours: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="08.00-16.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kontak Konfirmasi</label>
                                        <input
                                            type="text"
                                            value={settings.printFooter?.contactInfo || ''}
                                            onChange={e => setSettings({
                                                ...settings,
                                                printFooter: { ...settings.printFooter, contactInfo: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="021 588 5120 (Telp/WA)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
