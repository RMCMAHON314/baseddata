// BASED DATA - Saved Searches Page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronRight, Play, Trash2, Bell, BellOff, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function SavedSearches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: searches, isLoading } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Search deleted');
    },
  });

  const runSearch = (filters: any) => {
    if (!filters) { navigate('/explore'); return; }
    if (filters?.entity_id) { navigate(`/entity/${filters.entity_id}`); return; }
    const params = new URLSearchParams();
    // Support both old and new filter formats
    if (filters.state) params.set('state', filters.state);
    if (filters.agency) params.set('agency', filters.agency);
    if (filters.naics) params.set('naics', filters.naics);
    if (filters.setAside) params.set('setAside', filters.setAside);
    if (filters.keyword) params.set('keyword', filters.keyword);
    // Legacy support
    if (filters?.search || filters?.query) params.set('keyword', filters.search || filters.query || '');
    if (filters?.states?.length) params.set('state', filters.states[0]);
    navigate(`/explore?${params.toString()}`);
  };

  const formatFilters = (filters: any): string => {
    if (!filters) return 'No filters';
    const parts: string[] = [];
    if (filters.state) parts.push(`state=${filters.state}`);
    if (filters.agency) parts.push(`agency=${filters.agency}`);
    if (filters.naics) parts.push(`naics=${filters.naics}`);
    if (filters.setAside) parts.push(`set-aside=${filters.setAside}`);
    if (filters.keyword) parts.push(`keyword="${filters.keyword}"`);
    // Legacy
    if (filters.search || filters.query) parts.push(`"${filters.search || filters.query}"`);
    if (filters.states?.length) parts.push(`States: ${filters.states.join(', ')}`);
    if (filters.entity_id) parts.push('Entity watchlist');
    if (filters.businessTypes?.length) parts.push(`Types: ${filters.businessTypes.join(', ')}`);
    return parts.join(' · ') || 'All data';
  };

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Saved Searches</span>
          </nav>
        </div>

        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bookmark className="h-6 w-6 text-primary" />
              Saved Searches
            </h1>
            <p className="text-muted-foreground mt-1">Your saved searches and entity watchlists</p>
          </div>
        </div>

        <div className="container py-6">
          {!user ? (
            <Card className="p-12 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">Sign in to save searches</h3>
              <p className="text-sm text-muted-foreground">Create an account to save searches and set up alerts.</p>
            </Card>
          ) : isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : !searches?.length ? (
            <Card className="p-12 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No saved searches yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Use Market Explorer to create your first watchlist.</p>
              <Link to="/explore"><Button>Go to Market Explorer</Button></Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {searches.map(s => (
                <Card key={s.id} className="p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{s.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{formatFilters(s.filters)}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.created_at).toLocaleDateString()}</span>
                        {s.notify_on_change && <Badge variant="outline" className="text-xs gap-1"><Bell className="h-3 w-3" />Alerts on</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="default" size="sm" onClick={() => runSearch(s.filters)} className="gap-1.5">
                        <Play className="h-3 w-3" />Run
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete saved search?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{s.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
