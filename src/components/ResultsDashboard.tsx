// Based Data - Results Dashboard Component
// Clean white theme with data table and insights

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileJson, Download, Share2, ArrowLeft, Database, Globe, Zap, Plus, Layers, GitMerge } from 'lucide-react';
import { DataTable } from './DataTable';
import { InsightsPanel } from './InsightsPanel';
import { Header } from './Header';
import type { DatasetInsights } from '@/types/dataset';

interface ResultsDashboardProps {
  title: string;
  prompt: string;
  creditsUsed: number;
  data: Record<string, any>[];
  insights: DatasetInsights;
  onBack: () => void;
}

export function ResultsDashboard({ 
  title, 
  prompt, 
  creditsUsed, 
  data, 
  insights, 
  onBack 
}: ResultsDashboardProps) {
  const handleExportCSV = () => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify({ title, data, insights }, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-card">
      {/* Fixed Header */}
      <header className="bg-background flex items-center justify-between px-8 py-5 border-b border-border">
        <button onClick={onBack} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-primary text-xl font-bold tracking-tight uppercase">BASED DATA</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-accent-foreground text-sm font-semibold">{100 - creditsUsed} credits</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground text-sm font-medium">My Datasets</button>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">R</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Title Row */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-success/10 text-success">Complete</span>
              <span className="text-sm text-muted-foreground">Generated just now</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{prompt}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" />
                {data.length} records
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {insights.totalRecords || 47} sources
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {creditsUsed} credits used
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* AI Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <InsightsPanel insights={insights} />
        </motion.div>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background rounded-2xl border border-border overflow-hidden"
        >
          <DataTable data={data} />
          
          {/* Export options in table footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <FileJson className="w-4 h-4" />
                JSON
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {creditsUsed} credits used
            </span>
          </div>
        </motion.div>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <Button variant="outline" onClick={onBack}>
            <Plus className="w-4 h-4" />
            New Dataset
          </Button>
          <Button variant="outline">
            <Layers className="w-4 h-4" />
            Enrich Data
          </Button>
          <Button variant="outline">
            <GitMerge className="w-4 h-4" />
            Merge Dataset
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
