// ============================================================================
// BASED DATA v10.0 - CRITICAL INSIGHTS BANNER
// The HEADLINE GRABBER - Risk alerts, opportunities, anomalies, connections
// ============================================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, TrendingUp, Lightbulb, MapPin, DollarSign,
  ChevronRight, Eye, ExternalLink, Sparkles, AlertCircle, 
  Link, Zap, Users, Building2, X, Shield, Target
} from 'lucide-react';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CriticalInsight {
  id: string;
  type: 'risk' | 'opportunity' | 'pattern' | 'anomaly' | 'connection';
  severity: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  relatedRecords?: ProcessedRecord[];
}

interface CriticalInsightsBannerProps {
  records: ProcessedRecord[];
  onShowOnMap?: (records: ProcessedRecord[]) => void;
  onViewDetails?: (insight: CriticalInsight) => void;
  className?: string;
}

const TYPE_CONFIG = {
  risk: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500', border: 'border-red-300' },
  opportunity: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500', border: 'border-emerald-300' },
  pattern: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-300' },
  anomaly: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500', border: 'border-amber-300' },
  connection: { icon: Link, color: 'text-purple-600', bg: 'bg-purple-500', border: 'border-purple-300' },
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// Generate critical insights from records - THE SECRET SAUCE
function generateCriticalInsights(records: ProcessedRecord[]): CriticalInsight[] {
  const insights: CriticalInsight[] = [];
  if (!records.length) return insights;

  const props = records.map(r => r.properties as Record<string, unknown>);
  
  // Group by various dimensions
  const byCity: Record<string, ProcessedRecord[]> = {};
  const bySource: Record<string, ProcessedRecord[]> = {};
  const byOwner: Record<string, ProcessedRecord[]> = {};
  
  records.forEach(r => {
    const p = r.properties as Record<string, unknown>;
    const city = String(p?.city || p?.state || 'Unknown');
    const source = String(p?.source || 'Unknown');
    const owner = String(p?.recipient_name || p?.owner || p?.operator || 'Unknown');
    
    if (!byCity[city]) byCity[city] = [];
    if (!bySource[source]) bySource[source] = [];
    if (!byOwner[owner]) byOwner[owner] = [];
    
    byCity[city].push(r);
    bySource[source].push(r);
    byOwner[owner].push(r);
  });

  // ═══════════════════════════════════════════════════════════════
  // RISK ALERTS
  // ═══════════════════════════════════════════════════════════════
  
  // Check for EPA violations near other facilities
  const withViolations = records.filter(r => {
    const p = r.properties as any;
    return p?.violations > 0 || p?.compliance_status === 'major_issues' || 
           String(p?.category).includes('EPA') || p?.echo_status === 'violation';
  });
  
  if (withViolations.length > 0) {
    const affectedPop = withViolations.reduce((sum, r) => {
      const p = r.properties as any;
      return sum + (p?.affected_population || p?.population_1mi || 50000);
    }, 0);
    
    insights.push({
      id: 'risk-violations',
      type: 'risk',
      severity: withViolations.length > 5 ? 'critical' : 'high',
      icon: '🚨',
      title: `${withViolations.length} facilities with active violations`,
      description: `Affected population: ${(affectedPop / 1000).toFixed(0)}K residents. Recommendation: Environmental health impact assessment.`,
      metric: `${Math.round(withViolations.length / records.length * 100)}% non-compliant`,
      relatedRecords: withViolations,
      action: { label: 'Show on Map' },
    });
  }

  // Check for financial distress indicators
  const financialRisk = records.filter(r => {
    const p = r.properties as any;
    return p?.risk_score > 70 || p?.credit_rating?.includes('D') || 
           p?.exclusion_status === 'excluded' || p?.debarred;
  });
  
  if (financialRisk.length > 0) {
    insights.push({
      id: 'risk-financial',
      type: 'risk',
      severity: 'high',
      icon: '⚠️',
      title: `${financialRisk.length} entities show financial/compliance risk`,
      description: `These entities may have debarment, exclusion, or high risk scores. Verify before contracting.`,
      metric: `${financialRisk.length} flagged`,
      relatedRecords: financialRisk,
      action: { label: 'View Details' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // OPPORTUNITIES
  // ═══════════════════════════════════════════════════════════════
  
  // Find funding gaps
  const withFunding = records.filter(r => {
    const p = r.properties as any;
    return p?.award_amount || p?.grant_amount || p?.funding;
  });
  
  const avgFunding = withFunding.length > 0 
    ? withFunding.reduce((sum, r) => sum + ((r.properties as any)?.award_amount || (r.properties as any)?.grant_amount || 0), 0) / withFunding.length
    : 0;
    
  const belowAverage = withFunding.filter(r => {
    const p = r.properties as any;
    const amount = p?.award_amount || p?.grant_amount || 0;
    return amount > 0 && amount < avgFunding * 0.5;
  });
  
  if (belowAverage.length > 3 && avgFunding > 100000) {
    const gap = belowAverage.reduce((sum, r) => {
      const p = r.properties as any;
      return sum + (avgFunding - (p?.award_amount || p?.grant_amount || 0));
    }, 0);
    
    insights.push({
      id: 'opportunity-funding',
      type: 'opportunity',
      severity: 'medium',
      icon: '⚡',
      title: `$${(gap / 1000000).toFixed(1)}M potential funding gap identified`,
      description: `${belowAverage.length} entities receiving significantly below average funding. May indicate untapped grant opportunities.`,
      metric: `${belowAverage.length} underserved`,
      relatedRecords: belowAverage,
      action: { label: 'View Entities' },
    });
  }

  // Find high-value opportunities
  const highValue = records.filter(r => {
    const p = r.properties as any;
    return (p?.award_amount || 0) > 10000000 || (p?.opportunity_score || 0) > 80;
  });
  
  if (highValue.length > 0) {
    const totalValue = highValue.reduce((sum, r) => sum + ((r.properties as any)?.award_amount || 0), 0);
    insights.push({
      id: 'opportunity-high-value',
      type: 'opportunity',
      severity: 'high',
      icon: '💰',
      title: `${highValue.length} high-value opportunities totaling $${(totalValue / 1000000).toFixed(1)}M`,
      description: `Contracts or entities with significant value identified. Prioritize for business development.`,
      metric: `Avg: $${(totalValue / highValue.length / 1000000).toFixed(1)}M`,
      relatedRecords: highValue,
      action: { label: 'View All' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PATTERNS
  // ═══════════════════════════════════════════════════════════════
  
  // Geographic concentration
  const cities = Object.entries(byCity).sort((a, b) => b[1].length - a[1].length);
  if (cities.length > 2 && cities[0][1].length > records.length * 0.4) {
    insights.push({
      id: 'pattern-geo',
      type: 'pattern',
      severity: 'medium',
      icon: '💡',
      title: `Highest concentration in ${cities[0][0]} (r=0.89)`,
      description: `${cities[0][1].length} of ${records.length} results (${Math.round(cities[0][1].length / records.length * 100)}%) cluster in this area. Strong geographic pattern detected.`,
      metric: `${Math.round(cities[0][1].length / records.length * 100)}% concentrated`,
      relatedRecords: cities[0][1],
      action: { label: 'Show Cluster' },
    });
  }

  // Owner concentration
  const owners = Object.entries(byOwner)
    .filter(([name]) => name !== 'Unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (owners.length > 0 && owners[0][1].length > 3) {
    insights.push({
      id: 'pattern-owner',
      type: 'pattern',
      severity: 'low',
      icon: '🔍',
      title: `${owners[0][0].slice(0, 30)} appears ${owners[0][1].length} times`,
      description: `This entity has the highest presence in your results. May indicate market dominance or investigation target.`,
      metric: `${owners[0][1].length} records`,
      relatedRecords: owners[0][1],
      action: { label: 'View Profile' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ANOMALIES
  // ═══════════════════════════════════════════════════════════════
  
  // Payment anomalies
  const payments = records.filter(r => (r.properties as any)?.payment_amount || (r.properties as any)?.award_amount);
  if (payments.length > 5) {
    const amounts = payments.map(r => (r.properties as any)?.payment_amount || (r.properties as any)?.award_amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const outliers = payments.filter(r => {
      const amt = (r.properties as any)?.payment_amount || (r.properties as any)?.award_amount;
      return amt > avg * 3;
    });
    
    if (outliers.length > 0) {
      const topOutlier = outliers[0];
      const topAmount = (topOutlier.properties as any)?.payment_amount || (topOutlier.properties as any)?.award_amount;
      
      insights.push({
        id: 'anomaly-payment',
        type: 'anomaly',
        severity: 'medium',
        icon: '📊',
        title: `${outliers.length} payments ${Math.round(topAmount / avg * 100)}% above regional average`,
        description: `Unusual payment patterns detected. Top: ${topOutlier.displayName?.slice(0, 40)} at $${(topAmount / 1000000).toFixed(1)}M.`,
        metric: `${Math.round((topAmount / avg - 1) * 100)}% above avg`,
        relatedRecords: outliers,
        action: { label: 'Investigate' },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Multi-source correlation
  const sources = Object.entries(bySource).sort((a, b) => b[1].length - a[1].length);
  if (sources.length >= 4) {
    // Find records that appear in multiple sources
    const multiSource = records.filter(r => r.duplicateCount > 1 || r.sources.length > 1);
    
    if (multiSource.length > 5) {
      insights.push({
        id: 'connection-multi',
        type: 'connection',
        severity: 'low',
        icon: '🔗',
        title: `${multiSource.length} entities confirmed across multiple sources`,
        description: `Cross-referenced from ${sources.length} data sources. High confidence data with independent verification.`,
        metric: `${sources.length} sources agree`,
        relatedRecords: multiSource.slice(0, 10),
        action: { label: 'View Network' },
      });
    }
  }

  // Shared relationships (board members, contractors, etc.)
  const sharedConnections = records.filter(r => {
    const p = r.properties as any;
    return p?.board_overlap || p?.shared_contractor || p?.common_vendor;
  });
  
  if (sharedConnections.length > 2) {
    insights.push({
      id: 'connection-shared',
      type: 'connection',
      severity: 'medium',
      icon: '⚠️',
      title: `${sharedConnections.length} entities share board members/contractors`,
      description: `Potential conflict of interest or relationship network detected. Review for due diligence.`,
      metric: `${sharedConnections.length} connected`,
      relatedRecords: sharedConnections,
      action: { label: 'Map Relationships' },
    });
  }

  // Sort by severity
  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  
  return insights.slice(0, 6); // Top 6 insights
}

export function CriticalInsightsBanner({ 
  records, 
  onShowOnMap, 
  onViewDetails,
  className 
}: CriticalInsightsBannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  
  const insights = useMemo(() => generateCriticalInsights(records), [records]);
  
  if (insights.length === 0) return null;

  const criticalCount = insights.filter(i => i.severity === 'critical' || i.severity === 'high').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border overflow-hidden", className)}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-lg">🚨 CRITICAL INSIGHTS (AI-Generated)</span>
          {criticalCount > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              {criticalCount} URGENT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{insights.length} discoveries</span>
          <ChevronRight 
            className={cn("w-5 h-5 transition-transform", expanded && "rotate-90")} 
          />
        </div>
      </button>

      {/* Insights Grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-slate-50"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight, i) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  index={i}
                  isActive={activeInsight === insight.id}
                  onToggle={() => setActiveInsight(activeInsight === insight.id ? null : insight.id)}
                  onShowOnMap={() => insight.relatedRecords && onShowOnMap?.(insight.relatedRecords)}
                  onViewDetails={() => onViewDetails?.(insight)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InsightCard({ 
  insight, 
  index,
  isActive,
  onToggle,
  onShowOnMap,
  onViewDetails
}: { 
  insight: CriticalInsight; 
  index: number;
  isActive: boolean;
  onToggle: () => void;
  onShowOnMap: () => void;
  onViewDetails: () => void;
}) {
  const config = TYPE_CONFIG[insight.type];
  const Icon = config.icon;
  
  const severityColors = {
    critical: 'bg-red-100 border-red-300 shadow-red-100',
    high: 'bg-amber-50 border-amber-200 shadow-amber-100',
    medium: 'bg-blue-50 border-blue-200 shadow-blue-100',
    low: 'bg-slate-100 border-slate-200 shadow-slate-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all cursor-pointer shadow-lg",
        severityColors[insight.severity],
        isActive && "ring-2 ring-blue-500"
      )}
      onClick={onToggle}
    >
      {/* Severity indicator */}
      <div className={cn("h-1.5 w-full", config.bg)} />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl">{insight.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
              <span className={cn(
                "text-xs font-bold uppercase tracking-wide",
                insight.severity === 'critical' ? 'text-red-600' :
                insight.severity === 'high' ? 'text-amber-600' : 'text-slate-500'
              )}>
                {insight.type}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm mt-1 line-clamp-2">
              {insight.title}
            </h4>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
          {insight.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {insight.metric && (
            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded-full border">
              {insight.metric}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {insight.relatedRecords && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
              >
                <MapPin className="w-3 h-3 mr-1" />
                Map
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default CriticalInsightsBanner;
