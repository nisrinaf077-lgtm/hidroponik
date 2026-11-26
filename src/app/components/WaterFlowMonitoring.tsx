import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Waves, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSystem } from '../context/SystemContext';

export function WaterFlowMonitoring() {
  const { sendEmailNotification } = useSystem();
  const flowAlertSentRef = useRef(false);
  const [flowData, setFlowData] = useState({
    isFlowing: true,
    flowRate: 2.4,
    pumpStatus: true,
    totalToday: 48.5,
    lastFlowTime: new Date()
  });

  const [chartData, setChartData] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      time: `${i}:00`,
      flow: 2.3 + Math.random() * 0.4
    }))
  );

  // Simulate real-time flow updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFlowData(prev => ({
        ...prev,
        flowRate: prev.isFlowing ? 2.4 + (Math.random() - 0.5) * 0.3 : 0,
        lastFlowTime: prev.isFlowing ? new Date() : prev.lastFlowTime
      }));

      setChartData(prev => {
        const newData = [...prev.slice(1)];
        const time = new Date();
        newData.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          flow: 2.4 + (Math.random() - 0.5) * 0.3
        });
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const hasFlowError = flowData.pumpStatus && !flowData.isFlowing;

  useEffect(() => {
    if (hasFlowError && !flowAlertSentRef.current) {
      flowAlertSentRef.current = true;
      sendEmailNotification(
        'critical',
        'KRITIS: Pompa Aktif tapi Aliran Air Tidak Terdeteksi',
        'Pompa sedang berjalan, namun tidak ada aliran air yang terdeteksi pada sistem Pakcoy. Segera periksa level air tandon, selang, atau pompa.'
      );
    } else if (!hasFlowError) {
      flowAlertSentRef.current = false;
    }
  }, [hasFlowError, sendEmailNotification]);

  const toggleFlowFault = () => {
    setFlowData((prev) => ({
      ...prev,
      isFlowing: !prev.isFlowing,
      flowRate: !prev.isFlowing ? 2.4 : 0,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">Pemantauan Aliran Air</h2>
          <p className="text-sm text-zinc-500">Deteksi dan verifikasi aliran air secara real-time</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFlowFault}
          className={`rounded-full border-2 ${hasFlowError ? 'border-[#345C56] text-[#047857] bg-[#ECFDF5]' : 'border-[#8F2D4A] text-[#8F2D4A] hover:bg-[#FDF2F4]'}`}
        >
          {hasFlowError ? 'Pulihkan Aliran Normal' : 'Simulasi Gangguan Aliran'}
        </Button>
      </div>

      {/* Critical Alert if pump is on but no flow */}
      {hasFlowError && (
        <Card className="p-6 bg-[#FDF2F4] border-2 border-[#8F2D4A] rounded-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#8F2D4A] rounded-full">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#8F2D4A] mb-2">Kritis: Aliran Air Tidak Terdeteksi</h3>
              <p className="text-[#8F2D4A]/90 mb-3">
                Pompa saat ini dalam kondisi AKTIF, namun aliran air tidak terdeteksi. Kemungkinan penyebab:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#8F2D4A]/85 mb-4">
                <li>Air tandon / reservoir habis</li>
                <li>Pipa atau filter tersumbat</li>
                <li>Gangguan pada pompa</li>
                <li>Sensor aliran bermasalah</li>
              </ul>
              <p className="text-sm font-medium text-[#8F2D4A]">
                ⚠️ Tindakan segera diperlukan untuk mencegah tanaman Pakcoy kekeringan
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Flow Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status Aliran</p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-4 h-4 rounded-full ${flowData.isFlowing ? 'bg-[#059669] animate-pulse' : 'bg-[#8F2D4A]'}`}></div>
                <span className={`text-2xl font-semibold ${flowData.isFlowing ? 'text-[#059669]' : 'text-[#8F2D4A]'}`}>
                  {flowData.isFlowing ? 'Aktif' : 'Tidak Aktif'}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-[16px] border ${flowData.isFlowing ? 'text-[#059669] bg-[#ECFDF5] border-[#345C56]' : 'text-[#8F2D4A] bg-[#FDF2F4] border-[#8F2D4A]'}`}>
              <Waves className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Terakhir terdeteksi: {flowData.lastFlowTime.toLocaleTimeString('id-ID')}
          </p>
        </Card>

        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Laju Aliran</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#18181B]">
                  {flowData.flowRate.toFixed(2)}
                </span>
                <span className="text-lg text-gray-500">L/min</span>
              </div>
            </div>
            <div className="p-3 rounded-[16px] border border-[#8F2D4A]/40 text-[#8F2D4A] bg-[#FDF2F4]">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Liter per menit</p>
        </Card>

        <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Hari Ini</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#18181B]">
                  {flowData.totalToday.toFixed(1)}
                </span>
                <span className="text-lg text-gray-500">L</span>
              </div>
            </div>
            <div className="p-3 rounded-[16px] border border-[#345C56] text-[#059669] bg-[#ECFDF5]">
              <Waves className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Akumulasi volume air</p>
        </Card>
      </div>

      {/* Real-time Flow Chart */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grafik Laju Aliran Real-time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                label={{ value: 'L/min', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="flow" 
                stroke="#059669" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-3">20 pembacaan terakhir (diperbarui setiap 2 detik)</p>
      </Card>

      {/* System Verification Status */}
      <Card className="p-6 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistem Verifikasi Aliran</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Sensor Aliran</p>
                <p className="text-sm text-gray-600">Status: Berfungsi Normal</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">Terhubung</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              {flowData.pumpStatus ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Pompa Dosing (A/B &amp; pH)</p>
                <p className="text-sm text-gray-600">Status: {flowData.pumpStatus ? 'Aktif' : 'Siaga'}</p>
              </div>
            </div>
            <span className={`text-sm font-medium ${flowData.pumpStatus ? 'text-green-600' : 'text-gray-500'}`}>
              {flowData.pumpStatus ? 'AKTIF' : 'MATI'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              {flowData.isFlowing ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">Deteksi Aliran Air</p>
                <p className="text-sm text-gray-600">Status: {flowData.isFlowing ? 'Terdeteksi' : 'Tidak Terdeteksi'}</p>
              </div>
            </div>
            <span className={`text-sm font-medium ${flowData.isFlowing ? 'text-green-600' : 'text-orange-600'}`}>
              {flowData.isFlowing ? 'Normal' : 'Peringatan'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
