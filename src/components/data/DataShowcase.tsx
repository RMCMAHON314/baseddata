// BASED DATA v7.5 - ACTUAL DATA Showcase
// Shows REAL data: individual records, species, observations, actual values
// NOT just meta-charts about counts - the actual data itself!

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, MapPin, Star, Clock, Tag, Eye, 
  ChevronRight, Bird, Fish,
  TreeDeciduous, CloudRain, FileText, Waves,
  Thermometer, Wind, Droplets, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataShowcaseProps {
  features: GeoJSONFeature[];
  onFeatureClick?: (feature: GeoJSONFeature) => void;
  selectedCategory?: string | null;
  onSelectedCategoryChange?: (category: string | null) => void;
  selectedFeatureId?: string | null;
  className?: string;
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  WILDLIFE: <Bird className="w-4 h-4" />,
  MARINE: <Fish className="w-4 h-4" />,
  WEATHER: <CloudRain className="w-4 h-4" />,
  VEGETATION: <TreeDeciduous className="w-4 h-4" />,
  REGULATIONS: <FileText className="w-4 h-4" />,
  TIDES: <Waves className="w-4 h-4" />,
};

const CATEGORY_STYLES: Record<string, string> = {
  WILDLIFE: 'bg-success/10 text-success border-success/20',
  MARINE: 'bg-primary/10 text-primary border-primary/20',
  WEATHER: 'bg-warning/10 text-warning border-warning/20',
  REGULATIONS: 'bg-accent text-accent-foreground border-border',
  TIDES: 'bg-primary/10 text-primary border-primary/20',
};

// Helper to safely get property as string
function getProp(props: GeoJSONFeature['properties'], key: string, fallback = ''): string {
  const val = props[key];
  if (val === undefined || val === null) return fallback;
  return String(val);
}

// Helper to safely get property as number
function getNumProp(props: GeoJSONFeature['properties'], key: string, fallback = 0): number {
  const val = props[key];
  if (val === undefined || val === null) return fallback;
  return typeof val === 'number' ? val : Number(val) || fallback;
}

function getFeatureKey(feature: GeoJSONFeature): string {
  const props = feature.properties;
  const explicit = getProp(props, 'source_record_id') || getProp(props, 'id');
  if (explicit) return explicit;

  const name = getProp(props, 'name') || getProp(props, 'species') || getProp(props, 'title', 'Record');

  if (feature.geometry?.type === 'Point') {
    const coords = feature.geometry.coordinates as number[];
    const lng = Number(coords?.[0] ?? 0);
    const lat = Number(coords?.[1] ?? 0);
    return `${name}:${lng.toFixed(5)},${lat.toFixed(5)}`;
  }

  return `${name}:${JSON.stringify(feature.geometry?.coordinates ?? '').slice(0, 64)}`;
}

