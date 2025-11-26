import React, { ReactNode } from 'react';

interface CardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, className = '', action }) => {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          {icon && <span className="text-safety-500">{icon}</span>}
          <h3 className="font-semibold text-slate-200 tracking-wide">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};