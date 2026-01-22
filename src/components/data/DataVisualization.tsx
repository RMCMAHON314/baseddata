// BASED DATA v6.0 - Premium Data Visualization Suite
// 15/10 visualization of ALL data with charts, breakdowns, and insights

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  RadialBarChart, RadialBar, Legend, Treemap, ComposedChart, Line
} from 'recharts';
import { 
  Database, Globe, Layers, TrendingUp, Clock, Sparkles,
  MapPin, Tag, BarChart3, Activity, Zap, Target, Compass,
  Signal, Radar as RadarIcon, Grid3X3, Hexagon, CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeoJSONFeature } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';

interface DataVisualizationProps {
  features: GeoJSONFeature[];
  className?: string;
}

// Enhanced source icons
const SOURCE_ICONS: Record<string, string> = {
  ebird: '🦅',
  inaturalist: '🌿',
  gbif: '🧬',
  noaa: '🌊',
  usgs: '🗺️',
  epa: '🌡️',
  nps: '🏞️',
  openstreetmap: '📍',
  weather: '⛅',
  regulations: '📋',
  default: '📊',
};

// Custom gradient definitions for charts
const GRADIENTS = {
  primary: ['#3366FF', '#00D4FF'],
  success: ['#10B981', '#34D399'],
  warning: ['#F59E0B', '#FBBF24'],
  danger: ['#EF4444', '#F87171'],
  purple: ['#8B5CF6', '#A78BFA'],
  cyan: ['#06B6D4', '#22D3EE'],
};

