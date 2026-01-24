import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { ExplorerToolbar } from '@/components/explorer/ExplorerToolbar';
import { ExplorerSidebar } from '@/components/explorer/ExplorerSidebar';
import { ExplorerPreview } from '@/components/explorer/ExplorerPreview';
import { ExplorerViews } from '@/components/explorer/ExplorerViews';

export default function FileExplorer() {
  const explorer = useFileExplorer();

  return (
    <TooltipProvider>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
        {/* Toolbar */}
        <ExplorerToolbar
          currentPath={explorer.currentPath}
          historyIndex={explorer.historyIndex}
          history={explorer.history}
          viewMode={explorer.viewMode}
          sortField={explorer.sortField}
          sortOrder={explorer.sortOrder}
          searchQuery={explorer.searchQuery}
          showSidebar={explorer.showSidebar}
          showPreview={explorer.showPreview}
          loading={explorer.loading}
          goBack={explorer.goBack}
          goForward={explorer.goForward}
          goUp={explorer.goUp}
          navigateToBreadcrumb={explorer.navigateToBreadcrumb}
          setViewMode={explorer.setViewMode}
          setSortField={explorer.setSortField}
          setSortOrder={explorer.setSortOrder}
          setSearchQuery={explorer.setSearchQuery}
          setShowSidebar={explorer.setShowSidebar}
          setShowPreview={explorer.setShowPreview}
          refresh={explorer.refresh}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Sidebar */}
            {explorer.showSidebar && (
              <>
                <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
                  <ExplorerSidebar
                    counts={explorer.counts}
                    currentFolderId={explorer.currentFolderId}
                    favorites={explorer.favorites}
                    navigate={explorer.navigate}
                    goHome={explorer.goHome}
                  />
                </ResizablePanel>
                <ResizableHandle className="bg-transparent hover:bg-primary/50 transition-colors w-1" />
              </>
            )}

            {/* Main File View */}
            <ResizablePanel defaultSize={explorer.showPreview ? 57 : 82}>
              <div className="h-full bg-background">
                <ExplorerViews
                  viewMode={explorer.viewMode}
                  items={explorer.filteredItems}
                  selectedItems={explorer.selectedItems}
                  favorites={explorer.favorites}
                  loading={explorer.loading}
                  rootItems={explorer.getRootItems()}
                  currentPath={explorer.currentPath}
                  handleItemClick={explorer.handleItemClick}
                  handleItemDoubleClick={explorer.handleItemDoubleClick}
                  toggleFavorite={explorer.toggleFavorite}
                  navigate={explorer.navigate}
                  setPreviewItem={explorer.setPreviewItem}
                />
              </div>
            </ResizablePanel>

            {/* Preview Panel */}
            {explorer.showPreview && (
              <>
                <ResizableHandle className="bg-transparent hover:bg-primary/50 transition-colors w-1" />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <ExplorerPreview
                    previewItem={explorer.previewItem}
                    favorites={explorer.favorites}
                    toggleFavorite={explorer.toggleFavorite}
                    handleItemDoubleClick={explorer.handleItemDoubleClick}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <div className="flex-shrink-0 border-t border-border bg-card px-4 py-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {explorer.filteredItems.length} items
              {explorer.selectedItems.size > 0 && ` • ${explorer.selectedItems.size} selected`}
            </span>
            <span className="font-mono">
              {explorer.counts.entities.toLocaleString()} entities • {explorer.counts.facts.toLocaleString()} facts • {explorer.counts.relationships.toLocaleString()} relationships
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
