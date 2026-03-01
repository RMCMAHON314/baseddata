// BASED DATA - Global Layout with Full Navigation - SHIP IT EDITION
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Building2, Target, BarChart3, Menu, X,
  Bell, User, LogOut, Bookmark, GitCompare,
  ChevronRight, Database, FileText, Compass, Brain, Beaker, DollarSign,
  GraduationCap, Heart, Shield, Wrench, Activity, Gauge,
  Download as InstallIcon, Key, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { AiAssistant } from '@/components/ai/AiAssistant';
import { DataFreshnessIndicator } from '@/components/layout/DataFreshnessIndicator';
import { useIsAdmin } from '@/components/layout/AdminRoute';
import { useAuth } from '@/contexts/AuthContext';

const PRIMARY_NAV = [
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/entities', label: 'Entities', icon: Building2 },
  { path: '/opportunities', label: 'Opportunities', icon: Target },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/intelligence', label: 'Intelligence', icon: Brain },
];

const SECONDARY_NAV = [
  { path: '/sbir', label: 'SBIR Explorer', icon: Beaker },
  { path: '/healthcare', label: 'Healthcare', icon: Heart },
  { path: '/education', label: 'Education', icon: GraduationCap },
  { path: '/labor-rates', label: 'Labor Rates', icon: DollarSign },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/saved-searches', label: 'Saved Searches', icon: Bookmark },
];

const ADMIN_NAV = [
  { path: '/admin', label: 'Admin Panel', icon: Shield },
  { path: '/ocean', label: 'Pipeline', icon: Database },
  { path: '/health', label: 'Health', icon: Activity },
  { path: '/diagnostic', label: 'Diagnostic', icon: Gauge },
  { path: '/gap-fixer', label: 'Gap Fixer', icon: Wrench },
];

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

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
      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium">
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between px-4 gap-4">
          <Link to="/" className="flex items-center shrink-0">
            <Logo />
          </Link>

          {/* Primary Nav */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary navigation">
            {PRIMARY_NAV.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link key={item.path} to={item.path}>
                  <Button variant="ghost" size="sm" className={`gap-1.5 text-sm ${isActive ? 'text-primary border-b-2 border-primary rounded-none' : 'text-muted-foreground'}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                  </Button>
                </Link>
              );
            })}

            {/* More dropdown for secondary nav */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm text-muted-foreground gap-1">
                  More <ChevronRight className="h-3 w-3 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Industry Verticals</DropdownMenuLabel>
                {SECONDARY_NAV.map(item => (
                  <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                    <item.icon className="mr-2 h-4 w-4" />{item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              onKeyDown={e => e.key === 'Enter' && searchQuery && navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
              aria-label="Search entities"
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

          {/* Right — User menu */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="User menu"><User className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}><Database className="mr-2 h-4 w-4" />Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/saved-searches')}><Bookmark className="mr-2 h-4 w-4" />Saved Searches</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/api-docs')}><Key className="mr-2 h-4 w-4" />API Keys</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/install')}><InstallIcon className="mr-2 h-4 w-4" />Install App</DropdownMenuItem>
                </DropdownMenuGroup>

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Admin</DropdownMenuLabel>
                      {ADMIN_NAV.map(item => (
                        <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                          <item.icon className="mr-2 h-4 w-4" />{item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}

                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem className="text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate('/', { state: { authRequired: true } })}>
                    <User className="mr-2 h-4 w-4" />Sign In
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden border-t overflow-hidden">
              <nav className="container py-3 px-4 flex flex-col gap-1" aria-label="Mobile navigation">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider px-3 py-1">Main</p>
                {PRIMARY_NAV.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className="w-full justify-start gap-2 min-h-[44px]">
                      <item.icon className="h-4 w-4" />{item.label}
                    </Button>
                  </Link>
                ))}
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider px-3 py-1 mt-2">Verticals</p>
                {SECONDARY_NAV.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className="w-full justify-start gap-2 min-h-[44px]">
                      <item.icon className="h-4 w-4" />{item.label}
                    </Button>
                  </Link>
                ))}
                {isAdmin && (
                  <>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider px-3 py-1 mt-2">Admin</p>
                    {ADMIN_NAV.map(item => (
                      <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className="w-full justify-start gap-2 min-h-[44px]">
                          <item.icon className="h-4 w-4" />{item.label}
                        </Button>
                      </Link>
                    ))}
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Breadcrumbs */}
      {location.pathname !== '/' && (
        <div className="container">
          <Breadcrumbs />
        </div>
      )}

      <main id="main-content" className="flex-1" role="main">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-4">
          <span>Built in Baltimore 🦀 by Infinite Data Solutions</span>
          <DataFreshnessIndicator />
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/api-docs" className="hover:text-foreground transition-colors">API Docs</Link>
            <Link to="/health" className="hover:text-foreground transition-colors">Health</Link>
          </div>
        </div>
      </footer>

      <AiAssistant />
    </div>
  );
}