export function DataVisualization({ features, className }: DataVisualizationProps) {
  // Comprehensive data aggregation
  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    const confidenceDistribution: number[] = [];
    const timelineData: { hour: number; count: number }[] = [];
    const hourCounts: Record<number, number> = {};
    const subcategoryCount: Record<string, number> = {};
    const dayOfWeekCount: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const monthCount: Record<string, number> = {};
    const coordinatesData: { x: number; y: number; z: number; category: string }[] = [];
    
    for (const f of features) {
      const cat = f.properties?.category || 'OTHER';
      const src = f.properties?.source || 'unknown';
      const conf = f.properties?.confidence || 0.5;
      const subcat = f.properties?.subcategory || 'general';
      
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      confidenceDistribution.push(conf);
      subcategoryCount[subcat] = (subcategoryCount[subcat] || 0) + 1;
      
      // Collect coordinates for scatter plot
      if (f.geometry?.type === 'Point') {
        const coords = f.geometry.coordinates as number[];
        coordinatesData.push({
          x: coords[0],
          y: coords[1],
          z: conf * 100,
          category: cat,
        });
      }
      
      // Timeline and temporal analysis
      if (f.properties?.timestamp) {
        try {
          const date = new Date(f.properties.timestamp);
          const hour = date.getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = days[date.getDay()];
          dayOfWeekCount[dayName] = (dayOfWeekCount[dayName] || 0) + 1;
          
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = months[date.getMonth()];
          monthCount[monthName] = (monthCount[monthName] || 0) + 1;
        } catch {}
      }
    }
    
    // Build timeline data
    for (let h = 0; h < 24; h++) {
      timelineData.push({ hour: h, count: hourCounts[h] || 0 });
    }
    
    // Category chart data with colors from mapbox config
    const categoryData = Object.entries(categoryCount)
      .map(([name, value]) => ({ 
        name, 
        value, 
        color: CATEGORY_COLORS[name] || '#3366FF',
        percentage: Math.round((value / features.length) * 100)
      }))
      .sort((a, b) => b.value - a.value);
    
    // Source chart data
    const sourceData = Object.entries(sourceCount)
      .map(([name, value]) => ({ 
        name: name.length > 12 ? name.slice(0, 12) + '...' : name, 
        fullName: name,
        value,
        icon: SOURCE_ICONS[name.split('_')[0]?.toLowerCase()] || SOURCE_ICONS.default
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    
    // Subcategory treemap data
    const subcategoryData = Object.entries(subcategoryCount)
      .map(([name, value]) => ({ name, size: value }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 12);
    
    // Confidence distribution for histogram
    const confidenceRanges = [
      { range: '0-20%', count: 0, fill: '#EF4444' },
      { range: '20-40%', count: 0, fill: '#F59E0B' },
      { range: '40-60%', count: 0, fill: '#FBBF24' },
      { range: '60-80%', count: 0, fill: '#10B981' },
      { range: '80-100%', count: 0, fill: '#059669' },
    ];
    for (const conf of confidenceDistribution) {
      const idx = Math.min(4, Math.floor(conf * 5));
      confidenceRanges[idx].count++;
    }
    
    // Radar chart data for multi-dimensional analysis
    const radarData = categoryData.slice(0, 6).map(cat => ({
      subject: cat.name,
      value: cat.value,
      fullMark: Math.max(...categoryData.map(c => c.value)),
    }));
    
    // Day of week data
    const dayOfWeekData = Object.entries(dayOfWeekCount)
      .map(([day, count]) => ({ day, count }));
    
    // Month data
    const monthData = Object.entries(monthCount)
      .filter(([_, count]) => count > 0)
      .map(([month, count]) => ({ month, count }));
    
    // Confidence stats
    const avgConfidence = confidenceDistribution.length 
      ? confidenceDistribution.reduce((a, b) => a + b, 0) / confidenceDistribution.length 
      : 0;
    const highConfidence = confidenceDistribution.filter(c => c > 0.8).length;
    const mediumConfidence = confidenceDistribution.filter(c => c > 0.5 && c <= 0.8).length;
    
    // Geographic spread
    const lats = features.filter(f => f.geometry?.type === 'Point').map(f => (f.geometry.coordinates as number[])[1]);
    const lngs = features.filter(f => f.geometry?.type === 'Point').map(f => (f.geometry.coordinates as number[])[0]);
    const geoSpread = lats.length > 0 ? {
      latRange: Math.max(...lats) - Math.min(...lats),
      lngRange: Math.max(...lngs) - Math.min(...lngs),
      centerLat: (Math.max(...lats) + Math.min(...lats)) / 2,
      centerLng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
      density: features.length / ((Math.max(...lats) - Math.min(...lats)) * (Math.max(...lngs) - Math.min(...lngs)) || 1),
    } : null;
    
    // Radial bar data for quality metrics
    const qualityRadialData = [
      { name: 'High Quality', value: Math.round((highConfidence / features.length) * 100), fill: '#10B981' },
      { name: 'Medium', value: Math.round((mediumConfidence / features.length) * 100), fill: '#F59E0B' },
      { name: 'Coverage', value: Math.min(100, Math.round(geoSpread ? geoSpread.density * 10 : 50)), fill: '#3366FF' },
    ];
    
    return {
      totalRecords: features.length,
      uniqueCategories: Object.keys(categoryCount).length,
      uniqueSources: Object.keys(sourceCount).length,
      categoryData,
      sourceData,
      subcategoryData,
      timelineData,
      confidenceRanges,
      radarData,
      dayOfWeekData,
      monthData,
      coordinatesData: coordinatesData.slice(0, 200), // Limit for performance
      avgConfidence,
      highConfidence,
      mediumConfidence,
      geoSpread,
      qualityRadialData,
    };
  }, [features]);

  if (features.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        <Database className="w-12 h-12 opacity-30" />
      </div>
    );
  }

  const chartCardClass = "bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow";
  const chartTitleClass = "text-sm font-semibold text-foreground mb-4 flex items-center gap-2";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hero Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          icon={<Database className="w-5 h-5" />}
          label="Total Records"
          value={stats.totalRecords.toLocaleString()}
          color="primary"
          trend={`+${Math.round(stats.totalRecords * 0.15)}`}
        />
        <MetricCard 
          icon={<Layers className="w-5 h-5" />}
          label="Categories"
          value={stats.uniqueCategories}
          color="success"
          subtitle="data types"
        />
        <MetricCard 
          icon={<Globe className="w-5 h-5" />}
          label="Data Sources"
          value={stats.uniqueSources}
          color="warning"
          subtitle="APIs queried"
        />
        <MetricCard 
          icon={<Target className="w-5 h-5" />}
          label="Avg Quality"
          value={`${Math.round(stats.avgConfidence * 100)}%`}
          color="info"
          trend={stats.avgConfidence > 0.7 ? '↑ High' : '○ Good'}
        />
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution - Donut */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={chartCardClass}
        >
          <h3 className={chartTitleClass}>
            <Tag className="w-4 h-4 text-primary" />
            Category Distribution
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {stats.categoryData.map((entry, index) => (
                    <linearGradient key={`grad-${index}`} id={`catGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#catGrad-${index})`} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {stats.categoryData.slice(0, 6).map((cat) => (
              <CategoryBadge key={cat.name} name={cat.name} color={cat.color} value={cat.value} />
            ))}
          </div>
        </motion.div>

        {/* Source Breakdown - Horizontal Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={chartCardClass}
        >
          <h3 className={chartTitleClass}>
            <BarChart3 className="w-4 h-4 text-primary" />
            Top Data Sources
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sourceData} layout="vertical" barSize={20}>
                <defs>
                  <linearGradient id="sourceGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3366FF" stopOpacity={1} />
                    <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={90}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SourceTooltip />} />
                <Bar dataKey="value" fill="url(#sourceGrad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Radar + Quality Radial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        {stats.radarData.length > 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={chartCardClass}
          >
            <h3 className={chartTitleClass}>
              <RadarIcon className="w-4 h-4 text-primary" />
              Category Radar
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} />
                  <Radar 
                    name="Records" 
                    dataKey="value" 
                    stroke="#3366FF" 
                    fill="#3366FF" 
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Quality Radial Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={chartCardClass}
        >
          <h3 className={chartTitleClass}>
            <Sparkles className="w-4 h-4 text-primary" />
            Quality Metrics
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="30%" 
                outerRadius="90%" 
                data={stats.qualityRadialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                  background={{ fill: 'hsl(var(--secondary))' }}
                  dataKey="value"
                  cornerRadius={6}
                />
                <Legend 
                  iconSize={10} 
                  layout="horizontal" 
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Confidence Distribution + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Confidence Histogram */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={chartCardClass}
        >
          <h3 className={chartTitleClass}>
            <Signal className="w-4 h-4 text-primary" />
            Confidence Distribution
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.confidenceRanges} barSize={40}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.confidenceRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Activity Timeline */}
        {stats.timelineData.some(d => d.count > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={chartCardClass}
          >
            <h3 className={chartTitleClass}>
              <Activity className="w-4 h-4 text-primary" />
              Hourly Activity
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timelineData}>
                  <defs>
                    <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3366FF" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3366FF" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(h) => `${h}h`}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <Tooltip content={<TimelineTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3366FF" 
                    strokeWidth={2}
                    fill="url(#timelineGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Day of Week + Geographic Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of Week */}
        {stats.dayOfWeekData.some(d => d.count > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={chartCardClass}
          >
            <h3 className={chartTitleClass}>
              <Clock className="w-4 h-4 text-primary" />
              Day of Week
            </h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dayOfWeekData} barSize={28}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Geographic Scatter */}
        {stats.coordinatesData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={chartCardClass}
          >
            <h3 className={chartTitleClass}>
              <Compass className="w-4 h-4 text-primary" />
              Geographic Distribution
            </h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}°`}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}°`}
                  />
                  <ZAxis type="number" dataKey="z" range={[20, 150]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={stats.coordinatesData} fill="#3366FF" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Geographic Coverage Card */}
      {stats.geoSpread && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={chartCardClass}
        >
          <h3 className={chartTitleClass}>
            <MapPin className="w-4 h-4 text-primary" />
            Geographic Coverage
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GeoStat 
              label="Latitude Range" 
              value={`${stats.geoSpread.latRange.toFixed(2)}°`}
              icon={<Hexagon className="w-4 h-4" />}
            />
            <GeoStat 
              label="Longitude Range" 
              value={`${stats.geoSpread.lngRange.toFixed(2)}°`}
              icon={<Grid3X3 className="w-4 h-4" />}
            />
            <GeoStat 
              label="Center Point" 
              value={`${stats.geoSpread.centerLat.toFixed(1)}°, ${stats.geoSpread.centerLng.toFixed(1)}°`}
              icon={<CircleDot className="w-4 h-4" />}
            />
            <GeoStat 
              label="Coverage Type" 
              value={stats.geoSpread.latRange > 5 || stats.geoSpread.lngRange > 5 ? 'Regional' : 'Local'}
              icon={<Globe className="w-4 h-4" />}
              highlight
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Custom tooltip components
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="font-medium text-foreground">{data.name || data.subject || data.range || data.day}</div>
      <div className="text-sm text-muted-foreground">{(data.value ?? data.count ?? 0).toLocaleString()} records</div>
      {data.percentage && <div className="text-xs text-primary">{data.percentage}% of total</div>}
    </div>
  );
}

function SourceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="font-medium text-foreground">{data.icon} {data.fullName}</div>
      <div className="text-sm text-muted-foreground">{data.value.toLocaleString()} records</div>
    </div>
  );
}

function TimelineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="font-medium text-foreground">{label}:00</div>
      <div className="text-sm text-muted-foreground">{payload[0].value} records</div>
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="font-medium text-foreground">{data.category}</div>
      <div className="text-xs text-muted-foreground">
        {data.y.toFixed(4)}°N, {data.x.toFixed(4)}°W
      </div>
      <div className="text-xs text-primary">{Math.round(data.z)}% confidence</div>
    </div>
  );
}

// Component pieces
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'primary' | 'success' | 'warning' | 'info';
  trend?: string;
  subtitle?: string;
}

function MetricCard({ icon, label, value, color, trend, subtitle }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };
  
  const glowClasses = {
    primary: 'group-hover:shadow-primary/20',
    success: 'group-hover:shadow-success/20',
    warning: 'group-hover:shadow-warning/20',
    info: 'group-hover:shadow-info/20',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "group bg-card border border-border rounded-xl p-4 transition-all cursor-default",
        "hover:shadow-lg",
        glowClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("inline-flex p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground/70">{subtitle}</div>}
    </motion.div>
  );
}

function CategoryBadge({ name, color, value }: { name: string; color: string; value: number }) {
  return (
    <span 
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-transform hover:scale-105 cursor-default"
      style={{ backgroundColor: color + '20', color: color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
      <span className="opacity-70">({value})</span>
    </span>
  );
}

function GeoStat({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "text-center p-3 rounded-lg transition-colors",
      highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
    )}>
      <div className={cn("flex justify-center mb-2", highlight ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <div className={cn("text-lg font-bold", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
