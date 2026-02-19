import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, useInView } from 'framer-motion';
import {
  Search, ArrowRight, Building2, Shield, Target, TrendingUp,
  Zap, BarChart3, Bell, ChevronRight, ExternalLink
} from 'lucide-react';
import { Logo } from '@/components/Logo';

/* ── animated counter ── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
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

function AnimatedStat({ value, label, prefix = '' }: { value: number; label: string; prefix?: string }) {
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
      <p className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white">
        {prefix}{fmt(count)}
      </p>
      <p className="text-sm text-cyan-300/70 mt-2 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

/* ── search results dropdown ── */
function SearchDropdown({ results, onSelect }: { results: any[]; onSelect: (id: string) => void }) {
  if (!results.length) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-[hsl(220,30%,12%)] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
      {results.map((e) => (
        <button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
        >
          <Building2 className="h-4 w-4 text-cyan-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{e.canonical_name}</p>
            <p className="text-xs text-white/50">{e.entity_type} · {e.state || 'US'} · {e.contract_count || 0} contracts</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30" />
        </button>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Competitive Intelligence',
    desc: 'Know who\'s winning contracts, where they operate, and how to position against them.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Bell,
    title: 'Opportunity Alerts',
    desc: 'Get notified the moment contracts match your criteria. Never miss a bid window again.',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    icon: TrendingUp,
    title: 'Win Probability',
    desc: 'AI-scored likelihood before you invest in a proposal. Focus on the bids you can win.',
    color: 'from-emerald-500 to-teal-600',
  },
];

export default function Showcase() {
  const [stats, setStats] = useState({ totalValue: 0, entities: 0, relationships: 0, agencies: 0, states: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [entities, rels, valueRes, statesRes, agenciesRes] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('base_and_all_options').limit(1000),
      supabase.from('core_entities').select('state').not('state', 'is', null).limit(1000),
      supabase.from('contracts').select('awarding_agency').not('awarding_agency', 'is', null).limit(1000),
    ]);
    const totalValue = (valueRes.data || []).reduce((s, c) => s + (Number(c.base_and_all_options) || 0), 0);
    const uniqueStates = new Set((statesRes.data || []).map(e => e.state)).size;
    const uniqueAgencies = new Set((agenciesRes.data || []).map(c => c.awarding_agency)).size;
    setStats({
      totalValue,
      entities: entities.count || 0,
      relationships: rels.count || 0,
      agencies: uniqueAgencies,
      states: uniqueStates,
    });
  }

  function handleSearchInput(q: string) {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); setShowResults(false); return; }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state, contract_count')
        .ilike('canonical_name', `%${q}%`)
        .order('total_contract_value', { ascending: false })
        .limit(5);
      setSearchResults(data || []);
      setShowResults(true);
    }, 300);
  }

  function handleSearchSelect(id: string) {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/entity/${id}`);
  }

  function handleSearchSubmit() {
    if (searchQuery) navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
  }

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] text-white overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <Logo variant="compact" className="text-2xl" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/explore"><Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">Explore</Button></Link>
          <Link to="/entities"><Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">Entities</Button></Link>
          <Link to="/analytics"><Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 hidden md:inline-flex">Analytics</Button></Link>
          <Link to="/onboarding">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-16 pb-32 px-6">
        {/* bg effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-sm font-medium">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Live Intelligence · {stats.agencies} Agencies · {stats.states} States
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 tracking-tight"
          >
            Government Contract
            <br />
            Intelligence.{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Automated.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10"
          >
            Track competitors, discover opportunities, and win more contracts with
            AI-powered federal intelligence.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative w-full max-w-xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search organizations — try &quot;Lockheed Martin&quot;"
                className="w-full pl-12 pr-28 py-4 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-base focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
              <Button
                onClick={handleSearchSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0 gap-1.5"
              >
                Search <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {showResults && <SearchDropdown results={searchResults} onSelect={handleSearchSelect} />}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 text-base px-8 h-12 gap-2">
                Start Free — No credit card required
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-xs text-white/30">Join government contractors using real-time intelligence</p>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-20 px-6 border-y border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/3 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-center text-sm text-white/40 mb-10 uppercase tracking-widest">
            Tracking $574B+ in federal contracts across {stats.agencies} agencies and {stats.states} states
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <AnimatedStat value={stats.totalValue} label="Contract Value Indexed" prefix="$" />
            <AnimatedStat value={stats.entities} label="Organizations Tracked" />
            <AnimatedStat value={stats.relationships} label="Relationships Mapped" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                win more contracts
              </span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Real-time intelligence that turns public data into a competitive advantage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                <p className="text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-16">
            From search to strategy in{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">seconds</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Search', desc: 'Find any contractor, agency, or market segment instantly.' },
              { step: '02', title: 'Analyze', desc: 'See contract history, competitors, relationships, and AI insights.' },
              { step: '03', title: 'Win', desc: 'Track opportunities, compare competitors, and position your bid to win.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-black text-white/5 mb-4 font-mono">{s.step}</div>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/40">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-cyan-500/5 to-transparent p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Ready to see your competitive landscape?
            </h2>
            <p className="text-white/40 mb-8 text-lg">
              Search any organization and get instant intelligence — contract history,
              competitors, win rates, and market position.
            </p>
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 text-base px-10 h-12 gap-2">
                Start Free — No credit card required
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo variant="compact" className="text-lg" />
            <span className="text-white/30 text-sm">Government Contract Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <Link to="/explore" className="hover:text-white/60 transition-colors">Explore</Link>
            <Link to="/entities" className="hover:text-white/60 transition-colors">Entities</Link>
            <Link to="/analytics" className="hover:text-white/60 transition-colors">Analytics</Link>
            <Link to="/api-docs" className="hover:text-white/60 transition-colors">API</Link>
            <Link to="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
          </div>
          <p className="text-white/20 text-sm">Built in Baltimore 🦀</p>
        </div>
      </footer>
    </div>
  );
}
