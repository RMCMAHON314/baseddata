// BASED DATA v7.0 - Enhanced Spreadsheet-Style Data Grid
// XLS-like interface with clickable source links

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, X, Columns, FileSpreadsheet, ExternalLink, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';
import { findSourceInfo } from '@/types/omniscient';

interface DataGridProps {
  features: GeoJSONFeature[];
  onExport?: (format: 'xlsx' | 'csv') => void;
  onRowClick?: (feature: GeoJSONFeature) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  format?: (value: any) => string;
}

export function DataGrid({ features, onExport, onRowClick, className }: DataGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  
  // Build column definitions from data - prioritize USEFUL columns
  const columns = useMemo<ColumnDef[]>(() => {
    const allKeys = new Set<string>();
    features.forEach(f => {
      Object.keys(f.properties || {}).forEach(k => allKeys.add(k));
    });
    
    // Priority columns - most useful first, hide internal/redundant ones
    const priorityOrder = ['name', 'category', 'description', 'address', 'sport', 'facility_type', 'source', 'confidence'];
    const hiddenKeys = ['source_id', 'source_url', 'source_record_url', 'api_documentation_url', 'url', 'attributes', 'subcategory'];
    
    const filteredKeys = Array.from(allKeys).filter(k => !hiddenKeys.includes(k));
    const orderedKeys = [
      ...priorityOrder.filter(k => filteredKeys.includes(k)), 
      ...filteredKeys.filter(k => !priorityOrder.includes(k))
    ];
    
    // Initialize visible columns - show the most useful ones by default
    if (visibleColumns.size === 0) {
      const defaultVisible = orderedKeys.slice(0, 7);
      setVisibleColumns(new Set(defaultVisible));
    }
    
    return orderedKeys.map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      sortable: true,
      width: key === 'description' ? 280 : key === 'name' ? 200 : key === 'address' ? 220 : 130,
      format: (value: unknown) => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'number') {
          // Format confidence as percentage
          if (key === 'confidence' && value <= 1) return `${(value * 100).toFixed(0)}%`;
          return value.toLocaleString();
        }
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
      },
    }));
  }, [features]);
  
  // Build row data with coordinates and source links
  const rowData = useMemo(() => {
    return features.map((f, idx) => {
      const coords = f.geometry?.coordinates || [0, 0];
      const lat = f.geometry?.type === 'Point' ? (coords as number[])[1] : 0;
      const lng = f.geometry?.type === 'Point' ? (coords as number[])[0] : 0;
      
      // Get source info for links
      const sourceInfo = findSourceInfo(f.properties.source || '');
      const sourceUrl = f.properties.source_url || f.properties.url || sourceInfo?.website_url;
      
      return {
        _id: idx,
        _feature: f,
        _lat: lat,
        _lng: lng,
        _sourceUrl: sourceUrl,
        _sourceInfo: sourceInfo,
        ...f.properties,
      };
    });
  }, [features]);
  
  // Filter and sort data
  const processedData = useMemo(() => {
    let data = [...rowData];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(query)
        )
      );
    }
    
    // Apply sorting
    if (sortColumn && sortDirection) {
      data.sort((a, b) => {
        const aVal = a[sortColumn] ?? '';
        const bVal = b[sortColumn] ?? '';
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return data;
  }, [rowData, searchQuery, sortColumn, sortDirection]);
  
  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  
  const toggleColumn = (key: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleColumns(newVisible);
  };
  
  const visibleColumnsList = columns.filter(c => visibleColumns.has(c.key));
  
  return (
    <div className={cn("flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex-none flex items-center gap-2 p-3 border-b border-border bg-secondary/30">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-8 h-9 bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Columns className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-auto">
            {columns.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <button
              onClick={() => onExport?.('xlsx')}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-success" />
              Export to Excel (.xlsx)
            </button>
            <button
              onClick={() => onExport?.('csv')}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md"
            >
              <Filter className="w-4 h-4 text-primary" />
              Export to CSV
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="text-xs text-muted-foreground ml-2">
          {processedData.length.toLocaleString()} records
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-secondary">
              <th className="w-12 p-2 text-center font-semibold text-muted-foreground border-r border-border/50">
                #
              </th>
              {visibleColumnsList.map(col => (
                <th
                  key={col.key}
                  className="p-2 text-left font-semibold text-foreground border-r border-border/50 last:border-r-0"
                  style={{ minWidth: col.width }}
                >
                  <button
                    onClick={() => col.sortable && handleSort(col.key)}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <span>{col.label}</span>
                    {col.sortable && (
                      sortColumn === col.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                      )
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                onClick={() => onRowClick?.(row._feature)}
                className={cn(
                  "border-b border-border/30 hover:bg-accent/50 transition-colors cursor-pointer",
                  idx % 2 === 0 ? "bg-background" : "bg-secondary/20"
                )}
              >
                <td className="p-2 text-center text-xs text-muted-foreground font-mono border-r border-border/30">
                  {(currentPage - 1) * pageSize + idx + 1}
                </td>
                {visibleColumnsList.map(col => (
                  <td
                    key={col.key}
                    className="p-2 text-foreground border-r border-border/30 last:border-r-0 truncate max-w-[300px]"
                    title={col.format?.(row[col.key]) || String(row[col.key] || '')}
                  >
                    {col.key === 'category' ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {col.format?.(row[col.key])}
                      </span>
                    ) : col.key === 'source' ? (
                      <div className="flex items-center gap-1.5">
                        {row._sourceInfo?.logo_emoji && (
                          <span className="text-sm">{row._sourceInfo.logo_emoji}</span>
                        )}
                        <span className="text-sm">{col.format?.(row[col.key])}</span>
                        {row._sourceUrl && (
                          <a
                            href={row._sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title="Visit source"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : col.key === 'confidence' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[60px]">
                          <div 
                            className="h-full bg-success rounded-full" 
                            style={{ width: `${(row[col.key] || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {((row[col.key] || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm">{col.format?.(row[col.key])}</span>
                    )}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {paginatedData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Filter className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No records found</p>
            <p className="text-sm mt-1">Try adjusting your search query</p>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex-none flex items-center justify-between p-3 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {[25, 50, 100, 200, 500].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">
            {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, processedData.length).toLocaleString()} of {processedData.length.toLocaleString()}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-xs font-medium px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
