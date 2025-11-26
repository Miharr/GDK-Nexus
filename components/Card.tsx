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
    <div className={`neu-flat overflow-hidden p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="neu-icon w-10 h-10 text-safety-500">
              {icon}
            </div>
          )}
          <h3 className="font-bold text-slate-700 text-lg">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="text-slate-600">
        {children}
      </div>
    </div>
  );
};