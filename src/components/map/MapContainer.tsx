// BASED DATA v7.6 - Map Container
// Interactive Mapbox GL map with robust runtime token support + fallback
// Fixed: map initializes into a dedicated child div (prevents React from overwriting Mapbox DOM)

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAP_STYLES,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  CATEGORY_COLORS,
  getRuntimeMapboxToken,
  hasMapboxToken,
  setRuntimeMapboxToken,
} from '@/lib/mapbox';
import type { GeoJSONFeatureCollection, MapLayer } from '@/types/omniscient';
import { Globe, ExternalLink, Layers, Database, Map, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface MapContainerProps {
  features?: GeoJSONFeatureCollection;
  layers?: MapLayer[];
  center?: [number, number];
  zoom?: number;
  onFeatureClick?: (feature: any) => void;
  className?: string;
}

export function MapContainer({
  features,
  layers,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM,
  onFeatureClick,
  className = '',
}: MapContainerProps) {
  // Outer container ref (React manages) – never passed to Mapbox
  const outerRef = useRef<HTMLDivElement>(null);
  // Inner container ref (dedicated empty div Mapbox owns)
  const innerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [noToken, setNoToken] = useState(false);
  const [token, setToken] = useState(() => getRuntimeMapboxToken());
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

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
        if (!innerRef.current) return;
        if (innerRef.current.clientWidth > 0 && innerRef.current.clientHeight > 0) finish();
      });

      // Observe the outer container because it’s the element whose layout changes.
      if (outerRef.current) ro.observe(outerRef.current);
      if (innerRef.current) ro.observe(innerRef.current);

      // Safety: don’t hang forever.
      t = window.setTimeout(() => finish(), 1200);

      // If we became ready between the initial check and observer setup, finish immediately.
      if (innerRef.current && innerRef.current.clientWidth > 0 && innerRef.current.clientHeight > 0) finish();
    });
  };

  const validateToken = async (accessToken: string): Promise<{ ok: boolean; status?: number }> => {
    // Validate using a lightweight style fetch. This fails fast on invalid/expired tokens.
    try {
      const res = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${encodeURIComponent(accessToken)}`,
        { method: 'GET' }
      );
      return { ok: res.ok, status: res.status };
    } catch {
      // Network/blocked requests shouldn’t brick the map. If Mapbox GL can load, it will.
      return { ok: true };
    }
  };

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
      features: features.features.filter((f) => visible.has(String(f.properties?.category || '').toUpperCase())),
    };
  }, [features, layers]);

  // ------------------------------------
  // Initialize Mapbox map
  // ------------------------------------
  useEffect(() => {
    if (!innerRef.current) return;

    // Reset state
    setMapLoaded(false);
    setTokenError(null);

    // Tear down previous map instance
    map.current?.remove();
    map.current = null;

    const activeToken = token || getRuntimeMapboxToken();
    if (!hasMapboxToken() || !activeToken) {
      setNoToken(true);
      return;
    }

    let cancelled = false;

    (async () => {
      // Ensure the map isn’t initialized into a 0x0 container (common in flex/tab layouts).
      await ensureContainerReady();
      if (cancelled) return;

      // Fail fast on invalid tokens so users see the token UI instead of a blank map.
      const check = await validateToken(activeToken);
      if (cancelled) return;
      if (check.ok === false || check.status === 401 || check.status === 403) {
        setTokenError('That token looks invalid (Mapbox returned Unauthorized).');
        setNoToken(true);
        return;
      }

      setNoToken(false);
      mapboxgl.accessToken = activeToken;

      try {
        map.current = new mapboxgl.Map({
          container: innerRef.current!,
          style: MAP_STYLES.dark,
          center,
          zoom,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        map.current.on('load', () => {
          setMapLoaded(true);
          // Force a resize after load to avoid the “blank map until resize” issue.
          requestAnimationFrame(() => map.current?.resize());
        });

        map.current.on('error', (e) => {
          const message = (e as any)?.error?.message || '';
          if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('access token')) {
            setTokenError('That token looks invalid (Mapbox returned Unauthorized).');
            setNoToken(true);
          }
        });

        // Initial resize once constructed (helps when parent is animating).
        requestAnimationFrame(() => map.current?.resize());
      } catch {
        setNoToken(true);
      }
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ------------------------------------
  // Resize observer for layout changes
  // ------------------------------------
  useEffect(() => {
    if (!outerRef.current) return;
    if (!map.current) return;

    const resize = () => map.current?.resize();
    window.addEventListener('resize', resize);

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => resize());
      ro.observe(outerRef.current);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, [mapLoaded]);

  // ------------------------------------
  // Fly to center when it changes
  // ------------------------------------
  useEffect(() => {
    if (map.current && mapLoaded && center) {
      map.current.flyTo({ center, zoom: zoom || 8, duration: 1500 });
    }
  }, [center, zoom, mapLoaded]);

  // ------------------------------------
  // Add GeoJSON data layers
  // ------------------------------------
  useEffect(() => {
    if (!map.current || !mapLoaded || !filteredFeatures?.features?.length) return;

    const sourceId = 'omniscient-data';

    // Clean up existing
    ['omniscient-points', 'clusters', 'cluster-count'].forEach(id => {
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

    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], CATEGORY_COLORS.WILDLIFE || '#10B981', 10, CATEGORY_COLORS.GEOSPATIAL || '#3B82F6', 50, CATEGORY_COLORS.REGULATIONS || '#8B5CF6'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'hsl(0 0% 100%)',
      },
    });

    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 },
      paint: { 'text-color': 'hsl(0 0% 100%)' },
    });

    map.current.addLayer({
      id: 'omniscient-points',
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'category'],
          'WILDLIFE', CATEGORY_COLORS.WILDLIFE || '#10B981',
          'WEATHER', CATEGORY_COLORS.WEATHER || '#F59E0B',
          'MARINE', CATEGORY_COLORS.MARINE || '#06B6D4',
          'GEOSPATIAL', CATEGORY_COLORS.GEOSPATIAL || '#3B82F6',
          'GOVERNMENT', CATEGORY_COLORS.GOVERNMENT || '#8B5CF6',
          '#3B82F6'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'hsl(0 0% 100%)',
      },
    });

    map.current.on('click', 'omniscient-points', (e) => {
      if (e.features?.[0] && onFeatureClick) onFeatureClick(e.features[0]);
    });

    map.current.on('mouseenter', 'omniscient-points', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', 'omniscient-points', () => { if (map.current) map.current.getCanvas().style.cursor = ''; });

  }, [filteredFeatures, mapLoaded, onFeatureClick]);

  // ------------------------------------
  // Token input handlers
  // ------------------------------------
  const handleSaveToken = () => {
    const cleaned = tokenInput.trim();
    if (!cleaned) {
      setTokenError('Paste a token first.');
      return;
    }
    if (!cleaned.startsWith('pk.')) {
      setTokenError('Use a public token that starts with "pk."');
      return;
    }

    setRuntimeMapboxToken(cleaned);
    setToken(cleaned);
    setTokenInput('');
    setTokenError(null);
    setNoToken(false);
  };

  // ------------------------------------
  // Fallback UI when no token
  // ------------------------------------
  if (noToken) {
    const featureCount = filteredFeatures?.features?.length || features?.features?.length || 0;
    const categories = new Set((filteredFeatures?.features || features?.features || []).map(f => f.properties.category) || []);
    
    return (
      <div className={`relative bg-gradient-to-br from-background via-secondary/30 to-background flex flex-col items-center justify-center ${className}`}>
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20 pointer-events-none" />
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center p-6 relative z-10 max-w-sm">
          <Globe className="w-12 h-12 mx-auto text-primary/50 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Map Visualization</h3>
          <p className="text-sm text-muted-foreground mb-4">Add a Mapbox token to enable interactive maps</p>
          
          {featureCount > 0 && (
            <div className="bg-card/50 rounded-lg border p-3 mb-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1"><Database className="w-4 h-4 text-primary" /><b>{featureCount}</b> features</span>
                <span className="flex items-center gap-1"><Layers className="w-4 h-4 text-success" /><b>{categories.size}</b> categories</span>
              </div>
            </div>
          )}

          <div className="w-full space-y-2 mb-3">
            <div className="flex gap-2">
              <Input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder='Paste public token (starts with "pk.")'
                className="h-9"
              />
              <Button size="sm" className="h-9" onClick={handleSaveToken}>
                Save
              </Button>
            </div>
            {tokenError && <p className="text-xs text-destructive">{tokenError}</p>}
            <p className="text-xs text-muted-foreground">
              Token is stored locally in this browser.
            </p>
          </div>
          
          <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Map className="w-4 h-4" />Get Mapbox Token<ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------
  // Normal map view
  // ------------------------------------
  return (
    <div ref={outerRef} className={`relative ${className}`}>
      {/* Dedicated child div that Mapbox owns */}
      <div ref={innerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center pointer-events-none z-10">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Status badge */}
      <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur-sm border border-border rounded-md px-2.5 py-1 flex items-center gap-2 text-xs text-muted-foreground z-20 shadow-sm">
        {mapLoaded ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="font-medium text-success">Map ready</span>
          </>
        ) : (
          <>
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Initializing...</span>
          </>
        )}
      </div>
    </div>
  );
}
