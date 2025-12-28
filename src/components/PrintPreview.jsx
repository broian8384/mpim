import React from 'react';
import { X, Printer, User, FileText, Building2, Phone, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Helper: Format date as dd/mm/yyyy with leading zeros
const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function PrintPreview({ request, onClose }) {
    const handlePrint = () => {
        window.print();
    };

    if (!request) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:bg-white">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-w-full print:max-h-full print:rounded-none">
                {/* Header - Hide on print */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-3">
                        <Printer className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Preview Cetak Permintaan</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                        >
                            <Printer size={16} />
                            Cetak
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="flex-1 overflow-auto p-8 print:p-0">
                    <div className="max-w-3xl mx-auto bg-white print:bg-white" id="printable-content">
                        {/* Header */}
                        <div className="border-b-4 border-slate-900 pb-6 mb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">BUKTI PERMINTAAN</h1>
                                    <p className="text-slate-600 font-medium">Informasi Medis</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Dicetak: {new Date().toLocaleDateString('id-ID', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block mb-3">
                                        <p className="text-xs font-bold opacity-80">NO. PERMINTAAN</p>
                                        <p className="text-xl font-bold">{request.id || 'N/A'}</p>
                                    </div>
                                    {/* QR Code */}
                                    <div className="bg-white p-2 border-2 border-slate-900 rounded-lg inline-block">
                                        <QRCodeSVG
                                            value={`MPIM-${request.id || 'unknown'}-${request.medRecordNumber || 'N/A'}`}
                                            size={80}
                                            level="H"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Patient Information */}
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Data Pasien
                            </h2>
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">No. Rekam Medis</p>
                                    <p className="text-sm font-bold text-slate-900">{request.medRecordNumber || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nama Pasien</p>
                                    <p className="text-sm font-bold text-slate-900">{request.patientName || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Applicant Information */}
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Data Pemohon
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nama Pemohon</p>
                                    <p className="text-sm font-semibold text-slate-900">{request.applicantName || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Hubungan</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {request.isPatientApplicant ? 'Pasien Sendiri' : 'Keluarga/Pihak Lain'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Email
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">{request.email || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> WhatsApp
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">{request.whatsapp || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Request Details */}
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Detail Permintaan
                            </h2>
                            <div className="space-y-3">
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Jenis Layanan:</span>
                                    <span className="text-sm font-semibold text-slate-900">{request.serviceType || request.type || '-'}</span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Nama Asuransi:</span>
                                    <span className="text-sm font-semibold text-slate-900">{request.insuranceName || '-'}</span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Nama Dokter:</span>
                                    <span className="text-sm font-semibold text-slate-900">{request.doctorName || '-'}</span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Periode Berobat:</span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {formatDateDDMMYYYY(request.visitDateStart)}
                                        {' - '}
                                        {formatDateDDMMYYYY(request.visitDateEnd)}
                                    </span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Tanggal Pengajuan:</span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString('id-ID') : '-'}
                                    </span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-2">
                                    <span className="text-sm font-bold text-slate-600 w-48">Status Saat Ini:</span>
                                    <span className={`text-sm font-bold px-3 py-1 rounded-full inline-block ${request.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                                        request.status === 'Proses' ? 'bg-blue-100 text-blue-700' :
                                            request.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                request.status === 'Ditolak' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                        }`}>
                                        {request.status || 'Pending'}
                                    </span>
                                </div>
                                {request.notes && (
                                    <div className="pt-2">
                                        <span className="text-sm font-bold text-slate-600 block mb-2">Catatan/Keterangan:</span>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <p className="text-sm text-slate-700">{request.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Processing Info */}
                        {request.receiver && (
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5" />
                                    Informasi Pemrosesan
                                </h2>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Diterima Oleh</p>
                                    <p className="text-sm font-bold text-blue-900">{request.receiver}</p>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-8 pt-6 border-t-2 border-slate-200">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs text-slate-500 mb-8">Pemohon,</p>
                                    <div className="border-t border-slate-900 pt-2 mt-12">
                                        <p className="text-sm font-bold text-slate-900">{request.applicantName || '________________'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-8">Petugas,</p>
                                    <div className="border-t border-slate-900 pt-2 mt-12">
                                        <p className="text-sm font-bold text-slate-900">{request.receiver || '________________'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Footer Note */}
                        <div className="mt-6 text-center text-xs text-slate-400 italic">
                            <p>Dokumen ini dicetak dari MPIM System - Medical Portal Information Management</p>
                            <p className="mt-1">Scan QR Code untuk tracking dan verifikasi</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print-specific styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-content, #printable-content * {
                        visibility: visible;
                    }
                    #printable-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
            `}</style>
        </div>
    );
}
