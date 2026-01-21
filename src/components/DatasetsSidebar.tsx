// Based Data - Datasets Sidebar
// Sleek side panel showing all prior datasets

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Database, Calendar, FileText, ChevronRight, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Dataset {
  id: string;
  title: string | null;
  prompt: string;
  description: string | null;
  row_count: number | null;
  credits_used: number | null;
  status: string | null;
  created_at: string;
}

interface DatasetsSidebarProps {
  children: React.ReactNode;
  onSelectDataset?: (dataset: Dataset) => void;
}

export function DatasetsSidebar({ children, onSelectDataset }: DatasetsSidebarProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchDatasets();
    }
  }, [open, user]);

  const fetchDatasets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('id, title, prompt, description, row_count, credits_used, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasets = datasets.filter(d => 
    (d.title?.toLowerCase() || d.prompt.toLowerCase()).includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'complete': return 'bg-success';
      case 'processing': return 'bg-amber-500 animate-pulse';
      case 'failed': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        className="w-[400px] sm:w-[440px] bg-background border-l border-border p-0 overflow-hidden shadow-2xl"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Database className="w-5 h-5 text-primary" />
            My Datasets
          </SheetTitle>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto h-[calc(100vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium mb-1">No datasets yet</p>
              <p className="text-sm text-muted-foreground">
                Generate your first dataset to see it here
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {filteredDatasets.map((dataset, index) => (
                  <motion.button
                    key={dataset.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      onSelectDataset?.(dataset);
                      setOpen(false);
                    }}
                    className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-card transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(dataset.status)}`} />
                          <h3 className="font-semibold text-foreground truncate text-sm tracking-tight">
                            {dataset.title || dataset.prompt.slice(0, 50)}
                          </h3>
                        </div>
                        
                        {/* Description / Prompt preview */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {dataset.description || dataset.prompt}
                        </p>
                        
                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}
                          </span>
                          {dataset.row_count && dataset.row_count > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {dataset.row_count.toLocaleString()} rows
                            </span>
                          )}
                          {dataset.credits_used && dataset.credits_used > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                              {dataset.credits_used} credits
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1 flex-shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Footer stats */}
        {datasets.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border bg-background">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</span>
              <span>
                {datasets.reduce((acc, d) => acc + (d.row_count || 0), 0).toLocaleString()} total rows
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
