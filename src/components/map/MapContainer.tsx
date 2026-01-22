// OMNISCIENT Map Container
// Interactive Mapbox GL map with data layers

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_MAP_CENTER, DEFAULT_ZOOM, CATEGORY_COLORS } from '@/lib/mapbox';
import type { GeoJSONFeatureCollection, MapLayer } from '@/types/omniscient';

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
    
    if (!MAPBOX_TOKEN) {
      setNoToken(true);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES.dark,
      center,
      zoom,
      projection: 'mercator',
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (map.current && mapLoaded && center) {
      map.current.flyTo({ center, zoom: zoom || 8, duration: 1500 });
    }
  }, [center, zoom, mapLoaded]);

  // Add features to map
  useEffect(() => {
    if (!map.current || !mapLoaded || !features?.features?.length) return;

    const sourceId = 'omniscient-data';
    const layerId = 'omniscient-points';

    // Remove existing layers and sources
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: features as any,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add cluster layer
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
          100, '#EF4444',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10, 30,
          50, 40,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Add cluster count
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add unclustered points
    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'category'],
          'WILDLIFE', CATEGORY_COLORS.WILDLIFE,
          'WEATHER', CATEGORY_COLORS.WEATHER,
          'GOVERNMENT', CATEGORY_COLORS.GOVERNMENT,
          'MARINE', CATEGORY_COLORS.MARINE,
          'TRANSPORTATION', CATEGORY_COLORS.TRANSPORTATION,
          'REGULATIONS', CATEGORY_COLORS.REGULATIONS,
          'DEMOGRAPHICS', CATEGORY_COLORS.DEMOGRAPHICS,
          'ECONOMIC', CATEGORY_COLORS.ECONOMIC,
          'IMAGERY', CATEGORY_COLORS.IMAGERY,
          'ENERGY', CATEGORY_COLORS.ENERGY,
          'HEALTH', CATEGORY_COLORS.HEALTH,
          'RECREATION', CATEGORY_COLORS.RECREATION,
          'RESEARCH', CATEGORY_COLORS.RESEARCH,
          CATEGORY_COLORS.GEOSPATIAL, // default
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Click handlers
    map.current.on('click', layerId, (e) => {
      if (e.features?.[0] && onFeatureClick) {
        onFeatureClick(e.features[0]);
      }
    });

    map.current.on('click', 'clusters', (e) => {
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features?.length) return;
      
      const clusterId = features[0].properties?.cluster_id;
      const source = map.current?.getSource(sourceId) as mapboxgl.GeoJSONSource;
      
      source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.current?.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom || 10,
        });
      });
    });

    // Cursor changes
    map.current.on('mouseenter', layerId, () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', layerId, () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

  }, [features, mapLoaded, onFeatureClick]);

  if (noToken) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Map Preview</h3>
          <p className="text-gray-400 text-sm max-w-xs">
            Add a Mapbox token to enable the interactive map. Data is still generated and available in the table view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={`relative ${className}`}>
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
