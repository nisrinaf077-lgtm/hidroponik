import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SystemStatusProps {
  className?: string;
}

export function SystemStatus({ className }: SystemStatusProps) {
  const systemData = {
    isOnline: true,
    mode: 'Automatic',
    lastWatering: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastError: null as string | null,
    uptime: '5 days 14 hours'
  };

  return (
    <div className={className}>
      {/* Status Banner */}
      <Card className={`p-4 ${systemData.isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            {systemData.isOnline ? (
              <>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">System Online</p>
                  <p className="text-sm text-green-700">All systems operational</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 bg-red-100 rounded-lg">
                  <WifiOff className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">System Offline</p>
                  <p className="text-sm text-red-700">Connection lost</p>
                </div>
              </>
            )}
          </div>

          {/* Mode Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mode:</span>
            <Badge className="bg-blue-500">
              {systemData.mode}
            </Badge>
          </div>

          {/* Uptime */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Uptime: {systemData.uptime}</span>
          </div>
        </div>
      </Card>

      {/* Detailed Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card className="p-4 bg-white shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">Last Watering</p>
              <p className="text-sm text-gray-600">
                {systemData.lastWatering.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.floor((Date.now() - systemData.lastWatering.getTime()) / (1000 * 60 * 60))} hours ago
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white shadow-sm">
          <div className="flex items-start gap-3">
            {systemData.lastError ? (
              <>
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Last Error</p>
                  <p className="text-sm text-orange-700">{systemData.lastError}</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">System Health</p>
                  <p className="text-sm text-green-700">No errors detected</p>
                  <p className="text-xs text-gray-500 mt-1">All systems running normally</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
