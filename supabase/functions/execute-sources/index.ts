import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// STATE & LOCATION UTILITIES
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
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC', 'washington dc': 'DC'
}

const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08',
  'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16',
  'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22',
  'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
  'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40',
  'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
  'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
  'WI': '55', 'WY': '56', 'DC': '11'
}

const BOUNDING_BOXES: Record<string, string> = {
  'new york': '40.4772,-74.2591,41.2919,-73.7002',
  'nyc': '40.4772,-74.2591,40.9176,-73.7002',
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
  'california': '32.5343,-124.4096,42.0095,-114.1312',
  'texas': '25.8371,-106.6456,36.5007,-93.5083',
  'florida': '24.3963,-87.6349,31.0009,-79.9743',
  'new york state': '40.4772,-79.7624,45.0153,-71.8563',
  'pennsylvania': '39.7199,-80.5199,42.2698,-74.6895',
  'illinois': '36.9703,-91.5130,42.5083,-87.0199',
  'ohio': '38.4030,-84.8203,42.3232,-80.5189',
  'georgia': '30.3557,-85.6052,35.0008,-80.7514',
  'north carolina': '33.7527,-84.3219,36.5881,-75.4001',
  'michigan': '41.6961,-90.4185,48.3060,-82.1238',
  'new jersey': '38.9285,-75.5633,41.3574,-73.8850',
  'virginia': '36.5408,-83.6753,39.4660,-75.2419',
  'washington': '45.5435,-124.8489,49.0025,-116.9160',
  'arizona': '31.3322,-114.8163,37.0043,-109.0452',
  'massachusetts': '41.1867,-73.5081,42.8867,-69.8615',
  'tennessee': '34.9829,-90.3102,36.6781,-81.6469',
  'indiana': '37.7717,-88.0979,41.7613,-84.7845',
  'maryland': '37.9117,-79.4876,39.7229,-75.0495',
  'colorado': '36.9924,-109.0603,41.0034,-102.0415',
  'washington dc': '38.7916,-77.1198,38.9958,-76.9094',
  'dc': '38.7916,-77.1198,38.9958,-76.9094'
}

function getStateCode(query: string): string | null {
  const q = query.toLowerCase()
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (q.includes(name)) return code
  }
  const match = q.match(/\b([a-z]{2})\b/)
  if (match && Object.values(STATE_CODES).includes(match[1].toUpperCase())) {
    return match[1].toUpperCase()
  }
  return null
}

function getBbox(query: string): string {
  const q = query.toLowerCase()
  for (const [loc, bbox] of Object.entries(BOUNDING_BOXES)) {
    if (q.includes(loc)) return bbox
  }
  return '24.396308,-125.0,49.384358,-66.93457' // USA default
}

// ============================================================
// API COLLECTORS
// ============================================================

