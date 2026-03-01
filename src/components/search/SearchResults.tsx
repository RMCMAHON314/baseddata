import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Building2, FileText, Award, Briefcase, MapPin, Calendar, ChevronRight,
  DollarSign, Eye, Search, TrendingUp, Sparkles
} from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  result_type: 'entity' | 'contract' | 'grant' | 'opportunity';
  entity_type?: string;
  entity_id?: string;
  agency?: string;
  state?: string;
  city?: string;
  value?: number;
  grant_value?: number;
  opportunity_score?: number;
  description?: string;
  deadline?: string;
  set_aside?: string;
  relevance?: number;
  start_date?: string;
  end_date?: string;
  naics?: string;
  title?: string;
}

interface Insight {
  type: string;
  icon: string;
  title: string;
  description: string;
  priority: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  insights: Insight[];
  query: string;
  onSuggestionClick: (q: string) => void;
}

const ICONS: Record<string, typeof Building2> = {
  entity: Building2, contract: FileText, grant: Award, opportunity: Briefcase,
};

const TYPE_STYLES: Record<string, string> = {
  entity: 'bg-violet-500/10 text-violet-600 border-violet-200',
  contract: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  grant: 'bg-amber-500/10 text-amber-600 border-amber-200',
  opportunity: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

function fmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function getLink(r: SearchResult) {
  if (r.result_type === 'entity') return `/entity/${r.id}`;
  if (r.entity_id) return `/entity/${r.entity_id}`;
  return '#';
}

function ResultCard({ r }: { r: SearchResult }) {
  const Icon = ICONS[r.result_type] || FileText;
  const style = TYPE_STYLES[r.result_type] || '';

  return (
    <Link to={getLink(r)}>
      <Card className="hover:bg-muted/30 transition-all cursor-pointer border-border/60 hover:border-primary/20 hover:shadow-md group">
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.split(' ')[0] || 'bg-muted'}`}>
            <Icon className={`w-4.5 h-4.5 ${style.split(' ')[1] || 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{r.name}</h3>
              <Badge variant="outline" className={`text-[10px] capitalize px-1.5 py-0 ${style}`}>{r.result_type}</Badge>
              {r.set_aside && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.set_aside}</Badge>}
            </div>
            {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
            {r.agency && <p className="text-xs text-muted-foreground mt-0.5 font-medium">{r.agency}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              {r.state && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {r.city ? `${r.city}, ` : ''}{r.state}</span>}
              {r.deadline && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> Due {new Date(r.deadline).toLocaleDateString()}</span>}
              {r.naics && <span className="flex items-center gap-0.5"><span className="font-mono">NAICS {r.naics}</span></span>}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            {r.value != null && r.value > 0 && <span className="text-sm font-bold text-primary font-mono">{fmt(r.value)}</span>}
            {r.opportunity_score != null && r.opportunity_score >= 50 && (
              <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] px-1.5 py-0 border-0">
                <TrendingUp className="w-3 h-3 mr-0.5" /> {r.opportunity_score}
              </Badge>
            )}
            {/* Quick Preview */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.preventDefault()}>
                  <Eye className="w-3 h-3 mr-1" /> Preview
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" side="left" onClick={e => e.stopPropagation()}>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{r.name}</h4>
                  <Badge variant="outline" className={`text-[10px] capitalize ${style}`}>{r.result_type}</Badge>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  {r.agency && <p className="text-xs"><span className="font-medium">Agency:</span> {r.agency}</p>}
                  {r.state && <p className="text-xs"><span className="font-medium">Location:</span> {r.city ? `${r.city}, ` : ''}{r.state}</p>}
                  {r.value != null && r.value > 0 && <p className="text-xs"><span className="font-medium">Value:</span> {fmt(r.value)}</p>}
                  {r.start_date && <p className="text-xs"><span className="font-medium">Period:</span> {r.start_date} — {r.end_date || 'Present'}</p>}
                  <Link to={getLink(r)} className="text-xs text-primary font-medium hover:underline block mt-2">View full details →</Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function SearchResults({ results, insights, query, onSuggestionClick }: SearchResultsProps) {
  const entities = results.filter(r => r.result_type === 'entity');
  const contracts = results.filter(r => r.result_type === 'contract');
  const grants = results.filter(r => r.result_type === 'grant');
  const opportunities = results.filter(r => r.result_type === 'opportunity');

  // "All" tab shows top 5 from each
  const allPreview = [
    ...entities.slice(0, 5),
    ...contracts.slice(0, 5),
    ...grants.slice(0, 5),
    ...opportunities.slice(0, 5),
  ].sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <Search className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No results for "{query}"</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-6">Try different keywords or broaden your search</p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Try searching for:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['IT services Virginia', 'Healthcare grants NIH', 'Cybersecurity DoD', 'Small business Maryland'].map(s => (
              <Badge key={s} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onSuggestionClick(s)}>
                <Sparkles className="w-3 h-3 mr-1" /> {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'all', label: 'All', count: results.length },
    { value: 'entities', label: 'Entities', count: entities.length },
    { value: 'contracts', label: 'Contracts', count: contracts.length },
    { value: 'grants', label: 'Grants', count: grants.length },
    { value: 'opportunities', label: 'Opportunities', count: opportunities.length },
  ].filter(t => t.value === 'all' || t.count > 0);

  return (
    <div>
      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {insights.map((insight, i) => (
            <div key={i} className={`card-premium p-3 flex items-start gap-3 ${insight.priority === 'high' ? 'border-l-4 border-l-primary' : ''}`}>
              <span className="text-xl">{insight.icon}</span>
              <div>
                <p className="font-medium text-sm text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="bg-muted/50 mb-4">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-sm gap-1.5">
              {t.label}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{t.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {allPreview.map(r => <ResultCard key={`${r.result_type}-${r.id}`} r={r} />)}
        </TabsContent>

        <TabsContent value="entities" className="space-y-2">
          {entities.map(r => <ResultCard key={r.id} r={r} />)}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-2">
          {contracts.map(r => <ResultCard key={r.id} r={r} />)}
        </TabsContent>

        <TabsContent value="grants" className="space-y-2">
          {grants.map(r => <ResultCard key={r.id} r={r} />)}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-2">
          {opportunities.map(r => <ResultCard key={r.id} r={r} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
