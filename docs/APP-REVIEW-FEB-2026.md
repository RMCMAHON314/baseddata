# 🔍 BASEDDATA — Full App Review & Rundown
> **For Claude brainstorming session**
> Generated: February 28, 2026

---

## 📊 LIVE DATA STATE (Queried Feb 28, 2026)

| Table | Rows | Notes |
|-------|------|-------|
| **core_entities** (canonical) | **3,398** | ↑ from 1,220 in Jan |
| **contracts** | **4,677** | $2.44T total value |
| **grants** | **2,570** | ✅ POPULATED (was 0 in Jan) |
| **opportunities** | **1,393** | ✅ POPULATED (was 0 in Jan) |
| **core_relationships** | **11,812** | Entity connections |
| **core_derived_insights** | **3,950** | ↑ from 220 in Jan |
| **subawards** | **3,318** | Sub-contract data |
| **gsa_labor_rates** | **2,267** | GSA CALC+ labor data |
| **nsf_awards** | **829** | National Science Foundation |
| **sec_filings** | **100** | SEC EDGAR filings |
| **clinical_trials** | **8** | ClinicalTrials.gov |
| **sbir_awards** | **0** | ❌ EMPTY |
| **sam_entities** | **0** | ❌ EMPTY |
| **sam_exclusions** | **0** | ❌ EMPTY |
| **fpds_awards** | **0** | ❌ EMPTY |
| **gsa_contracts** | **0** | ❌ EMPTY |
| **lobbying_disclosures** | **0** | ❌ EMPTY |
| **federal_audits** | **0** | ❌ EMPTY |
| **uspto_patents** | **0** | ❌ EMPTY |
| **vacuum_runs** | **3** | Autonomous siphon runs |
| **ingestion_queue (pending)** | **0** | Queue clear ✅ |

### Growth Since Jan 24 Rundown
- Entities: 1,220 → 3,398 (+178%)
- Contracts: 37 → 4,677 (+12,541%)
- Grants: 0 → 2,570 (new)
- Opportunities: 0 → 1,393 (new)
- Insights: 220 → 3,950 (+1,695%)

---

## 🏗️ TECH STACK

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| State | TanStack React Query |
| Routing | React Router v6 (26 routes, all lazy-loaded) |
| Backend | Lovable Cloud (Supabase) — Postgres + Edge Functions |
| Maps | Mapbox GL + Leaflet |
| Charts | Recharts + D3 |
| Data Export | XLSX |
| PWA | vite-plugin-pwa |

---

## 🗺️ ROUTE MAP (26 Routes)

### Public / Core
| Route | Page | Purpose |
|-------|------|---------|
| `/` `/showcase` | Showcase | Landing page with live stats |
| `/explore` | MarketExplorer | Map-based market exploration |
| `/search` | Search | Unified search interface |
| `/entities` | EntitiesList | Browse all entities |
| `/entity/:id` | EntityIntelligenceHub | Entity 360° profile |
| `/opportunities` | OpportunityCommandCenter | Active opportunities |
| `/analytics` | AnalyticsCommandCenter | Spending analytics |
| `/intelligence` | IntelligenceDashboard | AI-derived insights |
| `/compare` | EntityCompare | Side-by-side entity comparison |
| `/agency/:agencyName` | AgencyDeepDive | Agency-level analysis |
| `/saved-searches` | SavedSearches | User saved queries |

### Industry Verticals
| Route | Page | Purpose |
|-------|------|---------|
| `/sbir` | SbirExplorer | SBIR/STTR awards explorer |
| `/healthcare` | Healthcare | Healthcare contracting vertical |
| `/education` | Education | Education contracting vertical |
| `/labor-rates` | LaborRatesExplorer | GSA labor rate analysis |

### Admin & System
| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard | User dashboard |
| `/admin` | Admin | Admin panel (role-gated) |
| `/ocean` | OceanDashboard | Pipeline health monitor |
| `/health` | Health | System health checks |
| `/diagnostic` | Diagnostic | System diagnostics |
| `/gap-fixer` | GapFixer | Data gap remediation |
| `/pricing` | Pricing | Subscription plans |
| `/api-docs` | ApiDocs | Developer API docs |
| `/onboarding` | Onboarding | New user onboarding |
| `/install` | Install | PWA install guide |

---

## 🧩 COMPONENT ARCHITECTURE (30 directories, 80+ components)