// --- OPENSTREETMAP ---
async function queryOpenStreetMap(query: string): Promise<any[]> {
  const bbox = getBbox(query)
  const q = query.toLowerCase()
  
  let osmQuery = ''
  
  if (q.match(/doctor|physician|hospital|clinic|medical|health|pharmacy/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="doctors"](${bbox});node["amenity"="clinic"](${bbox});node["amenity"="hospital"](${bbox});node["amenity"="pharmacy"](${bbox});node["healthcare"](${bbox});way["amenity"="hospital"](${bbox}););out center 500;`
  } else if (q.match(/school|education|university|college/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="school"](${bbox});node["amenity"="university"](${bbox});node["amenity"="college"](${bbox});way["amenity"="school"](${bbox});way["amenity"="university"](${bbox}););out center 500;`
  } else if (q.match(/restaurant|food|eat|dining|cafe/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="restaurant"](${bbox});node["amenity"="cafe"](${bbox});node["amenity"="fast_food"](${bbox}););out center 500;`
  } else if (q.match(/bank|atm|financial/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="bank"](${bbox});node["amenity"="atm"](${bbox}););out center 500;`
  } else if (q.match(/gas|fuel|charging|ev/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="fuel"](${bbox});node["amenity"="charging_station"](${bbox}););out center 500;`
  } else if (q.match(/hotel|motel|lodging/)) {
    osmQuery = `[out:json][timeout:90];(node["tourism"="hotel"](${bbox});node["tourism"="motel"](${bbox}););out center 500;`
  } else if (q.match(/government|city hall|municipal|county/)) {
    osmQuery = `[out:json][timeout:90];(node["amenity"="townhall"](${bbox});node["office"="government"](${bbox});node["government"](${bbox}););out center 500;`
  } else if (q.match(/park|recreation|sport|gym|fitness/)) {
    osmQuery = `[out:json][timeout:90];(node["leisure"="park"](${bbox});node["leisure"="sports_centre"](${bbox});node["sport"](${bbox}););out center 500;`
  } else {
    osmQuery = `[out:json][timeout:90];(node["amenity"](${bbox}););out center 300;`
  }

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(osmQuery)}`
    })

    if (!response.ok) return []

    const data = await response.json()
    
    return (data.elements || []).map((el: any) => {
      const tags = el.tags || {}
      return {
        source_name: 'OpenStreetMap',
        source_record_id: `osm-${el.id}`,
        source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        category: getOSMCategory(tags),
        subcategory: tags.amenity || tags.leisure || tags.shop || 'other',
        name: tags.name || tags.brand || 'Unnamed',
        description: buildOSMDescription(tags),
        latitude: el.lat || el.center?.lat,
        longitude: el.lon || el.center?.lon,
        city: tags['addr:city'],
        state: tags['addr:state'],
        attributes: tags,
        confidence: tags.name ? 0.9 : 0.6
      }
    }).filter((r: any) => r.latitude && r.name !== 'Unnamed')
  } catch (e) {
    console.error('OSM error:', e)
    return []
  }
}

function getOSMCategory(tags: any): string {
  if (tags.amenity === 'hospital' || tags.amenity === 'doctors' || tags.healthcare) return 'Healthcare'
  if (tags.amenity === 'school' || tags.amenity === 'university') return 'Education'
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return 'Food & Dining'
  if (tags.amenity === 'bank') return 'Financial'
  if (tags.leisure || tags.sport) return 'Recreation'
  if (tags.government || tags.amenity === 'townhall') return 'Government'
  return 'Other'
}

function buildOSMDescription(tags: any): string {
  const parts = []
  if (tags.phone) parts.push(`Phone: ${tags.phone}`)
  if (tags.website) parts.push(tags.website)
  if (tags.opening_hours) parts.push(`Hours: ${tags.opening_hours}`)
  if (tags.cuisine) parts.push(`Cuisine: ${tags.cuisine}`)
  return parts.join(' | ') || 'No details available'
}

// --- CMS OPEN PAYMENTS ---
async function queryCMSOpenPayments(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  if (!stateCode) return []

  try {
    const url = 'https://openpaymentsdata.cms.gov/api/1/datastore/query/ebd7ac92-73ee-4a1b-8022-a1339f016833'
    
    const payload = {
      conditions: [{ property: "recipient_state", value: stateCode, operator: "=" }],
      limit: 500,
      sort: { property: "total_amount_of_payment_usdollars", order: "desc" }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => ({
      source_name: 'CMS Open Payments',
      source_record_id: `cms-${r.record_id}`,
      source_url: 'https://openpaymentsdata.cms.gov/',
      category: 'Healthcare',
      subcategory: 'Physician Payment',
      name: `Dr. ${r.physician_first_name} ${r.physician_last_name}`,
      description: `${r.physician_specialty || 'Physician'} | Payment: $${parseFloat(r.total_amount_of_payment_usdollars || 0).toLocaleString()} from ${r.applicable_manufacturer_or_applicable_gpo_making_payment_name || 'Unknown'}`,
      city: r.recipient_city,
      state: r.recipient_state,
      attributes: {
        specialty: r.physician_specialty,
        payment_amount: parseFloat(r.total_amount_of_payment_usdollars || 0),
        payer: r.applicable_manufacturer_or_applicable_gpo_making_payment_name,
        drug: r.name_of_drug_or_biological_or_device_or_medical_supply_1,
        payment_type: r.nature_of_payment_or_transfer_of_value
      },
      confidence: 0.98
    }))
  } catch (e) {
    console.error('CMS error:', e)
    return []
  }
}

