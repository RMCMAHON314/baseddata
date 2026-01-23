// ============================================================================
// BASED DATA v10.0 - Smart Stats Dashboard
// Category-specific statistics that adapt to query type
// ============================================================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, DollarSign, Users, MapPin, TrendingUp, 
  HeartPulse, Shield, FileText, Zap, Award, Clock, Database,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';

interface SmartStatsBarProps {
  records: ProcessedRecord[];
  queryTimeMs?: number;
  sourcesCount: number;
  className?: string;
}

interface SmartStat {
  id: string;
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
  color?: string;
  trend?: 'up' | 'down' | null;
}

type DetectedCategory = 'healthcare' | 'contracts' | 'financial' | 'environmental' | 'government' | 'general';

function detectPrimaryCategory(records: ProcessedRecord[]): DetectedCategory {
  if (!records.length) return 'general';
  
  const categoryCount: Record<string, number> = {};
  const keywordHits: Record<DetectedCategory, number> = {
    healthcare: 0, contracts: 0, financial: 0, environmental: 0, government: 0, general: 0
  };
  
  records.forEach(r => {
    const props = r.properties as Record<string, unknown>;
    const cat = String(props?.category || '').toUpperCase();
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    
    // Check for healthcare indicators
    if (cat.includes('HEALTH') || props?.hospital || props?.physician || props?.npi || props?.cms) {
      keywordHits.healthcare++;
    }
    // Contract indicators
    if (cat.includes('CONTRACT') || cat.includes('SPENDING') || props?.award_amount || props?.awarding_agency || props?.recipient) {
      keywordHits.contracts++;
    }
    // Financial indicators
    if (cat.includes('FINANC') || cat.includes('BANK') || props?.fdic || props?.total_assets || props?.deposits) {
      keywordHits.financial++;
    }
    // Environmental indicators
    if (cat.includes('ENVIRON') || cat.includes('EPA') || props?.violations || props?.permits || props?.echo) {
      keywordHits.environmental++;
    }
    // Government indicators
    if (cat.includes('GOVERN') || props?.agency || props?.department) {
      keywordHits.government++;
    }
  });
  
  // Find the highest hit category
  const sorted = Object.entries(keywordHits).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > records.length * 0.3) {
    return sorted[0][0] as DetectedCategory;
  }
  
  return 'general';
}

