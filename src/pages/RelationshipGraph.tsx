// Based Data v15.0 - Relationship Graph Visualization
// Force-directed network visualization of entity connections

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import {
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Search, Filter,
  Download, Share2, Settings, Info, Play, Pause, Target,
  ArrowLeft, Building2, Users, DollarSign, ExternalLink
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
  x: number;
  y: number;
  score?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
}

interface EntityDetails {
  entity: any;
  facts: any[];
  connections: any[];
}

const TYPE_COLORS: Record<string, string> = {
  organization: '#3B82F6',
  company: '#10B981',
  hospital: '#EF4444',
  university: '#8B5CF6',
  government: '#F59E0B',
  contractor: '#06B6D4',
  provider: '#EC4899',
  facility: '#84CC16',
  default: '#6B7280'
};

export default function RelationshipGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeDetails, setNodeDetails] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [minStrength, setMinStrength] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadGraphData();
  }, [minStrength, filterType]);

  async function loadGraphData() {
    setLoading(true);

    let entityQuery = supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, opportunity_score, city, state')
      .limit(200);

    if (filterType !== 'all') {
      entityQuery = entityQuery.eq('entity_type', filterType);
    }

    const { data: entities } = await entityQuery;

    const { data: relationships } = await supabase
      .from('core_relationships')
      .select('id, from_entity_id, to_entity_id, relationship_type, strength')
      .gte('strength', minStrength / 100)
      .limit(1000);

    // Build nodes with random positions
    const nodeMap = new Map<string, GraphNode>();
    const width = 800;
    const height = 600;
    
    entities?.forEach((e, i) => {
      const angle = (i / (entities.length || 1)) * 2 * Math.PI;
      const radius = 200 + Math.random() * 100;
      
      nodeMap.set(e.id, {
        id: e.id,
        label: e.canonical_name,
        type: e.entity_type || 'default',
        size: Math.max(8, (e.opportunity_score || 50) / 8),
        color: TYPE_COLORS[e.entity_type?.toLowerCase() || 'default'] || TYPE_COLORS.default,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        score: e.opportunity_score
      });
    });

    // Build edges
    const graphEdges: GraphEdge[] = [];
    relationships?.forEach(r => {
      if (nodeMap.has(r.from_entity_id) && nodeMap.has(r.to_entity_id)) {
        graphEdges.push({
          id: r.id,
          source: r.from_entity_id,
          target: r.to_entity_id,
          label: r.relationship_type,
          weight: r.strength
        });
      }
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(graphEdges);
    setLoading(false);
  }

  async function loadNodeDetails(nodeId: string) {
    const [entityRes, factsRes, relsRes] = await Promise.all([
      supabase.from('core_entities').select('*').eq('id', nodeId).single(),
      supabase.from('core_facts').select('*').eq('entity_id', nodeId).limit(10),
      supabase.from('core_relationships')
        .select('*, to_entity:core_entities!core_relationships_to_entity_id_fkey(id, canonical_name)')
        .eq('from_entity_id', nodeId)
        .limit(10)
    ]);

    setNodeDetails({
      entity: entityRes.data,
      facts: factsRes.data || [],
      connections: relsRes.data || []
    });
  }

  function handleNodeClick(node: GraphNode) {
    setSelectedNode(node);
    loadNodeDetails(node.id);
  }

  // Simple canvas-based visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.fillStyle = 'rgb(10, 22, 40)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Apply transform
    ctx.save();
    ctx.translate(rect.width / 2 + panOffset.x, rect.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-400, -300);

    // Draw edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = `rgba(100, 116, 139, ${edge.weight * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw labels for large nodes
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    nodes.filter(n => n.size > 10).forEach(node => {
      const label = node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label;
      ctx.fillText(label, node.x + node.size + 4, node.y + 4);
    });

    ctx.restore();
  }, [nodes, edges, zoom, panOffset, selectedNode, loading]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2 - panOffset.x) / zoom + 400;
    const y = (e.clientY - rect.top - rect.height / 2 - panOffset.y) / zoom + 300;

    const clickedNode = nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < n.size + 5;
    });

    if (clickedNode) {
      handleNodeClick(clickedNode);
    }
  }, [nodes, zoom, panOffset]);

  const entityTypes = useMemo(() => {
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types);
  }, [nodes]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex-shrink-0 border-b border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <Logo />
            <Badge variant="outline">{nodes.length} nodes</Badge>
            <Badge variant="outline">{edges.length} connections</Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Find entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 h-9"
              />
            </div>

            {/* Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="organization">Organizations</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="hospital">Hospitals</SelectItem>
                <SelectItem value="university">Universities</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>

            {/* Min strength slider */}
            <div className="flex items-center gap-2 px-3">
              <span className="text-xs text-muted-foreground">Min:</span>
              <Slider
                value={[minStrength]}
                onValueChange={([v]) => setMinStrength(v)}
                max={100}
                step={10}
                className="w-24"
              />
              <span className="text-xs font-mono w-8">{minStrength}%</span>
            </div>

            {/* Zoom */}
            <div className="flex items-center border border-border rounded-lg">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-2 text-xs font-mono">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={loadGraphData}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onClick={handleCanvasClick}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Entity Types</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_COLORS).slice(0, -1).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-2 capitalize">{selectedNode.type}</Badge>
                  <h3 className="font-bold text-lg">{selectedNode.label}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                  ×
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {nodeDetails ? (
                <div className="space-y-4">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Opportunity</p>
                      <p className="text-lg font-bold">{nodeDetails.entity?.opportunity_score || 0}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Risk</p>
                      <p className="text-lg font-bold">{nodeDetails.entity?.risk_score || 0}%</p>
                    </div>
                  </div>

                  {/* Location */}
                  {nodeDetails.entity?.city && (
                    <div className="text-sm text-muted-foreground">
                      📍 {nodeDetails.entity.city}, {nodeDetails.entity.state}
                    </div>
                  )}

                  {/* Facts */}
                  <div>
                    <h4 className="font-medium mb-2">Recent Facts ({nodeDetails.facts.length})</h4>
                    <div className="space-y-2">
                      {nodeDetails.facts.slice(0, 5).map(fact => (
                        <div key={fact.id} className="p-2 rounded bg-muted text-xs">
                          <span className="capitalize">{fact.fact_type.replace(/_/g, ' ')}</span>
                          {fact.fact_value?.amount && (
                            <span className="ml-2 text-success font-mono">
                              {formatCurrency(fact.fact_value.amount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connections */}
                  <div>
                    <h4 className="font-medium mb-2">Connections ({nodeDetails.connections.length})</h4>
                    <div className="space-y-2">
                      {nodeDetails.connections.map(rel => (
                        <Link
                          key={rel.id}
                          to={`/entity/${rel.to_entity?.id}`}
                          className="flex items-center gap-2 p-2 rounded bg-muted hover:bg-accent text-xs transition-colors"
                        >
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{rel.to_entity?.canonical_name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link to={`/entity/${selectedNode.id}`}>
                    <Button className="w-full mt-4">
                      <ExternalLink className="w-4 h-4 mr-2" /> View Full Profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading details...
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
