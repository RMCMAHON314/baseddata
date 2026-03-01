// BASED DATA - Government Contracting Intelligence Platform
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeBasedData } from "@/init/startup";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { AiAssistant } from "@/components/ai/AiAssistant";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-8">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

const App = () => {
  useEffect(() => {
    initializeBasedData().catch(console.error);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/healthcare" element={<Healthcare />} />
                  <Route path="/education" element={<Education />} />
                  <Route path="/labor-rates" element={<LaborRatesExplorer />} />
                  <Route path="/agency/:agencyName" element={<AgencyDeepDive />} />
                  <Route path="/health" element={<Health />} />
                  <Route path="/compare" element={<EntityCompare />} />

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
              <AiAssistant />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