### Component Groups
| Directory | Components | Purpose |
|-----------|------------|---------|
| `ui/` | 50+ | shadcn/ui primitives (button, card, dialog, etc.) |
| `entity/` | 6 | Entity profile, tabs (contracts, grants, competitors, relationships) |
| `map/` | 9 | Mapbox/Leaflet map views, popups, controls |
| `data/` | 6 | DataGrid, DataVisualization, ResultsDataTable, enrichment |
| `omniscient/` | 4 | AI research assistant UI |
| `intelligence/` | 4 | Win rate, teaming partners, market shift indicators |
| `insights/` | 3 | Critical insights banner, live stats |
| `visualizations/` | 5 | Agency spending, contract heatmap, network graph |
| `explorer/` | 5 | File explorer sidebar, preview, toolbar |
| `search/` | 1 | MarketIntelligenceSearch |
| `layout/` | 2 | GlobalLayout, Breadcrumbs |
| `admin/` | 1 | DataFloodPanel |
| `ai/` | 1 | AiAssistant |
| `analytics/` | 1 | PredictiveCalendar |
| `architecture/` | 3 | System architecture diagram |
| `competitive/` | 1 | CompetitiveDashboard |
| `health/` | 1 | SystemHealthCheck |
| `portfolio/` | 1 | PortfolioManager |
| `quantum/` | 1 | QuantumDashboard |

---

## ⚙️ EDGE FUNCTIONS (57 Total)

### Data Ingestion (17 functions)
| Function | Purpose |
|----------|---------|
| `vacuum-all` | Master autonomous siphon engine |
| `data-filler` / `data-filler-v2` | Bulk parallel ingestion |
| `data-flood` | Mass data loading |
| `data-vacuum-v2` | Specialized vacuum |
| `fill-source` | Single source fill |
| `ocean-controller` | Full cycle orchestrator |
| `mega-ingest` | Queue processor |
| `ingest-data` | Single-source ingestion |
| `load-fpds` | FPDS contract loader |
| `load-nsf` | NSF awards loader |
| `load-sam-entities` | SAM entity loader |
| `load-sam-exclusions` | SAM exclusions loader |
| `load-sbir` | SBIR awards loader |
| `load-state-contracts` | State contract loader |
| `sam-opportunities-load` | SAM opportunities loader |
| `usaspending-bulk-load` | USASpending bulk |
| `opportunity-vacuum` | Opportunity siphon |

### Kraken Engine (4 functions)
| Function | Purpose |
|----------|---------|
| `kraken` | Main auto-expansion coordinator |
| `kraken-hunters` | Source discovery |
| `kraken-crawlers` | Source crawling |
| `kraken-ingest` | Crawled data ingestion |
| `kraken-rage` | Multi-state bulk pull |

### Intelligence & AI (7 functions)
| Function | Purpose |
|----------|---------|
| `omniscient` | AI research assistant |
| `omniscient-ai` | LLM-powered queries |
| `ai-chat` | Conversational AI |
| `unified-intelligence` | Unified intel pipeline |
| `opportunity-intel` | Opportunity analysis |
| `infinite-algorithm` | Self-improving algorithm |
| `nl-query` | Natural language → SQL |

### Core Processing (5 functions)
| Function | Purpose |
|----------|---------|
| `core-extract-facts` | Fact extraction from records |
| `core-generate-insights` | Insight derivation |
| `core-scorer` | Entity scoring |
| `core-learning` | User feedback learning |
| `entity-resolver` | Name → Entity resolution |

### Search & API (5 functions)
| Function | Purpose |
|----------|---------|
| `mega-search` | Unified search engine |
| `developer-api` | External REST API |
| `public-api` | Metered public API |
| `execute-query` | SQL execution endpoint |
| `execute-sources` | Source execution |

### Pipeline & Health (8 functions)
| Function | Purpose |
|----------|---------|
| `flywheel-ultimate` | Self-healing autonomous loop |
| `flywheel-scheduler` | Cron trigger |
| `scheduled-runner` | Pipeline scheduler |
| `scheduled-refresh` | Data refresh |
| `health-check` | System health |
| `gap-fixer` | Data gap remediation |
| `test-pipeline` | Pipeline testing |
| `backfill-entity-resolution` | Historical entity linking |

### Integrations & Utility (7 functions)
| Function | Purpose |
|----------|---------|
| `export` | Data export (CSV/JSON/XLSX) |
| `enrich` | Data enrichment |
| `auto-crawler` | Auto-discovery crawler |
| `discovery-processor` | Discovery pipeline |
| `alert-engine` | Alert notifications |
| `webhook-dispatcher` | Webhook delivery |
| `zapier-trigger` | Zapier integration |
| `slack-integration` | Slack notifications |
| `vote` | Data quality voting |

---

## 🪝 HOOKS (20 Custom Hooks)

| Hook | Purpose |
|------|---------|
| `useUnifiedData` | Core data access layer |
| `useEntityData` | Entity CRUD & search |
| `useMarketData` | Market statistics |
| `useExportData` | Data export |
| `useOmniscient` | AI search |
| `useMasterDataset` | Dataset stats |
| `useFlywheelHealth` | Pipeline health |
| `useSearchHistory` | Query history |
| `useDiscoveryEngine` | Source discovery |
| `useAutoCrawlers` | Crawler management |
| `useNaturalQuery` | NL→SQL |
| `useScheduledPipelines` | Pipeline scheduling |
| `useApiKeys` | API key management |
| `useVoting` | Quality voting |
| `useUltimateFlywheel` | Flywheel control |
| `useFileExplorer` | File browsing |
| `useCompetitiveIntelligence` | Competitive analysis |
| `useConnectionStatus` | Connection monitoring |
| `useDebounce` | Input debouncing |
| `useNewSources` | New source tracking |

