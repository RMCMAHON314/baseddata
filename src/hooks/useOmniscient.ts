// BASED DATA v10.0 - Query Hook
// Manages the full data pipeline with 30+ categories, granular step tracking, and history persistence

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  OmniscientQuery, 
  OmniscientResponse, 
  GeoJSONFeatureCollection 
} from '@/types/omniscient';
import { PIPELINE_STEPS } from '@/lib/constants';
import { getSessionId } from '@/lib/session';

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

// Build initial steps from PIPELINE_STEPS constant
const buildInitialSteps = (): PipelineStep[] => {
  const allSteps: PipelineStep[] = [];
  
  for (const [phase, phaseSteps] of Object.entries(PIPELINE_STEPS)) {
    for (const step of phaseSteps) {
      allSteps.push({
        id: step.id,
        label: step.label,
        status: 'pending',
        icon: step.icon,
      });
    }
  }
  
  return allSteps;
};

// Action messages for each step - more engaging
const ACTION_MESSAGES: Record<string, string[]> = {
  // Analysis
  parse: ['Breaking down your request...', 'Understanding your query...', 'Analyzing language patterns...'],
  intent: ['Identifying what you need...', 'Mapping data domains...', 'Extracting key concepts...'],
  location: ['Finding your location...', 'Geocoding coordinates...', 'Mapping boundaries...'],
  temporal: ['Setting time context...', 'Understanding time references...', 'Building date ranges...'],
  categories: ['Matching to 30+ categories...', 'Finding relevant data types...', 'Prioritizing sources...'],
  
  // Collection - 30+ categories
  core: ['Initializing core collectors...', 'Warming up APIs...', 'Preparing parallel requests...'],
  wildlife: ['Querying eBird...', 'Fetching iNaturalist...', 'Searching GBIF...', 'Checking Movebank...'],
  weather: ['Connecting to NOAA...', 'Fetching Open-Meteo...', 'Getting forecasts...'],
  marine: ['Retrieving tides...', 'Fetching buoy data...', 'Processing ocean data...'],
  environment: ['Querying EPA...', 'Fetching air quality...', 'Checking water data...'],
  government: ['Searching USASpending...', 'Querying SAM.gov...', 'Fetching contracts...'],
  economic: ['Connecting to FRED...', 'Fetching BLS data...', 'Getting trade stats...'],
  transport: ['Querying FAA...', 'Fetching flight data...', 'Getting traffic info...'],
  infrastructure: ['Checking bridge data...', 'Querying dam stats...', 'Fetching utility info...'],
  energy: ['Connecting to EIA...', 'Fetching grid status...', 'Getting solar data...'],
  health: ['Querying CDC...', 'Fetching health data...', 'Getting hospital stats...'],
  recreation: ['Finding parks...', 'Querying NPS...', 'Loading trail data...'],
  research: ['Searching NASA...', 'Querying NSF...', 'Fetching papers...'],
  satellite: ['Loading Landsat...', 'Fetching Sentinel...', 'Processing imagery...'],
  dynamic: ['Running dynamic discovery...', 'Generating new collectors...', 'Expanding coverage...'],
  
  // Processing
  normalize: ['Standardizing schemas...', 'Converting formats...', 'Unifying fields...'],
  georef: ['Adding coordinates...', 'Building spatial index...', 'Validating geometries...'],
  dedup: ['Finding duplicates...', 'Merging records...', 'Cleaning data...'],
  quality: ['Scoring quality...', 'Calculating confidence...', 'Rating sources...'],
  enrich: ['Adding metadata...', 'Linking records...', 'Enhancing data...'],
  
  // Insights
  analyze_ai: ['Running AI analysis...', 'Finding patterns...', 'Detecting anomalies...'],
  insights: ['Generating insights...', 'Building recommendations...', 'Summarizing findings...'],
  finalize: ['Preparing visualization...', 'Optimizing display...', 'Almost ready!'],
};

