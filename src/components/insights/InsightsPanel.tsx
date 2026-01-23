// ============================================================================
// BASED DATA v10.0 - AI Insights Panel
// The VALUE ADD - Auto-discovered insights with severity levels
// ============================================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, TrendingUp, Lightbulb, MapPin, DollarSign,
  ChevronDown, ChevronRight, Eye, ExternalLink, Sparkles,
  AlertCircle, Info, Zap, Target, Users, Building2
} from 'lucide-react';
import type { OmniscientInsights } from '@/types/omniscient';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';

interface AutoInsight {
  id: string;
  type: 'concentration' | 'financial' | 'anomaly' | 'risk' | 'opportunity' | 'correlation' | 'gap';
  severity: 'critical' | 'important' | 'notable' | 'info';
  title: string;
  description: string;
  supporting_data?: Record<string, any>;
  location?: string;
  actionable?: boolean;
}

interface InsightsPanelProps {
  insights?: OmniscientInsights;
  records: ProcessedRecord[];
  isLoading?: boolean;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  concentration: MapPin,
  financial: DollarSign,
  anomaly: AlertTriangle,
  risk: AlertCircle,
  opportunity: TrendingUp,
  correlation: Target,
  gap: Users,
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: 'border-red-300', bg: 'bg-red-50', icon: '🚨' },
  important: { border: 'border-amber-300', bg: 'bg-amber-50', icon: '⚡' },
  notable: { border: 'border-blue-300', bg: 'bg-blue-50', icon: '💡' },
  info: { border: 'border-slate-200', bg: 'bg-slate-50', icon: 'ℹ️' },
};