// --- USA SPENDING ---
async function queryUSASpending(query: string): Promise<any[]> {
  try {
    const stateCode = getStateCode(query)
    
    const keywords = query.split(' ')
      .filter(w => w.length > 3 && !['the', 'and', 'for', 'from', 'with'].includes(w.toLowerCase()))
      .slice(0, 3)

    const payload: any = {
      filters: {
        time_period: [{ start_date: '2020-01-01', end_date: new Date().toISOString().split('T')[0] }],
        award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05']
      },
      fields: ['Award ID', 'Recipient Name', 'Description', 'Award Amount', 'Awarding Agency', 'Award Type', 'Start Date', 'End Date', 'recipient_location'],
      limit: 100,
      sort: 'Award Amount',
      order: 'desc'
    }
    
    if (stateCode) {
      payload.filters.recipient_locations = [{ country: 'USA', state: stateCode }]
    }
    if (keywords.length > 0) {
      payload.filters.keywords = keywords
    }

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => ({
      source_name: 'USASpending.gov',
      source_record_id: r['Award ID'],
      source_url: `https://www.usaspending.gov/award/${r['Award ID']}`,
      category: r['Award Type']?.includes('Grant') ? 'Grant' : 'Contract',
      subcategory: r['Award Type'],
      name: r['Recipient Name'] || 'Unknown',
      description: `${r['Description'] || r['Award Type']} | Agency: ${r['Awarding Agency']} | Amount: $${(r['Award Amount'] || 0).toLocaleString()}`,
      latitude: r.recipient_location?.latitude,
      longitude: r.recipient_location?.longitude,
      attributes: {
        award_amount: r['Award Amount'],
        agency: r['Awarding Agency'],
        award_type: r['Award Type'],
        start_date: r['Start Date'],
        end_date: r['End Date']
      },
      confidence: 0.95
    }))
  } catch (e) {
    console.error('USASpending error:', e)
    return []
  }
}

// --- NPI REGISTRY ---
async function queryNPIRegistry(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  if (!stateCode) return []

  try {
    const params = new URLSearchParams({
      version: '2.1',
      state: stateCode,
      limit: '200'
    })

    if (query.includes('cardiolog')) params.set('taxonomy_description', 'Cardiology')
    if (query.includes('dermatolog')) params.set('taxonomy_description', 'Dermatology')
    if (query.includes('pediatr')) params.set('taxonomy_description', 'Pediatrics')

    const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => {
      const basic = r.basic || {}
      const address = r.addresses?.[0] || {}
      const taxonomy = r.taxonomies?.[0] || {}
      
      return {
        source_name: 'NPI Registry',
        source_record_id: `npi-${r.number}`,
        source_url: `https://npiregistry.cms.hhs.gov/provider-view/${r.number}`,
        category: 'Healthcare',
        subcategory: 'Provider',
        name: basic.organization_name || `${basic.first_name} ${basic.last_name}`,
        description: `${taxonomy.desc || 'Healthcare Provider'} | NPI: ${r.number}`,
        city: address.city,
        state: address.state,
        zip: address.postal_code,
        attributes: {
          npi: r.number,
          specialty: taxonomy.desc,
          credential: basic.credential,
          gender: basic.gender
        },
        confidence: 0.95
      }
    })
  } catch (e) {
    console.error('NPI error:', e)
    return []
  }
}

