// 🌍 BASED DATA ENGINE v6.0 - SELF-EVOLVING DATA TAP 🌍
// 70+ built-in sources + DYNAMIC COLLECTOR GENESIS + AUTO-ENRICHMENT
// AI generates new collectors on-the-fly, executes them, archives for future use
// Minimal queries auto-expand for comprehensive data coverage
// The data empire grows with every query

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USER_AGENT = 'OMNISCIENT/4.0 (baseddata.io)';
const LOVABLE_AI_URL = 'https://api-prod.lovable.dev/ai/generate';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CollectionParams {
  keywords: string[];
  location?: { name: string; center?: [number, number]; bbox?: [number, number, number, number] };
  timeRange?: { start: string; end: string };
  limit?: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] | number[][][] };
  properties: Record<string, any>;
}

interface ParsedIntent {
  use_case: string;
  location: { name: string; center?: [number, number]; bbox?: [number, number, number, number] } | null;
  time_context: { type: string; season?: string };
  categories: string[];
  keywords: string[];
  confidence: number;
}

interface DynamicCollector {
  id?: string;
  name: string;
  description: string;
  api_url: string;
  api_method: string;
  headers: Record<string, string>;
  params_template: Record<string, string>;
  response_mapping: {
    features_path: string;
    lat_path: string;
    lng_path: string;
    name_path: string;
    description_path?: string;
    id_path?: string;
  };
  categories: string[];
  keywords: string[];
}

// ============================================================================
// PART 1: WILDLIFE & BIODIVERSITY (8 sources)
// ============================================================================

async function collectEBird(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const lat = (bbox[1] + bbox[3]) / 2;
    const lng = (bbox[0] + bbox[2]) / 2;
    
    const response = await fetch(
      `https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=50&maxResults=100`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const obs of data) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [obs.lng, obs.lat] },
        properties: {
          source: 'ebird', source_id: obs.subId, category: 'WILDLIFE', subcategory: 'bird_sighting',
          name: obs.comName, description: `${obs.howMany || 1} observed at ${obs.locName}`,
          timestamp: obs.obsDt, attributes: { species_code: obs.speciesCode, count: obs.howMany },
          confidence: obs.obsValid ? 0.9 : 0.7,
        },
      });
    }
  } catch (e) { console.error('eBird error:', e); }
  return features;
}

async function collectINaturalist(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('nelat', String(bbox[3]));
    url.searchParams.set('nelng', String(bbox[2]));
    url.searchParams.set('swlat', String(bbox[1]));
    url.searchParams.set('swlng', String(bbox[0]));
    url.searchParams.set('per_page', '100');
    
    const response = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const obs of data.results || []) {
      if (!obs.geojson) continue;
      features.push({
        type: 'Feature', geometry: obs.geojson,
        properties: {
          source: 'inaturalist', source_id: String(obs.id), category: 'WILDLIFE', subcategory: 'observation',
          name: obs.taxon?.common_name || obs.taxon?.name || 'Unknown',
          description: obs.description || `By ${obs.user?.login}`, timestamp: obs.observed_on,
          attributes: { scientific_name: obs.taxon?.name, taxon_id: obs.taxon?.id },
          confidence: 0.85,
        },
      });
    }
  } catch (e) { console.error('iNaturalist error:', e); }
  return features;
}

async function collectGBIF(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const url = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${bbox[1]},${bbox[3]}&decimalLongitude=${bbox[0]},${bbox[2]}&limit=100`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const occ of data.results || []) {
      if (!occ.decimalLatitude || !occ.decimalLongitude) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [occ.decimalLongitude, occ.decimalLatitude] },
        properties: {
          source: 'gbif', source_id: String(occ.key), category: 'WILDLIFE', subcategory: 'biodiversity',
          name: occ.species || occ.scientificName || 'Unknown', description: `${occ.kingdom} - ${occ.family}`,
          timestamp: occ.eventDate, attributes: { kingdom: occ.kingdom, family: occ.family },
          confidence: 0.8,
        },
      });
    }
  } catch (e) { console.error('GBIF error:', e); }
  return features;
}

async function collectUSFWS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      `https://services.arcgis.com/QVENGdaPbd4LUkLV/arcgis/rest/services/FWS_National_Wildlife_Refuge_Boundaries/FeatureServer/0/query?where=1=1&outFields=*&geometry=${bbox?.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&f=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of data.features || []) {
      const attrs = feat.attributes;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [attrs.LONG_ || -98, attrs.LAT || 39] },
        properties: {
          source: 'usfws', source_id: attrs.OBJECTID, category: 'WILDLIFE', subcategory: 'refuge',
          name: attrs.ORGNAME || 'Wildlife Refuge', description: `${attrs.RSL_TYPE || 'National Wildlife Refuge'}`,
          attributes: { acres: attrs.GIS_ACRES, state: attrs.STATE },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('USFWS error:', e); }
  return features;
}

async function collectMovebank(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://www.movebank.org/movebank/service/public/json?entity_type=study&i_have_download_access=true',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const study of (data || []).slice(0, 50)) {
      if (!study.main_location_lat || !study.main_location_long) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [study.main_location_long, study.main_location_lat] },
        properties: {
          source: 'movebank', source_id: String(study.id), category: 'WILDLIFE', subcategory: 'tracking_study',
          name: study.name, description: `${study.number_of_individuals || 0} individuals tracked`,
          attributes: { species: study.taxon_ids, individuals: study.number_of_individuals },
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('Movebank error:', e); }
  return features;
}

async function collectBirdCast(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    // BirdCast migration forecast - uses location center
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        source: 'birdcast', source_id: `migration_${lat}_${lng}`, category: 'WILDLIFE', subcategory: 'migration_forecast',
        name: 'Bird Migration Forecast', description: 'Check birdcast.info for real-time migration intensity',
        attributes: { data_type: 'migration_radar', url: 'https://birdcast.info' },
        confidence: 0.85,
      },
    });
  } catch (e) { console.error('BirdCast error:', e); }
  return features;
}

async function collectXenoCanto(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const lat = (bbox[1] + bbox[3]) / 2;
    const lng = (bbox[0] + bbox[2]) / 2;
    
    const response = await fetch(
      `https://xeno-canto.org/api/2/recordings?query=box:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const rec of (data.recordings || []).slice(0, 50)) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(rec.lng), parseFloat(rec.lat)] },
        properties: {
          source: 'xeno_canto', source_id: rec.id, category: 'WILDLIFE', subcategory: 'bird_audio',
          name: rec.en || rec.sp, description: `Recording by ${rec.rec}`,
          attributes: { species: rec.sp, duration: rec.length, quality: rec.q },
          confidence: 0.85,
        },
      });
    }
  } catch (e) { console.error('Xeno-Canto error:', e); }
  return features;
}

// ============================================================================
// PART 2: WEATHER & CLIMATE (8 sources)
// ============================================================================

async function collectNOAAWeather(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    const pointResp = await fetch(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' }
    });
    if (!pointResp.ok) return features;
    const pointData = await pointResp.json();
    
    if (pointData.properties?.forecast) {
      const forecastResp = await fetch(pointData.properties.forecast, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' }
      });
      if (forecastResp.ok) {
        const forecastData = await forecastResp.json();
        for (const period of (forecastData.properties?.periods || []).slice(0, 7)) {
          features.push({
            type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {
              source: 'noaa_weather', source_id: `forecast_${period.number}`, category: 'WEATHER', subcategory: 'forecast',
              name: period.name, description: period.detailedForecast, timestamp: period.startTime,
              attributes: { temperature: period.temperature, wind_speed: period.windSpeed },
              confidence: 0.95,
            },
          });
        }
      }
    }
    
    // Alerts
    const alertsResp = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lng}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' }
    });
    if (alertsResp.ok) {
      const alertsData = await alertsResp.json();
      for (const alert of alertsData.features || []) {
        features.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            source: 'noaa_weather', source_id: alert.properties?.id, category: 'WEATHER', subcategory: 'alert',
            name: alert.properties?.headline, description: alert.properties?.description,
            attributes: { severity: alert.properties?.severity, event: alert.properties?.event },
            confidence: 1.0,
          },
        });
      }
    }
  } catch (e) { console.error('NOAA Weather error:', e); }
  return features;
}

async function collectEPAAirQuality(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    const response = await fetch(
      `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lng}&distance=50`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const obs of data || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [obs.Longitude, obs.Latitude] },
        properties: {
          source: 'epa_airnow', source_id: `${obs.ReportingArea}_${obs.ParameterName}`,
          category: 'WEATHER', subcategory: 'air_quality',
          name: `${obs.ParameterName} - ${obs.ReportingArea}`,
          description: `AQI: ${obs.AQI} (${obs.Category?.Name})`,
          attributes: { aqi: obs.AQI, parameter: obs.ParameterName, category: obs.Category?.Name },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('EPA AirNow error:', e); }
  return features;
}

async function collectOpenMeteo(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,windspeed_10m&daily=sunrise,sunset,uv_index_max&timezone=auto`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (let i = 0; i < Math.min(24, data.hourly?.time?.length || 0); i++) {
      features.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'open_meteo', source_id: `hourly_${i}`, category: 'WEATHER', subcategory: 'hourly_forecast',
          name: `Hour ${i}`, description: `${data.hourly.temperature_2m[i]}°C, ${data.hourly.precipitation[i]}mm`,
          timestamp: data.hourly.time[i],
          attributes: { temp: data.hourly.temperature_2m[i], precip: data.hourly.precipitation[i], wind: data.hourly.windspeed_10m[i] },
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('Open-Meteo error:', e); }
  return features;
}

