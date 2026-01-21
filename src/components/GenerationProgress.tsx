import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Search, Database, Sparkles, FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface GenerationStep {
  id: string;
  label: string;
  status: "pending" | "running" | "complete";
  detail?: string;
}

interface GenerationProgressProps {
  prompt: string;
  onComplete: () => void;
}

const initialSteps: GenerationStep[] = [
  { id: "understand", label: "Understanding your request", status: "pending" },
  { id: "sources", label: "Identifying data sources", status: "pending" },
  { id: "crawling", label: "Crawling & collecting data", status: "pending" },
  { id: "processing", label: "Processing & normalizing", status: "pending" },
  { id: "insights", label: "Generating insights", status: "pending" },
];

const stepIcons = {
  understand: Sparkles,
  sources: Search,
  crawling: Database,
  processing: FileText,
  insights: Sparkles,
};

export function GenerationProgress({ prompt, onComplete }: GenerationProgressProps) {
  const [steps, setSteps] = useState<GenerationStep[]>(initialSteps);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const stepDetails = [
      "Analyzing query intent and parameters...",
      "Found 4 reliable data sources",
      "Collected 127 records from Crunchbase, SEC, News...",
      "Cross-referencing and validating data...",
      "Identifying patterns and outliers...",
    ];

    const runSimulation = async () => {
      for (let i = 0; i < steps.length; i++) {
        // Set current step to running
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: "running", detail: stepDetails[i] } : step
        ));
        setCurrentStepIndex(i);
        
        // Simulate processing time
        const delay = 800 + Math.random() * 600;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Update progress
        setProgress(((i + 1) / steps.length) * 100);
        
        // Mark step as complete
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: "complete" } : step
        ));
      }
      
      // Wait a moment then complete
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    };

    runSimulation();
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-xl mx-auto"
    >
      {/* Query display */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <p className="text-muted-foreground text-sm mb-2">Generating dataset for:</p>
        <p className="text-lg font-display font-semibold text-foreground">"{prompt}"</p>
      </motion.div>

      {/* Progress card */}
      <div className="glass rounded-2xl p-6 border border-border/50">
        {/* Steps list */}
        <div className="space-y-4 mb-6">
          <AnimatePresence mode="wait">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id as keyof typeof stepIcons] || Sparkles;
              const isActive = step.status === "running";
              const isComplete = step.status === "complete";
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: step.status === "pending" ? 0.4 : 1, 
                    x: 0 
                  }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-center gap-4 ${isActive ? "text-electric" : isComplete ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {/* Status indicator */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isComplete ? "bg-electric/20" : isActive ? "bg-electric/10 animate-pulse" : "bg-secondary/50"
                  }`}>
                    {isComplete ? (
                      <Check className="w-4 h-4 text-electric" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-electric animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-foreground" : ""}`}>
                      {step.label}
                    </p>
                    {step.detail && isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-muted-foreground mt-0.5"
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
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric to-purple rounded-full"
          />
          {/* Glow effect */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric to-purple rounded-full blur-sm opacity-50"
          />
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          Estimated time: ~{Math.max(1, Math.ceil((100 - progress) / 25))}s remaining
        </p>
      </div>
    </motion.div>
  );
}
