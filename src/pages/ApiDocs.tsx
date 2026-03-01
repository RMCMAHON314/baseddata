// BOMB-10 — Interactive API Documentation (Stripe-style two-column layout)
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Key, Zap, Copy, Check, Lock, ChevronRight, ExternalLink, FileText, Building2, Target, Award, Lightbulb, DollarSign, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { toast } from 'sonner';

// ── Endpoint definitions ──
const ENDPOINTS = [
  {
    id: 'search-entities',
    method: 'GET',
    path: '/api/entities',
    name: 'Search Entities',
    icon: Building2,
    description: 'Search and filter government contractor entities. Returns paginated results with company details, contract values, and classification codes.',
    params: [
      { name: 'q', type: 'string', required: false, desc: 'Search query (name, UEI, keyword)' },
      { name: 'type', type: 'string', required: false, desc: 'Entity type filter (e.g. "company", "university")' },
      { name: 'state', type: 'string', required: false, desc: 'Two-letter state code (e.g. "MD")' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results per page (default: 25, max: 100)' },
      { name: 'offset', type: 'integer', required: false, desc: 'Pagination offset' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/entities?q=Lockheed&state=MD&limit=10" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "LOCKHEED MARTIN CORPORATION",
      "entity_type": "company",
      "state": "MD",
      "city": "Bethesda",
      "uei": "ABC123DEF456",
      "total_contract_value": 45200000000,
      "contract_count": 12450,
      "naics_codes": ["541330", "541512"],
      "opportunity_score": 92
    }
  ],
  "total": 3,
  "limit": 10,
  "offset": 0
}`,
  },
  {
    id: 'get-entity',
    method: 'GET',
    path: '/api/entities/:id',
    name: 'Get Entity Profile',
    icon: Building2,
    description: 'Retrieve a full entity profile including contracts, grants, relationships, risk indicators, and AI-generated insights.',
    params: [
      { name: 'id', type: 'uuid', required: true, desc: 'Entity UUID' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/entities/a1b2c3d4-..." \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "id": "a1b2c3d4-...",
  "name": "LOCKHEED MARTIN CORPORATION",
  "entity_type": "company",
  "state": "MD",
  "total_contract_value": 45200000000,
  "contract_count": 12450,
  "grant_count": 34,
  "naics_codes": ["541330", "541512"],
  "recent_contracts": [ ... ],
  "top_agencies": ["DOD", "NASA", "DHS"],
  "insights": [ ... ]
}`,
  },
  {
    id: 'search-contracts',
    method: 'GET',
    path: '/api/contracts',
    name: 'Search Contracts',
    icon: FileText,
    description: 'Search federal contract awards with filters for agency, value range, NAICS code, and date range.',
    params: [
      { name: 'q', type: 'string', required: false, desc: 'Search query (description, recipient name)' },
      { name: 'agency', type: 'string', required: false, desc: 'Awarding agency name' },
      { name: 'min_value', type: 'number', required: false, desc: 'Minimum award amount ($)' },
      { name: 'max_value', type: 'number', required: false, desc: 'Maximum award amount ($)' },
      { name: 'naics', type: 'string', required: false, desc: 'NAICS code filter' },
      { name: 'start_date', type: 'string', required: false, desc: 'Award date from (YYYY-MM-DD)' },
      { name: 'end_date', type: 'string', required: false, desc: 'Award date to (YYYY-MM-DD)' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results (default: 25)' },
      { name: 'offset', type: 'integer', required: false, desc: 'Pagination offset' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/contracts?agency=DOD&min_value=1000000&naics=541512" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "...",
      "piid": "W15P7T-20-C-0001",
      "recipient_name": "RAYTHEON COMPANY",
      "awarding_agency": "DEPT OF DEFENSE",
      "award_amount": 25000000,
      "award_date": "2025-06-15",
      "naics_code": "541512",
      "description": "Cloud infrastructure services..."
    }
  ],
  "total": 1245,
  "limit": 25,
  "offset": 0
}`,
  },
  {
    id: 'search-grants',
    method: 'GET',
    path: '/api/grants',
    name: 'Search Grants',
    icon: Award,
    description: 'Search federal grant awards by agency, CFDA number, recipient, and value.',
    params: [
      { name: 'q', type: 'string', required: false, desc: 'Search query' },
      { name: 'agency', type: 'string', required: false, desc: 'Awarding agency' },
      { name: 'cfda', type: 'string', required: false, desc: 'CFDA number filter' },
      { name: 'min_value', type: 'number', required: false, desc: 'Minimum award amount' },
      { name: 'max_value', type: 'number', required: false, desc: 'Maximum award amount' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results (default: 25)' },
      { name: 'offset', type: 'integer', required: false, desc: 'Pagination offset' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/grants?agency=NIH&min_value=500000" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "...",
      "recipient_name": "JOHNS HOPKINS UNIVERSITY",
      "awarding_agency": "NATIONAL INSTITUTES OF HEALTH",
      "award_amount": 2500000,
      "award_date": "2025-03-01",
      "cfda_number": "93.865",
      "project_title": "Cancer Genomics Research Initiative"
    }
  ],
  "total": 892
}`,
  },
  {
    id: 'search-opportunities',
    method: 'GET',
    path: '/api/opportunities',
    name: 'Active Opportunities',
    icon: Target,
    description: 'Search active federal contracting opportunities from SAM.gov with filters for agency, NAICS, set-aside, and deadline.',
    params: [
      { name: 'q', type: 'string', required: false, desc: 'Search query (title, description)' },
      { name: 'agency', type: 'string', required: false, desc: 'Department/Agency name' },
      { name: 'naics', type: 'string', required: false, desc: 'NAICS code' },
      { name: 'set_aside', type: 'string', required: false, desc: 'Set-aside type (SBA, 8(a), WOSB, SDVOSB, HUBZone)' },
      { name: 'deadline_before', type: 'string', required: false, desc: 'Response deadline before (YYYY-MM-DD)' },
      { name: 'deadline_after', type: 'string', required: false, desc: 'Response deadline after (YYYY-MM-DD)' },
      { name: 'state', type: 'string', required: false, desc: 'Place of performance state' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results (default: 25)' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/opportunities?naics=541512&set_aside=SBA&state=VA" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "...",
      "notice_id": "W56HZV-25-R-0042",
      "title": "Cloud Migration Support Services",
      "department": "DEPT OF THE ARMY",
      "response_deadline": "2026-04-15T17:00:00Z",
      "set_aside": "SBA",
      "naics_code": "541512",
      "pop_state": "VA",
      "estimated_value": 5000000
    }
  ],
  "total": 156
}`,
  },
  {
    id: 'insights',
    method: 'GET',
    path: '/api/insights',
    name: 'AI Insights',
    icon: Lightbulb,
    description: 'Retrieve AI-derived market insights, trends, and recommendations. Optionally scope by entity.',
    params: [
      { name: 'entity_id', type: 'uuid', required: false, desc: 'Scope insights to a specific entity' },
      { name: 'insight_type', type: 'string', required: false, desc: 'Filter by type (trend, risk, opportunity, anomaly)' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results (default: 10)' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/insights?insight_type=opportunity&limit=5" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "...",
      "title": "Rising DoD Spend in Cybersecurity",
      "description": "20% YoY increase in NAICS 541512 contracts...",
      "insight_type": "trend",
      "confidence": 0.92,
      "severity": "high",
      "related_entities": ["a1b2...", "c3d4..."]
    }
  ]
}`,
  },
  {
    id: 'labor-rates',
    method: 'GET',
    path: '/api/labor-rates',
    name: 'GSA Labor Rates',
    icon: DollarSign,
    description: 'Search GSA Schedule labor rates by category, location, and price range.',
    params: [
      { name: 'category', type: 'string', required: false, desc: 'Labor category keyword (e.g. "Senior Developer")' },
      { name: 'min_rate', type: 'number', required: false, desc: 'Minimum hourly rate ($)' },
      { name: 'max_rate', type: 'number', required: false, desc: 'Maximum hourly rate ($)' },
      { name: 'location', type: 'string', required: false, desc: 'Location filter' },
      { name: 'limit', type: 'integer', required: false, desc: 'Max results (default: 25)' },
    ],
    exampleRequest: `curl "https://api.baseddata.com/api/labor-rates?category=Developer&min_rate=100" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "data": [
    {
      "id": "...",
      "labor_category": "Senior Software Developer",
      "contractor_name": "BOOZ ALLEN HAMILTON",
      "hourly_rate": 185.50,
      "contract_number": "GS-35F-0511T",
      "sin": "54151S"
    }
  ],
  "total": 432
}`,
  },
  {
    id: 'stats',
    method: 'GET',
    path: '/api/stats',
    name: 'Platform Statistics',
    icon: BarChart3,
    description: 'Get aggregate platform statistics including counts and totals for all tracked data.',
    params: [],
    exampleRequest: `curl "https://api.baseddata.com/api/stats" \\
  -H "Authorization: Bearer bd_live_abc123..."`,
    exampleResponse: `{
  "entities": 245000,
  "contracts": 1250000,
  "grants": 380000,
  "opportunities": 12500,
  "total_contract_value": 4500000000000,
  "total_grant_value": 890000000000,
  "distinct_agencies": 94,
  "distinct_states": 56,
  "last_updated": "2026-03-01T06:00:00Z"
}`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
};

