// BASED DATA - Predictive Analytics Calendar
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Calendar, TrendingUp, Building2, Clock, Target } from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';

export function PredictiveCalendar() {
  const { seasonalPatterns, agencyCycles, predictions, loading, error } = usePredictiveAnalytics();

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Failed to load predictive analytics: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Predictive Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="seasonal" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
            <TabsTrigger value="cycles">Agency Cycles</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="seasonal" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Contract Volume by Month */}
              <div className="bg-secondary/20 rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Contract Volume by Month
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={seasonalPatterns}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Bar 
                      dataKey="avgContracts" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Avg Contracts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Contract Value by Month */}
              <div className="bg-secondary/20 rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Contract Value by Month
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={seasonalPatterns}>
                    <defs>
                      <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tickFormatter={(v) => formatCurrency(v)} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgValue" 
                      stroke="hsl(var(--chart-2))"
                      fill="url(#valueGradient)"
                      name="Avg Value"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Agencies */}
            <div className="bg-secondary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Peak Months by Agency Activity
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {seasonalPatterns.slice(0, 6).map((month, idx) => (
                  <motion.div
                    key={month.monthName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-card rounded-lg p-3 border"
                  >
                    <div className="font-medium text-sm">{month.monthName}</div>
                    <div className="text-lg font-bold text-primary">{month.avgContracts}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {month.peakAgencies[0]?.split(' ').slice(0, 2).join(' ') || 'Various'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Agency</th>
                    <th className="text-left p-3 font-medium">Avg Cycle</th>
                    <th className="text-left p-3 font-medium">Peak Months</th>
                    <th className="text-left p-3 font-medium">Last Award</th>
                    <th className="text-left p-3 font-medium">Predicted Next</th>
                    <th className="text-left p-3 font-medium">History</th>
                  </tr>
                </thead>
                <tbody>
                  {agencyCycles.slice(0, 15).map((cycle, idx) => {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return (
                      <motion.tr
                        key={cycle.agency}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b hover:bg-secondary/20 transition-colors"
                      >
                        <td className="p-3 font-medium max-w-[200px] truncate">{cycle.agency}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{cycle.avgCycleMonths} months</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {cycle.peakMonths.slice(0, 3).map(m => (
                              <Badge key={m} variant="outline" className="text-xs">
                                {monthNames[m]}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{cycle.lastAward}</td>
                        <td className="p-3">
                          <Badge className="bg-primary/20 text-primary">{cycle.predictedNext}</Badge>
                        </td>
                        <td className="p-3 text-sm">{cycle.contractCount} contracts</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <div className="grid gap-4">
              {predictions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No predictions available for the next 3 months based on current data patterns.
                </div>
              ) : (
                predictions.map((pred, idx) => (
                  <motion.div
                    key={`${pred.agency}-${pred.predictedDate}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-secondary/20 rounded-lg p-4 border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          {pred.agency}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Based on {pred.basedOn}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary text-primary-foreground">
                          {pred.predictedDate}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {Math.round(pred.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm">Historical Avg Value:</span>
                      <span className="font-bold text-primary">{formatCurrency(pred.avgValue)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