async function collectNOAAClimate(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      `https://www.ncei.noaa.gov/cdo-web/api/v2/stations?limit=25&extent=${bbox?.join(',')}`,
      { headers: { 'User-Agent': USER_AGENT, 'token': 'demo' } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const station of data.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [station.longitude, station.latitude] },
        properties: {
          source: 'noaa_cdo', source_id: station.id, category: 'WEATHER', subcategory: 'climate_station',
          name: station.name, description: `Climate station (${station.datacoverage * 100}% coverage)`,
          attributes: { elevation: station.elevation, mindate: station.mindate, maxdate: station.maxdate },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NOAA Climate error:', e); }
  return features;
}

async function collectNASAPower(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    const response = await fetch(
      `https://power.larc.nasa.gov/api/temporal/climatology/point?latitude=${lat}&longitude=${lng}&community=RE&parameters=ALLSKY_SFC_SW_DWN,T2M,WS10M&format=JSON`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    features.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        source: 'nasa_power', source_id: `power_${lat}_${lng}`, category: 'WEATHER', subcategory: 'solar_climate',
        name: 'NASA POWER Climatology', description: 'Solar irradiance and meteorological data',
        attributes: data.properties?.parameter || {},
        confidence: 0.95,
      },
    });
  } catch (e) { console.error('NASA POWER error:', e); }
  return features;
}

async function collectPurpleAir(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    // PurpleAir API requires API key in production, this is a placeholder
    features.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [(bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2] },
      properties: {
        source: 'purpleair', source_id: 'purpleair_network', category: 'WEATHER', subcategory: 'air_quality_sensors',
        name: 'PurpleAir Network', description: 'Community air quality sensors available at purpleair.com',
        attributes: { data_type: 'real_time_aqi', url: 'https://map.purpleair.com' },
        confidence: 0.85,
      },
    });
  } catch (e) { console.error('PurpleAir error:', e); }
  return features;
}

// ============================================================================
// PART 3: MARINE & OCEANOGRAPHIC (8 sources)
// ============================================================================

async function collectNOAATides(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    
    const stationsResp = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json', { headers: { 'User-Agent': USER_AGENT } });
    if (!stationsResp.ok) return features;
    const stationsData = await stationsResp.json();
    
    const nearbyStations = (stationsData.stations || []).filter((s: any) => {
      const lat = parseFloat(s.lat), lng = parseFloat(s.lng);
      return lat >= bbox[1] && lat <= bbox[3] && lng >= bbox[0] && lng <= bbox[2];
    }).slice(0, 5);
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const beginDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const endDate = nextWeek.toISOString().slice(0, 10).replace(/-/g, '');
    
    for (const station of nearbyStations) {
      const tideResp = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${station.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&begin_date=${beginDate}&end_date=${endDate}&interval=hilo`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (tideResp.ok) {
        const tideData = await tideResp.json();
        for (const pred of (tideData.predictions || []).slice(0, 20)) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [parseFloat(station.lng), parseFloat(station.lat)] },
            properties: {
              source: 'noaa_tides', source_id: `${station.id}_${pred.t}`, category: 'MARINE', subcategory: 'tide_prediction',
              name: `${pred.type === 'H' ? 'High' : 'Low'} Tide at ${station.name}`,
              description: `${pred.v} ft`, timestamp: pred.t,
              attributes: { station_id: station.id, height_ft: parseFloat(pred.v), tide_type: pred.type === 'H' ? 'high' : 'low' },
              confidence: 0.95,
            },
          });
        }
      }
    }
  } catch (e) { console.error('NOAA Tides error:', e); }
  return features;
}

async function collectNOAABuoys(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch('https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt', { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return features;
    const text = await response.text();
    const lines = text.split('\n').slice(2);
    
    for (const line of lines.slice(0, 100)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const [station, lat, lon] = parts;
      const latNum = parseFloat(lat), lonNum = parseFloat(lon);
      
      if (bbox && (latNum < bbox[1] || latNum > bbox[3] || lonNum < bbox[0] || lonNum > bbox[2])) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lonNum, latNum] },
        properties: {
          source: 'noaa_ndbc', source_id: station, category: 'MARINE', subcategory: 'buoy',
          name: `NDBC Buoy ${station}`, description: `Real-time buoy observations`,
          attributes: { wind_dir: parts[5], wind_speed: parts[6], wave_height: parts[8] },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NOAA Buoys error:', e); }
  return features;
}

async function collectMarineCharts(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      `https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/2/query?where=1=1&geometry=${bbox?.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*&f=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of (data.features || []).slice(0, 50)) {
      const attrs = feat.attributes || {};
      const geom = feat.geometry;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geom.x || -98, geom.y || 39] },
        properties: {
          source: 'noaa_charts', source_id: attrs.OBJECTID, category: 'MARINE', subcategory: 'navigation_aid',
          name: attrs.OBJNAM || 'Navigation Aid', description: attrs.INFORM || 'Chart feature',
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('Marine Charts error:', e); }
  return features;
}

async function collectOpenSeaMap(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    features.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [(bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2] },
      properties: {
        source: 'openseamap', source_id: 'osm_marine', category: 'MARINE', subcategory: 'marine_pois',
        name: 'OpenSeaMap Data', description: 'Marine POIs, harbors, navigation marks at openseamap.org',
        attributes: { data_type: 'marine_crowdsourced', url: 'https://www.openseamap.org' },
        confidence: 0.8,
      },
    });
  } catch (e) { console.error('OpenSeaMap error:', e); }
  return features;
}

async function collectNOAACurrents(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const stationsResp = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/currentstations.json', { headers: { 'User-Agent': USER_AGENT } });
    if (!stationsResp.ok) return features;
    const data = await stationsResp.json();
    
    for (const station of (data.currentStations || []).slice(0, 25)) {
      const lat = parseFloat(station.lat), lng = parseFloat(station.lng);
      if (bbox && (lat < bbox[1] || lat > bbox[3] || lng < bbox[0] || lng > bbox[2])) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'noaa_currents', source_id: station.id, category: 'MARINE', subcategory: 'current_station',
          name: station.name, description: `Current station ${station.id}`,
          attributes: { station_type: station.type },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NOAA Currents error:', e); }
  return features;
}

// ============================================================================
// PART 4: GOVERNMENT & CONTRACTS (10 sources)
// ============================================================================

async function collectUSASpending(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: '2022-01-01', end_date: '2026-12-31' }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          ...(params.keywords.length > 0 && { keywords: params.keywords.slice(0, 5) }),
        },
        fields: ['recipient_name', 'total_obligation', 'awarding_agency_name', 'description', 'place_of_performance_state_code'],
        limit: 50, order: 'desc', sort: 'total_obligation',
      }),
    });
    if (!response.ok) return features;
    const data = await response.json();
    
    const stateCenters: Record<string, [number, number]> = {
      MD: [-76.64, 39.05], VA: [-78.66, 37.43], DC: [-77.04, 38.91], CA: [-119.42, 36.78],
      TX: [-99.90, 31.97], NY: [-74.01, 40.71], FL: [-81.52, 27.66], IL: [-89.40, 40.63],
    };
    
    for (const contract of data.results || []) {
      const stateCode = contract.place_of_performance_state_code || 'DC';
      const coords = stateCenters[stateCode] || [-98.58, 39.83];
      features.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: coords },
        properties: {
          source: 'usaspending', source_id: contract.generated_internal_id || String(Math.random()),
          category: 'GOVERNMENT', subcategory: 'federal_contract',
          name: contract.recipient_name, description: contract.description || 'Federal contract',
          attributes: { total_obligation: contract.total_obligation, agency: contract.awarding_agency_name },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('USASpending error:', e); }
  return features;
}

async function collectSAMGov(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?limit=25&postedFrom=2024-01-01&api_key=DEMO_KEY`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const opp of data.opportunitiesData || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98.58, 39.83] },
        properties: {
          source: 'sam_gov', source_id: opp.noticeId, category: 'GOVERNMENT', subcategory: 'opportunity',
          name: opp.title, description: opp.description?.slice(0, 200),
          attributes: { type: opp.type, postedDate: opp.postedDate, responseDeadline: opp.responseDeadLine },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('SAM.gov error:', e); }
  return features;
}

async function collectNIHReporter(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({
        criteria: { fiscal_years: [2024, 2025], ...(params.keywords.length > 0 && { advanced_text_search: { search_text: params.keywords.join(' ') } }) },
        limit: 25, offset: 0,
      }),
    });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const project of data.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [project.organization?.org_longitude || -98, project.organization?.org_latitude || 39] },
        properties: {
          source: 'nih_reporter', source_id: project.project_num, category: 'GOVERNMENT', subcategory: 'research_grant',
          name: project.project_title, description: project.abstract_text?.slice(0, 200),
          attributes: { award_amount: project.award_amount, org: project.organization?.org_name, pi: project.principal_investigators?.[0]?.full_name },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NIH Reporter error:', e); }
  return features;
}

async function collectNSFAwards(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const keyword = params.keywords[0] || 'research';
    const response = await fetch(
      `https://api.nsf.gov/services/v1/awards.json?keyword=${keyword}&printFields=id,title,abstractText,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt&offset=1&rpp=25`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const award of data.response?.award || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'nsf', source_id: award.id, category: 'GOVERNMENT', subcategory: 'nsf_grant',
          name: award.title, description: award.abstractText?.slice(0, 200),
          attributes: { amount: award.fundsObligatedAmt, awardee: award.awardeeName, city: award.awardeeCity },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NSF Awards error:', e); }
  return features;
}

