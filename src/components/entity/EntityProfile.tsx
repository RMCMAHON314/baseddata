// BASED DATA v10.0 - Entity Profile View
// Full entity dossier aligned with vision doc Section 9.3
// Shows comprehensive profile for organizations, contractors, providers

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Building2, Shield, DollarSign, Users, TrendingUp, 
  MapPin, CheckCircle2, XCircle, ExternalLink, AlertTriangle,
  FileText, Award, Clock, BarChart3, ChevronRight, Briefcase,
  Scale, Landmark, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';

interface EntityProfileProps {
  feature: GeoJSONFeature;
  relatedFeatures?: GeoJSONFeature[];
  onClose: () => void;
  onViewRelated?: (feature: GeoJSONFeature) => void;
}

// Extract entity type from properties
function getEntityType(properties: Record<string, unknown>): 'contractor' | 'provider' | 'facility' | 'organization' | 'generic' {
  const source = String(properties.source || '').toLowerCase();
  const category = String(properties.category || '').toLowerCase();
  
  if (source.includes('usaspending') || source.includes('sam') || source.includes('fpds')) return 'contractor';
  if (source.includes('npi') || source.includes('cms') || category.includes('health')) return 'provider';
  if (source.includes('epa') || source.includes('fdic') || source.includes('fda')) return 'facility';
  if (category.includes('government')) return 'organization';
  return 'generic';
}

