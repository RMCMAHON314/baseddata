import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Briefcase, TrendingUp,
  Search, ChevronRight, Check,
  Zap, Target, Users, Beaker, ArrowRight,
  DollarSign, Compass, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatformStats } from '@/hooks/useNewSources';
import { useQuery } from '@tanstack/react-query';

const STEPS = [
  { id: 'profile', title: 'Profile' },
  { id: 'interests', title: 'Interests' },
  { id: 'first-wins', title: 'First Wins' },
];

const ROLES = [
  { id: 'bd', label: 'Business Development', icon: Target },
  { id: 'capture', label: 'Capture Manager', icon: Briefcase },
  { id: 'executive', label: 'Executive', icon: TrendingUp },
  { id: 'analyst', label: 'Analyst', icon: Search },
  { id: 'policy', label: 'Policy / Research', icon: Beaker },
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
const MARKETS = ['Defense', 'Health', 'IT', 'Education', 'Energy', 'Other'];

const TOP_AGENCIES = [
  'DEPT OF DEFENSE', 'DEPT OF HEALTH AND HUMAN SERVICES', 'DEPT OF HOMELAND SECURITY',
  'GENERAL SERVICES ADMINISTRATION', 'DEPT OF VETERANS AFFAIRS', 'DEPT OF ENERGY',
  'DEPT OF THE INTERIOR', 'DEPT OF JUSTICE', 'DEPT OF TRANSPORTATION', 'DEPT OF STATE',
  'NASA', 'NATIONAL SCIENCE FOUNDATION', 'DEPT OF EDUCATION', 'DEPT OF AGRICULTURE',
  'DEPT OF COMMERCE', 'DEPT OF THE TREASURY', 'ENVIRONMENTAL PROTECTION AGENCY',
  'SOCIAL SECURITY ADMINISTRATION', 'SMALL BUSINESS ADMINISTRATION', 'DEPT OF LABOR',
];

const DEFAULT_STATES = ['MD', 'VA', 'DC'];

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { data: ps } = usePlatformStats();

  // Step 1: Profile
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState('');
  const [market, setMarket] = useState('');

  // Step 2: Interests
  const [naicsInput, setNaicsInput] = useState('');
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>(DEFAULT_STATES);

  const totalRecords = Number(ps?.total_records) || 113000;
  const agencies = Number(ps?.distinct_agencies) || 30;

  // Step 3: Matching data
  const { data: matchingOpps, isLoading: loadingOpps } = useQuery({
    queryKey: ['onboard-opps', selectedStates, selectedAgencies, naicsInput],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select('id, title, department, response_deadline, pop_state')
        .eq('is_active', true)
        .order('response_deadline', { ascending: true })
        .limit(5);
      if (selectedStates.length > 0) query = query.in('pop_state', selectedStates);
      if (naicsInput) query = query.eq('naics_code', naicsInput);
      const { data } = await query;
      return data || [];
    },
    enabled: step === 2,
    staleTime: 60000,
  });

  const { data: matchingEntities, isLoading: loadingEntities } = useQuery({
    queryKey: ['onboard-entities', selectedStates, market],
    queryFn: async () => {
      let query = supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state, total_contract_value')
        .order('total_contract_value', { ascending: false, nullsFirst: false })
        .limit(5);
      if (selectedStates.length > 0) query = query.in('state', selectedStates);
      const { data } = await query;
      return data || [];
    },
    enabled: step === 2,
    staleTime: 60000,
  });

  const toggleAgency = (a: string) => {
    setSelectedAgencies(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };
  const toggleState = (s: string) => {
    setSelectedStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const complete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_profiles').update({
        onboarding_completed: true,
        use_case: role,
      }).eq('id', user.id).then(() => {});
    }
    navigate('/explore');
  };

  const canContinueStep0 = role !== null;
  const canContinueStep1 = true; // interests are optional

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/20 text-primary border border-primary/40' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

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
              {/* Step 0: Profile */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-3xl font-black mb-2">Tell us about yourself</h1>
                    <p className="text-muted-foreground">We'll personalize your experience</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Company Name</Label>
                      <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" className="mt-1.5" />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Your Role</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ROLES.map(r => (
                          <Card
                            key={r.id}
                            className={`cursor-pointer transition-all p-3 ${role === r.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}
                            onClick={() => setRole(r.id)}
                          >
                            <div className="flex items-center gap-2">
                              <r.icon className={`w-4 h-4 ${role === r.id ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-sm font-medium">{r.label}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Company Size</Label>
                        <Select value={companySize} onValueChange={setCompanySize}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Primary Market</Label>
                        <Select value={market} onValueChange={setMarket}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => setStep(1)} disabled={!canContinueStep0} className="gap-1.5">
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1: Interests */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">What are you tracking?</h2>
                    <p className="text-muted-foreground">Select your areas of interest (all optional)</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">NAICS Code (optional)</Label>
                    <Input value={naicsInput} onChange={e => setNaicsInput(e.target.value)} placeholder="e.g. 541512" className="mt-1.5" />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Agencies of Interest</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                      {TOP_AGENCIES.map(a => (
                        <Badge
                          key={a}
                          variant={selectedAgencies.includes(a) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleAgency(a)}
                        >
                          {a.length > 30 ? a.slice(0, 28) + '…' : a}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">States of Interest</Label>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {ALL_STATES.map(s => (
                        <Badge
                          key={s}
                          variant={selectedStates.includes(s) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs w-10 justify-center"
                          onClick={() => toggleState(s)}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                    <Button onClick={() => setStep(2)} className="gap-1.5">
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: First Wins */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Your First Wins</h2>
                    <p className="text-muted-foreground">Here's what we found based on your interests</p>
                  </div>

                  {/* Matching Opportunities */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Matching Opportunities
                    </h3>
                    {loadingOpps ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
                    ) : matchingOpps && matchingOpps.length > 0 ? (
                      <div className="space-y-1.5">
                        {matchingOpps.map((opp: any) => (
                          <Card key={opp.id} className="p-3">
                            <p className="text-sm font-medium truncate">{opp.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px]">{opp.department || 'Federal'}</Badge>
                              {opp.pop_state && <Badge variant="outline" className="text-[10px]">{opp.pop_state}</Badge>}
                              {opp.response_deadline && <span className="text-[10px] text-muted-foreground">Due {new Date(opp.response_deadline).toLocaleDateString()}</span>}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No matching opportunities yet — try broader filters.</p>
                    )}
                  </div>

                  {/* Matching Entities */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Competitors & Partners
                    </h3>
                    {loadingEntities ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
                    ) : matchingEntities && matchingEntities.length > 0 ? (
                      <div className="space-y-1.5">
                        {matchingEntities.map((e: any) => (
                          <Card key={e.id} className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{e.canonical_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px]">{e.entity_type}</Badge>
                                {e.state && <span className="text-[10px] text-muted-foreground">{e.state}</span>}
                              </div>
                            </div>
                            {e.total_contract_value && (
                              <span className="text-sm font-mono font-semibold text-primary">
                                ${e.total_contract_value >= 1e9 ? `${(e.total_contract_value / 1e9).toFixed(1)}B` : e.total_contract_value >= 1e6 ? `${(e.total_contract_value / 1e6).toFixed(0)}M` : `${(e.total_contract_value / 1e3).toFixed(0)}K`}
                              </span>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No matching entities yet.</p>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={complete} className="text-muted-foreground">
                        Skip
                      </Button>
                      <Button onClick={complete} className="gap-1.5">
                        Go to Dashboard <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
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
