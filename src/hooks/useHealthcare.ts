import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClinicalTrial {
  id: string;
  nct_id: string;
  title: string;
  official_title: string | null;
  overall_status: string | null;
  phase: string | null;
  study_type: string | null;
  lead_sponsor_name: string | null;
  lead_sponsor_type: string | null;
  intervention_type: string | null;
  drug_names: string[] | null;
  conditions: string[] | null;
  enrollment: number | null;
  start_date: string | null;
  completion_date: string | null;
  location_states: string[] | null;
  url: string | null;
}

interface FDADrug {
  id: string;
  application_number: string | null;
  brand_name: string | null;
  generic_name: string | null;
  active_ingredients: string[] | null;
  sponsor_name: string | null;
  application_type: string | null;
  market_status: string | null;
  therapeutic_class: string | null;
  approval_date: string | null;
}

interface FDADevice {
  id: string;
  k_number: string | null;
  pma_number: string | null;
  device_name: string;
  device_class: string | null;
  product_code: string | null;
  applicant: string | null;
  decision: string | null;
  decision_date: string | null;
  medical_specialty: string | null;
}

export const useClinicalTrials = (filters?: { status?: string; phase?: string }) => {
  return useQuery({
    queryKey: ['clinical-trials', filters],
    queryFn: async () => {
      let query = supabase
        .from('clinical_trials')
        .select('*')
        .order('enrollment', { ascending: false, nullsFirst: false })
        .limit(100);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('overall_status', filters.status);
      }
      if (filters?.phase && filters.phase !== 'all') {
        query = query.eq('phase', filters.phase);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ClinicalTrial[];
    }
  });
};

export const useFDADrugs = () => {
  return useQuery({
    queryKey: ['fda-drugs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fda_drugs')
        .select('*')
        .order('approval_date', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as FDADrug[];
    }
  });
};

export const useFDADevices = () => {
  return useQuery({
    queryKey: ['fda-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fda_devices')
        .select('*')
        .order('decision_date', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as FDADevice[];
    }
  });
};

export const useHealthcareStats = () => {
  return useQuery({
    queryKey: ['healthcare-stats'],
    queryFn: async () => {
      const [trialsRes, drugsRes, devicesRes, recruitingRes] = await Promise.all([
        supabase.from('clinical_trials').select('id', { count: 'exact', head: true }),
        supabase.from('fda_drugs').select('id', { count: 'exact', head: true }),
        supabase.from('fda_devices').select('id', { count: 'exact', head: true }),
        supabase.from('clinical_trials').select('id', { count: 'exact', head: true }).eq('overall_status', 'Recruiting')
      ]);

      return {
        trialsCount: trialsRes.count || 0,
        drugsCount: drugsRes.count || 0,
        devicesCount: devicesRes.count || 0,
        recruitingCount: recruitingRes.count || 0
      };
    }
  });
};
