import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MEECContract {
  id: string;
  contract_number: string | null;
  contract_name: string;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  categories: string[] | null;
  prime_contractors: string[] | null;
  estimated_value: number | null;
}

interface EducationSpending {
  id: string;
  fiscal_year: number;
  county: string;
  payee_name: string;
  total_payment: number;
  purpose: string | null;
}

interface EducationInstitution {
  id: string;
  institution_name: string;
  institution_type: string | null;
  county: string | null;
  city: string | null;
  meec_member: boolean | null;
  enrollment: number | null;
  annual_budget: number | null;
}

export const useMEECContracts = () => {
  return useQuery({
    queryKey: ['meec-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meec_contracts')
        .select('*')
        .order('estimated_value', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as MEECContract[];
    }
  });
};

export const useEducationSpending = (filters?: { county?: string; fiscalYear?: number }) => {
  return useQuery({
    queryKey: ['education-spending', filters],
    queryFn: async () => {
      let query = supabase
        .from('md_education_spending')
        .select('*')
        .order('total_payment', { ascending: false, nullsFirst: false })
        .limit(200);

      if (filters?.county && filters.county !== 'all') {
        query = query.eq('county', filters.county);
      }
      if (filters?.fiscalYear) {
        query = query.eq('fiscal_year', filters.fiscalYear);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EducationSpending[];
    }
  });
};

export const useEducationInstitutions = (type?: string) => {
  return useQuery({
    queryKey: ['education-institutions', type],
    queryFn: async () => {
      let query = supabase
        .from('md_education_institutions')
        .select('*')
        .order('annual_budget', { ascending: false, nullsFirst: false });

      if (type && type !== 'all') {
        query = query.eq('institution_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EducationInstitution[];
    }
  });
};

export const useEducationStats = () => {
  return useQuery({
    queryKey: ['education-stats'],
    queryFn: async () => {
      const [contracts, institutions, spending] = await Promise.all([
        supabase.from('meec_contracts').select('estimated_value'),
        supabase.from('md_education_institutions').select('annual_budget'),
        supabase.from('md_education_spending').select('total_payment')
      ]);

      return {
        meecValue: contracts.data?.reduce((sum, c) => sum + (Number(c.estimated_value) || 0), 0) || 0,
        institutionsBudget: institutions.data?.reduce((sum, i) => sum + (Number(i.annual_budget) || 0), 0) || 0,
        totalSpending: spending.data?.reduce((sum, s) => sum + (Number(s.total_payment) || 0), 0) || 0,
        institutionsCount: institutions.data?.length || 0
      };
    }
  });
};

export const useTopEducationVendors = (limit: number = 15) => {
  return useQuery({
    queryKey: ['top-education-vendors', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_education_spending')
        .select('payee_name, total_payment, county');

      if (error) throw error;

      // Aggregate by vendor
      const vendorMap = new Map<string, { name: string; total: number; districts: Set<string> }>();
      data?.forEach(record => {
        const existing = vendorMap.get(record.payee_name) || {
          name: record.payee_name,
          total: 0,
          districts: new Set<string>()
        };
        existing.total += Number(record.total_payment) || 0;
        existing.districts.add(record.county);
        vendorMap.set(record.payee_name, existing);
      });

      return Array.from(vendorMap.values())
        .map(v => ({ ...v, districtsCount: v.districts.size }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    }
  });
};
