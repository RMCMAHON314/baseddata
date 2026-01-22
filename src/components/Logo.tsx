// Based Data Logo - Stacked, right-aligned with chevron

import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';

export const Logo = forwardRef<HTMLSpanElement, { className?: string }>(
  ({ className = "" }, ref) => {
    return (
      <span 
        ref={ref}
        className={className}
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: '18px',
          letterSpacing: '-0.02em',
          color: '#3366FF',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          lineHeight: 1.1,
        }}
      >
        <span>based</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          <ChevronRight size={16} strokeWidth={2.5} />
          data
        </span>
      </span>
    );
  }
);

Logo.displayName = 'Logo';
