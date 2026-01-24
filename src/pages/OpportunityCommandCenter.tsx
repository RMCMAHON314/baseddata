// BASED DATA - Opportunity Command Center
// Real-time opportunity tracking with urgency indicators and calendar view
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Clock, Calendar, List, Grid3X3, Filter, Search, AlertTriangle,
  ExternalLink, Building2, DollarSign, FileText, ChevronRight, Timer, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';

interface Opportunity {
  id: string;
  title: string | null;
  description: string | null;
  department: string | null;
  response_deadline: string | null;
  posted_date: string | null;
  award_ceiling: number | null;
  set_aside_code: string | null;
  naics_code: string | null;
  psc_code: string | null;
  place_of_performance_state: string | null;
  notice_id: string | null;
  sam_url: string | null;
  is_active: boolean | null;
}

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-white', bgColor: 'bg-destructive' },
  high: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Soon', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  low: { label: 'Open', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

const SET_ASIDES = [
  { value: 'all', label: 'All Set-Asides' },
  { value: 'SBA', label: 'Small Business' },
  { value: '8A', label: '8(a)' },
  { value: 'SDVOSBC', label: 'SDVOSB' },
  { value: 'WOSB', label: 'WOSB' },
  { value: 'HZC', label: 'HUBZone' },
  { value: 'NONE', label: 'Unrestricted' },
];

const AGENCIES = [
  'Department of Defense', 'Department of Health and Human Services', 
  'Department of Homeland Security', 'Department of Veterans Affairs',
  'General Services Administration', 'Department of Energy'
];

