// 🔥 BASED DATA ENGINE v3.5 - ULTIMATE NUCLEAR CORE 🔥
// The most powerful dataset generation engine - ZERO AI CREDITS
// Extended APIs • Advanced NLP • Deep ML • Adaptive Learning • Real-time Data
// PhD-level engineering with blazing fast performance

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// PART 1: GOVERNMENT APIs - FREE, UNLIMITED, AUTHORITATIVE
// ============================================================================

const API_ENDPOINTS = {
  USA_SPENDING: 'https://api.usaspending.gov/api/v2',
  SEC_EDGAR: 'https://data.sec.gov',
  DATA_GOV: 'https://api.data.gov',
  CENSUS: 'https://api.census.gov/data',
  BLS: 'https://api.bls.gov/publicAPI/v2',
  FRED: 'https://api.stlouisfed.org/fred',
  EPA: 'https://data.epa.gov/efservice',
  FEC: 'https://api.open.fec.gov/v1',
  GSA: 'https://api.gsa.gov',
  TREASURY: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service',
  USPTO: 'https://api.patentsview.org/patents/query',
  NIH: 'https://api.reporter.nih.gov/v2',
  NASA: 'https://data.nasa.gov/resource',
  NOAA: 'https://www.ncdc.noaa.gov/cdo-web/api/v2',
  FDA: 'https://api.fda.gov',
  CMS: 'https://data.cms.gov/provider-data/api/1',
  WORLD_BANK: 'https://api.worldbank.org/v2',
  OECD: 'https://stats.oecd.org/SDMX-JSON/data',
};

interface USASpendingContract {
  recipient_name: string;
  total_obligation: number;
  awarding_agency_name: string;
  naics_code: string;
  description?: string;
  place_of_performance_state?: string;
  period_of_performance_start_date?: string;
  period_of_performance_current_end_date?: string;
}

interface SECCompany {
  name: string;
  ticker?: string;
  cik: string;
  filings?: any[];
  sic_code?: string;
}

interface TreasuryData {
  record_date: string;
  debt_held_public: number;
  intragovernmental_holdings: number;
  total_public_debt: number;
}

interface PatentData {
  patent_number: string;
  patent_title: string;
  assignee_organization: string;
  patent_date: string;
  patent_abstract?: string;
}

interface NIHGrant {
  project_title: string;
  organization_name: string;
  award_amount: number;
  fiscal_year: number;
  pi_names: string[];
}

class ExtendedGovernmentAPIs {
  private userAgent = 'BasedData/3.5 (contact@baseddata.io)';
  
  // USASpending.gov - Federal contracts, grants, loans with enhanced filtering
  async getFederalContracts(options: {
    keywords?: string[];
    naicsCode?: string;
    state?: string;
    agency?: string;
    limit?: number;
    minValue?: number;
    maxValue?: number;
    timeRange?: { start: string; end: string };
  }): Promise<USASpendingContract[]> {
    try {
      const { keywords = [], naicsCode, state, agency, limit = 100, minValue, maxValue, timeRange } = options;
      
      const filters: any = {
        time_period: [{
          start_date: timeRange?.start || '2019-01-01',
          end_date: timeRange?.end || '2026-12-31'
        }],
        award_type_codes: ['A', 'B', 'C', 'D'],
      };
      
      if (naicsCode) filters.naics_codes = [naicsCode];
      if (keywords.length > 0) filters.keywords = keywords.slice(0, 5);
      if (state) filters.place_of_performance_locations = [{ state }];
      if (agency) filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agency }];
      if (minValue || maxValue) {
        filters.award_amounts = [{
          lower_bound: minValue || 0,
          upper_bound: maxValue || 999999999999
        }];
      }
      
      const response = await fetch(`${API_ENDPOINTS.USA_SPENDING}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': this.userAgent },
        body: JSON.stringify({
          filters,
          fields: [
            'recipient_name', 'total_obligation', 'awarding_agency_name',
            'naics_code', 'description', 'place_of_performance_state_code',
            'period_of_performance_start_date', 'period_of_performance_current_end_date',
            'recipient_uei', 'contract_award_type'
          ],
          limit,
          order: 'desc',
          sort: 'total_obligation'
        })
      });

      if (!response.ok) {
        console.log('USASpending API error:', response.status);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('USASpending API error:', error);
      return [];
    }
  }

  // Treasury API - National debt, fiscal data
  async getTreasuryData(endpoint: string = 'debt_to_penny'): Promise<TreasuryData[]> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.TREASURY}/v2/accounting/od/${endpoint}?sort=-record_date&page[size]=100`,
        { headers: { 'User-Agent': this.userAgent } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Treasury API error:', error);
      return [];
    }
  }

