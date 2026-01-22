// OMNISCIENT Pipeline Progress
// Real-time visualization of data collection

import { motion } from 'framer-motion';
import { Globe, Check, Loader2, AlertCircle, MapPin, Database, Brain, Sparkles } from 'lucide-react';
import type { DataCategory } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';

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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-12"
      >
        <Globe className="w-8 h-8 text-emerald-400" />
        <span className="text-2xl font-bold">OMNISCIENT</span>
      </motion.div>

      {/* Query Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full mb-12"
      >
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <p className="text-white/60 text-sm mb-1">Processing query</p>
              <p className="text-lg text-white">{prompt}</p>
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
                isActive ? 'bg-emerald-500/20 text-emerald-400 scale-105' :
                isComplete ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'
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
                <div className={`w-8 h-0.5 mx-2 ${isComplete ? 'bg-emerald-500' : 'bg-white/10'}`} />
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                step.status === 'active' ? 'bg-white/10' :
                step.status === 'complete' ? 'bg-emerald-500/10' :
                step.status === 'error' ? 'bg-red-500/10' :
                'bg-white/5'
              }`}
            >
              <div className="w-8 flex justify-center">
                {step.status === 'active' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full"
                  />
                )}
                {step.status === 'complete' && (
                  <Check className="w-5 h-5 text-emerald-400" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                {step.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.status === 'active' ? 'text-white' :
                  step.status === 'complete' ? 'text-emerald-400' :
                  step.status === 'error' ? 'text-red-400' :
                  'text-white/50'
                }`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-white/40 mt-0.5">{step.detail}</p>
                )}
              </div>

              {step.recordCount !== undefined && step.status === 'complete' && (
                <span className="text-xs text-white/40">
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
        className="mt-12 flex items-center gap-8 text-sm text-white/40"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>{totalRecords} records collected</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>{sourcesQueried.length} sources queried</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{(elapsedTime / 1000).toFixed(1)}s elapsed</span>
        </div>
      </motion.div>
    </div>
  );
}
