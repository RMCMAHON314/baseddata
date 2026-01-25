// BASED DATA - API Discovery Bot
// Autonomous discovery and integration of data sources
import { supabase } from '@/integrations/supabase/client';

interface APICandidate {
  name: string;
  url: string;
  category: string;
  relevanceScore: number;
  enrichmentValue: number;
  costEstimate: number;
  dataTypes: string[];
}

export class APIDiscoveryBot {
  // Known high-value government and business APIs
  private static readonly KNOWN_APIS: APICandidate[] = [
    {
      name: 'SEC EDGAR',
      url: 'https://www.sec.gov/cgi-bin/browse-edgar',
      category: 'corporate',
      relevanceScore: 0.95,
      enrichmentValue: 0.9,
      costEstimate: 0,
      dataTypes: ['filings', 'ownership', 'financials']
    },
    {
      name: 'Federal Procurement Data System',
      url: 'https://www.fpds.gov/fpdsng_cms/index.php/en/',
      category: 'contracts',
      relevanceScore: 0.98,
      enrichmentValue: 0.95,
      costEstimate: 0,
      dataTypes: ['contracts', 'vendors', 'agencies']
    },
    {
      name: 'System for Award Management',
      url: 'https://sam.gov/api/',
      category: 'registrations',
      relevanceScore: 0.97,
      enrichmentValue: 0.9,
      costEstimate: 0,
      dataTypes: ['vendors', 'exclusions', 'opportunities']
    },
    {
      name: 'Census Bureau APIs',
      url: 'https://api.census.gov/data',
      category: 'demographics',
      relevanceScore: 0.75,
      enrichmentValue: 0.7,
      costEstimate: 0,
      dataTypes: ['population', 'business', 'economic']
    },
    {
      name: 'BLS Public Data API',
      url: 'https://api.bls.gov/publicAPI/v2',
      category: 'labor',
      relevanceScore: 0.70,
      enrichmentValue: 0.65,
      costEstimate: 0,
      dataTypes: ['employment', 'wages', 'industries']
    },
    {
      name: 'EPA Envirofacts',
      url: 'https://enviro.epa.gov/enviro/',
      category: 'environmental',
      relevanceScore: 0.65,
      enrichmentValue: 0.6,
      costEstimate: 0,
      dataTypes: ['compliance', 'permits', 'violations']
    },
    {
      name: 'FDA OpenFDA',
      url: 'https://open.fda.gov/apis/',
      category: 'healthcare',
      relevanceScore: 0.70,
      enrichmentValue: 0.65,
      costEstimate: 0,
      dataTypes: ['drugs', 'devices', 'recalls']
    },
    {
      name: 'OSHA Data & Statistics',
      url: 'https://www.osha.gov/data',
      category: 'safety',
      relevanceScore: 0.60,
      enrichmentValue: 0.55,
      costEstimate: 0,
      dataTypes: ['inspections', 'violations', 'injuries']
    }
  ];

  static async discoverAPIs(): Promise<APICandidate[]> {
    // Score and rank known APIs
    const scored = this.KNOWN_APIS.map(api => ({
      ...api,
      relevanceScore: this.scoreRelevance(api),
      enrichmentValue: this.estimateEnrichment(api)
    }));
    
    return scored
      .filter(a => a.relevanceScore > 0.5)
      .sort((a, b) => b.enrichmentValue - a.enrichmentValue);
  }
  
  private static scoreRelevance(api: APICandidate): number {
    const priorityCategories = ['contracts', 'registrations', 'corporate'];
    const categoryBonus = priorityCategories.includes(api.category) ? 0.2 : 0;
    
    const dataTypeBonus = api.dataTypes.length * 0.05;
    
    return Math.min(api.relevanceScore + categoryBonus + dataTypeBonus, 1);
  }
  
  private static estimateEnrichment(api: APICandidate): number {
    // Higher value for APIs that complement existing data
    const complementaryBonus = api.category === 'contracts' ? 0.1 : 0;
    return Math.min(api.enrichmentValue + complementaryBonus, 1);
  }
  
  static async checkAPIHealth(api: APICandidate): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await fetch(api.url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: -1 };
    }
  }
  
  static async autoIntegrate(api: APICandidate): Promise<boolean> {
    try {
      // Check if already integrated
      const { data: existing } = await supabase
        .from('api_sources')
        .select('id')
        .eq('name', api.name)
        .maybeSingle();
      
      if (existing) {
        console.log(`API already integrated: ${api.name}`);
        return true;
      }
      
      // Insert new API source
      await supabase.from('api_sources').insert({
        name: api.name,
        base_url: api.url,
        slug: api.name.toLowerCase().replace(/\s+/g, '_'),
        categories: [api.category],
        keywords: api.dataTypes,
        priority: Math.round(api.enrichmentValue * 100),
        status: 'active',
        health_status: 'unknown'
      });
      
      console.log(`✅ Auto-integrated: ${api.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to integrate ${api.name}:`, error);
      return false;
    }
  }
  
  static async runDiscoveryCycle(): Promise<{ discovered: number; integrated: number }> {
    console.log('🔍 Running API discovery cycle...');
    
    const apis = await this.discoverAPIs();
    let integrated = 0;
    
    // Auto-integrate high-value APIs
    for (const api of apis.filter(a => a.enrichmentValue > 0.8)) {
      const health = await this.checkAPIHealth(api);
      if (health.healthy) {
        const success = await this.autoIntegrate(api);
        if (success) integrated++;
      }
    }
    
    console.log(`✅ Discovery complete: ${apis.length} found, ${integrated} integrated`);
    
    return { discovered: apis.length, integrated };
  }
  
  static getRecommendations(): APICandidate[] {
    return this.KNOWN_APIS
      .filter(api => api.enrichmentValue > 0.7)
      .sort((a, b) => b.enrichmentValue - a.enrichmentValue)
      .slice(0, 5);
  }
}
