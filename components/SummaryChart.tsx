import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrencyShort } from '../utils/formatters';

interface SummaryChartProps {
  landCost: number;
  stampDuty: number;
  development: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export const SummaryChart: React.FC<SummaryChartProps> = ({ landCost, stampDuty, development }) => {
  
  const data = [
    { name: 'Net Land Cost', value: landCost },
    { name: 'Govt. Stamp/Reg', value: stampDuty },
    { name: 'Overheads', value: development },
  ].filter(d => d.value > 0);

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrencyShort(value)}
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-xs font-medium text-slate-500 ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};