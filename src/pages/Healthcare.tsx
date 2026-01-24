// BASED DATA - Healthcare Intelligence Hub
// Clinical Trials, FDA Drugs, Medical Devices
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical, Pill, Stethoscope, Activity, Search, ExternalLink, 
  Users, Calendar, ChevronRight, Filter, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { useClinicalTrials, useFDADrugs, useFDADevices, useHealthcareStats } from '@/hooks/useHealthcare';

const STATUS_COLORS: Record<string, string> = {
  'Recruiting': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Active, not recruiting': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-secondary text-secondary-foreground',
  'Terminated': 'bg-destructive/10 text-destructive',
  'Suspended': 'bg-amber-100 text-amber-700',
};

const PHASE_COLORS: Record<string, string> = {
  'Phase 1': 'bg-purple-100 text-purple-700',
  'Phase 1/2': 'bg-purple-100 text-purple-700',
  'Phase 2': 'bg-violet-100 text-violet-700',
  'Phase 2/3': 'bg-violet-100 text-violet-700',
  'Phase 3': 'bg-indigo-100 text-indigo-700',
  'Phase 4': 'bg-indigo-200 text-indigo-800',
};

export default function Healthcare() {
  const [activeTab, setActiveTab] = useState('trials');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const { data: stats, isLoading: statsLoading } = useHealthcareStats();
  const { data: trials = [], isLoading: trialsLoading } = useClinicalTrials({ 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    phase: phaseFilter !== 'all' ? phaseFilter : undefined 
  });
  const { data: drugs = [], isLoading: drugsLoading } = useFDADrugs();
  const { data: devices = [], isLoading: devicesLoading } = useFDADevices();

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Filter logic
  const filteredTrials = trials.filter(t =>
    !searchQuery || 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lead_sponsor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.conditions?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDrugs = drugs.filter(d =>
    !searchQuery ||
    d.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.sponsor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDevices = devices.filter(d =>
    !searchQuery ||
    d.device_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.applicant?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-emerald-50/50">
          <div className="container py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FlaskConical className="h-6 w-6 text-emerald-600" />
                  Healthcare Intelligence
                </h1>
                <p className="text-muted-foreground">Clinical trials, FDA approvals, and medical devices</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-emerald-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">Clinical Trials</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.trialsCount}</p>
              </Card>
              <Card className="p-4 border-blue-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Pill className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">FDA Drugs</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.drugsCount}</p>
              </Card>
              <Card className="p-4 border-violet-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className="h-4 w-4 text-violet-600" />
                  <span className="text-sm text-muted-foreground">Medical Devices</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.devicesCount}</p>
              </Card>
              <Card className="p-4 border-emerald-300/50 bg-emerald-50/30">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">Recruiting Now</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{statsLoading ? '-' : stats?.recruitingCount}</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trials, drugs, devices..."
                className="pl-9"
              />
            </div>

            {activeTab === 'trials' && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Recruiting">Recruiting</SelectItem>
                    <SelectItem value="Active, not recruiting">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="Phase 1">Phase 1</SelectItem>
                    <SelectItem value="Phase 2">Phase 2</SelectItem>
                    <SelectItem value="Phase 3">Phase 3</SelectItem>
                    <SelectItem value="Phase 4">Phase 4</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="trials" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                Clinical Trials
              </TabsTrigger>
              <TabsTrigger value="drugs" className="gap-2">
                <Pill className="h-4 w-4" />
                FDA Drugs
              </TabsTrigger>
              <TabsTrigger value="devices" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                Medical Devices
              </TabsTrigger>
            </TabsList>

            {/* Clinical Trials Tab */}
            <TabsContent value="trials">
              {trialsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
              ) : filteredTrials.length === 0 ? (
                <Card className="p-12 text-center">
                  <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Trials Found</h3>
                  <p className="text-muted-foreground">Adjust your filters or search query</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredTrials.map((trial, index) => (
                    <motion.div
                      key={trial.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className="p-4 hover:border-emerald-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={STATUS_COLORS[trial.overall_status || ''] || 'bg-secondary'}>
                                {trial.overall_status || 'Unknown'}
                              </Badge>
                              {trial.phase && (
                                <Badge className={PHASE_COLORS[trial.phase] || 'bg-secondary'}>
                                  {trial.phase}
                                </Badge>
                              )}
                              <span className="text-xs font-mono text-muted-foreground">{trial.nct_id}</span>
                            </div>
                            <h3 className="font-semibold line-clamp-2 mb-2">{trial.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {trial.lead_sponsor_name || 'Unknown Sponsor'}
                              </span>
                              {trial.enrollment && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {trial.enrollment.toLocaleString()} enrolled
                                </span>
                              )}
                              {trial.completion_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Est. {formatDate(trial.completion_date)}
                                </span>
                              )}
                            </div>
                            {trial.conditions && trial.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {trial.conditions.slice(0, 4).map((condition, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {condition}
                                  </Badge>
                                ))}
                                {trial.conditions.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{trial.conditions.length - 4}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {trial.url && (
                            <a href={trial.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* FDA Drugs Tab */}
            <TabsContent value="drugs">
              {drugsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : filteredDrugs.length === 0 ? (
                <Card className="p-12 text-center">
                  <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Drugs Found</h3>
                  <p className="text-muted-foreground">Adjust your search query</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrugs.map((drug, index) => (
                    <motion.div
                      key={drug.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className="p-4 h-full hover:border-blue-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {drug.application_type || 'NDA'}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {drug.market_status || 'Rx'}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold mb-1">{drug.brand_name || 'Unknown'}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{drug.generic_name}</p>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{drug.sponsor_name}</span>
                          </p>
                          {drug.therapeutic_class && (
                            <Badge variant="secondary" className="text-xs mt-2">
                              {drug.therapeutic_class}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Approved: {formatDate(drug.approval_date)}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Medical Devices Tab */}
            <TabsContent value="devices">
              {devicesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : filteredDevices.length === 0 ? (
                <Card className="p-12 text-center">
                  <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                  <p className="text-muted-foreground">Adjust your search query</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDevices.map((device, index) => (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className="p-4 hover:border-violet-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-violet-100 text-violet-700">
                                Class {device.device_class || '?'}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                {device.k_number || device.pma_number || '-'}
                              </span>
                            </div>
                            <h3 className="font-semibold mb-1">{device.device_name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{device.applicant}</p>
                            <div className="flex items-center gap-4 text-sm">
                              {device.medical_specialty && (
                                <Badge variant="secondary" className="text-xs">
                                  {device.medical_specialty}
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                {device.decision} • {formatDate(device.decision_date)}
                              </span>
                            </div>
                          </div>
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
