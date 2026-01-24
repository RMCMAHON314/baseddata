// OMNISCIENT - Universal Data Pipeline
// Clean unified architecture

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Omniscient from "./pages/Omniscient";
import Health from "./pages/Health";
import GapFixer from "./pages/GapFixer";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Analytics from "./pages/Analytics";
import ApiDocs from "./pages/ApiDocs";
import EntityProfilePage from "./pages/EntityProfilePage";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import Diagnostic from "./pages/Diagnostic";
import Explorer from "./pages/Explorer";
import FileExplorer from "./pages/FileExplorer";
import DataSources from "./pages/DataSources";
import RelationshipGraph from "./pages/RelationshipGraph";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Omniscient />} />
            <Route path="/health" element={<Health />} />
            <Route path="/gap-fixer" element={<GapFixer />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/entity/:id" element={<EntityProfilePage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/files" element={<FileExplorer />} />
            <Route path="/sources" element={<DataSources />} />
            <Route path="/graph" element={<RelationshipGraph />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
