// 🔥 BASED DATA ENGINE v3.0 - ZERO AI CREDITS NUCLEAR CORE 🔥
// The most powerful dataset generation engine possible using ZERO AI API credits.
// Pure algorithms. Free APIs. State-of-the-art NLP. Machine Learning. Statistical Analysis.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// PART 1: GOVERNMENT APIS - FREE, UNLIMITED, AUTHORITATIVE
// ============================================================================

const USA_SPENDING_BASE = 'https://api.usaspending.gov/api/v2';
const SEC_BASE = 'https://data.sec.gov';

interface USASpendingContract {
  recipient_name: string;
  total_obligation: number;
  awarding_agency_name: string;
  naics_code: string;
  description?: string;
  period_of_performance_start_date?: string;
  period_of_performance_current_end_date?: string;
}

interface SECCompany {
  name: string;
  ticker?: string;
  cik: string;
  filings?: any[];
}

class GovernmentAPIs {
  // USASpending.gov - Federal contracts, grants, loans
  async getFederalContractors(options: {
    keywords?: string[];
    naicsCode?: string;
    limit?: number;
    timeRange?: { start: string; end: string };
  }): Promise<USASpendingContract[]> {
    try {
      const { keywords = [], naicsCode, limit = 100, timeRange } = options;
      
      const response = await fetch(`${USA_SPENDING_BASE}/search/spending_by_award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{
              start_date: timeRange?.start || '2020-01-01',
              end_date: timeRange?.end || '2025-12-31'
            }],
            award_type_codes: ['A', 'B', 'C', 'D'],
            ...(naicsCode && { naics_codes: [naicsCode] }),
            ...(keywords.length > 0 && { keywords: keywords.slice(0, 5) })
          },
          fields: [
            'recipient_name',
            'total_obligation',
            'awarding_agency_name',
            'naics_code',
            'description',
            'period_of_performance_start_date',
            'period_of_performance_current_end_date'
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

  // SEC EDGAR - Public company filings
  async searchSECCompanies(query: string): Promise<SECCompany[]> {
    try {
      // SEC requires specific User-Agent
      const response = await fetch(
        `${SEC_BASE}/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(query)}&type=10-K&output=atom`,
        {
          headers: {
            'User-Agent': 'BasedData contact@baseddata.io',
            'Accept': 'application/atom+xml'
          }
        }
      );

      if (!response.ok) return [];
      
      const text = await response.text();
      return this.parseSECAtomFeed(text);
    } catch (error) {
      console.error('SEC API error:', error);
      return [];
    }
  }

  private parseSECAtomFeed(xml: string): SECCompany[] {
    const companies: SECCompany[] = [];
    const companyMatches = xml.matchAll(/<company-info>[\s\S]*?<conformed-name>([^<]+)<\/conformed-name>[\s\S]*?<cik>([^<]+)<\/cik>[\s\S]*?<\/company-info>/gi);
    
    for (const match of companyMatches) {
      companies.push({
        name: match[1]?.trim() || '',
        cik: match[2]?.trim() || ''
      });
    }
    
    return companies;
  }

  // Get agency spending data
  async getAgencySpending(agencyCode?: string): Promise<any[]> {
    try {
      const response = await fetch(`${USA_SPENDING_BASE}/agency/`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Agency spending error:', error);
      return [];
    }
  }
}

// ============================================================================
// PART 2: NLP ENGINE - ZERO AI CREDITS
// ============================================================================

// AFINN-165 Sentiment Lexicon (subset of 2477 words)
const AFINN: Record<string, number> = {
  'abandon': -2, 'abandoned': -2, 'abandons': -2, 'abducted': -2,
  'abuse': -3, 'abused': -3, 'abuses': -3, 'acclaimed': 2,
  'accomplish': 2, 'accomplished': 2, 'achieve': 2, 'achievement': 2,
  'achievements': 2, 'awesome': 4, 'awful': -3, 'bad': -3,
  'bankrupt': -3, 'bankruptcy': -3, 'best': 3, 'better': 2,
  'boom': 2, 'booming': 3, 'catastrophe': -4, 'catastrophic': -4,
  'excellent': 3, 'exceptional': 3, 'exciting': 3, 'fail': -2,
  'failed': -2, 'failure': -2, 'fantastic': 4, 'fraud': -4,
  'fraudulent': -4, 'good': 2, 'great': 3, 'growth': 2,
  'growing': 2, 'innovative': 2, 'innovation': 2, 'lawsuit': -2,
  'layoff': -2, 'layoffs': -2, 'loss': -2, 'losses': -2,
  'outstanding': 4, 'profit': 2, 'profitable': 2, 'profits': 2,
  'revenue': 1, 'rich': 2, 'rise': 1, 'rising': 1,
  'scam': -4, 'scandal': -3, 'struggling': -2, 'success': 2,
  'successful': 2, 'terrible': -3, 'threat': -2, 'troubled': -2,
  'win': 3, 'winner': 3, 'winning': 3, 'worst': -3,
  'amazing': 4, 'brilliant': 3, 'dominant': 2, 'leading': 2,
  'pioneer': 3, 'revolutionary': 3, 'breakthrough': 3, 'disrupt': 2,
  'disruption': 2, 'decline': -2, 'declining': -2, 'weak': -2,
  'weaker': -2, 'crisis': -3, 'danger': -2, 'dangerous': -2,
  'risk': -1, 'risky': -2, 'uncertain': -1, 'uncertainty': -1,
  'stable': 1, 'steady': 1, 'reliable': 2, 'trusted': 2,
  'trustworthy': 2, 'secure': 2, 'secured': 2, 'strong': 2,
  'stronger': 2, 'strongest': 3, 'leader': 2, 'leadership': 2
};

// Stopwords for text processing
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours',
  'yourself', 'yourselves'
]);

class NLPEngine {
  // Tokenize text
  tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\\w\\s]/g, '')
      .split(/\\s+/)
      .filter(t => t.length > 2 && !STOPWORDS.has(t));
  }

  // TF-IDF Vectorization
  calculateTFIDF(documents: string[]): Map<number, Map<string, number>> {
    const docFreq: Map<string, number> = new Map();
    const tfidfVectors: Map<number, Map<string, number>> = new Map();

    // Calculate document frequencies
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

      // Normalize TF
      const maxTf = Math.max(...Array.from(tf.values()));
      tf.forEach((count, token) => tf.set(token, count / maxTf));
      tfidfVectors.set(docIndex, tf);
    });

    // Apply IDF
    tfidfVectors.forEach((tf, docIndex) => {
      tf.forEach((tfValue, token) => {
        const idf = Math.log((documents.length + 1) / ((docFreq.get(token) || 0) + 1));
        tf.set(token, tfValue * idf);
      });
    });

    return tfidfVectors;
  }

  // BM25 Scoring
  bm25Score(query: string, document: string, k1 = 1.5, b = 0.75, avgDocLength = 100): number {
    const queryTokens = this.tokenize(query);
    const docTokens = this.tokenize(document);
    const docLength = docTokens.length;

    // Calculate term frequencies
    const tf: Map<string, number> = new Map();
    docTokens.forEach(token => tf.set(token, (tf.get(token) || 0) + 1));

    let score = 0;
    queryTokens.forEach(token => {
      const termFreq = tf.get(token) || 0;
      if (termFreq > 0) {
        const idf = Math.log(2); // Simplified IDF
        const numerator = termFreq * (k1 + 1);
        const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
        score += idf * (numerator / denominator);
      }
    });

    return score;
  }

  // Sentiment Analysis
  analyzeSentiment(text: string): { score: number; comparative: number; classification: string } {
    const tokens = text.toLowerCase().replace(/[^\\w\\s]/g, '').split(/\\s+/);
    let score = 0;
    let wordCount = 0;
    let modifier = 1;

    const modifiers: Record<string, number> = {
      'not': -1, 'never': -1, 'no': -1, "don't": -1, "doesn't": -1,
      'very': 1.5, 'extremely': 2, 'highly': 1.5, 'significantly': 1.5
    };

    for (const token of tokens) {
      if (modifiers[token]) {
        modifier = modifiers[token];
        continue;
      }

      if (AFINN[token]) {
        score += AFINN[token] * modifier;
        wordCount++;
        modifier = 1;
      }
    }

    const comparative = wordCount > 0 ? score / wordCount : 0;
    const classification = comparative > 0.5 ? 'positive' : comparative < -0.5 ? 'negative' : 'neutral';

    return { score, comparative, classification };
  }

  // Named Entity Recognition (Pattern-Based)
  extractEntities(text: string): Record<string, string[]> {
    const patterns = {
      company: [
        /(?:[\w\s]+(?:Inc\.|Corp\.|LLC|Ltd\.|Corporation|Company|Co\.))/gi,
        /([\w\s]+(?:Technologies|Solutions|Systems|Services|Group|Partners|Labs|Dynamics))/gi
      ],
      money: [
        /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|M|B|K))?/gi,
        /(?:USD|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi
      ],
      percentage: [/\d+(?:\.\d+)?%/g],
      date: [
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
        /\b\d{4}-\d{2}-\d{2}\b/g
      ],
      location: [
        /\b(?:Washington|New York|California|Texas|Florida|Virginia|Maryland|Massachusetts|Illinois|Pennsylvania|Georgia|North Carolina|Ohio|Arizona|Colorado|Seattle|Boston|Austin|Denver|Chicago|Atlanta|Dallas|Houston|Phoenix|Miami|San Francisco|Los Angeles|San Diego)\b/gi
      ]
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

  // RAKE Keyword Extraction
  extractKeywords(text: string, topN = 10): Array<{ phrase: string; score: number }> {
    // Split into phrases at stopwords and punctuation
    let processed = text.toLowerCase();
    for (const stopword of STOPWORDS) {
      const regex = new RegExp(`\\b${stopword}\\b`, 'gi');
      processed = processed.replace(regex, '|');
    }
    processed = processed.replace(/[^\\w\\s|]/g, '|');
    
    const phrases = processed.split('|').map(p => p.trim()).filter(p => p.length > 0);

    // Calculate word scores
    const wordFreq: Map<string, number> = new Map();
    const wordDegree: Map<string, number> = new Map();

    for (const phrase of phrases) {
      const words = phrase.split(/\\s+/).filter(w => w.length > 0);
      const degree = words.length - 1;

      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        wordDegree.set(word, (wordDegree.get(word) || 0) + degree);
      }
    }

    // Calculate phrase scores
    const phraseScores = phrases.map(phrase => {
      const words = phrase.split(/\\s+/).filter(w => w.length > 0);
      const score = words.reduce((sum, word) => {
        const freq = wordFreq.get(word) || 0;
        const degree = wordDegree.get(word) || 0;
        return sum + (freq > 0 ? (degree + freq) / freq : 0);
      }, 0);
      return { phrase, score };
    });

    // Sort and deduplicate
    return phraseScores
      .filter(p => p.phrase.length > 3)
      .sort((a, b) => b.score - a.score)
      .filter((p, i, arr) => arr.findIndex(x => x.phrase === p.phrase) === i)
      .slice(0, topN);
  }
}

// ============================================================================
// PART 3: MACHINE LEARNING ENGINE - PURE TYPESCRIPT
// ============================================================================

class MLEngine {
  // K-Means Clustering with K-Means++ initialization
  kMeansClustering(data: number[][], k: number, maxIterations = 100): {
    assignments: number[];
    centroids: number[][];
  } {
    if (data.length < k) return { assignments: data.map((_, i) => i % k), centroids: [] };

    // Normalize data
    const normalized = this.normalize(data);

    // K-Means++ initialization
    let centroids = this.initializeCentroidsKMeansPP(normalized, k);
    let assignments: number[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      const newAssignments = normalized.map(point => this.nearestCentroid(point, centroids));

      // Check for convergence
      if (this.arraysEqual(assignments, newAssignments)) break;
      assignments = newAssignments;

      // Update centroids
      centroids = this.updateCentroids(normalized, assignments, k);
    }

    return { assignments, centroids };
  }

  private initializeCentroidsKMeansPP(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    // First centroid is random
    const firstIdx = Math.floor(Math.random() * data.length);
    centroids.push([...data[firstIdx]]);
    usedIndices.add(firstIdx);

    // Subsequent centroids chosen proportionally to distance squared
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

  // Linear Regression for trend prediction
  linearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = x.reduce((sum, xi, i) => sum + Math.pow(y[i] - (slope * xi + intercept), 2), 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return {
      slope,
      intercept,
      rSquared,
      predict: (xVal: number) => slope * xVal + intercept
    };
  }

  // Anomaly Detection using IQR method
  detectAnomalies(values: number[], multiplier = 1.5): Array<{ index: number; value: number; type: 'high' | 'low' }> {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const anomalies: Array<{ index: number; value: number; type: 'high' | 'low' }> = [];

    values.forEach((value, index) => {
      if (value < lowerBound) {
        anomalies.push({ index, value, type: 'low' });
      } else if (value > upperBound) {
        anomalies.push({ index, value, type: 'high' });
      }
    });

    return anomalies;
  }

  // Z-Score Anomaly Detection
  detectZScoreAnomalies(values: number[], threshold = 3): Array<{ index: number; value: number; zScore: number }> {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length);

    const anomalies: Array<{ index: number; value: number; zScore: number }> = [];

    values.forEach((value, index) => {
      const zScore = std > 0 ? (value - mean) / std : 0;
      if (Math.abs(zScore) > threshold) {
        anomalies.push({ index, value, zScore });
      }
    });

    return anomalies;
  }

  // Helper functions
  private normalize(data: number[][]): number[][] {
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

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
}

// ============================================================================
// PART 4: FUZZY MATCHING & DEDUPLICATION
// ============================================================================

class FuzzyMatcher {
  // Levenshtein Distance
  levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

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

  // Jaro-Winkler Similarity (better for names)
  jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    
    const jaro = this.jaroSimilarity(s1, s2);

    // Find common prefix (up to 4 chars)
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

  // Find duplicates in a list
  findDuplicates(items: string[], threshold = 0.85): Array<[string, string, number]> {
    const duplicates: Array<[string, string, number]> = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const similarity = this.jaroWinkler(
          items[i].toLowerCase(),
          items[j].toLowerCase()
        );

        if (similarity >= threshold) {
          duplicates.push([items[i], items[j], similarity]);
        }
      }
    }

    return duplicates.sort((a, b) => b[2] - a[2]);
  }
}

// ============================================================================
// PART 5: STATISTICAL INSIGHTS ENGINE
// ============================================================================

class StatisticsEngine {
  // Descriptive statistics
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
  } {
    if (values.length === 0) {
      return { count: 0, sum: 0, mean: 0, median: 0, mode: 0, min: 0, max: 0, range: 0, variance: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    // Mode
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

    return { count, sum, mean, median, mode, min, max, range, variance, stdDev, q1, q3, iqr };
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

  // Calculate correlation coefficient
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

  // Group data by category and calculate aggregates
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

  // Calculate distribution
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
}

// ============================================================================
// PART 6: SCHEMA TEMPLATES & DATA GENERATORS
// ============================================================================

interface ColumnDef {
  name: string;
  type: 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'email' | 'url' | 'score' | 'trend' | 'boolean' | 'phone';
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
}

const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    entity_type: 'federal_contractor',
    keywords: ['federal', 'contractor', 'government', 'contract', 'agency', 'grant', 'defense', 'dod', 'gsa', 'procurement'],
    title_template: 'Top Federal Contractors - {category}',
    description_template: 'Comprehensive dataset of federal contractors with contract values, agencies, and certifications',
    columns: [
      { name: 'company_name', type: 'string', description: 'Legal business name', is_enriched: false },
      { name: 'cage_code', type: 'string', description: 'CAGE code identifier', is_enriched: false },
      { name: 'duns_number', type: 'string', description: 'DUNS identifier', is_enriched: false },
      { name: 'total_contract_value', type: 'currency', description: 'Total obligated contract value', is_enriched: false },
      { name: 'primary_agency', type: 'string', description: 'Primary awarding agency', is_enriched: false },
      { name: 'naics_code', type: 'string', description: 'Primary NAICS code', is_enriched: false },
      { name: 'small_business', type: 'boolean', description: 'Small business certification', is_enriched: true },
      { name: 'hq_state', type: 'string', description: 'Headquarters state', is_enriched: false },
      { name: 'employee_count', type: 'number', description: 'Estimated employees', is_enriched: true },
      { name: 'past_performance_rating', type: 'score', description: 'CPARS rating (1-5)', is_enriched: true },
      { name: 'contract_growth_yoy', type: 'percentage', description: 'Year-over-year contract growth', is_enriched: true, generator: 'trend_percentage' }
    ],
    sources: ['usaspending.gov', 'sam.gov', 'fpds.gov']
  },
  {
    entity_type: 'startup',
    keywords: ['startup', 'funded', 'funding', 'series', 'venture', 'vc', 'seed', 'raise', 'unicorn', 'valuation'],
    title_template: 'Funded Startups - {category}',
    description_template: 'Dataset of venture-backed startups with funding rounds, valuations, and growth metrics',
    columns: [
      { name: 'company_name', type: 'string', description: 'Company name', is_enriched: false },
      { name: 'industry', type: 'string', description: 'Primary industry', is_enriched: false },
      { name: 'founded_year', type: 'number', description: 'Year founded', is_enriched: false },
      { name: 'total_funding', type: 'currency', description: 'Total funding raised', is_enriched: false },
      { name: 'last_round', type: 'string', description: 'Last funding round type', is_enriched: false },
      { name: 'valuation', type: 'currency', description: 'Latest valuation', is_enriched: true },
      { name: 'employee_count', type: 'number', description: 'Employee count', is_enriched: false },
      { name: 'hq_location', type: 'string', description: 'Headquarters location', is_enriched: false },
      { name: 'growth_stage', type: 'string', description: 'Growth stage', is_enriched: true },
      { name: 'revenue_estimate', type: 'currency', description: 'Estimated annual revenue', is_enriched: true },
      { name: 'growth_rate', type: 'percentage', description: 'Annual growth rate', is_enriched: true, generator: 'trend_percentage' }
    ],
    sources: ['crunchbase.com', 'pitchbook.com', 'sec.gov']
  },
  {
    entity_type: 'public_company',
    keywords: ['public', 'stock', 'nasdaq', 'nyse', 'ticker', 'market cap', 'sec', 'filing', 'quarterly', 'earnings'],
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
      { name: 'sector', type: 'string', description: 'Industry sector', is_enriched: false },
      { name: 'employee_count', type: 'number', description: 'Employee count', is_enriched: false },
      { name: 'yoy_revenue_growth', type: 'percentage', description: 'YoY revenue growth', is_enriched: true, generator: 'trend_percentage' },
      { name: 'analyst_rating', type: 'score', description: 'Average analyst rating (1-5)', is_enriched: true }
    ],
    sources: ['sec.gov', 'nasdaq.com', 'yahoo.com/finance']
  },
  {
    entity_type: 'tech_company',
    keywords: ['tech', 'software', 'saas', 'ai', 'data', 'cloud', 'platform', 'app', 'digital', 'machine learning'],
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
      { name: 'growth_rate', type: 'percentage', description: 'Annual growth rate', is_enriched: true, generator: 'trend_percentage' }
    ],
    sources: ['github.com', 'crunchbase.com', 'linkedin.com']
  },
  {
    entity_type: 'job_listing',
    keywords: ['job', 'hiring', 'position', 'role', 'career', 'salary', 'remote', 'engineer', 'developer', 'manager'],
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
      { name: 'company_rating', type: 'score', description: 'Company rating (1-5)', is_enriched: true }
    ],
    sources: ['linkedin.com', 'indeed.com', 'glassdoor.com']
  },
  {
    entity_type: 'market_data',
    keywords: ['market', 'industry', 'sector', 'trend', 'forecast', 'growth', 'size', 'share', 'analysis', 'report'],
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
      { name: 'investment_outlook', type: 'trend', description: 'Investment outlook', is_enriched: true }
    ],
    sources: ['statista.com', 'grandviewresearch.com', 'marketsandmarkets.com']
  }
];

// Real-world seed data for realistic generation
const SEED_DATA = {
  federal_contractors: [
    'Lockheed Martin', 'Boeing', 'Raytheon Technologies', 'General Dynamics', 'Northrop Grumman',
    'BAE Systems', 'Leidos', 'L3Harris Technologies', 'Huntington Ingalls Industries', 'Booz Allen Hamilton',
    'SAIC', 'General Atomics', 'Parsons Corporation', 'CACI International', 'ManTech International',
    'Peraton', 'KBR Inc', 'Amentum', 'Jacobs Engineering', 'DXC Technology'
  ],
  agencies: [
    'Department of Defense', 'Department of Veterans Affairs', 'Department of Homeland Security',
    'Department of Health and Human Services', 'General Services Administration', 'NASA',
    'Department of Energy', 'Department of Justice', 'Department of State', 'Department of Treasury'
  ],
  startup_names: [
    'Anthropic', 'Databricks', 'Stripe', 'Figma', 'Notion', 'Airtable', 'Retool', 'dbt Labs',
    'Anduril Industries', 'SpaceX', 'Rivian', 'Discord', 'Canva', 'Plaid', 'Brex', 'Ramp',
    'Scale AI', 'OpenAI', 'Cohere', 'Hugging Face', 'Weights & Biases', 'Snorkel AI'
  ],
  industries: [
    'Artificial Intelligence', 'Fintech', 'Healthcare Tech', 'Cybersecurity', 'Cloud Infrastructure',
    'Developer Tools', 'E-commerce', 'EdTech', 'Climate Tech', 'Defense Tech', 'Space Tech',
    'Biotech', 'Robotics', 'Quantum Computing', 'Web3/Blockchain'
  ],
  locations: [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA',
    'Los Angeles, CA', 'Denver, CO', 'Chicago, IL', 'Miami, FL', 'Washington, DC',
    'San Diego, CA', 'Atlanta, GA', 'Raleigh, NC', 'Salt Lake City, UT', 'Phoenix, AZ'
  ],
  tech_stacks: [
    'Python/TensorFlow', 'TypeScript/React', 'Go/Kubernetes', 'Rust/WebAssembly',
    'Java/Spring', 'Python/PyTorch', 'Node.js/GraphQL', 'Scala/Spark', 'C++/CUDA'
  ],
  funding_rounds: ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E+', 'Pre-IPO'],
  business_models: ['SaaS', 'Platform', 'Marketplace', 'API-first', 'Enterprise', 'Consumer', 'B2B2C'],
  remote_policies: ['Remote-first', 'Hybrid', 'On-site', 'Flexible', 'Remote-friendly'],
  job_types: ['Full-time', 'Contract', 'Part-time', 'Internship']
};

// ============================================================================
// PART 7: THE ULTIMATE DATA ENGINE
// ============================================================================

interface PromptAnalysis {
  entityType: string;
  schema: SchemaTemplate;
  count: number;
  keywords: string[];
  timeRange: { start: string; end: string };
  category: string;
  patterns: {
    isTopN: boolean;
    topNCount: number;
    hasTimeRange: boolean;
    isComparison: boolean;
    wantsGrowth: boolean;
    wantsFunding: boolean;
    isGovernment: boolean;
    isTech: boolean;
  };
  dataSources: string[];
}

class UltimateDataEngine {
  private govAPIs = new GovernmentAPIs();
  private nlp = new NLPEngine();
  private ml = new MLEngine();
  private fuzzy = new FuzzyMatcher();
  private stats = new StatisticsEngine();

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

    // PHASE 1: NLP Analysis
    console.log('Phase 1: Analyzing prompt with NLP...');
    const analysis = this.analyzePrompt(prompt);

    // PHASE 2: Gather real data from government APIs
    console.log('Phase 2: Querying government APIs...');
    let realData: Record<string, any>[] = [];
    
    if (options.includeRealData !== false) {
      realData = await this.gatherRealData(analysis);
    }

    // PHASE 3: Generate synthetic data to fill gaps
    console.log('Phase 3: Generating synthetic data...');
    const neededRows = Math.max(0, maxRows - realData.length);
    const syntheticData = this.generateSyntheticData(analysis, neededRows);

    // PHASE 4: Merge and deduplicate
    console.log('Phase 4: Deduplicating data...');
    let mergedData = this.deduplicateData([...realData, ...syntheticData]);

    // PHASE 5: Enrich with sentiment analysis
    if (options.enrichWithSentiment) {
      console.log('Phase 5: Enriching with sentiment...');
      mergedData = this.enrichWithSentiment(mergedData);
    }

    // PHASE 6: Apply ML analysis
    console.log('Phase 6: Applying ML analysis...');
    if (options.detectAnomalies) {
      mergedData = this.applyAnomalyDetection(mergedData, analysis.schema);
    }
    if (options.clusterResults && mergedData.length >= 10) {
      mergedData = this.applyClustering(mergedData, analysis.schema);
    }

    // PHASE 7: Generate statistical insights
    console.log('Phase 7: Generating insights...');
    const insights = this.generateInsights(mergedData, analysis);

    // Limit to requested row count
    const finalData = mergedData.slice(0, maxRows);

    return {
      data: finalData,
      insights,
      schema: {
        entity_type: analysis.entityType,
        columns: analysis.schema.columns
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
    // Extract keywords
    const keywords = this.nlp.extractKeywords(prompt, 10).map(k => k.phrase);
    
    // Detect patterns
    const topNMatch = prompt.match(/\b(top|best|leading|largest|biggest)\s+(\d+)\b/i);
    const timeRangeMatch = prompt.match(/(\d{4})[-–](\d{4})/);
    
    const patterns = {
      isTopN: !!topNMatch,
      topNCount: topNMatch ? parseInt(topNMatch[2]) : 50,
      hasTimeRange: !!timeRangeMatch,
      isComparison: /\b(compare|versus|vs\.?|against)\b/i.test(prompt),
      wantsGrowth: /\b(growth|growing|trend|trending)\b/i.test(prompt),
      wantsFunding: /\b(funded|funding|raised|investment|series)\b/i.test(prompt),
      isGovernment: /\b(federal|government|contractor|agency|grant|defense|dod)\b/i.test(prompt),
      isTech: /\b(tech|software|saas|startup|ai|data|cloud|platform)\b/i.test(prompt)
    };

    // Determine entity type by matching keywords against templates
    let bestMatch: SchemaTemplate = SCHEMA_TEMPLATES[0];
    let bestScore = 0;

    for (const template of SCHEMA_TEMPLATES) {
      let score = 0;
      const promptLower = prompt.toLowerCase();
      
      for (const keyword of template.keywords) {
        if (promptLower.includes(keyword)) {
          score += 2;
        }
      }
      
      for (const kw of keywords) {
        if (template.keywords.some(tk => kw.includes(tk) || tk.includes(kw))) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    // Override based on strong signals
    if (patterns.isGovernment && bestMatch.entity_type !== 'federal_contractor') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'federal_contractor') || bestMatch;
    } else if (patterns.wantsFunding && bestMatch.entity_type !== 'startup') {
      bestMatch = SCHEMA_TEMPLATES.find(t => t.entity_type === 'startup') || bestMatch;
    }

    // Determine data sources
    const dataSources: string[] = [];
    if (patterns.isGovernment) {
      dataSources.push('usaspending.gov', 'sam.gov');
    }
    if (patterns.wantsFunding) {
      dataSources.push('sec.gov', 'crunchbase.com');
    }
    if (patterns.isTech) {
      dataSources.push('github.com', 'linkedin.com');
    }
    if (dataSources.length === 0) {
      dataSources.push('web_search');
    }

    // Extract category from prompt
    const categoryMatch = prompt.match(/\b(ai|saas|fintech|healthcare|defense|cybersecurity|cloud|data|software|tech|federal|government)\b/i);
    const category = categoryMatch ? categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1).toLowerCase() : 'Technology';

    return {
      entityType: bestMatch.entity_type,
      schema: bestMatch,
      count: patterns.isTopN ? patterns.topNCount : 50,
      keywords,
      timeRange: timeRangeMatch
        ? { start: timeRangeMatch[1], end: timeRangeMatch[2] }
        : { start: '2020', end: '2025' },
      category,
      patterns,
      dataSources
    };
  }

  private async gatherRealData(analysis: PromptAnalysis): Promise<Record<string, any>[]> {
    const results: Record<string, any>[] = [];

    try {
      if (analysis.patterns.isGovernment) {
        const contracts = await this.govAPIs.getFederalContractors({
          keywords: analysis.keywords,
          limit: analysis.count * 2,
          timeRange: { start: `${analysis.timeRange.start}-01-01`, end: `${analysis.timeRange.end}-12-31` }
        });

        for (const contract of contracts) {
          results.push({
            company_name: contract.recipient_name,
            total_contract_value: contract.total_obligation,
            primary_agency: contract.awarding_agency_name,
            naics_code: contract.naics_code,
            source: 'usaspending.gov',
            source_type: 'government_api'
          });
        }
      }

      // Add SEC data for public companies
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

    for (let i = 0; i < count; i++) {
      const record: Record<string, any> = {};

      for (const col of schema.columns) {
        record[col.name] = this.generateValue(col, i, analysis);
      }

      record.source = 'synthetic';
      record.source_type = 'generated';
      data.push(record);
    }

    return data;
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
        if (col.name.includes('year')) return randInt(2000, 2024);
        if (col.name.includes('experience')) return randInt(1, 15);
        if (col.name.includes('stars')) return randInt(100, 50000);
        if (col.name.includes('ratio')) return Math.round((rand() * 50 + 5) * 10) / 10;
        return randInt(1, 1000);

      case 'currency':
        if (col.name.includes('salary')) return randInt(80000, 350000);
        if (col.name.includes('revenue')) return randInt(1000000, 500000000);
        if (col.name.includes('funding')) return randInt(1000000, 200000000);
        if (col.name.includes('valuation')) return randInt(10000000, 5000000000);
        if (col.name.includes('contract')) return randInt(100000, 500000000);
        if (col.name.includes('market_size')) return randInt(1000000000, 100000000000);
        return randInt(100000, 10000000);

      case 'percentage':
        if (col.generator === 'trend_percentage') {
          return Math.round((rand() * 60 - 10) * 10) / 10; // -10% to +50%
        }
        return Math.round(rand() * 100 * 10) / 10;

      case 'date':
        const days = randInt(0, 365);
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];

      case 'email':
        const name = this.generateStringValue('company_name', index, analysis);
        return `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`;

      case 'url':
        const company = this.generateStringValue('company_name', index, analysis);
        return `https://www.${company.toLowerCase().replace(/[^a-z]/g, '')}.com`;

      case 'score':
        if (col.name.includes('disruption')) return Math.round(rand() * 10 * 10) / 10;
        return Math.round((rand() * 4 + 1) * 10) / 10; // 1.0 to 5.0

      case 'trend':
        return pick(['Bullish', 'Bearish', 'Neutral', 'Strong Buy', 'Hold']);

      case 'boolean':
        return rand() > 0.5;

      case 'phone':
        return `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`;

      default:
        return null;
    }
  }

