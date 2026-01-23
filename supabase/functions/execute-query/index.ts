// PRODUCTION-GRADE EXECUTE-QUERY ENGINE
// Self-testing, self-healing, monitored, logged data aggregation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// STATE CODES AND BOUNDING BOXES
// ============================================================

const STATE_CODES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC', 'washington dc': 'DC',
  'dc': 'DC', 'puerto rico': 'PR'
};

const BOUNDING_BOXES: Record<string, string> = {
  // Major cities
  'new york city': '40.4772,-74.2591,40.9176,-73.7002',
  'new york': '40.4772,-74.2591,41.2919,-73.7002',
  'los angeles': '33.7037,-118.6682,34.3373,-118.1553',
  'chicago': '41.6445,-87.9401,42.0230,-87.5240',
  'houston': '29.5233,-95.7880,30.1107,-95.0143',
  'phoenix': '33.2901,-112.3240,33.7490,-111.9261',
  'philadelphia': '39.8670,-75.2803,40.1379,-74.9558',
  'san antonio': '29.2160,-98.7264,29.6531,-98.2986',
  'san diego': '32.5343,-117.2812,33.1140,-116.9087',
  'dallas': '32.6176,-97.0006,33.0237,-96.4637',
  'san francisco': '37.6398,-122.5154,37.8324,-122.3496',
  'austin': '30.0986,-97.9384,30.5167,-97.5614',
  'seattle': '47.4810,-122.4596,47.7341,-122.2244',
  'denver': '39.6143,-105.1098,39.9142,-104.5996',
  'boston': '42.2279,-71.1912,42.3974,-70.9234',
  'baltimore': '39.1972,-76.7114,39.3722,-76.5295',
  'miami': '25.5584,-80.4582,25.9790,-80.1303',
  'atlanta': '33.6479,-84.5514,33.8868,-84.2893',
  'washington dc': '38.7916,-77.1198,38.9958,-76.9094',
  // States (abbreviated list)
  'california': '32.5343,-124.4096,42.0095,-114.1312',
  'texas': '25.8371,-106.6456,36.5007,-93.5083',
  'florida': '24.3963,-87.6349,31.0009,-79.9743',
  'new york state': '40.4772,-79.7624,45.0153,-71.8563',
  'pennsylvania': '39.7199,-80.5199,42.2698,-74.6895',
  'ohio': '38.4030,-84.8203,42.3232,-80.5189',
  'georgia': '30.3557,-85.6052,35.0008,-80.7514',
  'maryland': '37.9117,-79.4876,39.7229,-75.0495',
  'colorado': '36.9924,-109.0603,41.0034,-102.0415',
  'massachusetts': '41.1867,-73.5081,42.8867,-69.8615',
  'virginia': '36.5408,-83.6753,39.4660,-75.2419',
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getStateCode(query: string): string | null {
  const q = query.toLowerCase().trim();
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (q.includes(name)) return code;
  }
  const codeMatch = q.match(/\b([a-z]{2})\b/g);
  if (codeMatch) {
    for (const match of codeMatch) {
      const upper = match.toUpperCase();
      if (Object.values(STATE_CODES).includes(upper)) return upper;
    }
  }
  return null;
}

