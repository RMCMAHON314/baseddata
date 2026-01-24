// BASED DATA - Saved Search Manager
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { Bookmark, Bell, Trash2, Plus, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  notify_on_change: boolean;
  schedule: string;
  created_at: string;
}

interface SavedSearchManagerProps {
  currentFilters?: Record<string, any>;
  onLoadSearch?: (filters: Record<string, any>) => void;
}

export function SavedSearchManager({ currentFilters = {}, onLoadSearch }: SavedSearchManagerProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    if (user) {
      loadSearches(user.id);
    } else {
      setLoading(false);
    }
  }

  async function loadSearches(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Transform data to match our interface
      const transformed: SavedSearch[] = data.map(item => ({
        id: item.id,
        name: item.name,
        filters: typeof item.filters === 'object' && item.filters !== null 
          ? item.filters as Record<string, any>
          : {},
        notify_on_change: item.notify_on_change || false,
        schedule: item.schedule || 'daily',
        created_at: item.created_at
      }));
      setSearches(transformed);
    }
    setLoading(false);
  }

  async function saveSearch() {
    if (!userId || !newSearchName.trim()) {
      toast.error('Please enter a name for your search');
      return;
    }

    const { error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name: newSearchName.trim(),
        query: JSON.stringify(currentFilters),
        filters: currentFilters,
        notify_on_change: alertEnabled,
        schedule: alertFrequency
      });

    if (error) {
      toast.error('Failed to save search');
    } else {
      toast.success('Search saved successfully');
      setSaveDialogOpen(false);
      setNewSearchName('');
      setAlertEnabled(false);
      loadSearches(userId);
    }
  }

  async function deleteSearch(id: string) {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete search');
    } else {
      toast.success('Search deleted');
      setSearches(searches.filter(s => s.id !== id));
    }
  }

  async function toggleNotify(id: string, enabled: boolean) {
    const { error } = await supabase
      .from('saved_searches')
      .update({ notify_on_change: enabled })
      .eq('id', id);

    if (!error) {
      setSearches(searches.map(s => 
        s.id === id ? { ...s, notify_on_change: enabled } : s
      ));
      toast.success(enabled ? 'Alerts enabled' : 'Alerts disabled');
    }
  }

  function formatFilters(filters: Record<string, any>): string {
    const parts: string[] = [];
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.states?.length) parts.push(`${filters.states.length} states`);
    if (filters.businessTypes?.length) parts.push(`${filters.businessTypes.length} business types`);
    if (filters.minValue) parts.push(`>${formatCurrency(filters.minValue)}`);
    return parts.join(' • ') || 'All results';
  }

  function formatCurrency(value: number): string {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  }

  if (!userId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sign in to save searches</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          Saved Searches
        </CardTitle>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Search</DialogTitle>
              <DialogDescription>
                Save your current filters to quickly access them later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Search Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., IT Contracts in Virginia"
                  value={newSearchName}
                  onChange={(e) => setNewSearchName(e.target.value)}
                />
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-sm font-medium mb-1">Current Filters</div>
                <div className="text-sm text-muted-foreground">
                  {formatFilters(currentFilters)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label htmlFor="alerts">Enable Alerts</Label>
                </div>
                <Switch
                  id="alerts"
                  checked={alertEnabled}
                  onCheckedChange={setAlertEnabled}
                />
              </div>
              {alertEnabled && (
                <div className="space-y-2">
                  <Label>Alert Frequency</Label>
                  <Select value={alertFrequency} onValueChange={setAlertFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSearch}>Save Search</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        ) : searches.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No saved searches yet</p>
            <p className="text-sm">Save your first search to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {searches.map((search, idx) => (
                <motion.div
                  key={search.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between gap-4"
                >
                  <div 
                    className="flex-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => onLoadSearch?.(search.filters)}
                  >
                    <div className="font-medium">{search.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {new Date(search.created_at).toLocaleDateString()}
                      <span>•</span>
                      {formatFilters(search.filters)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {search.notify_on_change && (
                      <Badge variant="secondary" className="gap-1">
                        <Bell className="h-3 w-3" />
                        {search.schedule}
                      </Badge>
                    )}
                    <Switch
                      checked={search.notify_on_change}
                      onCheckedChange={(checked) => toggleNotify(search.id, checked)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteSearch(search.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
