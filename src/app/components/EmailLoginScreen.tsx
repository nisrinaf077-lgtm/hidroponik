import { useState } from 'react';
import { Sprout, Mail, FileSpreadsheet, Bell, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useSystem } from '../context/SystemContext';

export function EmailLoginScreen() {
  const { connectEmail } = useSystem();
  const [email, setEmail] = useState('');
  const [spsUrl, setSpsUrl] = useState('');
  const [error, setError] = useState('');
  const [scheduleAlerts, setScheduleAlerts] = useState(true);
  const [sensorAlerts, setSensorAlerts] = useState(true);
  const [autoSpsSync, setAutoSpsSync] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Masukkan alamat email yang valid (contoh: nama@kampus.ac.id)');
      return;
    }
    setError('');
    connectEmail(email, spsUrl, {
      scheduleAlerts,
      sensorAlerts,
      flowAlerts: sensorAlerts,
      autoSpsSync,
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div
            className="inline-flex p-3.5 border-2 border-[#345C56] rounded-[16px] shadow-md mb-1"
            style={{
              backgroundImage: 'linear-gradient(140deg, #600318 6%, #345C56 105%)',
            }}
          >
            <Sprout className="w-9 h-9 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#345C56]">
              🌱 Pakcoy IoT
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FDF2F4] text-[#8F2D4A] border border-[#8F2D4A]/40">
              📊 Simpan SPS
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-[#345C56] border border-[#345C56]">
              📩 Notif Email
            </span>
          </div>
          <h1 className="font-['Bricolage_Grotesque'] text-2xl font-bold tracking-[-0.4px] text-[#345C56]">
            SMART HYDROPONIC
          </h1>
          <p className="text-xs font-bold text-[#8F2D4A]">
            Pemantauan Otomatis Sistem Hidroponik Tanaman
          </p>
          <p className="text-sm text-zinc-500 pt-1">
            Hubungkan email Anda untuk memantau sensor Pakcoy, simpan ke Spreadsheet, dan terima notifikasi otomatis.
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 bg-white shadow-[0_4px_4px_rgba(0,0,0,0.08)] rounded-[24px] border-2 border-[#345C56]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                Alamat Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="pl-10"
                  required
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <p className="text-xs text-gray-500">
                Jadwal penyiraman, peringatan sensor, dan laporan data akan dikirim ke email ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sps-url" className="text-sm font-medium text-gray-700">
                URL Webhook Spreadsheet (SPS) <span className="text-gray-400 font-normal">(Opsional)</span>
              </Label>
              <div className="relative">
                <FileSpreadsheet className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="sps-url"
                  type="url"
                  placeholder="https://script.google.com/macros/s/..."
                  value={spsUrl}
                  onChange={(e) => setSpsUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Kosongkan jika ingin mengunduh log sensor langsung sebagai CSV untuk Google Sheets / Excel.
              </p>
            </div>

            {/* Notification Preferences */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 text-[#8F2D4A]" />
                Pengaturan Email &amp; SPS
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Notifikasi jadwal penyiraman</span>
                <Switch
                  checked={scheduleAlerts}
                  onCheckedChange={setScheduleAlerts}
                  className="data-[state=checked]:bg-[#059669]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Peringatan sensor &amp; aliran air</span>
                <Switch
                  checked={sensorAlerts}
                  onCheckedChange={setSensorAlerts}
                  className="data-[state=checked]:bg-[#059669]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Catat data ke Spreadsheet (SPS)</span>
                <Switch
                  checked={autoSpsSync}
                  onCheckedChange={setAutoSpsSync}
                  className="data-[state=checked]:bg-[#059669]"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-[#345C56] via-[#8F2D4A] to-[#345C56] border-2 border-[#345C56] hover:opacity-95 text-white py-5 text-base font-semibold shadow-md transition-opacity"
            >
              Hubungkan &amp; Masuk Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Card>

        {/* Sensor & Crop Info Footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Profil Tanaman Pakcoy
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8F2D4A]" /> pH, TDS, Suhu, Kelembapan, Level
          </span>
        </div>
      </div>
    </div>
  );
}
