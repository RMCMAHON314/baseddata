// BASED DATA v7.5 - Pipeline Progress
// 15/10 smooth animations with real work visibility
// No response time, just pure cooking energy

import { useEffect, useState, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Loader2, AlertCircle, Brain, Sparkles, 
  Zap, Database, Layers, ChefHat, Flame
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { COOKING_MESSAGES, COOKING_DISCLAIMER, CATEGORY_META } from '@/lib/constants';

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
  { id: 'analyzing', label: 'Understanding', icon: Brain, color: 'text-purple-400', bgColor: 'bg-purple-500' },
  { id: 'collecting', label: 'Collecting', icon: Database, color: 'text-cyan-400', bgColor: 'bg-cyan-500' },
  { id: 'processing', label: 'Processing', icon: Layers, color: 'text-orange-400', bgColor: 'bg-orange-500' },
  { id: 'insights', label: 'AI Analysis', icon: Sparkles, color: 'text-pink-400', bgColor: 'bg-pink-500' },
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
  
  // Cycle cooking messages for fun
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % COOKING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    setCookingMessage(COOKING_MESSAGES[messageIndex]);
  }, [messageIndex]);
  
  // Smooth record counter animation
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

  // Count completed steps
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const activeSteps = steps.filter(s => s.status === 'active');
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  // Get active categories from steps
  const activeCategories = useMemo(() => {
    return activeSteps.map(s => {
      const meta = Object.entries(CATEGORY_META).find(([_, m]) => 
        s.label.toLowerCase().includes(m.description.toLowerCase().split(',')[0])
      );
      return meta ? { key: meta[0], ...meta[1] } : null;
    }).filter(Boolean).slice(0, 6);
  }, [activeSteps]);

  return (
    <motion.div 
      ref={ref} 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-30" />
      <div className="absolute inset-0 radial-overlay pointer-events-none" />
      
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl opacity-20"
            style={{
              background: `radial-gradient(circle, hsl(${200 + i * 30}, 80%, 60%), transparent)`,
              width: `${200 + i * 50}px`,
              height: `${200 + i * 50}px`,
            }}
            animate={{
              x: [0, 100, -100, 0],
              y: [0, -50, 50, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            initial={{
              left: `${10 + i * 20}%`,
              top: `${20 + i * 15}%`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Logo variant="full" className="scale-110" />
        </motion.div>

        {/* Cooking Message - Fun and engaging */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={cookingMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <ChefHat className="w-6 h-6 text-orange-400" />
              </motion.div>
              <span className="text-lg font-medium text-orange-300">{cookingMessage}</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Flame className="w-5 h-5 text-red-400" />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl w-full mb-6"
        >
          <div className="card-glass p-4">
            <p className="text-base font-medium text-foreground text-center truncate">
              "{prompt}"
            </p>
          </div>
        </motion.div>

        {/* Progress Bar - Beautiful gradient */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="max-w-xl w-full mb-8"
        >
          <div className="h-3 bg-secondary/50 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(180, 80%, 50%), hsl(var(--success)))',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Querying 100+ APIs</span>
            <span className="font-mono font-bold text-primary">{progressPercent}%</span>
          </div>
        </motion.div>

        {/* Phase Progress - Beautiful pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 mb-8 flex-wrap justify-center"
        >
          {PHASE_INFO.map((phase, i) => {
            const Icon = phase.icon;
            const isActive = phase.id === currentPhase;
            const isComplete = i < currentPhaseIndex;
            
            return (
              <motion.div
                key={phase.id}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20' 
                    : isComplete 
                      ? 'bg-success/20 border border-success/50' 
                      : 'bg-secondary/30 text-muted-foreground border border-transparent'
                }`}
                animate={isActive ? { 
                  boxShadow: ['0 0 20px rgba(var(--primary), 0.3)', '0 0 40px rgba(var(--primary), 0.5)', '0 0 20px rgba(var(--primary), 0.3)']
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                
                {isActive ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${phase.color}`} />
                ) : isComplete ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className={`text-sm font-semibold ${isActive ? phase.color : isComplete ? 'text-success' : ''}`}>
                  {phase.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Current Action - What we're doing RIGHT NOW */}
        <AnimatePresence mode="wait">
          {currentAction && (
            <motion.div
              key={currentAction}
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="mb-6 px-5 py-2.5 rounded-xl bg-accent/50 border border-primary/30 backdrop-blur-sm"
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

        {/* Active Steps Grid - Shows EXACTLY what's happening */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl w-full mb-8"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {steps.filter(s => s.status === 'active' || s.status === 'complete').slice(-12).map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  step.status === 'active' 
                    ? 'bg-primary/10 border-primary/40 shadow-sm' 
                    : 'bg-success/5 border-success/30'
                }`}
              >
                <span className="text-base flex-shrink-0">{step.icon || '📦'}</span>
                {step.status === 'active' ? (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                )}
                <span className={`text-xs font-medium truncate ${
                  step.status === 'active' ? 'text-primary' : 'text-success'
                }`}>
                  {step.label.split(' ').slice(0, 2).join(' ')}
                </span>
                {step.recordCount && step.recordCount > 0 && (
                  <span className="text-xs font-bold text-success ml-auto">+{step.recordCount}</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Stats - Records and Steps only, no time */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4 flex-wrap justify-center"
        >
          <motion.div 
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-cyan-500/10 border border-primary/30"
            whileHover={{ scale: 1.02 }}
          >
            <Database className="w-5 h-5 text-primary" />
            <motion.span 
              key={displayRecords}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-bold text-xl text-foreground tabular-nums"
            >
              {displayRecords.toLocaleString()}
            </motion.span>
            <span className="text-sm text-muted-foreground">records</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-success/10 to-emerald-500/10 border border-success/30"
            whileHover={{ scale: 1.02 }}
          >
            <Layers className="w-5 h-5 text-success" />
            <span className="font-bold text-xl text-foreground">{completedSteps}</span>
            <span className="text-sm text-muted-foreground">/ {steps.length} steps</span>
          </motion.div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 max-w-lg text-center"
        >
          <p className="text-xs text-muted-foreground/70">
            {COOKING_DISCLAIMER}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
});

export const PipelineProgress = PipelineProgressInner;
PipelineProgress.displayName = 'PipelineProgress';
