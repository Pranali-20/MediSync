import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'danger' | 'warning' | 'success';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  onClick,
}) => {
  const iconBackgrounds = {
    default: 'bg-pharmagreen-50 text-pharmagreen-700 border-pharmagreen-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-brand-border p-5 shadow-card hover:shadow-card-hover transition-all duration-150 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">{title}</span>
          <span className="text-2xl font-bold text-brand-text mt-1.5">{value}</span>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center border ${iconBackgrounds[variant]}`}
        >
          {icon}
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-xs text-brand-muted">
          {trend && (
            <span
              className={`font-semibold mr-1.5 flex items-center gap-0.5 ${
                trend.isPositive ? 'text-pharmagreen-600' : 'text-brand-danger'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          <span>{trend?.label || subtitle}</span>
        </div>
      )}
    </div>
  );
};
