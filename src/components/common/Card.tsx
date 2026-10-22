import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  title,
  subtitle,
  action,
  noPadding = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-brand-border shadow-card transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:shadow-card-hover hover:border-gray-300' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div>
            {title && <h3 className="font-semibold text-base text-[#166534]">{title}</h3>}
            {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};
