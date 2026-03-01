// BASED DATA - Geospatial data hooks for Market Explorer map
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GeoEntity {
  id: string;
  canonical_name: string;
  entity_type: string;
  state: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  total_contract_value: number | null;
  contract_count: number | null;
}

export interface GeoOpportunity {
  id: string;
  title: string;
  department: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  pop_state: string | null;
  pop_city: string | null;
  naics_code: string | null;
  set_aside: string | null;
  award_amount: number | null;
}

export interface StateSpending {
  state: string;
  total_value: number;
  contract_count: number;
  entity_count: number;
  top_agencies: { name: string; value: number }[];
  top_entities: { name: string; value: number; id: string }[];
}

export function useGeoEntities(filters?: { state?: string; entityType?: string; agency?: string; naics?: string }) {
  return useQuery({
    queryKey: ['geo-entities', filters],
    queryFn: async () => {
      let query = supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state, city, latitude, longitude, total_contract_value, contract_count')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('total_contract_value', { ascending: false, nullsFirst: false })
        .limit(1000);

      if (filters?.state) query = query.eq('state', filters.state);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GeoEntity[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStateSpending() {
  return useQuery({
    queryKey: ['state-spending-geo'],
    queryFn: async () => {
      // Get contract data grouped by state
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('pop_state, award_amount, awarding_agency, recipient_name, recipient_entity_id')
        .not('pop_state', 'is', null)
        .limit(5000);

      if (error) throw error;

      const stateMap = new Map<string, {
        total_value: number;
        contract_count: number;
        entities: Set<string>;
        agencies: Map<string, number>;
        entityNames: Map<string, { value: number; id: string }>;
      }>();

      for (const c of contracts || []) {
        const s = c.pop_state;
        if (!s) continue;
        const existing = stateMap.get(s) || {
          total_value: 0, contract_count: 0,
          entities: new Set<string>(),
          agencies: new Map<string, number>(),
          entityNames: new Map<string, { value: number; id: string }>(),
        };
        existing.total_value += Number(c.award_amount) || 0;
        existing.contract_count += 1;
        if (c.recipient_entity_id) existing.entities.add(c.recipient_entity_id);
        if (c.awarding_agency) {
          existing.agencies.set(c.awarding_agency, (existing.agencies.get(c.awarding_agency) || 0) + (Number(c.award_amount) || 0));
        }
        if (c.recipient_name) {
          const prev = existing.entityNames.get(c.recipient_name) || { value: 0, id: c.recipient_entity_id || '' };
          prev.value += Number(c.award_amount) || 0;
          existing.entityNames.set(c.recipient_name, prev);
        }
        stateMap.set(s, existing);
      }

      const result: StateSpending[] = [];
      for (const [state, data] of stateMap) {
        result.push({
          state,
          total_value: data.total_value,
          contract_count: data.contract_count,
          entity_count: data.entities.size,
          top_agencies: [...data.agencies.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value })),
          top_entities: [...data.entityNames.entries()]
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, 5)
            .map(([name, { value, id }]) => ({ name, value, id })),
        });
      }

      return result.sort((a, b) => b.total_value - a.total_value);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useGeoOpportunities() {
  return useQuery({
    queryKey: ['geo-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, department, posted_date, response_deadline, pop_state, pop_city, naics_code, set_aside, award_amount')
        .not('pop_state', 'is', null)
        .order('response_deadline', { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data || []) as GeoOpportunity[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// State center coordinates for choropleth bubbles
export const STATE_CENTERS: Record<string, [number, number]> = {
  'AL': [-86.9, 32.8], 'AK': [-153.4, 64.2], 'AZ': [-111.1, 34.0],
  'AR': [-92.2, 34.8], 'CA': [-119.4, 36.8], 'CO': [-105.8, 39.0],
  'CT': [-72.8, 41.6], 'DE': [-75.5, 39.0], 'FL': [-81.5, 27.7],
  'GA': [-83.5, 32.2], 'HI': [-155.5, 19.9], 'ID': [-114.7, 44.1],
  'IL': [-89.4, 40.6], 'IN': [-86.1, 40.3], 'IA': [-93.1, 42.0],
  'KS': [-98.5, 38.5], 'KY': [-84.3, 37.8], 'LA': [-91.2, 30.5],
  'ME': [-69.4, 45.3], 'MD': [-76.6, 39.0], 'MA': [-71.5, 42.4],
  'MI': [-84.5, 44.3], 'MN': [-94.6, 46.7], 'MS': [-89.7, 32.3],
  'MO': [-91.8, 38.6], 'MT': [-110.4, 46.9], 'NE': [-99.9, 41.5],
  'NV': [-116.4, 38.8], 'NH': [-71.6, 43.2], 'NJ': [-74.4, 40.1],
  'NM': [-105.9, 34.5], 'NY': [-74.9, 43.3], 'NC': [-79.0, 35.5],
  'ND': [-101.0, 47.5], 'OH': [-82.8, 40.4], 'OK': [-97.1, 35.6],
  'OR': [-120.6, 43.8], 'PA': [-77.5, 41.2], 'RI': [-71.5, 41.7],
  'SC': [-80.9, 34.0], 'SD': [-99.4, 44.3], 'TN': [-86.6, 35.5],
  'TX': [-99.9, 31.2], 'UT': [-111.1, 39.3], 'VT': [-72.6, 44.6],
  'VA': [-78.7, 37.4], 'WA': [-120.7, 47.8], 'WV': [-80.5, 38.9],
  'WI': [-89.4, 43.8], 'WY': [-107.3, 43.1], 'DC': [-77.0, 38.9],
};
