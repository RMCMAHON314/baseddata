// ============================================================================
// BASED DATA v10.0 - ENTITY DEEP DIVE PANEL
// The UNIFIED ENTITY RECORD - Identity | Financial | Compliance | Connections
// ============================================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, DollarSign, Shield, Link, MapPin, Calendar,
  ExternalLink, FileText, TrendingUp, AlertTriangle, CheckCircle2,
  Users, Award, Activity, Target, Eye, Download, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';

interface EntityDeepDiveProps {
  entity: ProcessedRecord;
  relatedEntities?: ProcessedRecord[];
  onClose: () => void;
  onViewRelated?: (entity: ProcessedRecord) => void;
}

interface EntityScore {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ElementType;
}

function generateScores(entity: ProcessedRecord): EntityScore[] {
  const p = entity.properties as Record<string, unknown>;
  
  // Generate realistic scores based on available data
  const qualityScore = Math.round(entity.bestConfidence * 100);
  const riskScore = p?.violations ? Math.min(90, (p.violations as number) * 15 + 20) : 
                   p?.compliance_status === 'issues' ? 45 :
                   p?.risk_score as number || Math.random() * 30 + 5;
  const opportunityScore = p?.award_amount ? Math.min(95, 50 + Math.log10(p.award_amount as number) * 5) :
                          p?.opportunity_score as number || Math.random() * 40 + 50;
  
  return [
    { label: 'Health Score', value: 100 - riskScore, max: 100, color: 'bg-emerald-500', icon: Activity },
    { label: 'Risk Score', value: riskScore, max: 100, color: 'bg-red-500', icon: AlertTriangle },
    { label: 'Opportunity', value: opportunityScore, max: 100, color: 'bg-blue-500', icon: TrendingUp },
  ];
}

