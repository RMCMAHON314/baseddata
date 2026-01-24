// BASED DATA - D3 Network Graph Visualization
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  type: 'entity' | 'agency' | 'contract';
  value: number;
  group: number;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  type: string;
}

interface NetworkGraphProps {
  entityId?: string;
  height?: number;
}

export function NetworkGraph({ entityId, height = 600 }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, links: 0, facts: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    loadNetworkData();
  }, [entityId]);

  async function loadNetworkData() {
    setLoading(true);
    
    try {
      // Get entities
      const { data: entities } = await supabase
        .from('core_entities')
        .select('id, canonical_name, total_contract_value, entity_type')
        .eq('is_canonical', true)
        .order('total_contract_value', { ascending: false })
        .limit(50);

      // Get relationships
      const { data: relationships } = await supabase
        .from('core_relationships')
        .select('from_entity_id, to_entity_id, relationship_type, strength')
        .limit(200);

      // Get contracts for agency nodes
      const { data: contracts } = await supabase
        .from('contracts')
        .select('awarding_agency, recipient_entity_id, award_amount')
        .not('awarding_agency', 'is', null)
        .limit(500);

      // Get fact count
      const { count: factCount } = await supabase
        .from('core_facts')
        .select('*', { count: 'exact', head: true });

      // Build nodes
      const nodes: GraphNode[] = [];
      const nodeIds = new Set<string>();

      // Entity nodes
      (entities || []).forEach((e, i) => {
        nodes.push({
          id: e.id,
          name: e.canonical_name,
          type: 'entity',
          value: e.total_contract_value || 0,
          group: 1
        });
        nodeIds.add(e.id);
      });

      // Agency nodes from contracts
      const agencyValues: Record<string, number> = {};
      (contracts || []).forEach(c => {
        if (c.awarding_agency) {
          agencyValues[c.awarding_agency] = (agencyValues[c.awarding_agency] || 0) + (c.award_amount || 0);
        }
      });

      Object.entries(agencyValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([agency, value]) => {
          const id = `agency-${agency}`;
          nodes.push({
            id,
            name: agency,
            type: 'agency',
            value,
            group: 2
          });
          nodeIds.add(id);
        });

      // Build links
      const links: GraphLink[] = [];

      // Relationship links
      (relationships || []).forEach(r => {
        if (r.from_entity_id && r.to_entity_id && nodeIds.has(r.from_entity_id) && nodeIds.has(r.to_entity_id)) {
          links.push({
            source: r.from_entity_id,
            target: r.to_entity_id,
            strength: r.strength || 0.5,
            type: r.relationship_type
          });
        }
      });

      // Contract links (entity -> agency)
      (contracts || []).forEach(c => {
        if (c.recipient_entity_id && c.awarding_agency) {
          const agencyId = `agency-${c.awarding_agency}`;
          if (nodeIds.has(c.recipient_entity_id) && nodeIds.has(agencyId)) {
            const existing = links.find(l => l.source === c.recipient_entity_id && l.target === agencyId);
            if (!existing) {
              links.push({
                source: c.recipient_entity_id,
                target: agencyId,
                strength: 0.3,
                type: 'contract'
              });
            }
          }
        }
      });

      setStats({ nodes: nodes.length, links: links.length, facts: factCount || 0 });
      renderGraph(nodes, links);

    } catch (error) {
      console.error('Failed to load network data:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderGraph(nodes: GraphNode[], links: GraphLink[]) {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const svgHeight = height;

    // Color scale
    const color = d3.scaleOrdinal<string>()
      .domain(['entity', 'agency', 'contract'])
      .range(['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))']);

    // Size scale based on value
    const maxValue = Math.max(...nodes.map(n => n.value || 1));
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([5, 40]);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // Force simulation
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength || 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, svgHeight / 2))
      .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.value) + 5));

    // Draw links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, d.strength * 3));

    // Draw nodes
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d) => setSelectedNode(d));

    node.append('circle')
      .attr('r', (d: any) => sizeScale(d.value))
      .attr('fill', (d: any) => color(d.type))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85);

    node.append('title')
      .text((d: any) => `${d.name}\n$${formatValue(d.value)}`);

    // Labels for larger nodes
    node.filter((d: any) => sizeScale(d.value) > 15)
      .append('text')
      .text((d: any) => d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => sizeScale(d.value) + 12)
      .attr('font-size', '10px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none');

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  }

  function formatValue(value: number): string {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
    return value.toString();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height: `${height}px` }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Network Graph
            <Badge variant="secondary">{stats.nodes} nodes</Badge>
            <Badge variant="outline">{stats.links} connections</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visualizing {stats.facts.toLocaleString()} facts across entities and agencies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadNetworkData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            <span className="text-sm">Entities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span className="text-sm">Agencies</span>
          </div>
        </div>
        
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="border rounded-lg bg-secondary/10"
        />

        {selectedNode && (
          <div className="absolute bottom-4 left-4 bg-card border rounded-lg p-4 shadow-lg max-w-xs">
            <h4 className="font-semibold">{selectedNode.name}</h4>
            <p className="text-sm text-muted-foreground capitalize">{selectedNode.type}</p>
            <p className="text-lg font-bold">${formatValue(selectedNode.value)}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2"
              onClick={() => setSelectedNode(null)}
            >
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