export default function OpportunityCommandCenter() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetAside, setFilterSetAside] = useState('all');
  const [filterDeadline, setFilterDeadline] = useState('all');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true)
      .gt('response_deadline', new Date().toISOString())
      .order('response_deadline', { ascending: true })
      .limit(100);

    if (!error && data) {
      setOpportunities(data);
    }
    setLoading(false);
  };

  const getUrgencyLevel = (deadline: string | null): UrgencyLevel => {
    if (!deadline) return 'low';
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'critical';
    if (days <= 14) return 'high';
    if (days <= 30) return 'medium';
    return 'low';
  };

  const getDaysUntil = (deadline: string | null): string => {
    if (!deadline) return 'No deadline';
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Due today!';
    if (days === 1) return '1 day left';
    if (days < 0) return 'Expired';
    return `${days} days left`;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'TBD';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter opportunities
  const filteredOpps = opportunities.filter(opp => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!opp.title?.toLowerCase().includes(q) && 
          !opp.description?.toLowerCase().includes(q) &&
          !opp.department?.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Set-aside filter
    if (filterSetAside !== 'all' && opp.set_aside_code !== filterSetAside) {
      return false;
    }

    // Deadline filter
    if (filterDeadline !== 'all') {
      const urgency = getUrgencyLevel(opp.response_deadline);
      if (filterDeadline === 'week' && urgency !== 'critical') return false;
      if (filterDeadline === 'month' && urgency === 'low') return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: filteredOpps.length,
    critical: filteredOpps.filter(o => getUrgencyLevel(o.response_deadline) === 'critical').length,
    totalValue: filteredOpps.reduce((sum, o) => sum + (o.award_ceiling || 0), 0),
  };

  // Calendar data
  const calendarData = filteredOpps.reduce((acc, opp) => {
    if (opp.response_deadline) {
      const date = opp.response_deadline.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(opp);
    }
    return acc;
  }, {} as Record<string, Opportunity[]>);

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-gradient-to-r from-card via-card to-orange-50">
          <div className="container py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Opportunity Command Center
                </h1>
                <p className="text-muted-foreground">Track and respond to active opportunities</p>
              </div>

              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
                    <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
                    <TabsTrigger value="calendar"><Calendar className="h-4 w-4" /></TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </Card>
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Est. Total Value</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Tracking</p>
                <p className="text-2xl font-bold">24/7</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities..."
                className="pl-9"
              />
            </div>

            <Select value={filterDeadline} onValueChange={setFilterDeadline}>
              <SelectTrigger className="w-40">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deadlines</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSetAside} onValueChange={setFilterSetAside}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SET_ASIDES.map(sa => (
                  <SelectItem key={sa.value} value={sa.value}>{sa.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredOpps.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Opportunities</h3>
              <p className="text-muted-foreground">Check back later or adjust your filters</p>
            </Card>
          ) : viewMode === 'calendar' ? (
            <CalendarView opportunities={filteredOpps} onSelect={setSelectedOpp} />
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {filteredOpps.map((opp, index) => (
                <OpportunityCard 
                  key={opp.id} 
                  opportunity={opp} 
                  index={index}
                  onClick={() => setSelectedOpp(opp)}
                  getUrgencyLevel={getUrgencyLevel}
                  getDaysUntil={getDaysUntil}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            {selectedOpp && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="text-xl">{selectedOpp.title || 'Untitled Opportunity'}</DialogTitle>
                    <Badge className={URGENCY_CONFIG[getUrgencyLevel(selectedOpp.response_deadline)].bgColor}>
                      <Timer className="h-3 w-3 mr-1" />
                      {getDaysUntil(selectedOpp.response_deadline)}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Award Ceiling</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(selectedOpp.award_ceiling)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="text-xl font-bold">{formatDate(selectedOpp.response_deadline)}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <DetailRow label="Department" value={selectedOpp.department} />
                    <DetailRow label="Set-Aside" value={selectedOpp.set_aside_code} />
                    <DetailRow label="NAICS" value={selectedOpp.naics_code} />
                    <DetailRow label="PSC" value={selectedOpp.psc_code} />
                    <DetailRow label="Location" value={selectedOpp.place_of_performance_state} />
                    <DetailRow label="Posted" value={formatDate(selectedOpp.posted_date)} />
                    <DetailRow label="Notice ID" value={selectedOpp.notice_id} />
                  </div>

                  {/* Description */}
                  {selectedOpp.description && (
                    <div>
                      <p className="text-sm font-medium mb-2">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedOpp.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {selectedOpp.sam_url && (
                      <a href={selectedOpp.sam_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button className="w-full btn-omni">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on SAM.gov
                        </Button>
                      </a>
                    )}
                    <Button variant="outline">
                      Track Opportunity
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </GlobalLayout>
  );
}

// Opportunity Card Component
interface OppCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: () => void;
  getUrgencyLevel: (deadline: string | null) => UrgencyLevel;
  getDaysUntil: (deadline: string | null) => string;
  formatCurrency: (value: number | null | undefined) => string;
}

function OpportunityCard({ opportunity, index, onClick, getUrgencyLevel, getDaysUntil, formatCurrency }: OppCardProps) {
  const urgency = getUrgencyLevel(opportunity.response_deadline);
  const config = URGENCY_CONFIG[urgency];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card 
        className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 ${urgency === 'critical' ? 'border-destructive/50' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge className={`${config.bgColor} ${config.color}`}>
            <Timer className="h-3 w-3 mr-1" />
            {getDaysUntil(opportunity.response_deadline)}
          </Badge>
          {opportunity.set_aside_code && (
            <Badge variant="outline">{opportunity.set_aside_code}</Badge>
          )}
        </div>

        <h3 className="font-semibold line-clamp-2 mb-2">{opportunity.title || 'Untitled'}</h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {opportunity.department}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold font-mono text-primary">
            {formatCurrency(opportunity.award_ceiling)}
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {opportunity.naics_code && (
          <Badge variant="secondary" className="mt-2 text-xs font-mono">{opportunity.naics_code}</Badge>
        )}
      </Card>
    </motion.div>
  );
}

// Calendar View Component
interface CalendarViewProps {
  opportunities: Opportunity[];
  onSelect: (opp: Opportunity) => void;
}

function CalendarView({ opportunities, onSelect }: CalendarViewProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  const oppsByDate = opportunities.reduce((acc, opp) => {
    if (opp.response_deadline) {
      const date = new Date(opp.response_deadline);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const day = date.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(opp);
      }
    }
    return acc;
  }, {} as Record<number, Opportunity[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const opps = oppsByDate[day] || [];
            const isToday = day === today.getDate();
            
            return (
              <div 
                key={day} 
                className={`p-2 min-h-24 border rounded-lg ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {opps.slice(0, 3).map(opp => (
                    <button
                      key={opp.id}
                      onClick={() => onSelect(opp)}
                      className="w-full text-left text-xs p-1 rounded bg-primary/10 text-primary truncate hover:bg-primary/20 transition-colors"
                    >
                      {opp.title?.slice(0, 20) || 'Opp'}
                    </button>
                  ))}
                  {opps.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{opps.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Detail Row Component
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
