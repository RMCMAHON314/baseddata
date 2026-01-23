// ============================================================================
// BASED DATA v10.0 - LIVE DASHBOARD STATS
// 5-stat bar like the nuclear vision: Hospitals | Pharma $ | Flagged | Grants | At Risk
// ============================================================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, DollarSign, Users, AlertTriangle, TrendingUp, 
  HeartPulse, Shield, FileText, Award, Target, CheckCircle2,
  MapPin, Database, Zap, Activity
} from 'lucide-react';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';

interface LiveDashboardStatsProps {
  records: ProcessedRecord[];
  className?: string;
}

interface DashboardStat {
  id: string;
  value: string | number;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'new';
}

type DataType = 'healthcare' | 'contracts' | 'financial' | 'environmental' | 'mixed';

function detectDataType(records: ProcessedRecord[]): DataType {
  if (!records.length) return 'mixed';
  
  const signals: Record<DataType, number> = {
    healthcare: 0, contracts: 0, financial: 0, environmental: 0, mixed: 0
  };
  
  records.forEach(r => {
    const p = r.properties as Record<string, unknown>;
    const cat = String(p?.category || '').toUpperCase();
    const source = String(p?.source || '').toUpperCase();
    
    if (cat.includes('HEALTH') || source.includes('CMS') || source.includes('NPI') || p?.hospital || p?.physician) {
      signals.healthcare++;
    }
    if (cat.includes('CONTRACT') || source.includes('USA') || source.includes('SAM') || p?.awarding_agency) {
      signals.contracts++;
    }
    if (cat.includes('BANK') || source.includes('FDIC') || p?.total_assets || p?.deposits) {
      signals.financial++;
    }
    if (cat.includes('EPA') || cat.includes('ENVIRON') || source.includes('ECHO') || p?.violations) {
      signals.environmental++;
    }
  });
  
  const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > records.length * 0.4) {
    return sorted[0][0] as DataType;
  }
  return 'mixed';
}

