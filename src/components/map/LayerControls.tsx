// OMNISCIENT Layer Controls
// Toggle data layers on/off

import { motion } from 'framer-motion';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import type { MapLayer, DataCategory } from '@/types/omniscient';

interface LayerControlsProps {
  layers: MapLayer[];
  onToggle: (layerId: string) => void;
  className?: string;
}

const CATEGORY_ICONS: Record<DataCategory, string> = {
  GEOSPATIAL: '📍',
  WILDLIFE: '🦆',
  WEATHER: '🌤️',
  REGULATIONS: '📋',
  TRANSPORTATION: '🚢',
  DEMOGRAPHICS: '👥',
  ECONOMIC: '💰',
  IMAGERY: '🛰️',
  GOVERNMENT: '🏛️',
  MARINE: '⚓',
};

export function LayerControls({ layers, onToggle, className = '' }: LayerControlsProps) {
  if (!layers.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border border-white/10 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 text-white/80">
        <Layers className="w-4 h-4" />
        <span className="text-sm font-medium">Data Layers</span>
      </div>

      <div className="space-y-2">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
              layer.visible
                ? 'bg-white/10 text-white'
                : 'bg-transparent text-white/50 hover:bg-white/5'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: layer.visible ? layer.color : '#6B7280' }}
            />
            <span className="text-sm">
              {CATEGORY_ICONS[layer.category]} {layer.name}
            </span>
            <span className="ml-auto text-xs text-white/40">
              {layer.features.length}
            </span>
            {layer.visible ? (
              <Eye className="w-4 h-4 text-white/60" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/40" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
