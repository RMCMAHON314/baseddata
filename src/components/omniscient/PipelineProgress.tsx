// BASED DATA - Pipeline Progress
// Real-time visualization of data collection

import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, MapPin, Database, Brain, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
  recordCount?: number;
}

interface PipelineProgressProps {
  prompt: string;
  steps: PipelineStep[];
  currentPhase: 'analyzing' | 'collecting' | 'processing' | 'insights' | 'complete';
  sourcesQueried: string[];
  totalRecords: number;
  elapsedTime: number;
}

export function PipelineProgress({
  prompt,
  steps,
  currentPhase,
  sourcesQueried,
  totalRecords,
  elapsedTime,
}: PipelineProgressProps) {
  const phases = [
    { id: 'analyzing', label: 'Analyzing Query', icon: Brain },
    { id: 'collecting', label: 'Collecting Data', icon: Database },
    { id: 'processing', label: 'Processing', icon: Sparkles },
    { id: 'insights', label: 'Generating Insights', icon: Sparkles },
  ];

  const currentPhaseIndex = phases.findIndex(p => p.id === currentPhase);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <Logo variant="full" className="scale-125" />
      </motion.div>

      {/* Query Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full mb-12"
      >
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-muted-foreground text-sm mb-1">Processing query</p>
              <p className="text-lg text-foreground">{prompt}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Phase Progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 mb-12"
      >
        {phases.map((phase, i) => {
          const Icon = phase.icon;
          const isActive = phase.id === currentPhase;
          const isComplete = i < currentPhaseIndex;
          
          return (
            <div key={phase.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive ? 'bg-accent text-primary scale-105' :
                isComplete ? 'bg-secondary text-foreground' : 'bg-secondary/50 text-muted-foreground'
              }`}>
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{phase.label}</span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${isComplete ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Source Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-2xl w-full"
      >
        <div className="space-y-2">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                step.status === 'active' ? 'bg-accent border-primary/20' :
                step.status === 'complete' ? 'bg-success/10 border-success/20' :
                step.status === 'error' ? 'bg-destructive/10 border-destructive/20' :
                'bg-secondary/50 border-border'
              }`}
            >
              <div className="w-8 flex justify-center">
                {step.status === 'active' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  />
                )}
                {step.status === 'complete' && (
                  <Check className="w-5 h-5 text-success" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                {step.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.status === 'active' ? 'text-foreground' :
                  step.status === 'complete' ? 'text-success' :
                  step.status === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                )}
              </div>

              {step.recordCount !== undefined && step.status === 'complete' && (
                <span className="text-xs text-muted-foreground">
                  {step.recordCount} records
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex items-center gap-8 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>{totalRecords} records collected</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{sourcesQueried.length} sources queried</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{(elapsedTime / 1000).toFixed(1)}s elapsed</span>
        </div>
      </motion.div>
    </div>
  );
}