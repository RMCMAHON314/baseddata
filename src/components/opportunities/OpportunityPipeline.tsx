import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, GripVertical, X, ChevronRight } from 'lucide-react';

interface PipelineItem {
  id: string;
  title: string;
  agency: string;
  value: number | null;
  deadline: string | null;
  stage: string;
}

const STAGES = [
  { key: 'identified', label: 'Identified', color: 'bg-muted' },
  { key: 'evaluating', label: 'Evaluating', color: 'bg-blue-500/10' },
  { key: 'pursuing', label: 'Pursuing', color: 'bg-amber-500/10' },
  { key: 'submitted', label: 'Submitted', color: 'bg-violet-500/10' },
  { key: 'won', label: 'Won', color: 'bg-emerald-500/10' },
  { key: 'lost', label: 'Lost', color: 'bg-red-500/10' },
];

function fmt(v: number | null) {
  if (!v) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const STORAGE_KEY = 'baseddata_pipeline';

function loadPipeline(): PipelineItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePipeline(items: PipelineItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToPipeline(opp: { id: string; title: string | null; department: string | null; award_ceiling: number | null; response_deadline: string | null }) {
  const items = loadPipeline();
  if (items.some(i => i.id === opp.id)) return false;
  items.push({
    id: opp.id,
    title: opp.title || 'Untitled',
    agency: opp.department || 'Unknown',
    value: opp.award_ceiling,
    deadline: opp.response_deadline,
    stage: 'identified',
  });
  savePipeline(items);
  return true;
}

export function OpportunityPipeline() {
  const [items, setItems] = useState<PipelineItem[]>(loadPipeline);
  const [dragItem, setDragItem] = useState<string | null>(null);

  useEffect(() => { savePipeline(items); }, [items]);

  const moveToStage = (id: string, stage: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, stage } : i));
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const stageValues = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = items.filter(i => i.stage === s.key).reduce((sum, i) => sum + (i.value || 0), 0);
    return acc;
  }, {});

  const totalPipeline = items.reduce((s, i) => s + (i.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Pipeline Board</h3>
          <p className="text-xs text-muted-foreground">{items.length} opportunities · Total: {fmt(totalPipeline) || '$0'}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No opportunities in your pipeline yet.</p>
          <p className="text-xs mt-1">Click "Add to Pipeline" on any opportunity to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map(stage => {
            const stageItems = items.filter(i => i.stage === stage.key);
            return (
              <div key={stage.key}
                className={`rounded-xl border border-border p-2 min-h-[200px] ${stage.color} transition-colors`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (dragItem) moveToStage(dragItem, stage.key);
                  setDragItem(null);
                }}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">{stageItems.length}</Badge>
                </div>
                {stageValues[stage.key] > 0 && (
                  <p className="text-[10px] font-mono text-primary px-1 mb-2">{fmt(stageValues[stage.key])}</p>
                )}
                <div className="space-y-1.5">
                  {stageItems.map(item => (
                    <div key={item.id}
                      draggable
                      onDragStart={() => setDragItem(item.id)}
                      onDragEnd={() => setDragItem(null)}
                      className={`bg-card rounded-lg border border-border p-2 cursor-grab active:cursor-grabbing text-xs hover:border-primary/30 transition-colors ${dragItem === item.id ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-1">
                        <GripVertical className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-muted-foreground truncate">{item.agency}</p>
                          {item.value && <p className="font-mono text-primary font-semibold mt-0.5">{fmt(item.value)}</p>}
                        </div>
                        <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {/* Quick stage navigation */}
                      <div className="flex gap-0.5 mt-1.5 flex-wrap">
                        {STAGES.filter(s => s.key !== item.stage).slice(0, 3).map(s => (
                          <button key={s.key} onClick={() => moveToStage(item.id, s.key)}
                            className="text-[9px] px-1 py-0.5 rounded bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