export function EntityProfile({ feature, relatedFeatures = [], onClose, onViewRelated }: EntityProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'compliance' | 'related'>('overview');
  const props = feature.properties;
  const entityType = getEntityType(props);
  
  // Extract common fields
  const name = String(props.display_name || props.name || 'Unknown Entity');
  const address = String(props.address || props.location || '');
  const category = String(props.category || 'GENERAL');
  const source = String(props.source || '');
  const confidence = Number(props.confidence || props.relevance_score || 0.5);
  
  // Financial data (for contractors)
  const totalAwards = Number(props.total_award_amount || props.award_amount || 0);
  const contractCount = Number(props.contract_count || props.award_count || 0);
  
  // Healthcare data (for providers)
  const npi = String(props.npi || props.npi_number || '');
  const specialty = String(props.specialty || props.provider_type || '');
  const totalPayments = Number(props.total_payments || props.payment_amount || 0);
  
  // Compliance data
  const violations = Array.isArray(props.violations) ? props.violations : [];
  const violationCount = Number(props.violation_count || 0);
  const hasViolations = violations.length > 0 || violationCount > 0;
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-none p-6 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase">
                {category}
              </span>
              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
                {entityType}
              </span>
              {confidence > 0.8 && (
                <span className="px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {name}
            </h2>
            {address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {address}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {entityType === 'contractor' && (
            <>
              <QuickStat 
                icon={DollarSign} 
                label="Total Awards" 
                value={`$${(totalAwards / 1000000).toFixed(1)}M`}
              />
              <QuickStat 
                icon={FileText} 
                label="Contracts" 
                value={contractCount.toString()}
              />
              <QuickStat 
                icon={hasViolations ? AlertTriangle : CheckCircle2} 
                label="Compliance" 
                value={hasViolations ? 'Issues' : 'Clean'}
                status={hasViolations ? 'warning' : 'success'}
              />
            </>
          )}
          {entityType === 'provider' && (
            <>
              <QuickStat 
                icon={Heart} 
                label="NPI" 
                value={npi || 'N/A'}
              />
              <QuickStat 
                icon={Briefcase} 
                label="Specialty" 
                value={specialty || 'General'}
              />
              <QuickStat 
                icon={DollarSign} 
                label="CMS Payments" 
                value={totalPayments > 0 ? `$${(totalPayments / 1000).toFixed(0)}K` : 'N/A'}
              />
            </>
          )}
          {entityType === 'facility' && (
            <>
              <QuickStat 
                icon={Building2} 
                label="Type" 
                value={String(props.facility_type || 'Facility')}
              />
              <QuickStat 
                icon={Shield} 
                label="Status" 
                value={String(props.status || 'Active')}
              />
              <QuickStat 
                icon={hasViolations ? AlertTriangle : CheckCircle2} 
                label="Compliance" 
                value={hasViolations ? 'Review' : 'Clear'}
                status={hasViolations ? 'warning' : 'success'}
              />
            </>
          )}
          {entityType === 'generic' && (
            <>
              <QuickStat 
                icon={Building2} 
                label="Source" 
                value={source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown'}
              />
              <QuickStat 
                icon={BarChart3} 
                label="Confidence" 
                value={`${Math.round(confidence * 100)}%`}
              />
              <QuickStat 
                icon={Clock} 
                label="Updated" 
                value={props.updated_at ? new Date(String(props.updated_at)).toLocaleDateString() : 'Recent'}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex-none border-b border-border bg-card">
        <div className="flex">
          {(['overview', 'contracts', 'compliance', 'related'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab 
                  ? "text-primary border-primary" 
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'related' && relatedFeatures.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {relatedFeatures.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab feature={feature} entityType={entityType} />}
          {activeTab === 'contracts' && <ContractsTab feature={feature} />}
          {activeTab === 'compliance' && <ComplianceTab feature={feature} />}
          {activeTab === 'related' && (
            <RelatedTab 
              features={relatedFeatures} 
              onSelect={onViewRelated}
            />
          )}
        </div>
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="flex-none p-4 border-t border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Source: {source}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Source
            </Button>
            <Button size="sm" className="btn-omni">
              Add to Watchlist
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickStat({ 
  icon: Icon, 
  label, 
  value, 
  status 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  status?: 'success' | 'warning' | 'error';
}) {
  return (
    <div className={cn(
      "p-3 rounded-xl border",
      status === 'success' ? 'bg-success/5 border-success/20' :
      status === 'warning' ? 'bg-warning/5 border-warning/20' :
      status === 'error' ? 'bg-destructive/5 border-destructive/20' :
      'bg-secondary/50 border-border'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn(
          "w-4 h-4",
          status === 'success' ? 'text-success' :
          status === 'warning' ? 'text-warning' :
          status === 'error' ? 'text-destructive' :
          'text-muted-foreground'
        )} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        "font-semibold text-sm truncate",
        status === 'success' ? 'text-success' :
        status === 'warning' ? 'text-warning' :
        status === 'error' ? 'text-destructive' :
        'text-foreground'
      )}>{value}</p>
    </div>
  );
}

function OverviewTab({ feature, entityType }: { feature: GeoJSONFeature; entityType: string }) {
  const props = feature.properties;
  
  // Build detail rows based on available properties
  const details: { label: string; value: string; icon?: React.ElementType }[] = [];
  
  // Add all non-null properties
  Object.entries(props).forEach(([key, value]) => {
    if (
      value !== null && 
      value !== undefined && 
      !['geometry', 'id', 'confidence', 'relevance_score'].includes(key) &&
      typeof value !== 'object'
    ) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let formattedValue = String(value);
      
      // Format currency
      if (key.includes('amount') || key.includes('payment') || key.includes('award')) {
        const num = Number(value);
        if (!isNaN(num)) {
          formattedValue = num >= 1000000 
            ? `$${(num / 1000000).toFixed(2)}M` 
            : num >= 1000 
            ? `$${(num / 1000).toFixed(0)}K`
            : `$${num.toFixed(2)}`;
        }
      }
      
      details.push({ label: formattedKey, value: formattedValue });
    }
  });
  
  return (
    <div className="space-y-6">
      {/* Description if available */}
      {props.description && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {String(props.description)}
          </p>
        </section>
      )}
      
      {/* Detail Grid */}
      <section>
        <h3 className="font-semibold text-foreground mb-3">Details</h3>
        <div className="space-y-2">
          {details.slice(0, 15).map((detail, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{detail.label}</span>
              <span className="text-sm font-medium text-foreground max-w-[200px] truncate text-right">
                {detail.value}
              </span>
            </div>
          ))}
        </div>
      </section>
      
      {/* Location */}
      {feature.geometry && feature.geometry.type === 'Point' && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">Location</h3>
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-mono text-muted-foreground">
                {(feature.geometry.coordinates as number[])[1].toFixed(4)}, {(feature.geometry.coordinates as number[])[0].toFixed(4)}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ContractsTab({ feature }: { feature: GeoJSONFeature }) {
  const props = feature.properties;
  
  // Extract contract-related properties
  const contracts = Array.isArray(props.contracts) ? props.contracts : [];
  
  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No contract data available for this entity.</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Contract data comes from USASpending, SAM.gov, and FPDS sources.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {contracts.map((contract: Record<string, unknown>, i: number) => (
        <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-foreground">
              {String(contract.title || contract.description || `Contract ${i + 1}`)}
            </h4>
            <span className="text-sm font-semibold text-primary">
              ${Number(contract.amount || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {String(contract.agency || '')} • {String(contract.date || '')}
          </p>
        </div>
      ))}
    </div>
  );
}

function ComplianceTab({ feature }: { feature: GeoJSONFeature }) {
  const props = feature.properties;
  const violations = Array.isArray(props.violations) ? props.violations : [];
  const permits = Array.isArray(props.permits) ? props.permits : [];
  
  const hasIssues = violations.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={cn(
        "p-4 rounded-xl border",
        hasIssues 
          ? "bg-warning/5 border-warning/20" 
          : "bg-success/5 border-success/20"
      )}>
        <div className="flex items-center gap-3">
          {hasIssues ? (
            <AlertTriangle className="w-5 h-5 text-warning" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-success" />
          )}
          <div>
            <p className={cn("font-medium", hasIssues ? "text-warning" : "text-success")}>
              {hasIssues ? 'Compliance Issues Detected' : 'No Known Compliance Issues'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasIssues 
                ? `${violations.length} violation(s) on record` 
                : 'Clean compliance record from all sources'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Violations */}
      {violations.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-3">Violations</h3>
          <div className="space-y-3">
            {violations.map((v: Record<string, unknown>, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {String(v.type || v.description || 'Violation')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {String(v.date || v.reported_date || 'Unknown date')} • {String(v.source || 'Unknown source')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Permits */}
      {permits.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-3">Permits & Licenses</h3>
          <div className="space-y-2">
            {permits.map((p: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground">{String(p.type || p.name || 'Permit')}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                )}>
                  {String(p.status || 'Unknown')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RelatedTab({ 
  features, 
  onSelect 
}: { 
  features: GeoJSONFeature[]; 
  onSelect?: (feature: GeoJSONFeature) => void;
}) {
  if (features.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No related entities found.</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Related entities are automatically discovered through knowledge graph connections.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {features.length} related entities discovered
      </p>
      {features.map((f, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(f)}
          className="w-full p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors text-left group"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                {String(f.properties.display_name || f.properties.name || 'Unknown')}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {String(f.properties.category || '')} • {String(f.properties.source || '')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}

export default EntityProfile;
