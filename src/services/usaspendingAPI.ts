// BASED DATA - USAspending.gov API Integration
import { supabase } from '@/integrations/supabase/client';

export class USAspendingAPI {
  private static BASE_URL = 'https://api.usaspending.gov/api/v2';
  
  static async enrichContract(contractId: string): Promise<boolean> {
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      
      if (!contract || !contract.award_id) return false;
      
      const response = await fetch(
        `${this.BASE_URL}/awards/${contract.award_id}/`
      );
      
      if (!response.ok) return false;
      
      const data = await response.json();
      
      // Extract additional facts
      if (data.description && contract.recipient_entity_id) {
        // Check if fact already exists
        const { data: existing } = await supabase
          .from('core_facts')
          .select('id')
          .eq('entity_id', contract.recipient_entity_id)
          .eq('fact_type', 'contract_description')
          .eq('source_name', 'usaspending_api')
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from('core_facts').insert({
            entity_id: contract.recipient_entity_id,
            fact_value: {
              text: data.description,
              source: 'usaspending_api',
              award_id: contract.award_id
            },
            fact_type: 'contract_description',
            source_name: 'usaspending_api',
            confidence: 0.95
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`USAspending enrichment failed for ${contractId}:`, error);
      return false;
    }
  }
  
  static async searchAwards(query: string, limit = 10) {
    try {
      const response = await fetch(`${this.BASE_URL}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            keywords: [query]
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency'],
          limit
        })
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('USAspending search failed:', error);
      return [];
    }
  }
  
  static async getAgencySpending(agencyCode: string) {
    try {
      const response = await fetch(`${this.BASE_URL}/agency/${agencyCode}/awards/`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Agency spending fetch failed:', error);
      return null;
    }
  }
}
