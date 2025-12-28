import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, User, Building2, ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react';

export default function Setup() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form Data
    const [adminData, setAdminData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [institutionData, setInstitutionData] = useState({
        hospitalName: '',
        address: '',
        phone: '',
        email: ''
    });

    const isElectron = () => window.api && window.api.auth;

    const handleNext = () => {
        setError('');
        if (step === 1) {
            if (!adminData.name.trim()) { setError('Nama harus diisi'); return; }
            // Proper email validation regex - TLD must be 2-6 characters
            const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/;
            if (!emailRegex.test(adminData.email)) { setError('Format email tidak valid'); return; }
            if (adminData.password.length < 6) { setError('Password minimal 6 karakter'); return; }
            if (adminData.password !== adminData.confirmPassword) { setError('Password tidak sama'); return; }
        }
        if (step === 2 && !institutionData.hospitalName.trim()) {
            setError('Nama instansi harus diisi'); return;
        }
        setStep(step + 1);
    };

    const handleComplete = async () => {
        setError('');
        setIsSubmitting(true);
        try {
            // Clear any existing localStorage data for fresh install
            localStorage.removeItem('mpim_activity_logs'); // Note: 's' at end
            localStorage.removeItem('mpim_requests');
            localStorage.removeItem('mpim_doctors');
            localStorage.removeItem('mpim_insurances');
            localStorage.removeItem('mpim_services');
            localStorage.removeItem('mpim_backup_history');

            if (isElectron()) {
                const result = await window.api.auth.completeSetup({
                    admin: { name: adminData.name, email: adminData.email, password: adminData.password },
                    institution: institutionData
                });
                if (result.success) {
                    localStorage.setItem('mpim_user', JSON.stringify(result.user));
                    navigate('/dashboard');
                } else {
                    setError(result.message);
                }
            } else {
                const newUser = {
                    id: Date.now(), name: adminData.name, email: adminData.email,
                    username: adminData.email.split('@')[0], role: 'Super Admin',
                    status: 'Active', joinDate: new Date().toISOString().split('T')[0],
                    password: adminData.password
                };
                localStorage.setItem('mpim_users', JSON.stringify([newUser]));
                localStorage.setItem('mpim_setup_complete', 'true');
                localStorage.setItem('mpim_settings', JSON.stringify({ isSetupComplete: true, ...institutionData }));
                const { password: _, ...userSafe } = newUser;
                localStorage.setItem('mpim_user', JSON.stringify(userSafe));
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Terjadi kesalahan: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Compact Header */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30 mb-2">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Selamat Datang di MPIM</h1>
                    <p className="text-slate-400 text-xs">Medical Portal Information Management</p>
                </div>

                {/* Compact Progress */}
                <div className="flex items-center justify-center gap-1 mb-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step === s ? 'bg-blue-600 text-white' :
                                step > s ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'
                                }`}>
                                {step > s ? <Check className="w-4 h-4" /> : s}
                            </div>
                            {s < 3 && <div className={`w-8 h-0.5 mx-0.5 ${step > s ? 'bg-green-500' : 'bg-slate-700'}`}></div>}
                        </div>
                    ))}
                </div>

                {/* Compact Card */}
                <div className="bg-white rounded-xl shadow-2xl p-5">
                    {/* Step 1: Admin */}
                    {step === 1 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Buat Akun Administrator</h2>
                                    <p className="text-[10px] text-slate-500">Akun Super Admin pertama</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
                                    <input type="text" value={adminData.name}
                                        onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Nama administrator" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                    <input type="email" value={adminData.email}
                                        onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="admin@instansi.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={adminData.password}
                                            onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                                            className="w-full px-3 py-2 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="Min. 6 karakter" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Konfirmasi</label>
                                    <div className="relative">
                                        <input type={showConfirmPassword ? 'text' : 'password'} value={adminData.confirmPassword}
                                            onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                                            className="w-full px-3 py-2 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="Ulangi password" />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Institution */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Building2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Informasi Instansi</h2>
                                    <p className="text-[10px] text-slate-500">Data tampil di dokumen cetak</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nama Instansi *</label>
                                    <input type="text" value={institutionData.hospitalName}
                                        onChange={(e) => setInstitutionData({ ...institutionData, hospitalName: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Contoh: RS Harapan Sehat" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Alamat</label>
                                    <input type="text" value={institutionData.address}
                                        onChange={(e) => setInstitutionData({ ...institutionData, address: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Alamat lengkap" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Telepon</label>
                                        <input type="text" value={institutionData.phone}
                                            onChange={(e) => setInstitutionData({ ...institutionData, phone: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="021-xxx" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                        <input type="email" value={institutionData.email}
                                            onChange={(e) => setInstitutionData({ ...institutionData, email: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="info@rs.com" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Check className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Konfirmasi Setup</h2>
                                    <p className="text-[10px] text-slate-500">Periksa data Anda</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-slate-500 mb-1">ADMINISTRATOR</p>
                                    <p className="text-xs text-slate-800 font-medium truncate">{adminData.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{adminData.email}</p>
                                    <p className="text-[10px] text-blue-600">Super Admin</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-slate-500 mb-1">INSTANSI</p>
                                    <p className="text-xs text-slate-800 font-medium truncate">{institutionData.hospitalName}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{institutionData.phone || '-'}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{institutionData.email || '-'}</p>
                                </div>
                            </div>
                            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2">
                                <p className="text-[10px] text-blue-700 text-center">
                                    ✨ Siap! Setelah selesai, Anda langsung masuk ke dashboard.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-3 bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-xs">
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-4">
                        {step > 1 && (
                            <button onClick={() => { setError(''); setStep(step - 1); }}
                                className="flex-1 px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                                <ChevronLeft size={16} /> Kembali
                            </button>
                        )}
                        {step < 3 ? (
                            <button onClick={handleNext}
                                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
                                Lanjut <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleComplete} disabled={isSubmitting}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Proses...</>
                                ) : (
                                    <><Check size={16} /> Selesai</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center text-slate-500 text-[10px] mt-3">MPIM v1.0.0</p>
            </div>
        </div>
    );
}
