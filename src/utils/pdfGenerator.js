import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ActivityLogger from './ActivityLogger';

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
        processedCount // optional, but good for details if needed
    } = data;

    try {
        const doc = new jsPDF();

        // Cover Page
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN EKSEKUTIF', 105, 50, { align: 'center' });

        doc.setFontSize(18);
        doc.text('Penerimaan Informasi Medis', 105, 65, { align: 'center' });

        // Period
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const startDate = new Date(dateRange.start).toLocaleDateString('id-ID');
        const endDate = new Date(dateRange.end).toLocaleDateString('id-ID');
        doc.text(`Periode: ${startDate} - ${endDate}`, 105, 80, { align: 'center' });

        // Generated date
        doc.setFontSize(10);
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 105, 90, { align: 'center' });

        // Summary Box
        doc.setFillColor(51, 65, 85);
        doc.rect(20, 110, 170, 60, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RINGKASAN EKSEKUTIF', 105, 125, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Pengajuan: ${stats.total}`, 30, 140);
        doc.text(`Selesai: ${stats.selesai} (${completionRate}%)`, 30, 150);
        doc.text(`Dalam Proses: ${stats.proses}`, 30, 160);

        doc.text(`Kasus Alert: ${alerts}`, 120, 140);
        doc.text(`Pending: ${stats.pending}`, 120, 150);
        doc.text(`Avg Processing: ${avgProcessingTime} hari`, 120, 160);

        // === PAGE 2: ANALISIS & INSIGHT ===
        doc.addPage();
        doc.setTextColor(0, 0, 0);

        // Executive Summary dengan Analisis
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('1. EXECUTIVE SUMMARY', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        let yPos = 30;

        // Generate smart analysis
        const completionText = completionRate >= 70 ? 'BAIK' : completionRate >= 50 ? 'CUKUP' : 'PERLU PENINGKATAN';
        const trendText = trends.total.isUp ? 'MENINGKAT' : 'MENURUN';
        const alertText = alerts > stats.total * 0.2 ? 'TINGGI dan memerlukan perhatian segera' : alerts > 0 ? 'MODERAT' : 'RENDAH';

        doc.text(`Dalam periode ${startDate} - ${endDate}, terdapat ${stats.total} pengajuan`, 14, yPos);
        yPos += 7;
        doc.text(`informasi medis. Tingkat penyelesaian ${completionRate}% dikategorikan ${completionText}.`, 14, yPos);
        yPos += 7;
        doc.text(`Volume pengajuan ${trendText} ${trends.total.value}% dibanding periode sebelumnya.`, 14, yPos);
        yPos += 7;
        doc.text(`Tingkat alert ${alertText} dengan ${alerts} kasus (${((alerts / stats.total) * 100).toFixed(1)}%).`, 14, yPos);

        yPos += 15;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('2. KEY INSIGHTS', 14, yPos);

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Insight 1: Performance
        doc.setFont('helvetica', 'bold');
        doc.text('a) Kinerja Operasional:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 7;
        doc.text(`   - Waktu proses rata-rata: ${avgProcessingTime} hari`, 14, yPos);
        yPos += 6;
        doc.text(`   - Waktu respon: ${avgResponseTime} hari`, 14, yPos);
        yPos += 6;
        const perfText = avgProcessingTime <= 3 ? 'Sangat Efisien' : avgProcessingTime <= 7 ? 'Efisien' : 'Perlu Optimasi';
        doc.text(`   - Evaluasi: ${perfText}`, 14, yPos);

        yPos += 10;
        // Insight 2: Top Performers
        doc.setFont('helvetica', 'bold');
        doc.text('b) Kontributor Utama:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 7;
        if (topDoctors.length > 0) {
            doc.text(`   - Dokter Terbanyak: ${topDoctors[0].name} (${topDoctors[0].count} kasus)`, 14, yPos);
            yPos += 6;
        }
        if (topInsurances.length > 0) {
            doc.text(`   - Asuransi Dominan: ${topInsurances[0].name} (${topInsurances[0].percentage}%)`, 14, yPos);
            yPos += 6;
        }

        yPos += 10;
        // Insight 3: Trend Analysis
        doc.setFont('helvetica', 'bold');
        doc.text('c) Analisis Trend:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 7;
        doc.text(`   - Total pengajuan: ${trends.total.isUp ? 'Naik' : 'Turun'} ${trends.total.value}%`, 14, yPos);
        yPos += 6;
        doc.text(`   - Kasus selesai: ${trends.selesai.isUp ? 'Naik' : 'Turun'} ${trends.selesai.value}%`, 14, yPos);
        yPos += 6;
        const trendEval = trends.total.isUp && trends.selesai.isUp ? 'Positif - Produktivitas meningkat' :
            trends.total.isUp && !trends.selesai.isUp ? 'Perhatian - Volume naik tapi penyelesaian stagnan' :
                'Stabil';
        doc.text(`   - Interpretasi: ${trendEval}`, 14, yPos);

        // === PAGE 3: REKOMENDASI ===
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('3. REKOMENDASI STRATEGIS', 14, 20);

        yPos = 30;
        doc.setFontSize(10);

        // Generate smart recommendations
        const recommendations = [];

        if (completionRate < 70) {
            recommendations.push('Tingkatkan efisiensi penyelesaian kasus menjadi minimal 70%');
        }
        if (avgProcessingTime > 7) {
            recommendations.push('Optimalkan waktu proses menjadi maksimal 7 hari');
        }
        if (alerts > stats.total * 0.1) {
            recommendations.push(`Prioritaskan ${alerts} kasus alert untuk mencegah eskalasi`);
        }
        if (stats.pending > stats.total * 0.3) {
            recommendations.push('Alokasi resource tambahan untuk handle backlog pending');
        }
        if (topDoctors.length > 0 && topDoctors[0].percentage > 30) {
            recommendations.push('Distribusi beban kerja lebih merata antar dokter');
        }
        if (trends.total.isUp && parseFloat(trends.total.value) > 20) {
            recommendations.push('Antisipasi lonjakan volume dengan penambahan kapasitas');
        }

        recommendations.forEach((rec, idx) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}.`, 14, yPos);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(rec, 170);
            doc.text(lines, 20, yPos);
            yPos += lines.length * 6 + 5;
        });

        // === PAGE 4: DATA TABLES ===
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('4. DATA DETAIL', 14, 20);

        // Status Distribution Table
        doc.setFontSize(12);
        doc.text('Distribusi Status', 14, 35);

        autoTable(doc, {
            startY: 40,
            head: [['Status', 'Jumlah', 'Persentase', 'Trend']],
            body: [
                ['Total', stats.total, '100%', `${trends.total.isUp ? 'Naik' : 'Turun'} ${trends.total.value}%`],
                ['Pending', stats.pending, `${((stats.pending / stats.total) * 100).toFixed(1)}%`, `${trends.pending.isUp ? 'Naik' : 'Turun'} ${trends.pending.value}%`],
                ['Proses', stats.proses, `${((stats.proses / stats.total) * 100).toFixed(1)}%`, `${trends.proses.isUp ? 'Naik' : 'Turun'} ${trends.proses.value}%`],
                ['Selesai', stats.selesai, `${((stats.selesai / stats.total) * 100).toFixed(1)}%`, `${trends.selesai.isUp ? 'Naik' : 'Turun'} ${trends.selesai.value}%`],
                ['Sudah Diambil', stats.diambil, `${((stats.diambil / stats.total) * 100).toFixed(1)}%`, '-'],
                ['Ditolak', stats.ditolak, `${((stats.ditolak / stats.total) * 100).toFixed(1)}%`, '-'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }
        });

        // Insurance Distribution
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Distribusi Asuransi', 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Rank', 'Nama Asuransi', 'Jumlah', 'Persentase']],
            body: topInsurances.map(item => [
                `#${item.rank}`,
                item.name,
                item.count,
                `${item.percentage}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }
        });

        // Save
        const fileName = `Laporan_Eksekutif_${startDate.replace(/\//g, '-')}_${endDate.replace(/\//g, '-')}.pdf`;
        doc.save(fileName);

        ActivityLogger.log('EXPORT', {
            module: 'Reports',
            description: `Exported executive report (${stats.total} requests)`,
            target: fileName
        });

        return true;
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
};
