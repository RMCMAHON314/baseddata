// BASED DATA v6.0 - Query Hook
// Manages the full data pipeline with granular step tracking

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  OmniscientQuery, 
  OmniscientResponse, 
  CollectedData,
  GeoJSONFeatureCollection 
} from '@/types/omniscient';

export type OmniscientPhase = 'idle' | 'analyzing' | 'collecting' | 'processing' | 'insights' | 'complete' | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
  recordCount?: number;
  icon?: string;
}

interface UseOmniscientReturn {
  phase: OmniscientPhase;
  steps: PipelineStep[];
  query: OmniscientQuery | null;
  response: OmniscientResponse | null;
  features: GeoJSONFeatureCollection | null;
  totalRecords: number;
  elapsedTime: number;
  error: string | null;
  currentAction: string;
  execute: (prompt: string) => Promise<void>;
  reset: () => void;
}

// Comprehensive pipeline steps - shows the FULL bread-baking process
const INITIAL_STEPS: PipelineStep[] = [
  // Phase 1: Analysis
  { id: 'parse', label: 'Parsing natural language query', status: 'pending', icon: '📝' },
  { id: 'intent', label: 'Extracting search intent & keywords', status: 'pending', icon: '🔍' },
  { id: 'location', label: 'Geocoding location references', status: 'pending', icon: '📍' },
  { id: 'temporal', label: 'Analyzing temporal context', status: 'pending', icon: '📅' },
  { id: 'categories', label: 'Identifying data categories', status: 'pending', icon: '🏷️' },
  
  // Phase 2: Data Collection
  { id: 'wildlife', label: 'Wildlife observation APIs', status: 'pending', icon: '🦅' },
  { id: 'weather', label: 'Weather & climate services', status: 'pending', icon: '⛅' },
  { id: 'marine', label: 'Marine & tidal data', status: 'pending', icon: '🌊' },
  { id: 'geo', label: 'Geospatial mapping layers', status: 'pending', icon: '🗺️' },
  { id: 'gov', label: 'Government regulations', status: 'pending', icon: '📋' },
  { id: 'recreation', label: 'Recreation & public lands', status: 'pending', icon: '🏞️' },
  
  // Phase 3: Processing
  { id: 'normalize', label: 'Normalizing data schemas', status: 'pending', icon: '🔄' },
  { id: 'georef', label: 'Georeferencing records', status: 'pending', icon: '🎯' },
  { id: 'dedup', label: 'Deduplicating entries', status: 'pending', icon: '🧹' },
  { id: 'quality', label: 'Scoring data quality', status: 'pending', icon: '⭐' },
  { id: 'enrich', label: 'Enriching with metadata', status: 'pending', icon: '✨' },
  
  // Phase 4: AI Insights
  { id: 'analyze_ai', label: 'AI pattern analysis', status: 'pending', icon: '🧠' },
  { id: 'insights', label: 'Generating insights', status: 'pending', icon: '💡' },
  { id: 'finalize', label: 'Preparing visualization', status: 'pending', icon: '📊' },
];

// Detailed action messages for each step
const ACTION_MESSAGES: Record<string, string[]> = {
  parse: ['Tokenizing query...', 'Breaking down natural language...', 'Identifying query structure...'],
  intent: ['Extracting primary intent...', 'Mapping to data domains...', 'Weighing keyword relevance...'],
  location: ['Searching location database...', 'Resolving coordinates...', 'Calculating bounding box...'],
  temporal: ['Parsing date references...', 'Identifying seasonal context...', 'Setting time boundaries...'],
  categories: ['Matching to WILDLIFE...', 'Matching to WEATHER...', 'Matching to MARINE...', 'Matching to REGULATIONS...'],
  wildlife: ['Querying eBird API...', 'Fetching iNaturalist observations...', 'Searching GBIF records...'],
  weather: ['Connecting to NOAA...', 'Fetching forecast data...', 'Processing climate history...'],
  marine: ['Retrieving tidal predictions...', 'Fetching buoy data...', 'Processing water conditions...'],
  geo: ['Querying OpenStreetMap...', 'Loading USGS boundaries...', 'Fetching elevation data...'],
  gov: ['Searching regulations database...', 'Fetching permit requirements...', 'Loading hunting seasons...'],
  recreation: ['Finding public lands...', 'Querying NPS data...', 'Loading trail information...'],
  normalize: ['Converting coordinate systems...', 'Standardizing timestamps...', 'Unifying field names...'],
  georef: ['Assigning coordinates...', 'Validating geometries...', 'Building spatial index...'],
  dedup: ['Computing hash signatures...', 'Identifying duplicates...', 'Merging similar records...'],
  quality: ['Calculating completeness...', 'Assessing accuracy...', 'Computing confidence scores...'],
  enrich: ['Adding source metadata...', 'Linking related records...', 'Enhancing descriptions...'],
  analyze_ai: ['Running pattern detection...', 'Identifying correlations...', 'Finding anomalies...'],
  insights: ['Generating summary...', 'Extracting key findings...', 'Building recommendations...'],
  finalize: ['Optimizing for display...', 'Building layer groups...', 'Ready to visualize!'],
};

