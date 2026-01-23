// BASED DATA v10.0 - 10x Enriched Intelligence Dossier
// Full dossier view for a single record with all enrichment layers

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Building2, Shield, DollarSign, Users, TrendingUp, 
  AlertTriangle, Lightbulb, MapPin, CheckCircle2, XCircle,
  Leaf, Target, Activity, ChevronRight, ExternalLink,
  BarChart3, Sparkles, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EnrichedRecord } from '@/types/enriched';

interface RecordDossierProps {
  record: EnrichedRecord;
  onClose: () => void;
}

export function RecordDossier({ record, onClose }: RecordDossierProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'insights'>('overview');
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-none p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase">
                {record.category}
              </span>
              {record.ownership.owner_type === 'government' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {record.display_name || record.name}
            </h2>
            {record.address && (
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {record.address}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Score Pills */}
        <div className="flex flex-wrap gap-2">
          <ScorePill label="Quality" value={record.scores.overall_quality} color="emerald" />
          <ScorePill label="Risk" value={record.scores.risk_score} color="red" inverted />
          <ScorePill label="Opportunity" value={record.scores.opportunity_score} color="blue" />
          <ScorePill label="Confidence" value={Math.round(record.scores.confidence * 100)} color="slate" />
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex-none border-b border-slate-200">
        <div className="flex">
          {(['overview', 'details', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab 
                  ? "text-primary border-primary" 
                  : "text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab record={record} />}
          {activeTab === 'details' && <DetailsTab record={record} />}
          {activeTab === 'insights' && <InsightsTab record={record} />}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="flex-none p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Enriched {record.enrichment_timestamp ? new Date(record.enrichment_timestamp).toLocaleDateString() : 'recently'}
          </span>
          <span>{record.enrichment_sources?.length || 0} sources</span>
        </div>
      </div>
    </motion.div>
  );
}

function ScorePill({ label, value, color, inverted = false }: { 
  label: string; 
  value: number; 
  color: 'emerald' | 'red' | 'blue' | 'amber' | 'slate';
  inverted?: boolean;
}) {
  const isGood = inverted ? value < 30 : value > 70;
  const isBad = inverted ? value > 70 : value < 30;
  
  const colorClasses = {
    emerald: isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
    red: isBad ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600',
    blue: isGood ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  
  return (
    <div className={cn("px-3 py-1.5 rounded-full text-xs font-medium", colorClasses[color])}>
      {label}: <span className="font-bold">{value}</span>/100
    </div>
  );
}

function OverviewTab({ record }: { record: EnrichedRecord }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-slate-900">Executive Summary</h3>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
          <p className="text-slate-700 text-sm leading-relaxed">
            {record.narrative.executive_summary}
          </p>
        </div>
      </section>
      
      {/* Quick Stats Grid */}
      <section>
        <h3 className="font-semibold text-slate-900 mb-3">At a Glance</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickStatCard 
            icon={Building2} 
            label="Ownership"
            value={record.ownership.owner_type}
            subvalue={record.ownership.owner_name || 'Unknown'}
          />
          <QuickStatCard 
            icon={Shield} 
            label="Compliance"
            value={record.regulatory.compliance_status}
            subvalue={`${record.regulatory.violations.length} violations`}
            status={record.regulatory.compliance_status === 'compliant' ? 'success' : 'warning'}
          />
          <QuickStatCard 
            icon={DollarSign} 
            label="Public Investment"
            value={`$${(record.financial.total_public_investment / 1000).toFixed(0)}K`}
            subvalue={`${record.financial.grants.length} grants`}
          />
          <QuickStatCard 
            icon={Users} 
            label="Population (1mi)"
            value={record.context.demographics.population_1mi.toLocaleString()}
            subvalue={`$${(record.context.demographics.median_income_1mi / 1000).toFixed(0)}K income`}
          />
        </div>
      </section>
      
      {/* Predictions */}
      <section>
        <h3 className="font-semibold text-slate-900 mb-3">Predictions & Signals</h3>
        <div className="space-y-2">
          <PredictionRow 
            label="Growth Trajectory" 
            value={record.predictions.growth_trajectory}
            icon={TrendingUp}
          />
          <PredictionRow 
            label="Risk Trajectory" 
            value={record.predictions.risk_trajectory}
            icon={AlertTriangle}
          />
          <PredictionRow 
            label="Demand Forecast" 
            value={record.predictions.demand_forecast}
            icon={BarChart3}
          />
        </div>
        
        {/* Anomalies */}
        {record.predictions.anomalies.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Anomalies Detected</h4>
            {record.predictions.anomalies.map((anomaly, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg",
                  anomaly.severity === 'opportunity' ? 'bg-emerald-50 text-emerald-700' :
                  anomaly.severity === 'warning' ? 'bg-amber-50 text-amber-700' :
                  'bg-blue-50 text-blue-700'
                )}
              >
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{anomaly.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Market Position */}
      <section>
        <h3 className="font-semibold text-slate-900 mb-3">Market Position</h3>
        <div className="p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Market Saturation</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              record.context.competition.market_saturation === 'underserved' 
                ? 'bg-emerald-100 text-emerald-700' 
                : record.context.competition.market_saturation === 'saturated'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
            )}>
              {record.context.competition.market_saturation}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Similar Facilities (5mi)</span>
            <span className="font-semibold text-slate-900">{record.context.competition.similar_facilities_5mi}</span>
          </div>
          {record.context.competition.nearest_competitor && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Nearest Competitor</span>
              <span className="text-sm text-slate-900">
                {record.context.competition.nearest_competitor.name} ({record.context.competition.nearest_competitor.distance_mi.toFixed(1)}mi)
              </span>
            </div>
          )}
        </div>
        
        {/* Competitive Advantages */}
        {record.context.competition.competitive_advantages.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {record.context.competition.competitive_advantages.map((adv, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {adv}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailsTab({ record }: { record: EnrichedRecord }) {
  return (
    <div className="space-y-6">
      {/* Ownership */}
      <DetailSection title="Ownership & Registration" icon={Building2}>
        <DetailRow label="Owner" value={record.ownership.owner_name || 'Unknown'} />
        <DetailRow label="Type" value={record.ownership.owner_type} />
        {record.ownership.parent_organization && (
          <DetailRow label="Parent Org" value={record.ownership.parent_organization} />
        )}
        {record.ownership.is_government_contractor && (
          <DetailRow label="SAM UEI" value={record.ownership.sam_uei || 'N/A'} />
        )}
        {record.ownership.ein && (
          <DetailRow label="EIN" value={record.ownership.ein} />
        )}
      </DetailSection>
      
      {/* Regulatory */}
      <DetailSection title="Regulatory & Compliance" icon={Shield}>
        <DetailRow 
          label="Status" 
          value={record.regulatory.compliance_status}
          status={record.regulatory.compliance_status === 'compliant' ? 'success' : 
                  record.regulatory.compliance_status === 'major_issues' ? 'error' : 'warning'}
        />
        <DetailRow label="Active Permits" value={`${record.regulatory.permits.length}`} />
        <DetailRow label="Inspections" value={`${record.regulatory.inspections.length}`} />
        <DetailRow 
          label="Violations" 
          value={`${record.regulatory.violations.length} (${record.regulatory.violations.filter(v => !v.resolved).length} unresolved)`}
          status={record.regulatory.violations.filter(v => !v.resolved).length > 0 ? 'warning' : undefined}
        />
        {record.regulatory.last_inspection_date && (
          <DetailRow label="Last Inspection" value={new Date(record.regulatory.last_inspection_date).toLocaleDateString()} />
        )}
      </DetailSection>
      
      {/* Financial */}
      <DetailSection title="Financial Intelligence" icon={DollarSign}>
        <DetailRow label="Total Public Investment" value={`$${record.financial.total_public_investment.toLocaleString()}`} />
        <DetailRow label="Grants Received" value={`${record.financial.grants.length}`} />
        <DetailRow label="Active Contracts" value={`${record.financial.contracts.length}`} />
        {record.financial.nonprofit_financials && (
          <>
            <DetailRow label="Annual Revenue" value={`$${record.financial.nonprofit_financials.total_revenue.toLocaleString()}`} />
            <DetailRow label="Net Assets" value={`$${record.financial.nonprofit_financials.net_assets.toLocaleString()}`} />
          </>
        )}
      </DetailSection>
      
      {/* Demographics */}
      <DetailSection title="Demographics (1mi radius)" icon={Users}>
        <DetailRow label="Population" value={record.context.demographics.population_1mi.toLocaleString()} />
        <DetailRow label="Median Income" value={`$${record.context.demographics.median_income_1mi.toLocaleString()}`} />
        <DetailRow label="Median Age" value={`${record.context.demographics.median_age}`} />
        <DetailRow 
          label="5-Year Population Change" 
          value={`${record.context.demographics.population_change_5yr > 0 ? '+' : ''}${record.context.demographics.population_change_5yr}%`}
          status={record.context.demographics.population_change_5yr > 5 ? 'success' : 
                  record.context.demographics.population_change_5yr < -5 ? 'error' : undefined}
        />
        {record.context.demographics.age_distribution && (
          <>
            <div className="pt-2 mt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-400 uppercase">Age Distribution</span>
            </div>
            <DetailRow label="Under 18" value={`${Math.round(record.context.demographics.age_distribution.under_18 * 100)}%`} />
            <DetailRow label="18-34" value={`${Math.round(record.context.demographics.age_distribution.age_18_34 * 100)}%`} />
            <DetailRow label="35-54" value={`${Math.round(record.context.demographics.age_distribution.age_35_54 * 100)}%`} />
            <DetailRow label="55+" value={`${Math.round(record.context.demographics.age_distribution.age_55_plus * 100)}%`} />
          </>
        )}
      </DetailSection>
      
      {/* Environment */}
      <DetailSection title="Environmental Risk" icon={Leaf}>
        <DetailRow 
          label="Risk Level" 
          value={record.context.environment.environmental_risk_level}
          status={record.context.environment.environmental_risk_level === 'low' ? 'success' : 
                  record.context.environment.environmental_risk_level === 'high' ? 'error' : 'warning'}
        />
        <DetailRow label="Flood Zone" value={record.context.environment.flood_zone} />
        <DetailRow label="Wildfire Risk" value={record.context.environment.wildfire_risk} />
        <DetailRow label="Air Quality Index" value={`${record.context.environment.air_quality_index}`} />
        <DetailRow label="Superfund Sites (5mi)" value={`${record.context.environment.superfund_sites_5mi}`} />
      </DetailSection>
    </div>
  );
}

function InsightsTab({ record }: { record: EnrichedRecord }) {
  return (
    <div className="space-y-6">
      {/* Key Findings */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-900">Key Findings</h3>
        </div>
        <div className="space-y-2">
          {record.narrative.key_findings.map((finding, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700">{finding}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-slate-900">Recommendations</h3>
        </div>
        <div className="space-y-2">
          {record.narrative.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">{rec}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Comparable Context */}
      {record.narrative.comparable_context && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-slate-900">Comparative Analysis</h3>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
            <p className="text-sm text-purple-800 leading-relaxed">
              {record.narrative.comparable_context}
            </p>
          </div>
        </section>
      )}
      
      {/* Data Sources */}
      <section>
        <h3 className="font-semibold text-slate-900 mb-3">Enrichment Sources</h3>
        <div className="flex flex-wrap gap-2">
          {(record.enrichment_sources || ['Census ACS', 'EPA ECHO', 'USASpending', 'OpenStreetMap']).map((source, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              {source}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// Helper Components
function QuickStatCard({ icon: Icon, label, value, subvalue, status }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subvalue?: string;
  status?: 'success' | 'warning' | 'error';
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn(
        "font-semibold capitalize",
        status === 'success' ? 'text-emerald-600' :
        status === 'warning' ? 'text-amber-600' :
        status === 'error' ? 'text-red-600' :
        'text-slate-900'
      )}>
        {value}
      </div>
      {subvalue && (
        <div className="text-xs text-slate-500 mt-0.5 truncate">{subvalue}</div>
      )}
    </div>
  );
}

function PredictionRow({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  const valueColors: Record<string, string> = {
    'declining': 'text-red-600 bg-red-50',
    'stable': 'text-slate-600 bg-slate-50',
    'growing': 'text-emerald-600 bg-emerald-50',
    'rapid_growth': 'text-emerald-600 bg-emerald-50',
    'improving': 'text-emerald-600 bg-emerald-50',
    'worsening': 'text-red-600 bg-red-50',
    'increasing': 'text-blue-600 bg-blue-50',
    'decreasing': 'text-amber-600 bg-amber-50',
  };
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
        valueColors[value] || 'text-slate-600 bg-slate-50'
      )}>
        {value.replace('_', ' ')}
      </span>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <section className="p-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}

function DetailRow({ label, value, status }: { 
  label: string; 
  value: string; 
  status?: 'success' | 'warning' | 'error';
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn(
        "text-sm font-medium capitalize",
        status === 'success' ? 'text-emerald-600' :
        status === 'warning' ? 'text-amber-600' :
        status === 'error' ? 'text-red-600' :
        'text-slate-900'
      )}>
        {value.replace('_', ' ')}
      </span>
    </div>
  );
}
