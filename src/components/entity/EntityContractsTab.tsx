// Entity Contracts Tab - Sortable table with contract history
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowUpDown, ChevronDown, Filter, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Contract {
  id: string;
  award_id: string | null;
  award_amount: number | null;
  award_date: string | null;
  awarding_agency: string | null;
  description: string | null;
  naics_code: string | null;
}

interface EntityContractsTabProps {
  entityId: string;
}

export function EntityContractsTab({ entityId }: EntityContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Contract>('award_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [agencies, setAgencies] = useState<string[]>([]);

  useEffect(() => {
    loadContracts();
  }, [entityId]);

  const loadContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('recipient_entity_id', entityId)
      .order('award_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setContracts(data);
      const uniqueAgencies = [...new Set(data.map(c => c.awarding_agency).filter(Boolean))] as string[];
      setAgencies(uniqueAgencies);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSort = (field: keyof Contract) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredContracts = contracts
    .filter(c => filterAgency === 'all' || c.awarding_agency === filterAgency)
    .filter(c => !searchQuery || c.description?.toLowerCase().includes(searchQuery.toLowerCase()) || c.award_id?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.award_amount || 0), 0);

  const exportCSV = () => {
    const headers = ['Award ID', 'Agency', 'Amount', 'Date', 'Description', 'NAICS'];
    const rows = filteredContracts.map(c => [
      c.award_id || '',
      c.awarding_agency || '',
      c.award_amount?.toString() || '',
      c.award_date || '',
      c.description || '',
      c.naics_code || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-${entityId}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterAgency} onValueChange={setFilterAgency}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {agencies.map(agency => (
                <SelectItem key={agency} value={agency}>{agency}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {filteredContracts.length} contracts • {formatCurrency(totalValue)} total
          </span>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-medium">
                  <button className="flex items-center gap-1" onClick={() => handleSort('award_id')}>
                    Award ID <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium">Agency</th>
                <th className="text-right p-4 font-medium">
                  <button className="flex items-center gap-1 ml-auto" onClick={() => handleSort('award_amount')}>
                    Amount <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium">
                  <button className="flex items-center gap-1" onClick={() => handleSort('award_date')}>
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium max-w-md">Description</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No contracts found
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => (
                  <motion.tr
                    key={contract.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-sm">{contract.award_id || '-'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{contract.awarding_agency || '-'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono font-semibold text-primary">
                        {formatCurrency(contract.award_amount)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{formatDate(contract.award_date)}</span>
                    </td>
                    <td className="p-4 max-w-md">
                      <p className="text-sm line-clamp-2">{contract.description || '-'}</p>
                      {contract.naics_code && (
                        <Badge variant="secondary" className="mt-1 text-xs font-mono">{contract.naics_code}</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {contract.award_id && (
                        <a
                          href={`https://www.usaspending.gov/award/${contract.award_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
