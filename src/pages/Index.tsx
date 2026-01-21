// Based Data - Main App Page
// Clean orchestration using hooks and focused components

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Header } from '@/components/Header';
import { LandingHero } from '@/components/LandingHero';
import { GeneratingView } from '@/components/GeneratingView';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { useDatasetGeneration } from '@/hooks/useDatasetGeneration';
import { toast } from 'sonner';

type AppState = 'landing' | 'generating' | 'results';

const Index = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [appState, setAppState] = useState<AppState>('landing');
  const [prompt, setPrompt] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  const {
    state: generationState,
    steps,
    progress,
    currentStepIndex,
    result,
    startGeneration,
    reset: resetGeneration,
  } = useDatasetGeneration();

  // Handle generation completion
  const handleGenerationComplete = useCallback(() => {
    if (generationState === 'complete' && result) {
      setAppState('results');
    } else if (generationState === 'error') {
      setAppState('landing');
    }
  }, [generationState, result]);

  // Watch for generation state changes
  if (generationState === 'complete' && appState === 'generating' && result) {
    setAppState('results');
  } else if (generationState === 'error' && appState === 'generating') {
    setAppState('landing');
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    // Check if user is logged in
    if (!user) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }

    // Check credits
    if (profile && profile.credits_balance < 5) {
      toast.error('insufficient credits - please purchase more');
      return;
    }

    setAppState('generating');
    await startGeneration(prompt);
  };

  const handleBackToLanding = () => {
    setAppState('landing');
    setPrompt('');
    resetGeneration();
  };

  const openSignIn = () => {
    setAuthModalMode('signin');
    setAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthModalMode('signup');
    setAuthModalOpen(true);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-electric animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background">
      {/* Header for authenticated states */}
      {user && appState !== 'landing' && <Header />}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

      <AnimatePresence mode="wait">
        {appState === 'landing' && (
          <LandingHero
            key="landing"
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleSubmit}
            isGenerating={generationState === 'generating'}
            isLoggedIn={!!user}
            credits={profile?.credits_balance || 0}
            userName={profile?.full_name || user?.email?.split('@')[0]}
            onSignIn={openSignIn}
            onSignUp={openSignUp}
          />
        )}

        {appState === 'generating' && (
          <GeneratingView
            key="generating"
            prompt={prompt}
            steps={steps}
            progress={progress}
            currentStepIndex={currentStepIndex}
          />
        )}

        {appState === 'results' && result && (
          <ResultsDashboard
            key="results"
            title={result.title}
            prompt={prompt}
            creditsUsed={result.creditsUsed}
            data={result.data}
            insights={result.insights}
            onBack={handleBackToLanding}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
