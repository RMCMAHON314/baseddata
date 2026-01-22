// OMNISCIENT v1.1 Query Hook
// Manages the full data pipeline: query → collect → persist → visualize

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  OmniscientQuery, 
  OmniscientResponse, 
  CollectedData,
  GeoJSONFeatureCollection 
} from '@/types/omniscient';

export type OmniscientPhase = 'idle' | 'analyzing' | 'collecting' | 'processing' | 'complete' | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
  recordCount?: number;
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
  execute: (prompt: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'analyze', label: 'Analyzing query intent', status: 'pending' },
  { id: 'wildlife', label: 'Wildlife & Environment APIs', status: 'pending' },
  { id: 'weather', label: 'Weather & Climate APIs', status: 'pending' },
  { id: 'marine', label: 'Marine & Tides APIs', status: 'pending' },
  { id: 'geo', label: 'Geospatial & Mapping APIs', status: 'pending' },
  { id: 'gov', label: 'Government & Regulations', status: 'pending' },
  { id: 'process', label: 'Processing & georeferencing', status: 'pending' },
];

export function useOmniscient(): UseOmniscientReturn {
  const [phase, setPhase] = useState<OmniscientPhase>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [query, setQuery] = useState<OmniscientQuery | null>(null);
  const [response, setResponse] = useState<OmniscientResponse | null>(null);
  const [features, setFeatures] = useState<GeoJSONFeatureCollection | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback((id: string, updates: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const execute = useCallback(async (prompt: string) => {
    const startTime = Date.now();
    setPhase('analyzing');
    setError(null);
    setSteps(INITIAL_STEPS);
    setQuery({ prompt, timestamp: new Date().toISOString() });

    // Step 1: Analyzing
    updateStep('analyze', { status: 'active' });

    try {
      // Simulate brief analysis phase for UX
      await new Promise(r => setTimeout(r, 500));
      updateStep('analyze', { status: 'complete', detail: 'Intent extracted' });

      // Step 2-6: Collecting (happens in parallel on backend)
      setPhase('collecting');
      ['wildlife', 'weather', 'marine', 'geo', 'gov'].forEach(id => {
        updateStep(id, { status: 'active' });
      });

      // Call the OMNISCIENT edge function
      const { data, error: fnError } = await supabase.functions.invoke('omniscient', {
        body: { prompt },
      });

      if (fnError) throw fnError;

      const omniscientResponse = data as OmniscientResponse;

      // Update steps based on collected data
      const sourceToStep: Record<string, string> = {
        'eBird': 'wildlife',
        'iNaturalist': 'wildlife',
        'GBIF': 'wildlife',
        'NOAA Weather': 'weather',
        'NOAA Tides': 'marine',
        'OpenStreetMap': 'geo',
        'USGS': 'geo',
        'USASpending': 'gov',
        'Hunting Regulations': 'gov',
      };

      // Mark all collecting steps as complete with record counts
      const stepRecords: Record<string, number> = {};
      for (const result of omniscientResponse.collected_data) {
        const stepId = sourceToStep[result.source] || 'gov';
        stepRecords[stepId] = (stepRecords[stepId] || 0) + result.record_count;
      }

      Object.entries(stepRecords).forEach(([stepId, count]) => {
        updateStep(stepId, { 
          status: 'complete', 
          recordCount: count,
          detail: `${count} records collected`
        });
      });

      // Mark empty steps
      ['wildlife', 'weather', 'marine', 'geo', 'gov'].forEach(id => {
        if (!stepRecords[id]) {
          updateStep(id, { status: 'complete', recordCount: 0, detail: 'No matching data' });
        }
      });

      // Step 7: Processing
      setPhase('processing');
      updateStep('process', { status: 'active' });
      await new Promise(r => setTimeout(r, 300));
      updateStep('process', { status: 'complete', detail: 'Data unified' });

      // Set final state
      setResponse(omniscientResponse);
      setFeatures(omniscientResponse.features);
      setTotalRecords(omniscientResponse.features?.features?.length || 0);
      setElapsedTime(Date.now() - startTime);
      setPhase('complete');

    } catch (err: any) {
      console.error('OMNISCIENT error:', err);
      setError(err.message || 'Failed to execute query');
      setPhase('error');
      
      // Mark pending steps as error
      setSteps(prev => prev.map(s => 
        s.status === 'active' || s.status === 'pending' 
          ? { ...s, status: 'error' } 
          : s
      ));
    }
  }, [updateStep]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSteps(INITIAL_STEPS);
    setQuery(null);
    setResponse(null);
    setFeatures(null);
    setTotalRecords(0);
    setElapsedTime(0);
    setError(null);
  }, []);

  return {
    phase,
    steps,
    query,
    response,
    features,
    totalRecords,
    elapsedTime,
    error,
    execute,
    reset,
  };
}
