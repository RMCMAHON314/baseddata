// OMNISCIENT Logo
// Universal Data Pipeline branding

import { forwardRef } from 'react';
import { Globe } from 'lucide-react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ className = "", variant = 'full' }, ref) => {
  if (variant === 'icon') {
    return (
      <div ref={ref} className={`flex items-center justify-center ${className}`}>
        <Globe className="w-7 h-7 text-primary" />
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={`flex items-center gap-2 ${className}`}
    >
      <Globe className="w-7 h-7 text-primary" />
      <span 
        className="text-xl font-bold tracking-tight text-foreground"
        style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
          }}
        >
          OMNISCIENT
        </span>
      </div>
    );
  }
);

Logo.displayName = 'Logo';
