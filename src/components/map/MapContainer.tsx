// BASED DATA v7.5 - Map Container
// Interactive Mapbox GL map with proper error handling and fallback

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_MAP_CENTER, DEFAULT_ZOOM, CATEGORY_COLORS, hasMapboxToken } from '@/lib/mapbox';
import type { GeoJSONFeatureCollection, MapLayer } from '@/types/omniscient';
import { Globe, ExternalLink, Layers, Database, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!hasMapboxToken()) {
      setNoToken(true);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES.dark,
        center,
        zoom,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', () => {
        setNoToken(true);
      });
    } catch {
      setNoToken(true);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && mapLoaded && center) {
      map.current.flyTo({ center, zoom: zoom || 8, duration: 1500 });
    }
  }, [center, zoom, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !features?.features?.length) return;

    const sourceId = 'omniscient-data';

    // Clean up existing
    ['omniscient-points', 'clusters', 'cluster-count'].forEach(id => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: features as any,
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
        'circle-color': ['step', ['get', 'point_count'], '#10B981', 10, '#3B82F6', 50, '#8B5CF6'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 },
      paint: { 'text-color': '#ffffff' },
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
        'circle-stroke-color': '#ffffff',
      },
    });

    map.current.on('click', 'omniscient-points', (e) => {
      if (e.features?.[0] && onFeatureClick) onFeatureClick(e.features[0]);
    });

    map.current.on('mouseenter', 'omniscient-points', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', 'omniscient-points', () => { if (map.current) map.current.getCanvas().style.cursor = ''; });

  }, [features, mapLoaded, onFeatureClick]);

  if (noToken) {
    const featureCount = features?.features?.length || 0;
    const categories = new Set(features?.features?.map(f => f.properties.category) || []);
    
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
          
          <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Map className="w-4 h-4" />Get Mapbox Token<ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={`relative ${className}`}>
      {!mapLoaded && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
