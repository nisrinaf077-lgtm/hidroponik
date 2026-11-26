import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useId } from 'react';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  status?: 'normal' | 'warning' | 'critical';
  chartData?: Array<{ value: number }>;
  chartLabel?: string;
}

export function SensorCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  status = 'normal',
  chartData,
  chartLabel = 'Grafik 2,0 jam terakhir',
}: SensorCardProps) {
  const gradientId = useId();

  const statusColors = {
    normal: 'text-[#059669] bg-[#ECFDF5] border-[#345C56]',
    warning: 'text-amber-700 bg-amber-50 border-amber-600',
    critical: 'text-[#8F2D4A] bg-[#FDF2F4] border-[#8F2D4A]',
  };

  const statusBadge = {
    normal: { label: 'Optimal', cls: 'bg-[#ECFDF5] text-[#047857] border-[#345C56]' },
    warning: { label: 'Peringatan', cls: 'bg-amber-50 text-amber-700 border-amber-600' },
    critical: { label: 'Kritis', cls: 'bg-[#FDF2F4] text-[#8F2D4A] border-[#8F2D4A]' },
  };

  const chartColors = {
    normal: '#059669',
    warning: '#d97706',
    critical: '#8F2D4A',
  };

  return (
    <Card className="p-5 bg-white rounded-[24px] border-2 border-[#345C56] shadow-[0_4px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_12px_rgba(52,92,86,0.14)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-[16px] border ${statusColors[status]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${statusBadge[status].cls}`}>
          {statusBadge[status].label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#71717A]">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-['Space_Grotesk'] text-[30px] leading-[36px] font-bold tracking-[-0.6px] text-[#18181B] tabular-nums">
            {value}
          </span>
          {unit && <span className="text-[14px] font-medium text-[#A1A1AA]">{unit}</span>}
        </div>
        <p className="text-[12px] leading-[16px] text-[#71717A] min-h-[16px]">
          {subtitle || '\u00A0'}
        </p>
      </div>

      {chartData && chartData.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-[56px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[status]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={chartColors[status]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColors[status]}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[12px] leading-[16px] text-[#A1A1AA]">{chartLabel}</p>
        </div>
      )}
    </Card>
  );
}
