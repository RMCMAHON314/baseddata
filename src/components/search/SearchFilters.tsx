import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';

export interface SearchFilterState {
  states: string[];
  entityTypes: string[];
  agencies: string[];
  minValue: number;
  maxValue: number;
  setAsides: string[];
  dataSources: string[];
}

interface SearchFiltersProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  aggregations?: {
    by_state?: { key: string; count: number }[];
    by_agency?: { key: string; count: number }[];
  };
}

const ENTITY_TYPES = ['Company', 'Agency', 'University', 'Non-profit', 'Individual', 'Other'];
const DEFAULT_STATES = ['MD', 'VA', 'DC', 'DE', 'PA', 'CA', 'TX', 'FL', 'NY', 'GA', 'OH', 'IL', 'WA', 'CO', 'NC'];
const SET_ASIDES = ['Small Business', '8(a)', 'HUBZone', 'WOSB', 'SDVOSB', 'Service-Disabled Veteran', 'Economically Disadvantaged'];
const DATA_SOURCES = ['contracts', 'grants', 'opportunities', 'sbir_awards', 'sam_entities'];

export function SearchFilters({ filters, onChange, aggregations }: SearchFiltersProps) {
  const update = (partial: Partial<SearchFilterState>) => onChange({ ...filters, ...partial });

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const activeCount = filters.states.length + filters.entityTypes.length + filters.agencies.length +
    filters.setAsides.length + filters.dataSources.length + (filters.minValue > 0 ? 1 : 0);

  const stateList = aggregations?.by_state?.length ? aggregations.by_state.map(s => s.key) : DEFAULT_STATES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {activeCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{activeCount}</Badge>}
        </h3>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onChange({
            states: [], entityTypes: [], agencies: [], minValue: 0, maxValue: 0, setAsides: [], dataSources: []
          })}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Value Range */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Value Range</h4>
          <div className="space-y-3">
            <Slider
              value={[filters.minValue]}
              onValueChange={([v]) => update({ minValue: v })}
              max={100000000}
              step={100000}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Min $" value={filters.minValue || ''} onChange={e => update({ minValue: Number(e.target.value) || 0 })} className="h-8 text-xs" />
              <span className="text-muted-foreground text-xs">to</span>
              <Input type="number" placeholder="Max $" value={filters.maxValue || ''} onChange={e => update({ maxValue: Number(e.target.value) || 0 })} className="h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Type */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity Type</h4>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {ENTITY_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={filters.entityTypes.includes(type)} onCheckedChange={() => update({ entityTypes: toggleItem(filters.entityTypes, type) })} />
                  <span className="text-foreground">{type}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* State */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</h4>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {stateList.map(st => (
                    <label key={st} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.states.includes(st)} onCheckedChange={() => update({ states: toggleItem(filters.states, st) })} />
                      <span className="text-foreground">{st}</span>
                      {aggregations?.by_state?.find(s => s.key === st) && (
                        <span className="ml-auto text-xs text-muted-foreground">{aggregations.by_state.find(s => s.key === st)?.count}</span>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Set-Aside Type */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set-Aside</h4>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {SET_ASIDES.map(sa => (
                <label key={sa} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={filters.setAsides.includes(sa)} onCheckedChange={() => update({ setAsides: toggleItem(filters.setAsides, sa) })} />
                  <span className="text-foreground">{sa}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Source</h4>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {DATA_SOURCES.map(ds => (
                <label key={ds} className="flex items-center gap-2 cursor-pointer text-sm capitalize">
                  <Checkbox checked={filters.dataSources.includes(ds)} onCheckedChange={() => update({ dataSources: toggleItem(filters.dataSources, ds) })} />
                  <span className="text-foreground">{ds.replace('_', ' ')}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
