import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Building2, MapPin, TrendingUp, FileText } from 'lucide-react';

interface SpotlightEntity {
  id: string;
  canonical_name: string;
  entity_type: string;
  state: string;
  city: string;
  total_contract_value: number;
  contract_count: number;
  opportunity_score: number;
  description: string;
}

export function EntitySpotlight() {
  const [entities, setEntities] = useState<SpotlightEntity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    loadSpotlightEntities();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || entities.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % entities.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, entities.length]);

  async function loadSpotlightEntities() {
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, city, total_contract_value, contract_count, opportunity_score, description')
      .eq('is_canonical', true)
      .not('total_contract_value', 'is', null)
      .gte('opportunity_score', 50)
      .order('total_contract_value', { ascending: false })
      .limit(10);

    if (data) setEntities(data as SpotlightEntity[]);
  }

  const formatCurrency = (n: number) => {
    if (!n) return '$0';
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  };

  if (entities.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No featured entities available yet.</p>
          <p className="text-sm">Run the Ocean Controller to ingest data.</p>
        </CardContent>
      </Card>
    );
  }

  const entity = entities[currentIndex];

  return (
    <Card className="bg-gradient-to-br from-card to-muted border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Entity Info */}
          <div className="flex-1 p-8">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">Featured Entity</Badge>
            
            <h2 className="text-3xl font-black mb-4">{entity.canonical_name}</h2>
            
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Badge variant="outline">{entity.entity_type || 'Organization'}</Badge>
              {entity.city && entity.state && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {entity.city}, {entity.state}
                </Badge>
              )}
              {entity.state && !entity.city && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {entity.state}
                </Badge>
              )}
              {entity.opportunity_score && (
                <Badge className={`${
                  entity.opportunity_score >= 80 ? 'bg-green-500/20 text-green-400' :
                  entity.opportunity_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  Score: {entity.opportunity_score}
                </Badge>
              )}
            </div>

            {entity.description && (
              <p className="text-muted-foreground mb-6 line-clamp-3">{entity.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background/50 rounded-lg p-4">
                <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-2xl font-bold text-green-400 font-mono">{formatCurrency(entity.total_contract_value)}</p>
                <p className="text-xs text-muted-foreground">Total Contract Value</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <FileText className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-bold text-primary font-mono">{entity.contract_count || 0}</p>
                <p className="text-xs text-muted-foreground">Contracts</p>
              </div>
            </div>

            <Link to={`/entity/${entity.id}`}>
              <Button className="bg-gradient-to-r from-primary to-cyan-600">
                <Building2 className="w-4 h-4 mr-2" />
                View Full Profile
              </Button>
            </Link>
          </div>

          {/* Right: Navigation */}
          <div className="w-full md:w-64 bg-background/50 p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {currentIndex + 1} of {entities.length}
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {entities.map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => { setCurrentIndex(i); setIsAutoPlaying(false); }}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      i === currentIndex 
                        ? 'bg-primary/20 border border-primary/30' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className={`text-sm truncate ${i === currentIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                      {e.canonical_name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCurrentIndex((i) => (i - 1 + entities.length) % entities.length); setIsAutoPlaying(false); }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                {isAutoPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCurrentIndex((i) => (i + 1) % entities.length); setIsAutoPlaying(false); }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
