import React from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface StatsChartProps {
  type: 'area' | 'bar';
  data: any[];
  dataKey: string;
  categoryKey: string;
  height?: number;
}

export const StatsChart: React.FC<StatsChartProps> = ({ type, data, dataKey, categoryKey, height = 220 }) => {
  const commonProps = {
    margin: { top: 10, right: 10, left: -20, bottom: 0 },
    data
  };

  const chartColor = 'var(--accent)'; 

  return (
    // Explicit pixel height is required — Recharts ResponsiveContainer
    // cannot resolve percentage heights inside flex containers (reports -1).
    <div style={{ width: '100%', height: `${height}px` }}>
    <ResponsiveContainer width="100%" height="100%">
      {type === 'area' ? (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container-high)" vertical={false} />
          <XAxis 
            dataKey={categoryKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface-container)', border: '1px solid var(--surface-container-high)', borderRadius: 0 }}
            itemStyle={{ color: 'var(--primary)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={chartColor} 
            fill={chartColor} 
            fillOpacity={0.1} 
            strokeWidth={2}
          />
        </AreaChart>
      ) : (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container-high)" vertical={false} />
          <XAxis 
            dataKey={categoryKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
          />
          <Tooltip 
            cursor={{ fill: 'var(--surface-container-high)' }}
            contentStyle={{ backgroundColor: 'var(--surface-container)', border: '1px solid var(--surface-container-high)', borderRadius: 0 }}
          />
          <Bar dataKey={dataKey} fill={chartColor} radius={0} />
        </BarChart>
      )}
    </ResponsiveContainer>
    </div>
  );
};
