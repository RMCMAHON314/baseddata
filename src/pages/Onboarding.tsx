import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Briefcase, Users, TrendingUp, Shield, 
  Database, Search, Bell, ChevronRight, Check,
  Zap, Target, Globe, Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with Based Data' },
  { id: 'interests', title: 'Interests', description: 'What data matters to you?' },
  { id: 'use_case', title: 'Use Case', description: 'How will you use the platform?' },
  { id: 'complete', title: 'Complete', description: 'You\'re all set!' }
];

const INTERESTS = [
  { id: 'healthcare', label: 'Healthcare', icon: <Shield className="w-5 h-5" /> },
  { id: 'government', label: 'Government Contracts', icon: <Building2 className="w-5 h-5" /> },
  { id: 'real_estate', label: 'Real Estate', icon: <Globe className="w-5 h-5" /> },
  { id: 'business', label: 'Business Intel', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'compliance', label: 'Compliance', icon: <Shield className="w-5 h-5" /> },
  { id: 'finance', label: 'Finance', icon: <TrendingUp className="w-5 h-5" /> }
];

const USE_CASES = [
  { id: 'research', label: 'Research & Analysis', description: 'Deep dive into entity data', icon: <Search /> },
  { id: 'monitoring', label: 'Monitoring & Alerts', description: 'Track changes in real-time', icon: <Bell /> },
  { id: 'sales', label: 'Sales Intelligence', description: 'Find opportunities & leads', icon: <Target /> },
  { id: 'compliance', label: 'Compliance & Risk', description: 'Due diligence & verification', icon: <Shield /> }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const complete = async () => {
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_profiles').update({
        onboarding_completed: true,
        interests: selectedInterests,
        use_case: selectedUseCase
      }).eq('id', user.id);
    }

    setSaving(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <Progress value={progress} className="w-32 h-2" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && (
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Rocket className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-4">Welcome to Based Data</h1>
                    <p className="text-xl text-muted-foreground">
                      The world's most powerful public data intelligence platform.
                      Let's personalize your experience.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <StatPreview icon={<Database />} label="1.2M+" sublabel="Entities" />
                    <StatPreview icon={<Zap />} label="61K+" sublabel="Facts" />
                    <StatPreview icon={<Globe />} label="60+" sublabel="Sources" />
                  </div>
                  <Button size="lg" onClick={next} className="px-8">
                    Get Started <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">What interests you?</h2>
                    <p className="text-muted-foreground">Select all that apply</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {INTERESTS.map(interest => (
                      <Card 
                        key={interest.id}
                        className={`cursor-pointer transition-all ${
                          selectedInterests.includes(interest.id) 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleInterest(interest.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <span className={selectedInterests.includes(interest.id) ? 'text-primary' : 'text-muted-foreground'}>
                            {interest.icon}
                          </span>
                          <span className="font-medium">{interest.label}</span>
                          {selectedInterests.includes(interest.id) && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={back}>Back</Button>
                    <Button onClick={next} disabled={selectedInterests.length === 0}>
                      Continue <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">How will you use Based Data?</h2>
                    <p className="text-muted-foreground">Choose your primary use case</p>
                  </div>
                  <div className="space-y-4">
                    {USE_CASES.map(useCase => (
                      <Card 
                        key={useCase.id}
                        className={`cursor-pointer transition-all ${
                          selectedUseCase === useCase.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedUseCase(useCase.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            selectedUseCase === useCase.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {useCase.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{useCase.label}</p>
                            <p className="text-sm text-muted-foreground">{useCase.description}</p>
                          </div>
                          {selectedUseCase === useCase.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={back}>Back</Button>
                    <Button onClick={next} disabled={!selectedUseCase}>
                      Continue <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-4">You're all set!</h1>
                    <p className="text-xl text-muted-foreground">
                      Your personalized experience is ready. Start exploring the data.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto text-left">
                    <h3 className="font-semibold mb-4">Your preferences:</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Interests</Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedInterests.map(i => INTERESTS.find(int => int.id === i)?.label).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Use Case</Badge>
                        <span className="text-sm text-muted-foreground">
                          {USE_CASES.find(u => u.id === selectedUseCase)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={back}>Back</Button>
                    <Button size="lg" onClick={complete} disabled={saving}>
                      {saving ? 'Saving...' : 'Start Exploring'} <Rocket className="w-4 h-4 ml-2" />
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

function StatPreview({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
        {icon}
      </div>
      <p className="font-bold text-lg">{label}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}