export function useOmniscient(): UseOmniscientReturn {
  const [phase, setPhase] = useState<OmniscientPhase>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [query, setQuery] = useState<OmniscientQuery | null>(null);
  const [response, setResponse] = useState<OmniscientResponse | null>(null);
  const [features, setFeatures] = useState<GeoJSONFeatureCollection | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>('');
  const actionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStep = useCallback((id: string, updates: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // Cycle through action messages for active step
  const startActionMessages = useCallback((stepId: string) => {
    const messages = ACTION_MESSAGES[stepId] || [`Processing ${stepId}...`];
    let index = 0;
    setCurrentAction(messages[0]);
    
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
    }
    
    actionIntervalRef.current = setInterval(() => {
      index = (index + 1) % messages.length;
      setCurrentAction(messages[index]);
    }, 800);
  }, []);

  const stopActionMessages = useCallback(() => {
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
  }, []);

  // Simulate step completion with realistic timing
  const completeStepWithDelay = useCallback(async (
    stepId: string, 
    delay: number, 
    detail?: string,
    recordCount?: number
  ) => {
    startActionMessages(stepId);
    updateStep(stepId, { status: 'active' });
    await new Promise(r => setTimeout(r, delay));
    stopActionMessages();
    updateStep(stepId, { 
      status: 'complete', 
      detail: detail || 'Complete',
      recordCount 
    });
  }, [updateStep, startActionMessages, stopActionMessages]);

  const execute = useCallback(async (prompt: string) => {
    const startTime = Date.now();
    setPhase('analyzing');
    setError(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setQuery({ prompt, timestamp: new Date().toISOString() });
    setTotalRecords(0);

    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: ANALYSIS - Show the user we're understanding their query
      // ═══════════════════════════════════════════════════════════════
      
      await completeStepWithDelay('parse', 400, 'Query tokenized');
      await completeStepWithDelay('intent', 350, 'Intent extracted');
      await completeStepWithDelay('location', 450, 'Coordinates resolved');
      await completeStepWithDelay('temporal', 300, 'Time context set');
      await completeStepWithDelay('categories', 350, 'Categories matched');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: DATA COLLECTION - The main event
      // ═══════════════════════════════════════════════════════════════
      setPhase('collecting');
      
      // Start all collection steps as active (parallel collection)
      ['wildlife', 'weather', 'marine', 'geo', 'gov', 'recreation'].forEach(id => {
        updateStep(id, { status: 'active' });
        startActionMessages(id);
      });

      // Call the OMNISCIENT edge function
      const { data, error: fnError } = await supabase.functions.invoke('omniscient', {
        body: { prompt },
      });

      if (fnError) throw fnError;

      const omniscientResponse = data as OmniscientResponse;

      // Map sources to step IDs
      const sourceToStep: Record<string, string> = {
        'ebird': 'wildlife',
        'inaturalist': 'wildlife',
        'gbif': 'wildlife',
        'noaa_weather': 'weather',
        'noaa_tides': 'marine',
        'openstreetmap': 'geo',
        'usgs': 'geo',
        'usaspending': 'gov',
        'regulations': 'gov',
        'nps': 'recreation',
      };

      // Calculate records per step from features
      const stepRecords: Record<string, number> = {};
      const featureCount = omniscientResponse.features?.features?.length || 0;
      
      for (const feature of omniscientResponse.features?.features || []) {
        const source = feature.properties?.source?.toLowerCase() || '';
        const stepId = sourceToStep[source] || 'geo';
        stepRecords[stepId] = (stepRecords[stepId] || 0) + 1;
      }

      // Complete collection steps with staggered timing and record counts
      stopActionMessages();
      const collectionSteps = ['wildlife', 'weather', 'marine', 'geo', 'gov', 'recreation'];
      for (let i = 0; i < collectionSteps.length; i++) {
        const stepId = collectionSteps[i];
        const count = stepRecords[stepId] || 0;
        await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
        updateStep(stepId, { 
          status: 'complete', 
          recordCount: count,
          detail: count > 0 ? `${count} records collected` : 'No matching data'
        });
        setTotalRecords(prev => prev + count);
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: PROCESSING - Transform and clean the data
      // ═══════════════════════════════════════════════════════════════
      setPhase('processing');
      
      await completeStepWithDelay('normalize', 300, 'Schemas unified');
      await completeStepWithDelay('georef', 350, `${featureCount} points mapped`);
      await completeStepWithDelay('dedup', 250, 'Duplicates removed');
      await completeStepWithDelay('quality', 300, 'Quality scored');
      await completeStepWithDelay('enrich', 350, 'Metadata added');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 4: AI INSIGHTS - Generate intelligence
      // ═══════════════════════════════════════════════════════════════
      setPhase('insights');
      
      await completeStepWithDelay('analyze_ai', 400, 'Patterns detected');
      await completeStepWithDelay('insights', 450, omniscientResponse.insights ? 'Insights generated' : 'Analysis complete');
      await completeStepWithDelay('finalize', 300, 'Ready!');

      // Set final state
      setResponse(omniscientResponse);
      setFeatures(omniscientResponse.features);
      setTotalRecords(featureCount);
      setElapsedTime(Date.now() - startTime);
      setCurrentAction('');
      setPhase('complete');

    } catch (err: any) {
      console.error('BASED DATA error:', err);
      setError(err.message || 'Failed to execute query');
      setPhase('error');
      stopActionMessages();
      setCurrentAction('');
      
      // Mark pending/active steps as error
      setSteps(prev => prev.map(s => 
        s.status === 'active' || s.status === 'pending' 
          ? { ...s, status: 'error' } 
          : s
      ));
    }
  }, [updateStep, completeStepWithDelay, startActionMessages, stopActionMessages]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setQuery(null);
    setResponse(null);
    setFeatures(null);
    setTotalRecords(0);
    setElapsedTime(0);
    setError(null);
    setCurrentAction('');
    stopActionMessages();
  }, [stopActionMessages]);

  return {
    phase,
    steps,
    query,
    response,
    features,
    totalRecords,
    elapsedTime,
    error,
    currentAction,
    execute,
    reset,
  };
}
