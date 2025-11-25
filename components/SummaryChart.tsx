import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrencyShort } from '../utils/formatters';

interface SummaryChartProps {
  landCost: number;
  stampDuty: number;
  development: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export const SummaryChart: React.FC<SummaryChartProps> = ({ landCost, stampDuty, development }) => {
  
  const data = [
    { name: 'Net Land Cost', value: landCost },
    { name: 'Govt. Stamp/Reg', value: stampDuty },
    { name: 'Development/Overheads', value: development },
  ].filter(d => d.value > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrencyShort(value)}
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};