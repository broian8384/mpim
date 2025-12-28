import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Activity, ArrowRight, Shield, Zap, Users, Eye, EyeOff, User } from 'lucide-react';
import ActivityLogger from '../utils/ActivityLogger';
import logo from '../assets/logo.svg';

// Helper check
const isElectron = () => window.api && window.api.auth;

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSetup, setIsCheckingSetup] = useState(true);
    const navigate = useNavigate();

    // Check if setup is complete
    useEffect(() => {
        const checkSetup = async () => {
            try {
                if (isElectron() && window.api.auth.checkSetup) {
                    const result = await window.api.auth.checkSetup();
                    if (!result.isSetupComplete) {
                        navigate('/setup');
                        return;
                    }
                } else {
                    // Web mode - check localStorage
                    const setupComplete = localStorage.getItem('mpim_setup_complete');
                    const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                    if (!setupComplete && users.length === 0) {
                        navigate('/setup');
                        return;
                    }
                }
            } catch (err) {
                console.error('Check setup error:', err);
            } finally {
                setIsCheckingSetup(false);
            }
        };
        checkSetup();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isElectron()) {
                const result = await window.api.auth.login({ loginIdentifier: email, password });
                if (result.success) {
                    localStorage.setItem('mpim_user', JSON.stringify(result.user));

                    // Log activity
                    ActivityLogger.log('LOGIN', {
                        module: 'Authentication',
                        description: `User ${result.user.name} logged in successfully`,
                        target: result.user.email
                    }, result.user);

                    navigate('/dashboard');
                } else {
                    setError(result.message);
                }
            } else {
                // Browser Fallback - Check against localStorage users
                const users = JSON.parse(localStorage.getItem('mpim_users') || '[]');
                const user = users.find(u =>
                    (u.email?.toLowerCase() === email.toLowerCase() ||
                        u.username?.toLowerCase() === email.toLowerCase()) &&
                    u.password === password
                );

                if (!email || !password) {
                    setError('Mohon isi email dan password');
                } else if (!user) {
                    setError('Email/Username atau Password salah');
                } else {
                    const { password: _, ...userSafe } = user;
                    localStorage.setItem('mpim_user', JSON.stringify(userSafe));

                    // Log activity
                    ActivityLogger.log('LOGIN', {
                        module: 'Authentication',
                        description: `User ${user.name} logged in successfully`,
                        target: user.email
                    }, userSafe);

                    navigate('/dashboard');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Terjadi kesalahan sistem');
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading while checking setup
    if (isCheckingSetup) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center relative z-10">
                {/* Left Side - Branding & Features */}
                <div className="hidden md:block text-white space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                                <Activity className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">MPIM</h1>
                                <p className="text-blue-200 text-sm">Medical Portal Information Management</p>
                            </div>
                        </div>

                        <h2 className="text-4xl font-bold leading-tight">
                            Kelola Penerimaan<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Informasi Medis</span><br />
                            dengan Mudah
                        </h2>
                        <p className="text-slate-300 text-lg">
                            Platform modern untuk mengelola dan melacak penerimaan informasi medis secara efisien dan aman.
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all group">
                            <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
                                <Shield className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-1">Keamanan Terjamin</h3>
                                <p className="text-sm text-slate-400">Data terenkripsi dan sistem akses terkontrol</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all group">
                            <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-all">
                                <Zap className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-1">Proses Cepat</h3>
                                <p className="text-sm text-slate-400">Tracking real-time dan notifikasi otomatis</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all group">
                            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all">
                                <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-1">Kolaborasi Tim</h3>
                                <p className="text-sm text-slate-400">Multi-user dengan role management</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200/50">
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl mb-4 shadow-xl shadow-slate-900/20">
                            <Activity className="w-9 h-9 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Selamat Datang</h2>
                        <p className="text-slate-500 mt-2">Silakan login untuk melanjutkan ke dashboard</p>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-red-600 text-xs font-bold">!</span>
                                </div>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Email / Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-medium bg-white transition-all hover:border-slate-400"
                                    placeholder="Username atau Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-medium bg-white transition-all hover:border-slate-400"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6 group shadow-slate-900/20 hover:shadow-slate-900/40"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <span>Masuk Dashboard</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-slate-100 pt-6">
                        <p className="text-xs text-slate-400 font-medium">
                            © 2025 MPIM | Medical Portal Information Management
                        </p>
                    </div>
                </div>

                {/* Mobile Logo - Show on small screens */}
                <div className="md:hidden text-center mb-8 text-white">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-bold tracking-tight">MPIM</h1>
                            <p className="text-blue-200 text-xs">Medical Portal Information Management</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