async function collectUSPTO(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const keyword = params.keywords[0] || 'technology';
    const response = await fetch(
      `https://api.patentsview.org/patents/query?q={"_text_any":{"patent_title":"${keyword}"}}&f=["patent_number","patent_title","patent_abstract","patent_date"]&o={"page":1,"per_page":25}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const patent of data.patents || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'uspto', source_id: patent.patent_number, category: 'GOVERNMENT', subcategory: 'patent',
          name: patent.patent_title, description: patent.patent_abstract?.slice(0, 200),
          timestamp: patent.patent_date,
          attributes: { patent_number: patent.patent_number },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('USPTO error:', e); }
  return features;
}

async function collectSECEdgar(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch('https://data.sec.gov/submissions/CIK0000320193.json', { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const filing of (data.filings?.recent?.form || []).slice(0, 20)) {
      const idx = data.filings.recent.form.indexOf(filing);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-122.03, 37.33] },
        properties: {
          source: 'sec_edgar', source_id: data.filings.recent.accessionNumber[idx],
          category: 'ECONOMIC', subcategory: 'sec_filing',
          name: `${data.name} - ${filing}`, description: `SEC ${filing} filing`,
          timestamp: data.filings.recent.filingDate[idx],
          attributes: { form: filing, cik: data.cik },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('SEC Edgar error:', e); }
  return features;
}

async function collectDataGov(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const query = params.keywords.slice(0, 3).join(' ') || 'data';
    const response = await fetch(
      `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=25`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const dataset of data.result?.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'data_gov', source_id: dataset.id, category: 'GOVERNMENT', subcategory: 'open_dataset',
          name: dataset.title, description: dataset.notes?.slice(0, 200),
          attributes: { organization: dataset.organization?.title, resources: dataset.resources?.length },
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('Data.gov error:', e); }
  return features;
}

async function collectRegulationsGov(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-77.04, 38.91] },
      properties: {
        source: 'regulations_gov', source_id: 'reg_gov_placeholder', category: 'REGULATIONS', subcategory: 'federal_regulations',
        name: 'Federal Regulations', description: 'Search regulations.gov for federal dockets and comments',
        attributes: { url: 'https://www.regulations.gov', note: 'Requires API key for full access' },
        confidence: 0.8,
      },
    });
  } catch (e) { console.error('Regulations.gov error:', e); }
  return features;
}

async function collectBLM(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const response = await fetch(
      `https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Boundaries_Public_Lands/MapServer/0/query?where=1=1&geometry=${bbox.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*&f=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of (data.features || []).slice(0, 50)) {
      const attrs = feat.attributes || {};
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-110, 39] },
        properties: {
          source: 'blm', source_id: attrs.OBJECTID, category: 'GEOSPATIAL', subcategory: 'public_land',
          name: attrs.ADMIN_UNIT_NAME || 'BLM Land', description: attrs.SMA_NAME || 'Public lands',
          attributes: { acres: attrs.GIS_ACRES, admin_state: attrs.ADMIN_ST },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('BLM error:', e); }
  return features;
}

async function collectUSFS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const response = await fetch(
      `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RecreationOpportunities_01/MapServer/0/query?where=1=1&geometry=${bbox.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*&f=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of (data.features || []).slice(0, 50)) {
      const attrs = feat.attributes || {};
      const geom = feat.geometry;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geom?.x || -110, geom?.y || 39] },
        properties: {
          source: 'usfs', source_id: attrs.OBJECTID, category: 'GEOSPATIAL', subcategory: 'recreation',
          name: attrs.RECAREANAME || 'Recreation Area', description: attrs.RECAREAURL || 'National Forest recreation',
          attributes: { forest: attrs.FORESTNAME, activity: attrs.ACTIVITYNAME },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('USFS error:', e); }
  return features;
}

// ============================================================================
// PART 5: ECONOMIC & DEMOGRAPHICS (6 sources)
// ============================================================================

async function collectCensus(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://api.census.gov/data/2021/acs/acs5?get=NAME,B01001_001E,B19013_001E&for=state:*',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    const stateCenters: Record<string, [number, number]> = {
      'California': [-119.42, 36.78], 'Texas': [-99.90, 31.97], 'Florida': [-81.52, 27.66],
      'New York': [-74.22, 43.30], 'Pennsylvania': [-77.19, 41.20],
    };
    
    for (const row of data.slice(1)) {
      const [name, pop, income, stateCode] = row;
      const coords = stateCenters[name] || [-98, 39];
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          source: 'census', source_id: `state_${stateCode}`, category: 'DEMOGRAPHICS', subcategory: 'population',
          name: name, description: `Population: ${parseInt(pop).toLocaleString()}, Median Income: $${parseInt(income).toLocaleString()}`,
          attributes: { population: parseInt(pop), median_income: parseInt(income), state_code: stateCode },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('Census error:', e); }
  return features;
}

async function collectBLS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({ seriesid: ['CUUR0000SA0', 'LNS14000000'], startyear: '2024', endyear: '2025' }),
    });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const series of data.Results?.series || []) {
      for (const item of series.data?.slice(0, 6) || []) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-98, 39] },
          properties: {
            source: 'bls', source_id: `${series.seriesID}_${item.year}_${item.period}`,
            category: 'ECONOMIC', subcategory: 'labor_statistics',
            name: series.seriesID.includes('CUUR') ? 'Consumer Price Index' : 'Unemployment Rate',
            description: `Value: ${item.value} (${item.periodName} ${item.year})`,
            timestamp: `${item.year}-${item.period.replace('M', '')}-01`,
            attributes: { value: parseFloat(item.value), series: series.seriesID },
            confidence: 0.95,
          },
        });
      }
    }
  } catch (e) { console.error('BLS error:', e); }
  return features;
}

async function collectFRED(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const series = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'];
    for (const s of series) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-90.20, 38.63] },
        properties: {
          source: 'fred', source_id: s, category: 'ECONOMIC', subcategory: 'economic_indicator',
          name: s, description: `Federal Reserve Economic Data - ${s}`,
          attributes: { series_id: s, url: `https://fred.stlouisfed.org/series/${s}` },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('FRED error:', e); }
  return features;
}

async function collectHUD(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-77.04, 38.91] },
      properties: {
        source: 'hud', source_id: 'hud_housing_data', category: 'ECONOMIC', subcategory: 'housing',
        name: 'HUD Housing Data', description: 'Fair market rents, public housing data at huduser.gov',
        attributes: { url: 'https://www.huduser.gov/portal/datasets/fmr.html', data_type: 'housing_market' },
        confidence: 0.85,
      },
    });
  } catch (e) { console.error('HUD error:', e); }
  return features;
}

// ============================================================================
// PART 6: GEOSPATIAL & INFRASTRUCTURE (10 sources)
// ============================================================================

async function collectOpenStreetMap(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    
    const isHunting = params.keywords.some(k => ['hunt', 'goose', 'duck', 'waterfowl', 'bird', 'island'].includes(k.toLowerCase()));
    let query = isHunting ? `
      [out:json][timeout:30][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];
      (node["natural"="island"];way["natural"="island"];node["natural"="wetland"];way["natural"="wetland"];);
      out center body;
    ` : `
      [out:json][timeout:30][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];
      (node["tourism"];way["tourism"];node["natural"];way["natural"];);
      out center body;>;out skel qt;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query, headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const element of (data.elements || []).slice(0, 100)) {
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;
      if (!lat || !lon) continue;
      features.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'openstreetmap', source_id: String(element.id), category: 'GEOSPATIAL',
          subcategory: element.tags?.natural || element.tags?.tourism || 'poi',
          name: element.tags?.name || element.tags?.natural || 'Unknown',
          description: Object.entries(element.tags || {}).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', '),
          attributes: element.tags || {}, confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('OSM error:', e); }
  return features;
}

async function collectUSGS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    
    const response = await fetch(
      `https://waterservices.usgs.gov/nwis/site/?format=json&bBox=${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}&siteType=LK,ST,SP&siteStatus=active`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const site of (data.value?.timeSeries || []).slice(0, 50)) {
      const info = site.sourceInfo;
      if (!info?.geoLocation?.geogLocation) continue;
      const loc = info.geoLocation.geogLocation;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] },
        properties: {
          source: 'usgs', source_id: info.siteCode?.[0]?.value || String(Math.random()),
          category: 'GEOSPATIAL', subcategory: 'hydrology',
          name: info.siteName, description: `USGS site - ${info.siteCode?.[0]?.value}`,
          attributes: { site_type: info.siteProperty?.find((p: any) => p.name === 'siteTypeCd')?.value },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('USGS error:', e); }
  return features;
}

async function collectUSGSEarthquakes(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const eq of (data.features || []).slice(0, 50)) {
      if (bbox) {
        const [lon, lat] = eq.geometry.coordinates;
        if (lat < bbox[1] || lat > bbox[3] || lon < bbox[0] || lon > bbox[2]) continue;
      }
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: eq.geometry.coordinates.slice(0, 2) },
        properties: {
          source: 'usgs_earthquake', source_id: eq.id, category: 'GEOSPATIAL', subcategory: 'seismic',
          name: eq.properties.place, description: `Magnitude ${eq.properties.mag}`,
          timestamp: new Date(eq.properties.time).toISOString(),
          attributes: { magnitude: eq.properties.mag, depth: eq.geometry.coordinates[2] },
          confidence: 0.99,
        },
      });
    }
  } catch (e) { console.error('USGS Earthquake error:', e); }
  return features;
}