// --- FDA DRUGS ---
async function queryFDADrugs(query: string): Promise<any[]> {
  try {
    const drugMatch = query.match(/drug[s]?\s+(?:called|named|like)?\s*(\w+)/i) || 
                      query.match(/(\w+)\s+(?:medication|medicine|drug)/i)
    
    const searchTerm = drugMatch ? drugMatch[1] : query.split(' ').find(w => w.length > 4) || 'aspirin'
    
    const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${searchTerm}"&limit=100`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => {
      const openfda = r.openfda || {}
      return {
        source_name: 'FDA Drug Database',
        source_record_id: `fda-${openfda.spl_id?.[0] || Math.random()}`,
        source_url: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
        category: 'Healthcare',
        subcategory: 'Drug',
        name: openfda.brand_name?.[0] || openfda.generic_name?.[0] || 'Unknown Drug',
        description: `Generic: ${openfda.generic_name?.[0] || 'N/A'} | Manufacturer: ${openfda.manufacturer_name?.[0] || 'N/A'} | Route: ${openfda.route?.[0] || 'N/A'}`,
        attributes: {
          brand_name: openfda.brand_name?.[0],
          generic_name: openfda.generic_name?.[0],
          manufacturer: openfda.manufacturer_name?.[0],
          substance: openfda.substance_name,
          route: openfda.route?.[0],
          product_type: openfda.product_type?.[0]
        },
        confidence: 0.95
      }
    })
  } catch (e) {
    console.error('FDA Drugs error:', e)
    return []
  }
}

// --- FDA ADVERSE EVENTS ---
async function queryFDAAdverse(query: string): Promise<any[]> {
  try {
    const drugMatch = query.match(/(\w{4,})/g)?.find(w => !['adverse', 'event', 'side', 'effect', 'drug'].includes(w.toLowerCase()))
    if (!drugMatch) return []

    const response = await fetch(`https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${drugMatch}"&limit=100`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => {
      const drug = r.patient?.drug?.[0] || {}
      const reactions = r.patient?.reaction?.map((rx: any) => rx.reactionmeddrapt).join(', ') || 'Unknown'
      
      return {
        source_name: 'FDA Adverse Events',
        source_record_id: `fda-ae-${r.safetyreportid}`,
        source_url: 'https://www.fda.gov/drugs/drug-safety-and-availability',
        category: 'Healthcare',
        subcategory: 'Adverse Event',
        name: drug.medicinalproduct || 'Unknown Drug',
        description: `Reactions: ${reactions} | Serious: ${r.serious === '1' ? 'Yes' : 'No'}`,
        attributes: {
          drug_name: drug.medicinalproduct,
          reactions: r.patient?.reaction?.map((rx: any) => rx.reactionmeddrapt),
          serious: r.serious === '1',
          report_date: r.receiptdate
        },
        confidence: 0.85
      }
    })
  } catch (e) {
    console.error('FDA Adverse error:', e)
    return []
  }
}

// --- EPA ECHO ---
async function queryEPAEcho(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  if (!stateCode) return []

  try {
    const response = await fetch(`https://echo.epa.gov/tools/web-services/facility-search-echo?p_st=${stateCode}&p_act=Y&output=JSON`)
    if (!response.ok) return []

    const data = await response.json()
    const facilities = data?.Results?.Facilities || []
    
    return facilities.slice(0, 200).map((f: any) => ({
      source_name: 'EPA ECHO',
      source_record_id: `epa-${f.RegistryId}`,
      source_url: `https://echo.epa.gov/detailed-facility-report?fid=${f.RegistryId}`,
      category: 'Environmental',
      subcategory: 'Facility',
      name: f.FacName || 'Unknown Facility',
      description: `${f.FacCity}, ${f.FacState} | Violations (3yr): ${f.CWAViolStat3yr || 0} | Programs: ${[f.CAAFlag === 'Y' ? 'Air' : '', f.CWAFlag === 'Y' ? 'Water' : '', f.RCRAFlag === 'Y' ? 'Waste' : ''].filter(Boolean).join(', ') || 'None'}`,
      latitude: parseFloat(f.FacLat),
      longitude: parseFloat(f.FacLong),
      city: f.FacCity,
      state: f.FacState,
      attributes: {
        registry_id: f.RegistryId,
        violations_3yr: f.CWAViolStat3yr,
        air_program: f.CAAFlag === 'Y',
        water_program: f.CWAFlag === 'Y',
        waste_program: f.RCRAFlag === 'Y',
        current_violator: f.AIRCurrViolFlag === 'Y' || f.CWACurrViolFlag === 'Y'
      },
      confidence: 0.95
    }))
  } catch (e) {
    console.error('EPA error:', e)
    return []
  }
}

