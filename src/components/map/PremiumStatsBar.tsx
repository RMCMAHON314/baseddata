// BASED DATA v8.0 - Premium Stats Bar
// Bottom bar with live stats, cursor coordinates, timing

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumStatsBarProps {
  totalRecords: number;
  sourcesCount: number;
  successRate: number;
  cursorCoords: { lng: number; lat: number } | null;
  queryTimeMs: number;
  renderTimeMs?: number;
  className?: string;
}

export function PremiumStatsBar({
  totalRecords,
  sourcesCount,
  successRate,
  cursorCoords,
  queryTimeMs,
  renderTimeMs = 0,
  className,
}: PremiumStatsBarProps) {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "h-12 map-stats-bar flex items-center justify-between px-6",
        className
      )}
    >
      {/* Left Stats */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-white/50">
          <span className="text-white font-medium">
            {totalRecords.toLocaleString()}
          </span>{' '}
          records
        </span>
        <span className="text-white/50">
          <span className="text-white font-medium">{sourcesCount}</span> sources
        </span>
        <span className="text-white/50">
          <span className="text-emerald-400 font-medium">
            {Math.round(successRate)}%
          </span>{' '}
          success
        </span>
      </div>

      {/* Center - Coordinates */}
      <div className="text-white/30 text-xs font-mono">
        {cursorCoords
          ? `${cursorCoords.lat.toFixed(5)}, ${cursorCoords.lng.toFixed(5)}`
          : '—'}
      </div>

      {/* Right - Timing */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white/50">
          Query:{' '}
          <span className="text-cyan-400 font-medium">{queryTimeMs}ms</span>
        </span>
        {renderTimeMs > 0 && (
          <span className="text-white/50">
            Render:{' '}
            <span className="text-emerald-400 font-medium">{renderTimeMs}ms</span>
          </span>
        )}
      </div>
    </motion.footer>
  );
}