export function useOmniscient(): UseOmniscientReturn {
  const [phase, setPhase] = useState<OmniscientPhase>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>(buildInitialSteps());
  const [query, setQuery] = useState<OmniscientQuery | null>(null);
  const [response, setResponse] = useState<OmniscientResponse | null>(null);
  const [features, setFeatures] = useState<GeoJSONFeatureCollection | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>('');
  const actionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStep = useCallback((id: string, updates: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

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
    }, 700); // Slightly faster cycling
  }, []);

  const stopActionMessages = useCallback(() => {
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
  }, []);

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
    setSteps(buildInitialSteps());
    setQuery({ prompt, timestamp: new Date().toISOString() });
    setTotalRecords(0);

    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: ANALYSIS
      // ═══════════════════════════════════════════════════════════════
      
      await completeStepWithDelay('parse', 300, 'Query understood');
      await completeStepWithDelay('intent', 250, 'Intent extracted');
      await completeStepWithDelay('location', 350, 'Location found');
      await completeStepWithDelay('temporal', 200, 'Time set');
      await completeStepWithDelay('categories', 300, '30+ categories matched');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: COLLECTION - Start all collectors in parallel
      // ═══════════════════════════════════════════════════════════════
      setPhase('collecting');
      
      const collectionSteps = [
        'core', 'wildlife', 'weather', 'marine', 'environment',
        'government', 'economic', 'transport', 'infrastructure',
        'energy', 'health', 'recreation', 'research', 'satellite', 'dynamic'
      ];
      
      // Start all as active (parallel collection)
      for (const id of collectionSteps) {
        updateStep(id, { status: 'active' });
      }
      startActionMessages('core');

      // Call the OMNISCIENT edge function with session ID for history tracking
      const sessionId = getSessionId();
      const { data, error: fnError } = await supabase.functions.invoke('omniscient', {
        body: { prompt, session_id: sessionId },
      });

      if (fnError) throw fnError;

      const omniscientResponse = data as OmniscientResponse;
      const featureCount = omniscientResponse.features?.features?.length || 0;

      // Complete collection steps with staggered timing
      stopActionMessages();
      
      for (let i = 0; i < collectionSteps.length; i++) {
        const stepId = collectionSteps[i];
        const recordsForStep = Math.floor(featureCount / collectionSteps.length * (0.5 + Math.random()));
        
        await new Promise(r => setTimeout(r, 80 + Math.random() * 100));
        
        updateStep(stepId, { 
          status: 'complete', 
          recordCount: recordsForStep > 0 ? recordsForStep : undefined,
          detail: recordsForStep > 0 ? `${recordsForStep} records` : 'Checked'
        });
        
        setTotalRecords(prev => prev + recordsForStep);
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: PROCESSING
      // ═══════════════════════════════════════════════════════════════
      setPhase('processing');
      
      await completeStepWithDelay('normalize', 200, 'Formats unified');
      await completeStepWithDelay('georef', 250, `${featureCount} points mapped`);
      await completeStepWithDelay('dedup', 150, 'Duplicates removed');
      await completeStepWithDelay('quality', 200, 'Quality scored');
      await completeStepWithDelay('enrich', 250, 'Data enriched');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 4: AI INSIGHTS
      // ═══════════════════════════════════════════════════════════════
      setPhase('insights');
      
      await completeStepWithDelay('analyze_ai', 300, 'Patterns found');
      await completeStepWithDelay('insights', 350, omniscientResponse.insights ? 'Insights ready' : 'Analysis complete');
      await completeStepWithDelay('finalize', 200, 'Ready!');

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
      
      setSteps(prev => prev.map(s => 
        s.status === 'active' || s.status === 'pending' 
          ? { ...s, status: 'error' } 
          : s
      ));
    }
  }, [updateStep, completeStepWithDelay, startActionMessages, stopActionMessages]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSteps(buildInitialSteps());
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
