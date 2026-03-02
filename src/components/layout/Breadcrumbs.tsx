import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const routeLabels: Record<string, string> = {
  explore: "Market Explorer",
  entities: "Entities",
  opportunities: "Opportunities",
  analytics: "Analytics",
  intelligence: "Intelligence",
  "saved-searches": "Saved Searches",
  compare: "Compare",
  agency: "Agency",
  entity: "Entity",
  dashboard: "Dashboard",
  search: "Search",
  sbir: "SBIR Explorer",
  healthcare: "Healthcare",
  education: "Education",
  "labor-rates": "Labor Rates",
  pricing: "Pricing",
  "api-docs": "API Docs",
  health: "Health",
  admin: "Admin",
  ocean: "Pipeline",
  diagnostic: "Diagnostic",
  "gap-fixer": "Gap Fixer",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Auto-resolve entity name from UUID in path like /entity/:id
  const entityId = segments[0] === 'entity' && segments[1] && UUID_REGEX.test(segments[1]) ? segments[1] : null;
  const { data: entityName } = useQuery({
    queryKey: ['breadcrumb-entity', entityId],
    queryFn: async () => {
      const { data } = await supabase.from('core_entities').select('canonical_name').eq('id', entityId!).single();
      return data?.canonical_name || null;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground px-4 sm:px-6 py-3 overflow-x-auto" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-foreground transition-colors shrink-0"><Home className="w-4 h-4" /></Link>
      {segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const isUUID = UUID_REGEX.test(segment);

        let label: string;
        if (isUUID) {
          label = entityName || '';
          if (!label) return null;
        } else {
          label = routeLabels[segment] || decodeURIComponent(segment);
        }

        return (
          <span key={path} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[180px]">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors truncate max-w-[180px]">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
