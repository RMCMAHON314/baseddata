// BASED DATA - Win Rate Predictor
// ML-style prediction of opportunity win probability
import { supabase } from '@/integrations/supabase/client';

interface PredictionFeatures {
  naicsMatch: number;
  pastPerformance: number;
  healthFactor: number;
  agencyRelationship: number;
  competitorDensity: number;
  setAsideMatch: number;
}

interface WinPrediction {
  probability: number;
  features: PredictionFeatures;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export class WinRatePredictor {
  private static readonly WEIGHTS = {
    naicsMatch: 0.25,
    pastPerformance: 0.30,
    healthFactor: 0.15,
    agencyRelationship: 0.15,
    competitorDensity: 0.08,
    setAsideMatch: 0.07
  };

  static async predictWinRate(entityId: string, opportunityId?: string): Promise<WinPrediction> {
    const { data: entity } = await supabase
      .from('core_entities')
      .select('*')
      .eq('id', entityId)
      .single();
    
    if (!entity) {
      return {
        probability: 0,
        features: this.emptyFeatures(),
        confidence: 'low',
        factors: ['Entity not found']
      };
    }
    
    const features = await this.extractFeatures(entity, opportunityId);
    const probability = this.calculateProbability(features);
    const confidence = this.assessConfidence(features);
    const factors = this.explainPrediction(features);
    
    return {
      probability,
      features,
      confidence,
      factors
    };
  }
  
  private static emptyFeatures(): PredictionFeatures {
    return {
      naicsMatch: 0,
      pastPerformance: 0,
      healthFactor: 0,
      agencyRelationship: 0,
      competitorDensity: 0,
      setAsideMatch: 0
    };
  }
  
  private static async extractFeatures(entity: any, opportunityId?: string): Promise<PredictionFeatures> {
    // Get health score
    const { data: healthScore } = await supabase
      .from('entity_health_scores')
      .select('*')
      .eq('entity_id', entity.id)
      .maybeSingle();
    
    const healthFactor = (healthScore?.overall_score || 50) / 100;
    
    // Get past contract performance
    const { data: contracts } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .eq('recipient_entity_id', entity.id)
      .limit(50);
    
    const pastPerformance = Math.min((contracts?.length || 0) / 20, 1);
    
    // Get unique agencies worked with
    const uniqueAgencies = new Set(contracts?.map(c => c.awarding_agency) || []);
    const agencyRelationship = Math.min(uniqueAgencies.size / 10, 1);
    
    // NAICS match - simulate based on entity's NAICS codes
    const naicsMatch = entity.naics_codes?.length > 0 ? 0.8 : 0.3;
    
    // Set-aside match based on business types
    const setAsideMatch = this.calculateSetAsideMatch(entity.business_types);
    
    // Competitor density (inverse - less competitors = higher score)
    const competitorDensity = 0.6; // Simulated average
    
    return {
      naicsMatch,
      pastPerformance,
      healthFactor,
      agencyRelationship,
      competitorDensity,
      setAsideMatch
    };
  }
  
  private static calculateSetAsideMatch(businessTypes: string[] | null): number {
    if (!businessTypes || businessTypes.length === 0) return 0.3;
    
    const valuableTypes = ['small_business', '8a', 'hubzone', 'sdvosb', 'wosb'];
    const matches = businessTypes.filter(t => 
      valuableTypes.some(vt => t.toLowerCase().includes(vt))
    );
    
    return Math.min(0.3 + (matches.length * 0.15), 1);
  }
  
  private static calculateProbability(features: PredictionFeatures): number {
    const probability = 
      features.naicsMatch * this.WEIGHTS.naicsMatch +
      features.pastPerformance * this.WEIGHTS.pastPerformance +
      features.healthFactor * this.WEIGHTS.healthFactor +
      features.agencyRelationship * this.WEIGHTS.agencyRelationship +
      features.competitorDensity * this.WEIGHTS.competitorDensity +
      features.setAsideMatch * this.WEIGHTS.setAsideMatch;
    
    return Math.round(probability * 100);
  }
  
  private static assessConfidence(features: PredictionFeatures): 'high' | 'medium' | 'low' {
    const dataQuality = (features.pastPerformance + features.agencyRelationship) / 2;
    
    if (dataQuality > 0.7) return 'high';
    if (dataQuality > 0.4) return 'medium';
    return 'low';
  }
  
  private static explainPrediction(features: PredictionFeatures): string[] {
    const factors: string[] = [];
    
    if (features.pastPerformance > 0.7) {
      factors.push('Strong past performance history');
    } else if (features.pastPerformance < 0.3) {
      factors.push('Limited contract history');
    }
    
    if (features.agencyRelationship > 0.7) {
      factors.push('Established agency relationships');
    }
    
    if (features.healthFactor > 0.7) {
      factors.push('High entity health score');
    } else if (features.healthFactor < 0.4) {
      factors.push('Health score needs improvement');
    }
    
    if (features.setAsideMatch > 0.5) {
      factors.push('Favorable set-aside eligibility');
    }
    
    if (features.naicsMatch > 0.7) {
      factors.push('Strong NAICS alignment');
    }
    
    return factors;
  }
  
  static async predictBatch(entityIds: string[]): Promise<Map<string, WinPrediction>> {
    const predictions = new Map<string, WinPrediction>();
    
    for (const entityId of entityIds) {
      const prediction = await this.predictWinRate(entityId);
      predictions.set(entityId, prediction);
    }
    
    return predictions;
  }
}
