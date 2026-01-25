// BASED DATA - Advanced Contract Classifier
// Extracts technical capabilities and clusters from contract data
import { supabase } from '@/integrations/supabase/client';

interface CapabilityClusters {
  cloud: string[];
  ai_ml: string[];
  security: string[];
  data: string[];
  devops: string[];
}

interface ClassificationResult {
  capabilities: string[];
  clusters: CapabilityClusters;
  technicalDepthScore: number;
  innovationIndicators: string[];
}

export class AdvancedClassifier {
  private static readonly TECH_KEYWORDS = [
    'cloud', 'aws', 'azure', 'kubernetes', 'docker',
    'ai', 'ml', 'machine learning', 'artificial intelligence',
    'cybersecurity', 'penetration testing', 'soc', 'siem',
    'data analytics', 'big data', 'hadoop', 'spark',
    'devops', 'cicd', 'jenkins', 'terraform',
    'blockchain', 'iot', 'edge computing', 'microservices'
  ];

  private static readonly INNOVATION_KEYWORDS = [
    'patent', 'novel', 'breakthrough', 'innovative', 
    'cutting-edge', 'first-of-kind', 'prototype', 'r&d'
  ];

  static async classifyByCapability(contractId: string): Promise<ClassificationResult | null> {
    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    
    if (!contract) return null;

    // Get related facts
    const { data: facts } = await supabase
      .from('core_facts')
      .select('*')
      .eq('source_record_id', contractId)
      .limit(100);
    
    // Combine text from contract and facts
    const textSources = [
      contract.description || '',
      contract.naics_description || '',
      contract.psc_description || '',
      ...(facts || []).map(f => JSON.stringify(f.fact_value))
    ];
    
    const combinedText = textSources.join(' ').toLowerCase();
    
    const capabilities = this.extractCapabilities(combinedText);
    const clusters = this.clusterCapabilities(capabilities);
    const technicalDepthScore = this.scoreDepth(capabilities);
    const innovationIndicators = this.findInnovation(combinedText);
    
    // Store classification
    await supabase.from('contract_classifications').upsert({
      contract_id: contractId,
      capabilities,
      primary_category: this.determinePrimaryCategory(clusters),
      confidence: technicalDepthScore / 100,
      classified_at: new Date().toISOString()
    }, { onConflict: 'contract_id' });
    
    return {
      capabilities,
      clusters,
      technicalDepthScore,
      innovationIndicators
    };
  }
  
  private static extractCapabilities(text: string): string[] {
    const capabilities = new Set<string>();
    
    this.TECH_KEYWORDS.forEach(keyword => {
      if (text.includes(keyword)) {
        capabilities.add(keyword);
      }
    });
    
    return Array.from(capabilities);
  }
  
  private static clusterCapabilities(capabilities: string[]): CapabilityClusters {
    const clusters: CapabilityClusters = {
      cloud: [],
      ai_ml: [],
      security: [],
      data: [],
      devops: []
    };
    
    capabilities.forEach(cap => {
      if (['aws', 'azure', 'cloud', 'kubernetes', 'docker', 'microservices'].some(k => cap.includes(k))) {
        clusters.cloud.push(cap);
      }
      if (['ai', 'ml', 'machine learning', 'artificial intelligence'].some(k => cap.includes(k))) {
        clusters.ai_ml.push(cap);
      }
      if (['security', 'penetration', 'soc', 'siem', 'cybersecurity'].some(k => cap.includes(k))) {
        clusters.security.push(cap);
      }
      if (['data', 'analytics', 'hadoop', 'spark', 'big data'].some(k => cap.includes(k))) {
        clusters.data.push(cap);
      }
      if (['devops', 'cicd', 'jenkins', 'terraform'].some(k => cap.includes(k))) {
        clusters.devops.push(cap);
      }
    });
    
    return clusters;
  }
  
  private static determinePrimaryCategory(clusters: CapabilityClusters): string {
    const counts = Object.entries(clusters)
      .map(([name, items]) => ({ name, count: items.length }))
      .sort((a, b) => b.count - a.count);
    
    return counts[0]?.count > 0 ? counts[0].name : 'general';
  }
  
  private static scoreDepth(capabilities: string[]): number {
    // Score based on diversity and depth of technical capabilities
    const baseScore = Math.min(capabilities.length * 12, 60);
    const diversityBonus = new Set(capabilities.map(c => c.split(' ')[0])).size * 8;
    return Math.min(baseScore + diversityBonus, 100);
  }
  
  private static findInnovation(text: string): string[] {
    const innovations: string[] = [];
    
    this.INNOVATION_KEYWORDS.forEach(keyword => {
      if (text.includes(keyword)) {
        // Extract context around the keyword
        const index = text.indexOf(keyword);
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + keyword.length + 50);
        innovations.push(text.slice(start, end).trim());
      }
    });
    
    return innovations.slice(0, 5);
  }
  
  static async classifyBatch(limit = 50): Promise<{ classified: number; errors: number }> {
    let classified = 0;
    let errors = 0;
    
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .is('psc_description', null)
      .limit(limit);
    
    for (const contract of contracts || []) {
      try {
        await this.classifyByCapability(contract.id);
        classified++;
      } catch (e) {
        errors++;
      }
    }
    
    return { classified, errors };
  }
}