// --- COLLEGE SCORECARD ---
async function queryCollegeScorecard(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  const apiKey = Deno.env.get('DATA_GOV_API_KEY') || ''
  
  try {
    const params = new URLSearchParams({
      'school.state': stateCode || '',
      'fields': 'id,school.name,school.city,school.state,latest.admissions.admission_rate.overall,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state,latest.earnings.10_yrs_after_entry.median,latest.student.size,school.school_url',
      'per_page': '100',
      'api_key': apiKey
    })

    const response = await fetch(`https://api.data.gov/ed/collegescorecard/v1/schools?${params}`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((r: any) => ({
      source_name: 'College Scorecard',
      source_record_id: `college-${r.id}`,
      source_url: r['school.school_url'] || 'https://collegescorecard.ed.gov/',
      category: 'Education',
      subcategory: 'College',
      name: r['school.name'],
      description: `Admission Rate: ${r['latest.admissions.admission_rate.overall'] ? (r['latest.admissions.admission_rate.overall'] * 100).toFixed(1) + '%' : 'N/A'} | In-State Tuition: $${(r['latest.cost.tuition.in_state'] || 0).toLocaleString()} | Median Earnings: $${(r['latest.earnings.10_yrs_after_entry.median'] || 0).toLocaleString()}`,
      city: r['school.city'],
      state: r['school.state'],
      attributes: {
        admission_rate: r['latest.admissions.admission_rate.overall'],
        tuition_in_state: r['latest.cost.tuition.in_state'],
        tuition_out_state: r['latest.cost.tuition.out_of_state'],
        median_earnings: r['latest.earnings.10_yrs_after_entry.median'],
        student_size: r['latest.student.size']
      },
      confidence: 0.95
    }))
  } catch (e) {
    console.error('College Scorecard error:', e)
    return []
  }
}

// --- CLINICAL TRIALS ---
async function queryClinicalTrials(query: string): Promise<any[]> {
  try {
    const stateCode = getStateCode(query)
    const condition = query.match(/(cancer|diabetes|heart|alzheimer|parkinson|covid|depression|anxiety)/i)?.[1] || ''
    
    const params = new URLSearchParams({
      'query.cond': condition,
      'query.locn': stateCode || 'United States',
      'pageSize': '100'
    })

    const response = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.studies || []).map((s: any) => {
      const study = s.protocolSection || {}
      const id = study.identificationModule || {}
      const status = study.statusModule || {}
      const design = study.designModule || {}
      
      return {
        source_name: 'ClinicalTrials.gov',
        source_record_id: id.nctId,
        source_url: `https://clinicaltrials.gov/study/${id.nctId}`,
        category: 'Healthcare',
        subcategory: 'Clinical Trial',
        name: id.briefTitle || 'Unknown Study',
        description: `Status: ${status.overallStatus} | Phase: ${design.phases?.join(', ') || 'N/A'} | Enrollment: ${design.enrollmentInfo?.count || 'N/A'}`,
        attributes: {
          nct_id: id.nctId,
          status: status.overallStatus,
          phase: design.phases,
          enrollment: design.enrollmentInfo?.count,
          start_date: status.startDateStruct?.date,
          conditions: study.conditionsModule?.conditions
        },
        confidence: 0.95
      }
    })
  } catch (e) {
    console.error('Clinical Trials error:', e)
    return []
  }
}

