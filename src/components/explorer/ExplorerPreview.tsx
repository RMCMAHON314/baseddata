import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FolderOpen, Star, StarOff, Download } from 'lucide-react';
import { getTypeIcon, getStatusIcon } from './ExplorerIcons';
import type { FileNode } from '@/hooks/useFileExplorer';

interface ExplorerPreviewProps {
  previewItem: FileNode | null;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  handleItemDoubleClick: (item: FileNode) => void;
}

function DetailRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-bold text-emerald-500' : ''}>{value}</span>
    </div>
  );
}

function formatDate(d?: string) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString();
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

export function ExplorerPreview({
  previewItem,
  favorites,
  toggleFavorite,
  handleItemDoubleClick,
}: ExplorerPreviewProps) {
  return (
    <div className="h-full bg-card border-l border-border">
      <ScrollArea className="h-full">
        {previewItem ? (
          <div className="p-5">
            {/* Preview Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 flex items-center justify-center mb-3">
                {React.cloneElement(getTypeIcon(previewItem.type, 'w-16 h-16') as React.ReactElement)}
              </div>
              <h2 className="text-lg font-bold text-center leading-tight">{previewItem.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">{previewItem.type}</Badge>
                {getStatusIcon(previewItem.status)}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Information</h4>
                <div className="space-y-2 text-sm">
                  <DetailRow label="Type" value={previewItem.type} />
                  {previewItem.size && <DetailRow label="Info" value={previewItem.size} />}
                  {previewItem.count !== undefined && <DetailRow label="Items" value={formatNumber(previewItem.count)} />}
                  {previewItem.score && <DetailRow label="Score" value={previewItem.score} highlight />}
                  {previewItem.modified && <DetailRow label="Modified" value={formatDate(previewItem.modified)} />}
                </div>
              </div>

              {/* Data Preview */}
              {previewItem.data && (
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Raw Data</h4>
                  <div className="bg-muted rounded-lg p-3 max-h-60 overflow-auto">
                    <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(previewItem.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button className="w-full h-9" onClick={() => handleItemDoubleClick(previewItem)}>
                  <FolderOpen className="w-4 h-4 mr-2" /> Open
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleFavorite(previewItem.id)}>
                    {favorites.has(previewItem.id) ? <StarOff className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                    {favorites.has(previewItem.id) ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
            <Eye className="w-16 h-16 mb-4 opacity-30" />
            <p>Select an item to preview</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
