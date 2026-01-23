// BASED DATA - Results Data Table
// Full data table with sortable columns, expandable rows

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessedRecord } from '@/lib/dataProcessing';

interface ResultsDataTableProps {
  records: ProcessedRecord[];
  onRowClick?: (record: ProcessedRecord) => void;
}

export function ResultsDataTable({ records, onRowClick }: ResultsDataTableProps) {
  const [sortField, setSortField] = useState<string>('award_amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get nested value from object
  const getNestedValue = (obj: any, path: string): any => {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part] ?? value.properties?.[part] ?? value.attributes?.[part];
    }
    return value;
  };

  // Sort records
  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const aVal = getNestedValue(a, sortField) ?? getNestedValue(a.properties, sortField);
      const bVal = getNestedValue(b, sortField) ?? getNestedValue(b.properties, sortField);
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal > bVal ? 1 : -1;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [records, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Stats Bar */}
      <StatsBar records={records} />
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <SortableHeader field="name" label="Recipient" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="award_amount" label="Amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
              <SortableHeader field="awarding_agency" label="Agency" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="category" label="Type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="naics_description" label="Industry" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="start_date" label="Start" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="state" label="State" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((record) => (
              <RecordRow 
                key={record.id} 
                record={record} 
                isExpanded={expandedId === record.id}
                onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {records.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No records to display
        </div>
      )}
    </div>
  );
}

