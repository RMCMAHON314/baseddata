// BASED DATA v8.0 - Premium Layer Panel
// Glass-morphism left sidebar with layer controls, opacity sliders, stats

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ChevronDown, Eye, EyeOff, Database, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { Slider } from '@/components/ui/slider';

interface PremiumLayerPanelProps {
  layers: MapLayer[];
  onToggle: (layerId: string) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  totalFeatures: number;
  sourcesCount: number;
  className?: string;
}

const LAYER_ICONS: Record<string, string> = {
  wildlife: '🦅',
  weather: '🌤️',
  marine: '🌊',
  regulations: '📜',
  government: '🏛️',
  geospatial: '🗺️',
  transportation: '✈️',
  health: '🏥',
  energy: '⚡',
  economic: '💰',
  recreation: '🏕️',
  demographics: '👥',
  research: '🔬',
};

export function PremiumLayerPanel({
  layers,
  onToggle,
  onOpacityChange,
  totalFeatures,
  sourcesCount,
  className,
}: PremiumLayerPanelProps) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  const visibleCount = layers.filter(l => l.visible).length;
  const visibleFeatures = layers
    .filter(l => l.visible)
    .reduce((sum, l) => sum + (l.features?.length || 0), 0);

  return (
    <aside
      className={cn(
        "w-[280px] h-full flex flex-col map-panel-glass border-r overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex-none p-5 border-b border-white/10">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Data Layers
        </h2>
        <p className="text-white/50 text-sm mt-1">
          {totalFeatures.toLocaleString()} features loaded
        </p>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {layers.map((layer, i) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              index={i}
              isExpanded={expandedLayer === layer.id}
              onToggle={() => onToggle(layer.id)}
              onExpand={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
              onOpacityChange={onOpacityChange}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="flex-none p-4 border-t border-white/10 bg-white/5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{sourcesCount}</p>
            <p className="text-xs text-white/50">Sources</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400">{visibleCount}</p>
            <p className="text-xs text-white/50">Active Layers</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Visible Features</span>
            <span className="text-white font-medium">{visibleFeatures.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalFeatures > 0 ? `${(visibleFeatures / totalFeatures) * 100}%` : '0%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

interface LayerCardProps {
  layer: MapLayer;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
}

function LayerCard({ layer, index, isExpanded, onToggle, onExpand, onOpacityChange }: LayerCardProps) {
  const [opacity, setOpacity] = useState(100);
  const color = layer.color || CATEGORY_COLORS[layer.category as string] || '#3B82F6';
  const icon = LAYER_ICONS[layer.id.toLowerCase()] || LAYER_ICONS[layer.category?.toLowerCase() || ''] || '📊';
  const count = layer.features?.length || 0;

  const glowColor = `${color}66`; // 40% opacity

  const handleOpacity = (value: number[]) => {
    setOpacity(value[0]);
    onOpacityChange?.(layer.id, value[0] / 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "layer-card group",
        layer.visible ? "layer-card-active" : "layer-card-inactive"
      )}
    >
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Color indicator with glow */}
          <div
            className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-black/50 transition-shadow duration-300"
            style={{
              backgroundColor: color,
              boxShadow: layer.visible ? `0 0 12px ${glowColor}, 0 0 0 2px ${color}` : `0 0 0 2px ${color}`,
            }}
          />
          {/* Icon & Name */}
          <span className="text-lg">{icon}</span>
          <span className="text-white font-medium text-sm">{layer.name}</span>
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium transition-colors",
              layer.visible
                ? "bg-white/20 text-white"
                : "bg-white/10 text-white/50"
            )}
          >
            {count.toLocaleString()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            {layer.visible ? (
              <Eye className="w-4 h-4 text-white/70" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/40" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Controls */}
      <AnimatePresence>
        {layer.visible && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                <span>Opacity</span>
                <span>{opacity}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={handleOpacity}
                max={100}
                min={10}
                step={5}
                className="w-full"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand button for visible layers */}
      {layer.visible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="w-full mt-2 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      )}
    </motion.div>
  );
}
