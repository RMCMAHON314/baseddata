// BASED DATA - Maryland Education Intelligence
// MEEC Contracts, Institutions, Vendor Spending
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Building, School, FileText, DollarSign, Calendar,
  Search, Users, ChevronRight, Filter, Award, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { 
  useMEECContracts, 
  useEducationSpending, 
  useEducationInstitutions, 
  useEducationStats,
  useTopEducationVendors 
} from '@/hooks/useEducation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const INSTITUTION_ICONS: Record<string, React.ElementType> = {
  'K-12': School,
  'USM': GraduationCap,
  'Community College': Building,
  'Private': Award,
};

const CONTRACT_COLORS: Record<string, string> = {
  'Hardware': 'bg-blue-100 text-blue-700 border-blue-200',
  'Software': 'bg-purple-100 text-purple-700 border-purple-200',
  'Services': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Security': 'bg-red-100 text-red-700 border-red-200',
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function Education() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(2024);
  const [countyFilter, setCountyFilter] = useState('all');
  const [institutionType, setInstitutionType] = useState('all');

  const { data: stats, isLoading: statsLoading } = useEducationStats();
  const { data: contracts = [], isLoading: contractsLoading } = useMEECContracts();
  const { data: spending = [], isLoading: spendingLoading } = useEducationSpending({ 
    county: countyFilter !== 'all' ? countyFilter : undefined,
    fiscalYear 
  });
  const { data: institutions = [], isLoading: institutionsLoading } = useEducationInstitutions(
    institutionType !== 'all' ? institutionType : undefined
  );
  const { data: topVendors = [], isLoading: vendorsLoading } = useTopEducationVendors(10);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Get unique counties for filter
  const counties = [...new Set(spending.map(s => s.county))].sort();

  // Institution type breakdown
  const institutionBreakdown = institutions.reduce((acc, i) => {
    const type = i.institution_type || 'Other';
    acc[type] = (acc[type] || 0) + (i.annual_budget || 0);
    return acc;
  }, {} as Record<string, number>);

  const totalBudget = Object.values(institutionBreakdown).reduce((sum, v) => sum + v, 0);

  // Chart data
  const vendorChartData = topVendors.slice(0, 8).map(v => ({
    name: v.name.length > 15 ? v.name.slice(0, 15) + '...' : v.name,
    value: v.total,
    districts: v.districtsCount
  }));

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-amber-50/50">
          <div className="container py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-amber-600" />
                  Maryland Education Intelligence
                </h1>
                <p className="text-muted-foreground">MEEC contracts, institutions, and vendor spending</p>
              </div>
              <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">FY 2024</SelectItem>
                  <SelectItem value="2023">FY 2023</SelectItem>
                  <SelectItem value="2022">FY 2022</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-amber-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">MEEC Contract Value</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : formatCurrency(stats?.meecValue)}</p>
              </Card>
              <Card className="p-4 border-blue-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Institutions</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.institutionsCount}</p>
              </Card>
              <Card className="p-4 border-emerald-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">Combined Budget</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{statsLoading ? '-' : formatCurrency(stats?.institutionsBudget)}</p>
              </Card>
              <Card className="p-4 border-violet-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-violet-600" />
                  <span className="text-sm text-muted-foreground">Vendor Spend (FY)</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : formatCurrency(stats?.totalSpending)}</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-2">
                <FileText className="h-4 w-4" />
                MEEC Contracts
              </TabsTrigger>
              <TabsTrigger value="institutions" className="gap-2">
                <Building className="h-4 w-4" />
                Institutions
              </TabsTrigger>
              <TabsTrigger value="spending" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Vendor Spending
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Vendors Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Education Vendors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vendorsLoading ? (
                      <Skeleton className="h-64" />
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={vendorChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis 
                              type="number" 
                              tickFormatter={(v) => formatCurrency(v)}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={100}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Total Spend']}
                              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {vendorChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Spending by Institution Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Budget by Institution Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(institutionBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, value], index) => {
                          const percentage = totalBudget > 0 ? (value / totalBudget) * 100 : 0;
                          const Icon = INSTITUTION_ICONS[type] || Building;
                          return (
                            <div key={type}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{type}</span>
                                </div>
                                <span className="text-sm font-bold">{formatCurrency(value)}</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MEEC Contracts Tab */}
            <TabsContent value="contracts">
              {contractsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
              ) : contracts.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Contracts Found</h3>
                  <p className="text-muted-foreground">MEEC contract data will appear here</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contracts.map((contract, index) => (
                    <motion.div
                      key={contract.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className="p-4 h-full hover:border-amber-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <Badge className={CONTRACT_COLORS[contract.contract_type || ''] || 'bg-secondary'}>
                            {contract.contract_type || 'General'}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            {contract.contract_number}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2">{contract.contract_name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                        </p>
                        {contract.categories && contract.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {contract.categories.slice(0, 4).map((cat, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {contract.prime_contractors && contract.prime_contractors.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-3">
                            Contractors: {contract.prime_contractors.slice(0, 3).join(', ')}
                            {contract.prime_contractors.length > 3 && ` +${contract.prime_contractors.length - 3} more`}
                          </p>
                        )}
                        <div className="pt-2 border-t">
                          <p className="text-xl font-bold text-primary font-mono">
                            {formatCurrency(contract.estimated_value)}
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Institutions Tab */}
            <TabsContent value="institutions">
              <div className="mb-6">
                <Select value={institutionType} onValueChange={setInstitutionType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Institution Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="K-12">K-12</SelectItem>
                    <SelectItem value="USM">University System</SelectItem>
                    <SelectItem value="Community College">Community College</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {institutionsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
              ) : institutions.length === 0 ? (
                <Card className="p-12 text-center">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Institutions Found</h3>
                  <p className="text-muted-foreground">Adjust your filter</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {institutions.map((inst, index) => {
                    const Icon = INSTITUTION_ICONS[inst.institution_type || ''] || Building;
                    return (
                      <motion.div
                        key={inst.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Card className="p-4 h-full hover:border-blue-300/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Icon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {inst.institution_type || 'Other'}
                                </Badge>
                                {inst.meec_member && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">MEEC</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold line-clamp-2 mb-1">{inst.institution_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {[inst.city, inst.county].filter(Boolean).join(', ')}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {inst.enrollment && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    {inst.enrollment.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-lg font-bold text-primary font-mono mt-2">
                                {formatCurrency(inst.annual_budget)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Vendor Spending Tab */}
            <TabsContent value="spending">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendors..."
                    className="pl-9"
                  />
                </div>
                <Select value={countyFilter} onValueChange={setCountyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="County" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Counties</SelectItem>
                    {counties.map(county => (
                      <SelectItem key={county} value={county}>{county}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {spendingLoading ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : spending.length === 0 ? (
                <Card className="p-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Spending Data</h3>
                  <p className="text-muted-foreground">Adjust your filters</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {spending
                    .filter(s => !searchQuery || s.payee_name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.01 }}
                      >
                        <Card className="p-3 hover:border-violet-300/50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{record.payee_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {record.county}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {record.purpose || 'General'} • FY {record.fiscal_year}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-primary font-mono">
                              {formatCurrency(record.total_payment)}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GlobalLayout>
  );
}
