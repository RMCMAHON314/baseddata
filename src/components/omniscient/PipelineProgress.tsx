// BASED DATA v10.0 - Premium Pipeline Progress
// Light theme, on-brand with landing page aesthetic

import { useEffect, useState, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Loader2, Brain, Sparkles, Database, Layers, 
  MapPin, Cpu, Globe, CheckCircle
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { COOKING_MESSAGES, COOKING_DISCLAIMER } from '@/lib/constants';

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
  { id: 'analyzing', label: 'Understanding', icon: Brain },
  { id: 'collecting', label: 'Collecting', icon: Database },
  { id: 'processing', label: 'Processing', icon: Layers },
  { id: 'insights', label: 'AI Analysis', icon: Sparkles },
];

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
  const [cookingMessage, setCookingMessage] = useState(COOKING_MESSAGES[0]);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const currentPhaseIndex = PHASE_INFO.findIndex(p => p.id === currentPhase);
  
  // Cycle messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % COOKING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    setCookingMessage(COOKING_MESSAGES[messageIndex]);
  }, [messageIndex]);
  
  // Smooth record counter
  useEffect(() => {
    if (totalRecords > displayRecords) {
      const diff = totalRecords - displayRecords;
      const increment = Math.max(1, Math.ceil(diff / 15));
      const timeout = setTimeout(() => {
        setDisplayRecords(prev => Math.min(prev + increment, totalRecords));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [totalRecords, displayRecords]);

  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const activeSteps = steps.filter(s => s.status === 'active');
  const progressPercent = Math.round((completedSteps / Math.max(steps.length, 1)) * 100);

  return (
    <motion.div 
      ref={ref} 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white text-slate-900 flex flex-col relative overflow-hidden"
    >
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-50" />
      <div className="absolute inset-0 radial-overlay pointer-events-none" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 max-w-2xl mx-auto w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Logo variant="full" className="scale-110" />
        </motion.div>

        {/* Version Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 mb-6"
        >
          <Sparkles className="w-4 h-4" />
          OMNISCIENT v4.0
        </motion.div>

        {/* Cooking Message */}
        <motion.div className="mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={cookingMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg font-medium text-slate-600 text-center"
            >
              {cookingMessage}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Query Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full mb-8"
        >
          <div className="card-premium p-4 border-l-4 border-l-blue-500">
            <p className="text-base font-medium text-slate-800 text-center truncate">
              "{prompt}"
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="w-full mb-8 relative"
        >
          <div className="flex justify-end mb-2">
            <span className="text-sm font-semibold text-blue-600">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Phase Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-8 flex-wrap"
        >
          {PHASE_INFO.map((phase, i) => {
            const Icon = phase.icon;
            const isActive = phase.id === currentPhase;
            const isComplete = i < currentPhaseIndex;
            
            return (
              <div
                key={phase.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isComplete 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {phase.label}
              </div>
            );
          })}
        </motion.div>

        {/* Current Action */}
        <AnimatePresence mode="wait">
          {currentAction && (
            <motion.div
              key={currentAction}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-6 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {currentAction}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Sources Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full mb-8"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {steps.filter(s => s.status === 'active' || s.status === 'complete').slice(-12).map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  step.status === 'active'
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <span className="text-base flex-shrink-0">{step.icon || '📊'}</span>
                {step.status === 'active' ? (
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                <span className={`text-xs font-medium truncate ${
                  step.status === 'active' ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                  {step.label.split(' ').slice(0, 2).join(' ')}
                </span>
                {step.recordCount && step.recordCount > 0 && (
                  <span className="text-xs font-bold text-emerald-600 ml-auto">+{step.recordCount}</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-8 pt-6 border-t border-slate-200 w-full"
        >
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <motion.span 
              key={displayRecords}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-bold text-xl text-slate-800 tabular-nums"
            >
              {displayRecords.toLocaleString()}
            </motion.span>
            <span className="text-sm text-slate-500">records</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-xl text-slate-800">{completedSteps}</span>
            <span className="text-sm text-slate-500">/ {steps.length} steps</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-500" />
            <span className="font-bold text-xl text-slate-800">{sourcesQueried.length}</span>
            <span className="text-sm text-slate-500">sources</span>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 max-w-lg text-center"
        >
          <p className="text-xs text-slate-400">
            {COOKING_DISCLAIMER}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
});

export const PipelineProgress = PipelineProgressInner;
PipelineProgress.displayName = 'PipelineProgress';
