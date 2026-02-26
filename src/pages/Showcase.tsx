import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import idsLogo from '@/assets/IDS-Logo_VertSolidColor.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, useInView } from 'framer-motion';
import {
  Search, ArrowRight, Building2, Shield,
  Zap, ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
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

const fmt = (n: number) => {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const AnimatedStat = ({ value, label, prefix = '' }: { value: number; label: string; prefix?: string }) => {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl md:text-5xl font-black font-mono tracking-tight text-foreground">
        {prefix}{fmt(count)}
      </p>
      <p className="text-xs text-muted-foreground mt-2 font-semibold uppercase tracking-[0.15em]">{label}</p>
    </div>
  );
};

const FEATURES = [
  { icon: Shield, title: 'Competitive Intelligence', desc: 'See who wins contracts in your space, which agencies they serve, and how they team.', color: 'from-cyan-500 to-blue-600' },
  { icon: Search, title: 'Market Discovery', desc: 'Filter by NAICS, agency, state, and set-aside to find your exact market.', color: 'from-violet-500 to-indigo-600' },
  { icon: Building2, title: 'Entity Deep Dives', desc: 'Full contract history, competitor analysis, and relationship mapping for any contractor.', color: 'from-emerald-500 to-teal-600' },
];

const STEPS = [
  { step: '01', title: 'Search', desc: 'Find any contractor, agency, or market segment instantly.' },
  { step: '02', title: 'Analyze', desc: 'See contract history, competitors, relationships, and AI insights.' },
  { step: '03', title: 'Win', desc: 'Track opportunities, compare competitors, and position your bid to win.' },
];

const NAV_LINKS: { to: string; label: string; hideBelow?: 'md' | 'lg' }[] = [
  { to: '/explore', label: 'Explore' },
  { to: '/entities', label: 'Entities' },
  { to: '/opportunities', label: 'Opportunities', hideBelow: 'md' },
  { to: '/intelligence', label: 'Intelligence', hideBelow: 'md' },
  { to: '/sbir', label: 'SBIR', hideBelow: 'lg' },
  { to: '/labor-rates', label: 'Labor Rates', hideBelow: 'lg' },
  { to: '/analytics', label: 'Analytics', hideBelow: 'lg' },
];

const FOOTER_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/entities', label: 'Entities' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/intelligence', label: 'Intelligence' },
  { to: '/labor-rates', label: 'Labor Rates' },
  { to: '/api-docs', label: 'API' },
];