  // Patent API - USPTO patents
  async searchPatents(query: string, limit = 50): Promise<PatentData[]> {
    try {
      const response = await fetch(API_ENDPOINTS.USPTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': this.userAgent },
        body: JSON.stringify({
          q: { _text_any: { patent_title: query, patent_abstract: query } },
          f: ['patent_number', 'patent_title', 'assignee_organization', 'patent_date', 'patent_abstract'],
          o: { per_page: limit },
          s: [{ patent_date: 'desc' }]
        })
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.patents || [];
    } catch (error) {
      console.error('USPTO API error:', error);
      return [];
    }
  }

  // NIH Reporter - Research grants
  async searchNIHGrants(query: string, fiscalYear?: number): Promise<NIHGrant[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.NIH}/projects/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': this.userAgent },
        body: JSON.stringify({
          criteria: {
            use_relevance: true,
            project_terms: query,
            fiscal_years: fiscalYear ? [fiscalYear] : [2023, 2024, 2025]
          },
          offset: 0,
          limit: 50,
          sort_field: 'award_amount',
          sort_order: 'desc'
        })
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || []).map((r: any) => ({
        project_title: r.project_title,
        organization_name: r.organization?.org_name,
        award_amount: r.award_amount,
        fiscal_year: r.fiscal_year,
        pi_names: r.principal_investigators?.map((pi: any) => pi.full_name) || []
      }));
    } catch (error) {
      console.error('NIH API error:', error);
      return [];
    }
  }

  // SEC EDGAR - Public company filings with more data
  async searchSECCompanies(query: string): Promise<SECCompany[]> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.SEC_EDGAR}/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(query)}&type=10-K&output=atom`,
        { headers: { 'User-Agent': this.userAgent, 'Accept': 'application/atom+xml' } }
      );
      if (!response.ok) return [];
      const text = await response.text();
      return this.parseSECAtomFeed(text);
    } catch (error) {
      console.error('SEC API error:', error);
      return [];
    }
  }

  // FDA API - Drug approvals, recalls
  async getFDAData(type: 'drug' | 'device' | 'food', query: string): Promise<any[]> {
    try {
      const endpoint = type === 'drug' ? 'drug/event' : type === 'device' ? 'device/event' : 'food/enforcement';
      const response = await fetch(
        `${API_ENDPOINTS.FDA}/${endpoint}.json?search=${encodeURIComponent(query)}&limit=50`,
        { headers: { 'User-Agent': this.userAgent } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('FDA API error:', error);
      return [];
    }
  }

  // World Bank API - Global economic data
  async getWorldBankData(indicator: string, countries: string[] = ['USA', 'CHN', 'DEU', 'JPN', 'GBR']): Promise<any[]> {
    try {
      const countryStr = countries.join(';');
      const response = await fetch(
        `${API_ENDPOINTS.WORLD_BANK}/country/${countryStr}/indicator/${indicator}?format=json&per_page=100&date=2018:2024`,
        { headers: { 'User-Agent': this.userAgent } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data[1] || [];
    } catch (error) {
      console.error('World Bank API error:', error);
      return [];
    }
  }

  // Agency spending breakdown
  async getAgencySpending(fiscalYear?: number): Promise<any[]> {
    try {
      const year = fiscalYear || new Date().getFullYear();
      const response = await fetch(
        `${API_ENDPOINTS.USA_SPENDING}/agency/awards/?fiscal_year=${year}&order=desc&sort=total_obligations&limit=25`,
        { headers: { 'Content-Type': 'application/json', 'User-Agent': this.userAgent } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Agency spending error:', error);
      return [];
    }
  }

  private parseSECAtomFeed(xml: string): SECCompany[] {
    const companies: SECCompany[] = [];
    const companyMatches = xml.matchAll(/<company-info>[\s\S]*?<conformed-name>([^<]+)<\/conformed-name>[\s\S]*?<cik>([^<]+)<\/cik>[\s\S]*?<\/company-info>/gi);
    for (const match of companyMatches) {
      companies.push({ name: match[1]?.trim() || '', cik: match[2]?.trim() || '' });
    }
    return companies;
  }
}

// ============================================================================
// PART 2: ADVANCED NLP ENGINE - ZERO AI CREDITS
// ============================================================================

// Extended AFINN-165 Sentiment Lexicon (400+ words)
const AFINN: Record<string, number> = {
  // Positive business terms
  'accomplish': 2, 'accomplished': 2, 'achieve': 2, 'achievement': 2, 'achievements': 2,
  'acclaimed': 2, 'advantage': 2, 'advantages': 2, 'amazing': 4, 'awesome': 4,
  'best': 3, 'better': 2, 'boom': 2, 'booming': 3, 'breakthrough': 3, 'brilliant': 3,
  'confident': 2, 'consistently': 1, 'cutting-edge': 3, 'dominant': 2, 'dominate': 2,
  'efficient': 2, 'excellent': 3, 'exceptional': 3, 'exciting': 3, 'expansion': 2,
  'fantastic': 4, 'favorable': 2, 'gain': 2, 'gains': 2, 'good': 2, 'great': 3,
  'growth': 2, 'growing': 2, 'highest': 3, 'impressive': 3, 'improve': 2, 'improved': 2,
  'improvement': 2, 'increase': 2, 'increased': 2, 'increases': 2, 'innovative': 2,
  'innovation': 2, 'leader': 2, 'leadership': 2, 'leading': 2, 'milestone': 2,
  'opportunity': 2, 'opportunities': 2, 'optimal': 2, 'optimistic': 2, 'outstanding': 4,
  'outperform': 3, 'outperformed': 3, 'pioneer': 3, 'positive': 2, 'profit': 2,
  'profitable': 2, 'profits': 2, 'progress': 2, 'promising': 2, 'record': 2,
  'remarkable': 3, 'resilient': 2, 'revenue': 1, 'revolutionary': 3, 'rich': 2,
  'rise': 1, 'rising': 1, 'robust': 2, 'secure': 2, 'secured': 2, 'solid': 2,
  'stable': 1, 'steady': 1, 'strategic': 2, 'strength': 2, 'strong': 2, 'stronger': 2,
  'strongest': 3, 'success': 2, 'successful': 2, 'successfully': 2, 'superior': 3,
  'surpass': 2, 'surpassed': 2, 'sustainable': 2, 'thrive': 3, 'thriving': 3,
  'top': 2, 'transform': 2, 'transformative': 3, 'tremendous': 3, 'trusted': 2,
  'trustworthy': 2, 'upgrade': 2, 'upside': 2, 'valuable': 2, 'value': 1, 'win': 3,
  'winner': 3, 'winning': 3, 'world-class': 3,
  
  // Negative business terms
  'abandon': -2, 'abandoned': -2, 'abandons': -2, 'abducted': -2, 'abuse': -3,
  'abused': -3, 'abuses': -3, 'adverse': -2, 'awful': -3, 'bad': -3, 'bankrupt': -3,
  'bankruptcy': -3, 'catastrophe': -4, 'catastrophic': -4, 'challenge': -1, 'challenges': -1,
  'closing': -1, 'concern': -1, 'concerns': -1, 'crisis': -3, 'critical': -2,
  'damage': -2, 'damages': -2, 'danger': -2, 'dangerous': -2, 'debt': -1, 'decline': -2,
  'declined': -2, 'declining': -2, 'decrease': -1, 'decreased': -1, 'default': -2,
  'deficit': -2, 'delay': -1, 'delayed': -1, 'delays': -1, 'difficult': -1,
  'difficulties': -2, 'difficulty': -2, 'disappoint': -2, 'disappointed': -2,
  'disappointing': -2, 'disappointment': -2, 'dispute': -2, 'disputes': -2,
  'disrupt': -1, 'disruption': -2, 'downturn': -2, 'drop': -1, 'dropped': -2,
  'fail': -2, 'failed': -2, 'failure': -2, 'failures': -2, 'fall': -1, 'fallen': -2,
  'falling': -2, 'fear': -2, 'fears': -2, 'fraud': -4, 'fraudulent': -4, 'hurt': -2,
  'impair': -2, 'impaired': -2, 'impairment': -2, 'issue': -1, 'issues': -1,
  'lawsuit': -2, 'lawsuits': -2, 'layoff': -2, 'layoffs': -2, 'litigation': -2,
  'lose': -2, 'loss': -2, 'losses': -2, 'lost': -2, 'lower': -1, 'lowered': -1,
  'negative': -2, 'negatively': -2, 'penalty': -2, 'poor': -2, 'pressure': -1,
  'pressures': -1, 'problem': -2, 'problems': -2, 'recall': -2, 'recession': -3,
  'regulatory': -1, 'restructure': -1, 'restructuring': -2, 'risk': -1, 'risks': -1,
  'risky': -2, 'scam': -4, 'scandal': -3, 'scrutiny': -1, 'setback': -2, 'shortage': -2,
  'shortfall': -2, 'shutdown': -2, 'slowdown': -2, 'slowing': -1, 'slower': -1,
  'struggling': -2, 'suffer': -2, 'suffered': -2, 'suffers': -2, 'suspend': -2,
  'suspended': -2, 'tension': -1, 'tensions': -2, 'terrible': -3, 'threat': -2,
  'threats': -2, 'troubled': -2, 'uncertain': -1, 'uncertainty': -1, 'underperform': -2,
  'underperformed': -2, 'volatile': -2, 'volatility': -2, 'vulnerable': -2,
  'warn': -2, 'warning': -2, 'warnings': -2, 'weak': -2, 'weaken': -2, 'weakened': -2,
  'weaker': -2, 'weakness': -2, 'worst': -3, 'worsening': -2
};

// Extended stopwords
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// Domain-specific terminology boosters
const DOMAIN_LEXICONS: Record<string, Record<string, number>> = {
  government: {
    'award': 2, 'awarded': 2, 'appropriation': 1, 'authorized': 2, 'budget': 1,
    'compliance': 1, 'contract': 1, 'contractor': 1, 'cybersecurity': 2, 'defense': 1,
    'federal': 1, 'grant': 2, 'obligation': 1, 'procurement': 1, 'security': 1,
    'classified': -1, 'violation': -3, 'debarred': -4, 'suspended': -3
  },
  finance: {
    'acquisition': 1, 'assets': 1, 'bearish': -2, 'bullish': 2, 'capital': 1,
    'dividend': 2, 'earnings': 2, 'equity': 1, 'hedge': -1, 'investment': 1,
    'leverage': -1, 'liquidity': 1, 'margin': 1, 'merger': 1, 'portfolio': 1,
    'returns': 2, 'roi': 2, 'valuation': 1, 'yield': 1
  },
  tech: {
    'agile': 2, 'algorithm': 1, 'api': 1, 'automation': 2, 'cloud': 2, 'data': 1,
    'deployment': 1, 'devops': 2, 'docker': 1, 'infrastructure': 1, 'kubernetes': 1,
    'machine-learning': 2, 'microservices': 2, 'neural': 2, 'platform': 1,
    'saas': 2, 'scalable': 2, 'serverless': 2, 'legacy': -1, 'deprecated': -2
  },
  healthcare: {
    'approval': 2, 'clinical': 1, 'cure': 3, 'diagnosis': 1, 'efficacy': 2,
    'fda': 1, 'gene': 1, 'therapy': 2, 'trial': 1, 'vaccine': 2,
    'adverse': -2, 'contamination': -3, 'recall': -3, 'side-effect': -2
  }
};

class AdvancedNLPEngine {
  private domainLexicon: Record<string, number> = {};

  // Set domain for specialized analysis
  setDomain(domain: string) {
    this.domainLexicon = DOMAIN_LEXICONS[domain] || {};
  }

  // Advanced tokenization with n-grams
  tokenize(text: string, includeNgrams = false): string[] {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOPWORDS.has(t));
    
    if (!includeNgrams) return words;
    
    // Add bigrams
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]}_${words[i + 1]}`);
    }
    
    return [...words, ...bigrams];
  }

  // TF-IDF Vectorization
  calculateTFIDF(documents: string[]): Map<number, Map<string, number>> {
    const docFreq: Map<string, number> = new Map();
    const tfidfVectors: Map<number, Map<string, number>> = new Map();

    documents.forEach((doc, docIndex) => {
      const tokens = this.tokenize(doc);
      const tf: Map<string, number> = new Map();
      const seen = new Set<string>();

      tokens.forEach(token => {
        tf.set(token, (tf.get(token) || 0) + 1);
        if (!seen.has(token)) {
          docFreq.set(token, (docFreq.get(token) || 0) + 1);
          seen.add(token);
        }
      });

      const maxTf = Math.max(...Array.from(tf.values()));
      tf.forEach((count, token) => tf.set(token, count / maxTf));
      tfidfVectors.set(docIndex, tf);
    });

    tfidfVectors.forEach((tf) => {
      tf.forEach((tfValue, token) => {
        const idf = Math.log((documents.length + 1) / ((docFreq.get(token) || 0) + 1));
        tf.set(token, tfValue * idf);
      });
    });

    return tfidfVectors;
  }

  // BM25 Scoring (Okapi BM25)
  bm25Score(query: string, document: string, k1 = 1.5, b = 0.75, avgDocLength = 100): number {
    const queryTokens = this.tokenize(query);
    const docTokens = this.tokenize(document);
    const docLength = docTokens.length;

    const tf: Map<string, number> = new Map();
    docTokens.forEach(token => tf.set(token, (tf.get(token) || 0) + 1));

    let score = 0;
    queryTokens.forEach(token => {
      const termFreq = tf.get(token) || 0;
      if (termFreq > 0) {
        const idf = Math.log(2);
        const numerator = termFreq * (k1 + 1);
        const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
        score += idf * (numerator / denominator);
      }
    });

    return score;
  }

  // Enhanced Sentiment Analysis with domain awareness
  analyzeSentiment(text: string, domain?: string): {
    score: number;
    comparative: number;
    classification: string;
    confidence: number;
    aspects: Record<string, number>;
  } {
    if (domain) this.setDomain(domain);
    
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
    let score = 0;
    let wordCount = 0;
    let modifier = 1;
    const aspects: Record<string, number> = {};

    const modifiers: Record<string, number> = {
      'not': -1, 'never': -1, 'no': -1, "don't": -1, "doesn't": -1, "didn't": -1,
      'very': 1.5, 'extremely': 2, 'highly': 1.5, 'significantly': 1.5, 'substantially': 1.5,
      'slightly': 0.5, 'somewhat': 0.75, 'barely': 0.25
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (modifiers[token]) {
        modifier = modifiers[token];
        continue;
      }

      // Check domain lexicon first, then AFINN
      let wordScore = this.domainLexicon[token] ?? AFINN[token];
      
      if (wordScore !== undefined) {
        const adjustedScore = wordScore * modifier;
        score += adjustedScore;
        wordCount++;
        
        // Track aspects
        if (adjustedScore > 0) aspects.positive = (aspects.positive || 0) + 1;
        else if (adjustedScore < 0) aspects.negative = (aspects.negative || 0) + 1;
        
        modifier = 1;
      }
    }

    const comparative = wordCount > 0 ? score / wordCount : 0;
    const confidence = Math.min(1, wordCount / 10);
    const classification = comparative > 0.5 ? 'positive' : comparative < -0.5 ? 'negative' : 'neutral';

    return { score, comparative, classification, confidence, aspects };
  }

  // Advanced Named Entity Recognition
  extractEntities(text: string): Record<string, string[]> {
    const patterns = {
      company: [
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc\.|Corp\.|LLC|Ltd\.|Corporation|Company|Co\.|Group|Partners|Holdings|Enterprises)))/g,
        /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g, // Acronyms like IBM, SAIC
      ],
      money: [
        /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|trillion|M|B|K|T))?/gi,
        /(?:USD|EUR|GBP|JPY)\s*[\d,]+(?:\.\d{2})?/gi,
        /\b\d+(?:\.\d+)?\s*(?:million|billion|trillion)\s*(?:dollars?|USD)?/gi
      ],
      percentage: [/\b\d+(?:\.\d+)?%\b/g],
      date: [
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
        /\b\d{4}-\d{2}-\d{2}\b/g,
        /\b(?:Q[1-4])\s*(?:FY)?\s*\d{4}/gi,
        /\bFY\s*\d{4}/gi
      ],
      location: [
        /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/gi,
        /\b(?:Washington D\.?C\.?|DC)\b/gi,
        /\b(?:San Francisco|Los Angeles|New York City|NYC|Chicago|Boston|Seattle|Austin|Denver|Atlanta|Dallas|Houston|Phoenix|Miami|San Diego|Portland|Philadelphia)\b/gi
      ],
      email: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
      url: [/https?:\/\/[^\s]+/g],
      naics: [/\bNAICS\s*(?:code)?:?\s*(\d{6})/gi, /\b\d{6}\b/g],
      contract_number: [/\b[A-Z]{1,2}\d{2,3}[A-Z]?\d{2,4}[A-Z]?\d{3,6}\b/g]
    };

    const entities: Record<string, string[]> = {};
    for (const [type, patternList] of Object.entries(patterns)) {
      const matches: string[] = [];
      for (const pattern of patternList) {
        const found = text.match(pattern) || [];
        matches.push(...found);
      }
      entities[type] = [...new Set(matches.map(m => m.trim()))];
    }

    return entities;
  }

  // RAKE Keyword Extraction (Rapid Automatic Keyword Extraction)
  extractKeywords(text: string, topN = 15): Array<{ phrase: string; score: number }> {
    let processed = text.toLowerCase();
    for (const stopword of STOPWORDS) {
      const regex = new RegExp(`\\b${stopword}\\b`, 'gi');
      processed = processed.replace(regex, '|');
    }
    processed = processed.replace(/[^a-z0-9\s|]/g, '|');
    
    const phrases = processed.split('|').map(p => p.trim()).filter(p => p.length > 2);

    const wordFreq: Map<string, number> = new Map();
    const wordDegree: Map<string, number> = new Map();

    for (const phrase of phrases) {
      const words = phrase.split(/\s+/).filter(w => w.length > 0);
      const degree = words.length - 1;

      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        wordDegree.set(word, (wordDegree.get(word) || 0) + degree);
      }
    }

    const phraseScores = phrases.map(phrase => {
      const words = phrase.split(/\s+/).filter(w => w.length > 0);
      const score = words.reduce((sum, word) => {
        const freq = wordFreq.get(word) || 0;
        const degree = wordDegree.get(word) || 0;
        return sum + (freq > 0 ? (degree + freq) / freq : 0);
      }, 0);
      return { phrase, score };
    });

    return phraseScores
      .filter(p => p.phrase.length > 3)
      .sort((a, b) => b.score - a.score)
      .filter((p, i, arr) => arr.findIndex(x => x.phrase === p.phrase) === i)
      .slice(0, topN);
  }

  // Text classification using keyword matching
  classifyText(text: string, categories: Record<string, string[]>): {
    category: string;
    confidence: number;
    scores: Record<string, number>;
  } {
    const tokens = new Set(this.tokenize(text.toLowerCase()));
    const scores: Record<string, number> = {};
    
    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const keyword of keywords) {
        if (tokens.has(keyword.toLowerCase()) || text.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      scores[category] = score / keywords.length;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0];
    
    return {
      category: topCategory?.[0] || 'unknown',
      confidence: topCategory?.[1] || 0,
      scores
    };
  }

  // Cosine similarity between documents
  cosineSimilarity(doc1: string, doc2: string): number {
    const tokens1 = this.tokenize(doc1);
    const tokens2 = this.tokenize(doc2);
    
    const allTokens = new Set([...tokens1, ...tokens2]);
    const vec1: number[] = [];
    const vec2: number[] = [];
    
    for (const token of allTokens) {
      vec1.push(tokens1.filter(t => t === token).length);
      vec2.push(tokens2.filter(t => t === token).length);
    }
    
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
  }
}

// ============================================================================
// PART 3: ADVANCED ML ENGINE - PURE TYPESCRIPT
// ============================================================================

class AdvancedMLEngine {
  // K-Means++ Clustering
  kMeansClustering(data: number[][], k: number, maxIterations = 100): {
    assignments: number[];
    centroids: number[][];
    silhouetteScore: number;
  } {
    if (data.length < k) return { assignments: data.map((_, i) => i % k), centroids: [], silhouetteScore: 0 };

    const normalized = this.normalize(data);
    let centroids = this.initializeCentroidsKMeansPP(normalized, k);
    let assignments: number[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      const newAssignments = normalized.map(point => this.nearestCentroid(point, centroids));
      if (this.arraysEqual(assignments, newAssignments)) break;
      assignments = newAssignments;
      centroids = this.updateCentroids(normalized, assignments, k);
    }

    const silhouetteScore = this.calculateSilhouetteScore(normalized, assignments);

    return { assignments, centroids, silhouetteScore };
  }

  // DBSCAN Clustering (Density-Based)
  dbscan(data: number[][], epsilon: number, minPoints: number): {
    assignments: number[];
    corePoints: number[];
    noisePoints: number[];
  } {
    const n = data.length;
    const assignments = new Array(n).fill(-1);
    const visited = new Array(n).fill(false);
    const corePoints: number[] = [];
    const noisePoints: number[] = [];
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      visited[i] = true;

      const neighbors = this.getNeighbors(data, i, epsilon);
      
      if (neighbors.length < minPoints) {
        noisePoints.push(i);
        continue;
      }

      corePoints.push(i);
      this.expandCluster(data, assignments, visited, i, neighbors, clusterId, epsilon, minPoints);
      clusterId++;
    }

