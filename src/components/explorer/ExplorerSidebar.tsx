import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Home, TrendingUp, Clock, Star, 
  Building2, FileText, Link2, Lightbulb, Server, Database,
  Tag, MapPin
} from 'lucide-react';
import type { DataCounts } from '@/hooks/useFileExplorer';

interface ExplorerSidebarProps {
  counts: DataCounts;
  currentFolderId: string;
  favorites: Set<string>;
  navigate: (id: string, name: string, type: string) => void;
  goHome: () => void;
}

function SidebarButton({ 
  icon, 
  label, 
  count, 
  onClick, 
  active 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count?: number; 
  onClick?: () => void; 
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
        active 
          ? 'bg-primary/10 text-primary' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground font-mono">{count.toLocaleString()}</span>
      )}
    </button>
  );
}

export function ExplorerSidebar({ 
  counts, 
  currentFolderId, 
  favorites, 
  navigate, 
  goHome 
}: ExplorerSidebarProps) {
  const formatNumber = (n: number) => n.toLocaleString();
  const totalItems = counts.entities + counts.facts + counts.relationships;

  return (
    <div className="h-full bg-card border-r border-border">
      <ScrollArea className="h-full">
        <div className="p-3 space-y-6">
          {/* Favorites */}
          {favorites.size > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Favorites
              </h3>
              <div className="space-y-0.5">
                <SidebarButton 
                  icon={<Star className="w-4 h-4 text-yellow-500" />} 
                  label="Favorites" 
                  count={favorites.size} 
                />
              </div>
            </div>
          )}

          {/* Quick Access */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Quick Access
            </h3>
            <div className="space-y-0.5">
              <SidebarButton 
                icon={<Home className="w-4 h-4" />} 
                label="Home" 
                onClick={goHome} 
                active={currentFolderId === 'root'} 
              />
              <SidebarButton 
                icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} 
                label="High Value" 
                onClick={() => navigate('entities-high-value', 'High Value', 'folder')} 
              />
              <SidebarButton 
                icon={<Clock className="w-4 h-4" />} 
                label="Recent" 
              />
            </div>
          </div>

          {/* Data Categories */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Data
            </h3>
            <div className="space-y-0.5">
              <SidebarButton
                icon={<Building2 className="w-4 h-4 text-primary" />}
                label="Entities"
                count={counts.entities}
                onClick={() => navigate('entities', 'Entities', 'folder')}
                active={currentFolderId === 'entities' || currentFolderId.startsWith('entities-') || currentFolderId.startsWith('type-') || currentFolderId.startsWith('state-')}
              />
              <SidebarButton
                icon={<FileText className="w-4 h-4 text-emerald-500" />}
                label="Facts"
                count={counts.facts}
                onClick={() => navigate('facts', 'Facts', 'folder')}
                active={currentFolderId === 'facts' || currentFolderId.startsWith('fact-type-')}
              />
              <SidebarButton
                icon={<Link2 className="w-4 h-4 text-purple-500" />}
                label="Relationships"
                count={counts.relationships}
                onClick={() => navigate('relationships', 'Relationships', 'folder')}
                active={currentFolderId === 'relationships'}
              />
              <SidebarButton
                icon={<Lightbulb className="w-4 h-4 text-yellow-500" />}
                label="Insights"
                count={counts.insights}
                onClick={() => navigate('insights', 'Insights', 'folder')}
                active={currentFolderId === 'insights'}
              />
              <SidebarButton
                icon={<Server className="w-4 h-4 text-cyan-500" />}
                label="Sources"
                count={counts.sources}
                onClick={() => navigate('sources', 'Sources', 'folder')}
                active={currentFolderId === 'sources' || currentFolderId.startsWith('source-')}
              />
              <SidebarButton
                icon={<Database className="w-4 h-4 text-orange-500" />}
                label="Records"
                count={counts.records}
                onClick={() => navigate('records', 'Records', 'folder')}
                active={currentFolderId === 'records' || currentFolderId.startsWith('record-')}
              />
            </div>
          </div>

          {/* Browse By */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Browse By
            </h3>
            <div className="space-y-0.5">
              <SidebarButton
                icon={<Tag className="w-4 h-4 text-pink-500" />}
                label="Entity Type"
                onClick={() => navigate('entities-by-type', 'By Type', 'folder')}
              />
              <SidebarButton
                icon={<MapPin className="w-4 h-4 text-rose-500" />}
                label="State"
                onClick={() => navigate('entities-by-state', 'By State', 'folder')}
              />
            </div>
          </div>

          {/* Storage Stats */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Storage
            </h3>
            <div className="px-2 space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Total Items</span>
                  <span className="font-mono">{formatNumber(totalItems)}</span>
                </div>
                <Progress value={Math.min((totalItems / 100000) * 100, 100)} className="h-1" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
