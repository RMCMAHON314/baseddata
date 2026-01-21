import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileJson, Download, Share2, ArrowLeft } from "lucide-react";
import { DataTable } from "./DataTable";
import { InsightsPanel } from "./InsightsPanel";
import { Header } from "./Header";

interface ResultsDashboardProps {
  title: string;
  prompt: string;
  creditsUsed: number;
  data: any[];
  insights: any;
  onBack: () => void;
}

export function ResultsDashboard({ title, prompt, creditsUsed, data, insights, onBack }: ResultsDashboardProps) {
  const handleExportCSV = () => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify({ title, data, insights }, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />
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
                <h1 className="font-display text-2xl font-bold text-white lowercase">{title}</h1>
                <p className="text-sm text-white/50 lowercase">based on: "{prompt}"</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="pill" size="sm" className="lowercase">
                <Share2 className="w-4 h-4" />
                share
              </Button>
              <Button variant="pill" size="sm" className="lowercase">
                <Download className="w-4 h-4" />
                export
              </Button>
            </div>
          </motion.div>

          {/* Content grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main data table */}
            <div className="lg:col-span-2 space-y-4">
              <DataTable data={data} />
              
              {/* Export options */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-between gap-4 p-4 glass rounded-xl border border-white/10"
              >
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="lowercase" onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4" />
                    csv
                  </Button>
                  <Button variant="outline" size="sm" className="lowercase" onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4" />
                    excel
                  </Button>
                  <Button variant="outline" size="sm" className="lowercase" onClick={handleExportJSON}>
                    <FileJson className="w-4 h-4" />
                    json
                  </Button>
                </div>
                <span className="text-sm text-white/50 lowercase">
                  {creditsUsed} credits used
                </span>
              </motion.div>
            </div>

            {/* Sidebar with insights */}
            <div className="space-y-4">
              <InsightsPanel insights={insights} />
              
              {/* Generate more CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-xl p-5 border border-white/10 text-center"
              >
                <p className="text-sm text-white/50 mb-3 lowercase">need more data?</p>
                <Button variant="hero" className="w-full lowercase" onClick={onBack}>
                  generate another dataset
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
