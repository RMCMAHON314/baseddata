// Based Data - Dataset Generation Hook
// Ultimate Engine v3 orchestration - ZERO AI CREDITS
// PhD-level engineering with blazing fast performance

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateDataset } from '@/lib/datasets';
import { 
  GENERATION_STEPS, 
  STEP_DETAILS, 
  STEP_TIMINGS, 
  DATA_SIZE_OPTIONS, 
  FRESHNESS_OPTIONS, 
  CREDIT_COSTS 
} from '@/lib/constants';
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
  const [steps, setSteps] = useState<GenerationStep[]>(
    GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const }))
  );
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DatasetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GenerationStats>(DEFAULT_STATS);
  
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

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

  // Calculate cost based on v3 pricing
  const calculateCost = useCallback((options: GenerationOptions): number => {
    const sizeOption = DATA_SIZE_OPTIONS.find(o => o.id === options.dataSize);
    const freshnessOption = FRESHNESS_OPTIONS.find(o => o.id === options.freshness);
    return (sizeOption?.cost || 8) + (freshnessOption?.extraCost || 0);
  }, []);

  // Live stats animation - shows v3 engine power
  const startLiveStats = useCallback((dataSize: string) => {
    const startTime = Date.now();
    const maxSources = dataSize === 'large' ? 89 : dataSize === 'small' ? 23 : 47;
    const maxRecords = dataSize === 'large' ? 5000 : dataSize === 'small' ? 500 : 2341;
    
    statsIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      setStats({
        sourcesFound: Math.min(maxSources, Math.floor(elapsed * 20)),
        recordsProcessed: Math.min(maxRecords, Math.floor(elapsed * 1000)),
        timeElapsed: elapsed,
      });
    }, 50); // 50ms for ultra-smooth updates
  }, []);

  // Ultra-fast progress simulation matching v3 speed
  const simulateProgress = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const stepIds = ['understand', 'sources', 'crawling', 'processing', 'insights'];
      let totalDelay = 0;

      stepIds.forEach((stepId, index) => {
        const timing = STEP_TIMINGS[stepId as keyof typeof STEP_TIMINGS] || 500;
        totalDelay += timing;

        // Start step
        setTimeout(() => {
          if (!isMountedRef.current) return;
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

        // Complete step
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setSteps(prev => prev.map((step, idx) =>
            idx === index ? { ...step, status: 'complete' as const } : step
          ));
          setProgress(((index + 1) / stepIds.length) * 100);
        }, totalDelay);
      });

      setTimeout(resolve, totalDelay + 100);
    });
  }, []);

  const startGeneration = useCallback(async (prompt: string, options: GenerationOptions) => {
    // Auth disabled for testing - use test user ID
    const testUserId = user?.id || 'test-user-' + Date.now();

    // Reset and start
    setState('generating');
    setError(null);
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setProgress(0);
    setCurrentStepIndex(0);
    setStats(DEFAULT_STATS);
    
    // Start live stats with size context
    startLiveStats(options.dataSize);

    try {
      // Run progress simulation concurrently with actual generation
      const [, generationResult] = await Promise.all([
        simulateProgress(),
        generateDataset({ prompt, userId: testUserId, options }),
      ]);

      // Stop live stats
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      if (!isMountedRef.current) return;

      setResult(generationResult);
      await refreshProfile();
      setState('complete');
      
      toast.success(`Generated ${generationResult.data.length} records using 0 AI credits 🔥`);
    } catch (err: any) {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
      if (!isMountedRef.current) return;
      
      console.error('Generation failed:', err);
      const errorMessage = err.message || 'generation failed - please try again';
      setError(errorMessage);
      setState('error');
      toast.error(errorMessage);
    }
  }, [user, profile, refreshProfile, simulateProgress, startLiveStats, calculateCost]);

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