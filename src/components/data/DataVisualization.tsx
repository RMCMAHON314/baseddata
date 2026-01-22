// BASED DATA v6.0 - Comprehensive Data Visualization Suite
// 15/10 visualization of ALL data with charts, breakdowns, and insights

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
  Database, Globe, Layers, TrendingUp, Clock, Sparkles,
  MapPin, Tag, BarChart3, Activity, Zap, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';

interface DataVisualizationProps {
  features: GeoJSONFeature[];
  className?: string;
}

// Category color palette
const CATEGORY_COLORS: Record<string, string> = {
  WILDLIFE: 'hsl(142, 76%, 36%)',
  WEATHER: 'hsl(206, 100%, 50%)',
  MARINE: 'hsl(199, 89%, 48%)',
  GEOSPATIAL: 'hsl(262, 83%, 58%)',
  GOVERNMENT: 'hsl(346, 87%, 43%)',
  ECONOMICS: 'hsl(45, 93%, 47%)',
  INFRASTRUCTURE: 'hsl(25, 95%, 53%)',
  RECREATION: 'hsl(142, 71%, 45%)',
  HEALTH: 'hsl(340, 82%, 52%)',
  ENERGY: 'hsl(48, 96%, 53%)',
  OTHER: 'hsl(220, 9%, 46%)',
};

const SOURCE_ICONS: Record<string, string> = {
  ebird: '🦅',
  inaturalist: '🌿',
  gbif: '🧬',
  noaa: '🌊',
  usgs: '🗺️',
  epa: '🌡️',
  nps: '🏞️',
  openstreetmap: '📍',
  default: '📊',
};

export function DataVisualization({ features, className }: DataVisualizationProps) {
  // Aggregate data for visualizations
  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    const confidenceDistribution: number[] = [];
    const timelineData: { hour: number; count: number }[] = [];
    const hourCounts: Record<number, number> = {};
    
    for (const f of features) {
      const cat = f.properties?.category || 'OTHER';
      const src = f.properties?.source || 'unknown';
      const conf = f.properties?.confidence || 0.5;
      
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      confidenceDistribution.push(conf);
      
      // Timeline by hour of day (if timestamp available)
      if (f.properties?.timestamp) {
        try {
          const hour = new Date(f.properties.timestamp).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        } catch {}
      }
    }
    
    // Build timeline data
    for (let h = 0; h < 24; h++) {
      timelineData.push({ hour: h, count: hourCounts[h] || 0 });
    }
    
    // Category chart data
    const categoryData = Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || CATEGORY_COLORS.OTHER }))
      .sort((a, b) => b.value - a.value);
    
    // Source chart data
    const sourceData = Object.entries(sourceCount)
      .map(([name, value]) => ({ 
        name: name.length > 15 ? name.slice(0, 15) + '...' : name, 
        fullName: name,
        value,
        icon: SOURCE_ICONS[name.split('_')[0]] || SOURCE_ICONS.default
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    // Confidence stats
    const avgConfidence = confidenceDistribution.length 
      ? confidenceDistribution.reduce((a, b) => a + b, 0) / confidenceDistribution.length 
      : 0;
    const highConfidence = confidenceDistribution.filter(c => c > 0.8).length;
    
    // Geographic spread
    const lats = features.filter(f => f.geometry?.type === 'Point').map(f => (f.geometry.coordinates as number[])[1]);
    const lngs = features.filter(f => f.geometry?.type === 'Point').map(f => (f.geometry.coordinates as number[])[0]);
    const geoSpread = lats.length > 0 ? {
      latRange: Math.max(...lats) - Math.min(...lats),
      lngRange: Math.max(...lngs) - Math.min(...lngs),
    } : null;
    
    return {
      totalRecords: features.length,
      uniqueCategories: Object.keys(categoryCount).length,
      uniqueSources: Object.keys(sourceCount).length,
      categoryData,
      sourceData,
      timelineData,
      avgConfidence,
      highConfidence,
      geoSpread,
    };
  }, [features]);

  if (features.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        <Database className="w-12 h-12 opacity-30" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          icon={<Database className="w-5 h-5" />}
          label="Total Records"
          value={stats.totalRecords.toLocaleString()}
          color="primary"
        />
        <MetricCard 
          icon={<Layers className="w-5 h-5" />}
          label="Categories"
          value={stats.uniqueCategories}
          color="success"
        />
        <MetricCard 
          icon={<Globe className="w-5 h-5" />}
          label="Data Sources"
          value={stats.uniqueSources}
          color="warning"
        />
        <MetricCard 
          icon={<Zap className="w-5 h-5" />}
          label="High Quality"
          value={`${Math.round((stats.highConfidence / stats.totalRecords) * 100)}%`}
          color="info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution Pie */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Category Distribution
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
                        <div className="font-medium text-foreground">{data.name}</div>
                        <div className="text-sm text-muted-foreground">{data.value.toLocaleString()} records</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.categoryData.slice(0, 5).map((cat) => (
              <span 
                key={cat.name}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: cat.color + '20', color: cat.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Source Breakdown Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Top Data Sources
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sourceData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
                        <div className="font-medium text-foreground">{data.icon} {data.fullName}</div>
                        <div className="text-sm text-muted-foreground">{data.value.toLocaleString()} records</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Timeline / Activity Chart */}
      {stats.timelineData.some(d => d.count > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Data Timeline (by hour)
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timelineData}>
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(h) => `${h}:00`}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
                        <div className="font-medium text-foreground">{label}:00</div>
                        <div className="text-sm text-muted-foreground">{payload[0].value} records</div>
                      </div>
                    );
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Data Quality & Geographic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Data Quality */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Data Quality
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Average Confidence</span>
                <span className="font-medium text-foreground">{(stats.avgConfidence * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.avgConfidence * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">High Quality Records (&gt;80%)</span>
                <span className="font-medium text-foreground">{stats.highConfidence.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.highConfidence / stats.totalRecords) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="h-full bg-success rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Geographic Spread */}
        {stats.geoSpread && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Geographic Coverage
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {stats.geoSpread.latRange.toFixed(1)}°
                </div>
                <div className="text-xs text-muted-foreground">Latitude Range</div>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {stats.geoSpread.lngRange.toFixed(1)}°
                </div>
                <div className="text-xs text-muted-foreground">Longitude Range</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center">
              {stats.geoSpread.latRange > 5 || stats.geoSpread.lngRange > 5 
                ? '🌍 Wide geographic coverage' 
                : '📍 Concentrated area'}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'primary' | 'success' | 'warning' | 'info';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className={cn("inline-flex p-2 rounded-lg mb-2", colorClasses[color])}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}