async function collectNASAFIRMS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://firms.modaps.eosdis.nasa.gov/api/area/csv/DEMO_KEY/VIIRS_SNPP_NRT/world/1',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const text = await response.text();
    const lines = text.split('\n').slice(1);
    
    for (const line of lines.slice(0, 100)) {
      const parts = line.split(',');
      if (parts.length < 5) continue;
      const [lat, lon, brightness] = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])];
      if (isNaN(lat) || isNaN(lon)) continue;
      if (bbox && (lat < bbox[1] || lat > bbox[3] || lon < bbox[0] || lon > bbox[2])) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'nasa_firms', source_id: `fire_${lat}_${lon}`, category: 'GEOSPATIAL', subcategory: 'active_fire',
          name: 'Active Fire Detection', description: `Brightness: ${brightness}K`,
          attributes: { brightness, satellite: 'VIIRS' },
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('NASA FIRMS error:', e); }
  return features;
}

async function collectFEMA(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=50&$orderby=declarationDate%20desc',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const disaster of data.DisasterDeclarationsSummaries || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'fema', source_id: disaster.disasterNumber, category: 'GEOSPATIAL', subcategory: 'disaster',
          name: disaster.declarationTitle, description: `${disaster.incidentType} in ${disaster.state}`,
          timestamp: disaster.declarationDate,
          attributes: { type: disaster.incidentType, state: disaster.state, status: disaster.declaredCountyArea },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('FEMA error:', e); }
  return features;
}

async function collectCensusTIGER(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const response = await fetch(
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/2/query?where=1=1&geometry=${bbox.join(',')}&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*&f=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of (data.features || []).slice(0, 25)) {
      const attrs = feat.attributes || {};
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'census_tiger', source_id: attrs.GEOID, category: 'GEOSPATIAL', subcategory: 'boundary',
          name: attrs.NAME || 'Census Boundary', description: `FIPS: ${attrs.GEOID}`,
          attributes: { geoid: attrs.GEOID, lsad: attrs.LSAD },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('Census TIGER error:', e); }
  return features;
}

// ============================================================================
// PART 7: TRANSPORTATION (6 sources)
// ============================================================================

async function collectFAA(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://services.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0/query?where=1=1&outFields=*&f=json&resultRecordCount=50',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const feat of (data.features || []).slice(0, 50)) {
      const attrs = feat.attributes;
      const geom = feat.geometry;
      if (bbox && (geom.y < bbox[1] || geom.y > bbox[3] || geom.x < bbox[0] || geom.x > bbox[2])) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geom.x, geom.y] },
        properties: {
          source: 'faa', source_id: attrs.IDENT, category: 'TRANSPORTATION', subcategory: 'airport',
          name: attrs.NAME, description: `${attrs.TYPE_CODE} - ${attrs.CITY}, ${attrs.STATE}`,
          attributes: { icao: attrs.ICAO_ID, type: attrs.TYPE_CODE, elevation: attrs.ELEVATION },
          confidence: 0.99,
        },
      });
    }
  } catch (e) { console.error('FAA error:', e); }
  return features;
}

async function collectOpenSky(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const bboxParam = bbox ? `&lamin=${bbox[1]}&lomin=${bbox[0]}&lamax=${bbox[3]}&lomax=${bbox[2]}` : '';
    const response = await fetch(
      `https://opensky-network.org/api/states/all?${bboxParam}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const state of (data.states || []).slice(0, 100)) {
      const [icao24, callsign, country, timePos, lastContact, lon, lat, altitude, onGround, velocity] = state;
      if (!lat || !lon) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'opensky', source_id: icao24, category: 'TRANSPORTATION', subcategory: 'aircraft',
          name: callsign?.trim() || icao24, description: `${country} aircraft at ${altitude}m`,
          attributes: { altitude, velocity, on_ground: onGround, country },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('OpenSky error:', e); }
  return features;
}

async function collectOSMRoads(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!bbox) return features;
    const query = `[out:json][timeout:25][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];(way["highway"~"motorway|trunk|primary"];);out center body;`;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query, headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const element of (data.elements || []).slice(0, 50)) {
      const center = element.center;
      if (!center) continue;
      features.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [center.lon, center.lat] },
        properties: {
          source: 'osm_roads', source_id: String(element.id), category: 'TRANSPORTATION', subcategory: 'highway',
          name: element.tags?.name || element.tags?.ref || 'Highway', description: `${element.tags?.highway} road`,
          attributes: { highway_type: element.tags?.highway, ref: element.tags?.ref },
          confidence: 0.9,
        },
      });
    }
  } catch (e) { console.error('OSM Roads error:', e); }
  return features;
}

// ============================================================================
// PART 8: ENERGY & UTILITIES (5 sources)
// ============================================================================

async function collectEIAEnergy(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://api.eia.gov/v2/electricity/facility-fuel/data/?frequency=annual&data[0]=total-consumption-quantity&sort[0][column]=period&sort[0][direction]=desc&length=25',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (response.ok) {
      const data = await response.json();
      for (const record of (data.response?.data || []).slice(0, 25)) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-98, 39] },
          properties: {
            source: 'eia', source_id: record.plantid || String(Math.random()),
            category: 'ENERGY', subcategory: 'power_plant',
            name: record.plantName || 'Power Facility', description: `${record.fuel2002} - ${record.state}`,
            attributes: { fuel_type: record.fuel2002, consumption: record['total-consumption-quantity'] },
            confidence: 0.9,
          },
        });
      }
    }
  } catch (e) { console.error('EIA error:', e); }
  return features;
}

async function collectNREL(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    const response = await fetch(
      `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=DEMO_KEY&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    if (data.outputs) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'nrel', source_id: `solar_${lat}_${lng}`, category: 'ENERGY', subcategory: 'solar_resource',
          name: 'Solar Resource', description: `Annual DNI: ${data.outputs.avg_dni?.annual} kWh/m²/day`,
          attributes: { avg_dni: data.outputs.avg_dni, avg_ghi: data.outputs.avg_ghi },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NREL error:', e); }
  return features;
}

async function collectDSIRE(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: params.location?.center || [-98, 39] },
      properties: {
        source: 'dsire', source_id: 'dsire_incentives', category: 'ENERGY', subcategory: 'incentives',
        name: 'Renewable Energy Incentives', description: 'Database of State Incentives for Renewables & Efficiency',
        attributes: { url: 'https://www.dsireusa.org', data_type: 'policy_database' },
        confidence: 0.85,
      },
    });
  } catch (e) { console.error('DSIRE error:', e); }
  return features;
}

// ============================================================================
// PART 9: HEALTH & RESEARCH (4 sources)
// ============================================================================

async function collectCDC(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://data.cdc.gov/resource/9mfq-cb36.json?$limit=25',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const record of data || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'cdc', source_id: record.mmwryear + '_' + record.mmwrweek,
          category: 'HEALTH', subcategory: 'surveillance',
          name: 'CDC Health Data', description: `Week ${record.mmwrweek}, ${record.mmwryear}`,
          attributes: { year: record.mmwryear, week: record.mmwrweek },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('CDC error:', e); }
  return features;
}

async function collectCMS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0?limit=25',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const hospital of data.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'cms', source_id: hospital.facility_id, category: 'HEALTH', subcategory: 'hospital',
          name: hospital.facility_name, description: `${hospital.city}, ${hospital.state}`,
          attributes: { type: hospital.hospital_type, ownership: hospital.hospital_ownership },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('CMS error:', e); }
  return features;
}

async function collectClinicalTrials(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const query = params.keywords[0] || 'cancer';
    const response = await fetch(
      `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=25`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const study of data.studies || []) {
      const protocol = study.protocolSection;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-98, 39] },
        properties: {
          source: 'clinicaltrials', source_id: protocol?.identificationModule?.nctId,
          category: 'HEALTH', subcategory: 'clinical_trial',
          name: protocol?.identificationModule?.briefTitle?.slice(0, 100),
          description: protocol?.descriptionModule?.briefSummary?.slice(0, 200),
          attributes: { status: protocol?.statusModule?.overallStatus, phase: protocol?.designModule?.phases?.[0] },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('ClinicalTrials error:', e); }
  return features;
}

// ============================================================================
// PART 10: REGULATIONS & RECREATION (5 sources)
// ============================================================================

async function collectHuntingRegulations(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const state = params.location?.name?.toLowerCase() || 'new york';
    
    if (state.includes('new york') || state.includes('long island')) {
      const regulations = [
        { name: 'NY Migratory Bird Season - Canada Goose', description: 'Oct 1 - Jan 15. Daily limit: 3.', type: 'hunting_season', species: 'Canada Goose' },
        { name: 'NY Waterfowl Shooting Hours', description: '30 min before sunrise to sunset.', type: 'regulation' },
        { name: 'NY License Requirements', description: 'Hunting license + HIP + Federal Duck Stamp required.', type: 'license' },
        { name: 'Non-Toxic Shot Requirement', description: 'Non-toxic shot required. Lead prohibited.', type: 'equipment' },
      ];
      
      for (const reg of regulations) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-73.1, 40.8] },
          properties: {
            source: 'ny_dec', source_id: reg.name.toLowerCase().replace(/\s+/g, '_'),
            category: 'REGULATIONS', subcategory: reg.type,
            name: reg.name, description: reg.description,
            attributes: { state: 'NY', species: reg.species }, confidence: 0.9,
          },
        });
      }
    }
  } catch (e) { console.error('Regulations error:', e); }
  return features;
}

async function collectRecreationGov(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    if (!params.location?.center) return features;
    const [lng, lat] = params.location.center;
    
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        source: 'recreation_gov', source_id: 'rec_gov_data', category: 'RECREATION', subcategory: 'campgrounds',
        name: 'Recreation.gov Data', description: 'Campgrounds, permits, and tours on federal lands',
        attributes: { url: 'https://www.recreation.gov', data_type: 'reservation_system' },
        confidence: 0.85,
      },
    });
  } catch (e) { console.error('Recreation.gov error:', e); }
  return features;
}

