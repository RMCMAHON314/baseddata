// BASED DATA v10.0 - 10x Enriched Intelligence Types

export interface OwnershipData {
  owner_name: string | null;
  owner_type: 'government' | 'private' | 'nonprofit' | 'public_company' | 'unknown';
  parent_organization: string | null;
  sam_uei?: string;
  cage_code?: string;
  is_government_contractor?: boolean;
  ein?: string;
  nonprofit_revenue?: number;
  nonprofit_assets?: number;
}

export interface Permit {
  type: string;
  subtype?: string;
  status: string;
  issued_date?: string;
  expiration_date?: string;
  source: string;
}

export interface Violation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'serious';
  description: string;
  date: string;
  resolved: boolean;
  fine_amount?: number;
  source: string;
}

export interface Inspection {
  type: string;
  date: string;
  result: string;
  source: string;
}

export interface RiskFlag {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RegulatoryData {
  permits: Permit[];
  violations: Violation[];
  inspections: Inspection[];
  compliance_status: 'compliant' | 'minor_issues' | 'major_issues' | 'unknown';
  risk_flags: RiskFlag[];
  last_inspection_date?: string;
}

export interface Contract {
  agency: string;
  amount: number;
  description: string;
  start_date?: string;
  end_date?: string;
  status: string;
  source: string;
}

export interface Grant {
  agency: string;
  amount: number;
  program?: string;
  description: string;
  year: number;
  source: string;
}

export interface FinancialHealthSignal {
  type: string;
  severity: 'info' | 'warning' | 'high';
  description: string;
}

export interface FinancialData {
  federal_funding: Grant[];
  state_funding: Grant[];
  contracts: Contract[];
  grants: Grant[];
  total_public_investment: number;
  financial_health_signals: FinancialHealthSignal[];
  nonprofit_financials?: {
    total_revenue: number;
    total_expenses: number;
    net_assets: number;
    executive_compensation?: number;
    program_expenses_ratio?: number;
  };
}

export interface DemographicsData {
  population_1mi: number;
  population_5mi?: number;
  median_income_1mi: number;
  median_income_5mi?: number;
  median_age: number;
  median_home_value?: number;
  unemployment_rate?: number;
  college_educated_pct?: number;
  population_change_5yr: number;
  population_trend: 'declining' | 'stable' | 'growing' | 'rapid_growth';
  diversity_index?: number;
  age_distribution?: {
    under_18: number;
    age_18_34: number;
    age_35_54: number;
    age_55_plus: number;
  };
}

export interface CompetitorInfo {
  name: string;
  distance_mi: number;
  key_differences?: string[];
}

export interface CompetitiveData {
  similar_facilities_1mi: number;
  similar_facilities_5mi: number;
  similar_facilities_10mi?: number;
  nearest_competitor: CompetitorInfo | null;
  market_saturation: 'underserved' | 'adequate' | 'saturated';
  facilities_per_10k_residents?: number;
  national_avg_per_10k?: number;
  competitive_advantages: string[];
  market_opportunity?: number;
}

export interface EnvironmentalRiskFactor {
  type: 'flood' | 'wildfire' | 'air_quality' | 'superfund' | 'toxic_releases';
  severity: 'low' | 'medium' | 'high' | 'very_high';
  description: string;
}

export interface EnvironmentalData {
  flood_zone: string;
  flood_zone_description?: string;
  wildfire_risk: 'low' | 'medium' | 'high' | 'very_high';
  air_quality_index: number;
  air_quality_category?: string;
  superfund_sites_5mi: number;
  brownfield_sites_1mi?: number;
  environmental_risk_score: number;
  environmental_risk_level: 'low' | 'medium' | 'high';
  risk_factors: EnvironmentalRiskFactor[];
}

export interface ContextData {
  demographics: DemographicsData;
  economics?: {
    unemployment_rate: number;
    job_growth_rate: number;
    major_industries?: { name: string; employment: number }[];
    gdp_growth_rate?: number;
    business_formation_rate?: number;
  };
  competition: CompetitiveData;
  environment: EnvironmentalData;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'opportunity';
}

export interface Predictions {
  growth_trajectory: 'declining' | 'stable' | 'growing' | 'rapid_growth';
  risk_trajectory: 'improving' | 'stable' | 'worsening';
  demand_forecast: 'decreasing' | 'stable' | 'increasing';
  anomalies: Anomaly[];
  prediction_confidence?: number;
}

export interface Narrative {
  executive_summary: string;
  key_findings: string[];
  recommendations: string[];
  comparable_context?: string;
}

export interface DerivedScores {
  overall_quality: number;
  risk_score: number;
  opportunity_score: number;
  accessibility_score: number;
  sustainability_score: number;
  confidence: number;
}

export interface EnrichedRecord {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  location: { lat: number; lng: number };
  address?: string;
  