    return { assignments, corePoints, noisePoints };
  }

  private expandCluster(
    data: number[][], assignments: number[], visited: boolean[],
    pointIdx: number, neighbors: number[], clusterId: number,
    epsilon: number, minPoints: number
  ) {
    assignments[pointIdx] = clusterId;
    let i = 0;
    
    while (i < neighbors.length) {
      const neighborIdx = neighbors[i];
      
      if (!visited[neighborIdx]) {
        visited[neighborIdx] = true;
        const neighborNeighbors = this.getNeighbors(data, neighborIdx, epsilon);
        
        if (neighborNeighbors.length >= minPoints) {
          neighbors.push(...neighborNeighbors.filter(n => !neighbors.includes(n)));
        }
      }
      
      if (assignments[neighborIdx] === -1) {
        assignments[neighborIdx] = clusterId;
      }
      i++;
    }
  }

  private getNeighbors(data: number[][], pointIdx: number, epsilon: number): number[] {
    return data
      .map((point, idx) => ({ idx, dist: this.euclideanDistance(data[pointIdx], point) }))
      .filter(item => item.dist <= epsilon)
      .map(item => item.idx);
  }

  // Principal Component Analysis (PCA)
  pca(data: number[][], numComponents: number): {
    transformedData: number[][];
    explainedVariance: number[];
    components: number[][];
  } {
    const normalized = this.standardize(data);
    const covMatrix = this.covarianceMatrix(normalized);
    const { eigenvalues, eigenvectors } = this.powerIteration(covMatrix, numComponents);
    
    const transformedData = normalized.map(row => 
      eigenvectors.slice(0, numComponents).map(vec => 
        row.reduce((sum, val, i) => sum + val * vec[i], 0)
      )
    );

    const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
    const explainedVariance = eigenvalues.slice(0, numComponents).map(ev => ev / totalVariance);

    return { transformedData, explainedVariance, components: eigenvectors.slice(0, numComponents) };
  }

  // Linear Regression with R-squared
  linearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
    residuals: number[];
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residuals = x.map((xi, i) => y[i] - (slope * xi + intercept));
    const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return {
      slope,
      intercept,
      rSquared,
      predict: (xVal: number) => slope * xVal + intercept,
      residuals
    };
  }

  // Polynomial Regression
  polynomialRegression(x: number[], y: number[], degree: number): {
    coefficients: number[];
    rSquared: number;
    predict: (x: number) => number;
  } {
    // Build Vandermonde matrix
    const X: number[][] = x.map(xi => 
      Array.from({ length: degree + 1 }, (_, i) => Math.pow(xi, i))
    );

    // Solve using normal equations: (X^T * X)^-1 * X^T * y
    const XtX = this.matrixMultiply(this.transpose(X), X);
    const XtY = this.matrixVectorMultiply(this.transpose(X), y);
    const coefficients = this.solveLinearSystem(XtX, XtY);

    const predict = (xVal: number) => 
      coefficients.reduce((sum, coef, i) => sum + coef * Math.pow(xVal, i), 0);

    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = x.reduce((sum, xi, i) => sum + Math.pow(y[i] - predict(xi), 2), 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { coefficients, rSquared, predict };
  }

  // Anomaly Detection - Multiple methods
  detectAnomalies(values: number[], method: 'iqr' | 'zscore' | 'mad' = 'iqr', threshold = 1.5): Array<{
    index: number;
    value: number;
    type: 'high' | 'low';
    score: number;
  }> {
    if (method === 'zscore') {
      return this.detectZScoreAnomalies(values, threshold);
    } else if (method === 'mad') {
      return this.detectMADAnomalies(values, threshold);
    }
    return this.detectIQRAnomalies(values, threshold);
  }

  private detectIQRAnomalies(values: number[], multiplier: number) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const anomalies: Array<{ index: number; value: number; type: 'high' | 'low'; score: number }> = [];

    values.forEach((value, index) => {
      if (value < lowerBound) {
        anomalies.push({ index, value, type: 'low', score: (lowerBound - value) / iqr });
      } else if (value > upperBound) {
        anomalies.push({ index, value, type: 'high', score: (value - upperBound) / iqr });
      }
    });

    return anomalies;
  }

  private detectZScoreAnomalies(values: number[], threshold: number) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length);

    const anomalies: Array<{ index: number; value: number; type: 'high' | 'low'; score: number }> = [];

    values.forEach((value, index) => {
      const zScore = std > 0 ? (value - mean) / std : 0;
      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          index,
          value,
          type: zScore > 0 ? 'high' : 'low',
          score: Math.abs(zScore)
        });
      }
    });

    return anomalies;
  }

  private detectMADAnomalies(values: number[], threshold: number) {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const deviations = values.map(v => Math.abs(v - median));
    const mad = [...deviations].sort((a, b) => a - b)[Math.floor(deviations.length / 2)];

    const anomalies: Array<{ index: number; value: number; type: 'high' | 'low'; score: number }> = [];

    values.forEach((value, index) => {
      const modifiedZScore = mad > 0 ? 0.6745 * (value - median) / mad : 0;
      if (Math.abs(modifiedZScore) > threshold) {
        anomalies.push({
          index,
          value,
          type: modifiedZScore > 0 ? 'high' : 'low',
          score: Math.abs(modifiedZScore)
        });
      }
    });

    return anomalies;
  }

  // Time Series Forecasting - Simple Moving Average
  movingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
    return result;
  }

  // Exponential Smoothing
  exponentialSmoothing(values: number[], alpha: number): number[] {
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  // Helper functions
  private initializeCentroidsKMeansPP(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    const firstIdx = Math.floor(Math.random() * data.length);
    centroids.push([...data[firstIdx]]);
    usedIndices.add(firstIdx);

    for (let i = 1; i < k; i++) {
      const distances = data.map((point, idx) => {
        if (usedIndices.has(idx)) return 0;
        return Math.min(...centroids.map(c => this.euclideanDistance(point, c)));
      });

      const totalDist = distances.reduce((a, b) => a + b * b, 0);
      let random = Math.random() * totalDist;

      for (let j = 0; j < data.length; j++) {
        random -= distances[j] * distances[j];
        if (random <= 0 && !usedIndices.has(j)) {
          centroids.push([...data[j]]);
          usedIndices.add(j);
          break;
        }
      }
    }

    return centroids;
  }

  private nearestCentroid(point: number[], centroids: number[][]): number {
    let minDist = Infinity;
    let nearest = 0;

    centroids.forEach((centroid, i) => {
      const dist = this.euclideanDistance(point, centroid);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });

    return nearest;
  }

  private updateCentroids(data: number[][], assignments: number[], k: number): number[][] {
    const centroids: number[][] = [];

    for (let i = 0; i < k; i++) {
      const clusterPoints = data.filter((_, idx) => assignments[idx] === i);
      if (clusterPoints.length === 0) {
        centroids.push(data[Math.floor(Math.random() * data.length)]);
        continue;
      }

      const dims = clusterPoints[0].length;
      const newCentroid = new Array(dims).fill(0);

      for (const point of clusterPoints) {
        for (let d = 0; d < dims; d++) {
          newCentroid[d] += point[d];
        }
      }

      centroids.push(newCentroid.map(v => v / clusterPoints.length));
    }

    return centroids;
  }

  private calculateSilhouetteScore(data: number[][], assignments: number[]): number {
    if (data.length < 2) return 0;

    let totalScore = 0;
    const k = Math.max(...assignments) + 1;

    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      const sameCluster = data.filter((_, idx) => assignments[idx] === cluster && idx !== i);
      
      const a = sameCluster.length > 0
        ? sameCluster.reduce((sum, point) => sum + this.euclideanDistance(data[i], point), 0) / sameCluster.length
        : 0;

      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === cluster) continue;
        const otherCluster = data.filter((_, idx) => assignments[idx] === c);
        if (otherCluster.length === 0) continue;
        const avgDist = otherCluster.reduce((sum, point) => sum + this.euclideanDistance(data[i], point), 0) / otherCluster.length;
        b = Math.min(b, avgDist);
      }

      if (b === Infinity) b = 0;
      const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
      totalScore += s;
    }

    return totalScore / data.length;
  }

  normalize(data: number[][]): number[][] {
    if (data.length === 0) return [];
    const dims = data[0].length;
    const mins = new Array(dims).fill(Infinity);
    const maxs = new Array(dims).fill(-Infinity);

    for (const point of data) {
      for (let d = 0; d < dims; d++) {
        mins[d] = Math.min(mins[d], point[d]);
        maxs[d] = Math.max(maxs[d], point[d]);
      }
    }

    return data.map(point =>
      point.map((v, d) => (maxs[d] - mins[d]) > 0 ? (v - mins[d]) / (maxs[d] - mins[d]) : 0)
    );
  }

  private standardize(data: number[][]): number[][] {
    if (data.length === 0) return [];
    const dims = data[0].length;
    const means = new Array(dims).fill(0);
    const stds = new Array(dims).fill(0);

    for (const point of data) {
      for (let d = 0; d < dims; d++) {
        means[d] += point[d];
      }
    }
    means.forEach((m, d) => means[d] = m / data.length);

    for (const point of data) {
      for (let d = 0; d < dims; d++) {
        stds[d] += Math.pow(point[d] - means[d], 2);
      }
    }
    stds.forEach((s, d) => stds[d] = Math.sqrt(s / data.length));

    return data.map(point =>
      point.map((v, d) => stds[d] > 0 ? (v - means[d]) / stds[d] : 0)
    );
  }

  private covarianceMatrix(data: number[][]): number[][] {
    const n = data.length;
    const dims = data[0]?.length || 0;
    const cov: number[][] = [];

    for (let i = 0; i < dims; i++) {
      cov[i] = [];
      for (let j = 0; j < dims; j++) {
        let sum = 0;
        for (const point of data) {
          sum += point[i] * point[j];
        }
        cov[i][j] = sum / n;
      }
    }

    return cov;
  }

  private powerIteration(matrix: number[][], numVectors: number): {
    eigenvalues: number[];
    eigenvectors: number[][];
  } {
    const n = matrix.length;
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];
    let A = matrix.map(row => [...row]);

    for (let v = 0; v < numVectors && v < n; v++) {
      let vec = new Array(n).fill(0).map(() => Math.random());
      let eigenvalue = 0;

      for (let iter = 0; iter < 100; iter++) {
        const newVec = this.matrixVectorMultiply(A, vec);
        eigenvalue = Math.sqrt(newVec.reduce((sum, x) => sum + x * x, 0));
        if (eigenvalue === 0) break;
        vec = newVec.map(x => x / eigenvalue);
      }

      eigenvalues.push(eigenvalue);
      eigenvectors.push(vec);

      // Deflate matrix
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          A[i][j] -= eigenvalue * vec[i] * vec[j];
        }
      }
    }

    return { eigenvalues, eigenvectors };
  }

  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        result[i][j] = A[i].reduce((sum, a, k) => sum + a * B[k][j], 0);
      }
    }
    return result;
  }

  private matrixVectorMultiply(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, a, i) => sum + a * v[i], 0));
  }

  private transpose(A: number[][]): number[][] {
    return A[0].map((_, j) => A.map(row => row[j]));
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    // Simple Gaussian elimination
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      if (Math.abs(aug[i][i]) < 1e-10) continue;

      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      if (Math.abs(aug[i][i]) > 1e-10) x[i] /= aug[i][i];
    }

    return x;
  }

  euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
}

// ============================================================================
// PART 4: FUZZY MATCHING & DEDUPLICATION
// ============================================================================

class AdvancedFuzzyMatcher {
  // Levenshtein Distance
  levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Jaro-Winkler Similarity
  jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    
    const jaro = this.jaroSimilarity(s1, s2);
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  private jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    return (
      matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches
    ) / 3;
  }

  // Soundex for phonetic matching
  soundex(s: string): string {
    const word = s.toUpperCase().replace(/[^A-Z]/g, '');
    if (!word) return '0000';

    const codes: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };

    let result = word[0];
    let prevCode = codes[word[0]] || '';

    for (let i = 1; i < word.length; i++) {
      const code = codes[word[i]] || '';
      if (code && code !== prevCode) {
        result += code;
        if (result.length === 4) break;
      }
      prevCode = code;
    }

    return (result + '0000').slice(0, 4);
  }

  // N-gram similarity
  ngramSimilarity(s1: string, s2: string, n = 2): number {
    const ngrams1 = this.getNgrams(s1.toLowerCase(), n);
    const ngrams2 = this.getNgrams(s2.toLowerCase(), n);
    
    const intersection = ngrams1.filter(ng => ngrams2.includes(ng));
    const union = new Set([...ngrams1, ...ngrams2]);
    
    return union.size > 0 ? intersection.length / union.size : 0;
  }

  private getNgrams(s: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= s.length - n; i++) {
      ngrams.push(s.slice(i, i + n));
    }
    return ngrams;
  }

  // Find duplicates with multiple similarity measures
  findDuplicates(items: string[], threshold = 0.85): Array<[string, string, number]> {
    const duplicates: Array<[string, string, number]> = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const jw = this.jaroWinkler(items[i].toLowerCase(), items[j].toLowerCase());
        const ng = this.ngramSimilarity(items[i], items[j], 2);
        const combined = (jw * 0.7 + ng * 0.3);

        if (combined >= threshold) {
          duplicates.push([items[i], items[j], combined]);
        }
      }
    }

    return duplicates.sort((a, b) => b[2] - a[2]);
  }

  // Company name normalization
  normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc\.?|corp\.?|llc|ltd\.?|co\.?|corporation|company|group|holdings|international|enterprises|solutions|services|technologies|systems)\b/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// ============================================================================
// PART 5: ADVANCED STATISTICAL ENGINE
// ============================================================================

