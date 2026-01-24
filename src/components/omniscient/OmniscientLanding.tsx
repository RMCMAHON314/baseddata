// ============================================================================
// BASED DATA v12.0 - METATRON QUANTUM EDITION
// The Bloomberg Terminal for Public Data - Premium White Intelligence Theme
// ============================================================================

import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Database, MapPin, Zap, ChevronRight, Search, 
  Globe, Shield, Cpu, Layers, ArrowRight, ExternalLink,
  Building2, TrendingUp, HeartPulse, Plane, FileText, Users,
  Briefcase, Scale, DollarSign, Activity, Target, BarChart3, 
  Flame, Brain, Network, Radar
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DATA_SOURCE_REGISTRY } from '@/types/omniscient';
import { InfiniteAlgorithmWidget } from '@/components/infinite/InfiniteAlgorithmWidget';

interface OmniscientLandingProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

// Intelligence platform showcase queries
const SHOWCASE_QUERIES = [
  {
    text: "Top IT contractors in Virginia with $10M+ federal contracts",
    category: "Government",
    icon: Building2,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    text: "Hospitals in Maryland with CMS quality data",
    category: "Healthcare",
    icon: HeartPulse,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    text: "Banks with federal contracts in Texas",
    category: "Financial",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    text: "EPA violations in California",
    category: "Environment",
    icon: FileText,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    text: "Universities receiving NIH grants over $1M",
    category: "Education",
    icon: Scale,
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    text: "Federal healthcare spending by agency",
    category: "Contracts",
    icon: Briefcase,
    gradient: "from-indigo-500 to-violet-600",
  },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'WILDLIFE': Globe,
  'WEATHER': Globe,
  'MARINE': Globe,
  'GOVERNMENT': Building2,
  'ECONOMIC': TrendingUp,
  'GEOSPATIAL': MapPin,
  'HEALTH': HeartPulse,
  'TRANSPORTATION': Plane,
  'ENERGY': Zap,
  'RECREATION': Globe,
};

// METATRON Quantum Stats
const QUANTUM_STATS = [
  { value: '150+', label: 'APIs', icon: Database, color: 'text-primary' },
  { value: '10K+', label: 'Entities', icon: Network, color: 'text-violet-500' },
  { value: '50K+', label: 'Facts', icon: Zap, color: 'text-cyan-500' },
  { value: '98.8%', label: 'Resolution', icon: Target, color: 'text-emerald-500' },
];

