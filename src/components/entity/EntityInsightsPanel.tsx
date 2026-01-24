// Entity Insights Panel - AI-powered insights sidebar
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, TrendingUp, AlertTriangle, Lightbulb, Target, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  created_at: string;
}

interface EntityInsightsPanelProps {
  entityId: string;
  entityName: string;
}

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  opportunity: Target,
  trend: TrendingUp,
  warning: AlertTriangle,
  achievement: Trophy,
  recommendation: Lightbulb,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-destructive bg-destructive/5',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-primary bg-primary/5',
  low: 'border-l-muted-foreground bg-secondary/50',
};

export function EntityInsightsPanel({ entityId, entityName }: EntityInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [entityId]);

  const loadInsights = async () => {
    setLoading(true);
    
    // Try to get existing insights
    const { data, error } = await supabase
      .from('core_derived_insights')
      .select('*')
      .contains('entity_ids', [entityId])
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setInsights(data as Insight[]);
    }
    setLoading(false);
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      await supabase.functions.invoke('core-generate-insights', {
        body: { entityIds: [entityId] }
      });
      await loadInsights();
    } catch (err) {
      console.error('Error generating insights:', err);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={generateInsights}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No insights yet for this entity</p>
            <Button onClick={generateInsights} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = INSIGHT_ICONS[insight.insight_type] || Lightbulb;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border-l-4 ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.low}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-current" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {insight.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(insight.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