---

## 🔒 SECURITY & AUTH

- **Auth**: Email-based authentication via AuthModal
- **Roles**: `user_roles` table with `app_role` enum (admin, moderator, user)
- **Admin Gate**: Server-side role check via `has_role()` SQL function
- **RLS**: Enabled on `profiles` and sensitive tables
- **API Keys**: `api_keys` table with rate limiting (`requests_this_minute`, `requests_today`)
- **Circuit Breakers**: `api_circuit_breakers` table (29 entries) for external API protection
- **Edge Function Auth**: JWT verification + service-role checks

---

## 🎨 DESIGN SYSTEM

- **Theme**: "METATRON Quantum Edition" — Premium white intelligence theme
- **Fonts**: Inter (UI) + JetBrains Mono (data/code)
- **Primary**: Electric Blue (#3B82F6)
- **Accents**: Cyan (#06B6D4), Indigo (#818CF8), Violet (#A78BFA)
- **Signals**: Success (Emerald), Warning (Amber), Error (Rose)
- **Dark Mode**: Full dark theme support with proper HSL tokens
- **Motion**: Framer Motion for transitions and animations

---

## 🚨 CRITICAL ISSUES & GAPS

### 1. Empty Tables (7 tables with 0 rows)
- `sbir_awards` — Loader exists but hasn't run successfully
- `sam_entities` — SAM.gov API key needed
- `sam_exclusions` — Depends on SAM API
- `fpds_awards` — Loader exists, needs execution
- `gsa_contracts` — Schema exists, no loader running
- `lobbying_disclosures` — Schema only
- `federal_audits` — Schema only
- `uspto_patents` — Schema only

### 2. Low-Population Tables
- `clinical_trials` (8 rows) — Needs bulk ClinicalTrials.gov ingestion
- `sec_filings` (100 rows) — EDGAR loader running but slowly
- `vacuum_runs` (3 runs) — Autonomous engine barely used

### 3. No Cron Automation
- All ingestion still requires manual triggers
- `vacuum-all` has run only 3 times total
- Need scheduled cron for continuous data growth

### 4. Feature Completeness
- SBIR Explorer page exists but `sbir_awards` is empty
- Healthcare vertical has only 8 clinical trials
- Entity comparison page needs richer data

---

## 📈 WHAT'S WORKING WELL

1. **Entity Graph**: 3,398 entities with 11,812 relationships — solid foundation
2. **Contract Data**: 4,677 contracts worth $2.44T — substantial dataset
3. **Intelligence Layer**: 3,950 derived insights — 18x growth since Jan
4. **Grants Pipeline**: Fixed and populated (2,570 rows)
5. **Opportunities**: Now populated (1,393 active)
6. **Labor Rates**: 2,267 GSA rates for pricing intelligence
7. **Subawards**: 3,318 sub-contract records for supply chain analysis
8. **Lazy Loading**: All 26 routes code-split for fast initial load
9. **Design System**: Comprehensive HSL token system with dark mode

---

## 🎯 RECOMMENDED PRIORITIES

### Phase 1: Fill Empty Tables
- Configure SAM.gov API key → populate `sam_entities`, `sam_exclusions`
- Run `load-sbir` → populate `sbir_awards`
- Run `load-fpds` → populate `fpds_awards`
- Bulk load ClinicalTrials.gov → expand `clinical_trials`

### Phase 2: Automate Ingestion
- Set up cron schedule for `vacuum-all` (every 4h)
- Schedule `flywheel-ultimate` (every 6h)
- Auto-rotate across sources to fill gaps

### Phase 3: Feature Polish
- SBIR Explorer needs data to be useful
- Healthcare vertical needs clinical trial bulk load
- Entity comparison could use richer scoring data

### Phase 4: Scale
- Historical backfill (2015-2025)
- Expand state coverage in `kraken-rage`
- Add EDGAR bulk loader for SEC filings
- Patent data from USPTO bulk API

---

## 📁 KEY FILE MAP

```
src/
├── App.tsx                    # 26 lazy-loaded routes
├── init/startup.ts            # Lightweight boot (entity/contract count)
├── contexts/AuthContext.tsx    # Auth provider
├── hooks/                     # 20 custom hooks
├── pages/                     # 26 page components
├── components/                # 80+ components in 30 dirs
├── services/                  # 13 service modules
├── lib/                       # Utilities, constants, formatters
└── types/                     # TypeScript type definitions

supabase/
├── functions/                 # 57 edge functions
└── config.toml                # Project config

docs/
├── INFRASTRUCTURE-RUNDOWN.md  # Jan 24 technical blueprint
└── APP-REVIEW-FEB-2026.md     # THIS FILE
```

---

*This document reflects the live state of BasedData as queried on February 28, 2026.*
