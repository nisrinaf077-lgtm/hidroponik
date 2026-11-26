import { useState } from 'react';
import { SensorCard } from './SensorCard';
import { useSystem } from '../context/SystemContext';
import {
  Thermometer,
  Droplets,
  Activity,
  Waves,
  Gauge,
  FlaskConical,
  Droplet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  FileSpreadsheet,
  MessageCircle,
  RotateCcw,
  FileJson,
  FileText,
  Calendar,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { exportHydroponicPdf } from '../utils/exportPdfReport';

// Generate mock chart data
const generateChartData = (baseValue: number, variance: number, points: number = 24) => {
  return Array.from({ length: points }, () => ({
    value: baseValue + (Math.random() - 0.5) * variance
  }));
};

export function DashboardOverview() {
  const {
    whatsappNumber,
    availableDates,
    selectedDate,
    setSelectedDate,
    selectedDayLogs,
    sensorData,
    pumps,
    autoDosingEnabled,
    setPoints,
    connectionMode,
    deviceIpUrl,
    simulateCondition,
    exportToSpreadsheet,
    sendWhatsAppMessage,
  } = useSystem();

  const [chartHistory] = useState(() => ({
    ph: generateChartData(6.5, 0.25),
    tds: generateChartData(1150, 70),
    reservoirTemp: generateChartData(22.1, 1.0),
    humidity: generateChartData(68, 4),
    waterLevel: generateChartData(17.2, 1.5),
  }));

  const getPhStatus = () => {
    if (sensorData.ph < 5.5 || sensorData.ph > 7.5) return 'critical';
    if (sensorData.ph < setPoints.phMin || sensorData.ph > setPoints.phMax) return 'warning';
    return 'normal';
  };

  const getTdsStatus = () => {
    if (sensorData.tds < 600 || sensorData.tds > 1600) return 'critical';
    if (sensorData.tds < setPoints.tdsMin || sensorData.tds > setPoints.tdsMax) return 'warning';
    return 'normal';
  };

  const getReservoirTempStatus = () => {
    if (sensorData.reservoirTemp < 15 || sensorData.reservoirTemp > 28) return 'critical';
    if (sensorData.reservoirTemp < 18 || sensorData.reservoirTemp > 25) return 'warning';
    return 'normal';
  };

  const getHumidityStatus = () => {
    if (sensorData.humidity < 35 || sensorData.humidity > 85) return 'critical';
    if (sensorData.humidity < 45 || sensorData.humidity > 75) return 'warning';
    return 'normal';
  };

  const getWaterLevelStatus = () => {
    const liters = (sensorData.waterLevel / 100) * 30;
    if (liters < 6) return 'critical';
    if (liters < setPoints.waterRefillLiters) return 'warning';
    return 'normal';
  };

  const reservoirLiters = ((sensorData.waterLevel / 100) * 30).toFixed(1).replace('.', ',');
  const anyDosingActive = pumps.nutrientA || pumps.nutrientB || pumps.phDown || pumps.phUp;
  const rawWaterActive = pumps.rawWater || (sensorData.waterLevel / 100) * 30 < setPoints.waterRefillLiters || sensorData.tds > setPoints.tdsMax;

  const pumpTiles = [
    {
      key: 'nutrientAB',
      label: 'Pompa Nutrisi A+B',
      sub: `Aktif jika TDS < ${setPoints.tdsMin}`,
      icon: FlaskConical,
      active: pumps.nutrientA || pumps.nutrientB,
    },
    {
      key: 'phDown',
      label: 'Pompa pH Down',
      sub: `Aktif jika pH > ${setPoints.phMax.toFixed(2).replace('.', ',')}`,
      icon: ArrowDownCircle,
      active: pumps.phDown,
    },
    {
      key: 'phUp',
      label: 'Pompa pH Up',
      sub: `Aktif jika pH < ${setPoints.phMin.toFixed(2).replace('.', ',')}`,
      icon: ArrowUpCircle,
      active: pumps.phUp,
    },
    {
      key: 'rawWater',
      label: 'Pompa Air Baku',
      sub: `Isi ulang < ${setPoints.waterRefillLiters} L; dilusi TDS > ${setPoints.tdsMax}`,
      icon: Droplet,
      active: rawWaterActive,
    },
    {
      key: 'mixer',
      label: 'Pengaduk',
      sub: 'Saat dosing & isi ulang',
      icon: RefreshCw,
      active: pumps.mixer || anyDosingActive || rawWaterActive,
    },
    {
      key: 'nft',
      label: 'Pompa NFT',
      sub: 'Sirkulasi nonstop',
      icon: Waves,
      active: pumps.nft && sensorData.waterFlow,
    },
  ];

  const handleExportJson = () => {
    const dataStr = JSON.stringify(selectedDayLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pakcoy-hydroponics-${selectedDate}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    exportHydroponicPdf({
      sensorData,
      sensorLogs: selectedDayLogs,
      setPoints,
      autoDosingEnabled,
      connectionMode,
      deviceIpUrl,
      sessionDate: selectedDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-6 rounded-[24px] border-2 border-[#345C56] bg-gradient-to-r from-[#345C56] via-[#8F2D4A] to-[#345C56] text-white shadow-[0_4px_4px_rgba(0,0,0,0.16)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="font-['Bricolage_Grotesque'] text-[24px] leading-[30px] font-bold tracking-[-0.4px] text-white">
            Ringkasan Pakcoy
          </h2>
          <p className="text-[14px] leading-[20px] font-semibold text-[#D1FAE5]">
            Data terakhir 3 dtk lalu • Perangkat online
          </p>
        </div>
      </div>

      {/* Environmental Sensors Grid (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SensorCard
          title="KADAR PH"
          value={sensorData.ph.toFixed(2).replace('.', ',')}
          unit="pH"
          subtitle="Sensor diangkat • ukur 42 dtk lalu"
          icon={FlaskConical}
          status={getPhStatus()}
          chartData={chartHistory.ph}
        />

        <SensorCard
          title="NUTRISI (TDS)"
          value={Math.round(sensorData.tds)}
          unit="PPM"
          icon={Activity}
          status={getTdsStatus()}
          chartData={chartHistory.tds}
        />

        <SensorCard
          title="SUHU AIR"
          value={sensorData.reservoirTemp.toFixed(1).replace('.', ',')}
          unit="°C"
          icon={Thermometer}
          status={getReservoirTempStatus()}
          chartData={chartHistory.reservoirTemp}
        />

        <SensorCard
          title="KELEMBAPAN UDARA"
          value={Math.round(sensorData.humidity)}
          unit="%"
          subtitle="Suhu udara 27,3 °C"
          icon={Droplets}
          status={getHumidityStatus()}
          chartData={chartHistory.humidity}
        />
      </div>

      {/* Row 2: Level Air Reservoir + Sirkulasi NFT & Status Pompa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SensorCard
          title="LEVEL AIR RESERVOIR"
          value={reservoirLiters}
          unit="L"
          subtitle={`${Math.round(sensorData.waterLevel)} % dari 30 L • isi ulang < ${setPoints.waterRefillLiters} L, berhenti ${setPoints.waterFullLiters} L`}
          icon={Gauge}
          status={getWaterLevelStatus()}
          chartData={chartHistory.waterLevel}
        />

        <div className="flex flex-col gap-5 justify-between">
          {/* Sirkulasi NFT Card */}
          <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)] flex-1 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#71717A]">
                  SIRKULASI NFT
                </p>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      sensorData.waterFlow ? 'bg-[#059669] animate-pulse' : 'bg-[#8F2D4A]'
                    }`}
                  />
                  <span
                    className={`text-[30px] leading-[36px] font-bold tracking-[-0.6px] ${
                      sensorData.waterFlow ? 'text-[#059669]' : 'text-[#8F2D4A]'
                    }`}
                  >
                    {sensorData.waterFlow ? 'Mengalir' : 'Tidak Mengalir'}
                  </span>
                </div>
              </div>
              <div
                className={`p-2.5 rounded-[16px] border ${
                  sensorData.waterFlow
                    ? 'text-[#059669] bg-[#ECFDF5] border-[#D1FAE5]'
                    : 'text-[#8F2D4A] bg-[#FDF2F4] border-[#8F2D4A]/40'
                }`}
              >
                <Waves className="w-6 h-6" />
              </div>
            </div>
            {!sensorData.waterFlow && Object.values(pumps).some(Boolean) && (
              <div className="mt-4 p-3 bg-[#FDF2F4] border border-[#8F2D4A]/40 rounded-2xl">
                <p className="text-xs text-[#8F2D4A] font-medium">
                  Peringatan: Pompa aktif namun aliran air tidak terdeteksi!
                </p>
              </div>
            )}
          </Card>

          {/* Status Pompa & Aktuator Card */}
          <Card className="px-6 py-7 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[18px] leading-[24px] font-bold tracking-[-0.2px] text-[#18181B]">
                Status Pompa &amp; Aktuator
              </h3>
              <span
                className={`px-3 py-1 rounded-full border text-[12px] font-semibold ${
                  autoDosingEnabled
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                    : 'bg-[#FDF2F4] border-[#8F2D4A]/40 text-[#8F2D4A]'
                }`}
              >
                {autoDosingEnabled
                  ? anyDosingActive
                    ? 'Mode Otomatis • dosing aktif'
                    : 'Mode Otomatis • dosing siaga'
                  : 'Mode Manual • kontrol langsung'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Pump Grid (6 tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {pumpTiles.map((pump) => {
          const Icon = pump.icon;
          return (
            <Card
              key={pump.key}
              className="p-4 bg-white rounded-[24px] border border-[#345C56] shadow-[0_4px_2px_rgba(0,0,0,0.08)] flex items-start justify-between gap-3"
            >
              <div className="flex flex-col items-start gap-1 min-w-0">
                <p className="text-[14px] leading-[20px] font-semibold text-[#18181B]">
                  {pump.label}
                </p>
                <p className="text-[12px] leading-[16px] text-[#A1A1AA] mb-1.5">
                  {pump.sub}
                </p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full border text-[12px] font-semibold ${
                    pump.active
                      ? 'bg-[#059669] border-[#059669] text-white'
                      : 'bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]'
                  }`}
                >
                  {pump.active ? 'AKTIF' : 'SIAGA'}
                </span>
              </div>
              <div
                className={`p-2.5 rounded-[16px] border shrink-0 ${
                  pump.active
                    ? 'text-[#059669] bg-[#ECFDF5] border-[#D1FAE5]'
                    : 'text-[#71717A] bg-[#FAFAFA] border-[#E4E4E7]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Data Logging & Export (SPS & Email) */}
      <Card className="p-5 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-[#18181B]">Sinkronisasi SPS &amp; WhatsApp</h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              <span className="font-semibold text-[#059669] tabular-nums">{selectedDayLogs.length}</span> data tersimpan ({selectedDate}) • {whatsappNumber ? `WA: +${whatsappNumber}` : 'Mode Lokal (atur WA di Setelan)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#345C56] bg-[#ECFDF5] text-xs font-semibold text-[#345C56]">
              <Calendar className="w-3.5 h-3.5" />
              <select
                aria-label="Pilih Tanggal Rekaman"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-xs font-semibold text-[#345C56]"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={exportToSpreadsheet}
              className="rounded-full bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white px-4 text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Simpan ke SPS (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={handleExportJson}
              className="rounded-full border-[#345C56] text-[#345C56] hover:bg-[#ECFDF5] px-4 text-xs"
            >
              <FileJson className="w-4 h-4 mr-1.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              className="rounded-full border-[#8F2D4A] text-[#8F2D4A] hover:bg-[#FDF2F4] px-4 text-xs"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                sendWhatsAppMessage(
                  `*[SMART HYDROPONIC - PAKCOY]*\npH: ${sensorData.ph.toFixed(2)}\nTDS: ${Math.round(sensorData.tds)} ppm\nSuhu Air: ${sensorData.reservoirTemp.toFixed(1)} °C\nLevel Air: ${reservoirLiters} L`
                )
              }
              className="rounded-full border-[#345C56] text-[#345C56] hover:bg-[#ECFDF5] px-4 text-xs"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Kirim ke WhatsApp
            </Button>
          </div>
        </div>

        {/* Riwayat Pembacaan Sensor (10 Terakhir) */}
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.6px] text-[#71717A]">
              Riwayat Pembacaan Sensor ({selectedDate}) • 10 Terakhir
            </p>
            <span className="text-[11px] text-[#A1A1AA]">Diperbarui setiap 3 detik</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-[#71717A] uppercase text-[10px] tracking-wider">
                  <th className="py-2 pr-3 font-semibold">Waktu</th>
                  <th className="py-2 pr-3 font-semibold">pH</th>
                  <th className="py-2 pr-3 font-semibold">TDS</th>
                  <th className="py-2 pr-3 font-semibold">Suhu</th>
                  <th className="py-2 pr-3 font-semibold">Kelembapan</th>
                  <th className="py-2 pr-3 font-semibold">Level</th>
                  <th className="py-2 pr-3 font-semibold">Aliran</th>
                  <th className="py-2 font-semibold">Pompa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {selectedDayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-[#A1A1AA]">
                      Belum ada pembacaan tersimpan pada tanggal {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  [...selectedDayLogs].reverse().slice(0, 10).map((row, idx) => (
                    <tr key={`${row.timestamp}-${idx}`} className="hover:bg-[#ECFDF5]/40">
                      <td className="py-2 pr-3 font-medium text-[#18181B] tabular-nums">{row.timestamp}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.ph}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.tds} ppm</td>
                      <td className="py-2 pr-3 tabular-nums">{row.reservoirTemp} °C</td>
                      <td className="py-2 pr-3 tabular-nums">{row.humidity}%</td>
                      <td className="py-2 pr-3 tabular-nums">{row.waterLevel}%</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.waterFlow === 'Mengalir' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FDF2F4] text-[#8F2D4A]'}`}>
                          {row.waterFlow}
                        </span>
                      </td>
                      <td className="py-2 text-[#52525B]">{row.pumpStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Simulasi Auto-Dosing */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#71717A] mr-1">Uji Auto-Dosing:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => simulateCondition('lowPh')}
            className="rounded-full text-xs border-[#8F2D4A]/40 text-[#8F2D4A] hover:bg-[#FDF2F4]"
          >
            pH Kurang (&lt; 6.0)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => simulateCondition('highPh')}
            className="rounded-full text-xs border-[#8F2D4A]/40 text-[#8F2D4A] hover:bg-[#FDF2F4]"
          >
            pH Tinggi (&gt; 7.0)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => simulateCondition('lowTds')}
            className="rounded-full text-xs border-[#345C56] text-[#047857] hover:bg-[#ECFDF5]"
          >
            Nutrisi Kurang (&lt; 800 ppm)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => simulateCondition('reset')}
            className="rounded-full text-xs text-[#71717A]"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Normal
          </Button>
        </div>
      </Card>
    </div>
  );
}
