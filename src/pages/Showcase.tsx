import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { motion, useInView } from 'framer-motion';
import {
  Search, ArrowRight, Building2, Shield, Target,
  Zap, BarChart3, ChevronRight, Database, Brain, Beaker, DollarSign
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MarketIntelligenceSearch } from '@/components/search/MarketIntelligenceSearch';
import { usePlatformStats } from '@/hooks/useNewSources';

/* ── animated counter ── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (!inView || target === 0) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return { count, ref };
}

const AnimatedStat = React.forwardRef<HTMLDivElement, { value: number; label: string; prefix?: string }>(
  ({ value, label, prefix = '' }, _forwardedRef) => {
    const { count, ref } = useAnimatedCounter(value);
    const fmt = (n: number) => {
      if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
      if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
      if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
      return n.toLocaleString();
    };
    return (
      <div ref={ref} className="text-center">
        <p className="text-4xl md:text-5xl font-black font-mono tracking-tight text-foreground">
          {prefix}{fmt(count)}
        </p>
        <p className="text-sm text-cyan-600/70 mt-2 font-medium uppercase tracking-wider">{label}</p>
      </div>
    );
  }
);
AnimatedStat.displayName = 'AnimatedStat';

/* ── (SearchDropdown removed — MarketIntelligenceSearch handles this) ── */

const FEATURES = [
  { icon: Shield, title: 'Competitive Intelligence', desc: 'See who wins contracts in your space, which agencies they serve, and how they team.', color: 'from-cyan-500 to-blue-600' },
  { icon: Search, title: 'Market Discovery', desc: 'Filter by NAICS, agency, state, and set-aside to find your exact market.', color: 'from-violet-500 to-indigo-600' },
  { icon: Building2, title: 'Entity Deep Dives', desc: 'Full contract history, competitor analysis, and relationship mapping for any contractor.', color: 'from-emerald-500 to-teal-600' },
];

function formatTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Showcase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { data: ps } = usePlatformStats();

  const agencies = Number(ps?.distinct_agencies) || 0;
  const states = Number(ps?.distinct_states) || 0;
  const totalValue = Number(ps?.contract_value || 0) + Number(ps?.idv_value || 0) + Number(ps?.grant_value || 0);
  const totalEntities = Number(ps?.entity_count) || 0;
  const totalRecords = Number(ps?.total_records) || 0;
  const dataSources = Number(ps?.data_sources) || 10;
  const lastVacuum = ps?.last_vacuum_at as string | null;

  function handleSearchInput(q: string) {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); setShowResults(false); return; }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('core_entities').select('id, canonical_name, entity_type, state, contract_count')
        .ilike('canonical_name', `%${q}%`).order('total_contract_value', { ascending: false }).limit(5);
      setSearchResults(data || []);
      setShowResults(true);
    }, 300);
  }

  function handleSearchSelect(id: string) { setShowResults(false); setSearchQuery(''); navigate(`/entity/${id}`); }
  function handleSearchSubmit() { if (searchQuery) navigate(`/explore?q=${encodeURIComponent(searchQuery)}`); }

  // Data freshness badge
  const freshnessBadge = (() => {
    if (!lastVacuum) return { text: 'Initializing intelligence engine', alive: false };
    const hoursAgo = (Date.now() - new Date(lastVacuum).getTime()) / 3600000;
    if (hoursAgo < 24) return { text: 'Crunching live federal data', alive: true };
    return { text: 'Processing federal records', alive: true };
  })();

  // Intelligence badge — 50 states + DC/territories
  const territoryCount = Math.max(0, states - 50);
  const stateLabel = states > 50
    ? `50 States · ${territoryCount} Territor${territoryCount === 1 ? 'y' : 'ies'}`
    : `${states} States`;
  const intelBadge = agencies > 0
    ? `Live Intelligence · ${agencies} Agencies · ${stateLabel}`
    : 'Ready to Deploy · 10 Data Sources · 50 States & Territories';

  const DATA_SOURCES = [
    { emoji: '📄', label: 'Federal Contracts', count: Number(ps?.contract_count || 0), source: 'USASpending', note: 'All 50 states · FY24-25' },
    { emoji: '📋', label: 'IDVs & Vehicles', count: Number(ps?.idv_count || 0), source: 'USASpending', note: 'GWACs, BPAs, IDIQs' },
    { emoji: '💰', label: 'Federal Grants', count: Number(ps?.grant_count || 0), source: 'USASpending', note: 'All 50 states · FY24-25' },
    { emoji: '📋', label: 'Opportunities', count: Number(ps?.opportunity_count || 0), source: 'SAM.gov', note: 'Last 90 days' },
    { emoji: '🔬', label: 'SBIR/STTR Awards', count: Number(ps?.sbir_count || 0), source: 'SBIR.gov', note: '11 agencies · 3 years' },
    { emoji: '🏢', label: 'Entity Registry', count: Number(ps?.sam_entity_count || 0), source: 'SAM.gov', note: 'All 50 states' },
    { emoji: '⚖️', label: 'Exclusions', count: Number(ps?.exclusion_count || 0), source: 'SAM.gov', note: 'All active' },
    { emoji: '🔭', label: 'Research Grants', count: Number(ps?.nsf_count || 0), source: 'NSF API', note: '12 tech sectors' },
    { emoji: '🤝', label: 'Subawards', count: Number(ps?.subaward_count || 0), source: 'USASpending', note: 'Teaming intelligence' },
    { emoji: '💵', label: 'Labor Rates', count: Number(ps?.labor_rate_count || 0), source: 'GSA CALC+', note: '15 labor categories' },
  ];

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <Logo size="lg" />
        </Link>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <Link to="/explore"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted">Explore</Button></Link>
          <Link to="/entities"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted">Entities</Button></Link>
          <Link to="/opportunities"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted hidden md:inline-flex">Opportunities</Button></Link>
          <Link to="/intelligence"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted hidden md:inline-flex">Intelligence</Button></Link>
          <Link to="/sbir"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:inline-flex">SBIR</Button></Link>
          <Link to="/labor-rates"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:inline-flex">Labor Rates</Button></Link>
          <Link to="/analytics"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:inline-flex">Analytics</Button></Link>
          <Link to="/onboarding">
            <Button size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-16 pb-32 px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-100/50 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-blue-100/60 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className={`mb-3 px-4 py-1.5 text-sm font-medium ${agencies > 0 ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-muted text-muted-foreground border-border'}`}>
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {intelBadge}
            </Badge>
            <div className="mt-2">
              <Badge className="bg-muted text-cyan-600 border-border px-3 py-1 text-xs gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                {freshnessBadge.text}
              </Badge>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 mt-6 tracking-tight text-foreground">
            Government Contract
            <br />Intelligence.{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Automated.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Track competitors, discover opportunities, and win more contracts with AI-powered federal intelligence.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="relative w-full max-w-2xl mx-auto mb-8">
            <MarketIntelligenceSearch variant="hero" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center gap-3">
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 text-base px-8 h-12 gap-2">
                Start Free — No credit card required <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground/60">Join government contractors using real-time intelligence</p>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-20 px-6 border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-10 uppercase tracking-widest">
            {agencies > 0
              ? `Tracking federal contracts, grants & IDVs across ${agencies} agencies and ${states} states`
              : 'Ready to track federal contracts, grants & IDVs across all 50 states'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <AnimatedStat value={totalValue} label="Contract + Grant Value" prefix="$" />
            <AnimatedStat value={totalEntities} label="Organizations Tracked" />
            <AnimatedStat value={totalRecords} label="Total Federal Records" />
            <AnimatedStat value={dataSources} label="Data Sources" />
          </div>
        </div>
      </section>

      {/* ── DATA COVERAGE ── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Data Coverage</h2>
            <p className="text-muted-foreground text-sm">Live record counts across all integrated federal sources</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DATA_SOURCES.map(s => {
              const hasData = s.count > 0;
              return (
                <Card key={s.label} className={`bg-muted/30 p-4 hover:border-border transition-colors ${hasData ? 'border-cyan-200' : 'border-border opacity-60'}`}>
                  <p className="text-lg mb-1">{s.emoji} <span className="text-sm font-semibold text-foreground">{s.label}</span></p>
                  {hasData ? (
                    <p className="text-2xl font-bold text-cyan-600 font-mono">{s.count.toLocaleString()}</p>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground border-border text-xs mt-1">Coming Soon</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{s.source}</p>
                  <p className="text-xs text-muted-foreground/50">{s.note}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">win more contracts</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Real-time intelligence that turns public data into a competitive advantage.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group rounded-2xl border border-border bg-muted/20 p-8 hover:border-cyan-200 hover:bg-muted/40 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-16 text-foreground">
            From search to strategy in{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">seconds</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Search', desc: 'Find any contractor, agency, or market segment instantly.' },
              { step: '02', title: 'Analyze', desc: 'See contract history, competitors, relationships, and AI insights.' },
              { step: '03', title: 'Win', desc: 'Track opportunities, compare competitors, and position your bid to win.' },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }} className="text-center">
                <div className="text-5xl font-black text-muted/60 mb-4 font-mono">{s.step}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50/50 to-transparent p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground">Ready to see your competitive landscape?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Search any organization and get instant intelligence — contract history, competitors, win rates, and market position.
            </p>
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 text-base px-10 h-12 gap-2">
                Start Free — No credit card required <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-muted-foreground text-sm">Government Contract Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/explore" className="hover:text-foreground transition-colors">Explore</Link>
            <Link to="/entities" className="hover:text-foreground transition-colors">Entities</Link>
            <Link to="/opportunities" className="hover:text-foreground transition-colors">Opportunities</Link>
            <Link to="/intelligence" className="hover:text-foreground transition-colors">Intelligence</Link>
            <Link to="/labor-rates" className="hover:text-foreground transition-colors">Labor Rates</Link>
            <Link to="/api-docs" className="hover:text-foreground transition-colors">API</Link>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground/70 text-sm">Built in Baltimore 🦀 by Infinite Data Solutions</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Powered by USASpending.gov, SAM.gov, NIH, NSF, GSA data</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
