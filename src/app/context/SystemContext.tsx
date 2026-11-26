import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

export type PumpKey = 'nutrientA' | 'nutrientB' | 'phDown' | 'phUp' | 'nft' | 'rawWater' | 'mixer';

export interface SetPoints {
  phMin: number;
  phMax: number;
  tdsMin: number;
  tdsMax: number;
  waterRefillLiters: number;
  waterFullLiters: number;
}

export interface LastDosingTimes {
  phUp: string | null;
  phDown: string | null;
  nutrientAB: string | null;
  rawWater: string | null;
}

export interface LiveSensorState {
  humidity: number;
  reservoirTemp: number;
  ph: number;
  tds: number;
  waterLevel: number;
  waterDistance: number;
  waterFlow: boolean;
}

export interface EmailNotificationLog {
  id: string;
  timestamp: Date;
  to: string;
  subject: string;
  body: string;
  type: 'schedule' | 'warning' | 'critical' | 'report';
  read: boolean;
}

export interface SensorLogEntry {
  timestamp: string;
  ph: string;
  tds: number;
  reservoirTemp: string;
  humidity: string;
  waterLevel: number;
  waterDistance: string;
  waterFlow: string;
  pumpStatus: string;
}

export interface NotificationPrefs {
  scheduleAlerts: boolean;
  sensorAlerts: boolean;
  flowAlerts: boolean;
  autoSpsSync: boolean;
}

