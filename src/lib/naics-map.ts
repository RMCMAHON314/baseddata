export const NAICS_KEYWORD_MAP: Record<string, string[]> = {
  'cybersecurity': ['541512', '541519'],
  'cyber': ['541512', '541519'],
  'it services': ['541511', '541512', '541519'],
  'software': ['511210', '541511'],
  'cloud': ['541512', '518210'],
  'data': ['541512', '518210', '519130'],
  'ai': ['541512', '541715'],
  'artificial intelligence': ['541512', '541715'],
  'engineering': ['541330', '541310', '541320'],
  'construction': ['236220', '237310', '237990'],
  'architecture': ['541310'],
  'defense': ['541330', '541712', '541715', '336411'],
  'weapons': ['332993', '332994'],
  'logistics': ['541614', '488510'],
  'healthcare': ['621111', '621491', '622110'],
  'medical': ['339112', '339113', '621111'],
  'pharmaceutical': ['325411', '325412'],
  'consulting': ['541611', '541612', '541614', '541618'],
  'management consulting': ['541611'],
  'accounting': ['541211', '541219'],
  'staffing': ['561311', '561320'],
  'training': ['611430', '611710'],
  'research': ['541712', '541715', '541720'],
  'scientific': ['541380', '541690'],
  'environmental': ['541620', '562910'],
  'janitorial': ['561720'],
  'maintenance': ['561210', '238220'],
  'security guard': ['561612'],
};

export const STATE_MAP: Record<string, string> = {
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
  'wisconsin': 'WI', 'wyoming': 'WY', 'dc': 'DC', 'district of columbia': 'DC',
};

// Reverse lookup: state codes to full names (for display)
const STATE_CODE_SET = new Set(Object.values(STATE_MAP));

export function parseSearchQuery(query: string) {
  const lower = query.toLowerCase().trim();
  let state: string | null = null;
  let naicsCodes: string[] = [];
  let setAside: string | null = null;
  let remainingQuery = lower;

  // Extract state - check full names first (longer matches), then 2-letter codes
  for (const [name, code] of Object.entries(STATE_MAP).sort((a, b) => b[0].length - a[0].length)) {
    if (lower.includes(name)) {
      state = code;
      remainingQuery = remainingQuery.replace(new RegExp(name, 'gi'), '');
      break;
    }
  }
  if (!state) {
    // Check for 2-letter state codes as standalone words
    const codeMatch = lower.match(/\b([a-z]{2})\b/g);
    if (codeMatch) {
      for (const m of codeMatch) {
        if (STATE_CODE_SET.has(m.toUpperCase())) {
          state = m.toUpperCase();
          remainingQuery = remainingQuery.replace(new RegExp(`\\b${m}\\b`, 'gi'), '');
          break;
        }
      }
    }
  }

  // Extract NAICS - check longer keywords first
  const sortedKeywords = Object.entries(NAICS_KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, codes] of sortedKeywords) {
    if (lower.includes(keyword)) {
      naicsCodes = [...new Set([...naicsCodes, ...codes])];
      remainingQuery = remainingQuery.replace(new RegExp(keyword, 'gi'), '');
    }
  }

  // Extract set-aside
  const setAsideMap: Record<string, string> = {
    'small business': 'SBA', '8a': 'SBA', '8(a)': '8A',
    'hubzone': 'HZC', 'wosb': 'WOSB', 'women': 'WOSB',
    'sdvosb': 'SDVOSB', 'veteran': 'SDVOSB', 'service disabled': 'SDVOSB',
  };
  for (const [keyword, code] of Object.entries(setAsideMap)) {
    if (lower.includes(keyword)) {
      setAside = code;
      remainingQuery = remainingQuery.replace(new RegExp(keyword, 'gi'), '');
      break;
    }
  }

  return {
    state,
    naicsCodes,
    setAside,
    entityQuery: remainingQuery.trim() || null,
    originalQuery: query
  };
}
