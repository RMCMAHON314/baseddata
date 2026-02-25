// BASED DATA Logo — single horizontal format with chevron
import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ className = "", size = 'md' }, ref) => {
    const sizeMap = {
      sm: { icon: 'w-4 h-4', text: 'text-base' },
      md: { icon: 'w-5 h-5', text: 'text-lg' },
      lg: { icon: 'w-7 h-7', text: 'text-2xl' },
    };
    const s = sizeMap[size];

    return (
      <div ref={ref} className={`flex items-center gap-1.5 ${className}`}>
        <ChevronRight className={`${s.icon} text-primary`} strokeWidth={3} />
        <span
          className={`${s.text} font-bold text-primary lowercase tracking-tight`}
          style={{ letterSpacing: '-0.02em' }}
        >
          based data
        </span>
      </div>
    );
  }
);

Logo.displayName = 'Logo';