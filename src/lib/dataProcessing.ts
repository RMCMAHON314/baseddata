// BASED DATA v10.0 - Data Deduplication & Intelligent Grouping

import type { GeoJSONFeature } from '@/types/omniscient';

const WILDLIFE_COMMON_NAMES: Record<string, string> = {
  'Melanerpes carolinus': 'Red-bellied Woodpecker',
  'Sciurus carolinensis': 'Eastern Gray Squirrel',
  'Branta canadensis': 'Canada Goose',
  'Anas platyrhynchos': 'Mallard Duck',
};

const WILDLIFE_GROUPS: Record<string, string[]> = {
  'Birds': ['bird', 'duck', 'goose', 'hawk', 'owl', 'eagle', 'sparrow', 'cardinal', 'robin'],
  'Mammals': ['deer', 'squirrel', 'raccoon', 'fox', 'bear', 'rabbit'],
};

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function getGeoKey(coords: number[], precision: number = 4): string {
  if (!coords || coords.length < 2) return 'unknown';
  const [lng, lat] = coords;
  return `${Math.floor(lat * Math.pow(10, precision - 2))}:${Math.floor(lng * Math.pow(10, precision - 2))}`;
}

function getWildlifeGroup(name: string): string {
  const lowerName = name.toLowerCase();
  for (const [group, keywords] of Object.entries(WILDLIFE_GROUPS)) {
    if (keywords.some(kw => lowerName.includes(kw))) return group;
  }
  return 'Other Wildlife';
}

export function formatDisplayName(name: string, category: string): string {
  if (!name || name === 'Unknown' || name === 'POI') return 'Unnamed Location';
  if (category === 'WILDLIFE') {
    const commonName = WILDLIFE_COMMON_NAMES[name];
    if (commonName) return `${commonName} (${name})`;
  }
  return name.replace(/^the\s+/i, '').split(/[\s_-]+/)
    .map(w => w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ').trim();
}

export interface ProcessedRecord extends GeoJSONFeature {
  id: string;
  displayName: string;
  group: string;
  duplicateCount: number;
  sources: string[];
  bestConfidence: number;
}

export interface GroupedResults {
  [groupName: string]: ProcessedRecord[];
}

export function deduplicateRecords(features: GeoJSONFeature[]): ProcessedRecord[] {
  if (!features?.length) return [];
  
  const grouped = new Map<string, GeoJSONFeature[]>();
  
  features.forEach(feature => {
    const props = feature.properties as Record<string, unknown>;
    const name = String(props?.name || props?.title || props?.species || 'Unknown');
    const category = String(props?.category || 'OTHER').toUpperCase();
    const coords = feature.geometry?.type === 'Point' ? feature.geometry.coordinates as number[] : null;
    const dedupKey = `${category}:${normalizeString(name)}:${coords ? getGeoKey(coords, 4) : 'nogeo'}`;
    
    if (!grouped.has(dedupKey)) grouped.set(dedupKey, []);
    grouped.get(dedupKey)!.push(feature);
  });
  
  const processed: ProcessedRecord[] = [];
  let idCounter = 0;
  
  grouped.forEach((group) => {
    const sorted = group.sort((a, b) => {
      const propsA = a.properties as Record<string, unknown>;
      const propsB = b.properties as Record<string, unknown>;
      return Number(propsB?.confidence || 0) - Number(propsA?.confidence || 0);
    });
    
    const primary = sorted[0];
    const props = primary.properties as Record<string, unknown>;
    const category = String(props?.category || 'OTHER').toUpperCase();
    const rawName = String(props?.name || props?.title || props?.species || 'Unknown');
    const sources = [...new Set(group.map(f => String((f.properties as Record<string, unknown>)?.source || 'Unknown')))];
    const bestConfidence = Math.max(...group.map(f => Number((f.properties as Record<string, unknown>)?.confidence || 0.5)));
    
    let groupName = category === 'WILDLIFE' ? getWildlifeGroup(rawName) :
      category === 'RECREATION' ? String(props?.facility_type || props?.leisure_type || 'Recreation').replace(/_/g, ' ') :
      category.charAt(0) + category.slice(1).toLowerCase();
    
    processed.push({
      ...primary,
      id: `record-${idCounter++}`,
      displayName: formatDisplayName(rawName, category),
      group: groupName,
      duplicateCount: group.length,
      sources,
      bestConfidence,
    });
  });
  
  return processed.sort((a, b) => b.bestConfidence - a.bestConfidence);
}

export function groupResults(records: ProcessedRecord[]): GroupedResults {
  const groups: GroupedResults = {};
  records.forEach(record => {
    if (!groups[record.group]) groups[record.group] = [];
    groups[record.group].push(record);
  });
  return Object.fromEntries(Object.entries(groups).sort((a, b) => b[1].length - a[1].length));
}

export function getDataStats(records: ProcessedRecord[]) {
  const totalRecords = records.length;
  const totalDuplicatesRemoved = records.reduce((sum, r) => sum + r.duplicateCount - 1, 0);
  const uniqueSources = new Set(records.flatMap(r => r.sources)).size;
  const categories = new Set(records.map(r => String((r.properties as Record<string, unknown>)?.category || 'OTHER'))).size;
  const avgConfidence = records.reduce((sum, r) => sum + r.bestConfidence, 0) / records.length || 0;
  const highConfidenceCount = records.filter(r => r.bestConfidence >= 0.8).length;
  const withCoordinates = records.filter(r => r.geometry?.type === 'Point').length;
  const geoPercent = Math.round((withCoordinates / totalRecords) * 100) || 0;
  
  return { totalRecords, totalDuplicatesRemoved, uniqueSources, categories, avgConfidence, highConfidenceCount, withCoordinates, geoPercent };
}
