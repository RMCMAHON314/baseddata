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
  ENERGY: '⚡',
  HEALTH: '🏥',
  HEALTHCARE: '🩺',
  RECREATION: '🏕️',
  RESEARCH: '🔬',
  ENVIRONMENTAL: '🌍',
  FINANCIAL: '🏦',
  CORPORATE: '🏢',
  EDUCATION: '🎓',
  FOOD: '🍽️',
  HOUSING: '🏠',
  PATENTS: '💡',
};

export function LayerControls({ layers, onToggle, className = '' }: LayerControlsProps) {
  if (!layers.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-card/90 backdrop-blur-sm rounded-xl border border-border/60 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
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
                ? 'bg-secondary/60 text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-secondary/40'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: layer.visible ? layer.color : '#6B7280' }}
            />
            <span className="text-sm">
              {CATEGORY_ICONS[layer.category]} {layer.name}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {layer.features.length}
            </span>
            {layer.visible ? (
              <Eye className="w-4 h-4 text-muted-foreground" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
