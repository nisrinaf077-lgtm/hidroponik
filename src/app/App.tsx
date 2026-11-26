import { useState, useEffect } from 'react';
import { DashboardOverview } from './components/DashboardOverview';
import { IrrigationScheduling } from './components/IrrigationScheduling';
import { ManualControls } from './components/ManualControls';
import { WaterFlowMonitoring } from './components/WaterFlowMonitoring';
import { SystemProvider, useSystem } from './context/SystemContext';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import {
  Sprout,
  Home,
  SlidersHorizontal,
  Settings,
  Waves,
  Bell,
  FileSpreadsheet,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { exportHydroponicPdf } from './utils/exportPdfReport';

function HydroponicsApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour12: false })
  );
  const {
    whatsappNumber,
    connectionMode,
    deviceIpUrl,
    deviceConnected,
    sensorData,
    sensorLogs,
    setPoints,
    autoDosingEnabled,
    emailLogs,
    markAllEmailsRead,
    exportToSpreadsheet,
    sendWhatsAppMessage,
  } = useSystem();

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('id-ID', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const unreadCount = emailLogs.filter((l) => !l.read).length;

  const handleOpenInbox = () => {
    setInboxOpen(true);
    markAllEmailsRead();
  };

  const handleSendSummaryWa = () => {
    const liters = ((sensorData.waterLevel / 100) * 30).toFixed(1);
    const msg = `*[SMART HYDROPONIC - PAKCOY]*\nStatus: ${connectionMode === 'wifi' ? (deviceConnected ? 'WiFi Lokal Online' : 'WiFi Terputus') : 'Mode Simulasi'}\n- pH: ${sensorData.ph.toFixed(2)}\n- TDS: ${Math.round(sensorData.tds)} ppm\n- Suhu Air: ${sensorData.reservoirTemp.toFixed(1)} °C\n- Kelembapan: ${Math.round(sensorData.humidity)}%\n- Level Air: ${liters} L (${Math.round(sensorData.waterLevel)}%)\n- Sirkulasi NFT: ${sensorData.waterFlow ? 'Mengalir' : 'Tidak Mengalir'}`;
    sendWhatsAppMessage(msg);
  };

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/70">
        <div className="max-w-7xl mx-auto px-5 py-3.5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-[16px] border-2 border-[#345C56] shadow-sm"
                style={{
                  backgroundImage: 'linear-gradient(140deg, #600318 6%, #345C56 105%)',
                }}
              >
                <Sprout className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-['Bricolage_Grotesque'] text-xl sm:text-[24px] sm:leading-[30px] font-bold tracking-[-0.4px] text-[#345C56]">
                  SMART HYDROPONIC
                </h1>
                <p className="text-[11px] font-bold text-[#8F2D4A]">
                  Pemantauan Otomatis Sistem Hidroponik Tanaman
                </p>
              </div>
            </div>

            {/* Connected Email & Notification Center */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-semibold text-[#71717A] tabular-nums mr-1">
                {clock}
              </span>
              <div
                className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 border-2 border-[#345C56] rounded-full text-xs font-bold ${
                  connectionMode === 'wifi' && !deviceConnected
                    ? 'bg-[#FDF2F4] text-[#8F2D4A]'
                    : 'bg-gradient-to-b from-[#ECFDF5] to-[#D1FAE5] text-[#047857]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    connectionMode === 'wifi' && !deviceConnected ? 'bg-[#8F2D4A]' : 'bg-[#059669]'
                  }`}
                />
                <span>
                  {connectionMode === 'wifi'
                    ? deviceConnected
                      ? 'Perangkat online'
                      : 'WiFi terputus'
                    : 'Perangkat online'}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInbox}
                className="relative rounded-full bg-[#ECFDF5] border-2 border-[#345C56] text-[#345C56] hover:bg-[#D1FAE5] hover:text-[#345C56]"
                title="Notifikasi WhatsApp & SPS"
              >
                <Bell className="w-4 h-4 mr-1.5 text-[#345C56]" />
                <span className="text-xs font-bold">Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#8F2D4A] text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-5 py-6">
        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'scheduling' && <IrrigationScheduling />}
          {activeTab === 'flow' && <WaterFlowMonitoring />}
          {activeTab === 'controls' && <ManualControls />}
        </div>
      </main>

      {/* Floating Pill Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-xl border-2 border-[#345C56] shadow-[0_12px_12px_rgba(23,23,28,0.12)] rounded-full p-1.5 z-50">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-full transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-[#059669] border border-[#345C56] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100/70'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] font-semibold">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-full transition-all duration-200 ${
              activeTab === 'flow'
                ? 'bg-[#059669] border border-[#345C56] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100/70'
            }`}
          >
            <Waves className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] font-semibold">Air</span>
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-full transition-all duration-200 ${
              activeTab === 'controls'
                ? 'bg-[#059669] border border-[#345C56] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100/70'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] font-semibold">Kontrol</span>
          </button>

          <button
            onClick={() => setActiveTab('scheduling')}
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-full transition-all duration-200 ${
              activeTab === 'scheduling'
                ? 'bg-[#059669] border border-[#345C56] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100/70'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] font-semibold">Setelan</span>
          </button>
        </div>
      </nav>

      {/* WhatsApp Notifications & SPS Dialog */}
      <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
        <DialogContent className="max-w-lg border-2 border-[#345C56] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#345C56]">
              <MessageCircle className="w-5 h-5 text-[#059669]" />
              Notifikasi WhatsApp &amp; Spreadsheet (SPS)
            </DialogTitle>
            <DialogDescription>
              {whatsappNumber ? (
                <>
                  Nomor WhatsApp tujuan: <span className="font-semibold text-[#047857]">+{whatsappNumber}</span>
                </>
              ) : (
                'Nomor WhatsApp belum diatur — tambahkan di tab Setelan agar peringatan error bisa dikirim ke WA.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 py-2">
            <Button
              size="sm"
              onClick={exportToSpreadsheet}
              className="rounded-full bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Simpan ke Spreadsheet (CSV)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportHydroponicPdf({
                  sensorData,
                  sensorLogs,
                  setPoints,
                  autoDosingEnabled,
                  connectionMode,
                  deviceIpUrl,
                })
              }
              className="rounded-full border-[#8F2D4A] text-[#8F2D4A] hover:bg-[#FDF2F4]"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendSummaryWa}
              className="rounded-full border-[#345C56] text-[#345C56] hover:bg-[#ECFDF5]"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Kirim Laporan ke WA
            </Button>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {emailLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Belum ada log peringatan atau notifikasi.
              </p>
            ) : (
              emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      className={
                        log.type === 'critical'
                          ? 'bg-[#8F2D4A]'
                          : log.type === 'warning'
                          ? 'bg-orange-500'
                          : log.type === 'schedule'
                          ? 'bg-[#059669]'
                          : 'bg-gray-700'
                      }
                    >
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{log.subject}</p>
                  <p className="text-xs text-gray-600 whitespace-pre-line">{log.body}</p>
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendWhatsAppMessage(`*[SMART HYDROPONIC]*\n${log.subject}\n\n${log.body}`)}
                      className="h-7 px-2.5 text-xs text-[#047857] hover:bg-[#ECFDF5] rounded-full"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Kirim ke WA
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <SystemProvider>
      <HydroponicsApp />
      <Toaster position="top-right" richColors />
    </SystemProvider>
  );
}
