import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useSystem, PumpKey } from '../context/SystemContext';
import {
  FlaskConical,
  Droplet,
  ArrowDownCircle,
  ArrowUpCircle,
  Waves,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface PumpConfig {
  key: PumpKey | 'nutrientAB';
  title: string;
  relayLabel: string;
  icon: React.ReactNode;
}

export function ManualControls() {
  const {
    sensorData,
    pumps,
    autoDosingEnabled,
    setAutoDosingEnabled,
    setPumpManual,
    turnOffAllPumps,
    setPoints,
    updateSetPoints,
    lastDosingTimes,
    servoRaised,
    setServoRaised,
    spareRelays,
    toggleSpareRelay,
  } = useSystem();

  const [draftSetPoints, setDraftSetPoints] = useState(setPoints);
  useEffect(() => {
    setDraftSetPoints(setPoints);
  }, [setPoints]);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    isTurningOn: boolean;
    action: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    isTurningOn: true,
    action: () => {},
  });

  const pumpConfigs: PumpConfig[] = [
    {
      key: 'nft',
      title: 'Pompa NFT',
      relayLabel: 'Relay 1 • sirkulasi',
      icon: <Waves className="w-5 h-5" />,
    },
    {
      key: 'phUp',
      title: 'Pompa pH Up',
      relayLabel: 'Relay 2 • dosing',
      icon: <ArrowUpCircle className="w-5 h-5" />,
    },
    {
      key: 'phDown',
      title: 'Pompa pH Down',
      relayLabel: 'Relay 3 • dosing',
      icon: <ArrowDownCircle className="w-5 h-5" />,
    },
    {
      key: 'nutrientAB',
      title: 'Pompa Nutrisi A+B',
      relayLabel: 'Relay 4 • dosing',
      icon: <FlaskConical className="w-5 h-5" />,
    },
    {
      key: 'rawWater',
      title: 'Pompa Air Baku',
      relayLabel: 'Relay 5 • isi ulang',
      icon: <Droplet className="w-5 h-5" />,
    },
    {
      key: 'mixer',
      title: 'Pengaduk',
      relayLabel: 'Relay 6 • mixing',
      icon: <RefreshCw className="w-5 h-5" />,
    },
  ];

  const isPumpActive = (key: PumpConfig['key']) => {
    if (key === 'nutrientAB') return pumps.nutrientA || pumps.nutrientB;
    return pumps[key];
  };

  const handlePumpToggle = (pump: PumpConfig, turnOn: boolean) => {
    setConfirmDialog({
      open: true,
      title: `${turnOn ? 'Nyalakan' : 'Matikan'} ${pump.title}`,
      description: turnOn
        ? `Tindakan ini akan mengaktifkan ${pump.title} (${pump.relayLabel}) secara manual dan menonaktifkan sementara mode otomatis.`
        : `Tindakan ini akan langsung mematikan ${pump.title}.`,
      isTurningOn: turnOn,
      action: () => {
        if (autoDosingEnabled) {
          setAutoDosingEnabled(false);
        }
        if (pump.key === 'nutrientAB') {
          setPumpManual('nutrientA', turnOn);
          setPumpManual('nutrientB', turnOn);
        } else {
          setPumpManual(pump.key, turnOn);
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleSaveSetPoints = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetPoints({
      phMin: Number(draftSetPoints.phMin),
      phMax: Number(draftSetPoints.phMax),
      tdsMin: Number(draftSetPoints.tdsMin),
      tdsMax: Number(draftSetPoints.tdsMax),
      waterRefillLiters: Number(draftSetPoints.waterRefillLiters),
      waterFullLiters: Number(draftSetPoints.waterFullLiters),
    });
  };

  const handleResetSetPoints = () => {
    const defaults = {
      phMin: 6.4,
      phMax: 6.6,
      tdsMin: 1050,
      tdsMax: 1250,
      waterRefillLiters: 10,
      waterFullLiters: 18,
    };
    setDraftSetPoints(defaults);
    updateSetPoints(defaults);
  };

  const currentLiters = (sensorData.waterLevel / 100) * 30;
  const isOptimal =
    sensorData.ph >= setPoints.phMin &&
    sensorData.ph <= setPoints.phMax &&
    sensorData.tds >= setPoints.tdsMin &&
    sensorData.tds <= setPoints.tdsMax &&
    currentLiters >= setPoints.waterRefillLiters;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Space_Grotesk'] text-[24px] leading-[30px] font-bold tracking-[-0.4px] text-[#18181B] mb-1">
          Kontrol &amp; Aktuator
        </h2>
        <p className="text-[14px] text-[#71717A]">
          Mode otomatis atau manual untuk pompa, dosing, dan servo probe pH
        </p>
      </div>

      {/* Row 1: Status Sistem + Mode Operasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#71717A]">
              STATUS SISTEM
            </p>
            <span className="px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] font-semibold text-[#047857]">
              Perangkat online
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isOptimal ? 'bg-[#059669]' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span
              className={`font-['Space_Grotesk'] text-[26px] leading-[32px] font-bold tracking-[-0.5px] ${
                isOptimal ? 'text-[#059669]' : 'text-amber-600'
              }`}
            >
              {isOptimal ? 'Normal' : 'Penyesuaian'}
            </span>
          </div>
          <p className="text-[12px] text-[#71717A]">
            {isOptimal
              ? 'Semua parameter dalam rentang set point optimal.'
              : 'Parameter di luar set point — kontrol otomatis menyesuaikan pompa.'}{' '}
            Pembaruan terakhir {new Date().toLocaleTimeString('id-ID', { hour12: false })}.
          </p>
        </Card>

        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#71717A]">
            MODE OPERASI
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAutoDosingEnabled(true)}
              className={`h-10 rounded-full text-[14px] font-semibold transition-all ${
                autoDosingEnabled
                  ? 'bg-[#059669] text-white border border-[#345C56] shadow-sm'
                  : 'bg-white text-[#18181B] border border-[#E4E4E7] hover:bg-zinc-50'
              }`}
            >
              Otomatis
            </button>
            <button
              type="button"
              onClick={() => setAutoDosingEnabled(false)}
              className={`h-10 rounded-full text-[14px] font-semibold transition-all ${
                !autoDosingEnabled
                  ? 'bg-[#059669] text-white border border-[#345C56] shadow-sm'
                  : 'bg-white text-[#18181B] border border-[#E4E4E7] hover:bg-zinc-50'
              }`}
            >
              Manual
            </button>
          </div>
          <p className="text-[12px] text-[#71717A]">
            Mode otomatis: sistem mengatur pompa &amp; dosing sesuai acuan set point. Mode manual: tiap pompa dikendalikan langsung dari sini.
          </p>
        </Card>
      </div>

      {/* Acuan Set Point Otomatis */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[12px] bg-[#ECFDF5] border border-[#345C56] text-[#059669]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-[16px] font-bold text-[#18181B]">
                Acuan Set Point Otomatis (Pakcoy)
              </h3>
              <p className="text-[12px] text-[#71717A]">
                Ambang batas otomatis untuk mengaktifkan pompa pH, Nutrisi A+B, dan Air Baku
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full border text-[12px] font-semibold ${
              autoDosingEnabled
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                : 'bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]'
            }`}
          >
            {autoDosingEnabled ? 'Aktif Mengontrol' : 'Mode Manual (Standby)'}
          </span>
        </div>

        <form onSubmit={handleSaveSetPoints} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-2">
              <p className="text-xs font-semibold text-[#345C56]">Target Kadar pH</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-[#71717A]">pH Min (pH Up)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="4"
                    max="8"
                    value={draftSetPoints.phMin}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({ ...p, phMin: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#71717A]">pH Maks (pH Down)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="5"
                    max="9"
                    value={draftSetPoints.phMax}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({ ...p, phMax: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-2">
              <p className="text-xs font-semibold text-[#345C56]">Target Nutrisi (TDS)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-[#71717A]">TDS Min (Nutrisi A+B)</Label>
                  <Input
                    type="number"
                    step="10"
                    min="300"
                    max="1800"
                    value={draftSetPoints.tdsMin}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({ ...p, tdsMin: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#71717A]">TDS Maks (Dilusi)</Label>
                  <Input
                    type="number"
                    step="10"
                    min="500"
                    max="2000"
                    value={draftSetPoints.tdsMax}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({ ...p, tdsMax: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-2">
              <p className="text-xs font-semibold text-[#345C56]">Target Level Air (30 L)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-[#71717A]">Isi Ulang (&lt; L)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="4"
                    max="20"
                    value={draftSetPoints.waterRefillLiters}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({
                        ...p,
                        waterRefillLiters: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#71717A]">Berhenti (L)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="10"
                    max="28"
                    value={draftSetPoints.waterFullLiters}
                    onChange={(e) =>
                      setDraftSetPoints((p) => ({
                        ...p,
                        waterFullLiters: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-9 mt-1 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSetPoints}
              className="rounded-full border-[#E4E4E7] text-[#71717A]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Default Pakcoy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full bg-[#059669] hover:bg-[#047857] border border-[#345C56] text-white px-5"
            >
              Simpan Set Point
            </Button>
          </div>
        </form>
      </Card>

      {/* Row 2: Kesehatan sensor + Dosing terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)]">
          <h3 className="font-['Space_Grotesk'] text-[16px] font-bold text-[#18181B] mb-4">
            Kesehatan sensor
          </h3>
          <div className="space-y-3">
            {['Sensor pH', 'Sensor TDS', 'Suhu air', 'Level ultrasonik', 'DHT22'].map((name) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-[14px] text-[#52525B]">{name}</span>
                <span className="px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] font-semibold text-[#047857]">
                  Terbaca
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)]">
          <h3 className="font-['Space_Grotesk'] text-[16px] font-bold text-[#18181B] mb-4">
            Dosing terakhir
          </h3>
          <div className="space-y-3.5">
            {[
              { label: 'pH Up', val: lastDosingTimes.phUp },
              { label: 'pH Down', val: lastDosingTimes.phDown },
              { label: 'Nutrisi A+B', val: lastDosingTimes.nutrientAB },
              { label: 'Air baku', val: lastDosingTimes.rawWater },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[14px] text-[#52525B]">{row.label}</span>
                <span className="text-[14px] font-medium text-[#71717A] tabular-nums">
                  {row.val || '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Notice Banner */}
      <Card className="p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-[20px]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C2410C] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[14px] font-semibold text-[#9A3412]">
              {autoDosingEnabled
                ? 'Mode Otomatis Aktif (Mengikuti Set Point)'
                : 'Mode Kontrol Manual Aktif'}
            </h4>
            <p className="text-[12px] text-[#C2410C]">
              {autoDosingEnabled
                ? `Pompa akan menyala otomatis jika pH di luar ${setPoints.phMin.toFixed(2)}–${setPoints.phMax.toFixed(2)}, TDS di luar ${setPoints.tdsMin}–${setPoints.tdsMax} ppm, atau air < ${setPoints.waterRefillLiters} L.`
                : 'Menekan Nyalakan/Matikan di bawah akan langsung mengontrol relay pompa secara manual.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Pompa & relay (6 cards, 3x2 grid) */}
      <div>
        <h3 className="font-['Space_Grotesk'] text-[18px] font-bold tracking-[-0.2px] text-[#18181B] mb-4">
          Pompa &amp; relay
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pumpConfigs.map((pump) => {
            const isActive = isPumpActive(pump.key);
            return (
              <Card
                key={pump.key}
                className="p-5 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)] flex flex-col gap-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-[14px] border ${
                        isActive
                          ? 'text-[#059669] bg-[#ECFDF5] border-[#D1FAE5]'
                          : 'text-[#71717A] bg-[#FAFAFA] border-[#E4E4E7]'
                      }`}
                    >
                      {pump.icon}
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-[#18181B]">{pump.title}</h4>
                      <p className="text-[12px] text-[#71717A]">{pump.relayLabel}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border text-[11px] font-semibold ${
                      isActive
                        ? 'bg-[#059669] border-[#059669] text-white'
                        : 'bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]'
                    }`}
                  >
                    {isActive ? 'AKTIF' : 'SIAGA'}
                  </span>
                </div>

                <div className="text-[12px] text-[#71717A] bg-[#F4F4F5]/80 rounded-xl px-3 py-2">
                  {isActive ? 'Menyala' : 'Siaga'}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => handlePumpToggle(pump, true)}
                    disabled={isActive}
                    className="rounded-full h-10 bg-[#059669] hover:bg-[#047857] text-white disabled:bg-[#99D5C2] disabled:text-white disabled:opacity-100"
                  >
                    Nyalakan
                  </Button>
                  <Button
                    onClick={() => handlePumpToggle(pump, false)}
                    disabled={!isActive}
                    className="rounded-full h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:bg-[#F1B2B2] disabled:text-white disabled:opacity-100"
                  >
                    Matikan
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Servo probe pH & Relay cadangan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-['Space_Grotesk'] text-[16px] font-bold text-[#18181B]">
                Servo probe pH
              </h3>
              <p className="text-[12px] text-[#71717A]">
                {servoRaised ? 'Probe diangkat saat tidak mengukur' : 'Probe diturunkan untuk mengukur pH'}
              </p>
            </div>
            <div className="p-2.5 rounded-[14px] bg-[#ECFDF5] border border-[#D1FAE5] text-[#059669]">
              <ArrowUpDown className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setServoRaised(true)}
              className={`rounded-full h-10 ${
                servoRaised
                  ? 'border-[#345C56] bg-[#ECFDF5] text-[#047857]'
                  : 'border-[#E4E4E7] text-[#18181B]'
              }`}
            >
              Naikkan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setServoRaised(false)}
              className={`rounded-full h-10 ${
                !servoRaised
                  ? 'border-[#345C56] bg-[#ECFDF5] text-[#047857]'
                  : 'border-[#E4E4E7] text-[#18181B]'
              }`}
            >
              Turunkan
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.06)] space-y-4">
          <h3 className="font-['Space_Grotesk'] text-[16px] font-bold text-[#18181B]">
            Relay cadangan
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {(['relay7', 'relay8', 'relay9'] as const).map((key, idx) => {
              const active = spareRelays[key];
              return (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  onClick={() => toggleSpareRelay(key)}
                  className={`rounded-full h-10 ${
                    active
                      ? 'bg-[#059669] border-[#345C56] text-white hover:bg-[#047857]'
                      : 'border-[#E4E4E7] text-[#18181B]'
                  }`}
                >
                  Relay {idx + 7}
                </Button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Emergency Stop: Matikan semua */}
      <Button
        type="button"
        onClick={turnOffAllPumps}
        className="w-full h-11 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold shadow-sm"
      >
        Matikan semua
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="rounded-[24px] border-2 border-[#345C56]">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full border-[#345C56] text-[#345C56]"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              onClick={confirmDialog.action}
              className={`rounded-full ${confirmDialog.isTurningOn ? 'bg-[#059669] hover:bg-[#047857]' : 'bg-[#8F2D4A] hover:bg-[#722139]'}`}
            >
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