  // Cross-referenced data
  ownership: OwnershipData;
  regulatory: RegulatoryData;
  financial: FinancialData;
  
  // Derived scores
  scores: DerivedScores;
  
  // Context
  context: ContextData;
  
  // Predictions
  predictions: Predictions;
  
  // AI Narrative
  narrative: Narrative;
  
  // Meta
  enrichment_timestamp?: string;
  enrichment_sources?: string[];
}

// Mock enrichment for demo purposes
export function generateMockEnrichment(record: any): EnrichedRecord {
  const props = record.properties || {};
  const geometry = record.geometry?.coordinates || [0, 0];
  
  return {
    id: record.id || 'unknown',
    name: props.name || 'Unknown Facility',
    display_name: props.name,
    category: props.category || 'unknown',
    location: { lat: geometry[1], lng: geometry[0] },
    address: props.address,
    
    ownership: {
      owner_name: props.operator || 'Baltimore County Department of Recreation and Parks',
      owner_type: props.operator?.includes('County') ? 'government' : 'unknown',
      parent_organization: 'Baltimore County Government',
    },
    
    regulatory: {
      permits: [{ type: 'recreational_facility', status: 'active', source: 'County Records' }],
      violations: [],
      inspections: [{ type: 'annual', date: '2024-08-15', result: 'passed', source: 'County Health' }],
      compliance_status: 'compliant',
      risk_flags: [],
      last_inspection_date: '2024-08-15',
    },
    
    financial: {
      federal_funding: [],
      state_funding: [],
      contracts: [],
      grants: [{ agency: 'HUD', amount: 150000, program: 'CDBG', description: 'Facility improvements', year: 2023, source: 'USASpending' }],
      total_public_investment: 450000,
      financial_health_signals: [],
    },
    
    scores: {
      overall_quality: Math.round(50 + Math.random() * 40),
      risk_score: Math.round(Math.random() * 30),
      opportunity_score: Math.round(50 + Math.random() * 40),
      accessibility_score: Math.round(60 + Math.random() * 30),
      sustainability_score: Math.round(40 + Math.random() * 40),
      confidence: 0.75 + Math.random() * 0.2,
    },
    
    context: {
      demographics: {
        population_1mi: Math.round(10000 + Math.random() * 20000),
        median_income_1mi: Math.round(50000 + Math.random() * 50000),
        median_age: Math.round(30 + Math.random() * 15),
        population_change_5yr: Math.round(-5 + Math.random() * 15 * 10) / 10,
        population_trend: Math.random() > 0.5 ? 'growing' : 'stable',
        age_distribution: {
          under_18: 0.22,
          age_18_34: 0.28,
          age_35_54: 0.30,
          age_55_plus: 0.20,
        },
      },
      competition: {
        similar_facilities_1mi: Math.round(Math.random() * 5),
        similar_facilities_5mi: Math.round(3 + Math.random() * 10),
        nearest_competitor: { name: 'Towson Sports Complex', distance_mi: 1.2 + Math.random() * 3 },
        market_saturation: Math.random() > 0.6 ? 'underserved' : 'adequate',
        competitive_advantages: [
          'Higher population density than competitors',
          'Recent facility improvements',
          'Accessible parking available',
        ],
      },
      environment: {
        flood_zone: 'X',
        wildfire_risk: 'low',
        air_quality_index: Math.round(30 + Math.random() * 40),
        superfund_sites_5mi: 0,
        environmental_risk_score: Math.round(Math.random() * 25),
        environmental_risk_level: 'low',
        risk_factors: [],
      },
    },
    
    predictions: {
      growth_trajectory: Math.random() > 0.5 ? 'growing' : 'stable',
      risk_trajectory: 'stable',
      demand_forecast: Math.random() > 0.4 ? 'increasing' : 'stable',
      anomalies: Math.random() > 0.7 ? [{
        type: 'underserved_market',
        description: 'High population area with limited similar facilities',
        severity: 'opportunity',
      }] : [],
    },
    
    narrative: {
      executive_summary: `${props.name || 'This facility'} is a well-maintained ${props.category || 'recreational'} facility in a growing suburban area. Strong compliance record and recent public investment indicate commitment to quality.`,
      key_findings: [
        'Compliant facility with no violations in 3+ years',
        'Located in area with positive population growth',
        'Good accessibility with available parking',
        'Serving a growing demographic base',
      ],
      recommendations: [
        'Consider expanded hours to meet growing demand',
        'Community partnerships could increase utilization',
        'Modern amenity additions could attract broader user base',
      ],
      comparable_context: 'Similar quality to nearby facilities but serves a less saturated market.',
    },
    
    enrichment_timestamp: new Date().toISOString(),
    enrichment_sources: ['Census ACS', 'EPA ECHO', 'USASpending', 'OpenStreetMap'],
  };
}
