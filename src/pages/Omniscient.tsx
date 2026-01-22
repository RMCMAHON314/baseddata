// BASED DATA v8.0 - Premium Universal Data Pipeline
// Bloomberg Terminal meets Apple Maps meets Palantir

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { OmniscientLanding } from '@/components/omniscient/OmniscientLanding';
import { PremiumOmniscientResults } from '@/components/omniscient/PremiumOmniscientResults';
import { PipelineProgress } from '@/components/omniscient/PipelineProgress';
import { useOmniscient } from '@/hooks/useOmniscient';

type ViewState = 'landing' | 'loading' | 'results';

export default function Omniscient() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const {
    phase,
    steps,
    response,
    features,
    totalRecords,
    elapsedTime,
    error,
    currentAction,
    execute,
    reset,
  } = useOmniscient();

  // Derive view state from phase
  const getViewState = (): ViewState => {
    if (phase === 'idle') return 'landing';
    if (phase === 'complete') return 'results';
    if (phase === 'error') return 'landing';
    return 'loading';
  };

  const viewState = getViewState();

  const handleSubmit = async (prompt: string) => {
    setCurrentPrompt(prompt);
    await execute(prompt);
  };

  const handleBack = () => {
    reset();
    setCurrentPrompt('');
  };

  // Map phase to pipeline progress phase
  const getPipelinePhase = () => {
    switch (phase) {
      case 'analyzing': return 'analyzing';
      case 'collecting': return 'collecting';
      case 'processing': return 'processing';
      case 'insights': return 'insights';
      default: return 'analyzing';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {viewState === 'landing' && (
          <OmniscientLanding
            key="landing"
            onSubmit={handleSubmit}
            isLoading={phase !== 'idle' && phase !== 'error'}
          />
        )}

        {viewState === 'loading' && (
          <PipelineProgress
            key="loading"
            prompt={currentPrompt}
            steps={steps}
            currentPhase={getPipelinePhase()}
            sourcesQueried={response?.collected_data?.map(d => d.source) || []}
            totalRecords={totalRecords}
            elapsedTime={elapsedTime}
            currentAction={currentAction}
          />
        )}

        {viewState === 'results' && response && (
          <PremiumOmniscientResults
            key="results"
            prompt={currentPrompt}
            features={features || undefined}
            collectedData={response.collected_data}
            insights={response.insights}
            creditsUsed={response.credits_used}
            processingTimeMs={response.processing_time_ms}
            sourcesUsed={response.sources_used}
            enrichments={response.enrichments || []}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {error && phase === 'error' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}