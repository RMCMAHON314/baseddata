// BASED DATA v7.0 - Feature Popup
// Displays details when clicking on map features with clickable source links

import { motion } from 'framer-motion';
import { X, ExternalLink, MapPin, Clock, Database, FileText, Globe, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import type { GeoJSONFeature, DataCategory } from '@/types/omniscient';
import { findSourceInfo } from '@/types/omniscient';

interface FeaturePopupProps {
  feature: GeoJSONFeature | null;
  onClose: () => void;
}

export function FeaturePopup({ feature, onClose }: FeaturePopupProps) {
  if (!feature) return null;

  const { properties } = feature;
  const category = properties.category as DataCategory;
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.GEOSPATIAL;

  // Get coordinates for display
  const coords = feature.geometry.type === 'Point' 
    ? feature.geometry.coordinates as [number, number]
    : null;

  // Find source info from registry
  const sourceInfo = findSourceInfo(properties.source);
  
  // Determine URLs - prioritize explicit properties, fallback to registry
  const sourceWebsiteUrl = properties.source_url || sourceInfo?.website_url;
  const sourceDocsUrl = properties.api_documentation_url || sourceInfo?.documentation_url;
  const recordUrl = properties.source_record_url || properties.url;
  const sourceEmoji = sourceInfo?.logo_emoji || '📊';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-4 left-4 right-4 md:right-auto md:w-[420px] bg-card/95 backdrop-blur-xl rounded-xl border border-border overflow-hidden z-50 shadow-2xl"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between bg-secondary/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-card"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-foreground truncate pr-2">
            {properties.name || 'Unknown'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {properties.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{properties.description}</p>
        )}

        {/* Source Info Card */}
        <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{sourceEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {sourceInfo?.name || properties.source}
              </p>
              <p className="text-xs text-muted-foreground">
                {sourceInfo?.description || 'Data source'}
              </p>
            </div>
            {sourceInfo && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                <span>{Math.round(sourceInfo.reliability * 100)}%</span>
              </div>
            )}
          </div>
          
          {/* Source Links */}
          <div className="flex flex-wrap gap-2">
            {sourceWebsiteUrl && (
              <a
                href={sourceWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
              >
                <Globe className="w-3 h-3" />
                Visit Source
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {sourceDocsUrl && (
              <a
                href={sourceDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs font-medium transition-colors"
              >
                <FileText className="w-3 h-3" />
                API Docs
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {coords && (
            <div className="flex items-center gap-2 text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono">{coords[1].toFixed(4)}, {coords[0].toFixed(4)}</span>
            </div>
          )}
          {properties.timestamp && (
            <div className="flex items-center gap-2 text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{new Date(properties.timestamp).toLocaleDateString()}</span>
            </div>
          )}
          {properties.confidence !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 col-span-2">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>Confidence:</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-success rounded-full transition-all" 
                  style={{ width: `${(properties.confidence as number) * 100}%` }}
                />
              </div>
              <span className="font-medium text-foreground">
                {Math.round((properties.confidence as number) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Attributes */}
        {properties.attributes && Object.keys(properties.attributes).length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Additional Data</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
              {Object.entries(properties.attributes).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs gap-2">
                  <span className="text-muted-foreground capitalize truncate">{key.replace(/_/g, ' ')}</span>
                  <span className="text-foreground font-medium text-right truncate max-w-[150px]">
                    {typeof value === 'number' 
                      ? value.toLocaleString()
                      : String(value).slice(0, 40)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="px-4 py-3 border-t border-border bg-secondary/30 flex gap-2">
        {recordUrl && (
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => window.open(String(recordUrl), '_blank')}
          >
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            View Original Record
            <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        )}
        {!recordUrl && sourceWebsiteUrl && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => window.open(sourceWebsiteUrl, '_blank')}
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Explore {sourceInfo?.name || 'Source'}
            <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}