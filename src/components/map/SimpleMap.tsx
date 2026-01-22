// BASED DATA v8.2 - Leaflet SimpleMap
// Zero-token, zero-WebGL map that always works
// Uses CARTO Dark Matter tiles (free, CORS-enabled)

import { useEffect, useRef, useCallback } from 'react';
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

const CATEGORY_COLORS: Record<string, string> = {
  WILDLIFE: '#10B981',
  WEATHER: '#F59E0B',
  MARINE: '#06B6D4',
  REGULATIONS: '#8B5CF6',
  GEOSPATIAL: '#3B82F6',
  RECREATION: '#22C55E',
  GOVERNMENT: '#EC4899',
  INFRASTRUCTURE: '#6366F1',
  ENVIRONMENTAL: '#14B8A6',
  AGRICULTURE: '#84CC16',
  DEMOGRAPHICS: '#F97316',
  ECONOMIC: '#EAB308',
  HEALTH: '#EF4444',
  EDUCATION: '#A855F7',
  TRANSPORTATION: '#0EA5E9',
  ENERGY: '#FACC15',
  WATER: '#22D3EE',
  LAND: '#A3E635',
  CLIMATE: '#38BDF8',
  BIODIVERSITY: '#4ADE80',
  CULTURAL: '#E879F9',
  SAFETY: '#FB7185',
  SOCIAL: '#C084FC',
  TECHNOLOGY: '#60A5FA',
  LEGAL: '#F472B6',
  HISTORICAL: '#FBBF24',
  SCIENTIFIC: '#2DD4BF',
  EMERGENCY: '#F87171',
  UTILITIES: '#818CF8',
  TOURISM: '#FB923C',
  DEFAULT: '#6B7280',
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
  center = [30.27, -97.74], // Austin default
  zoom = 11,
  selectedFeature,
  hoveredFeature,
  onFeatureClick,
  onFeatureHover,
  onCursorMove,
  className = '',
}: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const selectedLayerRef = useRef<L.CircleMarker | null>(null);

  // Get visible categories from layers
  const getVisibleCategories = useCallback((): Set<string> => {
    if (!layers?.length) return new Set(['ALL']);
    const visible = new Set<string>();
    for (const l of layers) {
      if (l.visible) visible.add(String(l.category || l.name).toUpperCase());
    }
    return visible;
  }, [layers]);

  // Filter features based on visible layers
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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true,
    });

    // CARTO Dark Matter tiles - free, CORS-enabled, always works
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add scale
    L.control.scale({ position: 'bottomleft', imperial: true, metric: true }).addTo(map);

    // Track mouse position
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

  // Update center/zoom when they change
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom]);

  // Add/update data layer when features or visibility changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old layer
    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const filtered = getFilteredFeatures();
    if (!filtered?.features?.length) return;

    // Create new GeoJSON layer
    const layer = L.geoJSON(filtered as any, {
      pointToLayer: (feature, latlng) => {
        const category = String(feature.properties?.category || 'DEFAULT').toUpperCase();
        const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;
        const layerId = category.toLowerCase();
        const opacity = layerOpacities?.[layerId] ?? 1;
        const isSelected = selectedFeature && 
          feature.properties?.id === selectedFeature.properties?.id;

        return L.circleMarker(latlng, {
          radius: isSelected ? 14 : 8,
          fillColor: color,
          color: isSelected ? '#ffffff' : color,
          weight: isSelected ? 3 : 2,
          opacity: opacity,
          fillOpacity: opacity * 0.8,
        });
      },
      onEachFeature: (feature, featureLayer) => {
        // Events
        featureLayer.on('click', () => {
          onFeatureClick?.(feature as GeoJSONFeature);
        });
        featureLayer.on('mouseover', () => {
          onFeatureHover?.(feature as GeoJSONFeature);
          if (featureLayer instanceof L.CircleMarker) {
            featureLayer.setStyle({ fillOpacity: 1, weight: 3 });
          }
        });
        featureLayer.on('mouseout', () => {
          onFeatureHover?.(null);
          if (featureLayer instanceof L.CircleMarker) {
            const category = String(feature.properties?.category || 'DEFAULT').toUpperCase();
            const layerId = category.toLowerCase();
            const opacity = layerOpacities?.[layerId] ?? 1;
            featureLayer.setStyle({ fillOpacity: opacity * 0.8, weight: 2 });
          }
        });
      },
    });

    layer.addTo(mapRef.current);
    layerRef.current = layer;

    // Fit bounds if we have features
    if (filtered.features.length > 0) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [features, layers, layerOpacities, selectedFeature, getFilteredFeatures, onFeatureClick, onFeatureHover]);

  // Handle selected feature highlight
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old selected marker
    if (selectedLayerRef.current) {
      mapRef.current.removeLayer(selectedLayerRef.current);
      selectedLayerRef.current = null;
    }

    if (!selectedFeature?.geometry || selectedFeature.geometry.type !== 'Point') return;

    const coords = selectedFeature.geometry.coordinates as number[];
    const [lng, lat] = coords;
    const category = String(selectedFeature.properties?.category || 'DEFAULT').toUpperCase();
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;

    // Create highlight ring
    const marker = L.circleMarker([lat, lng], {
      radius: 18,
      fillColor: 'transparent',
      color: color,
      weight: 4,
      opacity: 0.9,
      fillOpacity: 0,
    });

    marker.addTo(mapRef.current);
    selectedLayerRef.current = marker;

    // Fly to selected
    mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 12), { duration: 0.5 });
  }, [selectedFeature]);

  // Handle hovered feature visual feedback (optional ring)
  useEffect(() => {
    // The hover effect is already handled in the GeoJSON layer's onEachFeature
    // This effect could add additional visual feedback if needed
  }, [hoveredFeature]);

  return (
    <div 
      ref={containerRef} 
      className={`leaflet-container-dark ${className}`}
      style={{ width: '100%', height: '100%', background: '#0a0a0f' }}
    />
  );
}
