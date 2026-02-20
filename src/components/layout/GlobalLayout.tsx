// BASED DATA - Global Layout with Navigation - FINAL FORM
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Building2, Target, BarChart3, Menu, X,
  Bell, User, LogOut, Settings, Bookmark, GitCompare,
  ChevronRight, Database, FileText, Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Database },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/entities', label: 'Entities', icon: Building2 },
  { path: '/opportunities', label: 'Opportunities', icon: Target },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const SECONDARY_NAV = [
  { path: '/saved-searches', label: 'Saved', icon: Bookmark },
  { path: '/compare', label: 'Compare', icon: GitCompare },
];

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state')
        .ilike('canonical_name', `%${query}%`)
        .order('total_contract_value', { ascending: false })
        .limit(6);
      setSearchResults(data || []);
      setShowSearchResults(true);
    }, 300);
  };

  const handleSearchSelect = (entityId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/entity/${entityId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between px-4 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-7 w-7" />
            <span className="font-bold text-lg hidden sm:block text-gradient-omni">BASED DATA</span>
          </Link>

          {/* Primary Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button variant="ghost" size="sm" className={`gap-1.5 text-sm ${isActive ? 'text-primary border-b-2 border-primary rounded-none' : 'text-muted-foreground'}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="w-px h-5 bg-border mx-1" />
            {SECONDARY_NAV.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button variant="ghost" size="sm" className={`gap-1.5 text-sm ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Global Search */}
          <div className="relative flex-1 max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search entities..."
              className="pl-9 h-9 bg-secondary/50 border-0 focus:ring-2 ring-primary/30 text-sm"
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              onKeyDown={e => e.key === 'Enter' && searchQuery && navigate(`/explore?q=${encodeURIComponent(searchQuery)}`)}
            />
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg overflow-hidden z-50"
                >
                  {searchResults.map(entity => (
                    <button key={entity.id} onClick={() => handleSearchSelect(entity.id)} className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/50 text-left text-sm">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entity.canonical_name}</p>
                        <p className="text-xs text-muted-foreground">{entity.entity_type} · {entity.state}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><User className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}><Database className="mr-2 h-4 w-4" />Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/saved-searches')}><Bookmark className="mr-2 h-4 w-4" />Saved Searches</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/api-docs')}><FileText className="mr-2 h-4 w-4" />API Docs</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden border-t overflow-hidden">
              <nav className="container py-3 px-4 flex flex-col gap-1">
                {[...NAV_ITEMS, ...SECONDARY_NAV].map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                      <item.icon className="h-4 w-4" />{item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Breadcrumbs on inner pages */}
      {location.pathname !== '/' && (
        <div className="container">
          <Breadcrumbs />
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Built in Baltimore 🦀 by Infinite Data Solutions</span>
          <span>Powered by USASpending.gov, SAM.gov, NIH, NSF data</span>
        </div>
      </footer>
    </div>
  );
}
