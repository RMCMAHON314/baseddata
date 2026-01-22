// BASED DATA v8.1 - Premium Map Container
// 3D tilted map with glow layers, cursor tracking, premium controls, two-way sync

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAP_STYLES,
  OSM_RASTER_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  CATEGORY_COLORS,
  getRuntimeMapboxToken,
  hasMapboxToken,
  setRuntimeMapboxToken,
} from '@/lib/mapbox';
import { MapTokenOverlay } from '@/components/map/MapTokenOverlay';
import type { GeoJSONFeature, GeoJSONFeatureCollection, MapLayer } from '@/types/omniscient';
import { Globe, Maximize2, Layers, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PremiumMapContainerProps {
  features?: GeoJSONFeatureCollection;
  layers?: MapLayer[];
  layerOpacities?: Record<string, number>;
  center?: [number, number];
  zoom?: number;
  selectedFeature?: GeoJSONFeature | null;
  hoveredFeature?: GeoJSONFeature | null;
  onFeatureClick?: (feature: GeoJSONFeature) => void;
  onFeatureHover?: (feature: GeoJSONFeature | null) => void;
  onCursorMove?: (coords: { lng: number; lat: number } | null) => void;
  onMapReady?: () => void;
  className?: string;
}

// Glow colors for each category
const GLOW_COLORS: Record<string, string> = {
  WILDLIFE: 'rgba(16, 185, 129, 0.4)',
  WEATHER: 'rgba(245, 158, 11, 0.4)',
  MARINE: 'rgba(6, 182, 212, 0.4)',
  REGULATIONS: 'rgba(139, 92, 246, 0.4)',
  GOVERNMENT: 'rgba(236, 72, 153, 0.4)',
  GEOSPATIAL: 'rgba(59, 130, 246, 0.4)',
  TRANSPORTATION: 'rgba(239, 68, 68, 0.4)',
  HEALTH: 'rgba(244, 63, 94, 0.4)',
  ENERGY: 'rgba(250, 204, 21, 0.4)',
  ECONOMIC: 'rgba(20, 184, 166, 0.4)',
};

export function PremiumMapContainer({
  features,
  layers,
  layerOpacities = {},
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM,
  selectedFeature,
  hoveredFeature,
  onFeatureClick,
  onFeatureHover,
  onCursorMove,
  onMapReady,
  className = '',
}: PremiumMapContainerProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initNonce, setInitNonce] = useState(0);
  const [stuckHint, setStuckHint] = useState(false);
  const [basemap, setBasemap] = useState<'mapbox' | 'osm'>('mapbox');
  const [showTokenOverlay, setShowTokenOverlay] = useState(false);
  const [token, setToken] = useState(() => getRuntimeMapboxToken());
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(true);
  const renderStartTime = useRef<number>(Date.now());

  const filteredFeatures = useMemo<GeoJSONFeatureCollection | undefined>(() => {
    if (!features?.features?.length) return features;
    if (!layers?.length) return features;

    const visible = new Set(
      layers
        .filter((l) => l.visible)
        .map((l) => String(l.category || l.name).toUpperCase())
    );
    if (visible.size === 0) return { ...features, features: [] };

    return {
      ...features,
      features: features.features.filter((f) =>
        visible.has(String(f.properties?.category || '').toUpperCase())
      ),
    };
  }, [features, layers]);

  const ensureContainerReady = async (): Promise<void> => {
    const el = innerRef.current;
    if (!el) return;
    if (el.clientWidth > 0 && el.clientHeight > 0) return;

    await new Promise<void>((resolve) => {
      let done = false;
      let ro: ResizeObserver | null = null;
      let t: number | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        ro?.disconnect();
        if (t !== null) window.clearTimeout(t);
        resolve();
      };

      ro = new ResizeObserver(() => {
        if (innerRef.current?.clientWidth && innerRef.current?.clientHeight) finish();
      });
      if (outerRef.current) ro.observe(outerRef.current);
      if (innerRef.current) ro.observe(innerRef.current);
      // NOTE: If we init Mapbox GL at 0x0, it can get stuck visually even after layout settles.
      // Give flex layouts a bit more time to resolve.
      t = window.setTimeout(() => finish(), 5000);
      if (innerRef.current?.clientWidth && innerRef.current?.clientHeight) finish();
    });
  };

  const validateToken = async (accessToken: string): Promise<{ ok: boolean }> => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${encodeURIComponent(accessToken)}`,
        { method: 'GET' }
      );
      return { ok: res.ok };
    } catch {
      return { ok: true };
    }
  };

  // Initialize map - ALWAYS renders a real map (OSM fallback when no valid Mapbox token)
  useEffect(() => {
    if (!innerRef.current) return;

    setMapLoaded(false);
    setTokenError(null);
    map.current?.remove();
    map.current = null;

    const activeToken = token || getRuntimeMapboxToken();
    const hasAnyToken = Boolean((activeToken || '').trim());
    setShowTokenOverlay(!hasAnyToken);

    let cancelled = false;
    renderStartTime.current = Date.now();

    (async () => {
      await ensureContainerReady();
      if (cancelled) return;

      // If we *still* have 0x0, don't attempt init yet.
      // We'll keep showing the loading overlay and wait for ResizeObserver-driven retries.
      if (!innerRef.current?.clientWidth || !innerRef.current?.clientHeight) {
        return;
      }

      // Determine which basemap to use
      let resolvedBasemap: 'mapbox' | 'osm' = basemap;
      if (resolvedBasemap === 'mapbox') {
        if (!activeToken || !hasMapboxToken()) {
          resolvedBasemap = 'osm';
        } else {
          const check = await validateToken(activeToken);
          if (cancelled) return;
          if (!check.ok) {
            setTokenError('Invalid Mapbox token — showing free basemap.');
            setShowTokenOverlay(true);
            resolvedBasemap = 'osm';
          }
        }
      }

      // For OSM, we need a placeholder token (Mapbox GL requires one to init)
      // For Mapbox, use the real token
      // CRITICAL: Use a minimal valid-looking placeholder for OSM to avoid auth errors
      if (resolvedBasemap === 'osm') {
        // OSM doesn't need Mapbox auth - use empty string
        // Mapbox GL 3.x allows empty token when using non-Mapbox styles
        mapboxgl.accessToken = '';
      } else {
        mapboxgl.accessToken = activeToken;
      }

      try {
        map.current = new mapboxgl.Map({
          container: innerRef.current!,
          style: resolvedBasemap === 'mapbox' ? MAP_STYLES.dark : OSM_RASTER_STYLE,
          center,
          zoom,
          pitch: resolvedBasemap === 'mapbox' && is3D ? 45 : 0,
          bearing: resolvedBasemap === 'mapbox' && is3D ? -10 : 0,
          antialias: true,
          attributionControl: false,
        });

        // Premium controls
        map.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }),
          'top-right'
        );
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        // Cursor tracking
        map.current.on('mousemove', (e) => {
          onCursorMove?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });

        map.current.on('mouseout', () => {
          onCursorMove?.(null);
        });

        map.current.on('load', () => {
          setMapLoaded(true);
          onMapReady?.();
          requestAnimationFrame(() => map.current?.resize());
        });

        map.current.on('error', (e) => {
          const msg = (e as any)?.error?.message || '';
          if (msg.toLowerCase().includes('unauthorized')) {
            setTokenError('Invalid Mapbox token — showing free basemap.');
            setShowTokenOverlay(true);
            setBasemap('osm');
          }
        });

        requestAnimationFrame(() => map.current?.resize());
      } catch {
        setShowTokenOverlay(true);
      }
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, is3D, basemap, initNonce]);

  // Resize observer (must run even before `mapLoaded` to avoid a 0x0 init getting stuck)
  useEffect(() => {
    if (!outerRef.current) return;

    const resize = () => {
      map.current?.resize();

      // If the map wasn't created because the container was 0x0, retry init as soon as size exists.
      if (!map.current && innerRef.current?.clientWidth && innerRef.current?.clientHeight) {
        setInitNonce((n) => n + 1);
      }
    };

    window.addEventListener('resize', resize);

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(resize);
      ro.observe(outerRef.current);
      if (innerRef.current) ro.observe(innerRef.current);
    } catch {}

    // Trigger once on mount
    resize();

    return () => {
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, []);

  // If map is still not loaded after a while, surface a clear hint (instead of “black nothing”).
  useEffect(() => {
    if (mapLoaded) {
      setStuckHint(false);
      return;
    }
    const t = window.setTimeout(() => setStuckHint(true), 8000);
    return () => window.clearTimeout(t);
  }, [mapLoaded]);

  // Fly to center
  useEffect(() => {
    if (map.current && mapLoaded && center) {
      map.current.flyTo({ center, zoom: zoom || 8, duration: 1500 });
    }
  }, [center, zoom, mapLoaded]);

  // Add data layers with glow effect
  useEffect(() => {
    if (!map.current || !mapLoaded || !filteredFeatures?.features?.length) return;

    const sourceId = 'omniscient-data';

    // Cleanup
    ['glow-layer', 'points-layer', 'clusters', 'cluster-count'].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: filteredFeatures as any,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Glow layer (behind points)
    map.current.addLayer({
      id: 'glow-layer',
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 12, 25, 16, 40],
        'circle-color': [
          'match',
          ['get', 'category'],
          'WILDLIFE', GLOW_COLORS.WILDLIFE,
          'WEATHER', GLOW_COLORS.WEATHER,
          'MARINE', GLOW_COLORS.MARINE,
          'GEOSPATIAL', GLOW_COLORS.GEOSPATIAL,
          'REGULATIONS', GLOW_COLORS.REGULATIONS,
          'GOVERNMENT', GLOW_COLORS.GOVERNMENT,
          'rgba(59, 130, 246, 0.4)',
        ],
        'circle-blur': 1,
        'circle-opacity': 0.6,
      },
    });

    // Cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#10B981',
          10, '#3B82F6',
          50, '#8B5CF6',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.8)',
      },
    });

    // Cluster count
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // Points layer
    map.current.addLayer({
      id: 'points-layer',
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 8, 16, 12],
        'circle-color': [
          'match',
          ['get', 'category'],
          'WILDLIFE', CATEGORY_COLORS.WILDLIFE,
          'WEATHER', CATEGORY_COLORS.WEATHER,
          'MARINE', CATEGORY_COLORS.MARINE,
          'GEOSPATIAL', CATEGORY_COLORS.GEOSPATIAL,
          'REGULATIONS', CATEGORY_COLORS.REGULATIONS,
          'GOVERNMENT', CATEGORY_COLORS.GOVERNMENT,
          '#3B82F6',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Click handler
    map.current.on('click', 'points-layer', (e) => {
      if (e.features?.[0]) {
        onFeatureClick?.(e.features[0] as any);
      }
    });

    // Cluster click - zoom in
    map.current.on('click', 'clusters', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId) {
        (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom!,
            });
          }
        );
      }
    });

    // Hover handler
    map.current.on('mouseenter', 'points-layer', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      if (e.features?.[0]) onFeatureHover?.(e.features[0] as any);
    });

    map.current.on('mouseleave', 'points-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      onFeatureHover?.(null);
    });

    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }, [filteredFeatures, mapLoaded, onFeatureClick, onFeatureHover]);

  // Apply layer opacities
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    // Would apply per-layer opacity here if we had separate sources per layer
  }, [layerOpacities, mapLoaded]);

  // Selected feature highlight
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const sourceId = 'selected-feature';
    const ringLayerId = 'selected-ring';
    const dotLayerId = 'selected-dot';

    const cleanup = () => {
      if (!map.current) return;
      if (map.current.getLayer(dotLayerId)) map.current.removeLayer(dotLayerId);
      if (map.current.getLayer(ringLayerId)) map.current.removeLayer(ringLayerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    };

    if (!selectedFeature || selectedFeature.geometry?.type !== 'Point') {
      cleanup();
      return;
    }

    const coords = selectedFeature.geometry.coordinates as number[];
    const lngLat: [number, number] = [coords[0], coords[1]];
    const category = String(selectedFeature.properties?.category || '').toUpperCase();
    const color = CATEGORY_COLORS[category] || '#3B82F6';

    map.current.flyTo({
      center: lngLat,
      zoom: Math.max(map.current.getZoom(), 11),
      duration: 900,
    });

    const data: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [selectedFeature],
    };

    const existing = map.current.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data as any);
    } else {
      map.current.addSource(sourceId, { type: 'geojson', data: data as any });
    }

    if (!map.current.getLayer(ringLayerId)) {
      map.current.addLayer({
        id: ringLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 22,
          'circle-color': 'transparent',
          'circle-stroke-width': 4,
          'circle-stroke-color': color,
          'circle-stroke-opacity': 0.9,
        },
      });
    } else {
      map.current.setPaintProperty(ringLayerId, 'circle-stroke-color', color);
    }

    if (!map.current.getLayer(dotLayerId)) {
      map.current.addLayer({
        id: dotLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 12,
          'circle-color': color,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
    } else {
      map.current.setPaintProperty(dotLayerId, 'circle-color', color);
    }

    return cleanup;
  }, [selectedFeature, mapLoaded]);

  // Token handlers
  const handleSaveToken = () => {
    const cleaned = tokenInput.trim();
    if (!cleaned || !cleaned.startsWith('pk.')) {
      setTokenError('Use a public token starting with "pk."');
      return;
    }
    setRuntimeMapboxToken(cleaned);
    setToken(cleaned);
    setTokenInput('');
    setTokenError(null);
    setShowTokenOverlay(false);
    setBasemap('mapbox');
  };

  const toggle3D = useCallback(() => {
    if (!map.current) return;
    const newIs3D = !is3D;
    setIs3D(newIs3D);
    map.current.easeTo({
      pitch: newIs3D ? 45 : 0,
      bearing: newIs3D ? -10 : 0,
      duration: 800,
    });
  }, [is3D]);


  return (
    <div ref={outerRef} className={cn("relative w-full h-full", className)} style={{ minHeight: 0 }}>
      <div ref={innerRef} className="absolute inset-0 w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* Token/basemap overlay (never blocks map) */}
      {showTokenOverlay && (
        <MapTokenOverlay
          basemap={basemap}
          tokenInput={tokenInput}
          onTokenInputChange={setTokenInput}
          tokenError={tokenError}
          onSaveToken={handleSaveToken}
          onUseOsm={() => setBasemap('osm')}
          onUseMapbox={() => setBasemap('mapbox')}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[min(520px,calc(100%-2rem))]"
        />
      )}

      {/* Loading */}
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10"
          >
            <div className="w-20 h-20 relative mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Globe className="w-8 h-8 text-primary animate-spin-slow" />
              </div>
            </div>
            <h3 className="text-foreground font-semibold mb-2">Loading Map</h3>
            <p className="text-muted-foreground text-sm">
              Rendering {(filteredFeatures?.features?.length || 0).toLocaleString()} data points...
            </p>

            {stuckHint && (
              <p className="mt-3 text-xs text-muted-foreground max-w-sm text-center">
                If the map is still blank, it usually means the container had 0×0 size during init.
                Try resizing the window or toggling fullscreen.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "w-9 h-9 backdrop-blur-sm shadow-lg",
                is3D ? "bg-primary/20 text-primary border-primary/30" : "bg-black/60 text-white/70 border-white/20 hover:bg-black/80"
              )}
              onClick={toggle3D}
            >
              <Layers className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/90 text-white border-white/20">
            {is3D ? "Switch to 2D" : "Switch to 3D"}
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="w-9 h-9 bg-black/60 backdrop-blur-sm border-white/20 text-white/70 hover:text-white hover:bg-black/80 shadow-lg"
              onClick={() => {
                if (!map.current || !filteredFeatures?.features?.length) return;
                const bounds = new mapboxgl.LngLatBounds();
                for (const f of filteredFeatures.features) {
                  if (f.geometry?.type === 'Point') {
                    const coords = f.geometry.coordinates as [number, number];
                    bounds.extend(coords);
                  }
                }
                if (!bounds.isEmpty()) {
                  map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1200 });
                }
              }}
            >
              <Focus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/90 text-white border-white/20">
            Fit to results
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="w-9 h-9 bg-black/60 backdrop-blur-sm border-white/20 text-white/70 hover:text-white hover:bg-black/80 shadow-lg"
              onClick={() => {
                if (outerRef.current?.requestFullscreen) {
                  outerRef.current.requestFullscreen();
                }
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/90 text-white border-white/20">
            Fullscreen
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
