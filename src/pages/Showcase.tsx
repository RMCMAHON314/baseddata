import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import idsLogo from '@/assets/IDS-Logo_VertSolidColor.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, useInView } from 'framer-motion';
import {
  Search, ArrowRight, Building2, Shield, Target,
  Zap, ChevronRight, Database, BarChart3, Bell,
  Globe, FileText, Beaker, DollarSign
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
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtPlain = (n: number) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const AnimatedStat = ({ value, label, prefix = '', suffix = '' }: { value: number; label: string; prefix?: string; suffix?: string }) => {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl md:text-5xl font-black font-mono tracking-tight text-foreground">
        {prefix}{fmt(count)}{suffix}
      </p>
      <p className="text-xs text-muted-foreground mt-2 font-semibold uppercase tracking-[0.15em]">{label}</p>
    </div>
  );
};

const NAV_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/entities', label: 'Entities' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/pricing', label: 'Pricing' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Contract Intelligence',
    desc: 'Track every federal contract with real-time alerts on expirations, renewals, and new awards.',
    link: '/explore',
  },
  {
    icon: Target,
    title: 'Opportunity Radar',
    desc: 'Never miss a bid. Active opportunities with deadline tracking and match scoring.',
    link: '/opportunities',
  },
  {
    icon: BarChart3,
    title: 'Competitive Analysis',
    desc: "Know who's winning, who's teaming, and where the money flows.",
    link: '/entities',
  },
];

const DATA_SOURCES = [
  { emoji: '💰', name: 'USASpending.gov', desc: 'Contracts, grants, IDVs' },
  { emoji: '🏛️', name: 'SAM.gov', desc: 'Entities & opportunities' },
  { emoji: '📋', name: 'FPDS', desc: 'Procurement data' },
  { emoji: '🔬', name: 'SBIR/STTR', desc: 'Innovation awards' },
  { emoji: '🔭', name: 'NSF', desc: 'Research grants' },
  { emoji: '📊', name: 'SEC EDGAR', desc: 'Corporate filings' },
  { emoji: '💵', name: 'GSA CALC+', desc: 'Labor rates' },
  { emoji: '🏥', name: 'ClinicalTrials.gov', desc: 'Clinical research' },
  { emoji: '📜', name: 'USPTO', desc: 'Patent data' },
];

const FOOTER_LINKS = {
  platform: [
    { to: '/explore', label: 'Explore' },
    { to: '/entities', label: 'Entities' },
    { to: '/opportunities', label: 'Opportunities' },
    { to: '/analytics', label: 'Analytics' },
  ],
  resources: [
    { to: '/pricing', label: 'Pricing' },
    { to: '/api-docs', label: 'API Docs' },
    { to: '/health', label: 'Health Status' },
    { to: '/sbir', label: 'SBIR Explorer' },
  ],
};

function HeroSearchBar() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const go = () => { if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); };
  const suggestions = ['cybersecurity Maryland', 'Lockheed Martin', 'IT services 8a', 'healthcare grants'];
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
        <Button onClick={go} disabled={!q.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 gap-1.5 h-10 px-5">
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
  const [email, setEmail] = useState('');

  const totalValue = Number(ps?.contract_value || 0) + Number(ps?.idv_value || 0) + Number(ps?.grant_value || 0);
  const totalEntities = Number(ps?.entity_count) || 3398;
  const contractCount = Number(ps?.contract_count || 0) + Number(ps?.idv_count || 0);
  const opportunityCount = Number(ps?.opportunity_count) || 1393;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="lg" />
          </Link>
          <div className="flex items-center gap-1 md:gap-1.5">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px] font-medium">
                  {l.label}
                </Button>
              </Link>
            ))}
            <Link to="/onboarding" className="ml-1">
              <Button size="sm" className="text-sm h-8 px-4">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-28 px-6">
        <div className="absolute inset-0 radial-overlay pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-primary/[0.06] to-accent/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-4 px-4 py-1.5 text-[13px] font-medium bg-primary/[0.06] text-primary border-primary/20">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Live Intelligence · Updated Every 4 Hours
            </Badge>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 mt-4 tracking-tight text-foreground">
            Government Spending
            <br />Intelligence,{' '}
            <span className="text-gradient-omni">Decoded.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Track {totalValue > 1e12 ? `$${(totalValue / 1e12).toFixed(2)}T` : fmt(totalValue)} in federal contracts, grants, and opportunities. Find your next win before your competitors.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link to="/explore">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 gap-2 rounded-xl">
                <Zap className="w-4 h-4" /> Explore Free
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button size="lg" className="text-base px-8 h-12 gap-2 rounded-xl">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <HeroSearchBar />
          </motion.div>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="relative py-20 px-6 border-y border-border/50 bg-muted/30">
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <AnimatedStat value={totalEntities} label="Entities Tracked" suffix="+" />
            <AnimatedStat value={contractCount || 4677} label="Contracts Indexed" />
            <AnimatedStat value={totalValue || 2440000000000} label="In Spending Data" prefix="$" />
            <AnimatedStat value={opportunityCount} label="Active Opportunities" />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-12 px-6 bg-muted/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground font-medium">
            Trusted by government contractors, policy analysts, and business development professionals
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">Join 50+ organizations using real-time federal intelligence</p>
        </div>
      </section>

      {/* ── FEATURE SHOWCASE ── */}
      <section className="py-24 px-6">
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
                <Link to={f.link}>
                  <Card className="card-premium p-8 h-full group hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{f.desc}</p>
                    <p className="text-sm text-primary font-medium mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more <ChevronRight className="w-4 h-4" />
                    </p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA COVERAGE ── */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              9 Federal Data Sources,{' '}
              <span className="text-gradient-omni">One Platform</span>
            </h2>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Badge variant="outline" className="gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'hsl(var(--success))' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'hsl(var(--success))' }} />
                </span>
                Updated every 4 hours
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {DATA_SOURCES.map(s => (
              <Card key={s.name} className="p-3 text-center hover:border-primary/20 transition-colors">
                <p className="text-2xl mb-1">{s.emoji}</p>
                <p className="text-xs font-semibold text-foreground leading-tight">{s.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="card-premium rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.02] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground">Ready to win more contracts?</h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-lg mx-auto">
                Start exploring federal spending data and discover opportunities in your market.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  className="h-12 bg-background"
                />
                <Link to="/onboarding">
                  <Button size="lg" className="text-base px-8 h-12 gap-2 rounded-xl whitespace-nowrap">
                    Start Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-4">No credit card required. 14-day free trial.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-start">
            {/* Brand */}
            <div className="flex flex-col gap-3 md:col-span-2">
              <Logo size="md" />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                AI-powered government contract intelligence. Track competitors, discover opportunities, win more.
              </p>
              <p className="text-sm text-muted-foreground font-medium">Built in Baltimore, MD 🦀</p>
            </div>

            {/* Platform */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-[0.15em] mb-4">Platform</p>
              <div className="flex flex-col gap-2.5">
                {FOOTER_LINKS.platform.map(l => (
                  <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-[0.15em] mb-4">Resources</p>
              <div className="flex flex-col gap-2.5">
                {FOOTER_LINKS.resources.map(l => (
                  <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} Based Data by Infinite Data Solutions. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Powered by USASpending.gov, SAM.gov, NIH, NSF & GSA data</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