// Generate auto-insights from records
function generateAutoInsights(records: ProcessedRecord[]): AutoInsight[] {
  const insights: AutoInsight[] = [];
  if (!records.length) return insights;

  // Group by category
  const byCategory: Record<string, ProcessedRecord[]> = {};
  const byCity: Record<string, ProcessedRecord[]> = {};
  const bySource: Record<string, ProcessedRecord[]> = {};
  
  records.forEach(r => {
    const cat = String((r.properties as any)?.category || 'OTHER').toUpperCase();
    const city = (r.properties as any)?.city || (r.properties as any)?.state || 'Unknown';
    const source = String((r.properties as any)?.source || 'Unknown');
    
    if (!byCategory[cat]) byCategory[cat] = [];
    if (!byCity[city]) byCity[city] = [];
    if (!bySource[source]) bySource[source] = [];
    
    byCategory[cat].push(r);
    byCity[city].push(r);
    bySource[source].push(r);
  });

  // 1. Concentration Analysis
  const cities = Object.entries(byCity).sort((a, b) => b[1].length - a[1].length);
  if (cities.length > 0 && cities[0][1].length > records.length * 0.3) {
    const topCity = cities[0];
    insights.push({
      id: 'concentration-1',
      type: 'concentration',
      severity: 'notable',
      title: `High concentration in ${topCity[0]}`,
      description: `${topCity[1].length} of ${records.length} results (${Math.round(topCity[1].length / records.length * 100)}%) are concentrated in ${topCity[0]}. This may indicate market saturation or underserved surrounding areas.`,
      supporting_data: { city: topCity[0], count: topCity[1].length, percentage: Math.round(topCity[1].length / records.length * 100) },
      location: topCity[0],
    });
  }

  // 2. Financial Analysis (for payment/contract data)
  const withPayments = records.filter(r => {
    const props = r.properties as any;
    return props?.payment_amount || props?.award_amount || props?.total_amount;
  });
  
  if (withPayments.length > 0) {
    const totalAmount = withPayments.reduce((sum, r) => {
      const props = r.properties as any;
      return sum + (props?.payment_amount || props?.award_amount || props?.total_amount || 0);
    }, 0);
    
    if (totalAmount > 100000) {
      insights.push({
        id: 'financial-1',
        type: 'financial',
        severity: totalAmount > 10000000 ? 'important' : 'notable',
        title: `$${(totalAmount / 1000000).toFixed(1)}M in tracked payments/contracts`,
        description: `${withPayments.length} records with financial data totaling $${totalAmount.toLocaleString()}. Top recipients and payers identified.`,
        supporting_data: { total: totalAmount, records: withPayments.length },
        actionable: true,
      });
    }
  }

  // 3. Multi-Source Correlation
  const sources = Object.keys(bySource);
  if (sources.length > 3) {
    insights.push({
      id: 'correlation-1',
      type: 'correlation',
      severity: 'info',
      title: `Data from ${sources.length} independent sources`,
      description: `Cross-referencing ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` and ${sources.length - 3} more` : ''}. High correlation confidence when multiple sources agree.`,
      supporting_data: { sources, count: sources.length },
    });
  }

  // 4. Category Dominance
  const categories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
  if (categories.length > 1 && categories[0][1].length > records.length * 0.6) {
    insights.push({
      id: 'category-1',
      type: 'concentration',
      severity: 'info',
      title: `${categories[0][0]} dominates results (${Math.round(categories[0][1].length / records.length * 100)}%)`,
      description: `The ${categories[0][0]} category represents the majority of results. Consider narrowing your search for more specific data.`,
      supporting_data: { category: categories[0][0], count: categories[0][1].length },
    });
  }

  // 5. Quality Distribution
  const highQuality = records.filter(r => r.bestConfidence > 0.8);
  const lowQuality = records.filter(r => r.bestConfidence < 0.5);
  
  if (lowQuality.length > records.length * 0.3) {
    insights.push({
      id: 'quality-1',
      type: 'risk',
      severity: 'notable',
      title: `${Math.round(lowQuality.length / records.length * 100)}% of results have low confidence scores`,
      description: `${lowQuality.length} records scored below 50% confidence. Consider filtering to high-confidence data for critical decisions.`,
      supporting_data: { low: lowQuality.length, high: highQuality.length },
    });
  } else if (highQuality.length > records.length * 0.7) {
    insights.push({
      id: 'quality-2',
      type: 'opportunity',
      severity: 'info',
      title: `High-quality dataset: ${Math.round(highQuality.length / records.length * 100)}% with 80%+ confidence`,
      description: `This dataset has exceptional quality with ${highQuality.length} high-confidence records.`,
      supporting_data: { high: highQuality.length },
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, important: 1, notable: 2, info: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}

export function InsightsPanel({ insights, records, isLoading, compact = false }: InsightsPanelProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  
  // Generate auto-insights from records
  const autoInsights = useMemo(() => generateAutoInsights(records), [records]);
  
  // Combine API insights with auto-generated
  const allInsights = useMemo(() => {
    const fromApi: AutoInsight[] = [];
    
    if (insights?.key_findings) {
      insights.key_findings.forEach((finding, i) => {
        fromApi.push({
          id: `api-finding-${i}`,
          type: 'opportunity',
          severity: 'notable',
          title: finding.split('.')[0] || finding,
          description: finding,
        });
      });
    }
    
    return [...autoInsights, ...fromApi].slice(0, compact ? 3 : 10);
  }, [insights, autoInsights, compact]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-600" />
          <span>Analyzing data...</span>
        </div>
      </div>
    );
  }

  if (allInsights.length === 0 && !insights?.summary) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <div className="font-medium">No insights yet</div>
        <div className="text-sm">Search for data to see AI-generated insights</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact ? "p-3" : "p-4")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {compact ? 'Insights' : '🔥 Auto-Discovered Insights'}
        </h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {allInsights.length} found
        </span>
      </div>

      {/* Summary */}
      {insights?.summary && !compact && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
          <p className="text-slate-700 text-sm leading-relaxed">{insights.summary}</p>
        </div>
      )}

      {/* Insight Cards */}
      <div className="space-y-2">
        {allInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            expanded={expandedInsight === insight.id}
            onToggle={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ 
  insight, 
  expanded, 
  onToggle,
  compact 
}: { 
  insight: AutoInsight; 
  expanded: boolean; 
  onToggle: () => void;
  compact: boolean;
}) {
  const style = SEVERITY_STYLES[insight.severity];
  const Icon = TYPE_ICONS[insight.type] || Lightbulb;

  return (
    <motion.div 
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        style.border,
        style.bg
      )}
      layout
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <span className="text-lg flex-shrink-0">{style.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-slate-900 text-sm">
                {insight.title}
              </div>
              {!expanded && !compact && (
                <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                  {insight.description}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {!compact && (
          <motion.div 
            animate={{ rotate: expanded ? 90 : 0 }}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </motion.div>
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-slate-200/50">
              <p className="text-sm text-slate-700 mt-2 mb-3">
                {insight.description}
              </p>
              
              {insight.supporting_data && (
                <div className="p-2 bg-white/60 rounded-lg text-xs font-mono text-slate-600 mb-3">
                  {Object.entries(insight.supporting_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-slate-400">{key}:</span>
                      <span>{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                    </div>
                  )).slice(0, 4)}
                </div>
              )}
              
              <div className="flex gap-2">
                {insight.location && (
                  <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <MapPin className="w-3 h-3" />
                    Show on Map
                  </button>
                )}
                {insight.actionable && (
                  <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Eye className="w-3 h-3" />
                    View Details
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default InsightsPanel;
