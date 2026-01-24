import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// US State coordinates (simplified for bubble display)
const stateCoords: Record<string, { x: number; y: number }> = {
  'AL': { x: 580, y: 380 }, 'AK': { x: 150, y: 460 }, 'AZ': { x: 230, y: 360 },
  'AR': { x: 500, y: 350 }, 'CA': { x: 120, y: 280 }, 'CO': { x: 320, y: 280 },
  'CT': { x: 720, y: 180 }, 'DE': { x: 700, y: 230 }, 'FL': { x: 650, y: 440 },
  'GA': { x: 620, y: 380 }, 'HI': { x: 250, y: 480 }, 'ID': { x: 210, y: 160 },
  'IL': { x: 540, y: 250 }, 'IN': { x: 570, y: 250 }, 'IA': { x: 480, y: 220 },
  'KS': { x: 410, y: 290 }, 'KY': { x: 590, y: 290 }, 'LA': { x: 500, y: 420 },
  'ME': { x: 750, y: 100 }, 'MD': { x: 680, y: 240 }, 'MA': { x: 730, y: 160 },
  'MI': { x: 570, y: 180 }, 'MN': { x: 470, y: 140 }, 'MS': { x: 540, y: 390 },
  'MO': { x: 490, y: 290 }, 'MT': { x: 270, y: 120 }, 'NE': { x: 400, y: 230 },
  'NV': { x: 170, y: 260 }, 'NH': { x: 730, y: 130 }, 'NJ': { x: 710, y: 210 },
  'NM': { x: 300, y: 360 }, 'NY': { x: 690, y: 170 }, 'NC': { x: 660, y: 310 },
  'ND': { x: 400, y: 120 }, 'OH': { x: 610, y: 240 }, 'OK': { x: 420, y: 340 },
  'OR': { x: 140, y: 150 }, 'PA': { x: 670, y: 210 }, 'RI': { x: 740, y: 170 },
  'SC': { x: 650, y: 350 }, 'SD': { x: 400, y: 170 }, 'TN': { x: 570, y: 320 },
  'TX': { x: 380, y: 420 }, 'UT': { x: 240, y: 270 }, 'VT': { x: 720, y: 120 },
  'VA': { x: 670, y: 270 }, 'WA': { x: 150, y: 90 }, 'WV': { x: 640, y: 260 },
  'WI': { x: 520, y: 170 }, 'WY': { x: 300, y: 200 }, 'DC': { x: 690, y: 250 }
};

interface StateData {
  state: string;
  count: number;
  value: number;
}

export function ContractHeatmap() {
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [maxValue, setMaxValue] = useState(0);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);

  useEffect(() => {
    loadStateData();
  }, []);

  async function loadStateData() {
    const { data } = await supabase
      .from('contracts')
      .select('pop_state, award_amount')
      .not('pop_state', 'is', null)
      .limit(5000);

    if (!data) return;

    // Aggregate by state
    const stateMap = new Map<string, { count: number; value: number }>();
    data.forEach(c => {
      const state = c.pop_state;
      const existing = stateMap.get(state) || { count: 0, value: 0 };
      stateMap.set(state, {
        count: existing.count + 1,
        value: existing.value + (c.award_amount || 0)
      });
    });

    const stateArray = Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      ...data
    }));

    setStateData(stateArray);
    setMaxValue(Math.max(...stateArray.map(s => s.value), 1));
  }

  const getColor = (value: number) => {
    const intensity = Math.min(value / maxValue, 1);
    // Gradient from cyan-200 to cyan-500
    const r = Math.round(34 + intensity * (6 - 34));
    const g = Math.round(211 + intensity * (182 - 211));
    const b = Math.round(238 + intensity * (212 - 238));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getSize = (value: number) => {
    const intensity = Math.min(value / maxValue, 1);
    return 10 + intensity * 40;
  };

  const formatCurrency = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    return `$${(n / 1000).toFixed(0)}K`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Contract Value by State</span>
          {selectedState && (
            <div className="text-right">
              <Badge variant="outline" className="text-lg">{selectedState.state}</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedState.count.toLocaleString()} contracts • {formatCurrency(selectedState.value)}
              </p>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ aspectRatio: '1.6/1' }}>
          <svg viewBox="0 0 800 500" className="w-full h-full">
            {/* Background */}
            <rect width="800" height="500" fill="transparent" />
            
            {/* Draw states */}
            {stateData.map(s => {
              const coords = stateCoords[s.state];
              if (!coords) return null;
              const size = getSize(s.value);
              const isSelected = selectedState?.state === s.state;
              
              return (
                <g key={s.state}>
                  {/* Glow effect for selected */}
                  {isSelected && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={size / 2 + 8}
                      fill={getColor(s.value)}
                      opacity={0.3}
                    />
                  )}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={size / 2}
                    fill={getColor(s.value)}
                    stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isSelected ? 3 : 1}
                    opacity={0.85}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onMouseEnter={() => setSelectedState(s)}
                    onMouseLeave={() => setSelectedState(null)}
                  />
                  <text
                    x={coords.x}
                    y={coords.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={size > 20 ? 10 : 8}
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {s.state}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-400/30" />
            <span className="text-xs text-muted-foreground">Lower Value</span>
          </div>
          <div className="w-32 h-2 bg-gradient-to-r from-cyan-400/30 to-cyan-400 rounded" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-400" />
            <span className="text-xs text-muted-foreground">Higher Value</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
