import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ActivityLogger from './ActivityLogger';

// Helper to get institution profile
const getInstitutionProfile = () => {
    try {
        const saved = localStorage.getItem('mpim_instansi_profile');
        return saved ? JSON.parse(saved) : {
            name: 'RUMAH SAKIT UMUM DAERAH',
            address: 'Jl. Kesehatan No. 1, Kota Sehat, Indonesia',
            phone: '(021) 12345678',
            email: 'info@rsud.com',
            website: 'www.rsud.com'
        };
    } catch (e) {
        return {
            name: 'RUMAH SAKIT UMUM DAERAH',
            address: 'Jl. Kesehatan No. 1',
            phone: '-',
            email: '-'
        };
    }
};

/**
 * Generate Executive PDF Report
 */
export const generateExecutiveReport = (data) => {
    const {
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
    } = data;

    const profile = getInstitutionProfile();

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // === KOP SURAT (HEADER) ===
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(profile.name.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(profile.address, pageWidth / 2, 26, { align: 'center' });
        doc.text(`Telp: ${profile.phone} | Email: ${profile.email}`, pageWidth / 2, 31, { align: 'center' });

        // Garis Kop Surat
        doc.setLineWidth(1);
        doc.line(20, 36, pageWidth - 20, 36);
        doc.setLineWidth(0.5);
        doc.line(20, 37, pageWidth - 20, 37);

        // === JUDUL LAPORAN ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN EKSEKUTIF PELAYANAN INFORMASI MEDIS', pageWidth / 2, 50, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const startDate = new Date(dateRange.start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const endDate = new Date(dateRange.end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Periode Laporan: ${startDate} s/d ${endDate}`, pageWidth / 2, 58, { align: 'center' });

        // === RINGKASAN DATA (DETAIL UTAMA) ===
        const summaryY = 70;

        // Kotak Ringkasan
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(20, summaryY, pageWidth - 40, 45, 3, 3, 'FD');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('RINGKASAN KINERJA', 30, summaryY + 10);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Col 1
        doc.text('Total Permintaan', 30, summaryY + 20);
        doc.text(`: ${stats.total} Berkas`, 80, summaryY + 20);

        doc.text('Selesai Diproses', 30, summaryY + 28);
        doc.text(`: ${stats.selesai} (${completionRate}%)`, 80, summaryY + 28);

        doc.text('Sedang Berjalan', 30, summaryY + 36);
        doc.text(`: ${stats.proses + stats.pending} Berkas`, 80, summaryY + 36);

        // Col 2
        const col2X = 110;
        doc.text('Rata-rata Waktu Proses', col2X, summaryY + 20);
        doc.text(`: ${avgProcessingTime} Hari`, col2X + 50, summaryY + 20);

        doc.text('Kasus Alert / Prioritas', col2X, summaryY + 28);
        doc.text(`: ${alerts} Kasus`, col2X + 50, summaryY + 28);

        doc.text('Trend Volume', col2X, summaryY + 36);
        const trendSymbol = trends.total.isUp ? '(Naik)' : '(Turun)';
        doc.text(`: ${trends.total.value}% ${trendSymbol}`, col2X + 50, summaryY + 36);

        // === TABEL STATUS ===
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('A. Rincian Status Permintaan', 20, 130);

        const tableBody = [
            ['Status', 'Jumlah', 'Persentase', 'Keterangan Trend'],
            ['Pending (Menunggu)', stats.pending, ((stats.pending / stats.total) * 100 || 0).toFixed(1) + '%', `${trends.pending.isUp ? 'Naik' : 'Turun'} ${trends.pending.value}%`],
            ['Sedang Proses', stats.proses, ((stats.proses / stats.total) * 100 || 0).toFixed(1) + '%', `${trends.proses.isUp ? 'Naik' : 'Turun'} ${trends.proses.value}%`],
            ['Selesai', stats.selesai, ((stats.selesai / stats.total) * 100 || 0).toFixed(1) + '%', `${trends.selesai.isUp ? 'Naik' : 'Turun'} ${trends.selesai.value}%`],
            ['Sudah Diambil', stats.diambil, ((stats.diambil / stats.total) * 100 || 0).toFixed(1) + '%', '-'],
            ['Ditolak', stats.ditolak, ((stats.ditolak / stats.total) * 100 || 0).toFixed(1) + '%', '-'],
        ];

        autoTable(doc, {
            startY: 135,
            head: [tableBody[0]],
            body: tableBody.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 'auto' }
            }
        });

        // === TABEL ASURANSI TOP 5 ===
        const finalYFromStatus = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.text('B. Distribusi Asuransi/Jaminan (Top 5)', 20, finalYFromStatus);

        const insuranceBody = topInsurances.slice(0, 5).map((ins, idx) => [
            (idx + 1).toString(),
            ins.name,
            ins.count.toString(),
            `${ins.percentage}%`
        ]);

        autoTable(doc, {
            startY: finalYFromStatus + 5,
            head: [['No', 'Nama Penjamin', 'Jumlah Kasus', 'Persentase']],
            body: insuranceBody,
            theme: 'striped',
            headStyles: { fillColor: [52, 73, 94] },
            styles: { fontSize: 9 }
        });

        // === HALAMAN BARU: ANALISIS & REKOMENDASI ===
        doc.addPage();

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('C. Analisis & Rekomendasi Strategis', 20, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const recommendations = [];
        if (completionRate < 80) recommendations.push('Tingkatkan kecepatan penyelesaian berkas untuk mencapai target >80%.');
        if (alerts > 0) recommendations.push(`Segera tindak lanjuti ${alerts} kasus yang melebihi batas waktu (SLA).`);
        if (trends.total.isUp) recommendations.push('Antisipasi peningkatan beban kerja dengan optimalisasi SDM.');
        else recommendations.push('Volume permintaan menurun, lakukan evaluasi faktor eksternal.');
        recommendations.push(`Pertahankan kualitas layanan pada asuransi dominan: ${topInsurances[0]?.name || '-'}.`);

        let recY = 30;
        recommendations.forEach((rec, i) => {
            doc.text(`${i + 1}. ${rec}`, 25, recY);
            recY += 7;
        });

        // === KOLOM TANDA TANGAN ===
        const signY = 220; // Posisi tanda tangan di bawah halaman kedua
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        // Kanan: Pembuat Laporan
        doc.text(`Dicetak di: ${profile.address.split(',')[1] || 'Tempat'}, ${dateStr}`, pageWidth - 60, signY - 5, { align: 'center' });
        doc.text('Petugas Pelaporan', pageWidth - 60, signY + 5, { align: 'center' });
        doc.text('( ................................. )', pageWidth - 60, signY + 30, { align: 'center' });
        doc.text('NIP/NIK: .........................', pageWidth - 60, signY + 35, { align: 'center' });

        // Kiri: Mengetahui (Opsional)
        doc.text('Mengetahui,', 60, signY + 5, { align: 'center' });
        doc.text('Kepala Instalasi Rekam Medis', 60, signY + 10, { align: 'center' });
        doc.text('( ................................. )', 60, signY + 30, { align: 'center' });
        doc.text('NIP: .........................', 60, signY + 35, { align: 'center' });

        // Save PDF
        const fileName = `Laporan_Eksekutif_${new Date(dateRange.start).toLocaleDateString('id-ID').replace(/\//g, '-')}_sd_${new Date(dateRange.end).toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`;
        doc.save(fileName);

        ActivityLogger.log('EXPORT_PDF', {
            description: `Generated PDF Report for period ${startDate} - ${endDate}`,
            fileName
        });

        return true;

    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Gagal membuat PDF. Cek console untuk detail.');
    }
};

