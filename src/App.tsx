// BASED DATA - Government Contracting Intelligence Platform
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeBasedData } from "@/init/startup";
import { Skeleton } from "@/components/ui/skeleton";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Showcase />} />
                <Route path="/showcase" element={<Showcase />} />

                {/* Core Routes */}
                <Route path="/explore" element={<MarketExplorer />} />
                <Route path="/entities" element={<EntitiesList />} />
                <Route path="/entity/:id" element={<EntityIntelligenceHub />} />
                <Route path="/opportunities" element={<OpportunityCommandCenter />} />
                <Route path="/analytics" element={<AnalyticsCommandCenter />} />
                <Route path="/intelligence" element={<IntelligenceDashboard />} />
                <Route path="/sbir" element={<SbirExplorer />} />

                {/* New Routes */}
                <Route path="/saved-searches" element={<SavedSearches />} />
                <Route path="/agency/:agencyName" element={<AgencyDeepDive />} />
                <Route path="/compare" element={<EntityCompare />} />

                {/* Verticals */}
                <Route path="/healthcare" element={<Healthcare />} />
                <Route path="/education" element={<Education />} />
                <Route path="/labor-rates" element={<LaborRatesExplorer />} />

                {/* System */}
                <Route path="/ocean" element={<OceanDashboard />} />
                <Route path="/health" element={<Health />} />
                <Route path="/gap-fixer" element={<GapFixer />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/diagnostic" element={<Diagnostic />} />
                <Route path="/search" element={<Search />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
