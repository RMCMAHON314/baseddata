import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import debounce from 'lodash/debounce';
import {
  Search, Building2, FileText, Award, Briefcase, FlaskConical, Hash,
  Loader2, ArrowRight, Clock, Sparkles, X
} from 'lucide-react';

interface Suggestion {
  id: string;
  name: string;
  type: 'entity' | 'contract' | 'grant' | 'opportunity' | 'sbir' | 'naics';
  metric?: string;
  icon: typeof Building2;
}

interface SearchAutocompleteProps {
  initialQuery: string;
  recentSearches: string[];
  onSearch: (query: string) => void;
  onNLQuery?: (query: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Building2; label: string; color: string }> = {
  entity: { icon: Building2, label: 'Entities', color: 'text-violet-500' },
  contract: { icon: FileText, label: 'Contracts', color: 'text-emerald-500' },
  grant: { icon: Award, label: 'Grants', color: 'text-amber-500' },
  opportunity: { icon: Briefcase, label: 'Opportunities', color: 'text-blue-500' },
  sbir: { icon: FlaskConical, label: 'SBIR Awards', color: 'text-rose-500' },
  naics: { icon: Hash, label: 'NAICS Codes', color: 'text-cyan-500' },
};

function fmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function SearchAutocomplete({ initialQuery, recentSearches, onSearch, onNLQuery }: SearchAutocompleteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) { setSuggestions([]); setLoading(false); return; }
      setLoading(true);
      try {
        const term = `%${q}%`;
        const [entities, contracts, grants, opps, sbirs] = await Promise.all([
          supabase.from('core_entities').select('id, canonical_name, total_contract_value').ilike('canonical_name', term).order('total_contract_value', { ascending: false, nullsFirst: false }).limit(4),
          supabase.from('contracts').select('id, recipient_name, award_amount, description').or(`recipient_name.ilike.${term},description.ilike.${term}`).order('award_amount', { ascending: false, nullsFirst: false }).limit(3),
          supabase.from('grants').select('id, recipient_name, award_amount, project_title').or(`recipient_name.ilike.${term},project_title.ilike.${term}`).order('award_amount', { ascending: false, nullsFirst: false }).limit(3),
          supabase.from('opportunities').select('id, title, award_ceiling').eq('is_active', true).ilike('title', term).order('response_deadline', { ascending: true }).limit(3),
          supabase.from('sbir_awards').select('id, firm, award_title, award_amount').or(`firm.ilike.${term},award_title.ilike.${term}`).order('award_amount', { ascending: false, nullsFirst: false }).limit(3),
        ]);

        const results: Suggestion[] = [];
        (entities.data || []).forEach(e => results.push({ id: e.id, name: e.canonical_name, type: 'entity', metric: e.total_contract_value ? fmt(e.total_contract_value) : undefined, icon: Building2 }));
        (contracts.data || []).forEach(c => results.push({ id: c.id, name: c.recipient_name + (c.description ? ` — ${c.description.slice(0, 60)}` : ''), type: 'contract', metric: c.award_amount ? fmt(c.award_amount) : undefined, icon: FileText }));
        (grants.data || []).forEach(g => results.push({ id: g.id, name: g.project_title || g.recipient_name, type: 'grant', metric: g.award_amount ? fmt(g.award_amount) : undefined, icon: Award }));
        (opps.data || []).forEach(o => results.push({ id: o.id, name: o.title, type: 'opportunity', metric: o.award_ceiling ? fmt(o.award_ceiling) : undefined, icon: Briefcase }));
        (sbirs.data || []).forEach(s => results.push({ id: s.id, name: `${s.firm} — ${(s.award_title || '').slice(0, 50)}`, type: 'sbir', metric: s.award_amount ? fmt(s.award_amount) : undefined, icon: FlaskConical }));

        setSuggestions(results);
        setSelectedIdx(-1);
      } catch (err) {
        console.error('Autocomplete error:', err);
      } finally {
        setLoading(false);
      }
    }, 200),
    []
  );

  useEffect(() => {
    if (query.length >= 2) {
      setOpen(true);
      fetchSuggestions(query);
    } else {
      setSuggestions([]);
      if (query.length === 0 && document.activeElement === inputRef.current) setOpen(true);
    }
  }, [query, fetchSuggestions]);

  const handleSelect = (s: Suggestion) => {
    setOpen(false);
    if (s.type === 'entity') navigate(`/entity/${s.id}`);
    else if (s.type === 'sbir') navigate(`/sbir`);
    else onSearch(s.name.split(' — ')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    // Detect NL queries (contains verbs/complex phrases)
    const isNL = /\b(show|find|list|get|companies|who|what|which|more than|less than|between)\b/i.test(query);
    if (isNL && onNLQuery) onNLQuery(query);
    else onSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions.length > 0 ? suggestions : [];
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && selectedIdx >= 0 && items[selectedIdx]) { e.preventDefault(); handleSelect(items[selectedIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  // Group suggestions by type
  const grouped = suggestions.reduce<Record<string, Suggestion[]>>((acc, s) => {
    (acc[s.type] = acc[s.type] || []).push(s);
    return acc;
  }, {});

  const showRecent = open && query.length === 0 && recentSearches.length > 0;
  const showSuggestions = open && suggestions.length > 0;

  let flatIdx = -1;

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search contracts, entities, grants, opportunities..."
          className="pl-14 pr-32 h-14 text-base rounded-2xl border-border shadow-lg focus-visible:ring-2 focus-visible:ring-primary/30 bg-card"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query && (
            <button type="button" onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          ) : (
            <button type="submit" disabled={!query.trim()}
              className="btn-omni px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50">
              Search <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {(showSuggestions || showRecent) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <ScrollArea className="max-h-[420px]">
            {showRecent && (
              <div className="p-3">
                <p className="text-xs text-muted-foreground font-medium px-2 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Recent Searches
                </p>
                {recentSearches.slice(0, 5).map(s => (
                  <button key={s} onClick={() => { setQuery(s); onSearch(s); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted flex items-center gap-2 text-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {s}
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type];
              if (!config) return null;
              return (
                <div key={type} className="border-t border-border first:border-t-0">
                  <p className={`text-xs font-medium px-4 pt-3 pb-1 flex items-center gap-1.5 ${config.color}`}>
                    <config.icon className="w-3.5 h-3.5" /> {config.label}
                  </p>
                  {items.map(s => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <button key={`${s.type}-${s.id}`} onClick={() => handleSelect(s)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${idx === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <s.icon className={`w-4 h-4 shrink-0 ${config.color}`} />
                        <span className="flex-1 truncate text-foreground">{s.name}</span>
                        {s.metric && <span className="text-xs font-mono font-semibold text-primary shrink-0">{s.metric}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {query.length >= 3 && (
              <div className="border-t border-border p-2">
                <button onClick={handleSubmit as any}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted flex items-center gap-2 text-primary font-medium">
                  <Sparkles className="w-4 h-4" /> Search all for "{query}"
                </button>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
