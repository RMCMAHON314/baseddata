// Based Data - Dataset Generation Hook
// Handles all generation state and orchestrates the pipeline with live stats

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateDataset } from '@/lib/datasets';
import { GENERATION_STEPS, STEP_DETAILS, STEP_TIMINGS, DATA_SIZE_OPTIONS, FRESHNESS_OPTIONS, CREDIT_COSTS } from '@/lib/constants';
import type { GenerationStep, DatasetResult, GenerationOptions, GenerationStats } from '@/types/dataset';
import { toast } from 'sonner';

export type GenerationState = 'idle' | 'generating' | 'complete' | 'error';

const DEFAULT_STATS: GenerationStats = { sourcesFound: 0, recordsProcessed: 0, timeElapsed: 0 };

interface UseDatasetGenerationReturn {
  state: GenerationState;
  steps: GenerationStep[];
  progress: number;
  currentStepIndex: number;
  result: DatasetResult | null;
  error: string | null;
  stats: GenerationStats;
  startGeneration: (prompt: string, options: GenerationOptions) => Promise<void>;
  reset: () => void;
}

export function useDatasetGeneration(): UseDatasetGenerationReturn {
  const { user, refreshProfile, profile } = useAuth();
  const [state, setState] = useState<GenerationState>('idle');
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DatasetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GenerationStats>(DEFAULT_STATS);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    setState('idle');
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setProgress(0);
    setCurrentStepIndex(0);
    setResult(null);
    setError(null);
    setStats(DEFAULT_STATS);
  }, []);

  const calculateCost = (options: GenerationOptions): number => {
    const sizeOption = DATA_SIZE_OPTIONS.find(o => o.id === options.dataSize);
    const freshnessOption = FRESHNESS_OPTIONS.find(o => o.id === options.freshness);
    let total = sizeOption?.cost || 15;
    total += freshnessOption?.extraCost || 0;
    if (options.includeInsights) total += CREDIT_COSTS.insights;
    return total;
  };

  const startLiveStats = useCallback(() => {
    const startTime = Date.now();
    const maxSources = 47;
    const maxRecords = 2341;
    
    statsIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setStats({
        sourcesFound: Math.min(maxSources, Math.floor(elapsed * 12)),
        recordsProcessed: Math.min(maxRecords, Math.floor(elapsed * 500)),
        timeElapsed: elapsed,
      });
    }, 100);
  }, []);

  const simulateProgress = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const stepIds = ['understand', 'sources', 'crawling', 'processing', 'insights'];
      let totalDelay = 0;

      stepIds.forEach((stepId, index) => {
        const timing = STEP_TIMINGS[stepId as keyof typeof STEP_TIMINGS] || 800;
        totalDelay += timing;

        // Set step to running
        setTimeout(() => {
          setCurrentStepIndex(index);
          const details = STEP_DETAILS[stepId];
          const randomDetail = details[Math.floor(Math.random() * details.length)];
          
          setSteps(prev => prev.map((step, idx) =>
            idx === index 
              ? { ...step, status: 'running' as const, detail: randomDetail }
              : step
          ));
          setProgress(((index + 0.5) / stepIds.length) * 100);
        }, totalDelay - timing);

        // Set step to complete
        setTimeout(() => {
          setSteps(prev => prev.map((step, idx) =>
            idx === index ? { ...step, status: 'complete' as const } : step
          ));
          setProgress(((index + 1) / stepIds.length) * 100);
        }, totalDelay);
      });

      // Resolve after all steps complete
      setTimeout(resolve, totalDelay + 200);
    });
  }, []);

  const startGeneration = useCallback(async (prompt: string, options: GenerationOptions) => {
    if (!user) {
      toast.error('please sign in to generate datasets');
      return;
    }

    const cost = calculateCost(options);
    if (profile && profile.credits_balance < cost) {
      toast.error(`insufficient credits - need ${cost}, have ${profile.credits_balance}`);
      return;
    }

    setState('generating');
    setError(null);
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setProgress(0);
    setCurrentStepIndex(0);
    setStats(DEFAULT_STATS);
    
    // Start live stats counter
    startLiveStats();

    try {
      // Run progress simulation concurrently with actual generation
      const [, generationResult] = await Promise.all([
        simulateProgress(),
        generateDataset({ prompt, userId: user.id }),
      ]);

      // Stop live stats
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      setResult(generationResult);
      await refreshProfile();
      setState('complete');
    } catch (err: any) {
      // Stop live stats
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
      console.error('Generation failed:', err);
      setError(err.message || 'generation failed - please try again');
      setState('error');
      toast.error(err.message || 'generation failed - please try again');
    }
  }, [user, profile, refreshProfile, simulateProgress, startLiveStats]);

  return {
    state,
    steps,
    progress,
    currentStepIndex,
    result,
    error,
    stats,
    startGeneration,
    reset,
  };
}