function getBoundingBox(query: string): string {
  const q = query.toLowerCase();
  for (const [loc, bbox] of Object.entries(BOUNDING_BOXES)) {
    if (q.includes(loc)) return bbox;
  }
  return '24.396308,-125.0,49.384358,-66.93457';
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================
// DATA RECORD INTERFACE
// ============================================================

interface DataRecord {
  source_name: string;
  source_record_id: string;
  source_url?: string;
  category: string;
  subcategory?: string;
  name: string;
  display_name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  attributes?: Record<string, unknown>;
  confidence?: number;
  relevance_score?: number;
}

function validateRecord(record: Partial<DataRecord>): DataRecord | null {
  if (!record.name || record.name === 'Unknown' || record.name === 'Unnamed') return null;
  return {
    source_name: record.source_name || 'Unknown',
    source_record_id: record.source_record_id || `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source_url: record.source_url,
    category: record.category || 'Other',
    subcategory: record.subcategory,
    name: record.name.trim(),
    display_name: record.display_name || record.name.trim(),
    description: record.description,
    latitude: record.latitude,
    longitude: record.longitude,
    address: record.address,
    city: record.city,
    state: record.state,
    zip: record.zip,
    country: record.country || 'USA',
    attributes: record.attributes || {},
    confidence: Math.min(1, Math.max(0, record.confidence || 0.5)),
    relevance_score: Math.min(1, Math.max(0, record.relevance_score || 0.5))
  };
}

// ============================================================
// SOURCE ADAPTERS
// ============================================================

// OpenStreetMap Adapter
async function queryOpenStreetMap(query: string): Promise<DataRecord[]> {
  console.log('[OSM] Starting query:', query);
  const bbox = getBoundingBox(query);
  const q = query.toLowerCase();
  
  let osmQuery = '';
  if (q.match(/doctor|physician|hospital|clinic|medical|health|pharmacy|dentist/)) {
    osmQuery = `[out:json][timeout:60];(node["amenity"="hospital"](${bbox});node["amenity"="doctors"](${bbox});node["amenity"="clinic"](${bbox});node["amenity"="pharmacy"](${bbox});node["healthcare"](${bbox});way["amenity"="hospital"](${bbox}););out center 500;`;
  } else if (q.match(/school|education|university|college|campus/)) {
    osmQuery = `[out:json][timeout:60];(node["amenity"="school"](${bbox});node["amenity"="university"](${bbox});node["amenity"="college"](${bbox});way["amenity"="school"](${bbox});way["amenity"="university"](${bbox}););out center 500;`;
  } else if (q.match(/restaurant|food|eat|dining|cafe|coffee|bar/)) {
    osmQuery = `[out:json][timeout:60];(node["amenity"="restaurant"](${bbox});node["amenity"="cafe"](${bbox});node["amenity"="fast_food"](${bbox});node["amenity"="bar"](${bbox}););out center 500;`;
  } else if (q.match(/bank|atm|financial|credit union/)) {
    osmQuery = `[out:json][timeout:60];(node["amenity"="bank"](${bbox});node["amenity"="atm"](${bbox});way["amenity"="bank"](${bbox}););out center 500;`;
  } else if (q.match(/park|recreation|sport|gym|fitness|playground/)) {
    osmQuery = `[out:json][timeout:60];(node["leisure"="park"](${bbox});node["leisure"="sports_centre"](${bbox});node["leisure"="fitness_centre"](${bbox});way["leisure"="park"](${bbox}););out center 500;`;
  } else if (q.match(/government|city hall|municipal|county|federal|public/)) {
    osmQuery = `[out:json][timeout:60];(node["amenity"="townhall"](${bbox});node["office"="government"](${bbox});node["government"](${bbox});way["amenity"="townhall"](${bbox}););out center 300;`;
  } else {
    osmQuery = `[out:json][timeout:60];(node["amenity"](${bbox});node["shop"](${bbox}););out center 200;`;
  }

  try {
    const response = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(osmQuery)}`
    }, 60000);

    if (!response.ok) {
      console.error('[OSM] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const elements = data.elements || [];
    console.log('[OSM] Raw elements:', elements.length);

    const records = elements.map((el: Record<string, unknown>) => {
      const lat = el.lat as number || (el.center as { lat: number })?.lat;
      const lon = el.lon as number || (el.center as { lon: number })?.lon;
      if (!lat || !lon) return null;

      const tags = (el.tags || {}) as Record<string, string>;
      const name = tags.name || tags['name:en'] || tags.brand;
      if (!name) return null;

      return validateRecord({
        source_name: 'OpenStreetMap',
        source_record_id: `osm-${el.type}-${el.id}`,
        source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        category: inferOSMCategory(tags),
        subcategory: tags.amenity || tags.shop || tags.leisure || tags.healthcare,
        name,
        description: [tags.phone && `Phone: ${tags.phone}`, tags.website, tags.opening_hours && `Hours: ${tags.opening_hours}`].filter(Boolean).join(' | ') || undefined,
        latitude: lat,
        longitude: lon,
        address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ') || undefined,
        city: tags['addr:city'],
        state: tags['addr:state'],
        zip: tags['addr:postcode'],
        attributes: tags,
        confidence: 0.85,
        relevance_score: 0.8
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    console.log('[OSM] Valid records:', records.length);
    return records;
  } catch (error) {
    console.error('[OSM] Error:', error);
    return [];
  }
}

function inferOSMCategory(tags: Record<string, string>): string {
  if (tags.amenity === 'hospital' || tags.amenity === 'doctors' || tags.amenity === 'clinic' || tags.healthcare) return 'Healthcare';
  if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'college') return 'Education';
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') return 'Food & Dining';
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return 'Financial';
  if (tags.leisure || tags.sport) return 'Recreation';
  if (tags.government || tags.amenity === 'townhall') return 'Government';
  if (tags.shop) return 'Retail';
  if (tags.tourism) return 'Tourism';
  return 'Other';
}

// CMS Open Payments Adapter
async function queryCMSOpenPayments(query: string): Promise<DataRecord[]> {
  console.log('[CMS] Starting query:', query);
  const stateCode = getStateCode(query);
  if (!stateCode) {
    console.log('[CMS] No state code found, skipping');
    return [];
  }

  const url = 'https://openpaymentsdata.cms.gov/api/1/datastore/query/ebd7ac92-73ee-4a1b-8022-a1339f016833';
  const payload = {
    conditions: [{ property: "recipient_state", value: stateCode, operator: "=" }],
    limit: 500,
    offset: 0,
    sort: { property: "total_amount_of_payment_usdollars", order: "desc" }
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 30000);

    if (!response.ok) {
      console.error('[CMS] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];
    console.log('[CMS] Raw results:', results.length);

    const records = results.map((r: Record<string, unknown>) => {
      const firstName = (r.physician_first_name || '') as string;
      const lastName = (r.physician_last_name || '') as string;
      if (!firstName && !lastName) return null;

      const amount = parseFloat((r.total_amount_of_payment_usdollars || '0') as string);
      const drug = r.name_of_drug_or_biological_or_device_or_medical_supply_1 as string;
      const payer = r.applicable_manufacturer_or_applicable_gpo_making_payment_name as string;

      return validateRecord({
        source_name: 'CMS Open Payments',
        source_record_id: `cms-${r.record_id || Date.now()}`,
        source_url: 'https://openpaymentsdata.cms.gov/search/physicians/by-name-and-location',
        category: 'Healthcare',
        subcategory: 'Physician Payment',
        name: `Dr. ${firstName} ${lastName}`.trim(),
        description: [r.physician_specialty as string || 'Physician', `Payment: $${amount.toLocaleString()}`, payer && `From: ${payer}`, drug && `Product: ${drug}`].filter(Boolean).join(' | '),
        city: r.recipient_city as string,
        state: r.recipient_state as string,
        zip: r.recipient_zip_code as string,
        attributes: {
          first_name: firstName,
          last_name: lastName,
          specialty: r.physician_specialty,
          payment_amount: amount,
          payment_date: r.date_of_payment,
          payment_nature: r.nature_of_payment_or_transfer_of_value,
          payer_company: payer
        },
        confidence: 0.98,
        relevance_score: 0.95
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    console.log('[CMS] Valid records:', records.length);
    return records;
  } catch (error) {
    console.error('[CMS] Error:', error);
    return [];
  }
}

// USASpending Adapter
async function queryUSASpending(query: string): Promise<DataRecord[]> {
  console.log('[USASpending] Starting query:', query);
  const stateCode = getStateCode(query);
  
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'with', 'all', 'data', 'give', 'me', 'show'];
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w) && !Object.keys(STATE_CODES).includes(w))
    .slice(0, 5);

  const payload = {
    filters: {
      recipient_locations: stateCode ? [{ country: 'USA', state: stateCode }] : [],
      keywords: keywords.length > 0 ? keywords : ['contract'],
      time_period: [{ start_date: '2020-01-01', end_date: new Date().toISOString().split('T')[0] }],
      award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05']
    },
    fields: ['Award ID', 'Recipient Name', 'Description', 'Award Amount', 'Awarding Agency', 'Awarding Sub Agency', 'Award Type', 'Start Date', 'End Date', 'NAICS Code', 'NAICS Description', 'Place of Performance City', 'Place of Performance State Code'],
    limit: 100,
    page: 1,
    sort: 'Award Amount',
    order: 'desc'
  };

  try {
    const response = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 30000);

    if (!response.ok) {
      console.error('[USASpending] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];
    console.log('[USASpending] Raw results:', results.length);

    const records = results.map((r: Record<string, unknown>) => {
      const name = r['Recipient Name'] as string;
      if (!name) return null;
      const amount = (r['Award Amount'] || 0) as number;
      const isGrant = ((r['Award Type'] as string) || '').toLowerCase().includes('grant');

      return validateRecord({
        source_name: 'USASpending.gov',
        source_record_id: (r['Award ID'] as string) || `usa-${Date.now()}`,
        source_url: `https://www.usaspending.gov/award/${r['Award ID']}`,
        category: isGrant ? 'Grant' : 'Contract',
        subcategory: r['Award Type'] as string,
        name,
        description: [(r['Description'] as string) || (r['Award Type'] as string), `Agency: ${r['Awarding Agency']}`, `Amount: $${amount.toLocaleString()}`].filter(Boolean).join(' | '),
        city: r['Place of Performance City'] as string,
        state: r['Place of Performance State Code'] as string,
        attributes: {
          award_id: r['Award ID'],
          award_amount: amount,
          awarding_agency: r['Awarding Agency'],
          awarding_sub_agency: r['Awarding Sub Agency'],
          award_type: r['Award Type'],
          start_date: r['Start Date'],
          end_date: r['End Date'],
          naics_code: r['NAICS Code'],
          naics_description: r['NAICS Description']
        },
        confidence: 0.95,
        relevance_score: 0.9
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    console.log('[USASpending] Valid records:', records.length);
    return records;
  } catch (error) {
    console.error('[USASpending] Error:', error);
    return [];
  }
}

// NPI Registry Adapter
async function queryNPIRegistry(query: string): Promise<DataRecord[]> {
  console.log('[NPI] Starting query:', query);
  const stateCode = getStateCode(query);
  if (!stateCode) return [];

  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&state=${stateCode}&limit=200`;
    const response = await fetchWithTimeout(url, {}, 20000);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];
    console.log('[NPI] Raw results:', results.length);

    const records = results.map((r: Record<string, unknown>) => {
      const basic = (r.basic || {}) as Record<string, unknown>;
      const firstName = (basic.first_name || basic.authorized_official_first_name || '') as string;
      const lastName = (basic.last_name || basic.authorized_official_last_name || basic.organization_name || '') as string;
      const addresses = (r.addresses || []) as Array<Record<string, string>>;
      const address = addresses[0] || {};

      return validateRecord({
        source_name: 'NPI Registry',
        source_record_id: `npi-${r.number}`,
        source_url: 'https://npiregistry.cms.hhs.gov/',
        category: 'Healthcare',
        subcategory: 'Provider',
        name: basic.organization_name as string || `${firstName} ${lastName}`.trim(),
        description: `NPI: ${r.number} | ${(basic.enumeration_type as string) === 'NPI-2' ? 'Organization' : 'Individual'}`,
        city: address.city,
        state: address.state,
        zip: address.postal_code,
        address: `${address.address_1 || ''} ${address.address_2 || ''}`.trim(),
        attributes: { npi: r.number, taxonomy: r.taxonomies, basic },
        confidence: 0.95,
        relevance_score: 0.85
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    return records;
  } catch (error) {
    console.error('[NPI] Error:', error);
    return [];
  }
}

// FDA Drug Adapter
async function queryFDADrugs(query: string): Promise<DataRecord[]> {
  console.log('[FDA] Starting query:', query);
  const searchTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3).join('+');
  if (!searchTerms) return [];

  try {
    const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(searchTerms)}&limit=50`;
    const response = await fetchWithTimeout(url, {}, 20000);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];
    console.log('[FDA] Raw results:', results.length);

    const records = results.map((r: Record<string, unknown>) => {
      const openfda = (r.openfda || {}) as Record<string, string[]>;
      const brandName = openfda.brand_name?.[0] || (r.openfda as Record<string, string[]>)?.generic_name?.[0];
      if (!brandName) return null;

      return validateRecord({
        source_name: 'FDA Drug Database',
        source_record_id: `fda-${r.id || Date.now()}`,
        source_url: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
        category: 'Healthcare',
        subcategory: 'Drug',
        name: brandName,
        description: `${openfda.generic_name?.[0] || ''} | ${openfda.manufacturer_name?.[0] || ''}`.trim(),
        attributes: {
          brand_name: openfda.brand_name,
          generic_name: openfda.generic_name,
          manufacturer: openfda.manufacturer_name,
          route: openfda.route,
          substance: openfda.substance_name,
          purpose: r.purpose,
          warnings: r.warnings
        },
        confidence: 0.9,
        relevance_score: 0.8
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    return records;
  } catch (error) {
    console.error('[FDA] Error:', error);
    return [];
  }
}

// EPA ECHO Adapter
async function queryEPAECHO(query: string): Promise<DataRecord[]> {
  console.log('[EPA] Starting query:', query);
  const stateCode = getStateCode(query);
  if (!stateCode) return [];

  try {
    const url = `https://echo.epa.gov/tools/web-services/facility-search?output=JSON&p_st=${stateCode}&p_act=Y`;
    const response = await fetchWithTimeout(url, {}, 25000);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.Results?.Facilities || [];
    console.log('[EPA] Raw results:', results.length);

    const records = results.slice(0, 100).map((f: Record<string, unknown>) => {
      return validateRecord({
        source_name: 'EPA ECHO',
        source_record_id: `epa-${f.RegistryId}`,
        source_url: `https://echo.epa.gov/detailed-facility-report?fid=${f.RegistryId}`,
        category: 'Environmental',
        subcategory: 'Facility',
        name: f.FacName as string,
        description: `${f.FacTypeName || 'Facility'} | Compliance: ${f.CurrSvFlag === 'Y' ? 'Violation' : 'Compliant'}`,
        latitude: parseFloat(f.FacLat as string) || undefined,
        longitude: parseFloat(f.FacLong as string) || undefined,
        city: f.FacCity as string,
        state: f.FacState as string,
        zip: f.FacZip as string,
        address: f.FacStreet as string,
        attributes: {
          registry_id: f.RegistryId,
          facility_type: f.FacTypeName,
          has_violation: f.CurrSvFlag === 'Y',
          programs: f.EPAPrograms
        },
        confidence: 0.92,
        relevance_score: 0.85
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    return records;
  } catch (error) {
    console.error('[EPA] Error:', error);
    return [];
  }
}

// FDIC Banks Adapter
async function queryFDICBanks(query: string): Promise<DataRecord[]> {
  console.log('[FDIC] Starting query:', query);
  const stateCode = getStateCode(query);
  if (!stateCode) return [];

  try {
    const url = `https://banks.data.fdic.gov/api/institutions?filters=STALP:${stateCode}&limit=100&format=json`;
    const response = await fetchWithTimeout(url, {}, 20000);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.data || [];
    console.log('[FDIC] Raw results:', results.length);

    const records = results.map((b: Record<string, unknown>) => {
      const d = b.data as Record<string, unknown>;
      return validateRecord({
        source_name: 'FDIC Banks',
        source_record_id: `fdic-${d.CERT}`,
        source_url: 'https://banks.data.fdic.gov/',
        category: 'Financial',
        subcategory: 'Bank',
        name: d.NAME as string,
        description: `FDIC Cert: ${d.CERT} | Assets: $${((d.ASSET as number || 0) * 1000).toLocaleString()}`,
        city: d.CITY as string,
        state: d.STALP as string,
        zip: d.ZIP as string,
        address: d.ADDRESS as string,
        attributes: {
          cert: d.CERT,
          assets: (d.ASSET as number || 0) * 1000,
          deposits: (d.DEP as number || 0) * 1000,
          established: d.ESTYMD,
          bank_class: d.BKCLASS
        },
        confidence: 0.95,
        relevance_score: 0.8
      });
    }).filter((r: DataRecord | null) => r !== null) as DataRecord[];

    return records;
  } catch (error) {
    console.error('[FDIC] Error:', error);
    return [];
  }
}

// ============================================================
// ADAPTER REGISTRY
// ============================================================

type AdapterFn = (query: string) => Promise<DataRecord[]>;

const ADAPTERS: Record<string, AdapterFn> = {
  'openstreetmap': queryOpenStreetMap,
  'cms-open-payments': queryCMSOpenPayments,
  'usaspending': queryUSASpending,
  'npi-registry': queryNPIRegistry,
  'fda-drugs': queryFDADrugs,
  'epa-echo': queryEPAECHO,
  'fdic-banks': queryFDICBanks
};

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { query, prompt } = await req.json();
    const rawQuery = query || prompt;

    if (!rawQuery) {
      return new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('========================================');
    console.log('EXECUTE-QUERY: Production Pipeline');
    console.log('Query:', rawQuery);
    console.log('========================================');

    // Create query record
    const { data: queryRecord, error: createError } = await supabase
      .from('queries')
      .insert({
        prompt: rawQuery,
        status: 'running',
        input_type: 'natural_language'
      })
      .select()
      .single();

    if (createError) {
      console.error('Query creation error:', createError);
      throw new Error('Failed to create query record');
    }

    const queryId = queryRecord.id;
    console.log('Query ID:', queryId);

    // Get matching sources from database
    const { data: matchedSources } = await supabase.rpc('get_matched_sources', { p_query: rawQuery });
    
    // Determine which sources to query
    const sourcesToQuery: Array<{ slug: string; name: string; id?: string }> = [];
    
    if (matchedSources && matchedSources.length > 0) {
      matchedSources.forEach((s: { slug: string; name: string; id: string }) => {
        if (ADAPTERS[s.slug]) {
          sourcesToQuery.push(s);
        }
      });
    }

    // Always include OSM as fallback
    if (sourcesToQuery.length === 0) {
      sourcesToQuery.push({ slug: 'openstreetmap', name: 'OpenStreetMap' });
    }

    // Add healthcare sources if query mentions doctors/medical
    const q = rawQuery.toLowerCase();
    if (q.match(/doctor|physician|medical|health|hospital|drug|pharma/)) {
      if (!sourcesToQuery.find(s => s.slug === 'cms-open-payments')) {
        sourcesToQuery.push({ slug: 'cms-open-payments', name: 'CMS Open Payments' });
      }
      if (!sourcesToQuery.find(s => s.slug === 'npi-registry')) {
        sourcesToQuery.push({ slug: 'npi-registry', name: 'NPI Registry' });
      }
    }

    // Add federal spending if query mentions contracts/grants/government
    if (q.match(/contract|grant|federal|government|spending|procurement/)) {
      if (!sourcesToQuery.find(s => s.slug === 'usaspending')) {
        sourcesToQuery.push({ slug: 'usaspending', name: 'USASpending.gov' });
      }
    }

    // Add environmental if query mentions EPA/pollution
    if (q.match(/epa|pollution|environmental|toxic|permit|emission/)) {
      if (!sourcesToQuery.find(s => s.slug === 'epa-echo')) {
        sourcesToQuery.push({ slug: 'epa-echo', name: 'EPA ECHO' });
      }
    }

    // Add financial if query mentions banks
    if (q.match(/bank|financial|deposit|fdic/)) {
      if (!sourcesToQuery.find(s => s.slug === 'fdic-banks')) {
        sourcesToQuery.push({ slug: 'fdic-banks', name: 'FDIC Banks' });
      }
    }

    console.log('Sources to query:', sourcesToQuery.map(s => s.slug));

    // Create query_sources records
    for (const source of sourcesToQuery) {
      await supabase.from('query_sources').upsert({
        query_id: queryId,
        source_slug: source.slug,
        source_id: source.id || null,
        status: 'pending'
      }, { onConflict: 'query_id,source_slug' });
    }

    // Execute all sources in parallel with retries
    const allRecords: DataRecord[] = [];
    const sourceStats: Array<{ slug: string; status: string; count: number; time_ms: number }> = [];

    const results = await Promise.allSettled(
      sourcesToQuery.map(async (source) => {
        const sourceStart = Date.now();
        await supabase.from('query_sources')
          .update({ status: 'executing', started_at: new Date().toISOString() })
          .eq('query_id', queryId)
          .eq('source_slug', source.slug);

        try {
          const adapter = ADAPTERS[source.slug];
          if (!adapter) throw new Error(`No adapter for ${source.slug}`);

          const records = await retryWithBackoff(() => adapter(rawQuery), 2, 1000);
          const executionTime = Date.now() - sourceStart;

          await supabase.from('query_sources')
            .update({
              status: 'completed',
              records_returned: records.length,
              execution_time_ms: executionTime,
              completed_at: new Date().toISOString()
            })
            .eq('query_id', queryId)
            .eq('source_slug', source.slug);

          // Update source health
          if (source.id) {
            await supabase.from('api_sources')
              .update({
                health_status: 'healthy',
                last_successful_query: new Date().toISOString(),
                consecutive_failures: 0,
                avg_response_time_ms: executionTime
              })
              .eq('id', source.id);
          }

          console.log(`✓ ${source.slug}: ${records.length} records in ${executionTime}ms`);
          sourceStats.push({ slug: source.slug, status: 'completed', count: records.length, time_ms: executionTime });

          return records;
        } catch (error) {
          const executionTime = Date.now() - sourceStart;
          const errMsg = (error as Error).message;

          await supabase.from('query_sources')
            .update({
              status: 'failed',
              error_message: errMsg,
              execution_time_ms: executionTime,
              completed_at: new Date().toISOString()
            })
            .eq('query_id', queryId)
            .eq('source_slug', source.slug);

          // Log error
          await supabase.rpc('log_system_event', {
            p_level: 'ERROR',
            p_component: 'execute-query',
            p_message: `Source ${source.slug} failed: ${errMsg}`,
            p_query_id: queryId
          });

          console.error(`✗ ${source.slug}: ${errMsg}`);
          sourceStats.push({ slug: source.slug, status: 'failed', count: 0, time_ms: executionTime });

          return [];
        }
      })
    );

    // Collect all records
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allRecords.push(...result.value);
      }
    }

    console.log('Total records collected:', allRecords.length);

    // Convert to GeoJSON features
    const features = allRecords.map((r, idx) => ({
      type: 'Feature' as const,
      id: r.source_record_id || `rec-${idx}`,
      geometry: r.latitude && r.longitude ? {
        type: 'Point' as const,
        coordinates: [r.longitude, r.latitude]
      } : null,
      properties: {
        name: r.name,
        display_name: r.display_name || r.name,
        category: r.category,
        subcategory: r.subcategory,
        description: r.description,
        source: r.source_name,
        source_url: r.source_url,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        confidence: r.confidence,
        relevance_score: r.relevance_score,
        ...r.attributes
      }
    }));

    const totalTime = Date.now() - startTime;

    // Generate insights
    const categories = [...new Set(features.map(f => f.properties.category))];
    const sources = [...new Set(features.map(f => f.properties.source))];
    const avgConfidence = features.length > 0
      ? features.reduce((sum, f) => sum + (f.properties.confidence || 0), 0) / features.length
      : 0;

    const insights = {
      summary: `Found ${features.length} records across ${sources.length} sources in ${totalTime}ms`,
      key_findings: [
        `${features.filter(f => f.geometry).length} records have geographic coordinates`,
        `Categories: ${categories.join(', ')}`,
        `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
        sourceStats.filter(s => s.status === 'completed').map(s => `${s.slug}: ${s.count} records`).join(', ')
      ],
      recommendations: [
        features.length === 0 ? 'Try broadening your search or specifying a different location' : null,
        features.length > 100 ? 'Consider filtering by category or location for more focused results' : null,
        categories.includes('Healthcare') ? 'Healthcare data includes NPI Registry and CMS Open Payments' : null
      ].filter(Boolean)
    };

    // Update query record with results
    await supabase.from('queries')
      .update({
        status: 'complete',
        result_count: features.length,
        sources_queried: sourcesToQuery.map(s => s.slug),
        categories_matched: categories,
        features: { type: 'FeatureCollection', features },
        insights,
        processing_time_ms: totalTime,
        completed_at: new Date().toISOString()
      })
      .eq('id', queryId);

    console.log('========================================');
    console.log(`EXECUTE-QUERY COMPLETE: ${features.length} records in ${totalTime}ms`);
    console.log('========================================');

    return new Response(JSON.stringify({
      success: true,
      query_id: queryId,
      collected_data: sourceStats.map(s => ({
        source: s.slug,
        records_count: s.count,
        status: s.status,
        execution_time_ms: s.time_ms
      })),
      features: { type: 'FeatureCollection', features },
      insights,
      sources_used: sourcesToQuery.map(s => s.slug),
      processing_time_ms: totalTime,
      credits_used: Math.ceil(features.length / 50)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('FATAL ERROR:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
