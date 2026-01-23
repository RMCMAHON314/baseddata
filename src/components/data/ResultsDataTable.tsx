// BASED DATA v10.1 - Maximum Data Density Results Table
// Adaptive schema with full property display, expandable deep-dive, and comprehensive stats

import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronDown, ChevronUp, ExternalLink, MapPin, Building2, DollarSign, 
  Calendar, Tag, Star, Braces, Copy, Download, Maximize2, List,
  Eye, Database, AlertCircle, CheckCircle2, Clock, Globe, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProcessedRecord } from '@/lib/dataProcessing';

interface ResultsDataTableProps {
  records: ProcessedRecord[];
  onRowClick?: (record: ProcessedRecord) => void;
  onOpenDossier?: (record: ProcessedRecord) => void;
}

// Data schema types
type DataSchema = 'contracts' | 'poi' | 'mixed';

// Detect what kind of data we have
function detectSchema(records: ProcessedRecord[]): DataSchema {
  if (records.length === 0) return 'poi';
  
  const sample = records.slice(0, Math.min(10, records.length));
  
  let contractSignals = 0;
  let poiSignals = 0;
  
  for (const r of sample) {
    const props = (r.properties || {}) as Record<string, any>;
    const attrs = props.attributes || {};
    
    // Contract signals
    if (props.award_amount || attrs.award_amount) contractSignals += 2;
    if (props.awarding_agency || attrs.awarding_agency) contractSignals += 2;
    if (props.naics_code || attrs.naics_code) contractSignals += 1;
    if (props.psc_code || attrs.psc_code) contractSignals += 1;
    if (String(props.category || '').toLowerCase().includes('contract')) contractSignals += 2;
    if (String(props.category || '').toLowerCase().includes('grant')) contractSignals += 2;
    
    // POI signals
    if (props.school_type || props.amenity || props.leisure) poiSignals += 2;
    if (props.source?.includes('osm')) poiSignals += 1;
    if (props.website && !props.award_amount) poiSignals += 1;
    if (props.address && !props.awarding_agency) poiSignals += 1;
    if (['EDUCATION', 'RECREATION', 'GEOSPATIAL', 'HEALTH', 'WILDLIFE'].includes(String(props.category || '').toUpperCase())) poiSignals += 2;
  }
  
  if (contractSignals > poiSignals * 1.5) return 'contracts';
  if (poiSignals > contractSignals * 1.5) return 'poi';
  return 'mixed';
}