async function collectNPS(params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    const response = await fetch(
      'https://developer.nps.gov/api/v1/parks?limit=25&api_key=DEMO_KEY',
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!response.ok) return features;
    const data = await response.json();
    
    for (const park of data.data || []) {
      const lat = parseFloat(park.latitude);
      const lng = parseFloat(park.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'nps', source_id: park.parkCode, category: 'RECREATION', subcategory: 'national_park',
          name: park.fullName, description: park.description?.slice(0, 200),
          attributes: { designation: park.designation, states: park.states, url: park.url },
          confidence: 0.95,
        },
      });
    }
  } catch (e) { console.error('NPS error:', e); }
  return features;
}

// ============================================================================
// LOCATION PARSING & INTENT ANALYSIS
// ============================================================================

function parseLocation(text: string): { name: string; center?: [number, number]; bbox?: [number, number, number, number] } | null {
  const locations: Record<string, [number, number]> = {
    'long island': [-73.1, 40.8], 'new york': [-74.006, 40.7128], 'maryland': [-76.6413, 39.0458],
    'virginia': [-78.6569, 37.4316], 'washington dc': [-77.0369, 38.9072], 'dc': [-77.0369, 38.9072],
    'yellowstone': [-110.5885, 44.428], 'puget sound': [-122.4, 47.6], 'boulder': [-105.2705, 40.015],
    'phoenix': [-112.074, 33.4484], 'san francisco': [-122.4194, 37.7749], 'seattle': [-122.3321, 47.6062],
    'los angeles': [-118.2437, 34.0522], 'chicago': [-87.6298, 41.8781], 'miami': [-80.1918, 25.7617],
    'boston': [-71.0589, 42.3601], 'denver': [-104.9903, 39.7392], 'austin': [-97.7431, 30.2672],
    'portland': [-122.6765, 45.5152], 'atlanta': [-84.3880, 33.7490], 'dallas': [-96.7970, 32.7767],
    'houston': [-95.3698, 29.7604], 'philadelphia': [-75.1652, 39.9526], 'san diego': [-117.1611, 32.7157],
    'lake travis': [-97.9, 30.4], 'lake tahoe': [-120.0, 39.1], 'grand canyon': [-112.1, 36.1],
    'yosemite': [-119.5, 37.8], 'zion': [-113.0, 37.3], 'glacier': [-113.8, 48.7],
  };

  const textLower = text.toLowerCase();
  for (const [name, coords] of Object.entries(locations)) {
    if (textLower.includes(name)) {
      return { name, center: coords, bbox: toBBox(coords, 50) };
    }
  }
  return null;
}

function toBBox(center: [number, number], radiusKm: number): [number, number, number, number] {
  const lat = center[1], lng = center[0];
  const kmPerDegLat = 111, kmPerDegLng = 111 * Math.cos(lat * Math.PI / 180);
  const latDiff = radiusKm / kmPerDegLat, lngDiff = radiusKm / kmPerDegLng;
  return [lng - lngDiff, lat - latDiff, lng + lngDiff, lat + latDiff];
}

function analyzeIntent(prompt: string): ParsedIntent {
  const promptLower = prompt.toLowerCase();
  const location = parseLocation(prompt);
  
  const stopwords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or', 'my', 'me', 'i', 'give', 'get', 'need', 'want', 'everything', 'all', 'about', 'near', 'around']);
  const keywords = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
  
  const categories: string[] = [];
  
  if (/\b(hunt|hunting|geese|goose|duck|waterfowl|deer|bird|fish|fishing|wildlife|animal|species)\b/i.test(prompt)) {
    categories.push('WILDLIFE', 'REGULATIONS');
  }
  if (/\b(weather|forecast|rain|wind|temperature|climate|storm)\b/i.test(prompt)) {
    categories.push('WEATHER');
  }
  if (/\b(tide|tides|ocean|marine|boat|sailing|coastal|buoy)\b/i.test(prompt)) {
    categories.push('MARINE');
  }
  if (/\b(trail|hike|hiking|camping|outdoor|park|mountain|recreation)\b/i.test(prompt)) {
    categories.push('GEOSPATIAL', 'RECREATION');
  }
  if (/\b(contract|federal|government|agency|grant|funding|award)\b/i.test(prompt)) {
    categories.push('GOVERNMENT');
  }
  if (/\b(patent|research|science|study|university|lab)\b/i.test(prompt)) {
    categories.push('GOVERNMENT');
  }
  if (/\b(economy|economic|job|employment|income|gdp|inflation|census|population|demographic)\b/i.test(prompt)) {
    categories.push('ECONOMIC', 'DEMOGRAPHICS');
  }
  if (/\b(flight|airport|plane|aircraft|traffic|road|highway)\b/i.test(prompt)) {
    categories.push('TRANSPORTATION');
  }
  if (/\b(solar|energy|power|electricity|renewable|oil|gas)\b/i.test(prompt)) {
    categories.push('ENERGY');
  }
  if (/\b(health|hospital|disease|medical|covid|flu|cdc|trial)\b/i.test(prompt)) {
    categories.push('HEALTH');
  }
  if (/\b(earthquake|fire|wildfire|disaster|flood|emergency)\b/i.test(prompt)) {
    categories.push('GEOSPATIAL');
  }
  if (/\b(everything|all data|comprehensive)\b/i.test(prompt)) {
    categories.push('WILDLIFE', 'WEATHER', 'MARINE', 'GEOSPATIAL', 'GOVERNMENT', 'ECONOMIC', 'TRANSPORTATION', 'ENERGY', 'HEALTH', 'RECREATION');
  }
  
  if (categories.length === 0) categories.push('GEOSPATIAL', 'WEATHER');
  
  let timeContext: { type: string; season?: string } = { type: 'ongoing' };
  if (/december|winter|cold|snow/i.test(prompt)) timeContext = { type: 'seasonal', season: 'winter' };
  else if (/spring|april|may/i.test(prompt)) timeContext = { type: 'seasonal', season: 'spring' };
  else if (/summer|june|july|august/i.test(prompt)) timeContext = { type: 'seasonal', season: 'summer' };
  else if (/fall|autumn|september|october|november/i.test(prompt)) timeContext = { type: 'seasonal', season: 'fall' };
  
  let useCase = 'general_query';
  if (/hunt|hunting/i.test(prompt)) useCase = 'hunting_planning';
  else if (/fish|fishing/i.test(prompt)) useCase = 'fishing_planning';
  else if (/contract|federal/i.test(prompt)) useCase = 'government_research';
  else if (/solar|energy/i.test(prompt)) useCase = 'energy_assessment';
  else if (/hike|trail|camping/i.test(prompt)) useCase = 'recreation_planning';
  
  return { use_case: useCase, location, time_context: timeContext, categories: [...new Set(categories)], keywords, confidence: location ? 0.9 : 0.7 };
}

// ============================================================================
// AI-POWERED INSIGHT GENERATION (Lovable AI)
// ============================================================================

async function generateAIInsights(features: GeoJSONFeature[], intent: ParsedIntent, prompt: string): Promise<any> {
  const byCategory: Record<string, GeoJSONFeature[]> = {};
  for (const f of features) {
    const cat = f.properties.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(f);
  }
  
  // Build context for AI
  const dataContext = Object.entries(byCategory)
    .map(([cat, feats]) => `${cat}: ${feats.length} records (${feats.slice(0, 3).map(f => f.properties.name).join(', ')}...)`)
    .join('\n');
  
  // Try to use Lovable AI for enhanced insights
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Analyze this data collection and generate actionable insights.

QUERY: "${prompt}"
USE CASE: ${intent.use_case}
LOCATION: ${intent.location?.name || 'Not specified'}

DATA COLLECTED:
${dataContext}

SAMPLE RECORDS:
${JSON.stringify(features.slice(0, 10).map(f => ({ name: f.properties.name, category: f.properties.category, source: f.properties.source, description: f.properties.description })), null, 2)}

Generate a JSON response with:
{
  "summary": "2-3 sentence executive summary",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "warnings": ["warning if any"],
  "optimal_conditions": {
    "best_dates": ["date range if applicable"],
    "best_times": ["time of day if applicable"],
    "weather_requirements": ["weather conditions if applicable"]
  },
  "related_queries": ["follow-up query 1", "follow-up query 2"]
}

Focus on practical, actionable insights specific to the user's ${intent.use_case} use case.`
          }],
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          try {
            return JSON.parse(content);
          } catch (e) {
            console.error('Failed to parse AI response:', e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Lovable AI error:', e);
  }
  
  // Fallback to rule-based insights
  return generateFallbackInsights(features, intent, byCategory);
}

