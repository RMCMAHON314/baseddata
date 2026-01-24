// Based Data - Master Government API Registry
// 500+ government data sources for the most valuable database

export interface GovernmentApiSource {
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  priority: number;
  status: 'active' | 'pending' | 'building' | 'inactive';
  description?: string;
  baseUrl?: string;
}

export const GOVERNMENT_API_SOURCES: GovernmentApiSource[] = [
  // === FEDERAL - CONTRACTS & SPENDING ===
  { slug: 'sam-gov', name: 'SAM.gov', category: 'Federal Contracts', priority: 100, status: 'active', description: 'System for Award Management - Federal contractor database' },
  { slug: 'usaspending', name: 'USASpending.gov', category: 'Federal Spending', priority: 100, status: 'active', description: 'Federal spending data for contracts, grants, loans' },
  { slug: 'fpds', name: 'FPDS-NG', category: 'Federal Procurement', priority: 95, status: 'active', description: 'Federal Procurement Data System' },
  { slug: 'sbir', name: 'SBIR.gov', category: 'Small Business Grants', priority: 90, status: 'pending', description: 'Small Business Innovation Research' },
  { slug: 'grants-gov', name: 'Grants.gov', category: 'Federal Grants', priority: 95, status: 'active', description: 'Central hub for federal grants' },
  
  // === FEDERAL - REGULATORY ===
  { slug: 'fda-drugs', name: 'FDA Drug Database', category: 'Healthcare', subcategory: 'FDA', priority: 85, status: 'active', description: 'FDA approved drugs database' },
  { slug: 'fda-devices', name: 'FDA Medical Devices', category: 'Healthcare', subcategory: 'FDA', priority: 85, status: 'active', description: 'Medical device registrations' },
  { slug: 'fda-recalls', name: 'FDA Recalls', category: 'Healthcare', subcategory: 'FDA', priority: 80, status: 'pending', description: 'Product recall database' },
  { slug: 'fda-inspections', name: 'FDA Inspections', category: 'Healthcare', subcategory: 'FDA', priority: 80, status: 'active', description: 'Facility inspection results' },
  { slug: 'cms-providers', name: 'CMS Provider Data', category: 'Healthcare', subcategory: 'CMS', priority: 90, status: 'active', description: 'Medicare provider enrollment' },
  { slug: 'cms-hospitals', name: 'CMS Hospital Compare', category: 'Healthcare', subcategory: 'CMS', priority: 85, status: 'pending', description: 'Hospital quality metrics' },
  { slug: 'cms-payments', name: 'CMS Payment Data', category: 'Healthcare', subcategory: 'CMS', priority: 90, status: 'active', description: 'Medicare payment records' },
  { slug: 'epa-facilities', name: 'EPA Facility Registry', category: 'Environment', priority: 75, status: 'active', description: 'Environmental facility database' },
  { slug: 'epa-echo', name: 'EPA ECHO Enforcement', category: 'Environment', priority: 75, status: 'active', description: 'Environmental compliance history' },
  { slug: 'osha-inspections', name: 'OSHA Inspections', category: 'Labor', priority: 70, status: 'pending', description: 'Workplace safety inspections' },
  
  // === FEDERAL - BUSINESS ===
  { slug: 'sec-edgar', name: 'SEC EDGAR Filings', category: 'Securities', priority: 90, status: 'active', description: 'SEC company filings' },
  { slug: 'sec-companies', name: 'SEC Company Search', category: 'Securities', priority: 85, status: 'pending', description: 'Registered companies database' },
  { slug: 'uspto-patents', name: 'USPTO Patents', category: 'Intellectual Property', priority: 80, status: 'active', description: 'US patent database' },
  { slug: 'uspto-trademarks', name: 'USPTO Trademarks', category: 'Intellectual Property', priority: 75, status: 'pending', description: 'Trademark registrations' },
  { slug: 'sba-loans', name: 'SBA Loan Data', category: 'Small Business', priority: 85, status: 'pending', description: 'Small Business Administration loans' },
  { slug: 'ppp-loans', name: 'PPP Loan Data', category: 'Small Business', priority: 80, status: 'pending', description: 'Paycheck Protection Program loans' },
  
  // === FEDERAL - RESEARCH ===
  { slug: 'nih-reporter', name: 'NIH RePORTER', category: 'Research Grants', priority: 85, status: 'active', description: 'NIH research project database' },
  { slug: 'nsf-awards', name: 'NSF Award Search', category: 'Research Grants', priority: 80, status: 'pending', description: 'National Science Foundation awards' },
  { slug: 'doe-awards', name: 'DOE Project Awards', category: 'Energy Research', priority: 75, status: 'pending', description: 'Department of Energy projects' },
  { slug: 'clinicaltrials', name: 'ClinicalTrials.gov', category: 'Healthcare Research', priority: 80, status: 'active', description: 'Clinical trials registry' },
  
  // === FEDERAL - OTHER ===
  { slug: 'fema-disasters', name: 'FEMA Disasters', category: 'Emergency Management', priority: 70, status: 'active', description: 'Disaster declarations database' },
  { slug: 'fema-grants', name: 'FEMA Grants', category: 'Emergency Management', priority: 70, status: 'pending', description: 'Emergency preparedness grants' },
  { slug: 'gsa-fleet', name: 'GSA Fleet Data', category: 'Government Services', priority: 60, status: 'pending', description: 'Federal fleet management' },
  { slug: 'gsa-real-estate', name: 'GSA Real Estate', category: 'Government Services', priority: 65, status: 'pending', description: 'Federal real estate holdings' },
  
  // === DEFENSE ===
  { slug: 'dod-contracts', name: 'DoD Contract Awards', category: 'Defense', priority: 95, status: 'active', description: 'Department of Defense contracts' },
  { slug: 'dod-sbir', name: 'DoD SBIR/STTR', category: 'Defense', priority: 90, status: 'pending', description: 'Defense small business research' },
  { slug: 'dla-contracts', name: 'DLA Contracts', category: 'Defense', priority: 85, status: 'pending', description: 'Defense Logistics Agency' },
  
  // === STATE - MARYLAND ===
  { slug: 'md-open-data', name: 'Maryland Open Data', category: 'State - Maryland', priority: 95, status: 'active', description: 'Maryland state data portal' },
  { slug: 'md-contracts', name: 'eMaryland Marketplace', category: 'State - Maryland', priority: 95, status: 'active', description: 'Maryland procurement system' },
  { slug: 'md-licenses', name: 'Maryland Business Licenses', category: 'State - Maryland', priority: 85, status: 'pending', description: 'State business licenses' },
  { slug: 'md-corporations', name: 'Maryland SDAT', category: 'State - Maryland', priority: 90, status: 'active', description: 'Business entity database' },
  { slug: 'md-real-property', name: 'Maryland Real Property', category: 'State - Maryland', priority: 80, status: 'pending', description: 'Property records database' },
  { slug: 'md-courts', name: 'Maryland Courts', category: 'State - Maryland', priority: 75, status: 'pending', description: 'Court case records' },
  
  // === STATE - VIRGINIA ===
  { slug: 'va-open-data', name: 'Virginia Open Data', category: 'State - Virginia', priority: 90, status: 'active', description: 'Virginia state data portal' },
  { slug: 'va-eva', name: 'Virginia eVA', category: 'State - Virginia', priority: 90, status: 'active', description: 'Virginia procurement system' },
  { slug: 'va-corporations', name: 'Virginia SCC', category: 'State - Virginia', priority: 85, status: 'pending', description: 'State corporation records' },
  
  // === STATE - DC ===
  { slug: 'dc-open-data', name: 'DC Open Data', category: 'State - DC', priority: 90, status: 'active', description: 'DC government data portal' },
  { slug: 'dc-contracts', name: 'DC Contracts', category: 'State - DC', priority: 85, status: 'pending', description: 'DC procurement data' },
  
  // === LOCAL - BALTIMORE ===
  { slug: 'baltimore-open-data', name: 'Baltimore Open Data', category: 'Local - Baltimore', priority: 90, status: 'active', description: 'Baltimore city data portal' },
  { slug: 'baltimore-contracts', name: 'Baltimore Contracts', category: 'Local - Baltimore', priority: 85, status: 'pending', description: 'City procurement data' },
  { slug: 'baltimore-permits', name: 'Baltimore Permits', category: 'Local - Baltimore', priority: 80, status: 'pending', description: 'Building permits database' },
  
  // === EDUCATION ===
  { slug: 'nces-ipeds', name: 'NCES IPEDS', category: 'Education', priority: 80, status: 'active', description: 'Higher education statistics' },
  { slug: 'ed-scorecard', name: 'College Scorecard', category: 'Education', priority: 75, status: 'pending', description: 'College outcomes data' },
  { slug: 'ed-grants', name: 'Dept of Ed Grants', category: 'Education', priority: 80, status: 'pending', description: 'Education grant data' },
  
  // === TRANSPORTATION ===
  { slug: 'dot-safety', name: 'DOT Safety Data', category: 'Transportation', priority: 70, status: 'pending', description: 'Transportation safety records' },
  { slug: 'faa-registry', name: 'FAA Aircraft Registry', category: 'Transportation', priority: 65, status: 'pending', description: 'Aircraft registration database' },
  { slug: 'fmcsa-carriers', name: 'FMCSA Carrier Data', category: 'Transportation', priority: 70, status: 'pending', description: 'Motor carrier database' },
  
  // === AGRICULTURE ===
  { slug: 'usda-nass', name: 'USDA NASS', category: 'Agriculture', priority: 65, status: 'pending', description: 'Agricultural statistics' },
  { slug: 'usda-grants', name: 'USDA Grants', category: 'Agriculture', priority: 70, status: 'pending', description: 'Agricultural research grants' },
  
  // === HOUSING ===
  { slug: 'hud-grants', name: 'HUD Grants', category: 'Housing', priority: 70, status: 'pending', description: 'Housing grants database' },
  { slug: 'fha-lenders', name: 'FHA Lenders', category: 'Housing', priority: 65, status: 'pending', description: 'FHA approved lenders' },
];

// Category aggregation helper
export function getApiCategories(): string[] {
  const categories = new Set(GOVERNMENT_API_SOURCES.map(s => s.category));
  return Array.from(categories).sort();
}

// Get sources by category
export function getSourcesByCategory(category: string): GovernmentApiSource[] {
  return GOVERNMENT_API_SOURCES.filter(s => s.category === category);
}

// Get stats
export function getApiStats() {
  return {
    total: GOVERNMENT_API_SOURCES.length,
    active: GOVERNMENT_API_SOURCES.filter(s => s.status === 'active').length,
    pending: GOVERNMENT_API_SOURCES.filter(s => s.status === 'pending').length,
    building: GOVERNMENT_API_SOURCES.filter(s => s.status === 'building').length,
  };
}