export const OmniscientLanding = forwardRef<HTMLDivElement, OmniscientLandingProps>(function OmniscientLanding({ onSubmit, isLoading }, ref) {
  const [prompt, setPrompt] = useState('');
  const [activeQuery, setActiveQuery] = useState(0);
  const [liveEntityCount, setLiveEntityCount] = useState(10179);
  const [liveFacts, setLiveFacts] = useState(52734);

  // Simulate live data growth
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEntityCount(prev => prev + Math.floor(Math.random() * 5));
      setLiveFacts(prev => prev + Math.floor(Math.random() * 12));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  // Group sources by category
  const sourcesByCategory = DATA_SOURCE_REGISTRY.reduce((acc, source) => {
    const cat = source.categories[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, typeof DATA_SOURCE_REGISTRY>);

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Effects - Premium White */}
      <div className="fixed inset-0 bg-grid bg-grid-fade pointer-events-none opacity-30" />
      <div className="fixed inset-0 radial-quantum pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo variant="compact" />
          <div className="flex items-center gap-6">
            {/* Live Quantum Status */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-violet-50 border border-violet-200">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              <span className="text-sm text-violet-700 font-medium">
                <span className="font-mono font-bold">{DATA_SOURCE_REGISTRY.length}+</span> quantum sources
              </span>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex border-border hover:border-primary/50 hover:bg-primary/5">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Docs
            </Button>
            <Button size="sm" className="btn-quantum">
              <Brain className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-12"
          >
            {/* Quantum Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-100 to-blue-100 border border-violet-200 text-sm font-semibold mb-8"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-gradient-quantum uppercase tracking-wider">Quantum Intelligence Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold">METATRON</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-[0.9]">
              <span className="text-foreground">The Bloomberg Terminal</span>
              <br />
              <span className="text-gradient-quantum">for Public Data.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
              Ask in plain English. Get instant answers from <span className="text-primary font-semibold">150+ government APIs</span> — 
              federal contracts, healthcare payments, environmental data, and more.
            </p>
          </motion.div>

          {/* Quantum Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-4 md:gap-6 mb-12 flex-wrap"
          >
            {QUANTUM_STATS.map((stat, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -4, scale: 1.05 }}
                className="metric-card metric-quantum min-w-[100px] text-center"
              >
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <div className="text-2xl md:text-3xl font-bold font-mono text-gradient-quantum">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
            {/* Hot Leads - Fire Styling */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.05 }}
              className="metric-card metric-hot min-w-[100px] text-center"
            >
              <Flame className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl md:text-3xl font-bold font-mono text-gradient-gold">47</span>
              </div>
              <div className="text-xs text-amber-600 uppercase tracking-wider mt-1">Hot Leads</div>
            </motion.div>
          </motion.div>

          {/* Live Intelligence Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex justify-center gap-6 mb-12"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Entities:</span>
              <span className="font-mono font-bold text-emerald-600">{liveEntityCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">Facts:</span>
              <span className="font-mono font-bold text-blue-600">{liveFacts.toLocaleString()}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-200 text-sm">
              <Radar className="w-4 h-4 text-violet-500" />
              <span className="text-muted-foreground">Kraken:</span>
              <span className="font-mono font-bold text-violet-600">5 heads active</span>
            </div>
          </motion.div>

          {/* Query Input - Premium Quantum Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto mb-10"
          >
            <div className="relative">
              {/* Quantum Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-400/30 via-primary/20 to-cyan-400/30 rounded-2xl blur-xl opacity-60" />
              
              {/* Input Card */}
              <div className="relative card-quantum p-2 border-violet-200/50">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                  placeholder="Describe the data you need..."
                  rows={3}
                  className="w-full px-5 py-4 bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 resize-none focus:outline-none font-body"
                />
                
                <div className="flex items-center justify-between px-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 border border-violet-200">
                      <Brain className="w-3.5 h-3.5 text-violet-500" />
                      <span className="hidden sm:inline text-violet-700 font-medium">Quantum AI</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200">
                      <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-700 font-medium">Entity Resolution</span>
                    </span>
                    <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-200">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-blue-700 font-medium">Multi-source</span>
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isLoading}
                    className="btn-quantum min-w-[160px]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Generate
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Showcase Queries - Premium Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-5xl mx-auto"
          >
            <p className="text-center text-sm text-muted-foreground mb-6 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-border" />
              Try a showcase query
              <span className="w-8 h-px bg-gradient-to-l from-transparent to-border" />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHOWCASE_QUERIES.map((q, i) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={i}
                    onClick={() => setPrompt(q.text)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group p-5 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-all duration-300 hover:shadow-lg ${
                      activeQuery === i ? 'ring-2 ring-violet-300 border-violet-300 shadow-quantum' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${q.gradient} text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">{q.category}</span>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 group-hover:text-foreground transition-colors">
                          {q.text}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Categories Section */}
        <section className="border-t border-border/50 bg-gradient-to-b from-background to-background-secondary">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="text-gradient-quantum">Every Federal Database.</span>{' '}
                <span className="text-muted-foreground">One Interface.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                USASpending, CMS Open Payments, NPI Registry, EPA ECHO, FDIC Banks, FDA Drugs — 
                all your government data in one query.
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
                    whileHover={{ y: -4 }}
                    className="card-premium p-5 hover:border-violet-300 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-blue-500 group-hover:text-white transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                    <div className="space-y-2">
                      {sources.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.is_free ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                      {sources.length > 3 && (
                        <p className="text-xs text-violet-500 font-medium">+{sources.length - 3} more</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Infinite Algorithm Status */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          <InfiniteAlgorithmWidget />
        </section>

        {/* Quantum Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Powered by </span>
              <span className="text-gradient-quantum">Quantum Intelligence</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Five autonomous Kraken heads continuously crawl, validate, and enrich data across 150+ APIs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Entity Resolution",
                description: "AI-powered deduplication across 150+ sources with 98.8% accuracy",
                stats: "10K+ entities resolved",
                gradient: "from-violet-500 to-purple-600",
              },
              {
                icon: Network,
                title: "Relationship Graph",
                description: "Automatic relationship discovery between entities across datasets",
                stats: "100K+ connections",
                gradient: "from-blue-500 to-cyan-600",
              },
              {
                icon: Radar,
                title: "Kraken Hydra",
                description: "5 autonomous crawler heads with self-healing and rate limiting",
                stats: "5 heads active",
                gradient: "from-emerald-500 to-teal-600",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="card-quantum p-6 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="flex items-center gap-2 text-sm font-mono text-violet-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {feature.stats}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to unlock <span className="text-gradient-quantum">public data intelligence</span>?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Join the future of government data analysis. Start querying in seconds.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button size="lg" className="btn-quantum px-8">
                  <Brain className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
                <Button size="lg" variant="outline" className="px-8 border-violet-200 hover:bg-violet-50">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  View API Docs
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <Logo variant="compact" />
              <p className="text-sm text-muted-foreground">
                © 2026 Based Data. The Bloomberg Terminal for Public Data.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-gradient-quantum font-bold">METATRON</span>
                <span>v12.0</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});