function toDomId(key: string): string {
  return `feat_${key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;
}

export function DataShowcase({
  features,
  onFeatureClick,
  selectedCategory: selectedCategoryProp,
  onSelectedCategoryChange,
  selectedFeatureId,
  className,
}: DataShowcaseProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uncontrolledCategory, setUncontrolledCategory] = useState<string | null>(null);

  const selectedCategory = selectedCategoryProp ?? uncontrolledCategory;
  const setSelectedCategory = onSelectedCategoryChange ?? setUncontrolledCategory;

  // Group and analyze features - showing ACTUAL DATA
  const showcase = useMemo(() => {
    // Featured records - top quality, most interesting
    const featured = features
      .filter(f => getNumProp(f.properties, 'confidence', 0) > 0.7)
      .slice(0, 6);

    // Group by species/type for wildlife
    const speciesMap = new Map<string, GeoJSONFeature[]>();
    const observationFeed: GeoJSONFeature[] = [];
    const weatherData: GeoJSONFeature[] = [];
    const regulations: GeoJSONFeature[] = [];
    const marineData: GeoJSONFeature[] = [];

    for (const f of features) {
      const cat = getProp(f.properties, 'category', 'OTHER');
      const name = getProp(f.properties, 'name') || getProp(f.properties, 'species', 'Unknown');
      
      if (cat === 'WILDLIFE') {
        const species = getProp(f.properties, 'species') || getProp(f.properties, 'common_name') || name;
        if (!speciesMap.has(species)) speciesMap.set(species, []);
        speciesMap.get(species)!.push(f);
        observationFeed.push(f);
      } else if (cat === 'WEATHER') {
        weatherData.push(f);
      } else if (cat === 'REGULATIONS') {
        regulations.push(f);
      } else if (cat === 'MARINE' || cat === 'TIDES') {
        marineData.push(f);
      } else {
        observationFeed.push(f);
      }
    }

    // Top species by observation count
    const topSpecies = Array.from(speciesMap.entries())
      .map(([name, obs]) => ({ name, count: obs.length, samples: obs.slice(0, 3) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Categories with counts
    const categoryCount: Record<string, number> = {};
    for (const f of features) {
      const cat = getProp(f.properties, 'category', 'OTHER');
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    return {
      featured,
      topSpecies,
      observationFeed: observationFeed.slice(0, 50),
      weatherData: weatherData.slice(0, 10),
      regulations: regulations.slice(0, 10),
      marineData: marineData.slice(0, 20),
      categories: Object.entries(categoryCount).sort((a, b) => b[1] - a[1]),
    };
  }, [features]);

  // Filter features by category
  const filteredFeatures = useMemo(() => {
    if (!selectedCategory) return features;
    return features.filter(f => getProp(f.properties, 'category') === selectedCategory);
  }, [features, selectedCategory]);

  // If selection comes from the map, make sure the correct category tab is visible
  // and scroll the matching card/row into view.
  useEffect(() => {
    if (!selectedFeatureId) return;

    const match = features.find((f) => getFeatureKey(f) === selectedFeatureId);
    const matchCat = match ? getProp(match.properties, 'category') : null;
    if (matchCat && selectedCategory !== matchCat) setSelectedCategory(matchCat);

    // Scroll after the DOM has a chance to render the right category section.
    window.requestAnimationFrame(() => {
      const el = document.getElementById(toDomId(selectedFeatureId));
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeatureId]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Category Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          className="h-8"
        >
          All ({features.length})
        </Button>
        {showcase.categories.slice(0, 5).map(([cat, count]) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => setSelectedCategory(cat)}
            className="h-8 gap-1.5"
          >
            {CATEGORY_ICONS[cat] || <Tag className="w-3.5 h-3.5" />}
            {cat} ({count})
          </Button>
        ))}
      </div>

      {/* FEATURED RECORDS - The actual data! */}
      {showcase.featured.length > 0 && !selectedCategory && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-warning" />
            Featured Records
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showcase.featured.map((feature, i) => (
          (() => {
            const fid = getFeatureKey(feature);
            const domId = toDomId(fid);
            const isSelected = selectedFeatureId === fid;
            return (
              <FeaturedCard
                key={fid || i}
                feature={feature}
                onClick={() => onFeatureClick?.(feature)}
                domId={domId}
                selected={isSelected}
              />
            );
          })()
            ))}
          </div>
        </section>
      )}

      {/* SPECIES GALLERY - Real species with counts */}
      {showcase.topSpecies.length > 0 && (!selectedCategory || selectedCategory === 'WILDLIFE') && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bird className="w-4 h-4 text-success" />
            Species Observed ({showcase.topSpecies.length} species)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {showcase.topSpecies.map((species, i) => (
              <motion.button
                key={species.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => species.samples[0] && onFeatureClick?.(species.samples[0])}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Bird className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {species.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {species.count} observation{species.count > 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* WEATHER DATA - Actual conditions */}
      {showcase.weatherData.length > 0 && (!selectedCategory || selectedCategory === 'WEATHER') && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-warning" />
            Weather Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showcase.weatherData.map((feature, i) => (
              (() => {
                const fid = getFeatureKey(feature);
                const domId = toDomId(fid);
                const isSelected = selectedFeatureId === fid;
                return (
                  <WeatherCard
                    key={fid || i}
                    feature={feature}
                    onClick={() => onFeatureClick?.(feature)}
                    domId={domId}
                    selected={isSelected}
                  />
                );
              })()
            ))}
          </div>
        </section>
      )}

      {/* MARINE / TIDE DATA */}
      {showcase.marineData.length > 0 && (!selectedCategory || selectedCategory === 'MARINE' || selectedCategory === 'TIDES') && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Waves className="w-4 h-4 text-primary" />
            Marine & Tide Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showcase.marineData.slice(0, 8).map((feature, i) => (
              (() => {
                const fid = getFeatureKey(feature);
                const domId = toDomId(fid);
                const isSelected = selectedFeatureId === fid;
                return (
                  <MarineCard
                    key={fid || i}
                    feature={feature}
                    onClick={() => onFeatureClick?.(feature)}
                    domId={domId}
                    selected={isSelected}
                  />
                );
              })()
            ))}
          </div>
        </section>
      )}

      {/* REGULATIONS */}
      {showcase.regulations.length > 0 && (!selectedCategory || selectedCategory === 'REGULATIONS') && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-foreground" />
            Regulations & Rules
          </h3>
          <div className="space-y-2">
            {showcase.regulations.map((feature, i) => (
              (() => {
                const fid = getFeatureKey(feature);
                const domId = toDomId(fid);
                const isSelected = selectedFeatureId === fid;
                return (
                  <RegulationCard
                    key={fid || i}
                    feature={feature}
                    onClick={() => onFeatureClick?.(feature)}
                    domId={domId}
                    selected={isSelected}
                  />
                );
              })()
            ))}
          </div>
        </section>
      )}

      {/* OBSERVATION FEED - Live data stream */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          All Records ({filteredFeatures.length})
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredFeatures.slice(0, 100).map((feature, i) => (
              (() => {
                const fid = getFeatureKey(feature);
                const domId = toDomId(fid);
                const isSelected = selectedFeatureId === fid;
                return (
              <ObservationRow
                    key={fid || i}
                feature={feature}
                onClick={() => onFeatureClick?.(feature)}
                    domId={domId}
                    selected={isSelected}
                    isExpanded={expandedId === (fid || String(i))}
                onToggle={() => setExpandedId(
                      expandedId === (fid || String(i)) 
                    ? null 
                        : (fid || String(i))
                )}
              />
                );
              })()
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}

// Featured Card - Premium display of important data
function FeaturedCard({
  feature,
  onClick,
  domId,
  selected,
}: {
  feature: GeoJSONFeature;
  onClick?: () => void;
  domId?: string;
  selected?: boolean;
}) {
  const props = feature.properties;
  const cat = getProp(props, 'category', 'OTHER');
  const name = getProp(props, 'name') || getProp(props, 'species') || getProp(props, 'common_name', 'Unknown');
  const location = getProp(props, 'location') || getProp(props, 'place_name');
  const source = getProp(props, 'source', 'Unknown source');
  const sourceUrl = getProp(props, 'source_url') || getProp(props, 'source_record_url');
  const confidence = getNumProp(props, 'confidence', 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      id={domId}
      className={cn(
        'group p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            CATEGORY_STYLES[cat] || 'bg-primary/10 text-primary border-primary/20'
          )}>
            {CATEGORY_ICONS[cat] || <Tag className="w-4 h-4" />}
          </div>
          <Badge variant="outline" className="text-[10px]">{cat}</Badge>
        </div>
        {sourceUrl && (
          <a 
            href={sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      
      <h4 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {name}
      </h4>
      
      {location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{location}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{source}</span>
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            confidence > 0.8 ? "bg-success" : confidence > 0.5 ? "bg-warning" : "bg-muted-foreground"
          )} />
          <span className="text-muted-foreground">{Math.round(confidence * 100)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// Weather Card - Show actual weather values
function WeatherCard({
  feature,
  onClick,
  domId,
  selected,
}: {
  feature: GeoJSONFeature;
  onClick?: () => void;
  domId?: string;
  selected?: boolean;
}) {
  const props = feature.properties;
  const temp = props.temperature ?? props.temp;
  const humidity = props.humidity;
  const windSpeed = props.wind_speed ?? props.windSpeed;
  const conditions = getProp(props, 'conditions') || getProp(props, 'weather') || getProp(props, 'description');
  const location = getProp(props, 'location') || getProp(props, 'name', 'Weather Station');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      id={domId}
      className={cn(
        'p-4 rounded-xl bg-warning/5 border border-warning/20 hover:border-warning/40 transition-all cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <CloudRain className="w-5 h-5 text-warning" />
        <span className="font-medium text-foreground text-sm">{location}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {temp !== undefined && temp !== null && (
          <div className="text-center">
            <Thermometer className="w-4 h-4 mx-auto text-warning mb-1" />
            <div className="text-lg font-bold text-foreground">{String(temp)}°</div>
            <div className="text-[10px] text-muted-foreground">Temp</div>
          </div>
        )}
        {humidity !== undefined && humidity !== null && (
          <div className="text-center">
            <Droplets className="w-4 h-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold text-foreground">{String(humidity)}%</div>
            <div className="text-[10px] text-muted-foreground">Humidity</div>
          </div>
        )}
        {windSpeed !== undefined && windSpeed !== null && (
          <div className="text-center">
            <Wind className="w-4 h-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold text-foreground">{String(windSpeed)}</div>
            <div className="text-[10px] text-muted-foreground">Wind</div>
          </div>
        )}
      </div>
      
      {conditions && (
        <div className="mt-3 text-xs text-muted-foreground text-center">{conditions}</div>
      )}
    </motion.div>
  );
}

// Marine Card - Tide and ocean data
function MarineCard({
  feature,
  onClick,
  domId,
  selected,
}: {
  feature: GeoJSONFeature;
  onClick?: () => void;
  domId?: string;
  selected?: boolean;
}) {
  const props = feature.properties;
  const name = getProp(props, 'name') || getProp(props, 'station_name', 'Station');
  const tideHeight = props.tide_height ?? props.height ?? props.water_level;
  const tideType = getProp(props, 'tide_type') || getProp(props, 'type');
  const time = props.time ?? props.timestamp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      id={domId}
      className={cn(
        'p-3 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm truncate">{name}</span>
        </div>
        {tideType && (
          <Badge variant="outline" className="text-[10px]">{tideType}</Badge>
        )}
      </div>
      
      {tideHeight !== undefined && tideHeight !== null && (
        <div className="text-2xl font-bold text-primary mb-1">
          {typeof tideHeight === 'number' ? tideHeight.toFixed(2) : String(tideHeight)} ft
        </div>
      )}
      
      {time && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(String(time)).toLocaleTimeString()}
        </div>
      )}
    </motion.div>
  );
}

// Regulation Card
function RegulationCard({
  feature,
  onClick,
  domId,
  selected,
}: {
  feature: GeoJSONFeature;
  onClick?: () => void;
  domId?: string;
  selected?: boolean;
}) {
  const props = feature.properties;
  const name = getProp(props, 'name') || getProp(props, 'title', 'Regulation');
  const description = getProp(props, 'description') || getProp(props, 'details');
  const sourceUrl = getProp(props, 'source_url') || getProp(props, 'source_record_url');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      id={domId}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border hover:border-primary/30 transition-all cursor-pointer group',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <FileText className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          {name}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
      {sourceUrl && (
        <a 
          href={sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>
      )}
    </motion.div>
  );
}

// Observation Row - Compact record display
function ObservationRow({ 
  feature, 
  onClick, 
  domId,
  selected,
  isExpanded,
  onToggle 
}: { 
  feature: GeoJSONFeature; 
  onClick?: () => void;
  domId?: string;
  selected?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const props = feature.properties;
  const cat = getProp(props, 'category', 'OTHER');
  const name = getProp(props, 'name') || getProp(props, 'species') || getProp(props, 'title', 'Record');
  const source = getProp(props, 'source', 'Unknown');
  const sourceUrl = getProp(props, 'source_url') || getProp(props, 'source_record_url');
  const location = getProp(props, 'location') || getProp(props, 'place_name');

  return (
    <motion.div
      layout
      id={domId}
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
      >
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          cat === 'WILDLIFE' ? 'bg-success' :
          cat === 'WEATHER' ? 'bg-warning' :
          cat === 'MARINE' ? 'bg-primary' :
          cat === 'REGULATIONS' ? 'bg-accent-foreground' : 'bg-primary'
        )} />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground truncate">{name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {source} {location && `• ${location}`}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sourceUrl && (
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )} />
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-3 space-y-2 bg-muted/30">
              {/* All properties */}
              {Object.entries(props)
                .filter(([k]) => !['id', 'category', 'source', 'geometry'].includes(k))
                .slice(0, 8)
                .map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground capitalize min-w-[80px]">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-foreground font-medium break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))
              }
              
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="w-full mt-2"
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                View on Map
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
