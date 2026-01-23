// BASED DATA v10.0 - Leaflet SimpleMap
// LIGHT THEME - CARTO Positron tiles (clean, premium)

import { useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONFeature, GeoJSONFeatureCollection, MapLayer } from '@/types/omniscient';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Brand blue as primary marker color
const CATEGORY_COLORS: Record<string, string> = {
  WILDLIFE: '#10B981',      // Emerald
  WEATHER: '#F59E0B',       // Amber
  MARINE: '#06B6D4',        // Cyan
  REGULATIONS: '#8B5CF6',   // Purple
  GEOSPATIAL: '#3B82F6',    // Blue
  RECREATION: '#22C55E',    // Green
  GOVERNMENT: '#EC4899',    // Pink
  INFRASTRUCTURE: '#6366F1', // Indigo
  ENVIRONMENTAL: '#14B8A6', // Teal
  AGRICULTURE: '#84CC16',   // Lime
  DEMOGRAPHICS: '#F97316',  // Orange
  ECONOMIC: '#EAB308',      // Yellow
  HEALTH: '#EF4444',        // Red
  EDUCATION: '#A855F7',     // Purple
  TRANSPORTATION: '#0EA5E9', // Sky
  ENERGY: '#FACC15',        // Yellow
  WATER: '#22D3EE',         // Cyan
  LAND: '#A3E635',          // Lime
  CLIMATE: '#38BDF8',       // Sky
  BIODIVERSITY: '#4ADE80',  // Green
  CULTURAL: '#E879F9',      // Fuchsia
  SAFETY: '#FB7185',        // Rose
  SOCIAL: '#C084FC',        // Purple
  TECHNOLOGY: '#60A5FA',    // Blue
  LEGAL: '#F472B6',         // Pink
  HISTORICAL: '#FBBF24',    // Amber
  SCIENTIFIC: '#2DD4BF',    // Teal
  EMERGENCY: '#F87171',     // Red
  UTILITIES: '#818CF8',     // Indigo
  TOURISM: '#FB923C',       // Orange
  DEFAULT: '#3B82F6',       // Primary Blue
};

interface SimpleMapProps {
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
  className?: string;
}

export function SimpleMap({
  features,
  layers,
  layerOpacities,
  center,
  zoom = 11,
  selectedFeature,
  hoveredFeature,
  onFeatureClick,
  onFeatureHover,
  onCursorMove,
  className = '',
}: SimpleMapProps) {
  const leafletCenter = useMemo<[number, number]>(
    () => center ? [center[1], center[0]] : [39.8283, -98.5795],
    [center?.[0], center?.[1]]
  );
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const selectedLayerRef = useRef<L.CircleMarker | null>(null);

  const getVisibleCategories = useCallback((): Set<string> => {
    if (!layers?.length) return new Set(['ALL']);
    const visible = new Set<string>();
    for (const l of layers) {
      if (l.visible) visible.add(String(l.category || l.name).toUpperCase());
    }
    return visible;
  }, [layers]);

  const getFilteredFeatures = useCallback((): GeoJSONFeatureCollection | undefined => {
    if (!features?.features?.length) return features;
    const visible = getVisibleCategories();
    if (visible.has('ALL') || visible.size === 0) return features;
    
    return {
      ...features,
      features: features.features.filter(f => 
        visible.has(String(f.properties?.category || '').toUpperCase())
      ),
    };
  }, [features, getVisibleCategories]);

  // Initialize map with LIGHT tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: leafletCenter,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true,
    });

    // CARTO Positron - Light, clean, premium aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: true, metric: true }).addTo(map);

    map.on('mousemove', (e) => {
      onCursorMove?.({ lng: e.latlng.lng, lat: e.latlng.lat });
    });
    map.on('mouseout', () => {
      onCursorMove?.(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center/zoom
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(leafletCenter, zoom, { animate: true, duration: 0.5 });
    }
  }, [leafletCenter, zoom, center]);

  // Add/update data layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const filtered = getFilteredFeatures();
    if (!filtered?.features?.length) return;

    const layer = L.geoJSON(filtered as any, {
      pointToLayer: (feature, latlng) => {
        const category = String(feature.properties?.category || 'DEFAULT').toUpperCase();
        const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;
        const layerId = category.toLowerCase();
        const opacity = layerOpacities?.[layerId] ?? 1;
        const isSelected = selectedFeature && 
          feature.properties?.id === selectedFeature.properties?.id;

        return L.circleMarker(latlng, {
          radius: isSelected ? 12 : 8,
          fillColor: color,
          color: '#FFFFFF',
          weight: 2,
          opacity: opacity,
          fillOpacity: opacity * 0.85,
        });
      },
      onEachFeature: (feature, featureLayer) => {
        featureLayer.on('click', () => {
          onFeatureClick?.(feature as GeoJSONFeature);
        });
        featureLayer.on('mouseover', () => {
          onFeatureHover?.(feature as GeoJSONFeature);
          if (featureLayer instanceof L.CircleMarker) {
            featureLayer.setStyle({ fillOpacity: 1, weight: 3, radius: 10 });
          }
        });
        featureLayer.on('mouseout', () => {
          onFeatureHover?.(null);
          if (featureLayer instanceof L.CircleMarker) {
            const category = String(feature.properties?.category || 'DEFAULT').toUpperCase();
            const layerId = category.toLowerCase();
            const opacity = layerOpacities?.[layerId] ?? 1;
            featureLayer.setStyle({ fillOpacity: opacity * 0.85, weight: 2, radius: 8 });
          }
        });
      },
    });

    layer.addTo(mapRef.current);
    layerRef.current = layer;

    if (filtered.features.length > 0) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [features, layers, layerOpacities, selectedFeature, getFilteredFeatures, onFeatureClick, onFeatureHover]);

  // Selected feature highlight
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedLayerRef.current) {
      mapRef.current.removeLayer(selectedLayerRef.current);
      selectedLayerRef.current = null;
    }

    if (!selectedFeature?.geometry || selectedFeature.geometry.type !== 'Point') return;

    const coords = selectedFeature.geometry.coordinates as number[];
    const [lng, lat] = coords;
    const category = String(selectedFeature.properties?.category || 'DEFAULT').toUpperCase();
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;

    const marker = L.circleMarker([lat, lng], {
      radius: 16,
      fillColor: 'transparent',
      color: color,
      weight: 4,
      opacity: 0.9,
      fillOpacity: 0,
    });

    marker.addTo(mapRef.current);
    selectedLayerRef.current = marker;

    mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 12), { duration: 0.5 });
  }, [selectedFeature]);

  return (
    <div 
      ref={containerRef} 
      className={`leaflet-container-light ${className}`}
      style={{ width: '100%', height: '100%', background: '#F8FAFC' }}
    />
  );
}