function calculateStats(records: ProcessedRecord[], category: DetectedCategory): SmartStat[] {
  const stats: SmartStat[] = [];
  const props = records.map(r => r.properties as Record<string, unknown>);
  
  // Always show total
  stats.push({
    id: 'total',
    label: 'Total Results',
    value: records.length.toLocaleString(),
    icon: Database,
    color: 'text-blue-600',
  });
  
  switch (category) {
    case 'healthcare': {
      // Hospitals
      const hospitals = records.filter(r => {
        const p = r.properties as Record<string, unknown>;
        return String(p?.category || '').includes('HEALTH') && 
               (String(p?.name || '').toLowerCase().includes('hospital') || p?.healthcare_type === 'hospital');
      });
      stats.push({
        id: 'hospitals',
        label: 'Hospitals',
        value: hospitals.length,
        icon: HeartPulse,
        subtext: `${records.filter(r => (r.properties as any)?.emergency_services).length} with ER`,
        color: 'text-red-600',
      });
      
      // Physicians/Payments
      const payments = props.filter(p => p?.payment_amount || p?.total_payment);
      const totalPayments = payments.reduce((sum, p) => sum + ((p?.payment_amount || p?.total_payment || 0) as number), 0);
      if (totalPayments > 0) {
        stats.push({
          id: 'payments',
          label: 'Pharma Payments',
          value: `$${(totalPayments / 1000000).toFixed(1)}M`,
          icon: DollarSign,
          subtext: `${payments.length} physicians`,
          color: 'text-green-600',
        });
      }
      
      // Top specialty
      const specialties: Record<string, number> = {};
      props.forEach(p => {
        if (p?.specialty) specialties[String(p.specialty)] = (specialties[String(p.specialty)] || 0) + 1;
      });
      const topSpecialty = Object.entries(specialties).sort((a, b) => b[1] - a[1])[0];
      if (topSpecialty) {
        stats.push({
          id: 'specialty',
          label: 'Top Specialty',
          value: topSpecialty[1],
          icon: Award,
          subtext: topSpecialty[0].slice(0, 20),
          color: 'text-purple-600',
        });
      }
      break;
    }
    
    case 'contracts': {
      // Total Value
      const totalValue = props.reduce((sum, p) => sum + ((p?.award_amount || p?.total_obligation || 0) as number), 0);
      stats.push({
        id: 'value',
        label: 'Total Value',
        value: totalValue > 1000000000 ? `$${(totalValue / 1000000000).toFixed(1)}B` : `$${(totalValue / 1000000).toFixed(1)}M`,
        icon: DollarSign,
        color: 'text-green-600',
      });
      
      // Agencies
      const agencies = new Set(props.map(p => p?.awarding_agency || p?.agency).filter(Boolean));
      stats.push({
        id: 'agencies',
        label: 'Agencies',
        value: agencies.size,
        icon: Building2,
        color: 'text-indigo-600',
      });
      
      // Average Award
      const avgValue = records.length > 0 ? totalValue / records.length : 0;
      stats.push({
        id: 'avg',
        label: 'Avg Award',
        value: avgValue > 1000000 ? `$${(avgValue / 1000000).toFixed(1)}M` : `$${(avgValue / 1000).toFixed(0)}K`,
        icon: TrendingUp,
        subtext: 'per contract',
        color: 'text-amber-600',
      });
      
      // Set-asides
      const setAsides = records.filter(r => {
        const p = r.properties as any;
        return p?.set_aside || p?.business_type?.includes('8(a)') || p?.small_business;
      });
      if (setAsides.length > 0) {
        stats.push({
          id: 'setaside',
          label: 'Small Business',
          value: setAsides.length,
          icon: Shield,
          subtext: `${Math.round(setAsides.length / records.length * 100)}% set-aside`,
          color: 'text-emerald-600',
        });
      }
      break;
    }
    
    case 'financial': {
      // Banks
      stats.push({
        id: 'banks',
        label: 'Institutions',
        value: records.length,
        icon: Building2,
        color: 'text-blue-600',
      });
      
      // Total Assets
      const totalAssets = props.reduce((sum, p) => sum + ((p?.total_assets || 0) as number), 0);
      if (totalAssets > 0) {
        stats.push({
          id: 'assets',
          label: 'Total Assets',
          value: `$${(totalAssets / 1000000000).toFixed(1)}B`,
          icon: DollarSign,
          color: 'text-green-600',
        });
      }
      
      // Total Deposits
      const totalDeposits = props.reduce((sum, p) => sum + ((p?.deposits || p?.total_deposits || 0) as number), 0);
      if (totalDeposits > 0) {
        stats.push({
          id: 'deposits',
          label: 'Total Deposits',
          value: `$${(totalDeposits / 1000000000).toFixed(1)}B`,
          icon: Shield,
          color: 'text-emerald-600',
        });
      }
      break;
    }
    
    case 'environmental': {
      // Violations
      const withViolations = records.filter(r => (r.properties as any)?.violations > 0);
      stats.push({
        id: 'violations',
        label: 'With Violations',
        value: withViolations.length,
        icon: AlertCircle,
        subtext: `of ${records.length} sites`,
        color: 'text-red-600',
      });
      
      // Permits
      const permits = props.reduce((sum, p) => sum + ((p?.permit_count || 0) as number), 0);
      stats.push({
        id: 'permits',
        label: 'Active Permits',
        value: permits,
        icon: FileText,
        color: 'text-blue-600',
      });
      
      // Compliance rate
      const compliant = records.filter(r => (r.properties as any)?.compliance_status === 'compliant');
      const complianceRate = records.length > 0 ? Math.round(compliant.length / records.length * 100) : 0;
      stats.push({
        id: 'compliance',
        label: 'Compliance Rate',
        value: `${complianceRate}%`,
        icon: CheckCircle2,
        trend: complianceRate > 80 ? 'up' : complianceRate < 50 ? 'down' : null,
        color: complianceRate > 80 ? 'text-emerald-600' : complianceRate < 50 ? 'text-red-600' : 'text-amber-600',
      });
      break;
    }
    
    default: {
      // General stats for any category
      
      // Geographic coverage
      const cities = new Set(props.map(p => p?.city || p?.state).filter(Boolean));
      stats.push({
        id: 'locations',
        label: 'Locations',
        value: cities.size,
        icon: MapPin,
        color: 'text-blue-600',
      });
      
      // Sources
      const sources = new Set(props.map(p => p?.source).filter(Boolean));
      stats.push({
        id: 'sources',
        label: 'Data Sources',
        value: sources.size,
        icon: Database,
        color: 'text-purple-600',
      });
      
      // Avg confidence
      const avgConfidence = records.length > 0 
        ? records.reduce((sum, r) => sum + r.bestConfidence, 0) / records.length 
        : 0;
      stats.push({
        id: 'confidence',
        label: 'Avg Confidence',
        value: `${Math.round(avgConfidence * 100)}%`,
        icon: CheckCircle2,
        trend: avgConfidence > 0.8 ? 'up' : avgConfidence < 0.6 ? 'down' : null,
        color: avgConfidence > 0.8 ? 'text-emerald-600' : avgConfidence < 0.6 ? 'text-red-600' : 'text-amber-600',
      });
    }
  }
  
  return stats.slice(0, 6);
}

export function SmartStatsBar({ records, queryTimeMs, sourcesCount, className }: SmartStatsBarProps) {
  const category = useMemo(() => detectPrimaryCategory(records), [records]);
  const stats = useMemo(() => calculateStats(records, category), [records, category]);
  
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-1">
            <stat.icon className={cn("w-5 h-5", stat.color || 'text-slate-400')} />
            {stat.trend && (
              <span className={stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                {stat.trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          <div className="text-xs text-slate-500">{stat.label}</div>
          {stat.subtext && (
            <div className="text-xs text-slate-400 mt-0.5 truncate">{stat.subtext}</div>
          )}
        </motion.div>
      ))}
      
      {/* Query Time */}
      {queryTimeMs && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stats.length * 0.05 }}
          className="bg-white rounded-xl border border-slate-200 p-3"
        >
          <Clock className="w-5 h-5 text-slate-400 mb-1" />
          <div className="text-2xl font-bold text-slate-900">{(queryTimeMs / 1000).toFixed(1)}s</div>
          <div className="text-xs text-slate-500">Query Time</div>
          <div className="text-xs text-slate-400 mt-0.5">{sourcesCount} sources</div>
        </motion.div>
      )}
    </div>
  );
}

export default SmartStatsBar;
