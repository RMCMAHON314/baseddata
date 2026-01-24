import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  ChevronRight, ChevronLeft, ChevronUp,
  Search, Grid3X3, List, LayoutGrid, Columns,
  ArrowUpDown, RefreshCw, Eye, EyeOff,
  PanelLeftClose, PanelLeft
} from 'lucide-react';
import type { ViewMode, SortField, PathItem } from '@/hooks/useFileExplorer';

interface ExplorerToolbarProps {
  currentPath: PathItem[];
  historyIndex: number;
  history: string[];
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
  showSidebar: boolean;
  showPreview: boolean;
  loading: boolean;
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  navigateToBreadcrumb: (index: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setShowSidebar: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  refresh: () => void;
}

export function ExplorerToolbar({
  currentPath,
  historyIndex,
  history,
  viewMode,
  sortField,
  sortOrder,
  searchQuery,
  showSidebar,
  showPreview,
  loading,
  goBack,
  goForward,
  goUp,
  navigateToBreadcrumb,
  setViewMode,
  setSortField,
  setSortOrder,
  setSearchQuery,
  setShowSidebar,
  setShowPreview,
  refresh,
}: ExplorerToolbarProps) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={historyIndex === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward} disabled={historyIndex >= history.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goUp} disabled={currentPath.length <= 1}>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go Up</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-0.5 text-sm">
            {currentPath.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`px-2 py-0.5 rounded hover:bg-muted transition-colors ${
                    i === currentPath.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search in this folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 bg-background text-sm"
            />
          </div>
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center gap-1">
          {/* View Mode */}
          <div className="flex border border-border rounded-md overflow-hidden">
            {(['list', 'grid', 'columns', 'gallery'] as ViewMode[]).map(mode => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === mode ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 rounded-none"
                    onClick={() => setViewMode(mode)}
                  >
                    {mode === 'list' && <List className="w-3.5 h-3.5" />}
                    {mode === 'grid' && <Grid3X3 className="w-3.5 h-3.5" />}
                    {mode === 'columns' && <Columns className="w-3.5 h-3.5" />}
                    {mode === 'gallery' && <LayoutGrid className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="capitalize">{mode} View</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1" /> Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(['name', 'modified', 'size', 'type', 'score'] as SortField[]).map(field => (
                <DropdownMenuItem key={field} onClick={() => setSortField(field)}>
                  {sortField === field && '✓ '}{field.charAt(0).toUpperCase() + field.slice(1)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle Buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showSidebar ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Sidebar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showPreview ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Preview</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