// Flatten all properties for full display
function flattenProperties(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenProperties(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

// Count all unique fields across records
function analyzeAllFields(records: ProcessedRecord[]): { field: string; count: number; sample: any }[] {
  const fieldCounts: Record<string, { count: number; sample: any }> = {};
  
  for (const record of records) {
    const allProps = flattenProperties(record.properties || {});
    
    for (const [key, value] of Object.entries(allProps)) {
      if (value !== null && value !== undefined && value !== '') {
        if (!fieldCounts[key]) {
          fieldCounts[key] = { count: 0, sample: value };
        }
        fieldCounts[key].count++;
      }
    }
  }
  
  return Object.entries(fieldCounts)
    .map(([field, data]) => ({ field, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function ResultsDataTable({ records, onRowClick, onOpenDossier }: ResultsDataTableProps) {
  const schema = useMemo(() => detectSchema(records), [records]);
  const [sortField, setSortField] = useState<string>(schema === 'contracts' ? 'award_amount' : 'relevance_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllProps, setShowAllProps] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  // Analyze all fields in dataset
  const allFields = useMemo(() => analyzeAllFields(records), [records]);

  // Get nested value from object
  const getNestedValue = useCallback((obj: any, path: string): any => {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part] ?? value.properties?.[part] ?? value.attributes?.[part];
    }
    return value;
  }, []);

  // Sort records
  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal = getNestedValue(a, sortField) ?? getNestedValue(a.properties, sortField);
      let bVal = getNestedValue(b, sortField) ?? getNestedValue(b.properties, sortField);
      
      // Handle bestConfidence as fallback for relevance
      if (sortField === 'relevance_score') {
        aVal = aVal ?? a.bestConfidence ?? 0;
        bVal = bVal ?? b.bestConfidence ?? 0;
      }
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal > bVal ? 1 : -1;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [records, sortField, sortDir, getNestedValue]);

  // Paginate
  const paginatedRecords = useMemo(() => {
    const start = currentPage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const copyRecordJSON = (record: ProcessedRecord) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    toast.success('Record JSON copied to clipboard');
  };

  const exportAsCSV = () => {
    const headers = ['Name', 'Category', 'Source', 'Latitude', 'Longitude', ...allFields.slice(0, 50).map(f => f.field)];
    const rows = sorted.map(r => {
      const props = flattenProperties(r.properties || {});
      // Extract coordinates from geometry
      const coords = r.geometry?.type === 'Point' ? r.geometry.coordinates as number[] : [0, 0];
      return [
        r.displayName || props.name || '',
        props.category || '',
        props.source || '',
        coords[1],
        coords[0],
        ...allFields.slice(0, 50).map(f => {
          const val = props[f.field];
          return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        })
      ];
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  // Helper to get coordinates from record
  const getCoords = (r: ProcessedRecord): [number, number] => {
    if (r.geometry?.type === 'Point') {
      const coords = r.geometry.coordinates as number[];
      return [coords[0], coords[1]];
    }
    return [0, 0];
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col h-full">
      {/* Adaptive Stats Bar */}
      <StatsBar records={records} schema={schema} allFields={allFields} />
      
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-2 flex-wrap">
        <button 
          onClick={() => setShowAllProps(!showAllProps)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            showAllProps ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"
          )}
        >
          <Braces className="w-3.5 h-3.5" />
          {showAllProps ? 'Hide Full Data' : 'Show All Properties'}
        </button>
        <button 
          onClick={exportAsCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Quick CSV
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Show</span>
          <select 
            value={pageSize} 
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
            className="px-2 py-1 rounded border border-border bg-background text-foreground"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
          <span>records</span>
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
            {schema === 'contracts' ? (
              <ContractHeaders sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            ) : (
              <POIHeaders sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            )}
          </thead>
          <tbody className="divide-y divide-border/50">
            {paginatedRecords.map((record) => (
              schema === 'contracts' ? (
                <ContractRow 
                  key={record.id} 
                  record={record} 
                  isExpanded={expandedId === record.id}
                  showAllProps={showAllProps}
                  onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  onRowClick={onRowClick}
                  onOpenDossier={onOpenDossier}
                  onCopyJSON={copyRecordJSON}
                />
              ) : (
                <POIRow 
                  key={record.id} 
                  record={record} 
                  isExpanded={expandedId === record.id}
                  showAllProps={showAllProps}
                  onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  onRowClick={onRowClick}
                  onOpenDossier={onOpenDossier}
                  onCopyJSON={copyRecordJSON}
                />
              )
            ))}
          </tbody>
        </table>
      </div>
      
      {records.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No records to display
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of {sorted.length} records
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-xs rounded border border-border bg-background disabled:opacity-50 hover:bg-muted"
            >
              First
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 text-xs rounded border border-border bg-background disabled:opacity-50 hover:bg-muted"
            >
              Prev
            </button>
            <span className="px-3 text-xs text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 text-xs rounded border border-border bg-background disabled:opacity-50 hover:bg-muted"
            >
              Next
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 text-xs rounded border border-border bg-background disabled:opacity-50 hover:bg-muted"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ STATS BAR ============

function StatsBar({ records, schema, allFields }: { records: ProcessedRecord[]; schema: DataSchema; allFields: { field: string; count: number }[] }) {
  const stats = useMemo(() => {
    if (schema === 'contracts') {
      const totalValue = records.reduce((sum, r) => {
        const props = (r.properties || {}) as Record<string, any>;
        const amount = props.award_amount || props.attributes?.award_amount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);
      
      const contracts = records.filter(r => {
        const cat = String((r.properties as any)?.category || '').toLowerCase();
        return cat.includes('contract');
      }).length;
      
      const grants = records.filter(r => {
        const cat = String((r.properties as any)?.category || '').toLowerCase();
        return cat.includes('grant');
      }).length;
      
      const agencies = new Set(records.map(r => {
        const props = (r.properties || {}) as Record<string, any>;
        return props.awarding_agency || props.attributes?.awarding_agency;
      }).filter(Boolean)).size;

      const states = new Set(records.map(r => {
        const props = (r.properties || {}) as Record<string, any>;
        return props.state || props.attributes?.performance_state;
      }).filter(Boolean)).size;
      
      return { type: 'contracts' as const, totalValue, contracts, grants, agencies, states };
    }
    
    // POI stats
    const categories = new Set<string>();
    const sources = new Set<string>();
    let avgRelevance = 0;
    let withCoords = 0;
    let withAddress = 0;
    let highConfidence = 0;
    
    records.forEach(r => {
      const props = (r.properties || {}) as Record<string, any>;
      if (props.category) categories.add(String(props.category).toUpperCase());
      if (props.source) sources.add(String(props.source));
      const rel = props.relevance_score || r.bestConfidence || 0.5;
      avgRelevance += rel;
      if (rel >= 0.8) highConfidence++;
      if (r.geometry?.type === 'Point') withCoords++;
      if (props.address || props.city || props.state) withAddress++;
    });
    
    return { 
      type: 'poi' as const, 
      categories: categories.size,
      sources: sources.size,
      avgRelevance: records.length > 0 ? avgRelevance / records.length : 0,
      withCoords,
      withAddress,
      highConfidence
    };
  }, [records, schema]);
  
  return (
    <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-muted/30 to-muted/10">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <StatItem label="Total Records" value={records.length} highlight icon={<Database className="w-3.5 h-3.5" />} />
        <div className="h-4 w-px bg-border" />
        
        {stats.type === 'contracts' ? (
          <>
            <StatItem label="Total Value" value={formatCurrency(stats.totalValue)} highlight icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatItem label="Contracts" value={stats.contracts} />
            <StatItem label="Grants" value={stats.grants} />
            <StatItem label="Agencies" value={stats.agencies} icon={<Building2 className="w-3.5 h-3.5" />} />
            <StatItem label="States" value={stats.states} icon={<Globe className="w-3.5 h-3.5" />} />
          </>
        ) : (
          <>
            <StatItem label="Categories" value={stats.categories} icon={<Tag className="w-3.5 h-3.5" />} />
            <StatItem label="Sources" value={stats.sources} />
            <StatItem label="Avg Relevance" value={`${Math.round(stats.avgRelevance * 100)}%`} highlight icon={<Star className="w-3.5 h-3.5" />} />
            <StatItem label="Georeferenced" value={`${Math.round((stats.withCoords / Math.max(1, records.length)) * 100)}%`} icon={<MapPin className="w-3.5 h-3.5" />} />
            <StatItem label="High Confidence" value={stats.highConfidence} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
          </>
        )}
        
        <div className="h-4 w-px bg-border" />
        <StatItem label="Data Points" value={allFields.length} icon={<Hash className="w-3.5 h-3.5" />} />
      </div>
    </div>
  );
}

function StatItem({ label, value, highlight = false, icon }: { label: string; value: string | number; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-semibold", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

// ============ POI HEADERS & ROWS ============

function POIHeaders({ sortField, sortDir, onSort }: { sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void }) {
  return (
    <tr>
      <SortableHeader field="name" label="Name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="category" label="Category" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="address" label="Location" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="source" label="Source" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="relevance_score" label="Relevance" sortField={sortField} sortDir={sortDir} onSort={onSort} align="center" />
      <th className="w-10 px-3 py-3"></th>
    </tr>
  );
}

function POIRow({ record, isExpanded, showAllProps, onToggle, onRowClick, onOpenDossier, onCopyJSON }: { 
  record: ProcessedRecord; isExpanded: boolean; showAllProps: boolean; onToggle: () => void; 
  onRowClick?: (r: ProcessedRecord) => void; onOpenDossier?: (r: ProcessedRecord) => void;
  onCopyJSON: (r: ProcessedRecord) => void;
}) {
  const props = (record.properties || {}) as Record<string, any>;
  const flatProps = useMemo(() => flattenProperties(props), [props]);
  
  const name = record.displayName || props.name || props.title || 'Unknown';
  const category = String(props.category || record.group || 'OTHER').toUpperCase();
  const address = props.address || '';
  const city = props.city || '';
  const state = props.state || '';
  const locationStr = [address, city, state].filter(Boolean).join(', ') || '—';
  const source = props.source || 'Unknown';
  const relevance = props.relevance_score || record.bestConfidence || 0;
  const description = props.description || '';
  const website = props.website || '';
  const phone = props.phone || '';
  const schoolType = props.school_type || props.amenity || props.leisure || '';
  const relevanceFlags = props.relevance_flags || [];
  
  const categoryColors: Record<string, string> = {
    'EDUCATION': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'RECREATION': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    'HEALTH': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    'WILDLIFE': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    'GOVERNMENT': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    'GEOSPATIAL': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  };
  
  return (
    <>
      <tr 
        className={cn("hover:bg-muted/50 cursor-pointer transition-colors", isExpanded && "bg-primary/5")}
        onClick={onToggle}
      >
        <td className="px-3 py-3">
          <div className="font-medium text-foreground truncate max-w-[250px]">{name}</div>
          {schoolType && <div className="text-xs text-muted-foreground capitalize">{schoolType}</div>}
        </td>
        <td className="px-3 py-3">
          <span className={cn("inline-flex px-2 py-0.5 text-xs font-medium rounded-full", categoryColors[category] || 'bg-muted text-muted-foreground')}>
            {category}
          </span>
        </td>
        <td className="px-3 py-3">
          <div className="text-foreground text-sm truncate max-w-[200px] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            {locationStr}
          </div>
        </td>
        <td className="px-3 py-3 text-sm text-muted-foreground">{source}</td>
        <td className="px-3 py-3 text-center">
          <RelevanceBadge score={relevance} />
        </td>
        <td className="px-3 py-3">
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-primary/5 border-t border-primary/10">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details</div>
                <p className="text-sm text-foreground mb-2">{description || 'No description available'}</p>
                
                {relevanceFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {relevanceFlags.map((flag: string, i: number) => (
                      <span key={i} className="inline-flex px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* All Properties Grid */}
                {showAllProps && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Braces className="w-3 h-3" />
                      All Properties ({Object.keys(flatProps).length})
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs max-h-[300px] overflow-auto">
                      {Object.entries(flatProps).map(([key, value]) => (
                        <div key={key} className="flex gap-1 py-0.5">
                          <span className="text-muted-foreground truncate">{key}:</span>
                          <span className="text-foreground font-medium truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contact & Actions</div>
                <div className="space-y-1 text-sm">
                  {phone && <div><span className="text-muted-foreground">Phone:</span> {phone}</div>}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      Website <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {record.geometry?.type === 'Point' && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {(record.geometry.coordinates as number[])[1].toFixed(5)}, {(record.geometry.coordinates as number[])[0].toFixed(5)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); onCopyJSON(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                    <Copy className="w-3 h-3" /> Copy JSON
                  </button>
                  {onOpenDossier && (
                    <button onClick={(e) => { e.stopPropagation(); onOpenDossier(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                      <Maximize2 className="w-3 h-3" /> 10x Dossier
                    </button>
                  )}
                  {onRowClick && (
                    <button onClick={(e) => { e.stopPropagation(); onRowClick(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                      <MapPin className="w-3 h-3" /> View on Map
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

// ============ CONTRACT HEADERS & ROWS ============

function ContractHeaders({ sortField, sortDir, onSort }: { sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void }) {
  return (
    <tr>
      <SortableHeader field="name" label="Recipient" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="award_amount" label="Amount" sortField={sortField} sortDir={sortDir} onSort={onSort} align="right" />
      <SortableHeader field="awarding_agency" label="Agency" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="category" label="Type" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="naics_description" label="Industry" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="start_date" label="Start" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <SortableHeader field="state" label="State" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <th className="w-10 px-3 py-3"></th>
    </tr>
  );
}

function ContractRow({ record, isExpanded, showAllProps, onToggle, onRowClick, onOpenDossier, onCopyJSON }: { 
  record: ProcessedRecord; isExpanded: boolean; showAllProps: boolean; onToggle: () => void; 
  onRowClick?: (r: ProcessedRecord) => void; onOpenDossier?: (r: ProcessedRecord) => void;
  onCopyJSON: (r: ProcessedRecord) => void;
}) {
  const props = (record.properties || {}) as Record<string, any>;
  const attrs = props.attributes || {};
  const flatProps = useMemo(() => flattenProperties(props), [props]);
  
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
      <tr className={cn("hover:bg-muted/50 cursor-pointer transition-colors", isExpanded && "bg-primary/5")} onClick={onToggle}>
        <td className="px-3 py-3">
          <div className="font-medium text-foreground truncate max-w-[200px]">{name}</div>
          {(city || state) && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[city, state].filter(Boolean).join(', ')}
            </div>
          )}
        </td>
        <td className="px-3 py-3 text-right">
          <span className="font-semibold text-emerald-600">{formatCurrency(awardAmount)}</span>
        </td>
        <td className="px-3 py-3">
          <div className="text-foreground truncate max-w-[180px]">{agency || '—'}</div>
          {subAgency && subAgency !== agency && (
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{subAgency}</div>
          )}
        </td>
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
        <td className="px-3 py-3">
          <div className="text-foreground truncate max-w-[180px]">{naicsDesc || '—'}</div>
          {naicsCode && <div className="text-xs text-muted-foreground">{naicsCode}</div>}
        </td>
        <td className="px-3 py-3 text-foreground text-sm">{formatDate(startDate)}</td>
        <td className="px-3 py-3 text-foreground">{state || '—'}</td>
        <td className="px-3 py-3">
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-primary/5 border-t border-primary/10">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</div>
                <p className="text-sm text-foreground">{description || 'No description available'}</p>

                {/* All Properties Grid */}
                {showAllProps && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Braces className="w-3 h-3" />
                      All Properties ({Object.keys(flatProps).length})
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs max-h-[300px] overflow-auto">
                      {Object.entries(flatProps).map(([key, value]) => (
                        <div key={key} className="flex gap-1 py-0.5">
                          <span className="text-muted-foreground truncate">{key}:</span>
                          <span className="text-foreground font-medium truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details & Actions</div>
                <div className="space-y-1 text-sm">
                  {awardId && <div><span className="text-muted-foreground">Award ID:</span> <span className="font-mono text-xs">{awardId}</span></div>}
                  {awardType && <div><span className="text-muted-foreground">Award Type:</span> {awardType}</div>}
                  {endDate && <div><span className="text-muted-foreground">End Date:</span> {formatDate(endDate)}</div>}
                  {pscCode && <div><span className="text-muted-foreground">PSC:</span> {pscCode}</div>}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); onCopyJSON(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                    <Copy className="w-3 h-3" /> Copy JSON
                  </button>
                  {sourceUrl && (
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" /> Source
                    </a>
                  )}
                  {onOpenDossier && (
                    <button onClick={(e) => { e.stopPropagation(); onOpenDossier(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                      <Maximize2 className="w-3 h-3" /> 10x Dossier
                    </button>
                  )}
                  {onRowClick && (
                    <button onClick={e => { e.stopPropagation(); onRowClick(record); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10">
                      <MapPin className="w-3 h-3" /> Map
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

// ============ SHARED COMPONENTS ============

function RelevanceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-primary bg-primary/10' :
                pct >= 60 ? 'text-accent-foreground bg-accent' :
                pct >= 40 ? 'text-foreground bg-muted' :
                'text-muted-foreground bg-muted/50';
  
  return <span className={cn("inline-flex px-2 py-0.5 text-xs font-medium rounded-full", color)}>{pct}%</span>;
}

function SortableHeader({ field, label, sortField, sortDir, onSort, align = 'left' }: {
  field: string; label: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: (field: string) => void; align?: 'left' | 'right' | 'center';
}) {
  const isActive = sortField === field;
  return (
    <th 
      className={cn(
        "px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70 select-none transition-colors",
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn("flex items-center gap-1", align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '')}>
        {label}
        {isActive && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
      </div>
    </th>
  );
}

// ============ HELPERS ============

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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

export default ResultsDataTable;
