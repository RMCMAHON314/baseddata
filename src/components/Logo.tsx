// BASED DATA Logo
// Stacked right-aligned branding with chevron

import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'compact';
}

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ className = "", variant = 'full' }, ref) => {
    // Icon only variant
    if (variant === 'icon') {
      return (
        <div ref={ref} className={`flex items-center justify-center ${className}`}>
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <ChevronRight className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </div>
        </div>
      );
    }

    // Compact horizontal variant
    if (variant === 'compact') {
      return (
        <div ref={ref} className={`flex items-center gap-1.5 ${className}`}>
          <ChevronRight className="w-5 h-5 text-primary" strokeWidth={3} />
          <span 
            className="text-lg font-bold text-primary lowercase tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            based data
          </span>
        </div>
      );
    }

    // Full stacked variant (default)
    return (
      <div 
        ref={ref}
        className={`flex flex-col items-end ${className}`}
      >
        <span 
          className="text-lg font-bold text-primary lowercase leading-none"
          style={{ letterSpacing: '-0.02em' }}
        >
          based
        </span>
        <div className="flex items-center">
          <ChevronRight className="w-4 h-4 text-primary -mr-0.5" strokeWidth={3} />
          <span 
            className="text-lg font-bold text-primary lowercase leading-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            data
          </span>
        </div>
      </div>
    );
  }
);

Logo.displayName = 'Logo';