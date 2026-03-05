// BASED DATA - Government Contracting Intelligence Platform
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeBasedData } from "@/init/startup";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AppInterceptors } from "@/components/layout/AppInterceptors";

const AiAssistant = lazy(() => import("@/components/ai/AiAssistant"));

// Lazy-loaded pages
const Showcase = lazy(() => import("./pages/Showcase"));
const EntityIntelligenceHub = lazy(() => import("./pages/EntityIntelligenceHub"));
const MarketExplorer = lazy(() => import("./pages/MarketExplorer"));
const OpportunityCommandCenter = lazy(() => import("./pages/OpportunityCommandCenter"));
const AnalyticsCommandCenter = lazy(() => import("./pages/AnalyticsCommandCenter"));
const IntelligenceDashboard = lazy(() => import("./pages/IntelligenceDashboard"));
const SbirExplorer = lazy(() => import("./pages/SbirExplorer"));
const EntitiesList = lazy(() => import("./pages/EntitiesList"));
const SavedSearches = lazy(() => import("./pages/SavedSearches"));
const AgencyDeepDive = lazy(() => import("./pages/AgencyDeepDive"));
const EntityCompare = lazy(() => import("./pages/EntityCompare"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Admin = lazy(() => import("./pages/Admin"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const Health = lazy(() => import("./pages/Health"));
const GapFixer = lazy(() => import("./pages/GapFixer"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Search = lazy(() => import("./pages/Search"));
const OceanDashboard = lazy(() => import("./pages/OceanDashboard"));
const Healthcare = lazy(() => import("./pages/Healthcare"));
const Education = lazy(() => import("./pages/Education"));
const LaborRatesExplorer = lazy(() => import("./pages/LaborRatesExplorer"));
const Install = lazy(() => import("./pages/Install"));
const LaunchChecklist = lazy(() => import("./pages/LaunchChecklist"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const SubcontractorNetwork = lazy(() => import("./pages/SubcontractorNetwork"));
const RecompeteCalendar = lazy(() => import("./pages/RecompeteCalendar"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden relative">
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
      
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated chevron ring */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-1 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <span className="text-lg font-bold text-primary lowercase tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          based data
        </span>

        {/* Loading bar */}
        <div className="w-40 h-0.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading-slide_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

const App = () => {
  useEffect(() => {
    // Defer startup init so it doesn't block first paint (setTimeout fallback for Safari)
    const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => window.setTimeout(cb, 1) as unknown as number;
    const cic = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : (id: number) => clearTimeout(id);
    const id = ric(() => { initializeBasedData().catch(console.error); });
    return () => cic(id);
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppInterceptors />
              <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Showcase />} />
                  <Route path="/showcase" element={<Showcase />} />
                  <Route path="/explore" element={<MarketExplorer />} />
                  <Route path="/entities" element={<EntitiesList />} />
                  <Route path="/entity/:id" element={<EntityIntelligenceHub />} />
                  <Route path="/opportunities" element={<OpportunityCommandCenter />} />
                  <Route path="/analytics" element={<AnalyticsCommandCenter />} />
                  <Route path="/intelligence" element={<IntelligenceDashboard />} />
                  <Route path="/sbir" element={<SbirExplorer />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/healthcare" element={<Healthcare />} />
                  <Route path="/education" element={<Education />} />
                  <Route path="/labor-rates" element={<LaborRatesExplorer />} />
                  <Route path="/agency/:agencyName" element={<AgencyDeepDive />} />
                  <Route path="/health" element={<Health />} />
                  <Route path="/compare" element={<EntityCompare />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />

                  {/* Protected routes (require login) */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/saved-searches" element={<ProtectedRoute><SavedSearches /></ProtectedRoute>} />

                  {/* Admin-only routes */}
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  <Route path="/ocean" element={<AdminRoute><OceanDashboard /></AdminRoute>} />
                  <Route path="/diagnostic" element={<AdminRoute><Diagnostic /></AdminRoute>} />
                  <Route path="/gap-fixer" element={<AdminRoute><GapFixer /></AdminRoute>} />
                  <Route path="/admin/launch-checklist" element={<AdminRoute><LaunchChecklist /></AdminRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </ErrorBoundary>
              <Suspense fallback={null}><AiAssistant /></Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