function generateFallbackInsights(features: GeoJSONFeature[], intent: ParsedIntent, byCategory: Record<string, GeoJSONFeature[]>) {
  const summary = `Collected ${features.length} data points from ${Object.keys(byCategory).length} categories for ${intent.location?.name || 'your area'}.`;
  const key_findings: string[] = [];
  const recommendations: string[] = [];
  const warnings: string[] = [];
  
  if (byCategory.WILDLIFE?.length) {
    const species = [...new Set(byCategory.WILDLIFE.map(f => f.properties.name))];
    key_findings.push(`${byCategory.WILDLIFE.length} wildlife observations: ${species.slice(0, 5).join(', ')}`);
  }
  if (byCategory.WEATHER?.length) {
    const alerts = byCategory.WEATHER.filter(f => f.properties.subcategory === 'alert');
    if (alerts.length) warnings.push(`${alerts.length} weather alerts active`);
    key_findings.push(`Weather data from ${byCategory.WEATHER.length} sources`);
  }
  if (byCategory.GOVERNMENT?.length) {
    const total = byCategory.GOVERNMENT.reduce((s, f) => s + (f.properties.attributes?.total_obligation || f.properties.attributes?.award_amount || 0), 0);
    key_findings.push(`${byCategory.GOVERNMENT.length} government records${total > 0 ? ` totaling $${(total / 1e6).toFixed(1)}M` : ''}`);
  }
  if (byCategory.MARINE?.length) {
    key_findings.push(`${byCategory.MARINE.length} marine/tide data points`);
  }
  if (byCategory.GEOSPATIAL?.length) {
    key_findings.push(`${byCategory.GEOSPATIAL.length} geospatial features mapped`);
  }
  if (byCategory.HEALTH?.length) {
    key_findings.push(`${byCategory.HEALTH.length} health data records`);
  }
  if (byCategory.TRANSPORTATION?.length) {
    key_findings.push(`${byCategory.TRANSPORTATION.length} transportation data points`);
  }
  
  // Add use-case specific recommendations
  if (intent.use_case === 'hunting_planning') {
    recommendations.push('Check local regulations for season dates and bag limits');
    recommendations.push('Review tide charts for optimal access times');
    recommendations.push('Monitor weather conditions for the planned dates');
  } else if (intent.use_case === 'fishing_planning') {
    recommendations.push('Check water conditions and recent catch reports');
    recommendations.push('Review local fishing regulations');
  } else if (intent.use_case === 'government_research') {
    recommendations.push('Filter by agency or contract type for targeted results');
    recommendations.push('Cross-reference with SAM.gov for opportunities');
  }
  
  return {
    summary,
    key_findings: key_findings.slice(0, 8),
    recommendations: recommendations.slice(0, 5),
    warnings,
    optimal_conditions: intent.time_context.season ? { best_dates: [`Peak ${intent.time_context.season} season`] } : undefined,
    related_queries: ['Detailed analysis', 'Historical comparison', 'Real-time monitoring']
  };
}

// ============================================================================
// PERSISTENCE LAYER
// ============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function persistRecords(supabase: any, features: GeoJSONFeature[]): Promise<{ persisted: number; deduplicated: number }> {
  let persisted = 0, deduplicated = 0;
  for (const feature of features.slice(0, 500)) { // Limit to 500 for performance
    try {
      const { data, error } = await supabase.rpc('upsert_record', {
        p_source_id: feature.properties.source, p_source_record_id: feature.properties.source_id,
        p_category: feature.properties.category, p_name: feature.properties.name,
        p_description: feature.properties.description || null, p_geometry: feature.geometry, p_properties: feature.properties,
      });
      if (!error && data) persisted++; else if (error?.code === '23505') deduplicated++;
    } catch (e) { console.error('Persist error:', e); }
  }
  return { persisted, deduplicated };
}

async function trackSourcePerformance(supabase: any, sources: Array<{ name: string; status: string; count: number; time_ms: number; error?: string }>): Promise<void> {
  for (const source of sources) {
    const sourceId = source.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await supabase.rpc('update_source_performance', {
        p_source_id: sourceId, p_source_name: source.name,
        p_success: source.status === 'success' || source.status === 'empty',
        p_records_collected: source.count, p_response_time_ms: source.time_ms, p_error_message: source.error || null,
      });
    } catch (e) { console.error('Source tracking error:', e); }
  }
}

async function cacheLocation(supabase: any, location: { name: string; center?: [number, number]; bbox?: [number, number, number, number] } | null): Promise<void> {
  if (!location?.name || !location.center) return;
  try {
    await supabase.rpc('cache_location', {
      p_name: location.name, p_center: { type: 'Point', coordinates: location.center },
      p_bbox: location.bbox ? { type: 'Polygon', coordinates: [[[location.bbox[0], location.bbox[1]], [location.bbox[2], location.bbox[1]], [location.bbox[2], location.bbox[3]], [location.bbox[0], location.bbox[3]], [location.bbox[0], location.bbox[1]]]] } : null,
    });
  } catch (e) { console.error('Location cache error:', e); }
}

// Trigger enrichment for cross-source data fusion
async function triggerEnrichment(supabase: any, features: GeoJSONFeature[]): Promise<void> {
  // Queue records for enrichment
  const categories = [...new Set(features.map(f => f.properties.category))];
  for (const category of categories) {
    try {
      await supabase.from('enrichment_queue').insert(
        features
          .filter(f => f.properties.category === category)
          .slice(0, 20)
          .map(f => ({
            record_id: f.properties.id || (f as any).id,
            enrichment_type: category,
            priority: 5,
            status: 'pending',
          }))
          .filter((r: any) => r.record_id) // Only queue records with valid IDs
      );
    } catch (e) {
      // Enrichment queue may not exist or record not persisted yet
    }
  }
}

// ============================================================================
// DYNAMIC COLLECTOR GENESIS - AI CREATES NEW COLLECTORS ON-THE-FLY
// ============================================================================

async function findMatchingDynamicCollectors(supabase: any, intent: ParsedIntent): Promise<DynamicCollector[]> {
  try {
    // Find previously generated collectors that match current keywords/categories
    const { data, error } = await supabase
      .from('dynamic_collectors')
      .select('*')
      .eq('is_active', true)
      .overlaps('keywords', intent.keywords)
      .limit(10);
    
    if (error || !data) return [];
    return data as DynamicCollector[];
  } catch (e) {
    console.error('Error fetching dynamic collectors:', e);
    return [];
  }
}

async function generateNewCollector(prompt: string, intent: ParsedIntent): Promise<DynamicCollector | null> {
  try {
    console.log('🧬 GENESIS: Generating new collector for:', prompt);
    
    const systemPrompt = `You are an EXPERT API researcher with encyclopedic knowledge of public data sources worldwide.

Your mission: Find the PERFECT public API to answer ANY data query. You have access to thousands of APIs.

## API KNOWLEDGE BASE (100+ sources you know):

**GOVERNMENT/CIVIC:**
- Data.gov, Data.europa.eu, UK Open Data, Canada Open Data
- Census Bureau, BLS, SEC EDGAR, USASpending
- World Bank Data API, IMF Data, OECD Stats
- UN Data, WHO GHO, FAO FAOSTAT

**GEOSPATIAL/MAPPING:**
- OpenStreetMap Overpass, Nominatim geocoding
- USGS APIs (earthquakes, volcanoes, water)
- NASA APIs (FIRMS fires, EONET events, Mars photos)
- Geonames, Natural Earth

**ENVIRONMENT/SCIENCE:**
- NOAA (weather, climate, ocean), EPA (air quality)
- GBIF (biodiversity), iNaturalist
- USDA (agriculture, soil), Forest Service
- European Environment Agency

**CULTURAL/HISTORICAL:**
- Wikipedia/Wikidata SPARQL, DBpedia
- Library of Congress, Europeana
- UNESCO World Heritage API
- Smithsonian Open Access

**ECONOMIC/BUSINESS:**
- FRED (Federal Reserve), BEA, Treasury
- Yahoo Finance, Alpha Vantage (stocks)
- Crunchbase (startups), OpenCorporates

**TRANSPORTATION:**
- OpenSky (flights), OpenRailwayMap
- GTFS feeds, TransitLand
- MarineTraffic AIS, VesselFinder

**HEALTH/RESEARCH:**
- ClinicalTrials.gov, PubMed, NIH Reporter
- CDC WONDER, CMS data
- OpenFDA (drugs, recalls)

**RECREATION/CULTURE:**
- OpenWeatherMap, Open-Meteo
- RecreationGov (RIDB), NPS API
- Yelp Fusion, Foursquare Places

Return a JSON object:
{
  "name": "short source name",
  "description": "what data it provides",
  "api_url": "REAL working endpoint with placeholders like {lat}, {lng}, {bbox}, {query}, {keyword}",
  "api_method": "GET",
  "headers": {},
  "params_template": {},
  "response_mapping": {
    "features_path": "path.to.results.array",
    "lat_path": "latitude or lat or coordinates[1]",
    "lng_path": "longitude or lon or coordinates[0]",
    "name_path": "name or title or label",
    "description_path": "description or summary",
    "id_path": "id or _id"
  },
  "categories": ["GEOSPATIAL"],
  "keywords": ["relevant", "keywords"]
}

CRITICAL RULES:
1. ONLY use FREE, public, no-auth-required APIs
2. The api_url MUST be a real, working endpoint
3. Include proper response_mapping paths
4. If unsure, default to Wikidata SPARQL or OpenStreetMap Overpass
5. Return ONLY valid JSON, no markdown, no explanation`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Query: "${prompt}"\nLocation: ${intent.location?.name || 'unspecified'}\nCategories needed: ${intent.categories.join(', ')}\nKeywords: ${intent.keywords.join(', ')}\n\nFind the BEST API to answer this query. Be creative - there's almost always a public data source!` }
        ],
        temperature: 0.4,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('Genesis AI call failed:', response.status);
      return null;
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Genesis: No valid JSON in response');
      return null;
    }
    
    const collector = JSON.parse(jsonMatch[0]) as DynamicCollector;
    console.log('🧬 GENESIS: Created new collector:', collector.name);
    return collector;
    
  } catch (e) {
    console.error('Genesis error:', e);
    return null;
  }
}

