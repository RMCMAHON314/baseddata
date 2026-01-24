// ============================================================================
// BASED DATA v11.0 - THE BLOOMBERG TERMINAL FOR PUBLIC DATA
// Premium intelligence platform for government, business, and research professionals
// ============================================================================

import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Database, MapPin, Zap, ChevronRight, Search, 
  Globe, Shield, Cpu, Layers, ArrowRight, ExternalLink,
  Building2, TrendingUp, HeartPulse, Plane, FileText, Users,
  Briefcase, Scale, DollarSign, Activity, Target, BarChart3, Flame
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DATA_SOURCE_REGISTRY } from '@/types/omniscient';

interface OmniscientLandingProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

// Intelligence platform showcase queries - aligned with the vision
const SHOWCASE_QUERIES = [
  {
    text: "Top IT contractors in Virginia with $10M+ federal contracts",
    category: "Government",
    icon: Building2,
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    text: "Hospitals in Maryland with CMS quality data",
    category: "Healthcare",
    icon: HeartPulse,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    text: "Banks with federal contracts in Texas",
    category: "Financial",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    text: "EPA violations in California",
    category: "Environment",
    icon: FileText,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    text: "Universities receiving NIH grants over $1M",
    category: "Education",
    icon: Scale,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    text: "Federal healthcare spending by agency",
    category: "Contracts",
    icon: Briefcase,
    gradient: "from-violet-500 to-purple-500",
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

// Platform stats - LEGENDARY metrics from the database
const STATS = [
  { value: '60+', label: 'Live APIs', icon: Database },
  { value: '65+', label: 'Categories', icon: Layers },
  { value: '<10s', label: 'Query Speed', icon: Zap },
  { value: '98.8%', label: 'Resolution', icon: Target },
];

// Use forwardRef to fix AnimatePresence warning
export const OmniscientLanding = forwardRef<HTMLDivElement, OmniscientLandingProps>(function OmniscientLanding({ onSubmit, isLoading }, ref) {
  const [prompt, setPrompt] = useState('');
  const [activeQuery, setActiveQuery] = useState(0);
  const [liveEntityCount, setLiveEntityCount] = useState(1179);
  const [liveFacts, setLiveFacts] = useState(6734);

  // Simulate live data growth
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEntityCount(prev => prev + Math.floor(Math.random() * 3));
      setLiveFacts(prev => prev + Math.floor(Math.random() * 7));
    }, 5000);
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

  // Group sources by category for display
  const sourcesByCategory = DATA_SOURCE_REGISTRY.reduce((acc, source) => {
    const cat = source.categories[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, typeof DATA_SOURCE_REGISTRY>);

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Effects - Bloomberg Dark Grid */}
      <div className="fixed inset-0 bg-grid bg-grid-fade pointer-events-none opacity-50" />
      <div className="fixed inset-0 radial-overlay pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo variant="compact" />
          <div className="flex items-center gap-6">
            {/* Live Status Indicator */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-sm text-muted-foreground">
                <span className="font-mono text-emerald-400">{DATA_SOURCE_REGISTRY.length}+</span> sources online
              </span>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex border-border hover:border-primary/50 hover:bg-primary/10">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Docs
            </Button>
            <Button size="sm" className="btn-omni">Sign In</Button>
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
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-wider">Public Data Intelligence</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-xs font-bold">LEGENDARY</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-[0.9]">
              <span className="text-gradient-hero">The Bloomberg Terminal</span>
              <br />
              <span className="text-gradient-omni">for Public Data.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
              Ask in plain English. Get instant answers from <span className="text-foreground font-semibold">60+ government APIs</span> — 
              federal contracts, healthcare payments, environmental data, and more.
            </p>
          </motion.div>

          {/* Live Stats Bar - Bloomberg Terminal Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-4 md:gap-8 mb-12 flex-wrap"
          >
            {STATS.map((stat, i) => (
              <div key={i} className="metric-card min-w-[100px] text-center">
                <div className="text-2xl md:text-3xl font-bold font-mono text-gradient-omni">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
            {/* Hot Leads - Special Styling */}
            <div className="metric-card metric-hot min-w-[100px] text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-2xl md:text-3xl font-bold font-mono text-gradient-gold">12</span>
              </div>
              <div className="text-xs text-amber-300/80 uppercase tracking-wider mt-1">Hot Leads</div>
            </div>
          </motion.div>

          {/* Live Intelligence Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex justify-center gap-6 mb-12"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-muted-foreground">Entities:</span>
              <span className="font-mono text-emerald-400">{liveEntityCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-muted-foreground">Facts:</span>
              <span className="font-mono text-blue-400">{liveFacts.toLocaleString()}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-muted-foreground">Resolution:</span>
              <span className="font-mono text-amber-400">98.8%</span>
            </div>
          </motion.div>

          {/* Query Input - Premium Terminal Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto mb-10"
          >
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 rounded-2xl blur-xl opacity-50" />
              
              {/* Input Card */}
              <div className="relative card-premium p-2">
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
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">Auto-georeference</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      Entity Resolution
                    </span>
                    <span className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      Multi-source
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isLoading}
                    className="btn-omni min-w-[160px]"
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
              <span className="w-8 h-px bg-border" />
              Try a showcase query
              <span className="w-8 h-px bg-border" />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHOWCASE_QUERIES.map((q, i) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={i}
                    onClick={() => setPrompt(q.text)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group p-5 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-all duration-300 ${
                      activeQuery === i ? 'ring-2 ring-primary/30 border-primary/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${q.gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">{q.category}</span>
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

        {/* Categories Section - Bloomberg Data Sources */}
        <section className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="text-gradient-omni">Every Federal Database.</span>{' '}
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
                    className="card-premium p-5 hover:border-primary/40 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                    <div className="space-y-2">
                      {sources.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.is_free ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                      {sources.length > 3 && (
                        <p className="text-xs text-primary/60 font-medium">+{sources.length - 3} more</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Value Proposition Grid - Premium Features */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Built for the </span>
              <span className="text-gradient-omni">Underserved Market</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              State agencies, school districts, healthcare organizations — everyone who needs 
              Palantir-grade intelligence at a fraction of the cost.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: 'Contractor Intelligence',
                desc: 'Track federal contracts, SAM.gov registrations, and compliance status in one view.',
                gradient: 'from-purple-500 to-indigo-500',
                stat: '$127B tracked',
              },
              {
                icon: HeartPulse,
                title: 'Healthcare Analytics',
                desc: 'CMS payments, NPI providers, FDA drugs, and hospital quality data unified.',
                gradient: 'from-pink-500 to-rose-500',
                stat: '6,734 facts',
              },
              {
                icon: Shield,
                title: 'Compliance Monitoring',
                desc: 'EPA violations, OSHA inspections, exclusions, and regulatory changes.',
                gradient: 'from-emerald-500 to-teal-500',
                stat: 'Real-time alerts',
              },
              {
                icon: TrendingUp,
                title: 'Market Analysis',
                desc: 'Spending trends, competitor tracking, and opportunity identification.',
                gradient: 'from-amber-500 to-orange-500',
                stat: '10,766 relationships',
              },
              {
                icon: MapPin,
                title: 'Geographic Intelligence',
                desc: 'Every record mapped. Filter by state, county, or custom region.',
                gradient: 'from-cyan-500 to-blue-500',
                stat: '98.8% geo-coded',
              },
              {
                icon: Cpu,
                title: 'AI-Powered Insights',
                desc: 'Automatic anomaly detection, trend analysis, and recommendations.',
                gradient: 'from-violet-500 to-purple-500',
                stat: '137 AI insights',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-premium p-6 group hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${f.gradient} text-white group-hover:scale-110 transition-transform shadow-lg`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-1 rounded-full">
                    {f.stat}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comparison Section - Us vs Palantir */}
        <section className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-gradient-gold">$99/month</span>
                <span className="text-muted-foreground"> vs </span>
                <span className="text-foreground">$5M/year</span>
              </h2>
              <p className="text-muted-foreground">Enterprise-grade intelligence without the enterprise price tag.</p>
            </motion.div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Time to Value', us: '10 seconds', them: '6-18 months' },
                { label: 'Price', us: '$99-$10K/mo', them: '$5M-$100M/yr' },
                { label: 'Implementation', us: 'Zero', them: 'Team required' },
                { label: 'Self-Service', us: 'Yes', them: 'No' },
                { label: 'Public Data APIs', us: '60+ native', them: 'Manual' },
                { label: 'AI', us: 'Born with', them: 'Bolt-on' },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="contents"
                >
                  <div className="p-3 rounded-lg bg-card border border-border text-muted-foreground">{row.label}</div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-center">{row.us}</div>
                  <div className="p-3 rounded-lg bg-card border border-border text-muted-foreground/60 text-center">{row.them}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center intelligence-card p-12 relative overflow-hidden"
          >
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Replace 50+ Niche Data Tools
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
                GovWin, Bloomberg Government, D&B — all in one platform at a fraction of the cost.
                Start free with 100 credits.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="btn-omni min-w-[200px] text-lg py-6">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Free
                </Button>
                <Button size="lg" variant="outline" className="min-w-[200px] text-lg py-6 border-border hover:border-primary/50 hover:bg-primary/10">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  View Pricing
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/30">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Logo variant="compact" />
                <span className="text-muted-foreground text-sm">
                  The Bloomberg Terminal for Public Data
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
                <a href="#" className="hover:text-foreground transition-colors">API</a>
                <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});

OmniscientLanding.displayName = 'OmniscientLanding';