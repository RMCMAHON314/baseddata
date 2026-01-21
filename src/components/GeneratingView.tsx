// Based Data - Generation Progress View
// Clean white theme with transparent AI progress

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Brain, Map, Globe, Cog, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import type { GenerationStep, GenerationStats } from '@/types/dataset';

interface GeneratingViewProps {
  prompt: string;
  steps: GenerationStep[];
  progress: number;
  currentStepIndex: number;
  stats: GenerationStats;
  credits: number;
}

const stepIcons: Record<string, any> = {
  understand: Brain,
  sources: Map,
  crawling: Globe,
  processing: Cog,
  insights: Sparkles,
};

export function GeneratingView({ 
  prompt, 
  steps, 
  progress,
  currentStepIndex,
  stats,
  credits,
}: GeneratingViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <header className="container mx-auto px-8 py-5 flex items-center justify-between border-b border-border">
        <Logo size="md" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-accent-foreground text-sm font-semibold">
            {credits} credits
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 max-w-2xl mx-auto w-full">
        {/* Query Display */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-sm text-muted-foreground mb-2">Generating dataset for</p>
          <h1 className="text-2xl font-semibold text-foreground">"{prompt}"</h1>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-12 w-full"
        >
          {[
            { label: 'Sources Found', value: stats.sourcesFound },
            { label: 'Records Processed', value: stats.recordsProcessed.toLocaleString() },
            { label: 'Time Elapsed', value: `${stats.timeElapsed.toFixed(1)}s` },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-accent">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-12 w-full">
          <AnimatePresence mode="wait">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id] || Sparkles;
              const isActive = step.status === 'running';
              const isComplete = step.status === 'complete';
              const isPending = step.status === 'pending';

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: isPending ? 0.4 : 1,
                    x: 0,
                  }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                    isComplete ? 'bg-success/10' : isActive ? 'bg-card' : ''
                  }`}
                >
                  {/* Status indicator */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-lg ${
                      isComplete
                        ? 'bg-success'
                        : isActive
                        ? 'bg-primary'
                        : 'bg-secondary'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5 text-success-foreground" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1">
                    <div className={`font-medium transition-colors ${
                      isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                      {isActive && <span className="animate-pulse">...</span>}
                    </div>
                    {step.detail && (
                      <div className="text-sm text-muted-foreground">{step.detail}</div>
                    )}
                  </div>

                  {/* Spinner for active step */}
                  {isActive && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            {Math.round(progress)}% complete
          </p>
        </div>
      </main>
    </motion.div>
  );
}
