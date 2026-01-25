// Teaming Partners Component - Discovers and displays potential teaming partners
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Handshake, Building2, Award, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface TeamingPartnersProps {
  entityId: string;
  entityName: string;
  limit?: number;
}

interface Partner {
  id: string;
  name: string;
  state: string;
  sharedAgencies: number;
  sharedNaics: number;
  contractValue: number;
  score: number;
}

export function TeamingPartners({ entityId, entityName, limit = 6 }: TeamingPartnersProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    discoverPartners();
  }, [entityId]);

  async function discoverPartners() {
    setLoading(true);
    try {
      // Get entity's contracts to find agencies and NAICS codes
      const { data: entityContracts } = await supabase
        .from('contracts')
        .select('awarding_agency, naics_code')
        .eq('recipient_entity_id', entityId)
        .limit(100);

      if (!entityContracts || entityContracts.length === 0) {
        setLoading(false);
        return;
      }

      const agencies = [...new Set(entityContracts.map(c => c.awarding_agency).filter(Boolean))];
      const naicsCodes = [...new Set(entityContracts.map(c => c.naics_code).filter(Boolean))];

      if (agencies.length === 0) {
        setLoading(false);
        return;
      }

      // Find entities with contracts at same agencies
      const { data: potentialPartners } = await supabase
        .from('contracts')
        .select('recipient_entity_id, recipient_name, awarding_agency, naics_code, award_amount')
        .in('awarding_agency', agencies)
        .neq('recipient_entity_id', entityId)
        .not('recipient_entity_id', 'is', null)
        .limit(500);

      if (!potentialPartners || potentialPartners.length === 0) {
        setLoading(false);
        return;
      }

      // Score and aggregate partners
      const partnerMap = new Map<string, {
        id: string;
        name: string;
        agencies: Set<string>;
        naics: Set<string>;
        value: number;
      }>();

      potentialPartners.forEach(c => {
        const existing = partnerMap.get(c.recipient_entity_id);
        if (existing) {
          existing.agencies.add(c.awarding_agency);
          if (naicsCodes.includes(c.naics_code)) {
            existing.naics.add(c.naics_code);
          }
          existing.value += Number(c.award_amount) || 0;
        } else {
          partnerMap.set(c.recipient_entity_id, {
            id: c.recipient_entity_id,
            name: c.recipient_name,
            agencies: new Set([c.awarding_agency]),
            naics: naicsCodes.includes(c.naics_code) ? new Set([c.naics_code]) : new Set(),
            value: Number(c.award_amount) || 0
          });
        }
      });

      // Get state info for partners
      const partnerIds = [...partnerMap.keys()];
      const { data: partnerEntities } = await supabase
        .from('core_entities')
        .select('id, state')
        .in('id', partnerIds.slice(0, 50));

      const stateMap = new Map(partnerEntities?.map(e => [e.id, e.state]) || []);

      // Calculate scores and sort
      const scoredPartners = [...partnerMap.values()]
        .map(p => ({
          id: p.id,
          name: p.name,
          state: stateMap.get(p.id) || 'Unknown',
          sharedAgencies: p.agencies.size,
          sharedNaics: p.naics.size,
          contractValue: p.value,
          score: (p.agencies.size * 30) + (p.naics.size * 20) + Math.min(p.value / 10000000, 50)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      setPartners(scoredPartners);
    } catch (error) {
      console.error('Error discovering partners:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (partners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Potential Teaming Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No teaming partners discovered yet</p>
          <p className="text-xs text-muted-foreground mt-1">Need more contract data to identify partners</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Potential Teaming Partners
          </CardTitle>
          <Badge variant="secondary">{partners.length} found</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/entity/${partner.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer">
                  <Avatar className="h-10 w-10 bg-primary/10">
                    <AvatarFallback className="text-primary text-sm font-bold">
                      {partner.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {partner.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{partner.state}</span>
                      <span>•</span>
                      <span>{formatCurrency(partner.contractValue)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{partner.sharedAgencies}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="h-3 w-3" />
                      <span>{partner.sharedNaics}</span>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
