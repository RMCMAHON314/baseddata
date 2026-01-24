import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================
export interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'entity' | 'fact' | 'relationship' | 'insight' | 'source' | 'record' | 'contract';
  iconColor?: string;
  children?: FileNode[];
  data?: Record<string, unknown>;
  count?: number;
  size?: string;
  modified?: string;
  score?: number;
  status?: 'healthy' | 'warning' | 'error';
}

export interface PathItem {
  id: string;
  name: string;
  type: string;
}

export type ViewMode = 'list' | 'grid' | 'columns' | 'gallery';
export type SortField = 'name' | 'modified' | 'size' | 'type' | 'score';

export interface DataCounts {
  entities: number;
  facts: number;
  relationships: number;
  insights: number;
  sources: number;
  records: number;
}

// ============================================
// HOOK
// ============================================
export function useFileExplorer() {
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(false);

  // Navigation State
  const [currentPath, setCurrentPath] = useState<PathItem[]>([
    { id: 'root', name: 'Based Data', type: 'root' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<FileNode | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  // Data State
  const [currentItems, setCurrentItems] = useState<FileNode[]>([]);
  const [counts, setCounts] = useState<DataCounts>({
    entities: 0, facts: 0, relationships: 0,
    insights: 0, sources: 0, records: 0
  });

  // ============================================
  // DATA LOADING
  // ============================================
  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, counts]);

  async function loadCounts() {
    const results = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('core_derived_insights').select('*', { count: 'exact', head: true }),
      supabase.from('api_sources').select('*', { count: 'exact', head: true }),
      supabase.from('records').select('*', { count: 'exact', head: true }),
    ]);

    setCounts({
      entities: results[0].count || 0,
      facts: results[1].count || 0,
      relationships: results[2].count || 0,
      insights: results[3].count || 0,
      sources: results[4].count || 0,
      records: results[5].count || 0
    });
  }

  const getRootItems = useCallback((): FileNode[] => [
    { id: 'entities', name: 'Entities', type: 'folder', count: counts.entities, iconColor: 'blue' },
    { id: 'facts', name: 'Facts', type: 'folder', count: counts.facts, iconColor: 'emerald' },
    { id: 'relationships', name: 'Relationships', type: 'folder', count: counts.relationships, iconColor: 'purple' },
    { id: 'insights', name: 'Insights', type: 'folder', count: counts.insights, iconColor: 'yellow' },
    { id: 'sources', name: 'Data Sources', type: 'folder', count: counts.sources, iconColor: 'cyan' },
    { id: 'records', name: 'Raw Records', type: 'folder', count: counts.records, iconColor: 'orange' },
  ], [counts]);

  async function loadFolder(folderId: string) {
    setLoading(true);
    let items: FileNode[] = [];

    try {
      switch (folderId) {
        case 'root':
          items = getRootItems();
          break;
        case 'entities':
          items = [
            { id: 'entities-by-type', name: 'By Type', type: 'folder', iconColor: 'pink' },
            { id: 'entities-by-state', name: 'By State', type: 'folder', iconColor: 'red' },
            { id: 'entities-high-value', name: 'High Value (Score 70+)', type: 'folder', iconColor: 'emerald' },
          ];
          break;
        case 'entities-by-type':
          items = await loadEntityTypes();
          break;
        case 'entities-by-state':
          items = await loadEntityStates();
          break;
        case 'entities-high-value':
          items = await loadHighValueEntities();
          break;
        case 'facts':
          items = await loadFactTypes();
          break;
        case 'relationships':
          items = await loadRelationships();
          break;
        case 'insights':
          items = await loadInsights();
          break;
        case 'sources':
          items = await loadSources();
          break;
        case 'records':
          items = await loadRecordCategories();
          break;
        default:
          if (folderId.startsWith('type-')) {
            items = await loadEntitiesByType(folderId.replace('type-', ''));
          } else if (folderId.startsWith('state-')) {
            items = await loadEntitiesByState(folderId.replace('state-', ''));
          } else if (folderId.startsWith('fact-type-')) {
            items = await loadFactsByType(folderId.replace('fact-type-', ''));
          } else if (folderId.startsWith('entity-')) {
            items = await loadEntityDetails(folderId.replace('entity-', ''));
          } else if (folderId.startsWith('source-')) {
            items = await loadSourceRecords(folderId.replace('source-', ''));
          } else if (folderId.startsWith('record-cat-')) {
            items = await loadRecordsByCategory(folderId.replace('record-cat-', ''));
          }
          break;
      }
    } catch (error) {
      console.error('Error loading folder:', error);
    }

    setCurrentItems(items);
    setLoading(false);
  }

  // ============================================
  // FOLDER LOADERS
  // ============================================
  async function loadEntityTypes(): Promise<FileNode[]> {
    const { data } = await supabase.from('core_entities').select('entity_type');
    const typeCounts: Record<string, number> = {};
    data?.forEach(e => { typeCounts[e.entity_type || 'Unknown'] = (typeCounts[e.entity_type || 'Unknown'] || 0) + 1; });

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        id: `type-${type}`, name: type, type: 'folder' as const, count
      }));
  }

  async function loadEntityStates(): Promise<FileNode[]> {
    const { data } = await supabase.from('core_entities').select('state').not('state', 'is', null);
    const stateCounts: Record<string, number> = {};
    data?.forEach(e => { stateCounts[e.state] = (stateCounts[e.state] || 0) + 1; });

    return Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({
        id: `state-${state}`, name: state, type: 'folder' as const, count, iconColor: 'red'
      }));
  }

  async function loadEntitiesByType(type: string): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, opportunity_score, created_at')
      .eq('entity_type', type)
      .order('opportunity_score', { ascending: false })
      .limit(500);

    return (data || []).map(e => ({
      id: `entity-${e.id}`,
      name: e.canonical_name,
      type: 'entity' as const,
      data: e,
      size: e.state || 'N/A',
      score: e.opportunity_score,
      modified: e.created_at
    }));
  }

  async function loadEntitiesByState(state: string): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, opportunity_score, created_at')
      .eq('state', state)
      .order('opportunity_score', { ascending: false })
      .limit(500);

    return (data || []).map(e => ({
      id: `entity-${e.id}`,
      name: e.canonical_name,
      type: 'entity' as const,
      data: e,
      size: e.entity_type || 'N/A',
      score: e.opportunity_score,
      modified: e.created_at
    }));
  }

  async function loadHighValueEntities(): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, opportunity_score, created_at')
      .gte('opportunity_score', 70)
      .order('opportunity_score', { ascending: false })
      .limit(200);

    return (data || []).map(e => ({
      id: `entity-${e.id}`,
      name: e.canonical_name,
      type: 'entity' as const,
      data: e,
      size: `${e.state} • ${e.entity_type}`,
      score: e.opportunity_score,
      modified: e.created_at
    }));
  }

  async function loadEntityDetails(entityId: string): Promise<FileNode[]> {
    const [facts, rels] = await Promise.all([
      supabase.from('core_facts')
        .select('id, fact_type, fact_value, confidence, created_at')
        .eq('entity_id', entityId)
        .order('confidence', { ascending: false }),
      supabase.from('core_relationships')
        .select('id, relationship_type, strength, to_entity:core_entities!to_entity_id(canonical_name)')
        .eq('from_entity_id', entityId)
    ]);

    const items: FileNode[] = [];

    (facts.data || []).forEach(f => items.push({
      id: `fact-${f.id}`,
      name: `${f.fact_type}`,
      type: 'fact',
      data: f,
      size: `${((f.confidence || 0) * 100).toFixed(0)}% confidence`,
      modified: f.created_at
    }));

    (rels.data || []).forEach(r => {
      const toEntity = r.to_entity as { canonical_name?: string } | null;
      items.push({
        id: `rel-${r.id}`,
        name: `${r.relationship_type} → ${toEntity?.canonical_name || 'Unknown'}`,
        type: 'relationship',
        data: r,
        size: `${((r.strength || 0) * 100).toFixed(0)}% strength`
      });
    });

    return items;
  }

  async function loadFactTypes(): Promise<FileNode[]> {
    const { data } = await supabase.from('core_facts').select('fact_type');
    const typeCounts: Record<string, number> = {};
    data?.forEach(f => { typeCounts[f.fact_type || 'Unknown'] = (typeCounts[f.fact_type || 'Unknown'] || 0) + 1; });

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        id: `fact-type-${type}`, name: type, type: 'folder' as const, count, iconColor: 'emerald'
      }));
  }

  async function loadFactsByType(factType: string): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_facts')
      .select('id, fact_type, fact_value, confidence, created_at, entity:core_entities(canonical_name)')
      .eq('fact_type', factType)
      .order('confidence', { ascending: false })
      .limit(500);

    return (data || []).map(f => {
      const entity = f.entity as { canonical_name?: string } | null;
      return {
        id: `fact-${f.id}`,
        name: entity?.canonical_name || 'Unknown',
        type: 'fact' as const,
        data: f,
        size: `${((f.confidence || 0) * 100).toFixed(0)}%`,
        modified: f.created_at
      };
    });
  }

  async function loadRelationships(): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_relationships')
      .select('id, relationship_type, strength, from_entity:core_entities!from_entity_id(canonical_name), to_entity:core_entities!to_entity_id(canonical_name)')
      .order('strength', { ascending: false })
      .limit(500);

    return (data || []).map(r => {
      const fromEntity = r.from_entity as { canonical_name?: string } | null;
      const toEntity = r.to_entity as { canonical_name?: string } | null;
      return {
        id: `rel-${r.id}`,
        name: `${fromEntity?.canonical_name || '?'} → ${toEntity?.canonical_name || '?'}`,
        type: 'relationship' as const,
        data: r,
        size: r.relationship_type,
        modified: `${((r.strength || 0) * 100).toFixed(0)}%`
      };
    });
  }

  async function loadInsights(): Promise<FileNode[]> {
    const { data } = await supabase
      .from('core_derived_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    return (data || []).map(i => ({
      id: `insight-${i.id}`,
      name: i.title || i.insight_type,
      type: 'insight' as const,
      data: i,
      size: i.severity,
      status: i.severity === 'critical' ? 'error' as const : i.severity === 'high' ? 'warning' as const : 'healthy' as const,
      modified: i.created_at
    }));
  }

  async function loadSources(): Promise<FileNode[]> {
    const { data } = await supabase
      .from('api_sources')
      .select('*')
      .order('priority', { ascending: false });

    return (data || []).map(s => ({
      id: `source-${s.slug}`,
      name: s.name,
      type: 'source' as const,
      data: s,
      size: s.status,
      status: s.status === 'active' ? 'healthy' as const : s.status === 'degraded' ? 'warning' as const : 'error' as const,
      modified: s.last_health_check
    }));
  }

  async function loadSourceRecords(slug: string): Promise<FileNode[]> {
    const { data } = await supabase
      .from('records')
      .select('id, name, source_id, category, collected_at, entity:core_entities(canonical_name)')
      .eq('source_id', slug)
      .limit(500);

    return (data || []).map(r => {
      const entity = r.entity as { canonical_name?: string } | null;
      return {
        id: `record-${r.id}`,
        name: entity?.canonical_name || r.name || 'Unresolved Record',
        type: 'record' as const,
        data: r as Record<string, unknown>,
        size: r.category,
        modified: r.collected_at
      };
    });
  }

  async function loadRecordCategories(): Promise<FileNode[]> {
    const { data } = await supabase.from('records').select('category');
    const catCounts: Record<string, number> = {};
    data?.forEach(r => { catCounts[r.category || 'Unknown'] = (catCounts[r.category || 'Unknown'] || 0) + 1; });

    return Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        id: `record-cat-${cat}`, name: cat, type: 'folder' as const, count, iconColor: 'orange'
      }));
  }

  async function loadRecordsByCategory(category: string): Promise<FileNode[]> {
    const { data } = await supabase
      .from('records')
      .select('id, name, source_id, category, collected_at, entity:core_entities(canonical_name)')
      .eq('category', category)
      .limit(500);

    return (data || []).map(r => {
      const entity = r.entity as { canonical_name?: string } | null;
      return {
        id: `record-${r.id}`,
        name: entity?.canonical_name || r.name || 'Unknown',
        type: 'record' as const,
        data: r as Record<string, unknown>,
        size: r.source_id,
        modified: r.collected_at
      };
    });
  }

  // ============================================
  // NAVIGATION
  // ============================================
  const navigate = useCallback((folderId: string, name: string, type: string) => {
    setCurrentFolderId(folderId);
    setCurrentPath(prev => [...prev, { id: folderId, name, type }]);
    setSelectedItems(new Set());
    setPreviewItem(null);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(folderId);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
      setCurrentPath(prev => prev.slice(0, -1));
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
    }
  }, [historyIndex, history]);

  const goUp = useCallback(() => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  }, [currentPath]);

  const goHome = useCallback(() => {
    setCurrentPath([{ id: 'root', name: 'Based Data', type: 'root' }]);
    setCurrentFolderId('root');
    setHistoryIndex(0);
    setHistory(['root']);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  }, [currentPath]);

  // ============================================
  // ITEM INTERACTIONS
  // ============================================
  const handleItemClick = useCallback((item: FileNode, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(item.id)) newSelected.delete(item.id);
      else newSelected.add(item.id);
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(new Set([item.id]));
    }
    setPreviewItem(item);
  }, [selectedItems]);

  const handleItemDoubleClick = useCallback((item: FileNode) => {
    if (item.type === 'folder' || item.type === 'entity' || item.type === 'source') {
      navigate(item.id, item.name, item.type);
    }
  }, [navigate]);

  const toggleFavorite = useCallback((id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) newFavorites.delete(id);
    else newFavorites.add(id);
    setFavorites(newFavorites);
  }, [favorites]);

  const refresh = useCallback(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId]);

  // ============================================
  // FILTERING & SORTING
  // ============================================
  const filteredItems = useMemo(() => {
    let items = [...currentItems];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'modified': cmp = (a.modified || '').localeCompare(b.modified || ''); break;
        case 'size': cmp = (a.size || '').localeCompare(b.size || ''); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'score': cmp = (a.score || 0) - (b.score || 0); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [currentItems, searchQuery, sortField, sortOrder]);

  return {
    // View state
    viewMode, setViewMode,
    sortField, setSortField,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    showSidebar, setShowSidebar,
    showPreview, setShowPreview,
    loading,
    
    // Navigation
    currentPath,
    currentFolderId,
    historyIndex,
    history,
    navigate,
    goBack,
    goForward,
    goUp,
    goHome,
    navigateToBreadcrumb,
    
    // Selection
    selectedItems,
    previewItem, setPreviewItem,
    favorites,
    expandedFolders, setExpandedFolders,
    
    // Data
    currentItems,
    filteredItems,
    counts,
    getRootItems,
    
    // Actions
    handleItemClick,
    handleItemDoubleClick,
    toggleFavorite,
    refresh,
  };
}
