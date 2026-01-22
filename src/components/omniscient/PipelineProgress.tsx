// OMNISCIENT v4.0 - Pipeline Progress
// Premium real-time visualization of the data collection process

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Loader2, AlertCircle, MapPin, Database, Brain, Sparkles, 
  Zap, Globe, Radio, Cpu, ArrowRight
} from 'lucide-react';
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

const PHASE_INFO = [
  { id: 'analyzing', label: 'Analyzing Intent', icon: Brain, color: 'text-purple-500' },
  { id: 'collecting', label: 'Collecting Data', icon: Database, color: 'text-cyan-500' },
  { id: 'processing', label: 'Processing', icon: Cpu, color: 'text-orange-500' },
  { id: 'insights', label: 'AI Insights', icon: Sparkles, color: 'text-pink-500' },
];

export function PipelineProgress({
  prompt,
  steps,
  currentPhase,
  sourcesQueried,
  totalRecords,
  elapsedTime,
}: PipelineProgressProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const currentPhaseIndex = PHASE_INFO.findIndex(p => p.id === currentPhase);

  // Pulse animation for active state
  useEffect(() => {
    const interval = setInterval(() => setPulseCount(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-50" />
      <div className="absolute inset-0 radial-overlay pointer-events-none" />
      
      {/* Animated Data Streams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full data-stream"
            style={{ top: `${20 + i * 15}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Logo variant="full" className="scale-110" />
        </motion.div>

        {/* Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl w-full mb-10"
        >
          <div className="card-glass p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Processing Query
                </p>
                <p className="text-lg font-medium text-foreground">{prompt}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phase Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-10"
        >
          {PHASE_INFO.map((phase, i) => {
            const Icon = phase.icon;
            const isActive = phase.id === currentPhase;
            const isComplete = i < currentPhaseIndex;
            
            return (
              <div key={phase.id} className="flex items-center">
                <motion.div
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                    isActive 
                      ? 'bg-accent border border-primary/30 scale-105' 
                      : isComplete 
                        ? 'bg-secondary text-foreground' 
                        : 'bg-secondary/50 text-muted-foreground'
                  }`}
                  animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {/* Pulse ring for active phase */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                  
                  {isActive ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${phase.color}`} />
                  ) : isComplete ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className={`text-sm font-medium ${isActive ? phase.color : ''}`}>
                    {phase.label}
                  </span>
                </motion.div>
                
                {i < PHASE_INFO.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-colors ${
                    isComplete ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Source Progress Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl w-full"
        >
          <div className="grid gap-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all ${
                  step.status === 'active' 
                    ? 'bg-accent/50 border-primary/30 shadow-lg shadow-primary/5' 
                    : step.status === 'complete' 
                      ? 'bg-success/5 border-success/20' 
                      : step.status === 'error' 
                        ? 'bg-destructive/5 border-destructive/20' 
                        : 'bg-card/50 border-border/50'
                }`}
              >
                {/* Status Icon */}
                <div className="w-8 flex justify-center">
                  <AnimatePresence mode="wait">
                    {step.status === 'active' && (
                      <motion.div
                        key="active"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative"
                      >
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <Radio className="w-3 h-3 text-primary absolute inset-0 m-auto" />
                      </motion.div>
                    )}
                    {step.status === 'complete' && (
                      <motion.div
                        key="complete"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-success flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    {step.status === 'error' && (
                      <motion.div
                        key="error"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      </motion.div>
                    )}
                    {step.status === 'pending' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Label & Detail */}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    step.status === 'active' ? 'text-primary' :
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

                {/* Record Count */}
                {step.recordCount !== undefined && step.status === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium"
                  >
                    {step.recordCount} records
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
          className="mt-12 flex items-center gap-8"
        >
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border">
            <Database className="w-4 h-4 text-primary" />
            <div>
              <motion.span 
                key={totalRecords}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold text-foreground"
              >
                {totalRecords}
              </motion.span>
              <span className="text-sm text-muted-foreground ml-1">records</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border">
            <Globe className="w-4 h-4 text-cyan-500" />
            <div>
              <span className="font-bold text-foreground">{sourcesQueried.length}</span>
              <span className="text-sm text-muted-foreground ml-1">sources</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border">
            <Zap className="w-4 h-4 text-yellow-500" />
            <div>
              <span className="font-bold text-foreground">{(elapsedTime / 1000).toFixed(1)}</span>
              <span className="text-sm text-muted-foreground ml-1">seconds</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