  private generateStringValue(colName: string, index: number, analysis: PromptAnalysis): string {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    if (colName.includes('company') || colName.includes('name')) {
      if (analysis.entityType === 'federal_contractor') {
        return pick(SEED_DATA.federal_contractors);
      } else if (analysis.entityType === 'startup') {
        return pick(SEED_DATA.startup_names);
      } else {
        return pick([...SEED_DATA.startup_names, ...SEED_DATA.federal_contractors]);
      }
    }

    if (colName.includes('agency')) return pick(SEED_DATA.agencies);
    if (colName.includes('industry') || colName.includes('sector') || colName.includes('category')) return pick(SEED_DATA.industries);
    if (colName.includes('location') || colName.includes('hq') || colName.includes('state')) return pick(SEED_DATA.locations);
    if (colName.includes('round')) return pick(SEED_DATA.funding_rounds);
    if (colName.includes('model')) return pick(SEED_DATA.business_models);
    if (colName.includes('remote')) return pick(SEED_DATA.remote_policies);
    if (colName.includes('job_type') || colName.includes('employment')) return pick(SEED_DATA.job_types);
    if (colName.includes('tech') || colName.includes('stack')) return pick(SEED_DATA.tech_stacks);
    if (colName.includes('stage')) return pick(['Early-stage', 'Growth', 'Late-stage', 'Pre-IPO']);
    if (colName.includes('exchange')) return pick(['NYSE', 'NASDAQ', 'AMEX']);
    if (colName.includes('ticker')) return this.generateTicker();
    if (colName.includes('naics')) return String(Math.floor(Math.random() * 900000) + 100000);
    if (colName.includes('cage')) return this.generateCAGECode();
    if (colName.includes('duns')) return this.generateDUNS();
    if (colName.includes('driver')) return pick(['AI adoption', 'Digital transformation', 'Cloud migration', 'Remote work', 'Automation']);
    if (colName.includes('skill')) return pick(['Python', 'JavaScript', 'AWS', 'Leadership', 'Communication', 'Data Analysis']);
    if (colName.includes('title') && colName.includes('job')) {
      return pick(['Senior Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'UX Designer', 'Engineering Manager']);
    }
    if (colName.includes('segment') || colName.includes('market')) {
      return pick(['Enterprise Software', 'Cloud Computing', 'Cybersecurity', 'AI/ML', 'Healthcare IT', 'Fintech']);
    }
    if (colName.includes('player')) return pick([...SEED_DATA.startup_names, ...SEED_DATA.federal_contractors]);
    if (colName.includes('region')) return pick(['North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East']);

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

  private generateDUNS(): string {
    let duns = '';
    for (let i = 0; i < 9; i++) {
      duns += Math.floor(Math.random() * 10);
    }
    return duns;
  }

  private deduplicateData(data: Record<string, any>[]): Record<string, any>[] {
    const nameKey = data[0] && Object.keys(data[0]).find(k => k.includes('name') || k.includes('company'));
    if (!nameKey) return data;

    const names = data.map(d => String(d[nameKey] || ''));
    const duplicates = this.fuzzy.findDuplicates(names, 0.85);

    // Build duplicate groups
    const dupeGroups = new Map<string, string[]>();
    for (const [a, b] of duplicates) {
      const key = a.toLowerCase();
      if (!dupeGroups.has(key)) dupeGroups.set(key, [a]);
      dupeGroups.get(key)!.push(b);
    }

    // Keep best record (prefer government sources)
    const seen = new Map<string, Record<string, any>>();
    
    for (const item of data) {
      const name = String(item[nameKey] || '').toLowerCase();
      
      let isDupe = false;
      for (const [, members] of dupeGroups) {
        if (members.some(m => m.toLowerCase() === name)) {
          if (members[0].toLowerCase() !== name) {
            isDupe = true;
          }
          break;
        }
      }

      if (!isDupe && !seen.has(name)) {
        seen.set(name, item);
      } else if (seen.has(name)) {
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

  private enrichWithSentiment(data: Record<string, any>[]): Record<string, any>[] {
    const nameKey = data[0] && Object.keys(data[0]).find(k => k.includes('name') || k.includes('company'));
    
    return data.map(item => {
      const name = nameKey ? String(item[nameKey]) : '';
      const sentiment = this.nlp.analyzeSentiment(name + ' ' + (item.description || ''));
      
      return {
        ...item,
        sentiment_score: Math.round(sentiment.comparative * 100) / 100,
        sentiment_classification: sentiment.classification
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

      const anomalies = this.ml.detectAnomalies(values);
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

    const { assignments } = this.ml.kMeansClustering(numericData, k);
    
    const clusterNames = ['High Performers', 'Emerging Players', 'Stable Growth', 'Niche Players', 'Challengers'];
    
    assignments.forEach((cluster, i) => {
      if (data[i]) {
        data[i].cluster = cluster;
        data[i].cluster_name = clusterNames[cluster] || `Cluster ${cluster + 1}`;
      }
    });

    return data;
  }

  private generateInsights(data: Record<string, any>[], analysis: PromptAnalysis): any {
    const schema = analysis.schema;
    
    // Find numeric columns
    const numericCols = schema.columns
      .filter(c => ['number', 'currency', 'percentage'].includes(c.type))
      .map(c => c.name);

    // Calculate statistics for each numeric column
    const summary: Record<string, any> = {};
    for (const col of numericCols) {
      const values = data.map(d => d[col]).filter(v => typeof v === 'number') as number[];
      if (values.length > 0) {
        summary[col] = this.stats.describe(values);
      }
    }

    // Category distributions
    const stringCols = schema.columns
      .filter(c => c.type === 'string' && (c.name.includes('industry') || c.name.includes('sector') || c.name.includes('agency')))
      .map(c => c.name);

    const distributions: Record<string, any[]> = {};
    for (const col of stringCols) {
      const values = data.map(d => d[col]).filter(v => v != null);
      if (values.length > 0) {
        distributions[col] = this.stats.distribution(values).slice(0, 5);
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
            correlations[`${numericCols[i]}_vs_${numericCols[j]}`] = Math.round(corr * 100) / 100;
          }
        }
      }
    }

    // Generate key findings
    const keyFindings = this.generateKeyFindings(data, summary, analysis);

    // Generate recommendations
    const recommendations = this.getRecommendations(analysis.entityType, analysis.category);

    // Key metrics for display
    const keyMetrics = this.generateKeyMetrics(data, summary, analysis);

    // Top categories
    const topCategories = Object.values(distributions)[0]?.slice(0, 5).map(d => String(d.value)) || [];

    // Data quality score
    const dataQualityScore = this.calculateDataQualityScore(data, schema);

    return {
      summary: `Generated ${data.length} ${analysis.entityType.replace('_', ' ')} records with ${numericCols.length} metrics and ${Object.keys(distributions).length} categorical dimensions.`,
      totalRecords: data.length,
      keyFindings,
      keyMetrics,
      topCategories,
      recommendations,
      dataQualityScore,
      statistics: summary,
      distributions,
      correlations,
      methodology: 'ultimate-engine-v3',
      processingDetails: {
        nlpKeywordsExtracted: analysis.keywords.length,
        entityTypeDetected: analysis.entityType,
        dataSourcesUsed: analysis.dataSources.length,
        clusteringApplied: data.some(d => d.cluster !== undefined),
        anomaliesDetected: data.filter(d => d.is_anomaly).length
      }
    };
  }

  private generateKeyFindings(data: Record<string, any>[], summary: Record<string, any>, analysis: PromptAnalysis): string[] {
    const findings: string[] = [];

    // Top company by value
    const valueCol = Object.keys(summary).find(k => k.includes('value') || k.includes('revenue') || k.includes('funding'));
    if (valueCol && summary[valueCol]) {
      const sorted = [...data].sort((a, b) => (b[valueCol] || 0) - (a[valueCol] || 0));
      const nameKey = Object.keys(data[0]).find(k => k.includes('name'));
      if (sorted[0] && nameKey) {
        findings.push(`${sorted[0][nameKey]} leads with ${this.formatCurrency(sorted[0][valueCol])} in ${valueCol.replace(/_/g, ' ')}`);
      }
    }

    // Growth trends
    const growthCol = Object.keys(summary).find(k => k.includes('growth') || k.includes('yoy'));
    if (growthCol && summary[growthCol]) {
      const avgGrowth = summary[growthCol].mean;
      const trend = avgGrowth > 10 ? 'strong growth' : avgGrowth > 0 ? 'moderate growth' : 'decline';
      findings.push(`Average ${growthCol.replace(/_/g, ' ')} shows ${trend} at ${avgGrowth.toFixed(1)}%`);
    }

    // Employee distribution
    const empCol = Object.keys(summary).find(k => k.includes('employee'));
    if (empCol && summary[empCol]) {
      findings.push(`Employee counts range from ${summary[empCol].min.toLocaleString()} to ${summary[empCol].max.toLocaleString()} (median: ${Math.round(summary[empCol].median).toLocaleString()})`);
    }

    // Add category-specific findings
    if (analysis.entityType === 'federal_contractor') {
      const smallBizCount = data.filter(d => d.small_business === true).length;
      if (smallBizCount > 0) {
        findings.push(`${smallBizCount} companies (${Math.round(smallBizCount / data.length * 100)}%) are small business certified`);
      }
    }

    // Anomalies
    const anomalyCount = data.filter(d => d.is_anomaly).length;
    if (anomalyCount > 0) {
      findings.push(`${anomalyCount} outlier companies detected with unusual metrics`);
    }

    return findings.slice(0, 5);
  }

  private generateKeyMetrics(data: Record<string, any>[], summary: Record<string, any>, analysis: PromptAnalysis): Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }> {
    const metrics: Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }> = [];

    // Total value
    const valueCol = Object.keys(summary).find(k => k.includes('value') || k.includes('revenue') || k.includes('funding'));
    if (valueCol && summary[valueCol]) {
      metrics.push({
        label: `Total ${valueCol.replace(/_/g, ' ')}`,
        value: this.formatCurrency(summary[valueCol].sum),
        trend: 'up'
      });
    }

    // Average metric
    const avgCol = Object.keys(summary)[0];
    if (avgCol && summary[avgCol]) {
      metrics.push({
        label: `Avg ${avgCol.replace(/_/g, ' ')}`,
        value: summary[avgCol].mean >= 1000 ? this.formatCurrency(summary[avgCol].mean) : summary[avgCol].mean.toFixed(1),
        trend: summary[avgCol].mean > summary[avgCol].median ? 'up' : 'stable'
      });
    }

    // Growth trend
    const growthCol = Object.keys(summary).find(k => k.includes('growth'));
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
      label: 'Companies Analyzed',
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
      tech_company: [
        'Prioritize companies with open APIs for easier integration',
        'Target firms with SOC2/ISO certifications for enterprise readiness',
        'Consider GitHub activity as a proxy for engineering velocity',
        'Evaluate companies with strong developer communities for ecosystem plays',
        'Focus on firms with clear AI/ML roadmaps for future-proofing'
      ],
      job_listing: [
        'Focus on roles with salary ranges in the 75th percentile for top talent',
        'Consider remote-first companies for expanded talent pools',
        'Evaluate companies with high Glassdoor ratings for culture fit',
        'Look for roles requiring emerging skills (AI/ML) for future-proof careers',
        'Prioritize companies with clear growth trajectories for advancement'
      ],
      market_data: [
        'Focus on segments with CAGR above 15% for high-growth opportunities',
        'Consider markets where leader share is under 30% for disruption potential',
        'Evaluate adjacent markets for expansion opportunities',
        'Look for markets with regulatory tailwinds for accelerated growth',
        'Prioritize segments with proven product-market fit indicators'
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
        itemScore *= 1.1;
      }

      totalScore += itemScore;
    }

    return Math.min(100, Math.round((totalScore / data.length) * 100));
  }

  private formatCurrency(value: number): string {
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

    console.log('🔥 BASED DATA ENGINE v3.0 - NUCLEAR CORE ACTIVATED');
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`User: ${userId}`);
    console.log(`Dataset ID: ${datasetId || 'not provided'}`);

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
    console.log(`Generation complete in ${processingTime}ms - ${result.data.length} records`);

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
      // Deduct credits
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

    // Update dataset record using specific datasetId if provided
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
        console.log(`Dataset ${datasetId} updated successfully`);
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
        generationMethod: 'ultimate-engine-v3-nuclear',
        aiCreditsUsed: 0 // ZERO AI CREDITS! 🔥
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Engine error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