class AdvancedStatisticsEngine {
  // Comprehensive descriptive statistics
  describe(values: number[]): {
    count: number;
    sum: number;
    mean: number;
    median: number;
    mode: number;
    min: number;
    max: number;
    range: number;
    variance: number;
    stdDev: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    kurtosis: number;
    coefficientOfVariation: number;
  } {
    if (values.length === 0) {
      return {
        count: 0, sum: 0, mean: 0, median: 0, mode: 0, min: 0, max: 0, range: 0,
        variance: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0, skewness: 0, kurtosis: 0,
        coefficientOfVariation: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    const freq: Map<number, number> = new Map();
    values.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
    const mode = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    const min = sorted[0];
    const max = sorted[count - 1];
    const range = max - min;

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    const q1 = sorted[Math.floor(count * 0.25)];
    const q3 = sorted[Math.floor(count * 0.75)];
    const iqr = q3 - q1;

    // Skewness (Fisher's moment coefficient)
    const skewness = stdDev > 0
      ? values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / count
      : 0;

    // Excess Kurtosis
    const kurtosis = stdDev > 0
      ? values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / count - 3
      : 0;

    const coefficientOfVariation = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

    return {
      count, sum, mean, median, mode, min, max, range, variance, stdDev,
      q1, q3, iqr, skewness, kurtosis, coefficientOfVariation
    };
  }

  // Calculate percentile
  percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  // Pearson correlation coefficient
  correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Spearman rank correlation
  spearmanCorrelation(x: number[], y: number[]): number {
    const rankX = this.rank(x);
    const rankY = this.rank(y);
    return this.correlation(rankX, rankY);
  }

  private rank(values: number[]): number[] {
    const indexed = values.map((v, i) => ({ value: v, index: i }));
    indexed.sort((a, b) => a.value - b.value);
    
    const ranks = new Array(values.length);
    for (let i = 0; i < indexed.length; i++) {
      ranks[indexed[i].index] = i + 1;
    }
    return ranks;
  }

  // Covariance
  covariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    
    return x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / x.length;
  }

  // Group by and aggregate
  groupBy<T>(data: T[], key: keyof T): Map<any, T[]> {
    const groups: Map<any, T[]> = new Map();
    
    for (const item of data) {
      const groupKey = item[key];
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    return groups;
  }

  // Distribution analysis
  distribution(values: (string | number)[]): Array<{ value: string | number; count: number; percentage: number }> {
    const counts: Map<string | number, number> = new Map();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Histogram binning
  histogram(values: number[], bins: number): Array<{ binStart: number; binEnd: number; count: number }> {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0).map((_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0
    }));

    for (const v of values) {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    }

    return histogram;
  }

  // Rolling statistics
  rollingMean(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      result.push(windowValues.reduce((a, b) => a + b, 0) / window);
    }
    return result;
  }

  // Year-over-year growth
  yoyGrowth(values: number[], periodsPerYear: number = 12): number[] {
    const growth: number[] = [];
    for (let i = periodsPerYear; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - periodsPerYear];
      growth.push(previous !== 0 ? ((current - previous) / previous) * 100 : 0);
    }
    return growth;
  }
}

// ============================================================================
// PART 6: EXPANDED SCHEMA TEMPLATES & DATA GENERATORS
// ============================================================================

interface ColumnDef {
  name: string;
  type: 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'email' | 'url' | 'score' | 'trend' | 'boolean' | 'phone' | 'array';
  description: string;
  is_enriched: boolean;
  generator?: string;
}

interface SchemaTemplate {
  entity_type: string;
  keywords: string[];
  title_template: string;
  description_template: string;
  columns: ColumnDef[];
  sources: string[];
  domain: string;
}

const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    entity_type: 'federal_contractor',
    keywords: ['federal', 'contractor', 'government', 'contract', 'agency', 'grant', 'defense', 'dod', 'gsa', 'procurement', 'award', 'obligation', 'navy', 'army', 'air force', 'hhs', 'va', 'dhs'],
    title_template: 'Federal Contractors - {category}',
    description_template: 'Comprehensive dataset of federal contractors with contract values, agencies, and certifications',
    columns: [
      { name: 'company_name', type: 'string', description: 'Legal business name', is_enriched: false },
      { name: 'cage_code', type: 'string', description: 'CAGE code identifier', is_enriched: false },
      { name: 'uei', type: 'string', description: 'Unique Entity Identifier', is_enriched: false },
      { name: 'total_contract_value', type: 'currency', description: 'Total obligated contract value', is_enriched: false },
      { name: 'primary_agency', type: 'string', description: 'Primary awarding agency', is_enriched: false },
      { name: 'naics_code', type: 'string', description: 'Primary NAICS code', is_enriched: false },
      { name: 'psc_code', type: 'string', description: 'Product Service Code', is_enriched: true },
      { name: 'small_business', type: 'boolean', description: 'Small business certification', is_enriched: true },
      { name: 'hq_state', type: 'string', description: 'Headquarters state', is_enriched: false },
      { name: 'employee_count', type: 'number', description: 'Estimated employees', is_enriched: true },
      { name: 'past_performance_rating', type: 'score', description: 'CPARS rating (1-5)', is_enriched: true },
      { name: 'contract_growth_yoy', type: 'percentage', description: 'Year-over-year contract growth', is_enriched: true, generator: 'trend_percentage' },
      { name: 'contract_count', type: 'number', description: 'Number of active contracts', is_enriched: true },
      { name: 'clearance_level', type: 'string', description: 'Security clearance level', is_enriched: true }
    ],
    sources: ['usaspending.gov', 'sam.gov', 'fpds.gov', 'beta.sam.gov'],
    domain: 'government'
  },
  {
    entity_type: 'startup',
    keywords: ['startup', 'funded', 'funding', 'series', 'venture', 'vc', 'seed', 'raise', 'unicorn', 'valuation', 'round', 'capital', 'investor', 'pre-seed', 'angel'],
    title_template: 'Venture-Backed Startups - {category}',
    description_template: 'Dataset of venture-backed startups with funding rounds, valuations, and growth metrics',
    columns: [
      { name: 'company_name', type: 'string', description: 'Company name', is_enriched: false },
      { name: 'industry', type: 'string', description: 'Primary industry', is_enriched: false },
      { name: 'founded_year', type: 'number', description: 'Year founded', is_enriched: false },
      { name: 'total_funding', type: 'currency', description: 'Total funding raised', is_enriched: false },
      { name: 'last_round', type: 'string', description: 'Last funding round type', is_enriched: false },
      { name: 'last_round_amount', type: 'currency', description: 'Last round amount', is_enriched: true },
      { name: 'valuation', type: 'currency', description: 'Latest valuation', is_enriched: true },
      { name: 'employee_count', type: 'number', description: 'Employee count', is_enriched: false },
      { name: 'hq_location', type: 'string', description: 'Headquarters location', is_enriched: false },
      { name: 'growth_stage', type: 'string', description: 'Growth stage', is_enriched: true },
      { name: 'revenue_estimate', type: 'currency', description: 'Estimated annual revenue', is_enriched: true },
      { name: 'growth_rate', type: 'percentage', description: 'Annual growth rate', is_enriched: true, generator: 'trend_percentage' },
      { name: 'burn_rate', type: 'currency', description: 'Monthly burn rate', is_enriched: true },
      { name: 'runway_months', type: 'number', description: 'Runway in months', is_enriched: true }
    ],
    sources: ['crunchbase.com', 'pitchbook.com', 'sec.gov', 'linkedin.com'],
    domain: 'finance'
  },
  {
    entity_type: 'public_company',
    keywords: ['public', 'stock', 'nasdaq', 'nyse', 'ticker', 'market cap', 'sec', 'filing', 'quarterly', 'earnings', '10-k', '10-q', 'revenue', 'profit'],
    title_template: 'Public Companies - {category}',
    description_template: 'Dataset of publicly traded companies with financial metrics and market data',
    columns: [
      { name: 'company_name', type: 'string', description: 'Company name', is_enriched: false },
      { name: 'ticker', type: 'string', description: 'Stock ticker symbol', is_enriched: false },
      { name: 'exchange', type: 'string', description: 'Stock exchange', is_enriched: false },
      { name: 'market_cap', type: 'currency', description: 'Market capitalization', is_enriched: false },
      { name: 'revenue_ttm', type: 'currency', description: 'Trailing 12-month revenue', is_enriched: false },
      { name: 'net_income', type: 'currency', description: 'Net income', is_enriched: false },
      { name: 'pe_ratio', type: 'number', description: 'Price-to-earnings ratio', is_enriched: false },
      { name: 'eps', type: 'number', description: 'Earnings per share', is_enriched: true },
      { name: 'sector', type: 'string', description: 'Industry sector', is_enriched: false },
      { name: 'employee_count', type: 'number', description: 'Employee count', is_enriched: false },
      { name: 'yoy_revenue_growth', type: 'percentage', description: 'YoY revenue growth', is_enriched: true, generator: 'trend_percentage' },
      { name: 'gross_margin', type: 'percentage', description: 'Gross margin', is_enriched: true },
      { name: 'analyst_rating', type: 'score', description: 'Average analyst rating (1-5)', is_enriched: true },
      { name: 'dividend_yield', type: 'percentage', description: 'Dividend yield', is_enriched: true }
    ],
    sources: ['sec.gov', 'nasdaq.com', 'finance.yahoo.com', 'bloomberg.com'],
    domain: 'finance'
  },
  {
    entity_type: 'research_grant',
    keywords: ['research', 'grant', 'nih', 'nsf', 'funding', 'academic', 'university', 'principal investigator', 'pi', 'study', 'clinical', 'trial'],
    title_template: 'Research Grants - {category}',
    description_template: 'Dataset of research grants with funding amounts, institutions, and principal investigators',
    columns: [
      { name: 'project_title', type: 'string', description: 'Project title', is_enriched: false },
      { name: 'organization_name', type: 'string', description: 'Research institution', is_enriched: false },
      { name: 'principal_investigator', type: 'string', description: 'Lead PI name', is_enriched: false },
      { name: 'award_amount', type: 'currency', description: 'Grant award amount', is_enriched: false },
      { name: 'funding_agency', type: 'string', description: 'Funding agency', is_enriched: false },
      { name: 'fiscal_year', type: 'number', description: 'Fiscal year', is_enriched: false },
      { name: 'research_area', type: 'string', description: 'Research area', is_enriched: true },
      { name: 'grant_type', type: 'string', description: 'Grant type (R01, R21, etc.)', is_enriched: true },
      { name: 'start_date', type: 'date', description: 'Project start date', is_enriched: false },
      { name: 'end_date', type: 'date', description: 'Project end date', is_enriched: true },
      { name: 'publications', type: 'number', description: 'Number of publications', is_enriched: true },
      { name: 'citations', type: 'number', description: 'Total citations', is_enriched: true }
    ],
    sources: ['reporter.nih.gov', 'nsf.gov', 'grants.gov'],
    domain: 'healthcare'
  },
  {
    entity_type: 'patent',
    keywords: ['patent', 'invention', 'intellectual property', 'ip', 'uspto', 'assignee', 'inventor', 'claims', 'prior art'],
    title_template: 'Patents - {category}',
    description_template: 'Dataset of patents with inventors, assignees, and citation metrics',
    columns: [
      { name: 'patent_number', type: 'string', description: 'Patent number', is_enriched: false },
      { name: 'patent_title', type: 'string', description: 'Patent title', is_enriched: false },
      { name: 'assignee', type: 'string', description: 'Patent assignee/owner', is_enriched: false },
      { name: 'inventor', type: 'string', description: 'Primary inventor', is_enriched: false },
      { name: 'filing_date', type: 'date', description: 'Filing date', is_enriched: false },
      { name: 'grant_date', type: 'date', description: 'Grant date', is_enriched: false },
      { name: 'patent_type', type: 'string', description: 'Patent type', is_enriched: true },
      { name: 'classification', type: 'string', description: 'CPC classification', is_enriched: true },
      { name: 'claims_count', type: 'number', description: 'Number of claims', is_enriched: true },
      { name: 'citations_received', type: 'number', description: 'Citations received', is_enriched: true },
      { name: 'citations_made', type: 'number', description: 'Prior art citations', is_enriched: true },
      { name: 'patent_value_score', type: 'score', description: 'Estimated patent value (1-10)', is_enriched: true }
    ],
    sources: ['patentsview.org', 'uspto.gov', 'google.com/patents'],
    domain: 'tech'
  },
  {
    entity_type: 'tech_company',
    keywords: ['tech', 'software', 'saas', 'ai', 'data', 'cloud', 'platform', 'app', 'digital', 'machine learning', 'ml', 'api', 'developer', 'infrastructure'],
    title_template: 'Tech Companies - {category}',
    description_template: 'Dataset of technology companies with product focus, tech stack, and growth metrics',
    columns: [
      { name: 'company_name', type: 'string', description: 'Company name', is_enriched: false },
      { name: 'product_category', type: 'string', description: 'Primary product category', is_enriched: false },
      { name: 'business_model', type: 'string', description: 'Business model (SaaS, Platform, etc.)', is_enriched: false },
      { name: 'founded_year', type: 'number', description: 'Year founded', is_enriched: false },
      { name: 'employee_count', type: 'number', description: 'Employee count', is_enriched: false },
      { name: 'hq_location', type: 'string', description: 'Headquarters location', is_enriched: false },
      { name: 'annual_revenue', type: 'currency', description: 'Annual revenue', is_enriched: true },
      { name: 'funding_status', type: 'string', description: 'Funding status', is_enriched: false },
      { name: 'primary_tech', type: 'string', description: 'Primary technology', is_enriched: true },
      { name: 'github_stars', type: 'number', description: 'GitHub stars (if OSS)', is_enriched: true },
      { name: 'growth_rate', type: 'percentage', description: 'Annual growth rate', is_enriched: true, generator: 'trend_percentage' },
      { name: 'developer_satisfaction', type: 'score', description: 'Developer satisfaction (1-5)', is_enriched: true },
      { name: 'enterprise_ready', type: 'boolean', description: 'Enterprise ready', is_enriched: true }
    ],
    sources: ['github.com', 'crunchbase.com', 'linkedin.com', 'g2.com'],
    domain: 'tech'
  },
  {
    entity_type: 'job_listing',
    keywords: ['job', 'hiring', 'position', 'role', 'career', 'salary', 'remote', 'engineer', 'developer', 'manager', 'analyst', 'compensation'],
    title_template: 'Job Listings - {category}',
    description_template: 'Dataset of job listings with salary data, requirements, and company information',
    columns: [
      { name: 'job_title', type: 'string', description: 'Job title', is_enriched: false },
      { name: 'company_name', type: 'string', description: 'Hiring company', is_enriched: false },
      { name: 'location', type: 'string', description: 'Job location', is_enriched: false },
      { name: 'remote_policy', type: 'string', description: 'Remote work policy', is_enriched: false },
      { name: 'salary_min', type: 'currency', description: 'Minimum salary', is_enriched: false },
      { name: 'salary_max', type: 'currency', description: 'Maximum salary', is_enriched: false },
      { name: 'experience_years', type: 'number', description: 'Required experience (years)', is_enriched: false },
      { name: 'job_type', type: 'string', description: 'Employment type', is_enriched: false },
      { name: 'posted_date', type: 'date', description: 'Date posted', is_enriched: false },
      { name: 'skills_required', type: 'string', description: 'Key skills required', is_enriched: true },
      { name: 'company_rating', type: 'score', description: 'Company rating (1-5)', is_enriched: true },
      { name: 'benefits_score', type: 'score', description: 'Benefits score (1-10)', is_enriched: true },
      { name: 'equity_offered', type: 'boolean', description: 'Equity offered', is_enriched: true }
    ],
    sources: ['linkedin.com', 'indeed.com', 'glassdoor.com', 'levels.fyi'],
    domain: 'general'
  },
  {
    entity_type: 'market_data',
    keywords: ['market', 'industry', 'sector', 'trend', 'forecast', 'growth', 'size', 'share', 'analysis', 'report', 'tam', 'sam', 'som'],
    title_template: 'Market Analysis - {category}',
    description_template: 'Dataset of market segments with size, growth rates, and competitive analysis',
    columns: [
      { name: 'segment_name', type: 'string', description: 'Market segment name', is_enriched: false },
      { name: 'market_size_2024', type: 'currency', description: 'Market size (2024)', is_enriched: false },
      { name: 'market_size_2028', type: 'currency', description: 'Projected size (2028)', is_enriched: true },
      { name: 'cagr', type: 'percentage', description: 'CAGR (2024-2028)', is_enriched: false },
      { name: 'top_player', type: 'string', description: 'Market leader', is_enriched: false },
      { name: 'market_share_leader', type: 'percentage', description: 'Leader market share', is_enriched: true },
      { name: 'region', type: 'string', description: 'Geographic region', is_enriched: false },
      { name: 'key_driver', type: 'string', description: 'Key growth driver', is_enriched: true },
      { name: 'disruption_risk', type: 'score', description: 'Disruption risk (1-10)', is_enriched: true },
      { name: 'investment_outlook', type: 'trend', description: 'Investment outlook', is_enriched: true },
      { name: 'regulatory_impact', type: 'string', description: 'Regulatory impact', is_enriched: true },
      { name: 'entry_barrier', type: 'string', description: 'Barrier to entry', is_enriched: true }
    ],
    sources: ['statista.com', 'grandviewresearch.com', 'marketsandmarkets.com', 'ibisworld.com'],
    domain: 'finance'
  },
  {
    entity_type: 'healthcare_provider',
    keywords: ['hospital', 'healthcare', 'medical', 'clinic', 'physician', 'doctor', 'provider', 'medicare', 'medicaid', 'cms', 'npi'],
    title_template: 'Healthcare Providers - {category}',
    description_template: 'Dataset of healthcare providers with quality metrics, specialties, and patient volumes',
    columns: [
      { name: 'provider_name', type: 'string', description: 'Provider/facility name', is_enriched: false },
      { name: 'npi', type: 'string', description: 'National Provider Identifier', is_enriched: false },
      { name: 'provider_type', type: 'string', description: 'Provider type', is_enriched: false },
      { name: 'specialty', type: 'string', description: 'Medical specialty', is_enriched: false },
      { name: 'location', type: 'string', description: 'Location', is_enriched: false },
      { name: 'state', type: 'string', description: 'State', is_enriched: false },
      { name: 'bed_count', type: 'number', description: 'Hospital bed count', is_enriched: true },
      { name: 'quality_rating', type: 'score', description: 'CMS quality rating (1-5)', is_enriched: true },
      { name: 'patient_volume', type: 'number', description: 'Annual patient volume', is_enriched: true },
      { name: 'medicare_payments', type: 'currency', description: 'Medicare payments received', is_enriched: true },
      { name: 'readmission_rate', type: 'percentage', description: 'Readmission rate', is_enriched: true },
      { name: 'patient_satisfaction', type: 'score', description: 'Patient satisfaction (1-5)', is_enriched: true }
    ],
    sources: ['cms.gov', 'medicare.gov', 'healthgrades.com'],
    domain: 'healthcare'
  },
  {
    entity_type: 'economic_indicator',
    keywords: ['gdp', 'inflation', 'unemployment', 'economy', 'economic', 'fed', 'treasury', 'interest rate', 'cpi', 'ppi', 'bls'],
    title_template: 'Economic Indicators - {category}',
    description_template: 'Dataset of economic indicators with historical trends and forecasts',
    columns: [
      { name: 'indicator_name', type: 'string', description: 'Indicator name', is_enriched: false },
      { name: 'country', type: 'string', description: 'Country', is_enriched: false },
      { name: 'current_value', type: 'number', description: 'Current value', is_enriched: false },
      { name: 'previous_value', type: 'number', description: 'Previous period value', is_enriched: false },
      { name: 'yoy_change', type: 'percentage', description: 'Year-over-year change', is_enriched: true },
      { name: 'mom_change', type: 'percentage', description: 'Month-over-month change', is_enriched: true },
      { name: 'period', type: 'string', description: 'Time period', is_enriched: false },
      { name: 'unit', type: 'string', description: 'Measurement unit', is_enriched: false },
      { name: 'forecast_next', type: 'number', description: 'Next period forecast', is_enriched: true },
      { name: 'historical_avg', type: 'number', description: 'Historical average', is_enriched: true },
      { name: 'trend', type: 'trend', description: 'Trend direction', is_enriched: true },
      { name: 'source', type: 'string', description: 'Data source', is_enriched: false }
    ],
    sources: ['bls.gov', 'bea.gov', 'federalreserve.gov', 'treasury.gov', 'worldbank.org'],
    domain: 'finance'
  }
];

