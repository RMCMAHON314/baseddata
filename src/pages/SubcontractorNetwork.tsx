// BASED DATA - Subcontractor Network Graph
// Interactive prime→sub supply chain visualization using subaward data
import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Network, DollarSign, Building2, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubNode {
  id: string;
  name: string;
  type: 'prime' | 'sub';
  totalValue: number;
  contractCount: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SubLink {
  source: string | SubNode;
  target: string | SubNode;
  totalValue: number;
  contractCount: number;
  agency: string;
}

interface NetworkStats {
  totalPrimes: number;
  totalSubs: number;
  totalValue: number;
  totalLinks: number;
}

function formatValue(v: number): string {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

export default function SubcontractorNetwork() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NetworkStats>({ totalPrimes: 0, totalSubs: 0, totalValue: 0, totalLinks: 0 });
  const [selectedNode, setSelectedNode] = useState<SubNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [agencies, setAgencies] = useState<string[]>([]);
  const [nodeConnections, setNodeConnections] = useState<SubLink[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('subawards')
        .select('prime_recipient_name, sub_awardee_name, subaward_amount, awarding_agency, prime_award_id')
        .not('prime_recipient_name', 'is', null)
        .not('sub_awardee_name', 'is', null)
        .order('subaward_amount', { ascending: false })
        .limit(1000);

      if (agencyFilter && agencyFilter !== 'all') {
        query = query.eq('awarding_agency', agencyFilter);
      }

      const { data: subawards } = await query;
      if (!subawards || subawards.length === 0) {
        setLoading(false);
        return;
      }

      // Aggregate prime→sub relationships
      const linkMap = new Map<string, { totalValue: number; count: number; agency: string }>();
      const primeStats = new Map<string, { totalValue: number; count: number }>();
      const subStats = new Map<string, { totalValue: number; count: number }>();
      const agencySet = new Set<string>();

      for (const s of subawards) {
        const prime = s.prime_recipient_name!.trim();
        const sub = s.sub_awardee_name!.trim();
        const amt = s.subaward_amount || 0;
        const agency = s.awarding_agency || 'Unknown';
        agencySet.add(agency);

        const key = `${prime}|||${sub}`;
        const existing = linkMap.get(key);
        if (existing) {
          existing.totalValue += amt;
          existing.count++;
        } else {
          linkMap.set(key, { totalValue: amt, count: 1, agency });
        }

        const pe = primeStats.get(prime);
        if (pe) { pe.totalValue += amt; pe.count++; } else { primeStats.set(prime, { totalValue: amt, count: 1 }); }

        const se = subStats.get(sub);
        if (se) { se.totalValue += amt; se.count++; } else { subStats.set(sub, { totalValue: amt, count: 1 }); }
      }

      setAgencies(Array.from(agencySet).sort());

      // Build nodes - take top by value
      const nodes: SubNode[] = [];
      const nodeIds = new Set<string>();

      // Top primes
      Array.from(primeStats.entries())
        .sort((a, b) => b[1].totalValue - a[1].totalValue)
        .slice(0, 30)
        .forEach(([name, s]) => {
          const id = `prime-${name}`;
          nodes.push({ id, name, type: 'prime', totalValue: s.totalValue, contractCount: s.count });
          nodeIds.add(name);
        });

      // Top subs
      Array.from(subStats.entries())
        .sort((a, b) => b[1].totalValue - a[1].totalValue)
        .slice(0, 50)
        .forEach(([name, s]) => {
          if (!nodeIds.has(name)) {
            const id = `sub-${name}`;
            nodes.push({ id, name, type: 'sub', totalValue: s.totalValue, contractCount: s.count });
            nodeIds.add(name);
          }
        });

      // Build links (only between visible nodes)
      const links: SubLink[] = [];
      linkMap.forEach((val, key) => {
        const [prime, sub] = key.split('|||');
        if (nodeIds.has(prime) && nodeIds.has(sub)) {
          const sourceId = `prime-${prime}`;
          const targetId = primeStats.has(sub) ? `prime-${sub}` : `sub-${sub}`;
          // Avoid self-links
          if (sourceId !== targetId) {
            links.push({
              source: sourceId,
              target: targetId,
              totalValue: val.totalValue,
              contractCount: val.count,
              agency: val.agency,
            });
          }
        }
      });

      const totalVal = subawards.reduce((sum, s) => sum + (s.subaward_amount || 0), 0);
      setStats({
        totalPrimes: primeStats.size,
        totalSubs: subStats.size,
        totalValue: totalVal,
        totalLinks: links.length,
      });

      renderGraph(nodes, links);
    } catch (err) {
      console.error('Subcontractor network load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  function renderGraph(nodes: SubNode[], links: SubLink[]) {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 900;
    const height = 650;

    const maxVal = Math.max(...nodes.map(n => n.totalValue || 1));
    const sizeScale = d3.scaleSqrt().domain([0, maxVal]).range([6, 45]);
    const linkWidthScale = d3.scaleSqrt().domain([0, Math.max(...links.map(l => l.totalValue || 1))]).range([1, 8]);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (e) => container.attr('transform', e.transform));
    svg.call(zoom);

    // Defs for arrow markers
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 0 10 6')
      .attr('refX', 10)
      .attr('refY', 3)
      .attr('markerWidth', 8)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L10,3 L0,6 Z')
      .attr('fill', 'hsl(var(--muted-foreground))');

    const container = svg.append('g');

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.totalValue) + 8));

    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d: any) => linkWidthScale(d.totalValue))
      .attr('marker-end', 'url(#arrowhead)');

    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, SubNode>()
        .on('start', (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on('drag', (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on('end', (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; }))
      .on('click', (_, d) => {
        setSelectedNode(d);
        const conns = links.filter(l => {
          const sId = typeof l.source === 'string' ? l.source : (l.source as SubNode).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as SubNode).id;
          return sId === d.id || tId === d.id;
        });
        setNodeConnections(conns);
      });

    node.append('circle')
      .attr('r', (d) => sizeScale(d.totalValue))
      .attr('fill', (d) => d.type === 'prime' ? 'hsl(var(--primary))' : 'hsl(var(--chart-4))')
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85);

    node.append('title').text((d) => `${d.name}\n${formatValue(d.totalValue)} across ${d.contractCount} subawards`);

    node.filter((d) => sizeScale(d.totalValue) > 14)
      .append('text')
      .text((d) => d.name.length > 22 ? d.name.substring(0, 20) + '…' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => sizeScale(d.totalValue) + 14)
      .attr('font-size', '9px')
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  return (
    <GlobalLayout>
      <PageSEO title="Subcontractor Network | Based Data" description="Visualize prime-to-sub supply chain relationships across federal contracting" />
      <div className="container py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Network className="h-8 w-8 text-primary" />
              Subcontractor Network
            </h1>
            <p className="text-muted-foreground mt-1">Interactive prime → sub supply chain visualization from real subaward data</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Prime Contractors', value: stats.totalPrimes.toLocaleString(), icon: Building2 },
            { label: 'Subcontractors', value: stats.totalSubs.toLocaleString(), icon: Building2 },
            { label: 'Total Subaward Value', value: formatValue(stats.totalValue), icon: DollarSign },
            { label: 'Relationships', value: stats.totalLinks.toLocaleString(), icon: ArrowRight },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </div>
                  <p className="text-xl font-bold">{loading ? <Skeleton className="h-6 w-20" /> : s.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {agencies.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Graph */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Supply Chain Graph</CardTitle>
              <div className="flex gap-2">
                <Badge variant="default">Prime</Badge>
                <Badge style={{ backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--primary-foreground))' }}>Sub</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-[650px] rounded-lg" />
            ) : (
              <svg ref={svgRef} width="100%" height={650} className="border rounded-lg bg-secondary/5" />
            )}
          </CardContent>
        </Card>

        {/* Selected node detail */}
        {selectedNode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant={selectedNode.type === 'prime' ? 'default' : 'secondary'}>{selectedNode.type === 'prime' ? 'Prime' : 'Subcontractor'}</Badge>
                  {selectedNode.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Subaward Value</p>
                    <p className="text-lg font-bold">{formatValue(selectedNode.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subaward Count</p>
                    <p className="text-lg font-bold">{selectedNode.contractCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <p className="text-lg font-bold">{nodeConnections.length}</p>
                  </div>
                </div>
                {nodeConnections.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Connected Partners</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {nodeConnections.map((c, i) => {
                        const sName = typeof c.source === 'string' ? c.source : (c.source as SubNode).name;
                        const tName = typeof c.target === 'string' ? c.target : (c.target as SubNode).name;
                        const partnerName = sName === selectedNode.name ? tName : sName;
                        return (
                          <div key={i} className="flex items-center justify-between text-sm bg-secondary/30 rounded px-3 py-1.5">
                            <span className="truncate mr-2">{partnerName}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{formatValue(c.totalValue)} · {c.contractCount} awards</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSelectedNode(null); setNodeConnections([]); }}>
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </GlobalLayout>
  );
}
