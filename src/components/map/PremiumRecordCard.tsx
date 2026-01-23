// BASED DATA v9.0 - Premium Record Card
// High-fidelity display: real names, addresses, descriptions - no generic "POI"

import * as React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';

interface PremiumRecordCardProps {
  record: GeoJSONFeature;
  index: number;
  id?: string;
  isSelected?: boolean;
  isHovered?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
  className?: string;
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function formatCoords(coords: number[]): string {
  if (!coords || coords.length < 2) return '';
  return `${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°`;
}

export const PremiumRecordCard = React.forwardRef<HTMLDivElement, PremiumRecordCardProps>(
  (
    {
      record,
      index,
      id,
      isSelected,
      isHovered,
      onHover,
      onHoverEnd,
      onClick,
      className,
    },
    ref
  ) => {
    const props = record.properties;
    const category = String(props.category || 'OTHER');
    const color = CATEGORY_COLORS[category] || '#3B82F6';
    // Smart name extraction - prefer actual names, with fallback indicators
    const hasOfficialName = !!props.has_official_name;
    const title = String(
      props.name && props.name !== 'POI' && props.name !== 'Unknown' 
        ? props.name 
        : props.title || props.fullName || props.facility_name || props.species || 'Unnamed Location'
    );
    
    const source = String(props.source || '');
    const timestamp = props.timestamp as string | undefined;
    const quality = Number(props.confidence || props.quality || 0.5);
    const sourceUrl = String(props.source_url || props.source_record_url || props.website || '');
    const coords = record.geometry?.type === 'Point'
      ? (record.geometry.coordinates as number[])
      : null;
    
    // Rich metadata for display
    const operator = props.operator ? String(props.operator) : undefined;
    const address = props.address ? String(props.address) : undefined;
    const sport = props.sport ? String(props.sport) : undefined;
    const leisureType = props.leisure_type ? String(props.leisure_type).replace(/_/g, ' ') : undefined;
    const surface = props.surface ? String(props.surface) : undefined;
    const description = String(props.description || '');
    
    // Build a rich subtitle with most useful info first
    const subtitleParts: string[] = [];
    if (operator) subtitleParts.push(operator);
    if (address) subtitleParts.push(address);
    if (sport && !title.toLowerCase().includes(sport)) subtitleParts.push(`${sport} facility`);
    if (surface) subtitleParts.push(surface);
    if (leisureType && !subtitleParts.length) subtitleParts.push(leisureType);
    if (!subtitleParts.length && description) subtitleParts.push(description);
    const subtitle = subtitleParts.slice(0, 2).join(' • ');

    return (
      <motion.div
        ref={ref}
        id={id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.015, 0.3) }}
        className={cn(
          "record-card group transition-all duration-200",
          isSelected && "ring-2 ring-cyan-500 ring-offset-2 ring-offset-black",
          isHovered && !isSelected && "bg-white/15 border-cyan-500/50 scale-[1.01]",
          className
        )}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
              {category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">{source}</span>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white/30 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Title + Official Name Badge */}
        <div className="flex items-center gap-2 mt-2">
          <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors line-clamp-2 flex-1">
            {title}
          </h3>
          {hasOfficialName && (
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
              VERIFIED
            </span>
          )}
        </div>
        
        {/* Subtitle/Description - prioritize operator and address */}
        {subtitle && (
          <p className="text-xs text-white/60 mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
          {timestamp && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(timestamp)}
            </span>
          )}
          {coords && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {formatCoords(coords)}
            </span>
          )}
        </div>

        {/* Quality Indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${quality * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.02 }}
            />
          </div>
          <span className="text-xs text-emerald-400">
            {Math.round(quality * 100)}%
          </span>
        </div>
      </motion.div>
    );
  }
);

PremiumRecordCard.displayName = 'PremiumRecordCard';
