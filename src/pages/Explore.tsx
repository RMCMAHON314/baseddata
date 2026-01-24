import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Compass } from 'lucide-react';
import { ContractHeatmap } from '@/components/visualizations/ContractHeatmap';
import { AgencySpendingChart } from '@/components/visualizations/AgencySpendingChart';
import { ContractTimeline } from '@/components/visualizations/ContractTimeline';
import { EntitySpotlight } from '@/components/visualizations/EntitySpotlight';

export default function Explore() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/showcase">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3">
                <Compass className="w-8 h-8 text-primary" />
                <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                  Explore the Data
                </span>
              </h1>
              <p className="text-muted-foreground">Interactive visualizations of government intelligence</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/semantx">
              <Button variant="outline">Search</Button>
            </Link>
            <Link to="/graph">
              <Button variant="outline">Graph</Button>
            </Link>
            <Link to="/ocean">
              <Button>Ocean Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Entity Spotlight */}
        <div className="mb-8">
          <EntitySpotlight />
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <ContractTimeline />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ContractHeatmap />
          <AgencySpendingChart />
        </div>
      </div>
    </div>
  );
}
