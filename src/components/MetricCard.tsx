import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  colorClass: string;
  sparklineData?: { value: number }[];
  sparklineColor?: string;
}

export default function MetricCard({
  id,
  title,
  value,
  subtext,
  icon,
  colorClass,
  sparklineData,
  sparklineColor,
}: MetricCardProps) {
  return (
    <div
      id={id}
      className="bg-white border border-slate-200/80 rounded-xl p-4 hover:border-slate-300 shadow-3xs transition-all duration-300 flex flex-col justify-between group h-full space-y-2.5"
    >
      <div className="flex items-start justify-between w-full">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-sans tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClass} transition-all duration-300 group-hover:scale-105 flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {sparklineData && sparklineData.length > 0 ? (
        <div className="h-8 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
              <defs>
                <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparklineColor || '#6366f1'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={sparklineColor || '#6366f1'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColor || '#6366f1'}
                strokeWidth={1.5}
                fillOpacity={1}
                fill={`url(#gradient-${id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        subtext && <p className="text-[10px] text-slate-500 font-bold leading-normal truncate">{subtext}</p>
      )}
    </div>
  );
}