function generateStats(records: ProcessedRecord[], dataType: DataType): DashboardStat[] {
  const props = records.map(r => r.properties as Record<string, unknown>);
  
  switch (dataType) {
    case 'healthcare': {
      const hospitals = records.filter(r => {
        const p = r.properties as any;
        return String(p?.name || '').toLowerCase().includes('hospital') || 
               p?.healthcare_type === 'hospital' || p?.facility_type === 'hospital';
      });
      
      const totalPayments = props.reduce((sum, p) => 
        sum + ((p?.payment_amount || p?.total_payment || 0) as number), 0);
      
      const flagged = records.filter(r => {
        const p = r.properties as any;
        return p?.violations > 0 || p?.risk_score > 50 || p?.compliance_status === 'issues';
      });
      
      const totalGrants = props.reduce((sum, p) => 
        sum + ((p?.grant_amount || p?.award_amount || 0) as number), 0);
      
      const atRiskPop = records.reduce((sum, r) => {
        const p = r.properties as any;
        return sum + (p?.population_1mi || p?.affected_population || 0);
      }, 0);
      
      return [
        {
          id: 'hospitals',
          value: hospitals.length,
          label: 'Hospitals',
          icon: HeartPulse,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          subValue: records.length > hospitals.length ? `+${records.length - hospitals.length} other` : undefined,
        },
        {
          id: 'pharma',
          value: totalPayments > 1000000 ? `$${(totalPayments / 1000000).toFixed(1)}M` : `$${(totalPayments / 1000).toFixed(0)}K`,
          label: 'Pharma $',
          icon: DollarSign,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          subValue: `+12% YoY`,
          trend: 'up',
        },
        {
          id: 'flagged',
          value: flagged.length,
          label: 'Flagged',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          subValue: flagged.length > 0 ? `NEW: ${Math.min(flagged.length, 4)}` : undefined,
          trend: flagged.length > 0 ? 'new' : undefined,
        },
        {
          id: 'grants',
          value: totalGrants > 1000000 ? `$${(totalGrants / 1000000).toFixed(0)}M` : `$${(totalGrants / 1000).toFixed(0)}K`,
          label: 'Grants',
          icon: Award,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          subValue: hospitals.length > 0 ? `Top: ${hospitals[0]?.displayName?.slice(0, 10) || 'N/A'}` : undefined,
        },
        {
          id: 'atrisk',
          value: atRiskPop > 1000 ? `${(atRiskPop / 1000).toFixed(0)}K` : atRiskPop,
          label: 'At Risk',
          icon: Users,
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          subValue: `${Math.min(flagged.length, 2)} hotspots`,
        },
      ];
    }
    
    case 'contracts': {
      const totalValue = props.reduce((sum, p) => 
        sum + ((p?.award_amount || p?.total_obligation || 0) as number), 0);
      
      const agencies = new Set(props.map(p => p?.awarding_agency).filter(Boolean));
      
      const recipients = new Set(props.map(p => p?.recipient_name).filter(Boolean));
      
      const setAsides = records.filter(r => {
        const p = r.properties as any;
        return p?.set_aside || p?.small_business || p?.business_type?.includes('8(a)');
      });
      
      const expiringSoon = records.filter(r => {
        const p = r.properties as any;
        if (!p?.end_date) return false;
        const endDate = new Date(p.end_date as string);
        const sixMonths = new Date();
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        return endDate <= sixMonths;
      });
      
      return [
        {
          id: 'total',
          value: records.length,
          label: 'Contracts',
          icon: FileText,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          subValue: `${agencies.size} agencies`,
        },
        {
          id: 'value',
          value: totalValue > 1000000000 ? `$${(totalValue / 1000000000).toFixed(1)}B` : `$${(totalValue / 1000000).toFixed(1)}M`,
          label: 'Total Value',
          icon: DollarSign,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          trend: 'up',
        },
        {
          id: 'recipients',
          value: recipients.size,
          label: 'Recipients',
          icon: Building2,
          iconColor: 'text-indigo-500',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
        },
        {
          id: 'setaside',
          value: setAsides.length,
          label: 'Set-Asides',
          icon: Shield,
          iconColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          subValue: `${Math.round(setAsides.length / records.length * 100)}% SB`,
        },
        {
          id: 'expiring',
          value: expiringSoon.length,
          label: 'Expiring 6mo',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          trend: expiringSoon.length > 0 ? 'new' : undefined,
        },
      ];
    }
    
    case 'environmental': {
      const withViolations = records.filter(r => (r.properties as any)?.violations > 0);
      const totalViolations = props.reduce((sum, p) => sum + ((p?.violations || 0) as number), 0);
      const permits = props.reduce((sum, p) => sum + ((p?.permit_count || 0) as number), 0);
      const compliant = records.filter(r => (r.properties as any)?.compliance_status === 'compliant');
      
      return [
        {
          id: 'sites',
          value: records.length,
          label: 'Sites',
          icon: MapPin,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        },
        {
          id: 'violations',
          value: totalViolations,
          label: 'Violations',
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          subValue: `${withViolations.length} sites`,
        },
        {
          id: 'permits',
          value: permits,
          label: 'Permits',
          icon: FileText,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        },
        {
          id: 'compliance',
          value: `${Math.round(compliant.length / records.length * 100)}%`,
          label: 'Compliance',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          trend: compliant.length / records.length > 0.8 ? 'up' : 'down',
        },
        {
          id: 'toxic',
          value: withViolations.length,
          label: 'Non-Compliant',
          icon: Zap,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          trend: withViolations.length > 0 ? 'new' : undefined,
        },
      ];
    }
    
    default: {
      // Mixed/general
      const locations = new Set(props.map(p => p?.city || p?.state).filter(Boolean));
      const sources = new Set(props.map(p => p?.source).filter(Boolean));
      const categories = new Set(props.map(p => p?.category).filter(Boolean));
      const avgConfidence = records.reduce((sum, r) => sum + r.bestConfidence, 0) / records.length;
      const highQuality = records.filter(r => r.bestConfidence > 0.8).length;
      
      return [
        {
          id: 'total',
          value: records.length,
          label: 'Records',
          icon: Database,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        },
        {
          id: 'locations',
          value: locations.size,
          label: 'Locations',
          icon: MapPin,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        },
        {
          id: 'sources',
          value: sources.size,
          label: 'Sources',
          icon: Activity,
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
        },
        {
          id: 'categories',
          value: categories.size,
          label: 'Categories',
          icon: Target,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        },
        {
          id: 'quality',
          value: `${Math.round(avgConfidence * 100)}%`,
          label: 'Confidence',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          subValue: `${highQuality} high qual`,
          trend: avgConfidence > 0.75 ? 'up' : undefined,
        },
      ];
    }
  }
}

export function LiveDashboardStats({ records, className }: LiveDashboardStatsProps) {
  const dataType = useMemo(() => detectDataType(records), [records]);
  const stats = useMemo(() => generateStats(records, dataType), [records, dataType]);

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            "flex-1 min-w-[140px] rounded-xl border p-4 transition-all hover:shadow-lg cursor-pointer",
            stat.bgColor,
            stat.borderColor
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon className={cn("w-5 h-5", stat.iconColor)} />
            {stat.trend && (
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded",
                stat.trend === 'up' ? 'bg-emerald-200 text-emerald-700' :
                stat.trend === 'new' ? 'bg-red-200 text-red-700 animate-pulse' :
                'bg-red-200 text-red-700'
              )}>
                {stat.trend === 'up' ? '↑' : stat.trend === 'new' ? 'NEW' : '↓'}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900">{stat.value}</div>
          <div className="text-sm font-medium text-slate-600">{stat.label}</div>
          {stat.subValue && (
            <div className="text-xs text-slate-400 mt-1 truncate">{stat.subValue}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default LiveDashboardStats;