async function executeDynamicCollector(collector: DynamicCollector, params: CollectionParams, bbox?: number[]): Promise<GeoJSONFeature[]> {
  const features: GeoJSONFeature[] = [];
  try {
    let url = collector.api_url;
    
    // Replace template placeholders
    if (params.location?.center) {
      url = url.replace('{lat}', String(params.location.center[1]));
      url = url.replace('{lng}', String(params.location.center[0]));
    }
    if (bbox) {
      url = url.replace('{bbox}', bbox.join(','));
      url = url.replace('{minlat}', String(bbox[1]));
      url = url.replace('{minlng}', String(bbox[0]));
      url = url.replace('{maxlat}', String(bbox[3]));
      url = url.replace('{maxlng}', String(bbox[2]));
    }
    if (params.keywords.length > 0) {
      url = url.replace('{keyword}', encodeURIComponent(params.keywords[0]));
      url = url.replace('{query}', encodeURIComponent(params.keywords.join(' ')));
    }
    url = url.replace('{location}', encodeURIComponent(params.location?.name || ''));
    
    console.log('🔌 Executing dynamic collector:', collector.name, url);
    
    const response = await fetch(url, {
      method: collector.api_method,
      headers: { 'User-Agent': USER_AGENT, ...collector.headers },
    });
    
    if (!response.ok) {
      console.error(`Dynamic collector ${collector.name} failed:`, response.status);
      return features;
    }
    
    const data = await response.json();
    
    // Extract features using response_mapping
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((o, k) => o?.[k], obj);
    };
    
    let items = getNestedValue(data, collector.response_mapping.features_path);
    if (!Array.isArray(items)) items = [data]; // Single result
    
    for (const item of items.slice(0, 100)) {
      const lat = getNestedValue(item, collector.response_mapping.lat_path);
      const lng = getNestedValue(item, collector.response_mapping.lng_path);
      const name = getNestedValue(item, collector.response_mapping.name_path);
      const description = collector.response_mapping.description_path 
        ? getNestedValue(item, collector.response_mapping.description_path) 
        : '';
      const sourceId = collector.response_mapping.id_path
        ? String(getNestedValue(item, collector.response_mapping.id_path))
        : `${collector.name}_${Math.random().toString(36).slice(2)}`;
      
      if (lat && lng && name) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          properties: {
            source: `dynamic_${collector.name.toLowerCase().replace(/\s+/g, '_')}`,
            source_id: sourceId,
            category: collector.categories[0] || 'OTHER',
            subcategory: 'dynamic_collector',
            name: String(name),
            description: String(description || ''),
            attributes: { raw: item, collector_name: collector.name },
            confidence: 0.7,
          },
        });
      }
    }
    
    console.log(`🔌 Dynamic collector ${collector.name} returned ${features.length} features`);
    
  } catch (e) {
    console.error(`Dynamic collector ${collector.name} error:`, e);
  }
  return features;
}

async function archiveDynamicCollector(supabase: any, collector: DynamicCollector, prompt: string, success: boolean): Promise<void> {
  try {
    // Check if similar collector exists
    const { data: existing } = await supabase
      .from('dynamic_collectors')
      .select('id, success_count, failure_count')
      .eq('api_url', collector.api_url)
      .single();
    
    if (existing) {
      // Update existing
      await supabase
        .from('dynamic_collectors')
        .update({
          success_count: existing.success_count + (success ? 1 : 0),
          failure_count: existing.failure_count + (success ? 0 : 1),
          last_used_at: new Date().toISOString(),
          is_active: success || existing.failure_count < 3, // Deactivate after 3 failures
        })
        .eq('id', existing.id);
    } else if (success) {
      // Only archive if it worked
      await supabase.from('dynamic_collectors').insert({
        name: collector.name,
        description: collector.description,
        api_url: collector.api_url,
        api_method: collector.api_method,
        headers: collector.headers,
        params_template: collector.params_template,
        response_mapping: collector.response_mapping,
        categories: collector.categories,
        keywords: collector.keywords,
        success_count: 1,
        failure_count: 0,
        last_used_at: new Date().toISOString(),
        created_by_prompt: prompt,
      });
      console.log('🗃️ ARCHIVED new collector:', collector.name);
    }
  } catch (e) {
    console.error('Archive error:', e);
  }
}

// ============================================================================
// MAIN COLLECTION PIPELINE - 70+ SOURCES + DYNAMIC GENESIS
// ============================================================================

async function collectAllData(intent: ParsedIntent, prompt: string, supabase: any): Promise<{ features: GeoJSONFeature[]; sources: Array<{ name: string; status: string; count: number; time_ms: number; error?: string }>; dynamicGenerated: boolean }> {
  const features: GeoJSONFeature[] = [];
  const sources: Array<{ name: string; status: string; count: number; time_ms: number; error?: string }> = [];
  const bbox = intent.location?.bbox;
  const params: CollectionParams = { keywords: intent.keywords, location: intent.location || undefined, limit: 50 };
  
  const collectors: Array<{ name: string; fn: () => Promise<GeoJSONFeature[]> }> = [];
  
  // WILDLIFE (7 collectors)
  if (intent.categories.includes('WILDLIFE') || intent.categories.includes('REGULATIONS')) {
    collectors.push({ name: 'eBird', fn: () => collectEBird(params, bbox) });
    collectors.push({ name: 'iNaturalist', fn: () => collectINaturalist(params, bbox) });
    collectors.push({ name: 'GBIF', fn: () => collectGBIF(params, bbox) });
    collectors.push({ name: 'USFWS Refuges', fn: () => collectUSFWS(params, bbox) });
    collectors.push({ name: 'Movebank', fn: () => collectMovebank(params, bbox) });
    collectors.push({ name: 'BirdCast', fn: () => collectBirdCast(params, bbox) });
    collectors.push({ name: 'Xeno-Canto', fn: () => collectXenoCanto(params, bbox) });
  }
  
  // WEATHER (6 collectors)
  if (intent.categories.includes('WEATHER')) {
    collectors.push({ name: 'NOAA Weather', fn: () => collectNOAAWeather(params, bbox) });
    collectors.push({ name: 'EPA Air Quality', fn: () => collectEPAAirQuality(params, bbox) });
    collectors.push({ name: 'Open-Meteo', fn: () => collectOpenMeteo(params, bbox) });
    collectors.push({ name: 'NOAA Climate', fn: () => collectNOAAClimate(params, bbox) });
    collectors.push({ name: 'NASA POWER', fn: () => collectNASAPower(params, bbox) });
    collectors.push({ name: 'PurpleAir', fn: () => collectPurpleAir(params, bbox) });
  }
  
  // MARINE (5 collectors)
  if (intent.categories.includes('MARINE')) {
    collectors.push({ name: 'NOAA Tides', fn: () => collectNOAATides(params, bbox) });
    collectors.push({ name: 'NOAA Buoys', fn: () => collectNOAABuoys(params, bbox) });
    collectors.push({ name: 'NOAA Charts', fn: () => collectMarineCharts(params, bbox) });
    collectors.push({ name: 'OpenSeaMap', fn: () => collectOpenSeaMap(params, bbox) });
    collectors.push({ name: 'NOAA Currents', fn: () => collectNOAACurrents(params, bbox) });
  }
  
  // GOVERNMENT (10 collectors)
  if (intent.categories.includes('GOVERNMENT')) {
    collectors.push({ name: 'USASpending', fn: () => collectUSASpending(params, bbox) });
    collectors.push({ name: 'SAM.gov', fn: () => collectSAMGov(params, bbox) });
    collectors.push({ name: 'NIH Reporter', fn: () => collectNIHReporter(params, bbox) });
    collectors.push({ name: 'NSF Awards', fn: () => collectNSFAwards(params, bbox) });
    collectors.push({ name: 'USPTO Patents', fn: () => collectUSPTO(params, bbox) });
    collectors.push({ name: 'SEC Edgar', fn: () => collectSECEdgar(params, bbox) });
    collectors.push({ name: 'Data.gov', fn: () => collectDataGov(params, bbox) });
    collectors.push({ name: 'Regulations.gov', fn: () => collectRegulationsGov(params, bbox) });
    collectors.push({ name: 'BLM', fn: () => collectBLM(params, bbox) });
    collectors.push({ name: 'USFS', fn: () => collectUSFS(params, bbox) });
  }
  
  // ECONOMIC & DEMOGRAPHICS (4 collectors)
  if (intent.categories.includes('ECONOMIC') || intent.categories.includes('DEMOGRAPHICS')) {
    collectors.push({ name: 'Census', fn: () => collectCensus(params, bbox) });
    collectors.push({ name: 'BLS', fn: () => collectBLS(params, bbox) });
    collectors.push({ name: 'FRED', fn: () => collectFRED(params, bbox) });
    collectors.push({ name: 'HUD', fn: () => collectHUD(params, bbox) });
  }
  
  // GEOSPATIAL (6 collectors)
  if (intent.categories.includes('GEOSPATIAL')) {
    collectors.push({ name: 'OpenStreetMap', fn: () => collectOpenStreetMap(params, bbox) });
    collectors.push({ name: 'USGS Water', fn: () => collectUSGS(params, bbox) });
    collectors.push({ name: 'USGS Earthquakes', fn: () => collectUSGSEarthquakes(params, bbox) });
    collectors.push({ name: 'NASA FIRMS', fn: () => collectNASAFIRMS(params, bbox) });
    collectors.push({ name: 'FEMA Disasters', fn: () => collectFEMA(params, bbox) });
    collectors.push({ name: 'Census TIGER', fn: () => collectCensusTIGER(params, bbox) });
  }
  
  // TRANSPORTATION (3 collectors)
  if (intent.categories.includes('TRANSPORTATION')) {
    collectors.push({ name: 'FAA Airports', fn: () => collectFAA(params, bbox) });
    collectors.push({ name: 'OpenSky', fn: () => collectOpenSky(params, bbox) });
    collectors.push({ name: 'OSM Roads', fn: () => collectOSMRoads(params, bbox) });
  }
  
  // ENERGY (3 collectors)
  if (intent.categories.includes('ENERGY')) {
    collectors.push({ name: 'EIA', fn: () => collectEIAEnergy(params, bbox) });
    collectors.push({ name: 'NREL Solar', fn: () => collectNREL(params, bbox) });
    collectors.push({ name: 'DSIRE Incentives', fn: () => collectDSIRE(params, bbox) });
  }
  
  // HEALTH (3 collectors)
  if (intent.categories.includes('HEALTH')) {
    collectors.push({ name: 'CDC', fn: () => collectCDC(params, bbox) });
    collectors.push({ name: 'CMS Hospitals', fn: () => collectCMS(params, bbox) });
    collectors.push({ name: 'ClinicalTrials', fn: () => collectClinicalTrials(params, bbox) });
  }
  
  // REGULATIONS (1 collector)
  if (intent.categories.includes('REGULATIONS')) {
    collectors.push({ name: 'Hunting Regulations', fn: () => collectHuntingRegulations(params, bbox) });
  }
  
  // RECREATION (2 collectors)
  if (intent.categories.includes('RECREATION') || intent.categories.includes('GEOSPATIAL')) {
    collectors.push({ name: 'Recreation.gov', fn: () => collectRecreationGov(params, bbox) });
    collectors.push({ name: 'NPS', fn: () => collectNPS(params, bbox) });
  }
  
  // Execute collectors in batches to avoid memory exhaustion
  const BATCH_SIZE = 5; // Process 5 collectors at a time to stay within memory limits
  
  for (let i = 0; i < collectors.length; i += BATCH_SIZE) {
    const batch = collectors.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (c) => {
        const start = Date.now();
        try {
          const data = await c.fn();
          return { name: c.name, data, time_ms: Date.now() - start };
        } catch (e) {
          return { name: c.name, data: [], time_ms: Date.now() - start, error: String(e) };
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, data, time_ms, error } = result.value;
        features.push(...data);
        sources.push({ name, status: error ? 'error' : data.length > 0 ? 'success' : 'empty', count: data.length, time_ms, error });
      } else {
        sources.push({ name: 'Unknown', status: 'error', count: 0, time_ms: 0, error: result.reason?.message });
      }
    }
    
    // Allow garbage collection between batches
    await new Promise(r => setTimeout(r, 10));
  }
  
  // ========== DYNAMIC COLLECTOR GENESIS ==========
  // If results are sparse OR query seems to need something special, try dynamic collectors
  let dynamicGenerated = false;
  const totalFeatures = features.length;
  const shouldTryDynamic = totalFeatures < 10 || intent.confidence < 0.5;
  
  if (shouldTryDynamic) {
    console.log('🧬 GENESIS: Low results or low confidence, activating dynamic collector search...');
    
    // 1. First try existing archived dynamic collectors
    const existingDynamic = await findMatchingDynamicCollectors(supabase, intent);
    for (const dc of existingDynamic) {
      const start = Date.now();
      const dynamicFeatures = await executeDynamicCollector(dc, params, bbox);
      const success = dynamicFeatures.length > 0;
      features.push(...dynamicFeatures);
      sources.push({
        name: `⚡ ${dc.name}`,
        status: success ? 'success' : 'empty',
        count: dynamicFeatures.length,
        time_ms: Date.now() - start,
      });
      await archiveDynamicCollector(supabase, dc, prompt, success);
    }
    
    // 2. If still sparse, generate a brand new collector
    if (features.length < 20 && LOVABLE_API_KEY) {
      const newCollector = await generateNewCollector(prompt, intent);
      if (newCollector) {
        dynamicGenerated = true;
        const start = Date.now();
        const dynamicFeatures = await executeDynamicCollector(newCollector, params, bbox);
        const success = dynamicFeatures.length > 0;
        features.push(...dynamicFeatures);
        sources.push({
          name: `🧬 ${newCollector.name} (NEW)`,
          status: success ? 'success' : 'empty',
          count: dynamicFeatures.length,
          time_ms: Date.now() - start,
        });
        await archiveDynamicCollector(supabase, newCollector, prompt, success);
      }
    }
  }
  
  return { features, sources, dynamicGenerated };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