// --- HOSPITAL COMPARE ---
async function queryHospitalCompare(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  if (!stateCode) return []

  try {
    const response = await fetch(
      `https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u?conditions[0][property]=state&conditions[0][value]=${stateCode}&limit=200`
    )
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).map((h: any) => ({
      source_name: 'Hospital Compare',
      source_record_id: `hosp-${h.provider_id}`,
      source_url: `https://www.medicare.gov/care-compare/details/hospital/${h.provider_id}`,
      category: 'Healthcare',
      subcategory: 'Hospital',
      name: h.hospital_name,
      description: `Type: ${h.hospital_type} | Rating: ${h.hospital_overall_rating || 'N/A'}/5 | Emergency: ${h.emergency_services ? 'Yes' : 'No'}`,
      city: h.city,
      state: h.state,
      zip: h.zip_code,
      attributes: {
        provider_id: h.provider_id,
        hospital_type: h.hospital_type,
        overall_rating: h.hospital_overall_rating,
        emergency_services: h.emergency_services,
        ownership: h.hospital_ownership
      },
      confidence: 0.95
    }))
  } catch (e) {
    console.error('Hospital Compare error:', e)
    return []
  }
}

// --- CENSUS ACS ---
async function queryCensusACS(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  if (!stateCode) return []

  const stateFips = STATE_FIPS[stateCode]
  if (!stateFips) return []

  try {
    const apiKey = Deno.env.get('CENSUS_API_KEY') || ''
    
    const response = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01001_001E,B19013_001E,B25077_001E&for=county:*&in=state:${stateFips}&key=${apiKey}`
    )
    if (!response.ok) return []

    const data = await response.json()
    const headers = data[0]
    
    return data.slice(1).map((row: any) => {
      const record: any = {}
      headers.forEach((h: string, i: number) => record[h] = row[i])
      
      return {
        source_name: 'Census ACS',
        source_record_id: `census-${record.state}-${record.county}`,
        source_url: 'https://data.census.gov/',
        category: 'Demographics',
        subcategory: 'County Data',
        name: record.NAME,
        description: `Population: ${parseInt(record.B01001_001E).toLocaleString()} | Median Income: $${parseInt(record.B19013_001E).toLocaleString()} | Median Home Value: $${parseInt(record.B25077_001E).toLocaleString()}`,
        state: stateCode,
        attributes: {
          population: parseInt(record.B01001_001E),
          median_income: parseInt(record.B19013_001E),
          median_home_value: parseInt(record.B25077_001E),
          state_fips: record.state,
          county_fips: record.county
        },
        confidence: 0.98
      }
    })
  } catch (e) {
    console.error('Census error:', e)
    return []
  }
}

// --- USGS EARTHQUAKES ---
async function queryUSGSEarthquakes(query: string): Promise<any[]> {
  try {
    const endtime = new Date().toISOString()
    const starttime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${starttime}&endtime=${endtime}&minmagnitude=2.5&limit=500`
    )
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.features || []).map((f: any) => {
      const props = f.properties || {}
      const coords = f.geometry?.coordinates || []
      
      return {
        source_name: 'USGS Earthquakes',
        source_record_id: `usgs-eq-${f.id}`,
        source_url: props.url || 'https://earthquake.usgs.gov/',
        category: 'Environmental',
        subcategory: 'Earthquake',
        name: props.place || 'Unknown Location',
        description: `Magnitude: ${props.mag} | Depth: ${coords[2]}km | ${new Date(props.time).toLocaleString()}`,
        latitude: coords[1],
        longitude: coords[0],
        attributes: {
          magnitude: props.mag,
          depth_km: coords[2],
          time: props.time,
          alert: props.alert,
          tsunami: props.tsunami
        },
        confidence: 0.99
      }
    })
  } catch (e) {
    console.error('USGS error:', e)
    return []
  }
}