// Extended seed data for realistic generation
const EXTENDED_SEED_DATA = {
  federal_contractors: [
    'Lockheed Martin', 'Boeing', 'Raytheon Technologies', 'General Dynamics', 'Northrop Grumman',
    'BAE Systems', 'Leidos', 'L3Harris Technologies', 'Huntington Ingalls Industries', 'Booz Allen Hamilton',
    'SAIC', 'General Atomics', 'Parsons Corporation', 'CACI International', 'ManTech International',
    'Peraton', 'KBR Inc', 'Amentum', 'Jacobs Engineering', 'DXC Technology', 'MITRE Corporation',
    'Battelle Memorial', 'RAND Corporation', 'Aerospace Corporation', 'Johns Hopkins APL',
    'Noblis', 'LMI', 'CNA Corporation', 'IDA', 'Riverside Research'
  ],
  agencies: [
    'Department of Defense', 'Department of Veterans Affairs', 'Department of Homeland Security',
    'Department of Health and Human Services', 'General Services Administration', 'NASA',
    'Department of Energy', 'Department of Justice', 'Department of State', 'Department of Treasury',
    'Department of Agriculture', 'Department of Commerce', 'Department of Interior',
    'Department of Labor', 'Department of Transportation', 'Environmental Protection Agency',
    'Social Security Administration', 'National Science Foundation', 'Nuclear Regulatory Commission'
  ],
  startup_names: [
    'Anthropic', 'Databricks', 'Stripe', 'Figma', 'Notion', 'Airtable', 'Retool', 'dbt Labs',
    'Anduril Industries', 'SpaceX', 'Rivian', 'Discord', 'Canva', 'Plaid', 'Brex', 'Ramp',
    'Scale AI', 'OpenAI', 'Cohere', 'Hugging Face', 'Weights & Biases', 'Snorkel AI',
    'Vercel', 'Supabase', 'PlanetScale', 'Neon', 'Railway', 'Fly.io', 'Resend', 'Clerk',
    'Linear', 'Notion', 'Loom', 'Miro', 'Coda', 'Webflow', 'Framer', 'Builder.io'
  ],
  industries: [
    'Artificial Intelligence', 'Fintech', 'Healthcare Tech', 'Cybersecurity', 'Cloud Infrastructure',
    'Developer Tools', 'E-commerce', 'EdTech', 'Climate Tech', 'Defense Tech', 'Space Tech',
    'Biotech', 'Robotics', 'Quantum Computing', 'Web3/Blockchain', 'AR/VR', 'IoT',
    'Legal Tech', 'PropTech', 'InsurTech', 'AgTech', 'Clean Energy', 'Manufacturing Tech'
  ],
  locations: [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA',
    'Los Angeles, CA', 'Denver, CO', 'Chicago, IL', 'Miami, FL', 'Washington, DC',
    'San Diego, CA', 'Atlanta, GA', 'Raleigh, NC', 'Salt Lake City, UT', 'Phoenix, AZ',
    'Portland, OR', 'Nashville, TN', 'Pittsburgh, PA', 'Minneapolis, MN', 'Detroit, MI'
  ],
  states: [
    'California', 'Texas', 'Virginia', 'Maryland', 'Florida', 'New York', 'Massachusetts',
    'Colorado', 'Washington', 'Georgia', 'North Carolina', 'Pennsylvania', 'Illinois',
    'Arizona', 'Ohio', 'New Jersey', 'Connecticut', 'Utah', 'Tennessee', 'Oregon'
  ],
  tech_stacks: [
    'Python/TensorFlow', 'TypeScript/React', 'Go/Kubernetes', 'Rust/WebAssembly',
    'Java/Spring', 'Python/PyTorch', 'Node.js/GraphQL', 'Scala/Spark', 'C++/CUDA',
    'Elixir/Phoenix', 'Ruby/Rails', 'Swift/iOS', 'Kotlin/Android', 'Dart/Flutter'
  ],
  funding_rounds: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E+', 'Pre-IPO', 'Growth Equity'],
  business_models: ['SaaS', 'Platform', 'Marketplace', 'API-first', 'Enterprise', 'Consumer', 'B2B2C', 'Usage-based', 'Freemium'],
  remote_policies: ['Remote-first', 'Hybrid', 'On-site', 'Flexible', 'Remote-friendly', 'Fully Remote'],
  job_types: ['Full-time', 'Contract', 'Part-time', 'Internship', 'Freelance'],
  grant_types: ['R01', 'R21', 'R03', 'R15', 'R41', 'R42', 'R43', 'R44', 'K01', 'K08', 'K23', 'P01', 'U01'],
  research_areas: ['Cancer Research', 'Neuroscience', 'Infectious Disease', 'Cardiovascular', 'Diabetes', 'Mental Health', 'Genomics', 'Drug Discovery', 'Immunology', 'Aging'],
  patent_classifications: ['G06F', 'H04L', 'G16H', 'A61K', 'C12N', 'G01N', 'H01L', 'B60W', 'G06N', 'H04W'],
  clearance_levels: ['Unclassified', 'Confidential', 'Secret', 'Top Secret', 'TS/SCI'],
  economic_indicators: ['GDP Growth', 'Unemployment Rate', 'CPI Inflation', 'PPI', 'Consumer Confidence', 'PMI', 'Housing Starts', 'Retail Sales', 'Industrial Production'],
  countries: ['USA', 'China', 'Germany', 'Japan', 'UK', 'France', 'India', 'Canada', 'Brazil', 'Australia']
};

// ============================================================================
// PART 7: THE ULTIMATE DATA ENGINE v3.5
// ============================================================================

interface PromptAnalysis {
  entityType: string;
  schema: SchemaTemplate;
  count: number;
  keywords: string[];
  extractedEntities: Record<string, string[]>;
  timeRange: { start: string; end: string };
  category: string;
  state?: string;
  agency?: string;
  minValue?: number;
  maxValue?: number;
  patterns: {
    isTopN: boolean;
    topNCount: number;
    hasTimeRange: boolean;
    isComparison: boolean;
    wantsGrowth: boolean;
    wantsFunding: boolean;
    isGovernment: boolean;
    isTech: boolean;
    isHealthcare: boolean;
    isResearch: boolean;
    isPatent: boolean;
    isEconomic: boolean;
    wantsBreakdown: boolean;
    wantsYearlyData: boolean;
  };
  dataSources: string[];
  domain: string;
  confidence: number;
}

class UltimateDataEngine {
  private govAPIs = new ExtendedGovernmentAPIs();
  private nlp = new AdvancedNLPEngine();
  private ml = new AdvancedMLEngine();
  private fuzzy = new AdvancedFuzzyMatcher();
  private stats = new AdvancedStatisticsEngine();

