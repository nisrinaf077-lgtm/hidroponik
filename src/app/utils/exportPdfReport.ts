import { jsPDF } from 'jspdf';
import headerPdfUrl from '@/imports/Header_pdf.png';
import type { LiveSensorState, SensorLogEntry, SetPoints } from '../context/SystemContext';

interface PdfReportParams {
  sensorData: LiveSensorState;
  sensorLogs: SensorLogEntry[];
  setPoints: SetPoints;
  autoDosingEnabled: boolean;
  connectionMode: 'simulation' | 'wifi';
  deviceIpUrl: string;
  sessionDate?: string;
}

function calcStats(values: number[], decimals: number) {
  if (values.length === 0) return { min: '—', avg: '—', max: '—', last: '—' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const last = values[values.length - 1];
  return {
    min: min.toFixed(decimals),
    avg: avg.toFixed(decimals),
    max: max.toFixed(decimals),
    last: last.toFixed(decimals),
  };
}

function loadHeaderAsDataUrl(src: string): Promise<{ dataUrl: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetW = 2480;
      const aspect = img.naturalHeight / img.naturalWidth;
      const targetH = Math.round(targetW * aspect);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve({ dataUrl: canvas.toDataURL('image/png'), aspect });
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawVectorChart(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    unit: string;
    values: number[];
    timestamps: string[];
    yMin: number;
    yMax: number;
    spMin?: number;
    spMax?: number;
    lineColor: [number, number, number];
    decimals: number;
    legendText: string;
  }
) {
  const { x, y, w, h, title, unit, values, timestamps, yMin, yMax, spMin, spMax, lineColor, decimals, legendText } = opts;

  // Card container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(52, 92, 86);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');

  // Header strip
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x + 0.4, y + 0.4, w - 0.8, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(52, 92, 86);
  doc.text(title, x + 3, y + 4.7);

  const latestVal = values.length > 0 ? values[values.length - 1].toFixed(decimals) : '—';
  doc.setTextColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.text(`${latestVal} ${unit}`, x + w - 3, y + 4.7, { align: 'right' });

  // Plot area
  const px = x + 11;
  const py = y + 9.5;
  const pw = w - 14.5;
  const ph = h - 15.5;

  const toY = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v));
    return py + ph - ((clamped - yMin) / (yMax - yMin || 1)) * ph;
  };

  // Optional Set point shaded band
  if (typeof spMin === 'number' && typeof spMax === 'number') {
    const spTopY = toY(spMax);
    const spBotY = toY(spMin);
    doc.setFillColor(236, 253, 245);
    doc.rect(px, spTopY, pw, Math.max(1, spBotY - spTopY), 'F');
  }

  // Horizontal grid + Y labels
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(113, 113, 122);

  [yMin, (yMin + yMax) / 2, yMax].forEach((tick) => {
    const ty = toY(tick);
    doc.line(px, ty, px + pw, ty);
    doc.text(tick.toFixed(decimals === 2 ? 1 : 0), px - 1.5, ty + 1, { align: 'right' });
  });

  // Set-point dashed lines
  if (typeof spMin === 'number' && typeof spMax === 'number') {
    const spTopY = toY(spMax);
    const spBotY = toY(spMin);
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(px, spTopY, px + pw, spTopY);
    doc.line(px, spBotY, px + pw, spBotY);
    doc.setLineDashPattern([], 0);
  }

  // Series line
  const pts = values.length > 1 ? values : [values[0] ?? (yMin + yMax) / 2, values[0] ?? (yMin + yMax) / 2];
  doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.setLineWidth(0.65);

  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = px + (i / (pts.length - 1)) * pw;
    const y1 = toY(pts[i]);
    const x2 = px + ((i + 1) / (pts.length - 1)) * pw;
    const y2 = toY(pts[i + 1]);
    doc.line(x1, y1, x2, y2);
  }

  // Last point dot
  const lastX = px + pw;
  const lastY = toY(pts[pts.length - 1]);
  doc.setFillColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.circle(lastX, lastY, 1.0, 'F');

  // X-axis timestamps & legend
  doc.setFontSize(5.8);
  doc.setTextColor(161, 161, 170);
  const tStart = timestamps[0] ? String(timestamps[0]).slice(0, 5) : '00:00';
  const tEnd = timestamps[timestamps.length - 1] ? String(timestamps[timestamps.length - 1]).slice(0, 5) : 'Sekarang';
  doc.text(tStart, px, py + ph + 3.5);
  doc.text(legendText, px + pw / 2, py + ph + 3.5, { align: 'center' });
  doc.text(tEnd, px + pw, py + ph + 3.5, { align: 'right' });
}

