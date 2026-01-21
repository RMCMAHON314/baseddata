// Based Data - Generation Progress View
// Transparent AI - shows exactly what's happening

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Search, Database, Sparkles, FileText, Layers } from 'lucide-react';
import type { GenerationStep } from '@/types/dataset';

interface GeneratingViewProps {
  prompt: string;
  steps: GenerationStep[];
  progress: number;
  currentStepIndex: number;
}

const stepIcons: Record<string, any> = {
  understand: Sparkles,
  sources: Search,
  crawling: Database,
  processing: Layers,
  insights: FileText,
};

export function GeneratingView({ 
  prompt, 
  steps, 
  progress,
  currentStepIndex,
}: GeneratingViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4"
    >
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-electric/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Query display */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-muted-foreground text-sm mb-2 lowercase">
            generating dataset for
          </p>
          <h2 className="text-xl sm:text-2xl font-display font-medium text-foreground">
            "{prompt}"
          </h2>
        </motion.div>

        {/* Progress card */}
        <div className="glass rounded-2xl p-6 border border-border/50 mb-6">
          {/* Steps list */}
          <div className="space-y-4 mb-8">
            <AnimatePresence mode="wait">
              {steps.map((step, index) => {
                const Icon = stepIcons[step.id] || Sparkles;
                const isActive = step.status === 'running';
                const isComplete = step.status === 'complete';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: step.status === 'pending' ? 0.4 : 1,
                      x: 0,
                    }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isComplete
                          ? 'bg-electric'
                          : isActive
                          ? 'bg-electric/20 border-2 border-electric'
                          : 'bg-secondary/50 border border-border'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-electric animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium lowercase transition-colors duration-300 ${
                          isActive
                            ? 'text-foreground'
                            : isComplete
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/50'
                        }`}
                      >
                        {step.label}
                        {isActive && '...'}
                      </p>
                      {step.detail && isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-muted-foreground mt-0.5 lowercase"
                        >
                          {step.detail}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric to-purple rounded-full"
            />
            {/* Glow effect */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric to-purple rounded-full blur-sm opacity-50"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4 lowercase">
            {Math.round(progress)}% complete
          </p>
        </div>
      </div>
    </motion.div>
  );
}
