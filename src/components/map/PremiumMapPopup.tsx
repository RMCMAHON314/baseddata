// BASED DATA v8.0 - Premium Map Popup
// Hover and click popups with glass morphism styling

import { motion } from 'framer-motion';
import { X, ExternalLink, Clock, MapPin, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PremiumMapPopupProps {
  feature: GeoJSONFeature;
  type?: 'hover' | 'detail';
  onClose?: () => void;
  className?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  WILDLIFE: '🦅',
  WEATHER: '🌤️',
  MARINE: '🌊',
  REGULATIONS: '📜',
  GOVERNMENT: '🏛️',
  GEOSPATIAL: '🗺️',
  TRANSPORTATION: '✈️',
  HEALTH: '🏥',
  ENERGY: '⚡',
  ECONOMIC: '💰',
  RECREATION: '🏕️',
};

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

function formatCoords(coords: number[]): string {
  if (!coords || coords.length < 2) return '';
  return `${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°`;
}

export function PremiumHoverPopup({ feature, className }: PremiumMapPopupProps) {
  const props = feature.properties;
  const category = String(props.category || 'OTHER');
  const color = CATEGORY_COLORS[category] || '#3B82F6';
  const title = String(props.name || props.title || props.species || 'Unknown');
  const description = String(props.description || '');
  const source = String(props.source || '');
  const timestamp = props.timestamp as string | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={cn(
        "map-popup p-4 min-w-[200px] max-w-[300px]",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-white/50 uppercase tracking-wide">
          {category}
        </span>
      </div>
      
      <h3 className="text-white font-semibold line-clamp-2">{title}</h3>
      
      {description && (
        <p className="text-white/60 text-sm mt-1 line-clamp-2">
          {description}
        </p>
      )}
      
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
        <span className="text-xs text-white/40">{source}</span>
        {timestamp && (
          <>
            <span className="text-xs text-white/20">•</span>
            <span className="text-xs text-white/40">{formatTime(timestamp)}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function PremiumDetailPanel({ feature, onClose, className }: PremiumMapPopupProps) {
  const props = feature.properties;
  const category = String(props.category || 'OTHER');
  const color = CATEGORY_COLORS[category] || '#3B82F6';
  const title = String(props.name || props.title || props.species || 'Unknown');
  const description = String(props.description || '');
  const source = String(props.source || '');
  const timestamp = props.timestamp as string | undefined;
  const sourceUrl = String(props.source_url || props.source_record_url || '');
  const coords = feature.geometry?.type === 'Point' 
    ? feature.geometry.coordinates as number[] 
    : null;
  const emoji = CATEGORY_EMOJI[category] || '📊';

  const handleCopyLink = () => {
    const link = sourceUrl || window.location.href;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(feature, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Record exported');
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "fixed right-0 top-0 bottom-0 w-[400px] bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto",
        className
      )}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 z-10 transition-colors"
      >
        <X className="w-5 h-5 text-white/50" />
      </button>

      {/* Header with Emoji */}
      <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center">
        <span className="text-6xl">{emoji}</span>
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: `radial-gradient(circle at center, ${color}40, transparent 70%)` 
          }}
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {category}
          </span>
          <span className="text-white/30 text-xs">{source}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p className="text-white/70 leading-relaxed mb-6">
            {description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {timestamp && (
            <div className="p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Timestamp
              </div>
              <p className="text-white font-medium text-sm">
                {new Date(timestamp).toLocaleString()}
              </p>
            </div>
          )}
          {coords && (
            <div className="p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <MapPin className="w-3 h-3" />
                Location
              </div>
              <p className="text-white font-medium font-mono text-sm">
                {formatCoords(coords)}
              </p>
            </div>
          )}
        </div>

        {/* Raw Data Accordion */}
        <details className="group mb-6">
          <summary className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="text-white/70 text-sm">Raw Data</span>
            <span className="text-white/50 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <pre className="mt-2 p-4 rounded-xl bg-black/50 text-xs text-white/50 overflow-x-auto max-h-64 scrollbar-hide">
            {JSON.stringify(props, null, 2)}
          </pre>
        </details>

        {/* Source Link */}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-6 group"
          >
            <ExternalLink className="w-4 h-4 text-white/50 group-hover:text-cyan-400" />
            <span className="text-white/70 text-sm group-hover:text-cyan-400 truncate flex-1">
              View Source
            </span>
          </a>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            onClick={handleCopyLink}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
