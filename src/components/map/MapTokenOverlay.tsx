import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type BasemapMode = 'osm' | 'mapbox';

interface MapTokenOverlayProps {
  basemap: BasemapMode;
  tokenInput: string;
  onTokenInputChange: (v: string) => void;
  tokenError?: string | null;
  onSaveToken: () => void;
  onUseOsm: () => void;
  onUseMapbox: () => void;
  className?: string;
}

export const MapTokenOverlay = React.forwardRef<HTMLDivElement, MapTokenOverlayProps>(
  (
    {
      basemap,
      tokenInput,
      onTokenInputChange,
      tokenError,
      onSaveToken,
      onUseOsm,
      onUseMapbox,
      className,
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn(className)}>
        <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Basemap:{' '}
              <span className="text-foreground font-medium">
                {basemap === 'mapbox' ? 'Mapbox' : 'Free (OSM)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={basemap === 'osm' ? 'secondary' : 'outline'}
                onClick={onUseOsm}
              >
                OSM
              </Button>
              <Button
                size="sm"
                variant={basemap === 'mapbox' ? 'secondary' : 'outline'}
                onClick={onUseMapbox}
              >
                Mapbox
              </Button>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Input
              value={tokenInput}
              onChange={(e) => onTokenInputChange(e.target.value)}
              placeholder='Paste Mapbox public token (pk...)'
              className="h-9"
            />
            <Button
              size="sm"
              className="h-9"
              onClick={onSaveToken}
            >
              Save
            </Button>
          </div>

          {tokenError ? <div className="mt-2 text-xs text-destructive">{tokenError}</div> : null}

          <div className="mt-2 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              Token saves locally in this browser.
            </div>
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Get token <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }
);

MapTokenOverlay.displayName = 'MapTokenOverlay';