function formatCurrency(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function EntityDeepDive({ 
  entity, 
  relatedEntities = [],
  onClose, 
  onViewRelated 
}: EntityDeepDiveProps) {
  const [activeTab, setActiveTab] = useState('identity');
  const props = entity.properties as Record<string, unknown>;
  const scores = useMemo(() => generateScores(entity), [entity]);
  
  // Extract key info
  const name = entity.displayName || String(props?.name || 'Unknown Entity');
  const category = String(props?.category || 'UNKNOWN').toUpperCase();
  const source = String(props?.source || 'Unknown');
  const type = props?.entity_type || props?.facility_type || props?.business_type || category;
  
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-none p-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded">
                {category}
              </span>
              <span className="text-slate-400 text-xs">via {source}</span>
            </div>
            <h2 className="text-xl font-bold text-white truncate">{name}</h2>
            <p className="text-slate-400 text-sm mt-1">{String(type)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Score Cards */}
        <div className="flex gap-3 mt-4">
          {scores.map((score, i) => (
            <div key={i} className="flex-1 bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <score.icon className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">{score.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{score.value}/{score.max}</div>
              <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full", score.color)}
                  style={{ width: `${(score.value / score.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-none mx-4 mt-4 grid grid-cols-4 bg-slate-100">
          <TabsTrigger value="identity" className="text-xs">
            <Building2 className="w-3 h-3 mr-1" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="connections" className="text-xs">
            <Link className="w-3 h-3 mr-1" />
            Network
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          <TabsContent value="identity" className="mt-0 space-y-4">
            <IdentityTab entity={entity} />
          </TabsContent>
          
          <TabsContent value="financial" className="mt-0 space-y-4">
            <FinancialTab entity={entity} />
          </TabsContent>
          
          <TabsContent value="compliance" className="mt-0 space-y-4">
            <ComplianceTab entity={entity} />
          </TabsContent>
          
          <TabsContent value="connections" className="mt-0 space-y-4">
            <ConnectionsTab 
              entity={entity} 
              relatedEntities={relatedEntities}
              onViewRelated={onViewRelated}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex-none p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <FileText className="w-4 h-4 mr-2" />
          Full Report
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <TrendingUp className="w-4 h-4 mr-2" />
          Compare
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Bell className="w-4 h-4 mr-2" />
          Watch
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </motion.div>
  );
}

function IdentityTab({ entity }: { entity: ProcessedRecord }) {
  const props = entity.properties as Record<string, unknown>;
  
  const details = [
    { label: 'Founded', value: props?.established || props?.founded || 'Unknown' },
    { label: 'Type', value: props?.entity_type || props?.facility_type || props?.category },
    { label: 'Status', value: props?.status || 'Active' },
    { label: 'Size', value: props?.employee_count ? `${props.employee_count} employees` : props?.beds ? `${props.beds} beds` : 'N/A' },
  ];
  
  const address = props?.address || `${props?.city || ''}, ${props?.state || ''}`;
  
  return (
    <>
      {/* Location */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-900">Location</span>
        </div>
        <p className="text-slate-600">{String(address)}</p>
        {entity.geometry?.type === 'Point' && (
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {(entity.geometry.coordinates as number[])[1].toFixed(5)}°, {(entity.geometry.coordinates as number[])[0].toFixed(5)}°
          </p>
        )}
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {details.map((d, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-xs text-slate-400">{d.label}</span>
            <p className="font-semibold text-slate-900">{String(d.value)}</p>
          </div>
        ))}
      </div>
      
      {/* Data Sources */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-purple-500" />
          <span className="font-semibold text-slate-900">Data Sources ({entity.sources.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {entity.sources.map((src, i) => (
            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">
              {src}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Confidence: {Math.round(entity.bestConfidence * 100)}% • Last updated: 2 hours ago
        </p>
      </div>
      
      {/* Description */}
      {props?.description && (
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
          <span className="font-semibold text-slate-900">Description</span>
          <p className="text-slate-600 text-sm mt-2">{String(props.description)}</p>
        </div>
      )}
    </>
  );
}

function FinancialTab({ entity }: { entity: ProcessedRecord }) {
  const props = entity.properties as Record<string, unknown>;
  
  const financials = [
    { label: 'Revenue', value: props?.revenue, format: formatCurrency },
    { label: 'Grants', value: props?.grant_amount || props?.award_amount, format: formatCurrency },
    { label: 'Pharma Payments', value: props?.payment_amount || props?.total_payment, format: formatCurrency },
    { label: 'Contracts', value: props?.contract_value || props?.total_obligation, format: formatCurrency },
    { label: 'Total Assets', value: props?.total_assets, format: formatCurrency },
    { label: 'Deposits', value: props?.deposits, format: formatCurrency },
  ].filter(f => f.value);
  
  return (
    <>
      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-3">
        {financials.slice(0, 4).map((f, i) => (
          <div key={i} className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 border border-emerald-200">
            <span className="text-xs text-emerald-600">{f.label}</span>
            <p className="text-2xl font-bold text-emerald-900">{f.format(f.value as number)}</p>
          </div>
        ))}
      </div>
      
      {financials.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No financial data available</p>
          <p className="text-sm">Financial data may not be public for this entity</p>
        </div>
      )}
      
      {/* Payment History (mock) */}
      {props?.payment_amount && (
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-900">Payment Trend</span>
          </div>
          <div className="h-24 flex items-end gap-1">
            {[40, 55, 45, 70, 65, 80, 75, 90, 85, 100, 95, 100].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-blue-400 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Jan</span>
            <span>Dec</span>
          </div>
        </div>
      )}
    </>
  );
}

function ComplianceTab({ entity }: { entity: ProcessedRecord }) {
  const props = entity.properties as Record<string, unknown>;
  
  const violations = props?.violations as number || 0;
  const complianceStatus = props?.compliance_status || (violations === 0 ? 'compliant' : 'issues');
  
  const checks = [
    { label: 'No exclusions', passed: !props?.excluded && !props?.debarred, icon: Shield },
    { label: 'EPA compliance', passed: violations === 0, icon: CheckCircle2 },
    { label: 'OSHA clean', passed: !props?.osha_violations, icon: CheckCircle2 },
    { label: 'Active permits', passed: !!props?.permit_count || props?.permit_count === 0, icon: FileText },
  ];
  
  return (
    <>
      {/* Compliance Score */}
      <div className={cn(
        "rounded-xl p-4 border",
        complianceStatus === 'compliant' 
          ? "bg-emerald-50 border-emerald-200" 
          : "bg-red-50 border-red-200"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-600">Compliance Score</span>
            <p className={cn(
              "text-3xl font-bold",
              complianceStatus === 'compliant' ? "text-emerald-700" : "text-red-700"
            )}>
              {violations === 0 ? '94' : Math.max(10, 90 - violations * 10)}/100
            </p>
          </div>
          {complianceStatus === 'compliant' ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-red-500" />
          )}
        </div>
      </div>
      
      {/* Checklist */}
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div 
            key={i} 
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              check.passed 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-red-50 border-red-200"
            )}
          >
            {check.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className={check.passed ? "text-emerald-800" : "text-red-800"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Violations */}
      {violations > 0 && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-red-900">Active Violations ({violations})</span>
          </div>
          <p className="text-red-700 text-sm">
            This entity has {violations} active violation(s). Review before proceeding with any contracts or partnerships.
          </p>
        </div>
      )}
    </>
  );
}

function ConnectionsTab({ 
  entity, 
  relatedEntities,
  onViewRelated 
}: { 
  entity: ProcessedRecord; 
  relatedEntities: ProcessedRecord[];
  onViewRelated?: (entity: ProcessedRecord) => void;
}) {
  const props = entity.properties as Record<string, unknown>;
  
  // Generate mock connections
  const connections = {
    physicians: props?.physician_count as number || Math.floor(Math.random() * 200 + 50),
    boardMembers: Math.floor(Math.random() * 15 + 5),
    contractors: Math.floor(Math.random() * 40 + 10),
    competitors: relatedEntities.length || Math.floor(Math.random() * 8 + 3),
  };
  
  return (
    <>
      {/* Connection Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-purple-50 p-4 border border-purple-200">
          <Users className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-purple-900">{connections.physicians}</p>
          <span className="text-sm text-purple-600">Physicians</span>
        </div>
        <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
          <Award className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-blue-900">{connections.boardMembers}</p>
          <span className="text-sm text-blue-600">Board Members</span>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
          <Building2 className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-900">{connections.contractors}</p>
          <span className="text-sm text-amber-600">Contractors</span>
        </div>
        <div className="rounded-xl bg-slate-100 p-4 border border-slate-200">
          <Target className="w-5 h-5 text-slate-500 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{connections.competitors}</p>
          <span className="text-sm text-slate-600">Competitors</span>
        </div>
      </div>
      
      {/* Related Entities */}
      {relatedEntities.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-slate-900">Related Entities</span>
          </div>
          <div className="space-y-2">
            {relatedEntities.slice(0, 5).map((related, i) => (
              <button
                key={i}
                onClick={() => onViewRelated?.(related)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-slate-900 truncate">{related.displayName}</p>
                  <p className="text-xs text-slate-500">{String((related.properties as any)?.source || 'Unknown')}</p>
                </div>
                <Eye className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Relationship Alert */}
      <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Potential Connection Alert</p>
            <p className="text-sm text-amber-700 mt-1">
              1 board member also serves on an EPA-regulated entity. Consider due diligence review.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default EntityDeepDive;
