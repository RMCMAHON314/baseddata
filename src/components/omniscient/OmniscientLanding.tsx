// BASED DATA - Universal Data Pipeline Landing
// Clean, premium interface for natural language data queries

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Database, MapPin, Zap, ChevronRight, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DATA_SOURCE_REGISTRY } from '@/types/omniscient';

interface OmniscientLandingProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

const EXAMPLE_QUERIES = [
  {
    text: "My friend hunts geese on a small island off Long Island. Give me everything for planning a hunt in December.",
    category: "Outdoor"
  },
  {
    text: "Best hiking trails in Yellowstone with current trail conditions and weather",
    category: "Recreation"
  },
  {
    text: "Federal cybersecurity contractors in Maryland with $10M+ contracts",
    category: "Government"
  },
  {
    text: "Solar potential assessment for properties in Phoenix with available incentives",
    category: "Energy"
  },
  {
    text: "Wildfire risk assessment for Boulder, CO with evacuation routes",
    category: "Safety"
  },
  {
    text: "Salmon fishing hotspots in Puget Sound this weekend with tide charts",
    category: "Fishing"
  },
];

export function OmniscientLanding({ onSubmit, isLoading }: OmniscientLandingProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  // Group sources by category
  const sourcesByCategory = DATA_SOURCE_REGISTRY.reduce((acc, source) => {
    const cat = source.categories[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, typeof DATA_SOURCE_REGISTRY>);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="compact" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{DATA_SOURCE_REGISTRY.length}+ data sources</span>
            <Button variant="outline" size="sm">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight text-foreground">
            Every dataset.
            <br />
            <span className="text-primary">On demand.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Describe what you need in plain English. We query {DATA_SOURCE_REGISTRY.length}+ sources and deliver unified, georeferenced data in seconds.
          </p>
        </motion.div>

        {/* Query Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl mb-8"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-card rounded-xl border border-border p-2 shadow-lg">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                placeholder="Describe what you're looking for..."
                rows={3}
                className="w-full px-4 py-3 bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> Auto-detects location
                  <span className="text-border">•</span>
                  <Database className="w-3 h-3" /> Multi-source aggregation
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-1" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Example Queries */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 max-w-3xl"
        >
          {EXAMPLE_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => setPrompt(q.text)}
              className="group px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
            >
              <span className="text-primary mr-1">{q.category}:</span>
              {q.text.slice(0, 40)}...
              <ChevronRight className="inline w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </motion.div>

        {/* Data Sources Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 w-full max-w-5xl"
        >
          <h2 className="text-center text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
            Powered by {DATA_SOURCE_REGISTRY.length}+ government & public data sources
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(sourcesByCategory).slice(0, 5).map(([category, sources]) => (
              <div key={category} className="bg-card rounded-xl p-4 border border-border">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">{category}</h3>
                <div className="space-y-1">
                  {sources.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.is_free ? 'bg-success' : 'bg-amber-500'}`} />
                      {s.name}
                    </div>
                  ))}
                  {sources.length > 3 && (
                    <span className="text-xs text-muted-foreground/50">+{sources.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl"
        >
          {[
            { icon: <Zap className="w-6 h-6" />, title: 'Instant Results', desc: 'Data on map in under 10 seconds' },
            { icon: <MapPin className="w-6 h-6" />, title: 'Georeferenced', desc: 'All data unified on interactive maps' },
            { icon: <Sparkles className="w-6 h-6" />, title: 'AI Insights', desc: 'Automatic analysis & recommendations' },
          ].map((f, i) => (
            <div key={i} className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="inline-flex p-3 rounded-xl bg-accent text-primary mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}