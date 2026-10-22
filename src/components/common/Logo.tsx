import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  variant?: 'full' | 'mark' | 'image';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
  variant = 'full',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const imageSizes = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-14',
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-bold',
    lg: 'text-2xl font-bold',
    xl: 'text-3xl font-extrabold',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  if (variant === 'image') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <img
          src="/medisync-logo.png"
          alt="MediSync Logo"
          className={`${imageSizes[size]} object-contain`}
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* MediSync Stylized Emblem */}
      <div className={`${iconSizes[size]} rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white shadow-xs border border-brand-border/60`}>
        <img
          src="/medisync-logo.png"
          alt="MediSync"
          className="w-full h-full object-cover scale-110"
        />
      </div>

      {/* Brand Typography & Tagline */}
      <div className="flex flex-col leading-tight">
        <div className={`tracking-tight ${textSizes[size]}`}>
          <span className="text-[#0F2942]">Medi</span>
          <span className="text-[#00A896]">Sync</span>
        </div>
        {showTagline && (
          <span className={`text-[#647067] font-medium tracking-tight ${taglineSizes[size]}`}>
            Smarter Pharmacy. Healthier Tomorrow.
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
