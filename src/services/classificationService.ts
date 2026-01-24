// BASED DATA - Contract Classification Service
import { supabase } from '@/integrations/supabase/client';

// Category definitions with keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'IT Services': ['software', 'computer', 'technology', 'data', 'cyber', 'network', 'cloud', 'digital', 'system', 'IT', 'information technology', 'programming', 'database', 'web', 'application'],
  'Healthcare': ['health', 'medical', 'hospital', 'clinical', 'pharmaceutical', 'patient', 'care', 'treatment', 'diagnostic', 'biomedical', 'nursing'],
  'Construction': ['construction', 'building', 'infrastructure', 'renovation', 'maintenance', 'facility', 'engineering', 'architectural', 'repair', 'HVAC'],
  'Professional Services': ['consulting', 'advisory', 'management', 'analysis', 'support', 'training', 'professional', 'administrative', 'technical assistance'],
  'Manufacturing': ['manufacturing', 'production', 'equipment', 'machinery', 'parts', 'supplies', 'materials', 'fabrication', 'assembly'],
  'Transportation': ['transportation', 'logistics', 'vehicle', 'shipping', 'freight', 'aircraft', 'automotive', 'fleet', 'delivery'],
  'Defense': ['defense', 'military', 'weapon', 'tactical', 'combat', 'security', 'intelligence', 'surveillance', 'ammunition'],
  'Research': ['research', 'development', 'R&D', 'scientific', 'laboratory', 'study', 'analysis', 'investigation', 'experiment'],
  'Education': ['education', 'training', 'learning', 'curriculum', 'instruction', 'academic', 'school', 'university', 'teaching'],
  'Environmental': ['environmental', 'waste', 'remediation', 'cleanup', 'pollution', 'conservation', 'sustainability', 'green', 'ecology']
};

// Capability extraction patterns
const CAPABILITY_PATTERNS: Record<string, RegExp> = {
  'Cloud Computing': /cloud|aws|azure|gcp|saas|paas|iaas/i,
  'Cybersecurity': /cyber|security|infosec|vulnerability|threat|encryption/i,
  'Data Analytics': /analytics|data analysis|business intelligence|reporting|dashboard/i,
  'AI/ML': /artificial intelligence|machine learning|ai|ml|neural|deep learning/i,
  'Project Management': /project management|program management|pmp|agile|scrum/i,
  'Software Development': /software development|programming|coding|application development/i,
  'Systems Integration': /integration|interoperability|api|middleware/i,
  'Technical Support': /support|helpdesk|maintenance|troubleshooting/i,
  'Training & Education': /training|education|curriculum|instruction|certification/i,
  'Quality Assurance': /quality|qa|testing|validation|verification/i
};

export interface ClassificationResult {
  primaryCategory: string;
  secondaryCategories: string[];
  capabilities: string[];
  confidence: number;
}

export function classifyContract(description: string, naicsCode?: string, pscCode?: string): ClassificationResult {
  const text = (description || '').toLowerCase();
  const scores: Record<string, number> = {};
  
  // Score each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }
  
  // NAICS code-based category boost
  if (naicsCode) {
    const prefix = naicsCode.substring(0, 2);
    const naicsCategories: Record<string, string> = {
      '23': 'Construction',
      '31': 'Manufacturing',
      '32': 'Manufacturing',
      '33': 'Manufacturing',
      '48': 'Transportation',
      '49': 'Transportation',
      '51': 'IT Services',
      '54': 'Professional Services',
      '56': 'Professional Services',
      '62': 'Healthcare',
      '61': 'Education'
    };
    if (naicsCategories[prefix]) {
      scores[naicsCategories[prefix]] = (scores[naicsCategories[prefix]] || 0) + 3;
    }
  }
  
  // Sort by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryCategory = sorted[0]?.[0] || 'Professional Services';
  const secondaryCategories = sorted.slice(1, 4).map(([cat]) => cat);
  
  // Extract capabilities
  const capabilities: string[] = [];
  for (const [capability, pattern] of Object.entries(CAPABILITY_PATTERNS)) {
    if (pattern.test(text)) {
      capabilities.push(capability);
    }
  }
  
  // Calculate confidence
  const maxScore = sorted[0]?.[1] || 0;
  const confidence = Math.min(0.95, 0.3 + (maxScore * 0.1) + (capabilities.length * 0.05));
  
  return {
    primaryCategory,
    secondaryCategories,
    capabilities,
    confidence: Math.round(confidence * 100) / 100
  };
}

export async function classifyAllContracts(batchSize = 100): Promise<{ classified: number; errors: number }> {
  let classified = 0;
  let errors = 0;
  let offset = 0;
  
  while (true) {
    // Get contracts that may not have classifications
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, description, naics_code, psc_code')
      .range(offset, offset + batchSize - 1);
    
    if (error || !contracts?.length) break;
    
    // Classify each contract
    const classifications = contracts.map(contract => {
      const result = classifyContract(contract.description || '', contract.naics_code, contract.psc_code);
      return {
        contract_id: contract.id,
        primary_category: result.primaryCategory,
        secondary_categories: result.secondaryCategories,
        capabilities: result.capabilities,
        confidence: result.confidence
      };
    });
    
    // Insert classifications
    const { error: insertError } = await supabase
      .from('contract_classifications')
      .upsert(classifications, { onConflict: 'contract_id' });
    
    if (insertError) {
      errors += classifications.length;
      console.error('Classification insert error:', insertError);
    } else {
      classified += classifications.length;
    }
    
    if (contracts.length < batchSize) break;
    offset += batchSize;
  }
  
  return { classified, errors };
}

export async function getContractClassification(contractId: string): Promise<ClassificationResult | null> {
  const { data } = await supabase
    .from('contract_classifications')
    .select('*')
    .eq('contract_id', contractId)
    .maybeSingle();
  
  if (!data) return null;
  
  return {
    primaryCategory: data.primary_category,
    secondaryCategories: data.secondary_categories || [],
    capabilities: data.capabilities || [],
    confidence: data.confidence || 0.5
  };
}

export async function getCategoryDistribution(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('contract_classifications')
    .select('primary_category');
  
  const distribution: Record<string, number> = {};
  (data || []).forEach(row => {
    distribution[row.primary_category] = (distribution[row.primary_category] || 0) + 1;
  });
  
  return distribution;
}