interface SystemContextType {
  userEmail: string | null;
  whatsappNumber: string;
  whatsappWebhookUrl: string;
  updateWhatsAppConfig: (number: string, webhookUrl?: string) => void;
  sendWhatsAppMessage: (message: string) => void;
  spsWebhookUrl: string;
  deviceIpUrl: string;
  connectionMode: 'simulation' | 'wifi';
  deviceConnected: boolean;
  updateDeviceConfig: (mode: 'simulation' | 'wifi', ipUrl: string) => void;
  notificationPrefs: NotificationPrefs;
  emailLogs: EmailNotificationLog[];
  sensorLogs: SensorLogEntry[];
  availableDates: string[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedDayLogs: SensorLogEntry[];
  sensorData: LiveSensorState;
  pumps: Record<PumpKey, boolean>;
  autoDosingEnabled: boolean;
  setPoints: SetPoints;
  updateSetPoints: (next: SetPoints) => void;
  lastDosingTimes: LastDosingTimes;
  servoRaised: boolean;
  setServoRaised: (raised: boolean) => void;
  spareRelays: Record<'relay7' | 'relay8' | 'relay9', boolean>;
  toggleSpareRelay: (key: 'relay7' | 'relay8' | 'relay9') => void;
  setAutoDosingEnabled: (enabled: boolean) => void;
  setPumpManual: (key: PumpKey, on: boolean) => void;
  turnOffAllPumps: () => void;
  simulateCondition: (condition: 'lowPh' | 'highPh' | 'lowTds' | 'lowWater' | 'reset') => void;
  connectEmail: (email: string, spsUrl?: string, prefs?: NotificationPrefs) => void;
  disconnectEmail: () => void;
  updateSpsWebhookUrl: (url: string) => void;
  updateNotificationPrefs: (prefs: NotificationPrefs) => void;
  sendEmailNotification: (
    type: EmailNotificationLog['type'],
    subject: string,
    body: string
  ) => void;
  markAllEmailsRead: () => void;
  exportToSpreadsheet: () => void;
  sendDataToEmail: () => void;
}

const SystemContext = createContext<SystemContextType | null>(null);

const DEFAULT_PREFS: NotificationPrefs = {
  scheduleAlerts: true,
  sensorAlerts: true,
  flowAlerts: true,
  autoSpsSync: true,
};

const DEFAULT_SETPOINTS: SetPoints = {
  phMin: 6.4,
  phMax: 6.6,
  tdsMin: 1050,
  tdsMax: 1250,
  waterRefillLiters: 10,
  waterFullLiters: 18,
};

const LOG_STORAGE_PREFIX = 'hydro_logs_';

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadLogsForDate(dateKey: string): SensorLogEntry[] {
  try {
    const raw = localStorage.getItem(`${LOG_STORAGE_PREFIX}${dateKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function listSavedLogDates(todayKey: string): string[] {
  const dates = new Set<string>([todayKey]);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOG_STORAGE_PREFIX)) {
      dates.add(key.slice(LOG_STORAGE_PREFIX.length));
    }
  }
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const todayKey = getTodayDateKey();
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('hydro_user_email') || 'Lokal (WiFi)';
  });
  const [whatsappNumber, setWhatsappNumber] = useState<string>(() => {
    return localStorage.getItem('hydro_wa_number') || '';
  });
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('hydro_wa_webhook') || '';
  });
  const [spsWebhookUrl, setSpsWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('hydro_sps_url') || '';
  });
  const [deviceIpUrl, setDeviceIpUrl] = useState<string>(() => {
    return localStorage.getItem('hydro_device_ip') || 'http://192.168.1.100';
  });
  const [connectionMode, setConnectionMode] = useState<'simulation' | 'wifi'>(() => {
    const saved = localStorage.getItem('hydro_conn_mode');
    return saved === 'wifi' ? 'wifi' : 'simulation';
  });
  const [deviceConnected, setDeviceConnected] = useState<boolean>(true);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => {
    const saved = localStorage.getItem('hydro_notif_prefs');
    return saved ? JSON.parse(saved) : DEFAULT_PREFS;
  });
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [sensorLogs, setSensorLogs] = useState<SensorLogEntry[]>(() => loadLogsForDate(todayKey));
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [availableDates, setAvailableDates] = useState<string[]>(() => listSavedLogDates(todayKey));

  useEffect(() => {
    const currentToday = getTodayDateKey();
    try {
      localStorage.setItem(`${LOG_STORAGE_PREFIX}${currentToday}`, JSON.stringify(sensorLogs.slice(-500)));
      setAvailableDates(listSavedLogDates(currentToday));
    } catch {
      // ignore storage quota errors
    }
  }, [sensorLogs]);

  const selectedDayLogs =
    selectedDate === getTodayDateKey() ? sensorLogs : loadLogsForDate(selectedDate);
  const [autoDosingEnabled, setAutoDosingEnabledState] = useState(true);
  const [setPoints, setSetPointsState] = useState<SetPoints>(() => {
    const saved = localStorage.getItem('hydro_setpoints');
    return saved ? JSON.parse(saved) : DEFAULT_SETPOINTS;
  });
  const [lastDosingTimes, setLastDosingTimes] = useState<LastDosingTimes>({
    phUp: null,
    phDown: null,
    nutrientAB: null,
    rawWater: null,
  });
  const [servoRaised, setServoRaised] = useState(true);
  const [spareRelays, setSpareRelays] = useState<Record<'relay7' | 'relay8' | 'relay9', boolean>>({
    relay7: false,
    relay8: false,
    relay9: false,
  });
  const [sensorData, setSensorData] = useState<LiveSensorState>({
    humidity: 68,
    reservoirTemp: 22.1,
    ph: 6.5,
    tds: 1150,
    waterLevel: 57,
    waterDistance: 13.8,
    waterFlow: true,
  });
  const [pumps, setPumps] = useState<Record<PumpKey, boolean>>({
    nutrientA: false,
    nutrientB: false,
    phDown: false,
    phUp: false,
    nft: true,
    rawWater: false,
    mixer: false,
  });
  const lastAutoReasonRef = useRef<string>('');

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('hydro_user_email', userEmail);
    } else {
      localStorage.removeItem('hydro_user_email');
    }
  }, [userEmail]);

  const connectEmail = (email: string, spsUrl = '', prefs = DEFAULT_PREFS) => {
    const trimmed = email.trim();
    setUserEmail(trimmed);
    setSpsWebhookUrl(spsUrl.trim());
    setNotificationPrefs(prefs);
    localStorage.setItem('hydro_sps_url', spsUrl.trim());
    localStorage.setItem('hydro_notif_prefs', JSON.stringify(prefs));

    const welcomeLog: EmailNotificationLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      to: trimmed,
      subject: 'Terhubung: Hidroponik Pintar (Pakcoy)',
      body: `Email Anda (${trimmed}) telah terhubung ke sistem Hidroponik Pintar Pakcoy untuk notifikasi jadwal penyiraman, peringatan sensor, dan laporan Spreadsheet (SPS).`,
      type: 'report',
      read: false,
    };
    setEmailLogs([welcomeLog]);
    toast.success(`Terhubung ke ${trimmed}`, {
      description: 'Notifikasi email dan pencatatan data SPS sudah aktif.',
    });
  };

  const disconnectEmail = () => {
    setUserEmail(null);
    setEmailLogs([]);
    localStorage.removeItem('hydro_user_email');
  };

  const updateSpsWebhookUrl = (url: string) => {
    setSpsWebhookUrl(url.trim());
    localStorage.setItem('hydro_sps_url', url.trim());
    toast.success('Endpoint Spreadsheet (SPS) diperbarui');
  };

  const updateWhatsAppConfig = (number: string, webhookUrl = '') => {
    const cleanNum = number.replace(/[^\d]/g, '').replace(/^0/, '62');
    setWhatsappNumber(cleanNum);
    setWhatsappWebhookUrl(webhookUrl.trim());
    localStorage.setItem('hydro_wa_number', cleanNum);
    localStorage.setItem('hydro_wa_webhook', webhookUrl.trim());
    toast.success('Nomor WhatsApp disimpan', {
      description: cleanNum
        ? `Peringatan error akan diarahkan ke +${cleanNum}.`
        : 'Nomor WhatsApp dikosongkan.',
    });
  };

  const sendWhatsAppMessage = useCallback(
    (message: string) => {
      if (!whatsappNumber) {
        toast.warning('Nomor WhatsApp belum diatur', {
          description: 'Silakan isi nomor WhatsApp di tab Setelan terlebih dahulu.',
        });
        return;
      }
      if (whatsappWebhookUrl) {
        fetch(whatsappWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: whatsappNumber, message }),
        }).catch(() => {});
        toast.success(`Notifikasi WA dikirim ke +${whatsappNumber}`);
      } else {
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [whatsappNumber, whatsappWebhookUrl]
  );

  const updateDeviceConfig = (mode: 'simulation' | 'wifi', ipUrl: string) => {
    const cleanUrl = ipUrl.trim().replace(/\/+$/, '');
    setConnectionMode(mode);
    setDeviceIpUrl(cleanUrl);
    localStorage.setItem('hydro_conn_mode', mode);
    localStorage.setItem('hydro_device_ip', cleanUrl);
    setDeviceConnected(mode === 'simulation');
    toast.success(
      mode === 'wifi' ? 'Mode IP WiFi Lokal Diaktifkan' : 'Mode Simulasi Diaktifkan',
      {
        description:
          mode === 'wifi'
            ? `Mengambil data dari ${cleanUrl}/api/sensors setiap 3 detik.`
            : 'Menggunakan data simulasi internal.',
      }
    );
  };

  const updateNotificationPrefs = (prefs: NotificationPrefs) => {
    setNotificationPrefs(prefs);
    localStorage.setItem('hydro_notif_prefs', JSON.stringify(prefs));
    toast.success('Preferensi notifikasi email disimpan');
  };

  const sendEmailNotification = useCallback(
    (type: EmailNotificationLog['type'], subject: string, body: string) => {
      if (type === 'schedule' && !notificationPrefs.scheduleAlerts) return;
      if (type === 'warning' && !notificationPrefs.sensorAlerts) return;
      if (type === 'critical' && !notificationPrefs.flowAlerts && !notificationPrefs.sensorAlerts) return;

      const newLog: EmailNotificationLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(),
        to: whatsappNumber ? `+${whatsappNumber}` : 'Dashboard Lokal',
        subject,
        body,
        type,
        read: false,
      };

      setEmailLogs((prev) => [newLog, ...prev].slice(0, 50));

      if ((type === 'critical' || type === 'warning') && whatsappNumber && whatsappWebhookUrl) {
        fetch(whatsappWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: whatsappNumber,
            message: `*[SMART HYDROPONIC]*\n${subject}\n\n${body}`,
          }),
        }).catch(() => {});
      }

      if (type === 'critical') {
        toast.error(whatsappNumber ? `Peringatan Kritis (WA +${whatsappNumber})` : 'Peringatan Kritis', {
          description: subject,
        });
      } else if (type === 'warning') {
        toast.warning(whatsappNumber ? `Peringatan Sistem (WA +${whatsappNumber})` : 'Peringatan Sistem', {
          description: subject,
        });
      } else {
        toast.success('Notifikasi Sistem', { description: subject });
      }
    },
    [whatsappNumber, whatsappWebhookUrl, notificationPrefs]
  );

  const markAllEmailsRead = () => {
    setEmailLogs((prev) => prev.map((log) => ({ ...log, read: true })));
  };

  const setAutoDosingEnabled = (enabled: boolean) => {
    setAutoDosingEnabledState(enabled);
    toast.success(enabled ? 'Auto-Dosing Otomatis Diaktifkan' : 'Mode Kontrol Manual Diaktifkan', {
      description: enabled
        ? 'Pompa Nutrisi A/B dan pH Up/Down akan berjalan otomatis sesuai sensor.'
        : 'Pompa kini dikendalikan secara manual.',
    });
  };

  const updateSetPoints = (next: SetPoints) => {
    setSetPointsState(next);
    localStorage.setItem('hydro_setpoints', JSON.stringify(next));
    toast.success('Acuan Set Point disimpan', {
      description: `pH ${next.phMin.toFixed(2)}–${next.phMax.toFixed(2)} • TDS ${next.tdsMin}–${next.tdsMax} ppm • Isi ulang < ${next.waterRefillLiters} L`,
    });
  };

  const toggleSpareRelay = (key: 'relay7' | 'relay8' | 'relay9') => {
    setSpareRelays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setPumpManual = (key: PumpKey, on: boolean) => {
    setPumps((prev) => ({ ...prev, [key]: on }));
    if (key === 'nft') {
      setSensorData((prev) => ({ ...prev, waterFlow: on }));
    }
    if (on) {
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (key === 'phUp') setLastDosingTimes((t) => ({ ...t, phUp: nowStr }));
      if (key === 'phDown') setLastDosingTimes((t) => ({ ...t, phDown: nowStr }));
      if (key === 'nutrientA' || key === 'nutrientB') setLastDosingTimes((t) => ({ ...t, nutrientAB: nowStr }));
      if (key === 'rawWater') setLastDosingTimes((t) => ({ ...t, rawWater: nowStr }));
    }
  };

  const turnOffAllPumps = () => {
    setAutoDosingEnabledState(false);
    setPumps({
      nutrientA: false,
      nutrientB: false,
      phDown: false,
      phUp: false,
      nft: false,
      rawWater: false,
      mixer: false,
    });
    setSensorData((prev) => ({ ...prev, waterFlow: false }));
    toast.warning('Semua pompa dimatikan', {
      description: 'Mode beralih ke Manual dan seluruh relay dalam kondisi SIAGA.',
    });
  };

  const simulateCondition = (condition: 'lowPh' | 'highPh' | 'lowTds' | 'lowWater' | 'reset') => {
    if (condition === 'lowPh') {
      setSensorData((prev) => ({ ...prev, ph: 5.4 }));
    } else if (condition === 'highPh') {
      setSensorData((prev) => ({ ...prev, ph: 7.4 }));
    } else if (condition === 'lowTds') {
      setSensorData((prev) => ({ ...prev, tds: 680 }));
    } else if (condition === 'lowWater') {
      setSensorData((prev) => ({ ...prev, waterLevel: 18, waterDistance: 37.8 }));
    } else {
      setSensorData({
        humidity: 68,
        reservoirTemp: 22.1,
        ph: 6.5,
        tds: 1150,
        waterLevel: 57,
        waterDistance: 13.8,
        waterFlow: true,
      });
    }
  };

  // Live sensor simulation + automatic dosing control loop
  useEffect(() => {
    if (connectionMode === 'wifi' && deviceIpUrl) {
      const fetchFromDevice = async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`${deviceIpUrl}/api/sensors`, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error('HTTP error');
          const data = await res.json();
          setDeviceConnected(true);
          setSensorData((prev) => ({
            ph: typeof data.ph === 'number' ? data.ph : prev.ph,
            tds: typeof data.tds === 'number' ? data.tds : prev.tds,
            reservoirTemp: typeof data.reservoirTemp === 'number' ? data.reservoirTemp : (typeof data.temp === 'number' ? data.temp : prev.reservoirTemp),
            humidity: typeof data.humidity === 'number' ? data.humidity : prev.humidity,
            waterLevel: typeof data.waterLevel === 'number' ? data.waterLevel : prev.waterLevel,
            waterDistance: typeof data.waterDistance === 'number' ? data.waterDistance : prev.waterDistance,
            waterFlow: typeof data.waterFlow === 'boolean' ? data.waterFlow : prev.waterFlow,
          }));
          if (data.pumps) {
            setPumps((prev) => ({ ...prev, ...data.pumps }));
          }
        } catch {
          setDeviceConnected(false);
        }
      };
      fetchFromDevice();
      const wifiInterval = setInterval(fetchFromDevice, 3000);
      return () => clearInterval(wifiInterval);
    }

    setDeviceConnected(true);
    const interval = setInterval(() => {
      setSensorData((prev) => {
        let nextPh = prev.ph + (Math.random() - 0.5) * 0.12;
        let nextTds = prev.tds + (Math.random() - 0.5) * 25;
        let nextLevel = Math.min(100, Math.max(0, prev.waterLevel + (Math.random() - 0.5) * 0.8));
        const nextDistance = 5 + ((100 - nextLevel) / 100) * 40;
        const nextHumidity = 68 + (Math.random() - 0.5) * 3;
        const nextTemp = 22.1 + (Math.random() - 0.5) * 0.5;

        if (autoDosingEnabled) {
          const currentLiters = (prev.waterLevel / 100) * 30;
          const needPhUp = prev.ph < setPoints.phMin;
          const needPhDown = prev.ph > setPoints.phMax;
          const needNutrient = prev.tds < setPoints.tdsMin;
          const needDilution = prev.tds > setPoints.tdsMax;
          const needRefill = currentLiters < setPoints.waterRefillLiters;
          const needRawWater = needRefill || needDilution;
          const needMixer = needPhUp || needPhDown || needNutrient || needRawWater;

          if (needPhUp) nextPh = Math.min((setPoints.phMin + setPoints.phMax) / 2, prev.ph + 0.22);
          if (needPhDown) nextPh = Math.max((setPoints.phMin + setPoints.phMax) / 2, prev.ph - 0.22);
          if (needNutrient) nextTds = Math.min((setPoints.tdsMin + setPoints.tdsMax) / 2, prev.tds + 65);
          if (needDilution) nextTds = Math.max(setPoints.tdsMax - 40, prev.tds - 55);
          if (needRefill) nextLevel = Math.min((setPoints.waterFullLiters / 30) * 100, prev.waterLevel + 4);

          const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (needPhUp || needPhDown || needNutrient || needRawWater) {
            setLastDosingTimes((t) => ({
              phUp: needPhUp ? nowStr : t.phUp,
              phDown: needPhDown ? nowStr : t.phDown,
              nutrientAB: needNutrient ? nowStr : t.nutrientAB,
              rawWater: needRawWater ? nowStr : t.rawWater,
            }));
          }

          const nextPumps: Record<PumpKey, boolean> = {
            nutrientA: needNutrient,
            nutrientB: needNutrient,
            phDown: needPhDown,
            phUp: needPhUp,
            nft: true,
            rawWater: needRawWater,
            mixer: needMixer,
          };
          setPumps(nextPumps);

          const reasons: string[] = [];
          if (needPhUp) reasons.push(`pH rendah (${prev.ph.toFixed(2)}) → Pompa pH Up AKTIF`);
          if (needPhDown) reasons.push(`pH tinggi (${prev.ph.toFixed(2)}) → Pompa pH Down AKTIF`);
          if (needNutrient) reasons.push(`Nutrisi TDS kurang (${Math.round(prev.tds)} ppm) → Pompa Nutrisi A & B AKTIF`);
          if (needRawWater) reasons.push(`Air baku aktif (Level ${currentLiters.toFixed(1)} L / TDS ${Math.round(prev.tds)} ppm)`);

          const reasonKey = [needPhUp, needPhDown, needNutrient, needRawWater].join('-');
          if (reasons.length > 0 && reasonKey !== lastAutoReasonRef.current) {
            lastAutoReasonRef.current = reasonKey;
            sendEmailNotification(
              'warning',
              'Auto-Dosing Pakcoy Berjalan Otomatis',
              reasons.join('\n')
            );
          } else if (reasons.length === 0) {
            lastAutoReasonRef.current = '';
          }
        }

        const updated: LiveSensorState = {
          humidity: nextHumidity,
          reservoirTemp: nextTemp,
          ph: nextPh,
          tds: nextTds,
          waterLevel: nextLevel,
          waterDistance: nextDistance,
          waterFlow: prev.waterFlow,
        };

        const activePumps = Object.entries(pumps)
          .filter(([, on]) => on)
          .map(([k]) => k)
          .join('+') || 'SIAGA';

        setSensorLogs((logs) => [
          ...logs.slice(-99),
          {
            timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
            ph: updated.ph.toFixed(2),
            tds: Math.round(updated.tds),
            reservoirTemp: updated.reservoirTemp.toFixed(1),
            humidity: updated.humidity.toFixed(1),
            waterLevel: Math.round(updated.waterLevel),
            waterDistance: updated.waterDistance.toFixed(1),
            waterFlow: updated.waterFlow ? 'Mengalir' : 'Tidak Mengalir',
            pumpStatus: activePumps,
          },
        ]);

        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [connectionMode, deviceIpUrl, autoDosingEnabled, setPoints, pumps, sendEmailNotification]);

  const exportToSpreadsheet = useCallback(() => {
    const activeLogs = selectedDate === getTodayDateKey() ? sensorLogs : loadLogsForDate(selectedDate);
    const rows =
      activeLogs.length > 0
        ? activeLogs
        : [
            {
              timestamp: new Date().toISOString(),
              ph: '6.40',
              tds: 1050,
              reservoirTemp: '22.3',
              humidity: '65.0',
              waterLevel: 78,
              waterDistance: '13.8',
              waterFlow: 'Mengalir',
              pumpStatus: 'SIAGA',
            },
          ];

    const headers = [
      'Waktu',
      'Tanaman',
      'pH',
      'TDS (ppm)',
      'Suhu Reservoir (C)',
      'Kelembapan (%)',
      'Level Air (%)',
      'Jarak (cm)',
      'Aliran Air',
      'Status Pompa',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${r.timestamp}"`,
          'Pakcoy',
          r.ph,
          r.tds,
          r.reservoirTemp,
          r.humidity,
          r.waterLevel,
          r.waterDistance,
          r.waterFlow,
          r.pumpStatus,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = selectedDate;
    link.href = url;
    link.setAttribute('download', `pakcoy-hydroponics-sps-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (spsWebhookUrl) {
      fetch(spsWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: 'Pakcoy',
          email: userEmail,
          latest: rows[rows.length - 1],
          totalRows: rows.length,
        }),
      }).catch(() => {});
    }

    toast.success('Data tersimpan ke Spreadsheet (SPS / CSV)', {
      description: spsWebhookUrl
        ? `Berhasil mengunduh ${rows.length} baris & sinkron ke endpoint SPS.`
        : `Berhasil mengunduh ${rows.length} data sensor sebagai CSV untuk Excel / Google Sheets.`,
    });
  }, [sensorLogs, selectedDate, spsWebhookUrl, userEmail]);

  const sendDataToEmail = useCallback(() => {
    if (!userEmail) return;
    const latest = sensorLogs[sensorLogs.length - 1];
    const summary = latest
      ? `Pembacaan Pakcoy Terbaru (${latest.timestamp}):\n- pH: ${latest.ph}\n- TDS: ${latest.tds} ppm\n- Suhu Reservoir: ${latest.reservoirTemp} °C\n- Kelembapan: ${latest.humidity} %\n- Level Air: ${latest.waterLevel}% (${latest.waterDistance} cm)\n- Aliran Air: ${latest.waterFlow} | Pompa: ${latest.pumpStatus}\nTotal Data Tercatat: ${sensorLogs.length}`
      : 'Status Sistem Hidroponik Pakcoy: Semua sensor online dan berjalan normal.';

    sendEmailNotification('report', 'Laporan Sensor & SPS Hidroponik Pakcoy', summary);
  }, [userEmail, sensorLogs, sendEmailNotification]);

  return (
    <SystemContext.Provider
      value={{
        userEmail,
        whatsappNumber,
        whatsappWebhookUrl,
        updateWhatsAppConfig,
        sendWhatsAppMessage,
        spsWebhookUrl,
        deviceIpUrl,
        connectionMode,
        deviceConnected,
        updateDeviceConfig,
        notificationPrefs,
        emailLogs,
        sensorLogs,
        availableDates,
        selectedDate,
        setSelectedDate,
        selectedDayLogs,
        sensorData,
        pumps,
        autoDosingEnabled,
        setPoints,
        updateSetPoints,
        lastDosingTimes,
        servoRaised,
        setServoRaised,
        spareRelays,
        toggleSpareRelay,
        setAutoDosingEnabled,
        setPumpManual,
        turnOffAllPumps,
        simulateCondition,
        connectEmail,
        disconnectEmail,
        updateSpsWebhookUrl,
        updateNotificationPrefs,
        sendEmailNotification,
        markAllEmailsRead,
        exportToSpreadsheet,
        sendDataToEmail,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('useSystem must be used within SystemProvider');
  return ctx;
}
