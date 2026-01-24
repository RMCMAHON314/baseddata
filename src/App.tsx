// BASED DATA - Government Contracting Intelligence Platform
// Self-improving intelligence organism with continuous enrichment

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeBasedData } from "@/init/startup";

// Pages
import Omniscient from "./pages/Omniscient";
import Health from "./pages/Health";
import GapFixer from "./pages/GapFixer";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import Diagnostic from "./pages/Diagnostic";
import FileExplorer from "./pages/FileExplorer";
import DataSources from "./pages/DataSources";
import RelationshipGraph from "./pages/RelationshipGraph";
import Search from "./pages/Search";
import Architecture from "./pages/Architecture";
import SemanTX from "./pages/SemanTX";
import OceanDashboard from "./pages/OceanDashboard";
import Showcase from "./pages/Showcase";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";

// Premium Pages
import EntityIntelligenceHub from "./pages/EntityIntelligenceHub";
import MarketExplorer from "./pages/MarketExplorer";
import OpportunityCommandCenter from "./pages/OpportunityCommandCenter";
import AnalyticsCommandCenter from "./pages/AnalyticsCommandCenter";
import EntitiesList from "./pages/EntitiesList";

// Vertical Intelligence
import Healthcare from "./pages/Healthcare";
import Education from "./pages/Education";

const queryClient = new QueryClient();

const App = () => {
  // Initialize BASED DATA intelligence systems on mount
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
            <Routes>
              <Route path="/" element={<Showcase />} />
              <Route path="/omniscient" element={<Omniscient />} />
              <Route path="/showcase" element={<Showcase />} />
              <Route path="/ocean" element={<OceanDashboard />} />
              
              {/* Premium Routes */}
              <Route path="/explore" element={<MarketExplorer />} />
              <Route path="/entities" element={<EntitiesList />} />
              <Route path="/entity/:id" element={<EntityIntelligenceHub />} />
              <Route path="/opportunities" element={<OpportunityCommandCenter />} />
              <Route path="/analytics" element={<AnalyticsCommandCenter />} />
              
              {/* Vertical Intelligence */}
              <Route path="/healthcare" element={<Healthcare />} />
              <Route path="/education" element={<Education />} />
              
              {/* Existing Routes */}
              <Route path="/health" element={<Health />} />
              <Route path="/gap-fixer" element={<GapFixer />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/diagnostic" element={<Diagnostic />} />
              <Route path="/files" element={<FileExplorer />} />
              <Route path="/sources" element={<DataSources />} />
              <Route path="/graph" element={<RelationshipGraph />} />
              <Route path="/search" element={<Search />} />
              <Route path="/architecture" element={<Architecture />} />
              <Route path="/semantx" element={<SemanTX />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
