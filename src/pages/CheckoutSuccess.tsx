import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { useAuth } from '@/contexts/AuthContext';

const PERKS = [
  { icon: Zap, title: 'Unlimited Exports', desc: 'CSV, XLSX, PDF, and JSON — no restrictions' },
  { icon: Sparkles, title: 'AI Intelligence', desc: 'Unlimited Omniscient AI queries per day' },
  { icon: Crown, title: 'Priority Data', desc: 'First access to new data sources and features' },
];

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { refreshSubscription } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshSubscription().then(() => setReady(true));
  }, [refreshSubscription]);

  return (
    <GlobalLayout>
      <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold mb-3">
          Welcome to <span className="text-primary">BasedData Pro</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-muted-foreground mb-10">
          Your subscription is active. Here's what you just unlocked:
        </motion.p>

        <div className="grid gap-4 mb-10">
          {PERKS.map((perk, i) => (
            <motion.div key={perk.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
              <Card className="border-primary/10">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <perk.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{perk.title}</p>
                    <p className="text-xs text-muted-foreground">{perk.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/dashboard')} className="gap-2">
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/search')}>
            Start Searching
          </Button>
        </motion.div>
      </div>
    </GlobalLayout>
  );
}
