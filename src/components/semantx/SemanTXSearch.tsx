import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building2, FileText, Briefcase, Zap, MapPin, Loader2, Sparkles } from 'lucide-react';

interface SearchResult {
  id: string;
  result_type: string;
  name: string;
  entity_type: string;
  state: string | null;
  city: string | null;
  value: number | null;
  score: number | null;
  description: string | null;
  relevance: number;
}

export function SemanTXSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, time: 0, value: 0 });
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const start = Date.now();
    try {
      const { data } = await supabase.rpc('semantx_search', { p_query: q, p_limit: 50 });
      const time = Date.now() - start;
      const value = (data || []).reduce((s: number, r: SearchResult) => s + (r.value || 0), 0);
      setResults(data || []);
      setStats({ total: data?.length || 0, time, value });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(e.target.value), 300);
  };

  const fmt = (n: number) => n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`;
  
  const icon = (t: string) => t === 'contract' 
    ? <FileText className="w-5 h-5 text-green-400" /> 
    : t === 'opportunity' 
      ? <Briefcase className="w-5 h-5 text-blue-400" /> 
      : <Building2 className="w-5 h-5 text-purple-400" />;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-1">
        <div className="flex items-center gap-2 px-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-purple-400 font-bold text-sm">SEMANTX</span>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            value={query} 
            onChange={handleInput} 
            placeholder="Search entities, contracts, opportunities..." 
            className="pl-10 py-3 bg-background border-none text-lg" 
          />
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-purple-400 mr-2" />}
      </div>

      {results.length > 0 && (
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span><Zap className="w-4 h-4 inline text-yellow-400" /> {stats.total} results in {stats.time}ms</span>
          {stats.value > 0 && <span className="text-green-400">{fmt(stats.value)} total value</span>}
        </div>
      )}

      {results.length > 0 && (
        <ScrollArea className="mt-4 max-h-[500px]">
          <div className="space-y-2">
            {results.map((r) => (
              <Link key={`${r.result_type}-${r.id}`} to={r.result_type === 'entity' ? `/entity/${r.id}` : '#'}>
                <Card className="bg-card border-border hover:border-purple-500/50 cursor-pointer transition-colors">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="mt-1">{icon(r.result_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{r.name}</h3>
                        <Badge variant="outline" className="text-xs">{r.result_type}</Badge>
                        {r.score && r.score >= 70 && <Badge className="bg-green-500/20 text-green-400 text-xs">Score: {r.score}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {r.entity_type !== r.result_type && <span>{r.entity_type?.replace('_', ' ')}</span>}
                        {(r.city || r.state) && <span><MapPin className="w-3 h-3 inline" /> {[r.city, r.state].filter(Boolean).join(', ')}</span>}
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-1">{r.description}</p>}
                    </div>
                    {r.value && r.value > 0 && <div className="text-right"><p className="text-lg font-bold text-green-400 font-mono">{fmt(r.value)}</p></div>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </ScrollArea>
      )}

      {!query && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Try searching:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['IT contractors Maryland', 'Healthcare Virginia', 'DoD cybersecurity', 'Small business', 'Lockheed Martin'].map(s => (
              <Badge 
                key={s} 
                variant="outline" 
                className="cursor-pointer hover:bg-purple-500/20 transition-colors" 
                onClick={() => { setQuery(s); search(s); }}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