// --- NHTSA RECALLS ---
async function queryNHTSARecalls(query: string): Promise<any[]> {
  try {
    const yearMatch = query.match(/20\d{2}/)
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
    
    const response = await fetch(`https://api.nhtsa.gov/recalls/recallsByYear?year=${year}`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.results || []).slice(0, 200).map((r: any) => ({
      source_name: 'NHTSA Recalls',
      source_record_id: `nhtsa-${r.NHTSACampaignNumber}`,
      source_url: `https://www.nhtsa.gov/recalls?nhtsaId=${r.NHTSACampaignNumber}`,
      category: 'Safety',
      subcategory: 'Vehicle Recall',
      name: `${r.Manufacturer} ${r.Make} ${r.Model}`,
      description: `${r.Component} | ${r.Summary?.substring(0, 200)}...`,
      attributes: {
        campaign_number: r.NHTSACampaignNumber,
        manufacturer: r.Manufacturer,
        make: r.Make,
        model: r.Model,
        year: r.ModelYear,
        component: r.Component,
        consequence: r.Consequence
      },
      confidence: 0.95
    }))
  } catch (e) {
    console.error('NHTSA error:', e)
    return []
  }
}

// --- ProPublica Nonprofits ---
async function queryProPublicaNonprofits(query: string): Promise<any[]> {
  const stateCode = getStateCode(query)
  
  try {
    const searchTerm = query.split(' ')
      .filter(w => w.length > 3 && !['nonprofit', 'charity', 'foundation', 'the', 'and'].includes(w.toLowerCase()))
      .slice(0, 2)
      .join('+') || 'community'
    
    const response = await fetch(`https://projects.propublica.org/nonprofits/api/v2/search.json?q=${searchTerm}${stateCode ? `&state%5Bid%5D=${stateCode}` : ''}`)
    if (!response.ok) return []

    const data = await response.json()
    
    return (data.organizations || []).slice(0, 100).map((o: any) => ({
      source_name: 'ProPublica Nonprofits',
      source_record_id: `pp-${o.ein}`,
      source_url: `https://projects.propublica.org/nonprofits/organizations/${o.ein}`,
      category: 'Nonprofit',
      subcategory: o.ntee_code ? `NTEE ${o.ntee_code}` : 'Unknown',
      name: o.name,
      description: `EIN: ${o.ein} | ${o.city}, ${o.state} | Income: $${(o.income_amount || 0).toLocaleString()}`,
      city: o.city,
      state: o.state,
      attributes: {
        ein: o.ein,
        income_amount: o.income_amount,
        asset_amount: o.asset_amount,
        ntee_code: o.ntee_code
      },
      confidence: 0.9
    }))
  } catch (e) {
    console.error('ProPublica error:', e)
    return []
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { query_id, raw_query } = await req.json()
    console.log('=== DATAVERSE EXECUTE START ===')
    console.log('Query:', raw_query || query_id)

    let queryText = raw_query
    let queryRecord: any = null

    // If query_id provided, fetch from DB
    if (query_id && !raw_query) {
      const { data: q, error: queryError } = await supabase
        .from('queries')
        .select('*')
        .eq('id', query_id)
        .single()

      if (queryError || !q) {
        throw new Error('Query not found')
      }
      queryRecord = q
      queryText = q.prompt
    }

    const lowerQuery = queryText.toLowerCase()
    console.log('Processing query:', lowerQuery)

    // Determine which sources to query based on keywords
    const { data: allSources } = await supabase
      .from('api_sources')
      .select('*')
      .eq('status', 'active')

    const matchedSources: any[] = []
    for (const source of (allSources || [])) {
      const keywords = source.keywords || []
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          matchedSources.push(source)
          break
        }
      }
    }

    // Always include OpenStreetMap for location queries
    const hasLocation = getStateCode(lowerQuery) || Object.keys(BOUNDING_BOXES).some(loc => lowerQuery.includes(loc))
    if (hasLocation && !matchedSources.find((s: any) => s.slug === 'openstreetmap')) {
      const osm = (allSources || []).find((s: any) => s.slug === 'openstreetmap')
      if (osm) matchedSources.push(osm)
    }

    // If no matches, default to OpenStreetMap
    if (matchedSources.length === 0) {
      const osm = (allSources || []).find((s: any) => s.slug === 'openstreetmap')
      if (osm) matchedSources.push(osm)
    }

    console.log('Sources matched:', matchedSources.map((s: any) => s.slug))

    // Execute all matched sources in parallel
    const collectorMap: Record<string, (q: string) => Promise<any[]>> = {
      'openstreetmap': queryOpenStreetMap,
      'cms-open-payments': queryCMSOpenPayments,
      'usaspending': queryUSASpending,
      'npi-registry': queryNPIRegistry,
      'fda-drugs': queryFDADrugs,
      'fda-adverse': queryFDAAdverse,
      'epa-echo': queryEPAEcho,
      'college-scorecard': queryCollegeScorecard,
      'clinical-trials': queryClinicalTrials,
      'hospital-compare': queryHospitalCompare,
      'census-acs': queryCensusACS,
      'usgs-earthquake': queryUSGSEarthquakes,
      'nhtsa-recalls': queryNHTSARecalls,
      'propublica-nonprofits': queryProPublicaNonprofits
    }

    const allRecords: any[] = []
    const sourcesQueried: string[] = []

    const results = await Promise.allSettled(
      matchedSources.map(async (source: any) => {
        const collector = collectorMap[source.slug]
        if (collector) {
          console.log(`Executing: ${source.slug}`)
          sourcesQueried.push(source.slug)
          return { slug: source.slug, records: await collector(lowerQuery) }
        }
        return { slug: source.slug, records: [] }
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.records.length > 0) {
        console.log(`${result.value.slug}: ${result.value.records.length} records`)
        allRecords.push(...result.value.records)
      } else if (result.status === 'rejected') {
        console.error(`Source failed:`, result.reason)
      }
    })

    console.log('Total records collected:', allRecords.length)

    // Convert to GeoJSON features for compatibility with existing frontend
    const features = allRecords.map((r, idx) => ({
      type: 'Feature' as const,
      id: r.source_record_id || `record-${idx}`,
      geometry: r.latitude && r.longitude ? {
        type: 'Point' as const,
        coordinates: [r.longitude, r.latitude]
      } : null,
      properties: {
        name: r.name,
        display_name: r.name,
        category: r.category,
        subcategory: r.subcategory,
        description: r.description,
        source: r.source_name,
        source_url: r.source_url,
        confidence: r.confidence,
        relevance: r.confidence,
        city: r.city,
        state: r.state,
        zip: r.zip,
        ...r.attributes
      }
    }))

    // Generate insights
    const categoryCount: Record<string, number> = {}
    const sourceCount: Record<string, number> = {}
    features.forEach(f => {
      const cat = f.properties.category || 'Unknown'
      const src = f.properties.source || 'Unknown'
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
      sourceCount[src] = (sourceCount[src] || 0) + 1
    })

    const insights = {
      summary: `Found ${features.length} records from ${Object.keys(sourceCount).length} sources across ${Object.keys(categoryCount).length} categories.`,
      key_findings: [
        `Top category: ${Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'} (${Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} records)`,
        `Sources queried: ${sourcesQueried.join(', ')}`,
        `Average confidence: ${(features.reduce((sum, f) => sum + (f.properties.confidence || 0), 0) / features.length * 100).toFixed(1)}%`
      ],
      recommendations: [
        features.length > 100 ? 'Consider filtering by category or location for more targeted results' : 'Results are focused and manageable',
        'Export to CSV or GeoJSON for further analysis'
      ]
    }

    console.log('=== DATAVERSE EXECUTE COMPLETE ===')

    return new Response(JSON.stringify({
      success: true,
      data: {
        type: 'FeatureCollection',
        features
      },
      insights,
      sources: sourcesQueried.map(s => ({ 
        name: s, 
        records: features.filter(f => f.properties.source?.toLowerCase().includes(s.split('-')[0])).length,
        status: 'success'
      })),
      processing_time_ms: Date.now(),
      total_records: features.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Execute error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
