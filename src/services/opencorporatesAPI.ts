// BASED DATA - OpenCorporates API Integration
import { supabase } from '@/integrations/supabase/client';

export class OpenCorporatesAPI {
  private static BASE_URL = 'https://api.opencorporates.com/v0.4';
  
  static async enrichEntity(entityId: string): Promise<boolean> {
    try {
      const { data: entity } = await supabase
        .from('core_entities')
        .select('*')
        .eq('id', entityId)
        .single();
      
      if (!entity) return false;
      
      const response = await fetch(
        `${this.BASE_URL}/companies/search?q=${encodeURIComponent(entity.canonical_name)}`
      );
      
      if (!response.ok) return false;
      
      const data = await response.json();
      const company = data.results?.companies?.[0]?.company;
      
      if (!company) return false;
      
      // Create facts about corporate structure
      const facts = [];
      
      if (company.jurisdiction_code) {
        facts.push({
          entity_id: entityId,
          fact_value: { jurisdiction: company.jurisdiction_code },
          fact_type: 'jurisdiction',
          source_name: 'opencorporates_api',
          confidence: 0.95
        });
      }
      
      if (company.company_type) {
        facts.push({
          entity_id: entityId,
          fact_value: { company_type: company.company_type },
          fact_type: 'company_type',
          source_name: 'opencorporates_api',
          confidence: 0.95
        });
      }
      
      if (company.incorporation_date) {
        facts.push({
          entity_id: entityId,
          fact_value: { incorporation_date: company.incorporation_date },
          fact_type: 'incorporation_date',
          source_name: 'opencorporates_api',
          confidence: 0.95
        });
      }
      
      if (facts.length > 0) {
        await supabase.from('core_facts').insert(facts);
      }
      
      return true;
    } catch (error) {
      console.error(`OpenCorporates enrichment failed for ${entityId}:`, error);
      return false;
    }
  }
  
  static async searchCompanies(query: string, jurisdiction?: string) {
    try {
      let url = `${this.BASE_URL}/companies/search?q=${encodeURIComponent(query)}`;
      if (jurisdiction) {
        url += `&jurisdiction_code=${jurisdiction}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.results?.companies || [];
    } catch (error) {
      console.error('OpenCorporates search failed:', error);
      return [];
    }
  }
}
