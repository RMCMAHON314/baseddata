// BASED DATA v8.1 - Premium Stats Bar
// Bottom bar with live stats, cursor coordinates, timing, premium aesthetic

import { motion } from 'framer-motion';
import { Database, Zap, CheckCircle, MapPin } from 'lucide-react';
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
      transition={{ delay: 0.3, duration: 0.4 }}
      className={cn(
        "h-12 map-stats-bar flex items-center justify-between px-6",
        className
      )}
    >
      {/* Left Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-white/50">
            <span className="text-white font-semibold tabular-nums">
              {totalRecords.toLocaleString()}
            </span>{' '}
            records
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-white/50">
            <span className="text-white font-semibold tabular-nums">{sourcesCount}</span> sources
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-white/50">
            <span className="text-emerald-400 font-semibold tabular-nums">
              {Math.round(successRate)}%
            </span>{' '}
            success
          </span>
        </div>
      </div>

      {/* Center - Coordinates */}
      <div className="flex items-center gap-2 text-white/30 text-xs font-mono">
        <MapPin className="w-3 h-3" />
        {cursorCoords
          ? `${cursorCoords.lat.toFixed(5)}°, ${cursorCoords.lng.toFixed(5)}°`
          : 'Hover map for coords'}
      </div>

      {/* Right - Timing */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white/50">
          Pipeline:{' '}
          <span className="text-cyan-400 font-semibold tabular-nums">{(queryTimeMs / 1000).toFixed(1)}s</span>
        </span>
        {renderTimeMs > 0 && (
          <span className="text-white/50">
            Render:{' '}
            <span className="text-emerald-400 font-semibold tabular-nums">{renderTimeMs}ms</span>
          </span>
        )}
      </div>
    </motion.footer>
  );
}