function HeroSearchBar() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const go = () => { if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); };
  const suggestions = ['cybersecurity Maryland', 'Lockheed Martin', 'IT services 8a', 'healthcare grants', 'DoD Virginia'];
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Search contracts, entities, grants, opportunities..."
          className="pl-12 pr-32 h-14 bg-background border border-input ring-1 ring-border text-foreground placeholder:text-muted-foreground/50 rounded-xl text-base focus-visible:ring-primary shadow-md"
        />
        <Button onClick={go} disabled={!q.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 btn-omni gap-1.5 h-10 px-5">
          Search <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map(s => (
          <Badge key={s} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
            onClick={() => { setQ(s); nav(`/search?q=${encodeURIComponent(s)}`); }}>
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function Showcase() {
  const navigate = useNavigate();
  const { data: ps } = usePlatformStats();

  const agencies = Number(ps?.distinct_agencies) || 0;
  const states = Number(ps?.distinct_states) || 0;
  const totalValue = Number(ps?.contract_value || 0) + Number(ps?.idv_value || 0) + Number(ps?.grant_value || 0);
  const totalEntities = Number(ps?.entity_count) || 0;
  const totalRecords = Number(ps?.total_records) || 0;
  const dataSources = Number(ps?.data_sources) || 10;
  const lastVacuum = ps?.last_vacuum_at as string | null;

  // Freshness
  const freshnessBadge = (() => {
    if (!lastVacuum) return 'Initializing intelligence engine';
    const hoursAgo = (Date.now() - new Date(lastVacuum).getTime()) / 3600000;
    if (hoursAgo < 24) return 'Crunching live federal data';
    return 'Processing federal records';
  })();

  // Intelligence badge
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="lg" />
          </Link>
          <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to}>
                <Button variant="ghost" size="sm" className={`text-muted-foreground hover:text-foreground hover:bg-muted/60 text-[13px] font-medium ${l.hideBelow === 'md' ? 'hidden md:inline-flex' : l.hideBelow === 'lg' ? 'hidden lg:inline-flex' : ''}`}>
                  {l.label}
                </Button>
              </Link>
            ))}
            <Link to="/onboarding" className="ml-1">
              <Button size="sm" className="btn-omni text-sm h-8 px-4">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-28 px-6">
        {/* Soft radial glow */}
        <div className="absolute inset-0 radial-overlay pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-primary/[0.06] to-accent/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className={`mb-3 px-4 py-1.5 text-[13px] font-medium ${agencies > 0 ? 'bg-primary/[0.06] text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {intelBadge}
            </Badge>
            <div className="mt-2.5">
              <Badge className="bg-muted/60 text-primary border-border/60 px-3 py-1 text-xs gap-2 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {freshnessBadge}
              </Badge>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 mt-8 tracking-tight text-foreground">
            Government Contract
            <br />Intelligence.{' '}
            <span className="text-gradient-omni">Automated.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Track competitors, discover opportunities, and win more contracts with AI-powered federal intelligence.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}
            className="relative w-full max-w-2xl mx-auto mb-10">
            <HeroSearchBar />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col items-center gap-3">
            <Link to="/onboarding">
              <Button size="lg" className="btn-omni text-base px-8 h-12 gap-2 rounded-xl">
                Start Free — No credit card required <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground/70">Join government contractors using real-time intelligence</p>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-20 px-6 border-y border-border/50 bg-muted/30">
        <div className="relative max-w-5xl mx-auto">
          <p className="text-center text-xs text-muted-foreground mb-10 uppercase tracking-[0.2em] font-medium">
            {agencies > 0
              ? `Tracking federal contracts, grants & IDVs across ${agencies} agencies and ${states} states`
              : 'Ready to track federal contracts, grants & IDVs across all 50 states'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <AnimatedStat value={totalValue} label="Contract + Grant Value" prefix="$" />
            <AnimatedStat value={totalEntities} label="Organizations Tracked" />
            <AnimatedStat value={totalRecords} label="Total Federal Records" />
            <AnimatedStat value={dataSources} label="Data Sources" />
          </div>
        </div>
      </section>

      {/* ── DATA COVERAGE ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Data Coverage</h2>
            <p className="text-muted-foreground text-sm">Live record counts across all integrated federal sources</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DATA_SOURCES.map(s => {
              const hasData = s.count > 0;
              return (
                <Card key={s.label} className={`card-premium p-4 ${hasData ? 'border-primary/10' : 'opacity-50'}`}>
                  <p className="text-base mb-1">{s.emoji} <span className="text-sm font-semibold text-foreground">{s.label}</span></p>
                  {hasData ? (
                    <p className="text-xl font-bold font-mono text-gradient-omni">{s.count.toLocaleString()}</p>
                  ) : (
                    <Badge variant="secondary" className="text-xs mt-1">Coming Soon</Badge>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{s.source}</p>
                  <p className="text-[11px] text-muted-foreground/60">{s.note}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground">
              Everything you need to{' '}
              <span className="text-gradient-omni">win more contracts</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Real-time intelligence that turns public data into a competitive advantage.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}>
                <Card className="card-premium p-8 h-full group hover:shadow-[var(--shadow-card-hover)]">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-16 text-foreground">
            From search to strategy in{' '}
            <span className="text-gradient-omni">seconds</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.12 }} className="text-center">
                <div className="text-6xl font-black text-border mb-4 font-mono select-none">{s.step}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="card-premium rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.02] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground">Ready to see your competitive landscape?</h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-lg mx-auto">
                Search any organization and get instant intelligence — contract history, competitors, win rates, and market position.
              </p>
              <Link to="/onboarding">
                <Button size="lg" className="btn-omni text-base px-10 h-12 gap-2 rounded-xl">
                  Start Free — No credit card required <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
            {/* Brand column */}
            <div className="flex flex-col gap-3">
              <Logo size="md" />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                AI-powered government contract intelligence. Track competitors, discover opportunities, win more.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-muted-foreground font-medium">{freshnessBadge}</span>
              </div>
            </div>

            {/* Links column */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-[0.15em] mb-4">Platform</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {FOOTER_LINKS.map(l => (
                  <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Attribution column */}
            <div className="flex flex-col gap-3 md:items-end md:text-right">
              <a href="https://infinitedatasolutions.com" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                <img src={idsLogo} alt="Infinite Data Solutions" className="h-10 w-auto" />
              </a>
              <p className="text-sm text-muted-foreground font-medium">Built in Baltimore 🦀</p>
              <div className="h-px w-12 bg-border md:ml-auto" />
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                Powered by USASpending.gov, SAM.gov,
                <br />NIH, NSF & GSA data
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} Based Data. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/50">Government contract intelligence, automated.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
