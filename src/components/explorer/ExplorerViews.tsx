import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { Folder, Star, StarOff, Eye, Copy, Download, Share2, Info, FolderOpen, ChevronRight } from 'lucide-react';
import { getTypeIcon, getStatusIcon } from './ExplorerIcons';
import type { FileNode, ViewMode } from '@/hooks/useFileExplorer';

interface ExplorerViewsProps {
  viewMode: ViewMode;
  items: FileNode[];
  selectedItems: Set<string>;
  favorites: Set<string>;
  loading: boolean;
  rootItems: FileNode[];
  currentPath: { id: string; name: string; type: string }[];
  handleItemClick: (item: FileNode, e: React.MouseEvent) => void;
  handleItemDoubleClick: (item: FileNode) => void;
  toggleFavorite: (id: string) => void;
  navigate: (id: string, name: string, type: string) => void;
  setPreviewItem: (item: FileNode) => void;
}

function formatDate(d?: string) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString();
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

function ItemContextMenu({ 
  item, 
  favorites, 
  toggleFavorite, 
  handleItemDoubleClick, 
  setPreviewItem,
  children 
}: { 
  item: FileNode; 
  favorites: Set<string>; 
  toggleFavorite: (id: string) => void;
  handleItemDoubleClick: (item: FileNode) => void;
  setPreviewItem: (item: FileNode) => void;
  children: React.ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleItemDoubleClick(item)}>
          <FolderOpen className="w-4 h-4 mr-2" /> Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setPreviewItem(item)}>
          <Eye className="w-4 h-4 mr-2" /> Quick Look
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => toggleFavorite(item.id)}>
          {favorites.has(item.id) ? (
            <><StarOff className="w-4 h-4 mr-2" /> Remove from Favorites</>
          ) : (
            <><Star className="w-4 h-4 mr-2" /> Add to Favorites</>
          )}
        </ContextMenuItem>
        <ContextMenuItem><Copy className="w-4 h-4 mr-2" /> Copy</ContextMenuItem>
        <ContextMenuItem><Download className="w-4 h-4 mr-2" /> Export</ContextMenuItem>
        <ContextMenuItem><Share2 className="w-4 h-4 mr-2" /> Share</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem><Info className="w-4 h-4 mr-2" /> Get Info</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
      <Folder className="w-20 h-20 mb-4 opacity-30" />
      <p className="text-lg">This folder is empty</p>
      <p className="text-sm mt-1">No items match your search</p>
    </div>
  );
}

