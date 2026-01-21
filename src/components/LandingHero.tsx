// Based Data - Landing Hero Component
// Clean white theme with primary blue accents

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { DatasetsSidebar } from '@/components/DatasetsSidebar';
import { Zap, ChevronDown, Check } from 'lucide-react';
import { SAMPLE_PROMPTS, DATA_SIZE_OPTIONS, FRESHNESS_OPTIONS, CREDIT_COSTS } from '@/lib/constants';
import type { GenerationOptions } from '@/types/dataset';

interface LandingHeroProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (options: GenerationOptions) => void;
  isGenerating: boolean;
  isLoggedIn: boolean;
  credits: number;
  userName?: string;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function LandingHero({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  isLoggedIn,
  credits,
  userName,
  onSignIn,
  onSignUp,
}: LandingHeroProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dataSize, setDataSize] = useState<'small' | 'standard' | 'large'>('standard');
  const [freshness, setFreshness] = useState<'cached' | 'fresh'>('cached');
  const [includeInsights, setIncludeInsights] = useState(true);

  const handleSubmit = () => {
    onSubmit({ dataSize, freshness, includeInsights });
  };

  const calculateTotalCost = () => {
    const sizeOption = DATA_SIZE_OPTIONS.find(o => o.id === dataSize);
    const freshnessOption = FRESHNESS_OPTIONS.find(o => o.id === freshness);
    let total = sizeOption?.cost || 15;
    total += freshnessOption?.extraCost || 0;
    if (includeInsights) total += CREDIT_COSTS.insights;
    return total;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <header className="container mx-auto px-8 py-5 flex items-center justify-between border-b border-border">
        <Logo />
        <div className="flex items-center gap-6">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-accent-foreground text-sm font-semibold">
                  {credits} credits
                </span>
              </div>
              <DatasetsSidebar>
                <button className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                  My Datasets
                </button>
              </DatasetsSidebar>
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={onSignIn}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Sign in
              </button>
              <Button onClick={onSignUp}>
                Get Started Free
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 max-w-4xl mx-auto w-full -mt-10">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-4" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Any dataset. <span className="text-primary">Instantly.</span>
          </h1>
          <p className="text-muted-foreground text-xl max-w-lg mx-auto">
            Describe the data you need in plain English. Our AI crawls the entire web and delivers structured datasets in seconds.
          </p>
        </motion.div>

        {/* THE PROMPT BAR - THE STAR */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full mb-6"
        >
          <div 
            className={`flex items-start gap-3 p-2 rounded-2xl border-2 transition-all duration-200 bg-background ${
              prompt ? 'border-primary shadow-[0_0_0_4px_hsl(var(--accent))]' : 'border-border'
            }`}
          >
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                placeholder="Describe the dataset you need..."
                rows={2}
                className="w-full px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none bg-transparent"
              />
              
              {/* Advanced Options Toggle */}
              <div className="px-4 pb-3">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced options
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      {/* Data Size */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Dataset Size</label>
                        <div className="flex gap-2">
                          {DATA_SIZE_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setDataSize(opt.id)}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                dataSize === opt.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                            >
                              {opt.label}
                              <span className="block text-[10px] opacity-70">{opt.cost} credits</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Freshness */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Data Freshness</label>
                        <div className="flex gap-2">
                          {FRESHNESS_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setFreshness(opt.id)}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                freshness === opt.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                            >
                              {opt.label}
                              <span className="block text-[10px] opacity-70">{opt.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* AI Insights */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">AI Insights</label>
                        <button
                          onClick={() => setIncludeInsights(!includeInsights)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                            includeInsights 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-card text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {includeInsights && <Check className="w-3 h-3" />}
                          {includeInsights ? 'Included' : 'Add Insights'}
                          <span className="text-[10px] opacity-70">+{CREDIT_COSTS.insights} credits</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              className="px-6 py-4 h-auto mt-1 mr-1"
            >
              <span>Generate</span>
              <Zap className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Cost indicator */}
          {prompt.trim() && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-muted-foreground mt-2"
            >
              Estimated cost: <span className="text-primary font-semibold">{calculateTotalCost()} credits</span>
            </motion.p>
          )}
        </motion.div>

        {/* Sample Prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mb-16"
        >
          <span className="text-sm text-muted-foreground">Try:</span>
          {SAMPLE_PROMPTS.slice(0, 4).map((p, i) => (
            <button
              key={i}
              onClick={() => onPromptChange(p.text)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-card hover:bg-secondary rounded-full transition-all"
            >
              {p.text.length > 35 ? p.text.slice(0, 35) + '...' : p.text}
            </button>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 w-full"
        >
          {[
            { icon: '🌐', title: 'Any Data Source', desc: 'Web, APIs, government databases, social media, news - we crawl it all' },
            { icon: '⚡', title: 'Instant Results', desc: 'Most datasets generated in under 30 seconds with AI-powered extraction' },
            { icon: '🧠', title: 'AI Insights', desc: 'Automatic analysis, patterns, outliers, and actionable recommendations' },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card hover:bg-secondary transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Trust Bar */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground"
          >
            {['100 free credits', 'No credit card required', 'Export to CSV, Excel, Sheets'].map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                {text}
              </span>
            ))}
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