/**
 * Generate Excel Report
 */
export const generateExcelReport = (requests, dateRange) => {
    try {
        const wb = XLSX.utils.book_new();

        // 1. Sheet Utama: Data Mentah
        // Filter data sesuai range dulu jika belum difilter di luar, tapi asumsi 'requests' sudah raw data
        // Kita format date nya biar rapi
        const formattedData = requests.map(req => ({
            'ID Sistem': req.id,
            'No. RM': req.regNumber,
            'Nama Pasien': req.patientName,
            'Status': req.status,
            'Penjamin': req.insuranceName,
            'Dokter': req.doctorName,
            'Jenis Permintaan': req.type,
            'Tanggal Masuk': req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-',
            'Waktu Masuk': req.createdAt ? new Date(req.createdAt).toLocaleTimeString('id-ID') : '-',
            'Keterangan': req.notes || '-'
        }));

        const wsData = XLSX.utils.json_to_sheet(formattedData);
        XLSX.utils.book_append_sheet(wb, wsData, "Data Permintaan");

        // 2. Sheet Statistik
        // Kita hitung simple stats
        const statsData = [
            ['Statistik Periode', `${dateRange.start} s/d ${dateRange.end}`],
            ['', ''],
            ['Total Permintaan', requests.length],
            ['Selesai', requests.filter(r => r.status === 'Selesai').length],
            ['Pending', requests.filter(r => r.status === 'Pending').length],
            ['Proses', requests.filter(r => r.status === 'Proses').length],
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, "Ringkasan");

        // Save
        const fileName = `Export_Data_MPIM_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        ActivityLogger.log('EXPORT_EXCEL', {
            description: `Exported Excel Data (${formattedData.length} rows)`,
            fileName
        });

        return true;
    } catch (error) {
        console.error('Excel Generation Error:', error);
        alert('Gagal export Excel.');
    }
};
