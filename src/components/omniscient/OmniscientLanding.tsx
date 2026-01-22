// OMNISCIENT v4.0 - Ultimate Data Tap Landing
// Premium showcase interface for the self-evolving data engine

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Database, MapPin, Zap, ChevronRight, Search, 
  Globe, Shield, Cpu, Layers, ArrowRight, ExternalLink,
  Bird, Cloud, Anchor, Building2, TrendingUp, Map, HeartPulse, Plane, Leaf, Tent
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DATA_SOURCE_REGISTRY } from '@/types/omniscient';

interface OmniscientLandingProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

const SHOWCASE_QUERIES = [
  {
    text: "Goose hunting conditions Long Island December - weather, tides, regulations, public lands",
    category: "Hunting",
    icon: Bird,
    color: "text-emerald-500",
  },
  {
    text: "Federal cybersecurity contractors in Virginia with $10M+ awards",
    category: "Government",
    icon: Building2,
    color: "text-purple-500",
  },
  {
    text: "Salmon fishing Puget Sound this weekend - tides, water temp, boat ramps",
    category: "Fishing",
    icon: Anchor,
    color: "text-cyan-500",
  },
  {
    text: "Solar potential assessment Phoenix with available incentives and installers",
    category: "Energy",
    icon: Leaf,
    color: "text-yellow-500",
  },
  {
    text: "Wildfire risk Boulder CO with evacuation routes and shelter locations",
    category: "Safety",
    icon: Shield,
    color: "text-red-500",
  },
  {
    text: "Clinical trials for immunotherapy recruiting in Boston area",
    category: "Health",
    icon: HeartPulse,
    color: "text-pink-500",
  },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'WILDLIFE': Bird,
  'WEATHER': Cloud,
  'MARINE': Anchor,
  'GOVERNMENT': Building2,
  'ECONOMIC': TrendingUp,
  'GEOSPATIAL': Map,
  'HEALTH': HeartPulse,
  'TRANSPORTATION': Plane,
  'ENERGY': Leaf,
  'RECREATION': Tent,
};

const STATS = [
  { value: '70+', label: 'Live Data APIs' },
  { value: '∞', label: 'Dynamic Genesis' },
];

export function OmniscientLanding({ onSubmit, isLoading }: OmniscientLandingProps) {
  const [prompt, setPrompt] = useState('');
  const [activeQuery, setActiveQuery] = useState(0);

  // Cycle through example queries
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuery(prev => (prev + 1) % SHOWCASE_QUERIES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  // Group sources by category for display
  const sourcesByCategory = DATA_SOURCE_REGISTRY.reduce((acc, source) => {
    const cat = source.categories[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, typeof DATA_SOURCE_REGISTRY>);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid bg-grid-fade pointer-events-none" />
      <div className="fixed inset-0 radial-overlay pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo variant="compact" />
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>{DATA_SOURCE_REGISTRY.length}+ sources online</span>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Docs
            </Button>
            <Button size="sm" className="btn-omni">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-12"
          >
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent border border-primary/20 text-sm font-medium text-primary mb-6"
            >
              <Sparkles className="w-4 h-4" />
              OMNISCIENT v4.0 — Self-Evolving Data Engine
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-xs">NEW</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              <span className="text-gradient-hero">Every Dataset.</span>
              <br />
              <span className="text-gradient-omni">On Demand.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
              Describe what you need in plain English. We query {DATA_SOURCE_REGISTRY.length}+ live sources, 
              generate custom collectors on-the-fly, and deliver unified georeferenced data in seconds.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-8 md:gap-16 mb-12"
          >
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gradient-omni">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Query Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-cyan-500/20 to-purple-500/30 rounded-2xl blur-xl opacity-60" />
              
              {/* Input Card */}
              <div className="relative card-premium p-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                  placeholder="Describe the data you need..."
                  rows={3}
                  className="w-full px-5 py-4 bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                />
                
                <div className="flex items-center justify-between px-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Auto-georeference
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                      Dynamic Genesis
                    </span>
                    <span className="hidden md:flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Multi-source fusion
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isLoading}
                    className="btn-omni min-w-[140px]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Showcase Queries */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            <p className="text-center text-sm text-muted-foreground mb-4">Try a showcase query:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SHOWCASE_QUERIES.map((q, i) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={i}
                    onClick={() => setPrompt(q.text)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group p-4 rounded-xl bg-card border border-border hover:border-primary/30 text-left transition-all ${
                      activeQuery === i ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-secondary ${q.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-primary">{q.category}</span>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {q.text}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Categories Section */}
        <section className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-gradient-omni">Unified Data Categories.</span>{' '}
                <span className="text-muted-foreground">One Query, Every Source.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From wildlife tracking to federal contracts, real-time weather to clinical trials — 
                OMNISCIENT covers every domain with continuously-evolving collectors.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(sourcesByCategory).slice(0, 10).map(([category, sources], i) => {
                const Icon = CATEGORY_ICONS[category] || Globe;
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="card-premium p-5 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-accent text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                    <div className="space-y-1.5">
                      {sources.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.is_free ? 'bg-success' : 'bg-warning'}`} />
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                      {sources.length > 3 && (
                        <p className="text-xs text-muted-foreground/60">+{sources.length - 3} more</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Parallel Collection',
                desc: 'Query 70+ APIs simultaneously. All data unified on a single map.',
                gradient: 'from-yellow-500 to-orange-500',
              },
              {
                icon: Cpu,
                title: 'Dynamic Genesis',
                desc: "Can't find what you need? AI generates new collectors on-the-fly.",
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                icon: Database,
                title: 'Self-Evolving',
                desc: 'Every query makes the system smarter. Collectors archived for future use.',
                gradient: 'from-cyan-500 to-blue-500',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium p-8 text-center group hover:border-primary/30 transition-colors"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${f.gradient} text-white mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/30">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Logo variant="compact" />
                <span className="text-sm text-muted-foreground">
                  OMNISCIENT v4.0 — The Ultimate Data Tap
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">API</a>
                <a href="#" className="hover:text-foreground transition-colors">Docs</a>
                <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