function ListView({ items, selectedItems, favorites, handleItemClick, handleItemDoubleClick, toggleFavorite, setPreviewItem }: Omit<ExplorerViewsProps, 'viewMode' | 'loading' | 'rootItems' | 'currentPath' | 'navigate'>) {
  return (
    <ScrollArea className="h-full">
      <div className="min-w-full">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size/Info</div>
            <div className="col-span-2">Modified</div>
          </div>
        </div>

        {/* Items */}
        <div>
          {items.map(item => (
            <ItemContextMenu key={item.id} item={item} favorites={favorites} toggleFavorite={toggleFavorite} handleItemDoubleClick={handleItemDoubleClick} setPreviewItem={setPreviewItem}>
              <div
                className={`grid grid-cols-12 gap-2 px-4 py-2 cursor-pointer transition-all border-l-2 ${
                  selectedItems.has(item.id)
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted border-transparent'
                }`}
                onClick={(e) => handleItemClick(item, e)}
                onDoubleClick={() => handleItemDoubleClick(item)}
              >
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  {getTypeIcon(item.type)}
                  <span className="truncate">{item.name}</span>
                  {item.count !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-5">{formatNumber(item.count)}</Badge>
                  )}
                  {item.score && item.score >= 70 && (
                    <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px] h-5">{item.score}</Badge>
                  )}
                  {favorites.has(item.id) && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {getStatusIcon(item.status)}
                </div>
                <div className="col-span-2 text-muted-foreground text-sm capitalize truncate">{item.type}</div>
                <div className="col-span-2 text-muted-foreground text-sm truncate">{item.size || '-'}</div>
                <div className="col-span-2 text-muted-foreground text-sm">{formatDate(item.modified)}</div>
              </div>
            </ItemContextMenu>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function GridView({ items, selectedItems, favorites, handleItemClick, handleItemDoubleClick }: Pick<ExplorerViewsProps, 'items' | 'selectedItems' | 'favorites' | 'handleItemClick' | 'handleItemDoubleClick'>) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all ${
              selectedItems.has(item.id)
                ? 'bg-primary/20 ring-1 ring-primary'
                : 'hover:bg-muted'
            }`}
            onClick={(e) => handleItemClick(item, e)}
            onDoubleClick={() => handleItemDoubleClick(item)}
          >
            <div className="relative mb-2">
              {React.cloneElement(getTypeIcon(item.type, 'w-12 h-12') as React.ReactElement)}
              {favorites.has(item.id) && (
                <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <span className="text-xs text-center truncate w-full">{item.name}</span>
            {item.count !== undefined && (
              <span className="text-[10px] text-muted-foreground mt-0.5">{formatNumber(item.count)} items</span>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function GalleryView({ items, selectedItems, handleItemClick, handleItemDoubleClick }: Pick<ExplorerViewsProps, 'items' | 'selectedItems' | 'handleItemClick' | 'handleItemDoubleClick'>) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={(e) => handleItemClick(item, e)}
            onDoubleClick={() => handleItemDoubleClick(item)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                {getTypeIcon(item.type, 'w-8 h-8')}
                {getStatusIcon(item.status)}
              </div>
              <h4 className="font-medium truncate mb-1">{item.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{item.size || item.type}</p>
              {item.score && (
                <div className="mt-2">
                  <Progress value={item.score} className="h-1" />
                  <span className="text-[10px] text-muted-foreground">Score: {item.score}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function ColumnsView({ items, selectedItems, rootItems, currentPath, handleItemClick, handleItemDoubleClick, navigate }: Pick<ExplorerViewsProps, 'items' | 'selectedItems' | 'rootItems' | 'currentPath' | 'handleItemClick' | 'handleItemDoubleClick' | 'navigate'>) {
  return (
    <div className="h-full flex">
      <ScrollArea className="w-64 border-r border-border flex-shrink-0">
        <div className="p-2">
          {rootItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentPath.some(p => p.id === item.id) ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
              }`}
              onClick={() => navigate(item.id, item.name, item.type)}
            >
              <div className="flex items-center gap-2">
                {getTypeIcon(item.type)}
                <span className="text-sm">{item.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </ScrollArea>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedItems.has(item.id) ? 'bg-primary/20' : 'hover:bg-muted'
              }`}
              onClick={(e) => handleItemClick(item, e)}
              onDoubleClick={() => handleItemDoubleClick(item)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {getTypeIcon(item.type)}
                <span className="text-sm truncate">{item.name}</span>
              </div>
              {item.type === 'folder' && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ExplorerViews({
  viewMode,
  items,
  selectedItems,
  favorites,
  loading,
  rootItems,
  currentPath,
  handleItemClick,
  handleItemDoubleClick,
  toggleFavorite,
  navigate,
  setPreviewItem,
}: ExplorerViewsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  switch (viewMode) {
    case 'list':
      return <ListView items={items} selectedItems={selectedItems} favorites={favorites} handleItemClick={handleItemClick} handleItemDoubleClick={handleItemDoubleClick} toggleFavorite={toggleFavorite} setPreviewItem={setPreviewItem} />;
    case 'grid':
      return <GridView items={items} selectedItems={selectedItems} favorites={favorites} handleItemClick={handleItemClick} handleItemDoubleClick={handleItemDoubleClick} />;
    case 'gallery':
      return <GalleryView items={items} selectedItems={selectedItems} handleItemClick={handleItemClick} handleItemDoubleClick={handleItemDoubleClick} />;
    case 'columns':
      return <ColumnsView items={items} selectedItems={selectedItems} rootItems={rootItems} currentPath={currentPath} handleItemClick={handleItemClick} handleItemDoubleClick={handleItemDoubleClick} navigate={navigate} />;
    default:
      return <ListView items={items} selectedItems={selectedItems} favorites={favorites} handleItemClick={handleItemClick} handleItemDoubleClick={handleItemDoubleClick} toggleFavorite={toggleFavorite} setPreviewItem={setPreviewItem} />;
  }
}
