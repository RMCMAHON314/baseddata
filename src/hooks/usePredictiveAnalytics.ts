// BASED DATA - Predictive Analytics Hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SeasonalPattern {
  month: number;
  monthName: string;
  avgContracts: number;
  avgValue: number;
  peakAgencies: string[];
}

export interface AgencyCycle {
  agency: string;
  avgCycleMonths: number;
  peakMonths: number[];
  lastAward: string | null;
  predictedNext: string | null;
  contractCount: number;
}

export interface PredictedOpportunity {
  agency: string;
  predictedDate: string;
  confidence: number;
  basedOn: string;
  avgValue: number;
}

export function usePredictiveAnalytics() {
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);
  const [agencyCycles, setAgencyCycles] = useState<AgencyCycle[]>([]);
  const [predictions, setPredictions] = useState<PredictedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      // Get contracts with dates
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('award_date, award_amount, awarding_agency')
        .not('award_date', 'is', null)
        .order('award_date', { ascending: true });

      if (contractError) throw contractError;

      // Calculate seasonal patterns
      const monthlyData: Record<number, { count: number; value: number; agencies: Record<string, number> }> = {};
      const agencyData: Record<string, { dates: Date[]; values: number[] }> = {};

      (contracts || []).forEach(contract => {
        if (!contract.award_date) return;
        
        const date = new Date(contract.award_date);
        const month = date.getMonth();
        const agency = contract.awarding_agency || 'Unknown';
        
        // Monthly aggregation
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, value: 0, agencies: {} };
        }
        monthlyData[month].count++;
        monthlyData[month].value += contract.award_amount || 0;
        monthlyData[month].agencies[agency] = (monthlyData[month].agencies[agency] || 0) + 1;
        
        // Agency aggregation
        if (!agencyData[agency]) {
          agencyData[agency] = { dates: [], values: [] };
        }
        agencyData[agency].dates.push(date);
        agencyData[agency].values.push(contract.award_amount || 0);
      });

      // Build seasonal patterns
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const years = new Set((contracts || []).map(c => new Date(c.award_date!).getFullYear())).size || 1;
      
      const patterns: SeasonalPattern[] = monthNames.map((name, month) => {
        const data = monthlyData[month] || { count: 0, value: 0, agencies: {} };
        const peakAgencies = Object.entries(data.agencies)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([agency]) => agency);
        
        return {
          month,
          monthName: name,
          avgContracts: Math.round(data.count / years),
          avgValue: Math.round(data.value / years),
          peakAgencies
        };
      });
      setSeasonalPatterns(patterns);

      // Calculate agency cycles
      const cycles: AgencyCycle[] = Object.entries(agencyData)
        .filter(([_, data]) => data.dates.length >= 3)
        .map(([agency, data]) => {
          const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
          
          // Calculate average cycle in months
          let totalMonths = 0;
          for (let i = 1; i < sortedDates.length; i++) {
            const diff = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24 * 30);
            totalMonths += diff;
          }
          const avgCycleMonths = totalMonths / (sortedDates.length - 1);
          
          // Find peak months
          const monthCounts: Record<number, number> = {};
          sortedDates.forEach(d => {
            monthCounts[d.getMonth()] = (monthCounts[d.getMonth()] || 0) + 1;
          });
          const peakMonths = Object.entries(monthCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([m]) => parseInt(m));
          
          // Last award and predicted next
          const lastAward = sortedDates[sortedDates.length - 1];
          const predictedNext = new Date(lastAward);
          predictedNext.setMonth(predictedNext.getMonth() + Math.round(avgCycleMonths));
          
          return {
            agency,
            avgCycleMonths: Math.round(avgCycleMonths * 10) / 10,
            peakMonths,
            lastAward: lastAward.toISOString().split('T')[0],
            predictedNext: predictedNext.toISOString().split('T')[0],
            contractCount: data.dates.length
          };
        })
        .sort((a, b) => b.contractCount - a.contractCount)
        .slice(0, 20);
      setAgencyCycles(cycles);

      // Generate predictions
      const now = new Date();
      const threeMonthsOut = new Date();
      threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
      
      const upcomingPredictions: PredictedOpportunity[] = cycles
        .filter(c => {
          const predicted = new Date(c.predictedNext!);
          return predicted >= now && predicted <= threeMonthsOut;
        })
        .map(c => {
          const avgValue = agencyData[c.agency].values.reduce((a, b) => a + b, 0) / agencyData[c.agency].values.length;
          return {
            agency: c.agency,
            predictedDate: c.predictedNext!,
            confidence: Math.min(0.9, 0.4 + (c.contractCount * 0.02)),
            basedOn: `${c.contractCount} historical contracts`,
            avgValue
          };
        })
        .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
      setPredictions(upcomingPredictions);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  return {
    seasonalPatterns,
    agencyCycles,
    predictions,
    loading,
    error,
    refresh: loadAnalytics
  };
}
