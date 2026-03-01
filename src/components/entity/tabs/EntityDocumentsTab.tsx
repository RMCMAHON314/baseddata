// BOMB-02 — Documents Tab: SEC filings, patents, lobbying disclosures, clinical trials
import { useQuery } from '@tanstack/react-query';
import { FileText, Scale, FlaskConical, Scroll, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate } from '@/pages/EntityIntelligenceHub';
import { useState } from 'react';

interface Props { entityId: string; entityName: string; }

export function EntityDocumentsTab({ entityId, entityName }: Props) {
  // SEC Filings
  const { data: secFilings, isLoading: secLoading } = useQuery({
    queryKey: ['entity-sec', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('sec_filings')
        .select('*')
        .ilike('company_name', `%${entityName}%`)
        .order('filing_date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Patents
  const { data: patents, isLoading: patentsLoading } = useQuery({
    queryKey: ['entity-patents', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('uspto_patents')
        .select('*')
        .ilike('assignee_name', `%${entityName}%`)
        .order('grant_date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Lobbying
  const { data: lobbying, isLoading: lobbyingLoading } = useQuery({
    queryKey: ['entity-lobbying', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('lobbying_disclosures')
        .select('*')
        .ilike('registrant_name', `%${entityName}%`)
        .order('filing_date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Clinical Trials
  const { data: trials, isLoading: trialsLoading } = useQuery({
    queryKey: ['entity-trials', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('clinical_trials')
        .select('*')
        .ilike('lead_sponsor_name', `%${entityName}%`)
        .order('start_date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const isLoading = secLoading || patentsLoading || lobbyingLoading || trialsLoading;
  const totalDocs = (secFilings?.length || 0) + (patents?.length || 0) + (lobbying?.length || 0) + (trials?.length || 0);

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  if (totalDocs === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No documents found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No SEC filings, patents, lobbying disclosures, or clinical trials linked to this entity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{totalDocs} documents across {[secFilings?.length, patents?.length, lobbying?.length, trials?.length].filter(n => n && n > 0).length} sources</p>

      {/* SEC Filings */}
      {secFilings && secFilings.length > 0 && (
        <DocumentSection
          title={`SEC Filings (${secFilings.length})`}
          icon={Scale}
          items={secFilings.map((f: any) => ({
            title: f.form_type || 'Filing',
            subtitle: f.company_name,
            date: f.filing_date,
            link: f.url,
            badge: f.form_type,
          }))}
        />
      )}

      {/* Patents */}
      {patents && patents.length > 0 && (
        <DocumentSection
          title={`Patents (${patents.length})`}
          icon={FlaskConical}
          items={patents.map((p: any) => ({
            title: p.title || 'Patent',
            subtitle: `Patent #${p.patent_number || 'N/A'} · ${p.assignee_name}`,
            date: p.grant_date,
            link: p.url,
            badge: p.patent_type || 'Patent',
          }))}
        />
      )}

      {/* Lobbying */}
      {lobbying && lobbying.length > 0 && (
        <DocumentSection
          title={`Lobbying Disclosures (${lobbying.length})`}
          icon={Scroll}
          items={lobbying.map((l: any) => ({
            title: l.specific_issues?.slice(0, 100) || l.general_issue || 'Lobbying Disclosure',
            subtitle: `${l.registrant_name} · ${l.client_name || ''}`,
            date: l.filing_date,
            link: l.url,
            badge: l.filing_type || 'LD',
          }))}
        />
      )}

      {/* Clinical Trials */}
      {trials && trials.length > 0 && (
        <DocumentSection
          title={`Clinical Trials (${trials.length})`}
          icon={FlaskConical}
          items={trials.map((t: any) => ({
            title: t.title,
            subtitle: `${t.nct_id} · ${t.overall_status || 'Unknown status'} · Phase ${t.phase || 'N/A'}`,
            date: t.start_date,
            link: t.url || `https://clinicaltrials.gov/study/${t.nct_id}`,
            badge: t.phase || 'Trial',
          }))}
        />
      )}
    </div>
  );
}

function DocumentSection({ title, icon: Icon, items }: {
  title: string;
  icon: React.ElementType;
  items: { title: string; subtitle: string; date: string | null; link?: string; badge?: string }[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />{title}
              </span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && <Badge variant="outline" className="text-xs">{item.badge}</Badge>}
                  <span className="text-xs text-muted-foreground">{fmtDate(item.date)}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