// AUTO-ENRICHMENT: Expand minimal queries to get comprehensive data
async function expandMinimalQuery(prompt: string, intent: ParsedIntent): Promise<{ expandedCategories: string[]; enrichmentTypes: string[] }> {
  const enrichmentTypes: string[] = [];
  const expandedCategories = [...intent.categories];
  
  // If query is minimal (few words, low keyword count), auto-expand
  const wordCount = prompt.trim().split(/\s+/).length;
  const isMinimalQuery = wordCount < 5 || intent.keywords.length < 3;
  
  if (isMinimalQuery) {
    // Always add weather for location-based queries
    if (intent.location && !expandedCategories.includes('WEATHER')) {
      expandedCategories.push('WEATHER');
      enrichmentTypes.push('weather');
    }
    
    // Cross-reference with related categories
    if (expandedCategories.includes('WILDLIFE')) {
      if (!expandedCategories.includes('GEOSPATIAL')) {
        expandedCategories.push('GEOSPATIAL');
        enrichmentTypes.push('geo_enriched');
      }
      if (!expandedCategories.includes('REGULATIONS')) {
        expandedCategories.push('REGULATIONS');
        enrichmentTypes.push('government');
      }
    }
    
    if (expandedCategories.includes('MARINE')) {
      if (!expandedCategories.includes('WEATHER')) {
        expandedCategories.push('WEATHER');
        enrichmentTypes.push('weather');
      }
    }
    
    if (expandedCategories.includes('RECREATION')) {
      if (!expandedCategories.includes('WEATHER')) {
        expandedCategories.push('WEATHER');
        enrichmentTypes.push('weather');
      }
      if (!expandedCategories.includes('GEOSPATIAL')) {
        expandedCategories.push('GEOSPATIAL');
        enrichmentTypes.push('geo_enriched');
      }
    }
    
    // Economic queries get infrastructure
    if (expandedCategories.includes('ECONOMIC') || expandedCategories.includes('GOVERNMENT')) {
      if (!expandedCategories.includes('INFRASTRUCTURE')) {
        expandedCategories.push('INFRASTRUCTURE');
        enrichmentTypes.push('infrastructure');
      }
    }
    
    // Add AI expansion marker
    if (enrichmentTypes.length > 0) {
      enrichmentTypes.push('ai_expanded');
    }
  }
  
  // Always try to cross-reference for richer data
  if (intent.location) {
    enrichmentTypes.push('cross_referenced');
  }
  
  return { expandedCategories, enrichmentTypes };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { prompt } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: 'Prompt required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log('🌍 BASED DATA v6.0: 70+ sources + AUTO-ENRICHMENT + DYNAMIC GENESIS, processing:', prompt);
    const startTime = Date.now();

    const intent = analyzeIntent(prompt);
    
    // AUTO-ENRICHMENT: Expand minimal queries
    const { expandedCategories, enrichmentTypes } = await expandMinimalQuery(prompt, intent);
    if (expandedCategories.length > intent.categories.length) {
      console.log('🔥 AUTO-ENRICHMENT: Expanded categories:', expandedCategories.join(', '));
      intent.categories = expandedCategories;
    }
    
    console.log('🧠 Intent:', intent.categories.join(', '), '| Use case:', intent.use_case);

    const { features, sources, dynamicGenerated } = await collectAllData(intent, prompt, supabase);
    console.log(`📡 Collected ${features.length} features from ${sources.length} sources${dynamicGenerated ? ' (+ dynamic genesis)' : ''}`);

    // Generate AI-powered insights
    const insights = await generateAIInsights(features, intent, prompt);

    // Persist in parallel
    const [persistResult] = await Promise.all([
      persistRecords(supabase, features),
      trackSourcePerformance(supabase, sources),
      cacheLocation(supabase, intent.location),
    ]);

    // Trigger async enrichment for cross-source fusion (fire and forget)
    if (persistResult.persisted > 0) {
      triggerEnrichment(supabase, features.slice(0, 50)).catch(e => 
        console.log('Enrichment queued:', e.message || 'async')
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Complete: ${features.length} features, ${persistResult.persisted} persisted in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true, query_id: `baseddata_${Date.now()}`, prompt, intent,
      features: { type: 'FeatureCollection', features },
      tabular_data: features.slice(0, 100).map(f => ({ name: f.properties.name, category: f.properties.category, source: f.properties.source, description: f.properties.description?.slice(0, 100), ...f.properties.attributes })),
      insights,
      collected_data: sources.map(s => ({ source: s.name, status: s.status, record_count: s.count, collection_time_ms: s.time_ms, error: s.error })),
      sources_used: sources.filter(s => s.status === 'success').map(s => s.name),
      processing_time_ms: processingTime,
      credits_used: Math.ceil(sources.filter(s => s.status === 'success').length * 2),
      engine_version: 'baseddata-v6.0-enriched',
      enrichments: enrichmentTypes, // NEW: Track what was auto-enriched
      data_tap: { 
        records_persisted: persistResult.persisted, 
        records_deduplicated: persistResult.deduplicated, 
        dynamic_genesis: dynamicGenerated,
        enrichment_queued: persistResult.persisted > 0,
        auto_expanded: enrichmentTypes.length > 0,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('OMNISCIENT error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
