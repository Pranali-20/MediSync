import React from 'react';
import { StockStatus, ExpiryStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'stock' | 'expiry' | 'category' | 'rx' | 'custom';
  status?: StockStatus | ExpiryStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'custom',
  status,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  // Stock status styles
  if (variant === 'stock' || status === 'Healthy' || status === 'Low' || status === 'Critical' || status === 'Out of Stock') {
    const currentStatus = status || children;
    if (currentStatus === 'Healthy') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Healthy
        </span>
      );
    }
    if (currentStatus === 'Low') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Low
        </span>
      );
    }
    if (currentStatus === 'Critical') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Critical
        </span>
      );
    }
    if (currentStatus === 'Out of Stock') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 font-medium ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
          Out of Stock
        </span>
      );
    }
  }

  // Expiry status styles
  if (variant === 'expiry' || status === 'Normal' || status === 'Monitor' || status === 'Near Expiry' || status === 'Expired') {
    const currentStatus = status || children;
    if (currentStatus === 'Normal') {
      return (
        <span className={`inline-flex items-center rounded-md bg-green-50 text-green-700 border border-green-200 ${sizeClasses} ${className}`}>
          Normal
        </span>
      );
    }
    if (currentStatus === 'Monitor') {
      return (
        <span className={`inline-flex items-center rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200 ${sizeClasses} ${className}`}>
          Monitor (&lt;90d)
        </span>
      );
    }
    if (currentStatus === 'Near Expiry') {
      return (
        <span className={`inline-flex items-center rounded-md bg-amber-50 text-amber-700 border border-amber-300 font-semibold ${sizeClasses} ${className}`}>
          ⚠️ Near Expiry (&lt;30d)
        </span>
      );
    }
    if (currentStatus === 'Expired') {
      return (
        <span className={`inline-flex items-center rounded-md bg-red-50 text-red-700 border border-red-200 font-semibold ${sizeClasses} ${className}`}>
          🔴 Expired
        </span>
      );
    }
  }

  // Prescription tag
  if (variant === 'rx') {
    return (
      <span className={`inline-flex items-center font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses} ${className}`}>
        Rx Required
      </span>
    );
  }

  // Category pill
  if (variant === 'category') {
    return (
      <span className={`inline-flex items-center rounded-full bg-brand-subtle text-[#475569] border border-gray-200 ${sizeClasses} ${className}`}>
        {children || status}
      </span>
    );
  }

  // Custom fallback
  return (
    <span className={`inline-flex items-center rounded-md bg-gray-100 text-gray-700 ${sizeClasses} ${className}`}>
      {children || status}
    </span>
  );
};
