// Based Data - Dataset Generation Hook
// Handles all generation state and orchestrates the pipeline

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateDataset } from '@/lib/datasets';
import { GENERATION_STEPS, STEP_DETAILS, STEP_TIMINGS } from '@/lib/constants';
import type { GenerationStep, DatasetResult } from '@/types/dataset';
import { toast } from 'sonner';

export type GenerationState = 'idle' | 'generating' | 'complete' | 'error';

interface UseDatasetGenerationReturn {
  state: GenerationState;
  steps: GenerationStep[];
  progress: number;
  currentStepIndex: number;
  result: DatasetResult | null;
  error: string | null;
  startGeneration: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useDatasetGeneration(): UseDatasetGenerationReturn {
  const { user, refreshProfile } = useAuth();
  const [state, setState] = useState<GenerationState>('idle');
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DatasetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setProgress(0);
    setCurrentStepIndex(0);
    setResult(null);
    setError(null);
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

  const startGeneration = useCallback(async (prompt: string) => {
    if (!user) {
      toast.error('please sign in to generate datasets');
      return;
    }

    setState('generating');
    setError(null);
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setProgress(0);
    setCurrentStepIndex(0);

    try {
      // Run progress simulation concurrently with actual generation
      const [, generationResult] = await Promise.all([
        simulateProgress(),
        generateDataset({ prompt, userId: user.id }),
      ]);

      setResult(generationResult);
      await refreshProfile();
      setState('complete');
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err.message || 'generation failed - please try again');
      setState('error');
      toast.error(err.message || 'generation failed - please try again');
    }
  }, [user, refreshProfile, simulateProgress]);

  return {
    state,
    steps,
    progress,
    currentStepIndex,
    result,
    error,
    startGeneration,
    reset,
  };
}
