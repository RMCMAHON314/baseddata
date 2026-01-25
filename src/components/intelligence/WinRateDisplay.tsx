// Win Rate Display Component - Shows predicted win probability for opportunities
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface WinRateDisplayProps {
  entityId: string;
  opportunityId?: string;
  compact?: boolean;
}

interface WinPrediction {
  probability: number;
  naicsMatch: number;
  pastPerformance: number;
  healthFactor: number;
  agencyRelationship: number;
}

export function WinRateDisplay({ entityId, opportunityId, compact = false }: WinRateDisplayProps) {
  const [prediction, setPrediction] = useState<WinPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrediction();
  }, [entityId, opportunityId]);

  async function loadPrediction() {
    setLoading(true);
    try {
      // Get entity data
      const { data: entity } = await supabase
        .from('core_entities')
        .select('naics_codes, opportunity_score')
        .eq('id', entityId)
        .single();

      // Get health score
      const { data: healthScore } = await supabase
        .from('entity_health_scores')
        .select('overall_score')
        .eq('entity_id', entityId)
        .maybeSingle();

      // Get past contracts count at target agency (if opportunity specified)
      let pastPerformance = 0;
      if (opportunityId) {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('department')
          .eq('id', opportunityId)
          .single();

        if (opp?.department) {
          const { count } = await supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_entity_id', entityId)
            .eq('awarding_agency', opp.department);
          pastPerformance = Math.min((count || 0) / 10, 1);
        }
      } else {
        // General performance
        const { count } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_entity_id', entityId);
        pastPerformance = Math.min((count || 0) / 20, 1);
      }

      const healthFactor = (healthScore?.overall_score || entity?.opportunity_score || 50) / 100;
      const naicsMatch = entity?.naics_codes?.length > 0 ? 0.8 : 0.4;
      const agencyRelationship = pastPerformance > 0 ? 1 : 0;

      // Weighted calculation
      const probability = Math.round(
        naicsMatch * 0.30 +
        pastPerformance * 0.35 +
        healthFactor * 0.20 +
        agencyRelationship * 0.15
      ) * 100;

      setPrediction({
        probability: Math.min(probability, 95),
        naicsMatch: naicsMatch * 100,
        pastPerformance: pastPerformance * 100,
        healthFactor: healthFactor * 100,
        agencyRelationship: agencyRelationship * 100
      });
    } catch (error) {
      console.error('Error loading prediction:', error);
    } finally {
      setLoading(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500/20 border-green-500/30';
    if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (loading) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getScoreBg(prediction.probability)}`}>
        <Target className={`h-4 w-4 ${getScoreColor(prediction.probability)}`} />
        <span className={`font-bold ${getScoreColor(prediction.probability)}`}>
          {prediction.probability}%
        </span>
        <span className="text-xs text-muted-foreground">Win Rate</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Win Rate Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className={`text-5xl font-black ${getScoreColor(prediction.probability)}`}>
            {prediction.probability}%
          </div>
          <Badge variant="outline" className={getScoreBg(prediction.probability)}>
            {prediction.probability >= 70 ? 'Strong Candidate' : 
             prediction.probability >= 40 ? 'Moderate Chance' : 'Low Probability'}
          </Badge>
        </motion.div>

        {/* Factor Breakdown */}
        <div className="space-y-3 pt-4">
          <FactorRow 
            label="NAICS Match" 
            value={prediction.naicsMatch} 
            weight="30%"
          />
          <FactorRow 
            label="Past Performance" 
            value={prediction.pastPerformance} 
            weight="35%"
          />
          <FactorRow 
            label="Health Score" 
            value={prediction.healthFactor} 
            weight="20%"
          />
          <FactorRow 
            label="Agency Relationship" 
            value={prediction.agencyRelationship} 
            weight="15%"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FactorRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{weight}</span>
          <span className="font-medium">{Math.round(value)}%</span>
        </div>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