// Stats Bar Component
function StatsBar({ records }: { records: ProcessedRecord[] }) {
  const stats = useMemo(() => {
    const totalValue = records.reduce((sum, r) => {
      const props = (r.properties || {}) as Record<string, any>;
      const amount = props.award_amount || props.attributes?.award_amount || 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);
    
    const contracts = records.filter(r => {
      const props = (r.properties || {}) as Record<string, any>;
      const cat = String(props.category || props.subcategory || '').toLowerCase();
      return cat.includes('contract');
    }).length;
    
    const grants = records.filter(r => {
      const props = (r.properties || {}) as Record<string, any>;
      const cat = String(props.category || props.subcategory || '').toLowerCase();
      return cat.includes('grant');
    }).length;
    
    const agencies = new Set(records.map(r => {
      const props = (r.properties || {}) as Record<string, any>;
      return props.awarding_agency || props.attributes?.awarding_agency;
    }).filter(Boolean)).size;
    
    return { totalValue, contracts, grants, agencies };
  }, [records]);
  
  return (
    <div className="px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-6 text-sm">
        <StatItem label="Records" value={records.length} />
        <StatItem label="Total Value" value={formatCurrency(stats.totalValue)} highlight />
        <StatItem label="Contracts" value={stats.contracts} />
        <StatItem label="Grants" value={stats.grants} />
        <StatItem label="Agencies" value={stats.agencies} />
      </div>
    </div>
  );
}

function StatItem({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-semibold", highlight ? "text-emerald-600" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function SortableHeader({ 
  field, 
  label, 
  sortField, 
  sortDir, 
  onSort, 
  align = 'left' 
}: {
  field: string;
  label: string;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sortField === field;
  
  return (
    <th 
      className={cn(
        "px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70 select-none transition-colors",
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn("flex items-center gap-1", align === 'right' ? 'justify-end' : '')}>
        {label}
        {isActive && (
          sortDir === 'desc' 
            ? <ChevronDown className="w-3 h-3" /> 
            : <ChevronUp className="w-3 h-3" />
        )}
      </div>
    </th>
  );
}

function RecordRow({ 
  record, 
  isExpanded, 
  onToggle,
  onRowClick
}: { 
  record: ProcessedRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onRowClick?: (record: ProcessedRecord) => void;
}) {
  const props = (record.properties || {}) as Record<string, any>;
  const attrs = props.attributes || {};
  
  // Extract values with fallbacks
  const name = record.displayName || props.name || props.recipient_name || 'Unknown';
  const city = props.city || attrs.performance_city || '';
  const state = props.state || attrs.performance_state || '';
  const awardAmount = props.award_amount || attrs.award_amount;
  const agency = props.awarding_agency || attrs.awarding_agency || '';
  const subAgency = props.awarding_sub_agency || attrs.awarding_sub_agency || '';
  const category = props.category || props.subcategory || 'Unknown';
  const naicsDesc = props.naics_description || attrs.naics_description || props.psc_description || '';
  const naicsCode = props.naics_code || attrs.naics_code || '';
  const startDate = props.start_date || attrs.start_date || '';
  const endDate = props.end_date || attrs.end_date || '';
  const description = props.description || attrs.description || '';
  const awardId = props.source_record_id || attrs.award_id || '';
  const awardType = props.award_type || attrs.award_type || '';
  const pscCode = props.psc_code || attrs.psc_code || '';
  const sourceUrl = props.source_url || '';
  
  const isContract = category.toLowerCase().includes('contract');
  const isGrant = category.toLowerCase().includes('grant');
  
  return (
    <>
      <tr 
        className={cn(
          "hover:bg-muted/50 cursor-pointer transition-colors",
          isExpanded && "bg-primary/5"
        )}
        onClick={onToggle}
      >
        {/* Recipient */}
        <td className="px-3 py-3">
          <div className="font-medium text-foreground truncate max-w-[200px]">
            {name}
          </div>
          {(city || state) && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[city, state].filter(Boolean).join(', ')}
            </div>
          )}
        </td>
        
        {/* Amount */}
        <td className="px-3 py-3 text-right">
          <span className="font-semibold text-emerald-600">
            {formatCurrency(awardAmount)}
          </span>
        </td>
        
        {/* Agency */}
        <td className="px-3 py-3">
          <div className="text-foreground truncate max-w-[180px]">
            {agency || '—'}
          </div>
          {subAgency && subAgency !== agency && (
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
              {subAgency}
            </div>
          )}
        </td>
        
        {/* Type */}
        <td className="px-3 py-3">
          <span className={cn(
            "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
            isContract ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
            isGrant ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" :
            "bg-muted text-muted-foreground"
          )}>
            {category}
          </span>
        </td>
        
        {/* Industry/NAICS */}
        <td className="px-3 py-3">
          <div className="text-foreground truncate max-w-[180px]">
            {naicsDesc || '—'}
          </div>
          {naicsCode && (
            <div className="text-xs text-muted-foreground">
              {naicsCode}
            </div>
          )}
        </td>
        
        {/* Start Date */}
        <td className="px-3 py-3 text-foreground text-sm">
          {formatDate(startDate)}
        </td>
        
        {/* State */}
        <td className="px-3 py-3 text-foreground">
          {state || '—'}
        </td>
        
        {/* Expand Toggle */}
        <td className="px-3 py-3">
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )} />
        </td>
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-primary/5 border-t border-primary/10">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Description */}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</div>
                <p className="text-sm text-foreground">
                  {description || 'No description available'}
                </p>
              </div>
              
              {/* Details */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details</div>
                <div className="space-y-1 text-sm">
                  {awardId && (
                    <div>
                      <span className="text-muted-foreground">Award ID:</span>{' '}
                      <span className="text-foreground font-mono text-xs">{awardId}</span>
                    </div>
                  )}
                  {awardType && (
                    <div>
                      <span className="text-muted-foreground">Award Type:</span>{' '}
                      <span className="text-foreground">{awardType}</span>
                    </div>
                  )}
                  {endDate && (
                    <div>
                      <span className="text-muted-foreground">End Date:</span>{' '}
                      <span className="text-foreground">{formatDate(endDate)}</span>
                    </div>
                  )}
                  {pscCode && (
                    <div>
                      <span className="text-muted-foreground">PSC:</span>{' '}
                      <span className="text-foreground">{pscCode}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-3">
                  {sourceUrl && (
                    <a 
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {onRowClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(record);
                      }}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View on Map <MapPin className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Helper functions
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  if (typeof amount !== 'number') return '—';
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  } catch {
    return String(dateStr);
  }
}

export default ResultsDataTable;
