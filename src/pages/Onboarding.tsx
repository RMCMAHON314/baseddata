import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Briefcase, TrendingUp, Shield,
  Search, Bell, ChevronRight, Check,
  Zap, Target, Globe, Rocket, ArrowRight,
  DollarSign, Users, Beaker, Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatformStats } from '@/hooks/useNewSources';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Your Focus' },
  { id: 'quickstart', title: 'Quick Start' },
];

const PROFILES = [
  { id: 'bd_hunter', label: 'BD / Capture Manager', desc: 'Find and win new contracts', icon: <Target className="w-6 h-6" />, recommended: ['/explore', '/opportunities'] },
  { id: 'analyst', label: 'Market Analyst', desc: 'Research competitors & trends', icon: <TrendingUp className="w-6 h-6" />, recommended: ['/entities', '/analytics'] },
  { id: 'executive', label: 'Executive / Decision Maker', desc: 'High-level intelligence & positioning', icon: <Briefcase className="w-6 h-6" />, recommended: ['/intelligence', '/analytics'] },
  { id: 'proposal', label: 'Proposal Manager', desc: 'Competitive pricing & teaming', icon: <Users className="w-6 h-6" />, recommended: ['/labor-rates', '/compare'] },
  { id: 'sbir', label: 'SBIR/STTR Researcher', desc: 'Innovation funding & awards', icon: <Beaker className="w-6 h-6" />, recommended: ['/sbir', '/entities'] },
];

const QUICK_ACTIONS = [
  { icon: <Search className="w-5 h-5" />, label: 'Search your market', desc: 'Try "cybersecurity Maryland" or "IT services 8a"', path: '/explore', color: 'from-cyan-500 to-blue-600' },
  { icon: <Building2 className="w-5 h-5" />, label: 'Look up a competitor', desc: 'Find any contractor\'s full contract history', path: '/entities', color: 'from-violet-500 to-indigo-600' },
  { icon: <Target className="w-5 h-5" />, label: 'Find opportunities', desc: 'Active solicitations matching your capabilities', path: '/opportunities', color: 'from-emerald-500 to-teal-600' },
  { icon: <DollarSign className="w-5 h-5" />, label: 'Check labor rates', desc: 'GSA pricing benchmarks for your proposals', path: '/labor-rates', color: 'from-amber-500 to-orange-600' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const { data: ps } = usePlatformStats();

  const totalRecords = Number(ps?.total_records) || 113000;
  const agencies = Number(ps?.distinct_agencies) || 30;

  const complete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_profiles').update({
        onboarding_completed: true,
        use_case: selectedProfile,
      }).eq('id', user.id).then(() => {});
    }
    // Navigate to the first recommended page for their profile
    const profile = PROFILES.find(p => p.id === selectedProfile);
    navigate(profile?.recommended[0] || '/explore');
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] text-white flex flex-col">
      {/* Progress header */}
      <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-cyan-500 text-white' :
                  i === step ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                  'bg-white/5 text-white/30'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-cyan-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/20">
                    <Rocket className="w-12 h-12 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                      Welcome to{' '}
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Based Data</span>
                    </h1>
                    <p className="text-lg text-white/50 max-w-md mx-auto">
                      AI-powered government contract intelligence. Let's set you up in 30 seconds.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
                    <div className="text-center">
                      <p className="text-2xl font-black font-mono text-cyan-400">{(totalRecords / 1000).toFixed(0)}K+</p>
                      <p className="text-xs text-white/40 mt-1">Records</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black font-mono text-cyan-400">{agencies}+</p>
                      <p className="text-xs text-white/40 mt-1">Agencies</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black font-mono text-cyan-400">50</p>
                      <p className="text-xs text-white/40 mt-1">States</p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setStep(1)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0 text-base px-10 h-12 gap-2"
                  >
                    Let's Go <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Step 1: Profile selection */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">What's your role?</h2>
                    <p className="text-white/50">We'll personalize your experience</p>
                  </div>
                  <div className="space-y-3">
                    {PROFILES.map(p => (
                      <Card
                        key={p.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedProfile === p.id
                            ? 'border-cyan-500/50 bg-cyan-500/5'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                        onClick={() => setSelectedProfile(p.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedProfile === p.id
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-white/5 text-white/40'
                          }`}>
                            {p.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{p.label}</p>
                            <p className="text-sm text-white/40">{p.desc}</p>
                          </div>
                          {selectedProfile === p.id && (
                            <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(0)} className="text-white/40 hover:text-white hover:bg-white/5">Back</Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedProfile}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0 gap-1.5"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Quick Start */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">You're ready!</h2>
                    <p className="text-white/50">Jump right in — pick your first action:</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {QUICK_ACTIONS.map(a => (
                      <Card
                        key={a.path}
                        className="cursor-pointer border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] transition-all duration-200 group"
                        onClick={() => {
                          complete();
                          navigate(a.path);
                        }}
                      >
                        <CardContent className="p-5">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center mb-3 text-white`}>
                            {a.icon}
                          </div>
                          <p className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">{a.label}</p>
                          <p className="text-xs text-white/40">{a.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-white/40 hover:text-white hover:bg-white/5">Back</Button>
                    <Button
                      variant="ghost"
                      onClick={complete}
                      className="text-white/40 hover:text-white hover:bg-white/5"
                    >
                      Skip, take me to the app →
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
