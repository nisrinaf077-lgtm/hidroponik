import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Clock, Timer, Droplets, Plus, Trash2, MessageCircle, Wifi } from 'lucide-react';
import { Badge } from './ui/badge';
import { useSystem } from '../context/SystemContext';

type IrrigationMode = 'fixed' | 'interval';

interface AlarmTime {
  id: string;
  time: string;
  enabled: boolean;
}

export function IrrigationScheduling() {
  const {
    whatsappNumber,
    whatsappWebhookUrl,
    updateWhatsAppConfig,
    sendWhatsAppMessage,
    notificationPrefs,
    updateNotificationPrefs,
    sendEmailNotification,
    deviceIpUrl,
    connectionMode,
    deviceConnected,
    updateDeviceConfig,
  } = useSystem();
  const triggeredRef = useRef(false);
  const [draftMode, setDraftMode] = useState<'simulation' | 'wifi'>(connectionMode);
  const [draftIp, setDraftIp] = useState(deviceIpUrl);
  const [draftWa, setDraftWa] = useState(whatsappNumber);
  const [draftWaWebhook, setDraftWaWebhook] = useState(whatsappWebhookUrl);
  const [mode, setMode] = useState<IrrigationMode>('fixed');
  const [alarmTimes, setAlarmTimes] = useState<AlarmTime[]>([
    { id: '1', time: '06:00', enabled: true },
    { id: '2', time: '18:00', enabled: true }
  ]);
  const [intervalHours, setIntervalHours] = useState(2);
  const [duration, setDuration] = useState(2);
  const [isEnabled, setIsEnabled] = useState(true);
  const [nextWatering, setNextWatering] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');

  // Calculate next watering time
  useEffect(() => {
    if (!isEnabled) {
      setNextWatering(null);
      return;
    }

    const now = new Date();
    let next: Date;

    if (mode === 'fixed') {
      // Find the next enabled alarm time
      const enabledAlarms = alarmTimes.filter(alarm => alarm.enabled);
      
      if (enabledAlarms.length === 0) {
        setNextWatering(null);
        return;
      }

      const upcomingTimes = enabledAlarms.map(alarm => {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmDate = new Date();
        alarmDate.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (alarmDate <= now) {
          alarmDate.setDate(alarmDate.getDate() + 1);
        }
        
        return alarmDate;
      });

      // Find the nearest upcoming time
      next = new Date(Math.min(...upcomingTimes.map(d => d.getTime())));
    } else {
      // Interval mode - assume last watering was now for demo
      next = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    }

    setNextWatering(next);
  }, [mode, alarmTimes, intervalHours, isEnabled]);

  // Update countdown
  useEffect(() => {
    if (!nextWatering) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextWatering.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Mulai sekarang...');
        if (!triggeredRef.current) {
          triggeredRef.current = true;
          sendEmailNotification(
            'schedule',
            'Penyiraman Pakcoy Dimulai',
            `Penyiraman terjadwal telah dimulai selama ${duration} menit.`
          );
        }
        return;
      }
      triggeredRef.current = false;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${hours}j ${minutes}m ${seconds}d`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextWatering]);

  const handleAddAlarm = () => {
    const newAlarm: AlarmTime = {
      id: Date.now().toString(),
      time: '12:00',
      enabled: true
    };
    setAlarmTimes([...alarmTimes, newAlarm]);
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarmTimes(alarmTimes.filter(alarm => alarm.id !== id));
  };

  const handleToggleAlarm = (id: string) => {
    setAlarmTimes(alarmTimes.map(alarm => 
      alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
    ));
  };

  const handleTimeChange = (id: string, newTime: string) => {
    setAlarmTimes(alarmTimes.map(alarm => 
      alarm.id === id ? { ...alarm, time: newTime } : alarm
    ));
  };

  const handleSaveSchedule = () => {
    const activeTimes = alarmTimes.filter((a) => a.enabled).map((a) => a.time).join(', ');
    const summary =
      mode === 'fixed'
        ? `Mode: Jam Harian Tetap (${activeTimes || 'Tidak ada'}) • Durasi: ${duration} menit`
        : `Mode: Interval Setiap ${intervalHours} jam • Durasi: ${duration} menit`;
    sendEmailNotification(
      'schedule',
      'Jadwal Penyiraman Pakcoy Disimpan',
      `Penyiraman otomatis: ${isEnabled ? 'AKTIF' : 'NONAKTIF'}.\n${summary}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">Setelan &amp; Penjadwalan</h2>
          <p className="text-sm text-zinc-500">Koneksi WiFi lokal, notifikasi WhatsApp error, dan jadwal penyiraman</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#047857] bg-[#ECFDF5] border border-[#345C56] px-3 py-1.5 rounded-full">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{whatsappNumber ? `WA Alert: +${whatsappNumber}` : 'WA Alert belum diatur'}</span>
        </div>
      </div>

      {/* Koneksi Perangkat (IP WiFi Lokal / Simulasi) */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[14px] bg-[#ECFDF5] border border-[#345C56] text-[#059669]">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Koneksi Perangkat (IP WiFi Lokal)</h3>
              <p className="text-xs text-gray-500">
                Pilih sumber data: Simulasi atau langsung dari IP WiFi ESP32/ESP8266 di jaringan lokal
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full border text-xs font-semibold ${
              connectionMode === 'wifi'
                ? deviceConnected
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                  : 'bg-[#FDF2F4] border-[#8F2D4A]/40 text-[#8F2D4A]'
                : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
            }`}
          >
            {connectionMode === 'wifi'
              ? deviceConnected
                ? 'Terhubung ke WiFi Lokal'
                : 'Menunggu Koneksi IP'
              : 'Mode Simulasi Aktif'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setDraftMode('simulation')}
            className={`h-10 rounded-full text-sm font-semibold transition-all ${
              draftMode === 'simulation'
                ? 'bg-[#059669] text-white border border-[#345C56]'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Mode Simulasi
          </button>
          <button
            type="button"
            onClick={() => setDraftMode('wifi')}
            className={`h-10 rounded-full text-sm font-semibold transition-all ${
              draftMode === 'wifi'
                ? 'bg-[#059669] text-white border border-[#345C56]'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            IP WiFi Lokal (ESP32)
          </button>
        </div>

        {draftMode === 'wifi' && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="device-ip" className="text-xs font-medium text-gray-700">
              Alamat IP Perangkat (HTTP Lokal)
            </Label>
            <Input
              id="device-ip"
              type="url"
              placeholder="http://192.168.1.100"
              value={draftIp}
              onChange={(e) => setDraftIp(e.target.value)}
              className="bg-white"
            />
            <p className="text-[11px] text-gray-500">
              Dashboard akan memanggil <code className="bg-zinc-100 px-1 rounded">GET {draftIp || 'http://192.168.x.x'}/api/sensors</code> setiap 3 detik.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => updateDeviceConfig(draftMode, draftIp)}
            className="rounded-full bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white px-5"
          >
            Simpan Koneksi
          </Button>
        </div>
      </Card>

      {/* Notifikasi WhatsApp (Peringatan Error) */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[14px] bg-[#ECFDF5] border border-[#345C56] text-[#059669]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifikasi WhatsApp (Peringatan Error)</h3>
              <p className="text-xs text-gray-500">
                Tambahkan nomor WA agar peringatan aliran macet atau sensor di luar batas bisa dikirim ke WhatsApp
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full border text-xs font-semibold ${
              whatsappNumber
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                : 'bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]'
            }`}
          >
            {whatsappNumber ? `+${whatsappNumber}` : 'Belum diatur'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-number" className="text-xs font-medium text-gray-700">
              Nomor WhatsApp Tujuan
            </Label>
            <Input
              id="wa-number"
              type="tel"
              placeholder="081234567890 atau 6281234567890"
              value={draftWa}
              onChange={(e) => setDraftWa(e.target.value)}
              className="bg-white"
            />
            <p className="text-[11px] text-gray-500">
              Awalan 0 otomatis diubah ke kode negara 62.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-webhook" className="text-xs font-medium text-gray-700">
              URL Gateway WA Otomatis <span className="text-gray-400 font-normal">(Opsional)</span>
            </Label>
            <Input
              id="wa-webhook"
              type="url"
              placeholder="http://localhost:3000/send-wa atau Fonnte API"
              value={draftWaWebhook}
              onChange={(e) => setDraftWaWebhook(e.target.value)}
              className="bg-white"
            />
            <p className="text-[11px] text-gray-500">
              Jika kosong, tombol kirim akan membuka WhatsApp (wa.me) dengan pesan error siap kirim.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <div className="flex items-center gap-2.5">
            <Switch
              checked={notificationPrefs.sensorAlerts}
              onCheckedChange={(v) =>
                updateNotificationPrefs({ ...notificationPrefs, sensorAlerts: v, flowAlerts: v })
              }
              className="data-[state=checked]:bg-[#059669]"
            />
            <span className="text-xs font-medium text-gray-700">Peringatan Error Sensor &amp; Aliran</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch
              checked={notificationPrefs.scheduleAlerts}
              onCheckedChange={(v) =>
                updateNotificationPrefs({ ...notificationPrefs, scheduleAlerts: v })
              }
              className="data-[state=checked]:bg-[#059669]"
            />
            <span className="text-xs font-medium text-gray-700">Notifikasi Jadwal Penyiraman</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              sendWhatsAppMessage(
                '*[SMART HYDROPONIC]*\nTes notifikasi WhatsApp dari dashboard lokal berhasil terhubung!'
              )
            }
            className="rounded-full border-[#345C56] text-[#345C56] hover:bg-[#ECFDF5] px-4"
          >
            Uji Kirim WA
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => updateWhatsAppConfig(draftWa, draftWaWebhook)}
            className="rounded-full bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white px-5"
          >
            Simpan Nomor WA
          </Button>
        </div>
      </Card>

      {/* Enable/Disable Toggle */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Irigasi Otomatis</h3>
            <p className="text-sm text-gray-600 mt-1">Aktifkan atau nonaktifkan penyiraman terjadwal</p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-[#059669]"
          />
        </div>
      </Card>

      {/* Mode Selection */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mode Penyiraman</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setMode('fixed')}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              mode === 'fixed'
                ? 'border-[#345C56] bg-[#ECFDF5]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Clock className={`w-8 h-8 mb-3 ${mode === 'fixed' ? 'text-[#059669]' : 'text-gray-400'}`} />
            <h4 className="font-semibold text-gray-900 mb-1">Jam Harian Tetap</h4>
            <p className="text-sm text-gray-600">Siram pada jam tertentu setiap hari (ala alarm)</p>
          </button>

          <button
            onClick={() => setMode('interval')}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              mode === 'interval'
                ? 'border-[#8F2D4A] bg-[#FDF2F4]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Timer className={`w-8 h-8 mb-3 ${mode === 'interval' ? 'text-[#8F2D4A]' : 'text-gray-400'}`} />
            <h4 className="font-semibold text-gray-900 mb-1">Hitung Mundur Interval</h4>
            <p className="text-sm text-gray-600">Siram berulang setiap beberapa jam</p>
          </button>
        </div>

        {/* Fixed Time Mode Settings - Alarm Style */}
        {mode === 'fixed' && (
          <div className="space-y-4 p-6 bg-gray-50 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Daftar Jam Penyiraman</h4>
              <Button
                onClick={handleAddAlarm}
                className="bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white rounded-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Jam
              </Button>
            </div>

            <div className="space-y-3">
              {alarmTimes.map((alarm) => (
                <Card key={alarm.id} className={`p-4 ${alarm.enabled ? 'bg-white' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between gap-4">
                    {/* Time Input */}
                    <div className="flex items-center gap-4 flex-1">
                      <Input
                        type="time"
                        value={alarm.time}
                        onChange={(e) => handleTimeChange(alarm.id, e.target.value)}
                        className="text-2xl font-semibold max-w-xs"
                        disabled={!alarm.enabled}
                      />
                      <div className="text-sm text-gray-600">
                        {new Date(`2000-01-01T${alarm.time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={alarm.enabled}
                        onCheckedChange={() => handleToggleAlarm(alarm.id)}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Button
                        onClick={() => handleDeleteAlarm(alarm.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {alarmTimes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Belum ada jam penyiraman</p>
                <p className="text-sm">Klik "Tambah Jam" untuk membuat jadwal</p>
              </div>
            )}
          </div>
        )}

        {/* Interval Mode Settings */}
        {mode === 'interval' && (
          <div className="space-y-4 p-6 bg-gray-50 rounded-2xl">
            <div>
              <Label htmlFor="interval-hours" className="text-sm font-medium text-gray-700">
                Interval Penyiraman (jam)
              </Label>
              <Input
                id="interval-hours"
                type="number"
                min="1"
                max="24"
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="mt-2 max-w-xs"
              />
              <p className="text-sm text-gray-500 mt-1">Siram setiap {intervalHours} jam sekali</p>
            </div>
          </div>
        )}
      </Card>

      {/* Watering Duration */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Durasi Penyiraman</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
              Durasi (menit)
            </Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              max="30"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-2 max-w-xs"
            />
            <p className="text-sm text-gray-500 mt-1">
              Pompa akan menyala selama {duration} menit ({duration * 60} detik)
            </p>
          </div>
        </div>
      </Card>

      {/* Next Watering Display */}
      {isEnabled && nextWatering && (
        <Card className="p-6 bg-gradient-to-r from-[#345C56] via-[#8F2D4A] to-[#345C56] border-2 border-[#345C56] text-white rounded-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.12)]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Jadwal Penyiraman Berikutnya</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80">Waktu:</span>
                  <Badge variant="outline" className="bg-white/15 text-white border-white/25 rounded-full">
                    {nextWatering.toLocaleString('id-ID', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80">Hitung mundur:</span>
                  <span className="text-2xl font-bold text-white">{countdown}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!isEnabled && (
        <Card className="p-6 bg-gray-50 border-gray-300 rounded-3xl shadow-sm">
          <p className="text-center text-gray-600">
            Irigasi otomatis sedang nonaktif. Aktifkan di atas untuk menjadwalkan penyiraman.
          </p>
        </Card>
      )}

      {mode === 'fixed' && alarmTimes.filter(a => a.enabled).length === 0 && isEnabled && (
        <Card className="p-6 bg-orange-50 border-orange-200 rounded-3xl shadow-sm">
          <p className="text-center text-orange-700">
            Tidak ada jam penyiraman yang aktif. Tambahkan dan aktifkan minimal satu jadwal.
          </p>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSchedule}
          className="bg-[#059669] hover:bg-[#047857] border-2 border-[#345C56] text-white px-8 rounded-full shadow-sm"
        >
          Simpan Jadwal
        </Button>
      </div>
    </div>
  );
}
