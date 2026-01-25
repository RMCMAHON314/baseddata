// Insights List Component - Displays AI-generated insights with actions
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, AlertTriangle, Trophy, Target, TrendingUp, 
  ChevronRight, Loader2, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface InsightsListProps {
  entityId?: string;
  limit?: number;
  showActions?: boolean;
}

interface Insight {
  id: string;
  entity_id?: string;
  entity_ids?: string[];
  insight_type: string;
  title: string;
  description: string;
  priority?: string;
  severity?: string;
  action_items?: string[];
  evidence?: unknown;
  is_active?: boolean;
  created_at: string;
}

const INSIGHT_CONFIG = {
  success: { icon: Trophy, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  opportunity: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
  threat: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
  trend: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/30' },
};

export function InsightsList({ entityId, limit = 10, showActions = true }: InsightsListProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [entityId]);

  async function loadInsights() {
    setLoading(true);
    try {
      // Try core_derived_insights first, fallback to insights table
      let data: Insight[] = [];
      
      const { data: derivedInsights, error: derivedError } = await supabase
        .from('core_derived_insights')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!derivedError && derivedInsights && derivedInsights.length > 0) {
        data = derivedInsights.map(i => ({
          id: i.id,
          entity_id: i.related_entities?.[0],
          entity_ids: i.related_entities,
          insight_type: i.insight_type || 'trend',
          title: i.title,
          description: i.description,
          priority: i.severity === 'critical' ? 'high' : i.severity === 'notable' ? 'medium' : 'low',
          severity: i.severity,
          created_at: i.created_at
        }));
      } else {
        // Fallback to insights table
        const { data: insightsData } = await supabase
          .from('insights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (insightsData) {
          data = insightsData as unknown as Insight[];
        }
      }

      const error = derivedError;
      if (data) {
        setInsights(data);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateInsights() {
    setGenerating(true);
    try {
      // Get entity for insight generation
      if (entityId) {
        const { data: entity } = await supabase
          .from('core_entities')
          .select('canonical_name, opportunity_score, total_contract_value')
          .eq('id', entityId)
          .single();

        const { data: healthScore } = await supabase
          .from('entity_health_scores')
          .select('*')
          .eq('entity_id', entityId)
          .maybeSingle();

        // Generate basic insight based on data
        const insightType = (healthScore?.trend_direction === 'down') ? 'warning' : 
                           (entity?.opportunity_score || 0) > 70 ? 'opportunity' : 'trend';

        await supabase.from('insights').insert({
          entity_id: entityId,
          insight_type: insightType,
          title: `${insightType === 'warning' ? 'Performance Alert' : 'Market Opportunity'} for ${entity?.canonical_name}`,
          description: insightType === 'warning' 
            ? `Health metrics indicate declining performance. Review contract pipeline and relationship strength.`
            : `Entity shows strong opportunity score of ${entity?.opportunity_score}. Consider expanding agency relationships.`,
          priority: insightType === 'warning' ? 'high' : 'medium',
          action_items: insightType === 'warning'
            ? ['Review recent contract performance', 'Assess relationship density', 'Identify new market opportunities']
            : ['Strengthen existing agency relationships', 'Expand NAICS capabilities', 'Monitor competitor activity']
        });
      }
      
      await loadInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGenerating(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
          {showActions && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={generateInsights}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No insights generated yet</p>
            {showActions && entityId && (
              <Button onClick={generateInsights} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Insights
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const config = INSIGHT_CONFIG[insight.insight_type] || INSIGHT_CONFIG.trend;
              const Icon = config.icon;
              const isExpanded = expandedId === insight.id;

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-lg border ${config.bg} cursor-pointer transition-all`}
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-background/50`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{insight.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            insight.priority === 'high' ? 'border-red-500/50 text-red-500' :
                            insight.priority === 'medium' ? 'border-yellow-500/50 text-yellow-500' :
                            'border-muted-foreground/50'
                          }`}
                        >
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {insight.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(insight.created_at)}
                      </p>

                      {/* Action Items */}
                      {isExpanded && insight.action_items && insight.action_items.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-border/50"
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-2">Recommended Actions:</p>
                          <ul className="space-y-2">
                            {insight.action_items.map((action, j) => (
                              <li key={j} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
