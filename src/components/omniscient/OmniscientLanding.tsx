// BASED DATA v10.0 - The Bloomberg Terminal of Public Data
// Premium intelligence platform for government, business, and research professionals

import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Database, MapPin, Zap, ChevronRight, Search, 
  Globe, Shield, Cpu, Layers, ArrowRight, ExternalLink,
  Building2, TrendingUp, HeartPulse, Plane, FileText, Users,
  Briefcase, Scale, DollarSign
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DATA_SOURCE_REGISTRY } from '@/types/omniscient';

interface OmniscientLandingProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

// Intelligence platform showcase queries - aligned with $100M vision
const SHOWCASE_QUERIES = [
  {
    text: "Top IT contractors in Virginia with $10M+ federal contracts",
    category: "Government",
    icon: Building2,
    color: "text-purple-500",
  },
  {
    text: "Hospitals in Maryland with quality ratings and CMS payments",
    category: "Healthcare",
    icon: HeartPulse,
    color: "text-pink-500",
  },
  {
    text: "8(a) set-aside cybersecurity contracts expiring in 6 months",
    category: "Opportunities",
    icon: Shield,
    color: "text-emerald-500",
  },
  {
    text: "EPA violations and environmental permits in Ohio",
    category: "Compliance",
    icon: FileText,
    color: "text-amber-500",
  },
  {
    text: "Compare federal healthcare spending by agency in Texas",
    category: "Analysis",
    icon: TrendingUp,
    color: "text-cyan-500",
  },
  {
    text: "Banks and credit unions in California with FDIC data",
    category: "Financial",
    icon: DollarSign,
    color: "text-blue-500",
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

// Platform stats - emphasizing value proposition
const STATS = [
  { value: '70+', label: 'Live APIs' },
  { value: '50+', label: 'Data Categories' },
  { value: '<10s', label: 'Query Speed' },
  { value: '∞', label: 'Dynamic Genesis' },
];

// Use forwardRef to fix AnimatePresence warning
export const OmniscientLanding = forwardRef<HTMLDivElement, OmniscientLandingProps>(function OmniscientLanding({ onSubmit, isLoading }, ref) {
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
    <div ref={ref} className="min-h-screen bg-background text-foreground overflow-x-hidden">
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 text-sm font-medium text-primary mb-6"
            >
              <Sparkles className="w-4 h-4" />
              BASED DATA — Public Data Intelligence Platform
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-xs">v10</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              <span className="text-gradient-hero">The Bloomberg Terminal</span>
              <br />
              <span className="text-gradient-omni">for Public Data.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
              Ask in plain English. Get instant answers from {DATA_SOURCE_REGISTRY.length}+ government APIs — 
              federal contracts, healthcare payments, environmental data, and more.
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
              <span className="text-gradient-omni">Every Federal Database.</span>{' '}
              <span className="text-muted-foreground">One Unified Interface.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              USASpending, CMS Open Payments, NPI Registry, EPA ECHO, FDIC Banks, FDA Drugs — 
              all your government data in one query, one map, one export.
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

        {/* Value Proposition Grid */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: 'Contractor Intelligence',
                desc: 'Track federal contracts, SAM.gov registrations, and compliance status in one view.',
                gradient: 'from-purple-500 to-indigo-500',
              },
              {
                icon: HeartPulse,
                title: 'Healthcare Analytics',
                desc: 'CMS payments, NPI providers, FDA drugs, and hospital quality data unified.',
                gradient: 'from-pink-500 to-rose-500',
              },
              {
                icon: Shield,
                title: 'Compliance Monitoring',
                desc: 'EPA violations, OSHA inspections, exclusions, and regulatory changes.',
                gradient: 'from-emerald-500 to-teal-500',
              },
              {
                icon: TrendingUp,
                title: 'Market Analysis',
                desc: 'Spending trends, competitor tracking, and opportunity identification.',
                gradient: 'from-amber-500 to-orange-500',
              },
              {
                icon: MapPin,
                title: 'Geographic Intelligence',
                desc: 'Every record mapped. Filter by state, county, or custom region.',
                gradient: 'from-cyan-500 to-blue-500',
              },
              {
                icon: Cpu,
                title: 'AI-Powered Insights',
                desc: 'Automatic anomaly detection, trend analysis, and recommendations.',
                gradient: 'from-violet-500 to-purple-500',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-premium p-6 group hover:border-primary/30 transition-colors"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.gradient} text-white mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center card-premium p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Replace 50+ Niche Data Tools
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                GovWin, Bloomberg Government, D&B — all in one platform at a fraction of the cost.
                Start free with 100 credits.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="btn-omni min-w-[180px]">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Free
                </Button>
                <Button size="lg" variant="outline" className="min-w-[180px]">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Pricing
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/30">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Logo variant="compact" />
                <span className="text-sm text-muted-foreground">
                  Based Data — Public Data Intelligence Platform
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">API</a>
                <a href="#" className="hover:text-foreground transition-colors">Docs</a>
                <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="hover:text-foreground transition-colors">Enterprise</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});

// Named export for backward compatibility
export default OmniscientLanding;
