import React from 'react';
import { Activity, X, MessageCircle, Heart, ShieldCheck } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const handleContactSupport = () => {
        // Open WhatsApp link
        window.open('https://wa.me/6285172231283?text=Halo%20Support%20MPIM,%20saya%20butuh%20bantuan%20terkait%20aplikasi.', '_blank');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-32 bg-slate-900 z-0"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10 z-0 pointer-events-none">
                    <Activity size={120} className="text-white" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all cursor-pointer shadow-sm border border-white/10"
                >
                    <X size={18} />
                </button>

                <div className="relative z-10 pt-10 px-6 pb-6 text-center">
                    {/* Logo Avatar */}
                    <div className="w-20 h-20 bg-white p-1 rounded-2xl shadow-xl mx-auto mb-4 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
                        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Activity size={36} />
                        </div>
                    </div>

                    {/* App Info */}
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">MPIM</h2>
                    <p className="text-sm font-semibold text-slate-600 mb-6 uppercase tracking-wider">Medical Portal Information Management</p>

                    <div className="space-y-4 mb-8">
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Platform modern untuk mengelola dan melacak penerimaan informasi medis secara efisien dan aman.
                        </p>

                        <div className="flex justify-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 px-3 py-1 bg-slate-50 rounded-full border border-slate-100"><ShieldCheck size={12} className="text-emerald-500" /> Secure</span>
                            <span className="flex items-center gap-1 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">v1.0.0 (Stable)</span>
                        </div>
                    </div>

                    {/* Contact Support Button - WhatsApp */}
                    <button
                        onClick={handleContactSupport}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 active:scale-95 transition-all flex items-center justify-center gap-2 group mb-6"
                    >
                        <MessageCircle className="w-5 h-5 group-hover:animate-bounce" />
                        Hubungi Support (WhatsApp)
                    </button>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                            Dibuat dengan <Heart size={10} className="text-red-500 fill-red-500" /> Bro Ian
                        </p>
                        <p className="text-[10px] text-slate-300 mt-1">© 2025 MPIM. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