  async generate(prompt: string, userId: string, options: {
    maxRows?: number;
    includeRealData?: boolean;
    enrichWithSentiment?: boolean;
    detectAnomalies?: boolean;
    clusterResults?: boolean;
  } = {}): Promise<{
    data: Record<string, any>[];
    insights: any;
    schema: any;
    sources: any[];
    title: string;
    description: string;
  }> {
    const maxRows = options.maxRows || 100;
    const startTime = Date.now();

    // PHASE 1: Deep NLP Analysis
    console.log('🧠 Phase 1: Deep NLP Analysis...');
    const analysis = this.analyzePrompt(prompt);
    this.nlp.setDomain(analysis.domain);

    // PHASE 2: Multi-source data gathering
    console.log('🌐 Phase 2: Multi-source API calls...');
    let realData: Record<string, any>[] = [];
    
    if (options.includeRealData !== false) {
      realData = await this.gatherRealData(analysis);
      console.log(`   Gathered ${realData.length} real records`);
    }

    // PHASE 3: Intelligent synthetic data generation
    console.log('⚡ Phase 3: Intelligent synthetic generation...');
    const neededRows = Math.max(0, maxRows - realData.length);
    const syntheticData = this.generateSyntheticData(analysis, neededRows);

    // PHASE 4: Advanced deduplication & merging
    console.log('🔗 Phase 4: Smart deduplication...');
    let mergedData = this.deduplicateData([...realData, ...syntheticData]);

    // PHASE 5: Domain-aware sentiment enrichment
    if (options.enrichWithSentiment) {
      console.log('💬 Phase 5: Sentiment enrichment...');
      mergedData = this.enrichWithSentiment(mergedData, analysis.domain);
    }

    // PHASE 6: ML-powered analysis
    console.log('🤖 Phase 6: ML analysis pipeline...');
    if (options.detectAnomalies) {
      mergedData = this.applyAnomalyDetection(mergedData, analysis.schema);
    }
    if (options.clusterResults && mergedData.length >= 10) {
      mergedData = this.applyClustering(mergedData, analysis.schema);
    }

    // PHASE 7: Statistical insights generation
    console.log('📊 Phase 7: Statistical insights...');
    const insights = this.generateInsights(mergedData, analysis);

    // Final data
    const finalData = mergedData.slice(0, maxRows);
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Generation complete: ${finalData.length} records in ${processingTime}ms`);

    return {
      data: finalData,
      insights: {
        ...insights,
        processingTimeMs: processingTime,
        engineVersion: 'v3.5-nuclear'
      },
      schema: {
        entity_type: analysis.entityType,
        columns: analysis.schema.columns,
        domain: analysis.domain
      },
      sources: analysis.dataSources.map(s => ({
        name: s,
        type: s.includes('.gov') ? 'government' : 'web',
        reliability: s.includes('.gov') ? 0.95 : 0.75
      })),
      title: analysis.schema.title_template.replace('{category}', analysis.category),
      description: analysis.schema.description_template
    };
  }

  private analyzePrompt(prompt: string): PromptAnalysis {
    // Extract keywords with RAKE
    const keywords = this.nlp.extractKeywords(prompt, 15).map(k => k.phrase);
    
    // Extract named entities
    const extractedEntities = this.nlp.extractEntities(prompt);
    
    // Detect numeric patterns
    const topNMatch = prompt.match(/\b(top|best|leading|largest|biggest|major)\s+(\d+)\b/i);
    const timeRangeMatch = prompt.match(/(\d{4})[-–](\d{4})/);
    const lastNYearsMatch = prompt.match(/\b(?:last|past)\s+(\d+)\s+years?\b/i);
    const valueMatch = prompt.match(/\$?([\d,]+(?:\.\d+)?)\s*(?:M|million|B|billion|K|thousand)?(?:\+|\s*or\s*more)?/i);
    
    // State detection
    const stateMatch = extractedEntities.location?.[0] || 
      prompt.match(/\bin\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i);
    
    // Pattern detection
    const patterns = {
      isTopN: !!topNMatch,
      topNCount: topNMatch ? parseInt(topNMatch[2]) : 50,
      hasTimeRange: !!timeRangeMatch || !!lastNYearsMatch,
      isComparison: /\b(compare|versus|vs\.?|against|between)\b/i.test(prompt),
      wantsGrowth: /\b(growth|growing|trend|trending|increase|rise)\b/i.test(prompt),
      wantsFunding: /\b(funded|funding|raised|investment|series|capital|vc|venture)\b/i.test(prompt),
      isGovernment: /\b(federal|government|contractor|agency|grant|defense|dod|gsa|usaid|navy|army|air force|contract|award|procurement|obligation)\b/i.test(prompt),
      isTech: /\b(tech|software|saas|ai|data|cloud|platform|startup|machine learning|api|developer)\b/i.test(prompt),
      isHealthcare: /\b(healthcare|medical|hospital|clinical|pharma|biotech|fda|nih|drug|patient|treatment)\b/i.test(prompt),
      isResearch: /\b(research|grant|nih|nsf|academic|university|study|pi|investigator|publication)\b/i.test(prompt),
      isPatent: /\b(patent|invention|ip|intellectual property|uspto|inventor|assignee)\b/i.test(prompt),
      isEconomic: /\b(gdp|inflation|unemployment|economy|economic|fed|treasury|interest rate|cpi)\b/i.test(prompt),
      wantsBreakdown: /\b(breakdown|broken down|by|per|each|grouped)\b/i.test(prompt),
      wantsYearlyData: /\b(yearly|annual|year[- ]over[- ]year|yoy|by year|per year|each year)\b/i.test(prompt)
    };

    // Calculate time range
    let timeRange = { start: '2020', end: '2025' };
    if (timeRangeMatch) {
      timeRange = { start: timeRangeMatch[1], end: timeRangeMatch[2] };
    } else if (lastNYearsMatch) {
      const years = parseInt(lastNYearsMatch[1]);
      const currentYear = new Date().getFullYear();
      timeRange = { start: String(currentYear - years), end: String(currentYear) };
    }

    // Parse value filter
    let minValue: number | undefined;
    if (valueMatch) {
      let value = parseFloat(valueMatch[1].replace(/,/g, ''));
      const multiplier = /M|million/i.test(prompt) ? 1e6 : /B|billion/i.test(prompt) ? 1e9 : /K|thousand/i.test(prompt) ? 1e3 : 1;
      minValue = value * multiplier;
    }

    // Determine entity type
    let bestMatch: SchemaTemplate = SCHEMA_TEMPLATES[0];
    let bestScore = 0;

    for (const template of SCHEMA_TEMPLATES) {
      let score = 0;
      const promptLower = prompt.toLowerCase();
      
      for (const keyword of template.keywords) {
        if (promptLower.includes(keyword)) score += 2;
      }
      
      for (const kw of keywords) {
        if (template.keywords.some(tk => kw.includes(tk) || tk.includes(kw))) score += 1;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    // Override based on strong signals
    if (patterns.isGovernment && bestMatch.entity_type !== 'federal_contractor') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'federal_contractor') || bestMatch;
    } else if (patterns.isResearch && bestMatch.entity_type !== 'research_grant') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'research_grant') || bestMatch;
    } else if (patterns.isPatent && bestMatch.entity_type !== 'patent') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'patent') || bestMatch;
    } else if (patterns.isEconomic && bestMatch.entity_type !== 'economic_indicator') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'economic_indicator') || bestMatch;
    } else if (patterns.isHealthcare && bestMatch.entity_type !== 'healthcare_provider') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'healthcare_provider') || bestMatch;
    } else if (patterns.wantsFunding && !patterns.isGovernment && bestMatch.entity_type !== 'startup') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'startup') || bestMatch;
    }

    // Determine data sources
    const dataSources: string[] = [...bestMatch.sources];
    if (patterns.isGovernment) {
      dataSources.push('treasury.gov', 'data.gov');
    }
    if (patterns.isResearch) {
      dataSources.push('reporter.nih.gov', 'grants.gov');
    }
    if (patterns.isPatent) {
      dataSources.push('patentsview.org');
    }

    // Extract category
    const categoryMatch = prompt.match(/\b(ai|saas|fintech|healthcare|defense|cybersecurity|cloud|data|software|tech|federal|government|biotech|research|pharma|energy|manufacturing)\b/i);
    const category = categoryMatch ? categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1).toLowerCase() : 'Technology';

    // Calculate confidence
    const confidence = Math.min(1, bestScore / 10);

    return {
      entityType: bestMatch.entity_type,
      schema: bestMatch,
      count: patterns.isTopN ? patterns.topNCount : 50,
      keywords,
      extractedEntities,
      timeRange,
      category,
      state: typeof stateMatch === 'string' ? stateMatch : stateMatch?.[1],
      minValue,
      patterns,
      dataSources: [...new Set(dataSources)],
      domain: bestMatch.domain,
      confidence
    };
  }

  private async gatherRealData(analysis: PromptAnalysis): Promise<Record<string, any>[]> {
    const results: Record<string, any>[] = [];

    try {
      // Federal contracts
      if (analysis.patterns.isGovernment) {
        const contracts = await this.govAPIs.getFederalContracts({
          keywords: analysis.keywords.slice(0, 5),
          state: analysis.state,
          limit: analysis.count * 2,
          minValue: analysis.minValue,
          timeRange: { start: `${analysis.timeRange.start}-01-01`, end: `${analysis.timeRange.end}-12-31` }
        });

        for (const contract of contracts) {
          results.push({
            company_name: contract.recipient_name,
            total_contract_value: contract.total_obligation,
            primary_agency: contract.awarding_agency_name,
            naics_code: contract.naics_code,
            hq_state: contract.place_of_performance_state || analysis.state,
            description: contract.description,
            source: 'usaspending.gov',
            source_type: 'government_api'
          });
        }
      }

      // Research grants
      if (analysis.patterns.isResearch) {
        const grants = await this.govAPIs.searchNIHGrants(analysis.keywords.join(' '));
        for (const grant of grants) {
          results.push({
            project_title: grant.project_title,
            organization_name: grant.organization_name,
            award_amount: grant.award_amount,
            fiscal_year: grant.fiscal_year,
            principal_investigator: grant.pi_names?.[0],
            source: 'reporter.nih.gov',
            source_type: 'government_api'
          });
        }
      }

      // Patents
      if (analysis.patterns.isPatent) {
        const patents = await this.govAPIs.searchPatents(analysis.keywords.join(' '));
        for (const patent of patents) {
          results.push({
            patent_number: patent.patent_number,
            patent_title: patent.patent_title,
            assignee: patent.assignee_organization,
            grant_date: patent.patent_date,
            source: 'patentsview.org',
            source_type: 'government_api'
          });
        }
      }

      // SEC data for public companies
      if (analysis.entityType === 'public_company' || analysis.patterns.wantsFunding) {
        const secCompanies = await this.govAPIs.searchSECCompanies(analysis.keywords.slice(0, 3).join(' '));
        for (const company of secCompanies.slice(0, 20)) {
          results.push({
            company_name: company.name,
            ticker: company.ticker,
            cik: company.cik,
            source: 'sec.gov',
            source_type: 'government_api'
          });
        }
      }

    } catch (error) {
      console.error('Error gathering real data:', error);
    }

    return results;
  }

  private generateSyntheticData(analysis: PromptAnalysis, count: number): Record<string, any>[] {
    const data: Record<string, any>[] = [];
    const schema = analysis.schema;

    // If yearly breakdown requested, generate per-year data
    if (analysis.patterns.wantsYearlyData) {
      const startYear = parseInt(analysis.timeRange.start);
      const endYear = parseInt(analysis.timeRange.end);
      const years = endYear - startYear + 1;
      const recordsPerYear = Math.ceil(count / years);

      for (let year = startYear; year <= endYear; year++) {
        for (let i = 0; i < recordsPerYear && data.length < count; i++) {
          const record = this.generateRecord(schema, i, analysis);
          record.fiscal_year = year;
          record.year = year;
          data.push(record);
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        data.push(this.generateRecord(schema, i, analysis));
      }
    }

    return data;
  }

  private generateRecord(schema: SchemaTemplate, index: number, analysis: PromptAnalysis): Record<string, any> {
    const record: Record<string, any> = {};

    for (const col of schema.columns) {
      record[col.name] = this.generateValue(col, index, analysis);
    }

    // Apply state filter if specified
    if (analysis.state) {
      const stateCol = schema.columns.find(c => c.name.includes('state') || c.name.includes('location'));
      if (stateCol) {
        record[stateCol.name] = analysis.state;
      }
    }

    record.source = 'synthetic';
    record.source_type = 'generated';
    return record;
  }

  private generateValue(col: ColumnDef, index: number, analysis: PromptAnalysis): any {
    const rand = () => Math.random();
    const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    switch (col.type) {
      case 'string':
        return this.generateStringValue(col.name, index, analysis);

      case 'number':
        if (col.name.includes('employee')) return randInt(10, 50000);
        if (col.name.includes('year') || col.name.includes('fiscal')) return randInt(parseInt(analysis.timeRange.start), parseInt(analysis.timeRange.end));
        if (col.name.includes('experience')) return randInt(1, 15);
        if (col.name.includes('stars')) return randInt(100, 50000);
        if (col.name.includes('ratio')) return Math.round((rand() * 50 + 5) * 10) / 10;
        if (col.name.includes('claims')) return randInt(5, 100);
        if (col.name.includes('citations')) return randInt(0, 500);
        if (col.name.includes('bed')) return randInt(50, 1000);
        if (col.name.includes('patient') || col.name.includes('volume')) return randInt(10000, 500000);
        if (col.name.includes('publications')) return randInt(0, 50);
        if (col.name.includes('runway')) return randInt(6, 36);
        if (col.name.includes('contract_count')) return randInt(1, 50);
        return randInt(1, 1000);

      case 'currency':
        const minVal = analysis.minValue || 100000;
        if (col.name.includes('salary')) return randInt(80000, 350000);
        if (col.name.includes('revenue')) return randInt(minVal, 500000000);
        if (col.name.includes('funding')) return randInt(minVal, 200000000);
        if (col.name.includes('valuation')) return randInt(minVal * 10, 5000000000);
        if (col.name.includes('contract') || col.name.includes('award')) return randInt(minVal, 500000000);
        if (col.name.includes('market_size')) return randInt(1000000000, 100000000000);
        if (col.name.includes('burn')) return randInt(100000, 5000000);
        if (col.name.includes('medicare') || col.name.includes('payment')) return randInt(1000000, 50000000);
        return randInt(minVal, 10000000);

      case 'percentage':
        if (col.generator === 'trend_percentage') {
          return Math.round((rand() * 60 - 10) * 10) / 10;
        }
        if (col.name.includes('readmission')) return Math.round(rand() * 15 * 10) / 10;
        if (col.name.includes('margin')) return Math.round((rand() * 60 + 20) * 10) / 10;
        if (col.name.includes('dividend')) return Math.round(rand() * 5 * 100) / 100;
        if (col.name.includes('share')) return Math.round((rand() * 40 + 5) * 10) / 10;
        if (col.name.includes('cagr')) return Math.round((rand() * 30 + 5) * 10) / 10;
        return Math.round(rand() * 100 * 10) / 10;

      case 'date':
        const startYear = parseInt(analysis.timeRange.start);
        const endYear = parseInt(analysis.timeRange.end);
        const year = randInt(startYear, endYear);
        const month = String(randInt(1, 12)).padStart(2, '0');
        const day = String(randInt(1, 28)).padStart(2, '0');
        return `${year}-${month}-${day}`;

      case 'email':
        const name = this.generateStringValue('company_name', index, analysis);
        return `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`;

      case 'url':
        const company = this.generateStringValue('company_name', index, analysis);
        return `https://www.${company.toLowerCase().replace(/[^a-z]/g, '')}.com`;

      case 'score':
        if (col.name.includes('disruption')) return Math.round(rand() * 10 * 10) / 10;
        if (col.name.includes('patent')) return Math.round((rand() * 9 + 1) * 10) / 10;
        if (col.name.includes('benefits')) return Math.round((rand() * 9 + 1) * 10) / 10;
        return Math.round((rand() * 4 + 1) * 10) / 10;

      case 'trend':
        return pick(['Bullish', 'Bearish', 'Neutral', 'Strong Buy', 'Hold', 'Outperform', 'Underperform']);

      case 'boolean':
        return rand() > 0.5;

      case 'phone':
        return `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`;

      case 'array':
        return [this.generateStringValue('skill', index, analysis), this.generateStringValue('skill', index, analysis)];

      default:
        return null;
    }
  }

  private generateStringValue(colName: string, index: number, analysis: PromptAnalysis): string {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    if (colName.includes('company') || colName.includes('name') || colName.includes('organization')) {
      if (analysis.entityType === 'federal_contractor') {
        return pick(EXTENDED_SEED_DATA.federal_contractors);
      } else if (analysis.entityType === 'startup') {
        return pick(EXTENDED_SEED_DATA.startup_names);
      } else {
        return pick([...EXTENDED_SEED_DATA.startup_names, ...EXTENDED_SEED_DATA.federal_contractors]);
      }
    }

    if (colName.includes('agency')) return pick(EXTENDED_SEED_DATA.agencies);
    if (colName.includes('industry') || colName.includes('sector') || colName.includes('category')) return pick(EXTENDED_SEED_DATA.industries);
    if (colName.includes('location') || colName.includes('hq')) return pick(EXTENDED_SEED_DATA.locations);
    if (colName.includes('state')) return analysis.state || pick(EXTENDED_SEED_DATA.states);
    if (colName.includes('round')) return pick(EXTENDED_SEED_DATA.funding_rounds);
    if (colName.includes('model')) return pick(EXTENDED_SEED_DATA.business_models);
    if (colName.includes('remote')) return pick(EXTENDED_SEED_DATA.remote_policies);
    if (colName.includes('job_type') || colName.includes('employment')) return pick(EXTENDED_SEED_DATA.job_types);
    if (colName.includes('tech') || colName.includes('stack') || colName.includes('primary_tech')) return pick(EXTENDED_SEED_DATA.tech_stacks);
    if (colName.includes('stage')) return pick(['Early-stage', 'Growth', 'Late-stage', 'Pre-IPO', 'Seed', 'Series A-B']);
    if (colName.includes('exchange')) return pick(['NYSE', 'NASDAQ', 'AMEX', 'OTC']);
    if (colName.includes('ticker')) return this.generateTicker();
    if (colName.includes('naics')) return String(Math.floor(Math.random() * 900000) + 100000);
    if (colName.includes('psc')) return this.generatePSCCode();
    if (colName.includes('cage')) return this.generateCAGECode();
    if (colName.includes('uei')) return this.generateUEI();
    if (colName.includes('npi')) return this.generateNPI();
    if (colName.includes('clearance')) return pick(EXTENDED_SEED_DATA.clearance_levels);
    if (colName.includes('grant_type')) return pick(EXTENDED_SEED_DATA.grant_types);
    if (colName.includes('research_area') || colName.includes('specialty')) return pick(EXTENDED_SEED_DATA.research_areas);
    if (colName.includes('classification')) return pick(EXTENDED_SEED_DATA.patent_classifications);
    if (colName.includes('country')) return pick(EXTENDED_SEED_DATA.countries);
    if (colName.includes('indicator')) return pick(EXTENDED_SEED_DATA.economic_indicators);
    if (colName.includes('driver')) return pick(['AI adoption', 'Digital transformation', 'Cloud migration', 'Remote work', 'Automation', 'Sustainability', 'Regulatory changes']);
    if (colName.includes('skill')) return pick(['Python', 'JavaScript', 'AWS', 'Leadership', 'Communication', 'Data Analysis', 'Machine Learning', 'Kubernetes', 'React', 'SQL']);
    if (colName.includes('barrier')) return pick(['High capital requirements', 'Regulatory hurdles', 'Network effects', 'Brand loyalty', 'Technical expertise', 'Patents']);
    if (colName.includes('regulatory')) return pick(['Favorable', 'Neutral', 'Challenging', 'Evolving', 'Strict compliance required']);
    if (colName.includes('title') && colName.includes('job')) {
      return pick(['Senior Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'UX Designer', 'Engineering Manager', 'Staff Engineer', 'Principal Architect']);
    }
    if (colName.includes('title') && colName.includes('project')) {
      return pick(['Novel Therapeutic Approaches', 'AI-Driven Drug Discovery', 'Genomic Analysis Platform', 'Neural Interface Development', 'Climate Modeling System']);
    }
    if (colName.includes('title') && colName.includes('patent')) {
      return pick(['System and Method for AI Processing', 'Distributed Computing Architecture', 'Novel Drug Compound', 'Autonomous Vehicle Control', 'Quantum Computing Algorithm']);
    }
    if (colName.includes('segment') || colName.includes('market')) {
      return pick(['Enterprise Software', 'Cloud Computing', 'Cybersecurity', 'AI/ML', 'Healthcare IT', 'Fintech', 'Defense Tech', 'Climate Tech']);
    }
    if (colName.includes('player') || colName.includes('leader')) return pick([...EXTENDED_SEED_DATA.startup_names, ...EXTENDED_SEED_DATA.federal_contractors]);
    if (colName.includes('region')) return pick(['North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East & Africa']);
    if (colName.includes('unit')) return pick(['%', 'USD', 'Index', 'Millions', 'Thousands']);
    if (colName.includes('period')) return pick(['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'FY2024', 'January 2024']);
    if (colName.includes('provider_type')) return pick(['Hospital', 'Clinic', 'Physician Group', 'Specialty Practice', 'Ambulatory Center']);
    if (colName.includes('investigator') || colName.includes('inventor')) return this.generatePersonName();
    if (colName.includes('assignee')) return pick([...EXTENDED_SEED_DATA.startup_names, 'IBM', 'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta']);
    if (colName.includes('patent_type')) return pick(['Utility', 'Design', 'Plant', 'Reissue']);

    return `Item_${index + 1}`;
  }

  private generateTicker(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const length = Math.random() > 0.5 ? 4 : 3;
    let ticker = '';
    for (let i = 0; i < length; i++) {
      ticker += letters[Math.floor(Math.random() * letters.length)];
    }
    return ticker;
  }

  private generateCAGECode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private generateUEI(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let uei = '';
    for (let i = 0; i < 12; i++) {
      uei += chars[Math.floor(Math.random() * chars.length)];
    }
    return uei;
  }

  private generateNPI(): string {
    let npi = '';
    for (let i = 0; i < 10; i++) {
      npi += Math.floor(Math.random() * 10);
    }
    return npi;
  }

  private generatePSCCode(): string {
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const digits = '0123456789';
    return letters[Math.floor(Math.random() * letters.length)] + 
           digits[Math.floor(Math.random() * 10)] + 
           digits[Math.floor(Math.random() * 10)] + 
           digits[Math.floor(Math.random() * 10)];
  }

  private generatePersonName(): string {
    const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'Robert', 'Lisa', 'William', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  private deduplicateData(data: Record<string, any>[]): Record<string, any>[] {
    const nameKey = data[0] && Object.keys(data[0]).find(k => k.includes('name') || k.includes('company') || k.includes('title'));
    if (!nameKey) return data;

    const seen = new Map<string, Record<string, any>>();
    
    for (const item of data) {
      const name = this.fuzzy.normalizeCompanyName(String(item[nameKey] || ''));
      
      if (!seen.has(name)) {
        seen.set(name, item);
      } else {
        const existing = seen.get(name)!;
        // Prefer government sources
        if (item.source?.includes('.gov') && !existing.source?.includes('.gov')) {
          seen.set(name, { ...existing, ...item });
        } else {
          seen.set(name, { ...item, ...existing });
        }
      }
    }

    return Array.from(seen.values());
  }

  private enrichWithSentiment(data: Record<string, any>[], domain: string): Record<string, any>[] {
    this.nlp.setDomain(domain);
    const nameKey = data[0] && Object.keys(data[0]).find(k => k.includes('name') || k.includes('company') || k.includes('title'));
    
    return data.map(item => {
      const text = nameKey ? String(item[nameKey]) + ' ' + (item.description || '') : '';
      const sentiment = this.nlp.analyzeSentiment(text, domain);
      
      return {
        ...item,
        sentiment_score: Math.round(sentiment.comparative * 100) / 100,
        sentiment_classification: sentiment.classification,
        sentiment_confidence: Math.round(sentiment.confidence * 100) / 100
      };
    });
  }

  private applyAnomalyDetection(data: Record<string, any>[], schema: SchemaTemplate): Record<string, any>[] {
    const numericCols = schema.columns
      .filter(c => ['number', 'currency', 'percentage'].includes(c.type))
      .map(c => c.name);

    for (const col of numericCols) {
      const values = data.map(d => d[col]).filter(v => typeof v === 'number') as number[];
      if (values.length < 5) continue;

      const anomalies = this.ml.detectAnomalies(values, 'iqr', 1.5);
      const anomalyIndices = new Set(anomalies.map(a => a.index));

      data.forEach((item, idx) => {
        if (anomalyIndices.has(idx)) {
          item.is_anomaly = true;
          item.anomaly_columns = item.anomaly_columns || [];
          item.anomaly_columns.push(col);
        }
      });
    }

    return data;
  }

  private applyClustering(data: Record<string, any>[], schema: SchemaTemplate): Record<string, any>[] {
    const numericCols = schema.columns
      .filter(c => ['number', 'currency'].includes(c.type))
      .map(c => c.name)
      .slice(0, 3);

    if (numericCols.length < 2) return data;

    const numericData = data.map(d => numericCols.map(col => d[col] || 0));
    const k = Math.min(5, Math.floor(data.length / 10));
    
    if (k < 2) return data;

    const { assignments, silhouetteScore } = this.ml.kMeansClustering(numericData, k);
    
    const clusterNames = ['Market Leaders', 'High Growth', 'Emerging Players', 'Steady Performers', 'Niche Specialists'];
    
    assignments.forEach((cluster, i) => {
      if (data[i]) {
        data[i].cluster = cluster;
        data[i].cluster_name = clusterNames[cluster] || `Cluster ${cluster + 1}`;
      }
    });

    // Add silhouette score to first record for reference
    if (data[0]) {
      data[0]._cluster_quality = Math.round(silhouetteScore * 100) / 100;
    }

    return data;
  }

  private generateInsights(data: Record<string, any>[], analysis: PromptAnalysis): any {
    const schema = analysis.schema;
    
    const numericCols = schema.columns
      .filter(c => ['number', 'currency', 'percentage'].includes(c.type))
      .map(c => c.name);

    // Calculate statistics
    const summary: Record<string, any> = {};
    for (const col of numericCols) {
      const values = data.map(d => d[col]).filter(v => typeof v === 'number') as number[];
      if (values.length > 0) {
        summary[col] = this.stats.describe(values);
      }
    }

    // Category distributions
    const stringCols = schema.columns
      .filter(c => c.type === 'string' && (c.name.includes('industry') || c.name.includes('sector') || c.name.includes('agency') || c.name.includes('state')))
      .map(c => c.name);

    const distributions: Record<string, any[]> = {};
    for (const col of stringCols) {
      const values = data.map(d => d[col]).filter(v => v != null);
      if (values.length > 0) {
        distributions[col] = this.stats.distribution(values).slice(0, 10);
      }
    }

    // Correlation analysis
    const correlations: Record<string, number> = {};
    if (numericCols.length >= 2) {
      for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
          const x = data.map(d => d[numericCols[i]]).filter(v => typeof v === 'number') as number[];
          const y = data.map(d => d[numericCols[j]]).filter(v => typeof v === 'number') as number[];
          if (x.length === y.length && x.length > 5) {
            const corr = this.stats.correlation(x, y);
            if (Math.abs(corr) > 0.3) {
              correlations[`${numericCols[i]}_vs_${numericCols[j]}`] = Math.round(corr * 100) / 100;
            }
          }
        }
      }
    }

    // Generate insights
    const keyFindings = this.generateKeyFindings(data, summary, analysis);
    const keyMetrics = this.generateKeyMetrics(data, summary, analysis);
    const recommendations = this.getRecommendations(analysis.entityType, analysis.category);
    const dataQualityScore = this.calculateDataQualityScore(data, schema);

    // Trend analysis if we have yearly data
    let trendAnalysis: any = null;
    if (analysis.patterns.wantsYearlyData && data.some(d => d.fiscal_year || d.year)) {
      trendAnalysis = this.generateTrendAnalysis(data, numericCols, analysis);
    }

    return {
      summary: `Generated ${data.length} ${analysis.entityType.replace(/_/g, ' ')} records with ${numericCols.length} metrics and ${Object.keys(distributions).length} categorical dimensions.`,
      totalRecords: data.length,
      keyFindings,
      keyMetrics,
      topCategories: Object.values(distributions)[0]?.slice(0, 5).map(d => String(d.value)) || [],
      recommendations,
      dataQualityScore,
      statistics: summary,
      distributions,
      correlations,
      trendAnalysis,
      methodology: 'ultimate-engine-v3.5',
      processingDetails: {
        nlpKeywordsExtracted: analysis.keywords.length,
        entityTypeDetected: analysis.entityType,
        dataSourcesUsed: analysis.dataSources.length,
        clusteringApplied: data.some(d => d.cluster !== undefined),
        anomaliesDetected: data.filter(d => d.is_anomaly).length,
        confidenceScore: Math.round(analysis.confidence * 100)
      }
    };
  }

  private generateTrendAnalysis(data: Record<string, any>[], numericCols: string[], analysis: PromptAnalysis): any {
    const yearCol = data[0]?.fiscal_year !== undefined ? 'fiscal_year' : 'year';
    const years = [...new Set(data.map(d => d[yearCol]).filter(y => y != null))].sort();
    
    if (years.length < 2) return null;

    const trends: Record<string, any> = {};
    
    for (const col of numericCols.slice(0, 3)) {
      const yearlyData = years.map(year => {
        const yearRecords = data.filter(d => d[yearCol] === year);
        const values = yearRecords.map(d => d[col]).filter(v => typeof v === 'number') as number[];
        return {
          year,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          count: values.length
        };
      });

      const regression = this.ml.linearRegression(
        yearlyData.map((_, i) => i),
        yearlyData.map(d => d.sum)
      );

      trends[col] = {
        yearlyData,
        trend: regression.slope > 0 ? 'increasing' : regression.slope < 0 ? 'decreasing' : 'stable',
        rSquared: Math.round(regression.rSquared * 100) / 100,
        forecastNextYear: Math.round(regression.predict(years.length))
      };
    }

    return {
      years,
      trends,
      periodCovered: `${years[0]} - ${years[years.length - 1]}`
    };
  }

  private generateKeyFindings(data: Record<string, any>[], summary: Record<string, any>, analysis: PromptAnalysis): string[] {
    const findings: string[] = [];

    // Top entity by value
    const valueCol = Object.keys(summary).find(k => k.includes('value') || k.includes('revenue') || k.includes('funding') || k.includes('award'));
    if (valueCol && summary[valueCol]) {
      const sorted = [...data].sort((a, b) => (b[valueCol] || 0) - (a[valueCol] || 0));
      const nameKey = Object.keys(data[0]).find(k => k.includes('name') || k.includes('title'));
      if (sorted[0] && nameKey) {
        findings.push(`${sorted[0][nameKey]} leads with ${this.formatCurrency(sorted[0][valueCol])} in ${valueCol.replace(/_/g, ' ')}`);
      }
    }

    // Growth trends
    const growthCol = Object.keys(summary).find(k => k.includes('growth') || k.includes('yoy') || k.includes('cagr'));
    if (growthCol && summary[growthCol]) {
      const avgGrowth = summary[growthCol].mean;
      const trend = avgGrowth > 15 ? 'exceptional growth' : avgGrowth > 10 ? 'strong growth' : avgGrowth > 0 ? 'moderate growth' : 'decline';
      findings.push(`Average ${growthCol.replace(/_/g, ' ')} shows ${trend} at ${avgGrowth.toFixed(1)}%`);
    }

    // Distribution insight
    const stateCol = data[0] && Object.keys(data[0]).find(k => k.includes('state') || k.includes('location'));
    if (stateCol) {
      const stateDist = this.stats.distribution(data.map(d => d[stateCol]).filter(v => v));
      if (stateDist[0]) {
        findings.push(`${stateDist[0].value} leads with ${stateDist[0].count} entities (${stateDist[0].percentage.toFixed(1)}% of total)`);
      }
    }

    // Entity-specific findings
    if (analysis.entityType === 'federal_contractor') {
      const smallBizCount = data.filter(d => d.small_business === true).length;
      if (smallBizCount > 0) {
        findings.push(`${smallBizCount} companies (${Math.round(smallBizCount / data.length * 100)}%) are small business certified`);
      }
    }

    // Clustering insight
    if (data.some(d => d.cluster !== undefined)) {
      const clusterDist = this.stats.distribution(data.map(d => d.cluster_name).filter(v => v));
      if (clusterDist[0]) {
        findings.push(`"${clusterDist[0].value}" is the largest cluster with ${clusterDist[0].count} entities`);
      }
    }

    // Anomalies
    const anomalyCount = data.filter(d => d.is_anomaly).length;
    if (anomalyCount > 0) {
      findings.push(`${anomalyCount} outlier entities detected with unusual metrics`);
    }

    return findings.slice(0, 6);
  }

  private generateKeyMetrics(data: Record<string, any>[], summary: Record<string, any>, analysis: PromptAnalysis): Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }> {
    const metrics: Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }> = [];

    // Total value
    const valueCol = Object.keys(summary).find(k => k.includes('value') || k.includes('revenue') || k.includes('funding') || k.includes('award'));
    if (valueCol && summary[valueCol]) {
      metrics.push({
        label: `Total ${valueCol.replace(/_/g, ' ')}`,
        value: this.formatCurrency(summary[valueCol].sum),
        trend: 'up'
      });
    }

    // Average metric
    const avgCol = Object.keys(summary).find(k => !k.includes('growth') && !k.includes('ratio'));
    if (avgCol && summary[avgCol]) {
      metrics.push({
        label: `Avg ${avgCol.replace(/_/g, ' ')}`,
        value: summary[avgCol].mean >= 1000 ? this.formatCurrency(summary[avgCol].mean) : summary[avgCol].mean.toFixed(1),
        trend: summary[avgCol].mean > summary[avgCol].median ? 'up' : 'stable'
      });
    }

    // Growth metric
    const growthCol = Object.keys(summary).find(k => k.includes('growth') || k.includes('cagr'));
    if (growthCol && summary[growthCol]) {
      const avgGrowth = summary[growthCol].mean;
      metrics.push({
        label: 'Avg Growth Rate',
        value: `${avgGrowth.toFixed(1)}%`,
        trend: avgGrowth > 5 ? 'up' : avgGrowth < -5 ? 'down' : 'stable'
      });
    }

    // Record count
    metrics.push({
      label: 'Records Analyzed',
      value: data.length.toLocaleString(),
      trend: 'stable'
    });

    return metrics.slice(0, 4);
  }

  private getRecommendations(entityType: string, category: string): string[] {
    const recs: Record<string, string[]> = {
      federal_contractor: [
        'Target mid-tier contractors with strong past performance for teaming arrangements',
        'Focus on contractors with complementary NAICS codes for joint ventures',
        'Prioritize companies with active GSA schedules for faster procurement',
        'Consider HUBZone and 8(a) certified firms for set-aside opportunities',
        'Evaluate contractors with high CPARS ratings for reduced performance risk'
      ],
      startup: [
        'Focus on Series A/B companies for partnership opportunities before they scale',
        'Target startups with recent funding for expansion-ready capabilities',
        'Consider companies with complementary technologies for integration plays',
        'Evaluate burn rate vs. funding to identify sustainable growth candidates',
        'Look for startups with strong technical teams and clear product-market fit'
      ],
      public_company: [
        'Analyze PE ratios relative to sector averages for value opportunities',
        'Focus on companies with consistent revenue growth over 3+ quarters',
        'Consider market cap trends to identify momentum shifts',
        'Evaluate analyst ratings for consensus sentiment signals',
        'Look for companies with strong free cash flow generation'
      ],
      research_grant: [
        'Target PIs with strong publication records for collaboration opportunities',
        'Focus on grants with multi-year funding for sustained research partnerships',
        'Consider grants in adjacent research areas for interdisciplinary projects',
        'Evaluate institutions with strong tech transfer programs for licensing opportunities',
        'Look for grants with industry partnerships already established'
      ],
      patent: [
        'Focus on patents with high citation counts for technology leadership indicators',
        'Consider patents near expiration for generic/licensing opportunities',
        'Evaluate patent portfolios for acquisition targets',
        'Look for continuation patents indicating active development',
        'Analyze assignee patterns for M&A intelligence'
      ],
      tech_company: [
        'Prioritize companies with open APIs for easier integration',
        'Target firms with SOC2/ISO certifications for enterprise readiness',
        'Consider GitHub activity as a proxy for engineering velocity',
        'Evaluate companies with strong developer communities for ecosystem plays',
        'Focus on firms with clear AI/ML roadmaps for future-proofing'
      ],
      healthcare_provider: [
        'Target providers with high CMS quality ratings for referral partnerships',
        'Focus on facilities with low readmission rates for value-based care programs',
        'Consider providers in underserved areas for expansion opportunities',
        'Evaluate patient satisfaction scores for experience improvement benchmarks',
        'Look for providers with strong telehealth capabilities'
      ],
      economic_indicator: [
        'Monitor leading indicators for economic cycle positioning',
        'Compare regional indicators for geographic expansion decisions',
        'Track sector-specific metrics for industry timing',
        'Evaluate correlation patterns for diversification strategies',
        'Consider policy indicators for regulatory risk assessment'
      ]
    };

    return recs[entityType] || recs.tech_company;
  }

  private calculateDataQualityScore(data: Record<string, any>[], schema: SchemaTemplate): number {
    if (data.length === 0) return 0;

    let totalScore = 0;
    const columns = schema.columns.map(c => c.name);

    for (const item of data) {
      let itemScore = 0;
      let validFields = 0;

      for (const col of columns) {
        if (item[col] !== null && item[col] !== undefined && item[col] !== '') {
          validFields++;
        }
      }

      itemScore = validFields / columns.length;
      
      // Bonus for government source
      if (item.source?.includes('.gov')) {
        itemScore *= 1.15;
      }

      totalScore += itemScore;
    }

    return Math.min(100, Math.round((totalScore / data.length) * 100));
  }

  private formatCurrency(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId, datasetId, options = {} } = await req.json();

    if (!prompt || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt and userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔥 BASED DATA ENGINE v3.5 - ULTIMATE NUCLEAR CORE ACTIVATED');
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`👤 User: ${userId}`);
    console.log(`📦 Dataset ID: ${datasetId || 'not provided'}`);

    // Initialize engine and generate
    const engine = new UltimateDataEngine();
    const startTime = Date.now();
    
    const result = await engine.generate(prompt, userId, {
      maxRows: options.dataSize === 'small' ? 25 : options.dataSize === 'large' ? 250 : 100,
      includeRealData: options.freshness !== 'cached',
      enrichWithSentiment: options.includeInsights ?? true,
      detectAnomalies: true,
      clusterResults: true
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Generation complete in ${processingTime}ms - ${result.data.length} records`);

    // Calculate credits (cheaper than AI!)
    const creditsUsed = result.data.length <= 25 ? 3 : result.data.length <= 100 ? 8 : 15;

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Skip credit deduction for test users (auth disabled for testing)
    const isTestUser = userId.startsWith('test-user-');
    if (!isTestUser) {
      const { data: deducted, error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: creditsUsed,
        p_description: `Dataset: ${result.title}`
      });

      if (deductError) {
        console.error('Credit deduction error:', deductError);
      }

      if (!deducted) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('🧪 Test user detected - skipping credit deduction');
    }

    // Update dataset record
    if (datasetId) {
      const { error: updateError } = await supabase
        .from('datasets')
        .update({
          title: result.title,
          description: result.description,
          data: result.data,
          insights: result.insights,
          schema_definition: result.schema,
          sources: result.sources,
          status: 'complete',
          row_count: result.data.length,
          credits_used: creditsUsed
        })
        .eq('id', datasetId);

      if (updateError) {
        console.error('Database update error:', updateError);
      } else {
        console.log(`📦 Dataset ${datasetId} updated successfully`);
      }
    }

    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        title: result.title,
        description: result.description,
        data: result.data,
        insights: result.insights,
        schema: result.schema,
        creditsUsed,
        processingTime,
        generationMethod: 'ultimate-engine-v3.5-nuclear',
        aiCreditsUsed: 0 // ZERO AI CREDITS! 🔥
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Engine error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
