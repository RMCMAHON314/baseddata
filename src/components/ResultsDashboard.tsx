import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileJson, Download, Share2, ArrowLeft } from "lucide-react";
import { DataTable } from "./DataTable";
import { InsightsPanel } from "./InsightsPanel";

interface ResultsDashboardProps {
  title: string;
  prompt: string;
  creditsUsed: number;
  onBack: () => void;
}

// Mock data for the demo
const mockData = [
  { company: "TechCo AI", sector: "AI/ML", raised: "$15M", employees: 42, founded: 2022 },
  { company: "PayFlow", sector: "FinTech", raised: "$11M", employees: 28, founded: 2021 },
  { company: "HealthSync", sector: "HealthTech", raised: "$18M", employees: 56, founded: 2020 },
  { company: "DataMesh", sector: "AI/ML", raised: "$9M", employees: 19, founded: 2023 },
  { company: "CloudScale", sector: "SaaS", raised: "$22M", employees: 67, founded: 2019 },
  { company: "SecureAuth", sector: "Cybersecurity", raised: "$14M", employees: 34, founded: 2021 },
  { company: "GreenEnergy", sector: "CleanTech", raised: "$25M", employees: 73, founded: 2020 },
  { company: "RetailAI", sector: "AI/ML", raised: "$8M", employees: 15, founded: 2023 },
];

const mockInsights = {
  totalRecords: 73,
  medianRaise: "$12M",
  topSectors: ["AI/ML (34%)", "FinTech (21%)", "HealthTech (18%)"],
  employeeRange: "< 50 employees",
};

export function ResultsDashboard({ title, prompt, creditsUsed, onBack }: ResultsDashboardProps) {
  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">Based on: "{prompt}"</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="pill" size="sm">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="pill" size="sm">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main data table */}
          <div className="lg:col-span-2 space-y-4">
            <DataTable data={mockData} />
            
            {/* Export options */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-between gap-4 p-4 glass rounded-xl border border-border/50"
            >
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm">
                  <FileJson className="w-4 h-4" />
                  JSON
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {creditsUsed} credits used
              </span>
            </motion.div>
          </div>

          {/* Sidebar with insights */}
          <div className="space-y-4">
            <InsightsPanel insights={mockInsights} />
            
            {/* Generate more CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass rounded-xl p-5 border border-border/50 text-center"
            >
              <p className="text-sm text-muted-foreground mb-3">Need more data?</p>
              <Button variant="hero" className="w-full" onClick={onBack}>
                Generate Another Dataset
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
