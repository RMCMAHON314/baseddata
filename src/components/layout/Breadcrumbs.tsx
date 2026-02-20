import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  explore: "Market Explorer",
  entities: "Entities",
  opportunities: "Opportunities",
  analytics: "Analytics",
  "saved-searches": "Saved Searches",
  compare: "Compare",
  agency: "Agency",
  entity: "Entity",
  dashboard: "Dashboard",
};

export function Breadcrumbs({ entityName, agencyName }: { entityName?: string; agencyName?: string }) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground px-6 py-3">
      <Link to="/" className="hover:text-foreground transition-colors"><Home className="w-4 h-4" /></Link>
      {segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = entityName && segment.length > 20 ? entityName
          : agencyName && segment.length > 10 ? agencyName
          : routeLabels[segment] || decodeURIComponent(segment);

        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