export async function exportHydroponicPdf({
  sensorData,
  sensorLogs,
  setPoints,
  autoDosingEnabled,
  connectionMode,
  deviceIpUrl,
  sessionDate,
}: PdfReportParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentW = pageW - margin * 2;

  const now = new Date();
  const dateStr = sessionDate || now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
  const sessionId = `HYD-PAKCOY-${dateStr.replace(/-/g, '')}`;

  // ==========================================
  // 1. CUSTOM HEADER BANNER (Header_pdf.png)
  // ==========================================
  let headerH = 34;
  try {
    const { dataUrl, aspect } = await loadHeaderAsDataUrl(headerPdfUrl);
    headerH = pageW * aspect;
    doc.addImage(dataUrl, 'PNG', 0, 0, pageW, headerH);

    // Replace baked-in date (25/11/2026) with dynamic recording date (DD/MM/YYYY)
    const [yyyy, mm, dd] = dateStr.split('-');
    const displayDate = yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : dateStr;
    doc.setFillColor(51, 92, 87);
    doc.rect(pageW - 52, headerH * 0.31, 44, headerH * 0.24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(displayDate, pageW - 11.2, headerH * 0.49, { align: 'right' });
  } catch {
    doc.setFillColor(52, 92, 86);
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SMART HYDROPONIC', margin, 18);
  }

  // Meta bar
  let y = headerH + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(`Tanggal Rekaman: ${dateStr}  •  ID Sesi: ${sessionId}`, margin, y);
  doc.text(`Diterbitkan: ${dateStr} ${timeStr}`, pageW - margin, y, { align: 'right' });

  // ==========================================
  // 2. KPI SUMMARY BENTO CARDS (5 CARDS)
  // ==========================================
  y += 4;
  const cardGap = 3;
  const cardW = (contentW - cardGap * 4) / 5;
  const cardH = 20;
  const litersNow = ((sensorData.waterLevel / 100) * 30).toFixed(1);

  const phOk = sensorData.ph >= setPoints.phMin && sensorData.ph <= setPoints.phMax;
  const tdsOk = sensorData.tds >= setPoints.tdsMin && sensorData.tds <= setPoints.tdsMax;
  const lvlOk = (sensorData.waterLevel / 100) * 30 >= setPoints.waterRefillLiters;

  const kpis = [
    { label: 'KADAR PH', val: sensorData.ph.toFixed(2), unit: 'pH', ok: phOk },
    { label: 'NUTRISI TDS', val: String(Math.round(sensorData.tds)), unit: 'ppm', ok: tdsOk },
    { label: 'SUHU AIR', val: sensorData.reservoirTemp.toFixed(1), unit: '°C', ok: true },
    { label: 'KELEMBAPAN', val: String(Math.round(sensorData.humidity)), unit: '%', ok: true },
    { label: 'LEVEL AIR', val: litersNow, unit: 'L', ok: lvlOk },
  ];

  kpis.forEach((k, i) => {
    const cx = margin + i * (cardW + cardGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(52, 92, 86);
    doc.setLineWidth(0.35);
    doc.roundedRect(cx, y, cardW, cardH, 2.5, 2.5, 'FD');

    doc.setFillColor(k.ok ? 236 : 253, k.ok ? 253 : 242, k.ok ? 245 : 244);
    doc.roundedRect(cx + 0.4, y + 0.4, cardW - 0.8, 5.5, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(52, 92, 86);
    doc.text(k.label, cx + 2.5, y + 4.1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(24, 24, 27);
    doc.text(k.val, cx + 2.5, y + 13);

    const valW = doc.getTextWidth(k.val);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(k.unit, cx + 3.5 + valW, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(k.ok ? 4 : 143, k.ok ? 120 : 45, k.ok ? 87 : 74);
    doc.text(k.ok ? '● Optimal' : '● Penyesuaian', cx + 2.5, y + 17.8);
  });

  // ==========================================
  // 3. METADATA SISTEM & ACUAN SET POINT
  // ==========================================
  y += cardH + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(52, 92, 86);
  doc.text('1 - METADATA SISTEM & ACUAN SET POINT', margin, y);

  y += 2;
  const metaBoxH = 22;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, metaBoxH, 2.5, 2.5, 'FD');

  doc.setFillColor(52, 92, 86);
  doc.rect(margin, y, 1.5, metaBoxH, 'F');

  const metaRows: Array<[string, string, string, string]> = [
    ['Tanaman', 'Pakcoy (Sistem NFT)', 'Mode Kontrol', autoDosingEnabled ? 'Otomatis (Set Point)' : 'Manual'],
    [
      'Sumber Data',
      connectionMode === 'wifi' ? `WiFi Lokal (${deviceIpUrl})` : 'Simulasi Lokal',
      'Total Sampel',
      `${sensorLogs.length || 1} pembacaan`,
    ],
    [
      'Set Point pH',
      `${setPoints.phMin.toFixed(2)} - ${setPoints.phMax.toFixed(2)} pH`,
      'Set Point TDS',
      `${setPoints.tdsMin} - ${setPoints.tdsMax} ppm`,
    ],
    [
      'Set Point Air',
      `Isi ulang < ${setPoints.waterRefillLiters} L (penuh ${setPoints.waterFullLiters} L)`,
      'Sirkulasi NFT',
      sensorData.waterFlow ? 'Mengalir (Normal)' : 'Tidak Mengalir',
    ],
  ];

  let my = y + 5;
  const col1X = margin + 4.5;
  const val1X = margin + 32;
  const col2X = margin + contentW / 2 + 4;
  const val2X = col2X + 29;

  doc.setFontSize(7.8);
  metaRows.forEach(([k1, v1, k2, v2]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text(k1, col1X, my);
    doc.text(k2, col2X, my);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(v1, val1X, my);
    doc.text(v2, val2X, my);
    my += 4.9;
  });

  // ==========================================
  // 4. GRAFIK TREN SENSOR (4 GRAFIK: 2x2)
  // ==========================================
  const logsForStats =
    sensorLogs.length > 0
      ? sensorLogs
      : [
          {
            timestamp: timeStr,
            ph: sensorData.ph.toFixed(2),
            tds: Math.round(sensorData.tds),
            reservoirTemp: sensorData.reservoirTemp.toFixed(1),
            humidity: sensorData.humidity.toFixed(1),
            waterLevel: Math.round(sensorData.waterLevel),
            waterDistance: sensorData.waterDistance.toFixed(1),
            waterFlow: sensorData.waterFlow ? 'Mengalir' : 'Tidak Mengalir',
            pumpStatus: 'SIAGA',
          },
        ];

  y += metaBoxH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(52, 92, 86);
  doc.text('2 - GRAFIK TREN SENSOR HARIAN', margin, y);
  y += 2.5;

  const chartSlice = logsForStats.slice(-30);
  const chartW = (contentW - 4) / 2;
  const chartH = 35;

  drawVectorChart(doc, {
    x: margin,
    y,
    w: chartW,
    h: chartH,
    title: 'GRAFIK KADAR PH',
    unit: 'pH',
    values: chartSlice.map((l) => parseFloat(l.ph)),
    timestamps: chartSlice.map((l) => l.timestamp),
    yMin: 5.0,
    yMax: 8.0,
    spMin: setPoints.phMin,
    spMax: setPoints.phMax,
    lineColor: [5, 150, 105],
    decimals: 2,
    legendText: `Set Point: ${setPoints.phMin.toFixed(1)}–${setPoints.phMax.toFixed(1)} pH`,
  });

  drawVectorChart(doc, {
    x: margin + chartW + 4,
    y,
    w: chartW,
    h: chartH,
    title: 'GRAFIK NUTRISI (TDS)',
    unit: 'ppm',
    values: chartSlice.map((l) => l.tds),
    timestamps: chartSlice.map((l) => l.timestamp),
    yMin: 600,
    yMax: 1600,
    spMin: setPoints.tdsMin,
    spMax: setPoints.tdsMax,
    lineColor: [143, 45, 74],
    decimals: 0,
    legendText: `Set Point: ${setPoints.tdsMin}–${setPoints.tdsMax} ppm`,
  });

  y += chartH + 3.5;

  drawVectorChart(doc, {
    x: margin,
    y,
    w: chartW,
    h: chartH,
    title: 'GRAFIK SUHU AIR',
    unit: '°C',
    values: chartSlice.map((l) => parseFloat(l.reservoirTemp)),
    timestamps: chartSlice.map((l) => l.timestamp),
    yMin: 15,
    yMax: 30,
    spMin: 18,
    spMax: 25,
    lineColor: [52, 92, 86],
    decimals: 1,
    legendText: 'Rentang Ideal: 18–25 °C',
  });

  drawVectorChart(doc, {
    x: margin + chartW + 4,
    y,
    w: chartW,
    h: chartH,
    title: 'GRAFIK LEVEL AIR RESERVOIR',
    unit: 'L',
    values: chartSlice.map((l) => (l.waterLevel / 100) * 30),
    timestamps: chartSlice.map((l) => l.timestamp),
    yMin: 0,
    yMax: 30,
    spMin: setPoints.waterRefillLiters,
    spMax: setPoints.waterFullLiters,
    lineColor: [5, 150, 105],
    decimals: 1,
    legendText: `Isi ulang < ${setPoints.waterRefillLiters} L • Penuh ${setPoints.waterFullLiters} L`,
  });

  // ==========================================
  // 5. STATISTIK SENSOR HIDROPONIK
  // ==========================================
  y += chartH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(52, 92, 86);
  doc.text('3 - STATISTIK SENSOR HIDROPONIK', margin, y);
  y += 2;

  const phStats = calcStats(logsForStats.map((l) => parseFloat(l.ph)), 2);
  const tdsStats = calcStats(logsForStats.map((l) => l.tds), 0);
  const tempStats = calcStats(logsForStats.map((l) => parseFloat(l.reservoirTemp)), 1);
  const humStats = calcStats(logsForStats.map((l) => parseFloat(l.humidity)), 1);
  const lvlStats = calcStats(logsForStats.map((l) => l.waterLevel), 0);

  const statRows = [
    ['Kadar pH (pH)', phStats.min, phStats.avg, phStats.max, phStats.last, phOk ? 'Optimal' : 'Penyesuaian'],
    ['Nutrisi TDS (ppm)', tdsStats.min, tdsStats.avg, tdsStats.max, tdsStats.last, tdsOk ? 'Optimal' : 'Penyesuaian'],
    ['Suhu Air (°C)', tempStats.min, tempStats.avg, tempStats.max, tempStats.last, 'Optimal'],
    ['Kelembapan (%)', humStats.min, humStats.avg, humStats.max, humStats.last, 'Optimal'],
    ['Level Air (%)', lvlStats.min, lvlStats.avg, lvlStats.max, lvlStats.last, lvlOk ? 'Optimal' : 'Isi Ulang'],
  ];

  doc.setFillColor(52, 92, 86);
  doc.roundedRect(margin, y, contentW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const sCols = [margin + 3, margin + 56, margin + 82, margin + 108, margin + 134, margin + 158];
  doc.text('Parameter Sensor', sCols[0], y + 4.4);
  doc.text('Min', sCols[1], y + 4.4);
  doc.text('Rata-rata', sCols[2], y + 4.4);
  doc.text('Maks', sCols[3], y + 4.4);
  doc.text('Terakhir', sCols[4], y + 4.4);
  doc.text('Status', sCols[5], y + 4.4);
  y += 6.5;

  statRows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 249);
      doc.rect(margin, y, contentW, 5.6, 'F');
    }
    doc.setDrawColor(228, 228, 231);
    doc.line(margin, y + 5.6, pageW - margin, y + 5.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(24, 24, 27);
    doc.text(row[0], sCols[0], y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(row[1], sCols[1], y + 4);
    doc.text(row[2], sCols[2], y + 4);
    doc.text(row[3], sCols[3], y + 4);
    doc.text(row[4], sCols[4], y + 4);

    const isRowOk = row[5] === 'Optimal';
    doc.setFillColor(isRowOk ? 236 : 253, isRowOk ? 253 : 242, isRowOk ? 245 : 244);
    doc.roundedRect(sCols[5] - 1.5, y + 0.8, 22, 4, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(isRowOk ? 4 : 143, isRowOk ? 120 : 45, isRowOk ? 87 : 74);
    doc.text(row[5], sCols[5] + 9.5, y + 3.7, { align: 'center' });
    y += 5.6;
  });

  // ==========================================
  // 6. RIWAYAT PEMBACAAN SENSOR (HALAMAN 2 JIKA PENUH)
  // ==========================================
  if (y + 30 > pageH - 14) {
    // Footer Page 1
    const f1 = pageH - 9;
    doc.setDrawColor(52, 92, 86);
    doc.setLineWidth(0.3);
    doc.line(margin, f1 - 3.5, pageW - margin, f1 - 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(113, 113, 122);
    doc.text('SMART HYDROPONIC • Laporan harian otomatis sistem hidroponik Pakcoy (Lokal WiFi).', margin, f1);
    doc.setFont('helvetica', 'bold');
    doc.text('Halaman 1 / 2', pageW - margin, f1, { align: 'right' });

    doc.addPage();
    y = 16;
  } else {
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(52, 92, 86);
  doc.text('4 - RIWAYAT PEMBACAAN SENSOR HARIAN (20 TERAKHIR)', margin, y);
  y += 2.5;

  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(52, 92, 86);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 6.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(52, 92, 86);

  const hCols = [margin + 2.5, margin + 23, margin + 39, margin + 59, margin + 77, margin + 96, margin + 114, margin + 140];
  doc.text('Waktu', hCols[0], y + 4.5);
  doc.text('pH', hCols[1], y + 4.5);
  doc.text('TDS', hCols[2], y + 4.5);
  doc.text('Suhu', hCols[3], y + 4.5);
  doc.text('Lembap', hCols[4], y + 4.5);
  doc.text('Level', hCols[5], y + 4.5);
  doc.text('Aliran', hCols[6], y + 4.5);
  doc.text('Pompa', hCols[7], y + 4.5);
  y += 6.5;

  const recentLogs = [...logsForStats].reverse().slice(0, 20);
  recentLogs.forEach((r, idx) => {
    if (y > pageH - 18) return;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 249);
      doc.rect(margin, y, contentW, 5.5, 'F');
    }
    doc.setDrawColor(235, 235, 238);
    doc.line(margin, y + 5.5, pageW - margin, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(24, 24, 27);
    doc.text(String(r.timestamp).slice(0, 8), hCols[0], y + 3.9);
    doc.text(String(r.ph), hCols[1], y + 3.9);
    doc.text(`${r.tds} ppm`, hCols[2], y + 3.9);
    doc.text(`${r.reservoirTemp} °C`, hCols[3], y + 3.9);
    doc.text(`${r.humidity}%`, hCols[4], y + 3.9);
    doc.text(`${r.waterLevel}%`, hCols[5], y + 3.9);

    const flowOk = r.waterFlow === 'Mengalir';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(flowOk ? 4 : 143, flowOk ? 120 : 45, flowOk ? 87 : 74);
    doc.text(String(r.waterFlow), hCols[6], y + 3.9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);
    doc.text(String(r.pumpStatus).slice(0, 22), hCols[7], y + 3.9);
    y += 5.5;
  });

  // ==========================================
  // 7. FOOTER (LAST PAGE)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  const footerY = pageH - 9;
  doc.setDrawColor(52, 92, 86);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3.5, pageW - margin, footerY - 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(113, 113, 122);
  doc.text(
    'SMART HYDROPONIC • Laporan harian otomatis sistem hidroponik Pakcoy (Lokal WiFi).',
    margin,
    footerY
  );
  doc.setFont('helvetica', 'bold');
  doc.text(`Halaman ${totalPages} / ${totalPages}`, pageW - margin, footerY, { align: 'right' });

  doc.save(`${sessionId}.pdf`);
}
