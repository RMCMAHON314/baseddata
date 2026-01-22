// BASED DATA v7.0 - Pipeline Progress
// Premium real-time visualization showing EVERYTHING we're doing

import { useEffect, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Loader2, AlertCircle, MapPin, Database, Brain, Sparkles, 
  Zap, Globe, Radio, Cpu, Search, Clock, Layers, Target
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
  recordCount?: number;
  icon?: string;
}

interface PipelineProgressProps {
  prompt: string;
  steps: PipelineStep[];
  currentPhase: 'analyzing' | 'collecting' | 'processing' | 'insights' | 'complete';
  sourcesQueried: string[];
  totalRecords: number;
  elapsedTime: number;
  currentAction?: string;
}

const PHASE_INFO = [
  { id: 'analyzing', label: 'Understanding', icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  { id: 'collecting', label: 'Collecting', icon: Database, color: 'text-cyan-500', bgColor: 'bg-cyan-500' },
  { id: 'processing', label: 'Processing', icon: Cpu, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { id: 'insights', label: 'AI Analysis', icon: Sparkles, color: 'text-pink-500', bgColor: 'bg-pink-500' },
];

// Group steps by phase for organized display
const PHASE_STEPS: Record<string, string[]> = {
  analyzing: ['parse', 'intent', 'location', 'temporal', 'categories'],
  collecting: ['wildlife', 'weather', 'marine', 'geo', 'gov', 'recreation'],
  processing: ['normalize', 'georef', 'dedup', 'quality', 'enrich'],
  insights: ['analyze_ai', 'insights', 'finalize'],
};

// Forward ref wrapper for AnimatePresence compatibility
const PipelineProgressInner = forwardRef<HTMLDivElement, PipelineProgressProps>(function PipelineProgressInner({
  prompt,
  steps,
  currentPhase,
  sourcesQueried,
  totalRecords,
  elapsedTime,
  currentAction = '',
}, ref) {
  const [displayRecords, setDisplayRecords] = useState(0);
  const currentPhaseIndex = PHASE_INFO.findIndex(p => p.id === currentPhase);
  
  // Animate record counter
  useEffect(() => {
    if (totalRecords > displayRecords) {
      const increment = Math.max(1, Math.floor((totalRecords - displayRecords) / 10));
      const timeout = setTimeout(() => {
        setDisplayRecords(prev => Math.min(prev + increment, totalRecords));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [totalRecords, displayRecords]);

  // Count completed steps
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-50" />
      <div className="absolute inset-0 radial-overlay pointer-events-none" />
      
      {/* Animated Data Streams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full data-stream"
            style={{ top: `${10 + i * 12}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 + (i % 3) * 0.1 }}
            transition={{ delay: i * 0.15 }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Logo variant="full" className="scale-100" />
        </motion.div>

        {/* Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl w-full mb-6"
        >
          <div className="card-glass p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Your Query
                </p>
                <p className="text-base font-medium text-foreground truncate">{prompt}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="max-w-2xl w-full mb-6"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Pipeline Progress</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-cyan-500 to-success rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Phase Progress Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-6 flex-wrap justify-center"
        >
          {PHASE_INFO.map((phase, i) => {
            const Icon = phase.icon;
            const isActive = phase.id === currentPhase;
            const isComplete = i < currentPhaseIndex;
            
            return (
              <div key={phase.id} className="flex items-center">
                <motion.div
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                    isActive 
                      ? 'bg-accent border border-primary/30' 
                      : isComplete 
                        ? 'bg-success/10 border border-success/30' 
                        : 'bg-secondary/50 text-muted-foreground border border-transparent'
                  }`}
                  animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={isActive ? { repeat: Infinity, duration: 2 } : { duration: 0 }}
                >
                  {/* Pulse ring for active phase */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                  )}
                  
                  {isActive ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${phase.color}`} />
                  ) : isComplete ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className={`text-sm font-medium ${isActive ? phase.color : isComplete ? 'text-success' : ''}`}>
                    {phase.label}
                  </span>
                </motion.div>
                
                {i < PHASE_INFO.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 transition-colors ${
                    isComplete ? 'bg-success' : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Current Action Display */}
        <AnimatePresence mode="wait">
          {currentAction && (
            <motion.div
              key={currentAction}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Zap className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-sm font-medium text-primary">{currentAction}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps Grid - Organized by Phase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl w-full"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * i }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  step.status === 'active' 
                    ? 'bg-accent/50 border-primary/30 shadow-lg shadow-primary/5' 
                    : step.status === 'complete' 
                      ? 'bg-success/5 border-success/30' 
                      : step.status === 'error' 
                        ? 'bg-destructive/5 border-destructive/30' 
                        : 'bg-card/30 border-border/30'
                }`}
              >
                {/* Icon/Emoji */}
                <span className="text-lg w-6 text-center flex-shrink-0">
                  {step.icon || '📦'}
                </span>
                
                {/* Status Icon */}
                <div className="w-6 flex justify-center flex-shrink-0">
                  <AnimatePresence mode="wait">
                    {step.status === 'active' && (
                      <motion.div
                        key="active"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="relative"
                      >
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </motion.div>
                    )}
                    {step.status === 'complete' && (
                      <motion.div
                        key="complete"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-5 h-5 rounded-full bg-success flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {step.status === 'error' && (
                      <motion.div
                        key="error"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      </motion.div>
                    )}
                    {step.status === 'pending' && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Label & Detail */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    step.status === 'active' ? 'text-primary' :
                    step.status === 'complete' ? 'text-success' :
                    step.status === 'error' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {step.label}
                  </p>
                  {step.detail && step.status === 'complete' && (
                    <p className="text-xs text-muted-foreground truncate">{step.detail}</p>
                  )}
                </div>

                {/* Record Count Badge */}
                {step.recordCount !== undefined && step.recordCount > 0 && step.status === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold"
                  >
                    +{step.recordCount}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center gap-4 flex-wrap justify-center"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border">
            <Database className="w-4 h-4 text-primary" />
            <div className="flex items-baseline gap-1">
              <motion.span 
                key={displayRecords}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold text-lg text-foreground tabular-nums"
              >
                {displayRecords.toLocaleString()}
              </motion.span>
              <span className="text-sm text-muted-foreground">records</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border">
            <Layers className="w-4 h-4 text-cyan-500" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-lg text-foreground">{completedSteps}</span>
              <span className="text-sm text-muted-foreground">/ {steps.length} steps</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border">
            <Clock className="w-4 h-4 text-yellow-500" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-lg text-foreground tabular-nums">
                {(elapsedTime / 1000).toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
          </div>
        </motion.div>

        {/* "What we're doing" explainer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 max-w-lg text-center"
        >
          <p className="text-xs text-muted-foreground">
            {currentPhase === 'analyzing' && '🔍 Parsing your natural language query to understand exactly what data you need...'}
            {currentPhase === 'collecting' && '🌐 Querying multiple real-time APIs in parallel to gather comprehensive data...'}
            {currentPhase === 'processing' && '⚙️ Normalizing, georeferencing, and quality-scoring all collected records...'}
            {currentPhase === 'insights' && '🧠 Running AI analysis to generate actionable insights from your data...'}
          </p>
        </motion.div>
      </div>
    </div>
  );
});

// Export with display name for debugging
export const PipelineProgress = PipelineProgressInner;
PipelineProgress.displayName = 'PipelineProgress';
