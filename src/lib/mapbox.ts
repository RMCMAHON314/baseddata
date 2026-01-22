// OMNISCIENT - Mapbox Configuration
// Map integration for geospatial data visualization

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  navigation: 'mapbox://styles/mapbox/navigation-night-v1',
};

export const DEFAULT_MAP_CENTER: [number, number] = [-98.5795, 39.8283]; // Center of USA
export const DEFAULT_ZOOM = 4;

// Data category colors for map layers (single source of truth)
export const CATEGORY_COLORS: Record<string, string> = {
  GEOSPATIAL: '#3B82F6',    // Blue
  WILDLIFE: '#10B981',       // Emerald
  WEATHER: '#F59E0B',        // Amber
  REGULATIONS: '#8B5CF6',    // Purple
  TRANSPORTATION: '#EF4444', // Red
  DEMOGRAPHICS: '#EC4899',   // Pink
  ECONOMIC: '#14B8A6',       // Teal
  IMAGERY: '#6366F1',        // Indigo
  GOVERNMENT: '#0EA5E9',     // Sky
  MARINE: '#06B6D4',         // Cyan
};

// Convert lat/lng to bounding box
export function toBBox(center: [number, number], radiusKm: number): [number, number, number, number] {
  const lat = center[1];
  const lng = center[0];
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos(lat * Math.PI / 180);
  
  const latDiff = radiusKm / kmPerDegLat;
  const lngDiff = radiusKm / kmPerDegLng;
  
  return [
    lng - lngDiff, // minLon
    lat - latDiff, // minLat
    lng + lngDiff, // maxLon
    lat + latDiff, // maxLat
  ];
}

// Parse location from text
export function parseLocation(text: string): { name: string; center?: [number, number]; bbox?: [number, number, number, number] } | null {
  const locations: Record<string, [number, number]> = {
    'long island': [-73.1, 40.8],
    'new york': [-74.006, 40.7128],
    'nyc': [-74.006, 40.7128],
    'los angeles': [-118.2437, 34.0522],
    'san francisco': [-122.4194, 37.7749],
    'seattle': [-122.3321, 47.6062],
    'chicago': [-87.6298, 41.8781],
    'miami': [-80.1918, 25.7617],
    'boston': [-71.0589, 42.3601],
    'denver': [-104.9903, 39.7392],
    'phoenix': [-112.074, 33.4484],
    'austin': [-97.7431, 30.2672],
    'maryland': [-76.6413, 39.0458],
    'texas': [-99.9018, 31.9686],
    'california': [-119.4179, 36.7783],
    'florida': [-81.5158, 27.6648],
    'virginia': [-78.6569, 37.4316],
    'washington dc': [-77.0369, 38.9072],
    'dc': [-77.0369, 38.9072],
    'yellowstone': [-110.5885, 44.428],
    'puget sound': [-122.4, 47.6],
    'lake travis': [-97.9, 30.4],
    'boulder': [-105.2705, 40.015],
    'minnesota': [-94.6859, 46.7296],
  };

  const textLower = text.toLowerCase();
  
  for (const [name, coords] of Object.entries(locations)) {
    if (textLower.includes(name)) {
      return {
        name,
        center: coords,
        bbox: toBBox(coords, 50),
      };
    }
  }
  
  return null;
}
