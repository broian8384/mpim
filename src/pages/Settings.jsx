import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Save, Upload, Building, Phone, Mail, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
    const [settings, setSettings] = useState({
        appName: '',
        hospitalName: '',
        address: '',
        phone: '',
        email: '',
        logo: null
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

            if (data) {
                setSettings(data);
            }
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

            // Clear success message after 3 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout title="Pengaturan Instansi">
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Pengaturan Instansi</h1>
                    <p className="text-slate-500">Sesuaikan data rumah sakit untuk digunakan pada kop surat dan laporan.</p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form Fields */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Building size={20} className="text-blue-600" /> Identitas Instansi
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Rumah Sakit / Klinik</label>
                                    <input
                                        type="text"
                                        required
                                        value={settings.hospitalName}
                                        onChange={e => setSettings({ ...settings, hospitalName: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Contoh: RSUD Sehat Sentosa"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Aplikasi (Opsional)</label>
                                    <input
                                        type="text"
                                        value={settings.appName}
                                        onChange={e => setSettings({ ...settings, appName: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="MPIM System"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                                    <textarea
                                        required
                                        value={settings.address}
                                        onChange={e => setSettings({ ...settings, address: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                        placeholder="Jalan Jenderal Sudirman No. 1..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Phone size={20} className="text-blue-600" /> Kontak
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Telepon</label>
                                    <input
                                        type="text"
                                        value={settings.phone}
                                        onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="(021) 1234567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Resmi</label>
                                    <input
                                        type="email"
                                        value={settings.email}
                                        onChange={e => setSettings({ ...settings, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="info@rumahsakit.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Logo Upload */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" /> Logo Instansi
                            </h3>

                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {settings.logo ? (
                                    <div className="text-center">
                                        <img src={settings.logo} alt="Logo Preview" className="h-32 object-contain mx-auto mb-4" />
                                        <span className="text-xs text-slate-500">Klik untuk mengganti</span>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <Upload className="w-12 h-12 mx-auto mb-3" />
                                        <p className="font-medium text-sm">Upload Logo</p>
                                        <p className="text-xs mt-1">PNG, JPG (Max 2MB)</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                                <p className="font-semibold mb-1">Rekomendasi Logo:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-blue-700/80">
                                    <li>Format: <strong>PNG (Transparan)</strong></li>
                                    <li>Ukuran File: <strong>&lt; 500 KB</strong> (Max 2MB)</li>
                                    <li>Resolusi: Min. <strong>300x300 px</strong></li>
                                </ul>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl font-bold transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={20} /> Simpan Pengaturan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