const RATE_LIMITS = [
  { plan: 'Free', perMonth: '100', perMinute: '5', price: '$0' },
  { plan: 'Pro', perMonth: '10,000', perMinute: '100', price: '$99/mo' },
  { plan: 'Enterprise', perMonth: 'Unlimited', perMinute: '1,000', price: 'Custom' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost" size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-muted/60 border rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState(ENDPOINTS[0].id);
  const active = ENDPOINTS.find(e => e.id === activeEndpoint)!;

  return (
    <GlobalLayout>
      <PageSEO title="API Documentation — BasedData" description="RESTful API for government contract data. Search entities, contracts, grants, and opportunities programmatically." path="/api-docs" />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b border-border bg-card">
          <div className="container py-8 px-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10"><Code className="h-6 w-6 text-primary" /></div>
              <h1 className="text-2xl font-bold">API Reference</h1>
              <Badge variant="outline" className="text-xs">v2.0</Badge>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Programmatic access to the Based Data intelligence platform — entities, contracts, grants, opportunities, and AI insights.
            </p>
          </div>
        </div>

        <div className="container px-4 py-8">
          <div className="flex gap-8">
            {/* ─── Left sidebar: Navigation ─── */}
            <aside className="w-56 shrink-0 hidden lg:block">
              <div className="sticky top-20 space-y-6">
                {/* Auth quick link */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Getting Started</p>
                  <button onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1.5">
                    <Key className="h-3.5 w-3.5" /> Authentication
                  </button>
                  <button onClick={() => document.getElementById('rate-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1.5">
                    <Zap className="h-3.5 w-3.5" /> Rate Limits
                  </button>
                </div>

                {/* Endpoints */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Endpoints</p>
                  <nav className="space-y-0.5">
                    {ENDPOINTS.map(ep => (
                      <button
                        key={ep.id}
                        onClick={() => { setActiveEndpoint(ep.id); document.getElementById('endpoint-detail')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={`flex items-center gap-2 text-sm w-full text-left py-1.5 px-2 rounded-md transition-colors ${activeEndpoint === ep.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                      >
                        <Badge className={`text-[10px] px-1.5 py-0 font-mono ${METHOD_COLORS[ep.method]}`}>{ep.method}</Badge>
                        <span className="truncate">{ep.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* ─── Right content ─── */}
            <div className="flex-1 min-w-0 space-y-10">
              {/* Authentication section */}
              <section id="auth-section">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lock className="h-5 w-5 text-primary" /> Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      All API requests require an API key passed in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header.
                    </p>
                    <CodeBlock code={`Authorization: Bearer bd_live_your_api_key_here`} />
                    <p className="text-sm text-muted-foreground">
                      Generate your API key from the <a href="/dashboard" className="text-primary hover:underline">Dashboard</a>. Keys are prefixed with <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">bd_live_</code> for production and <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">bd_test_</code> for sandbox.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Mobile endpoint selector */}
              <div className="lg:hidden flex flex-wrap gap-2">
                {ENDPOINTS.map(ep => (
                  <Button key={ep.id} variant={activeEndpoint === ep.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveEndpoint(ep.id)} className="gap-1.5 text-xs">
                    <Badge className={`text-[9px] px-1 py-0 font-mono ${METHOD_COLORS[ep.method]}`}>{ep.method}</Badge>
                    {ep.name}
                  </Button>
                ))}
              </div>

              {/* Endpoint detail */}
              <section id="endpoint-detail">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Badge className={`font-mono text-xs ${METHOD_COLORS[active.method]}`}>{active.method}</Badge>
                            <code className="text-base font-mono font-semibold">{active.path}</code>
                          </div>
                          <span className="text-sm text-muted-foreground">{active.name}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <p className="text-muted-foreground text-sm">{active.description}</p>

                        {/* Parameters */}
                        {active.params.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Parameters</h4>
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/50 text-left">
                                    <th className="p-3 font-medium text-muted-foreground">Name</th>
                                    <th className="p-3 font-medium text-muted-foreground">Type</th>
                                    <th className="p-3 font-medium text-muted-foreground hidden sm:table-cell">Required</th>
                                    <th className="p-3 font-medium text-muted-foreground">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {active.params.map(p => (
                                    <tr key={p.name} className="border-t">
                                      <td className="p-3 font-mono text-primary text-xs">{p.name}</td>
                                      <td className="p-3"><Badge variant="secondary" className="text-[10px] font-mono">{p.type}</Badge></td>
                                      <td className="p-3 hidden sm:table-cell">
                                        {p.required
                                          ? <Badge className="bg-rose-100 text-rose-600 border-rose-200 text-[10px]">Required</Badge>
                                          : <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                                      </td>
                                      <td className="p-3 text-muted-foreground text-xs">{p.desc}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Example request */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Example Request</h4>
                          <CodeBlock code={active.exampleRequest} />
                        </div>

                        {/* Example response */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Example Response</h4>
                          <CodeBlock code={active.exampleResponse} lang="json" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </section>

              {/* Rate Limits */}
              <section id="rate-section">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-primary" /> Rate Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-left">
                            <th className="p-3 font-medium">Plan</th>
                            <th className="p-3 font-medium">Price</th>
                            <th className="p-3 font-medium">Requests/Month</th>
                            <th className="p-3 font-medium">Requests/Minute</th>
                          </tr>
                        </thead>
                        <tbody>
                          {RATE_LIMITS.map(r => (
                            <tr key={r.plan} className="border-t">
                              <td className="p-3 font-semibold">{r.plan}</td>
                              <td className="p-3 text-muted-foreground">{r.price}</td>
                              <td className="p-3 font-mono">{r.perMonth}</td>
                              <td className="p-3 font-mono">{r.perMinute}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Rate-limited responses return HTTP 429. Include a <code className="bg-muted px-1 py-0.5 rounded font-mono">Retry-After</code> header with seconds to wait.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Error codes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Error Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="p-3 font-medium">Code</th>
                          <th className="p-3 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['200', 'Success'],
                          ['400', 'Bad Request — Invalid parameters'],
                          ['401', 'Unauthorized — Missing or invalid API key'],
                          ['403', 'Forbidden — Insufficient plan permissions'],
                          ['404', 'Not Found — Resource does not exist'],
                          ['429', 'Rate Limited — Too many requests'],
                          ['500', 'Server Error — Try again later'],
                        ].map(([code, desc]) => (
                          <tr key={code} className="border-t">
                            <td className="p-3 font-mono font-semibold">{code}</td>
                            <td className="p-3 text-muted-foreground">{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}
