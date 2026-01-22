// OMNISCIENT Feature Popup
// Displays details when clicking on map features

import { motion } from 'framer-motion';
import { X, ExternalLink, MapPin, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import type { GeoJSONFeature, DataCategory } from '@/types/omniscient';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium text-white/60 uppercase">
              {category.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-white">
            {properties.name || 'Unknown'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {properties.description && (
          <p className="text-sm text-white/70">{properties.description}</p>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {coords && (
            <div className="flex items-center gap-1.5 text-white/50">
              <MapPin className="w-3 h-3" />
              <span>{coords[1].toFixed(4)}, {coords[0].toFixed(4)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/50">
            <Database className="w-3 h-3" />
            <span>{properties.source}</span>
          </div>
          {properties.timestamp && (
            <div className="flex items-center gap-1.5 text-white/50">
              <Clock className="w-3 h-3" />
              <span>{new Date(properties.timestamp).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Attributes */}
        {properties.attributes && Object.keys(properties.attributes).length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs font-medium text-white/60 mb-2">Additional Data</p>
            <div className="space-y-1">
              {Object.entries(properties.attributes).slice(0, 6).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-white/50 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium">
                    {typeof value === 'number' 
                      ? value.toLocaleString()
                      : String(value).slice(0, 30)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {properties.url && (
        <div className="px-4 py-3 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(properties.url, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Source
          </Button>
        </div>
      )}
    </motion.div>
  );
}
