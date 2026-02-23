import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Waves } from 'lucide-react';

export const DataFloodPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const invoke = async (fnName: string, body: any, label: string) => {
    setLoading(label);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setResults(data);
      toast({ title: '✅ ' + label, description: `Loaded ${data?.loaded || data?.total_loaded || 0} records` });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-primary/20 bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-primary flex items-center gap-2">
              <Waves className="h-5 w-5" />
              Data Flood Controls
              <Badge variant="outline" className="text-xs">Admin</Badge>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                onClick={() => invoke('usaspending-bulk-load', { state: 'MD', fiscal_year: 2025, limit: 100, page: 1 }, 'MD Contracts')}
                disabled={!!loading} size="sm"
              >
                {loading === 'MD Contracts' ? '⏳ Loading...' : '🏠 Load MD Contracts'}
              </Button>
              <Button
                onClick={() => invoke('usaspending-bulk-load', { state: 'VA', fiscal_year: 2025, limit: 100, page: 1 }, 'VA Contracts')}
                disabled={!!loading} size="sm"
              >
                {loading === 'VA Contracts' ? '⏳ Loading...' : '🏛️ Load VA Contracts'}
              </Button>
              <Button
                onClick={() => invoke('data-flood', { mode: 'targeted', fiscal_year: 2025, pages: 3 }, 'Top 5 States')}
                disabled={!!loading} size="sm" variant="secondary"
              >
                {loading === 'Top 5 States' ? '⏳ Loading...' : '🎯 Top 5 States (1,500)'}
              </Button>
              <Button
                onClick={() => invoke('data-flood', { mode: 'full', fiscal_year: 2025, pages: 2 }, 'All 50 States')}
                disabled={!!loading} size="sm" variant="destructive"
              >
                {loading === 'All 50 States' ? '⏳ Loading...' : '🌊 ALL 50 States (10K+)'}
              </Button>
              <Button
                onClick={() => invoke('sam-opportunities-load', { limit: 25, offset: 0, posted_from: '01/01/2025' }, 'SAM Opportunities')}
                disabled={!!loading} size="sm" variant="outline"
              >
                {loading === 'SAM Opportunities' ? '⏳ Loading...' : '📡 Load SAM Opportunities'}
              </Button>
              <Button
                onClick={() => invoke('usaspending-bulk-load', { state: 'MD', fiscal_year: 2025, limit: 100, page: 1, award_type: 'grants' }, 'MD Grants')}
                disabled={!!loading} size="sm" variant="outline"
              >
                {loading === 'MD Grants' ? '⏳ Loading...' : '💰 Load MD Grants'}
              </Button>
              <Button
                onClick={() => invoke('scheduled-refresh', {}, 'Scheduled Refresh')}
                disabled={!!loading} size="sm"
                className="col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {loading === 'Scheduled Refresh' ? '⏳ Running full refresh...' : '🔄 Run Full Scheduled Refresh'}
              </Button>
            </div>

            <div className="border-t border-border pt-3 mt-1">
              <p className="text-xs text-muted-foreground mb-2 font-semibold">New Data Sources</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => invoke('load-sbir', { agency: 'DOD', year: 2024 }, 'SBIR DOD')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'SBIR DOD' ? '⏳ Loading...' : '🔬 SBIR Awards (DOD)'}
                </Button>
                <Button
                  onClick={() => invoke('load-sbir', { agency: 'HHS', year: 2024 }, 'SBIR HHS')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'SBIR HHS' ? '⏳ Loading...' : '🧬 SBIR Awards (HHS)'}
                </Button>
                <Button
                  onClick={() => invoke('load-sam-entities', { state: 'MD' }, 'SAM Entities MD')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'SAM Entities MD' ? '⏳ Loading...' : '🏢 SAM Entities (MD)'}
                </Button>
                <Button
                  onClick={() => invoke('load-sam-entities', { state: 'VA' }, 'SAM Entities VA')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'SAM Entities VA' ? '⏳ Loading...' : '🏛️ SAM Entities (VA)'}
                </Button>
                <Button
                  onClick={() => invoke('load-sam-exclusions', {}, 'SAM Exclusions')}
                  disabled={!!loading} size="sm" variant="destructive"
                >
                  {loading === 'SAM Exclusions' ? '⏳ Loading...' : '🚫 Load Exclusions'}
                </Button>
                <Button
                  onClick={() => invoke('load-fpds', { department_code: '9700' }, 'FPDS DoD')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'FPDS DoD' ? '⏳ Loading...' : '📋 FPDS Awards (DoD)'}
                </Button>
                <Button
                  onClick={() => invoke('load-nsf', { keyword: 'cybersecurity' }, 'NSF Cyber')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'NSF Cyber' ? '⏳ Loading...' : '🎓 NSF Awards (Cyber)'}
                </Button>
                <Button
                  onClick={() => invoke('load-nsf', { keyword: 'artificial intelligence' }, 'NSF AI')}
                  disabled={!!loading} size="sm" variant="outline"
                >
                  {loading === 'NSF AI' ? '⏳ Loading...' : '🤖 NSF Awards (AI)'}
                </Button>
              </div>
            </div>

            {results && (
              <pre className="bg-muted rounded p-3 text-xs text-foreground overflow-auto max-h-48">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
