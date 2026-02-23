# 🏗️ BASED DATA — AS-BUILT TECHNICAL REVIEW
> **Complete platform state for Claude brainstorming session**
> Generated: February 23, 2026

---

## 📊 LIVE DATA STATE (Queried at build time)

| Table | Row Count | Status | Source |
|-------|-----------|--------|--------|
| **contracts** | 945 | ✅ Live | USASpending.gov |
| **grants** | 838 | ✅ Live | USASpending.gov |
| **core_entities** | 1,220 | ✅ Live | Entity resolution |
| **core_relationships** | 11,697 | ✅ Live | Discovery functions |
| **core_facts** | ~767K | ✅ Live | Fact extraction |
| **opportunities** | 0 | ⚠️ Empty | SAM.gov (needs vacuum run) |
| **sbir_awards** | 0 | ⚠️ Empty | SBIR.gov (needs vacuum run) |
| **sam_entities** | 0 | ⚠️ Empty | SAM.gov (needs vacuum run) |
| **sam_exclusions** | 0 | ⚠️ Empty | SAM.gov (needs vacuum run) |
| **nsf_awards** | 0 | ⚠️ Empty | NSF API (needs vacuum run) |
| **fpds_awards** | 0 | ⚠️ Empty | FPDS (needs vacuum run) |
| **subawards** | 0 | ⚠️ Empty | USASpending (needs vacuum run) |
| **vacuum_runs** | 0 | ⚠️ Empty | Run log (no runs yet) |

**Summary:** Core entity graph is populated. All NEW source tables (sbir, sam, nsf, fpds, subawards) are built but empty — they populate when `vacuum-all` is triggered.

---

## 🗄️ DATABASE ARCHITECTURE

### Total Tables: 118
### Total SQL Functions: ~140

### Core Entity Graph
```
core_entities (1,220)       — canonical organizations
├── core_facts (~767K)      — temporal entity attributes
├── core_relationships (11,697) — entity connections
├── core_derived_insights   — AI-generated findings
├── core_entity_history     — change tracking
├── core_facts_summary      — aggregated fact views
├── core_feedback           — user corrections
├── core_intelligence_metrics — system performance
└── core_query_patterns     — learned search patterns
```

### Transaction Tables
```
contracts (945)             — USASpending federal contracts
grants (838)                — Federal grants
opportunities (0)           — SAM.gov solicitations
sbir_awards (0)             — SBIR/STTR innovation awards
fpds_awards (0)             — FPDS detailed procurement
nsf_awards (0)              — NSF research awards
subawards (0)               — Subcontracting relationships
sam_entities (0)             — SAM.gov entity registrations
sam_exclusions (0)           — Debarred/suspended entities
```

### Pipeline & Telemetry
```
vacuum_runs (0)             — Autonomous vacuum run logs
ingestion_sources (185)     — Configured data source endpoints
ingestion_queue             — Pending ingestion jobs
health_checks               — System health snapshots
api_circuit_breakers        — Rate limit protection
flywheel_metrics            — Per-run pipeline metrics
```

### Platform / User
```
profiles, api_keys, api_usage, api_usage_logs
saved_searches, scheduled_pipelines, pipeline_runs
subscription_plans, credit_transactions
teams, team_members, portfolios
```

---

## ⚙️ KEY SQL FUNCTIONS (RPC)

### Intelligence Functions (NEW — built in this session)
| Function | Purpose | Input | Status |
|----------|---------|-------|--------|
| `get_teaming_network` | Real prime→sub relationships from subawards | `p_entity_name, p_state, p_limit` | ✅ Created, needs subaward data |
| `get_cross_source_profile` | Merges contracts+SBIR+SAM+exclusions for entity | `p_name` | ✅ Created, needs data |
| `compute_market_opportunity` | HHI + recompetes + SBIR + opportunities score | `p_naics, p_state` | ✅ Created |
| `detect_teaming_pairs` | Co-occurrence analysis across agencies/NAICS | `p_agency, p_naics, p_limit` | ✅ Created |
| `get_sbir_landscape` | SBIR breakdown by firm, phase, diversity | `p_state, p_agency` | ✅ Created |
| `compute_entity_risk` | Cross-ref exclusions+SAM+concentration | `p_entity_name` | ✅ Created |
| `get_competition_intelligence` | FPDS bidder/competition analysis | `p_naics, p_agency, p_state` | ✅ Created |
| `get_entity_360` | Full cross-source entity profile | `p_name` | ✅ Created |

### Pre-Existing Intelligence Functions
| Function | Purpose |
|----------|---------|
| `compute_market_concentration` | HHI score + top contractors |
| `get_recompete_pipeline` | Expiring contracts radar |
| `get_agency_buying_patterns` | Fiscal quarter spending patterns |
| `get_velocity_signals` | Hypergrowth/new entrant detection |
| `get_set_aside_analysis` | Set-aside breakdown |
| `smart_resolve_entity` | Name→entity resolution with fuzzy match |
| `ml_duplicate_score` | 0-100 duplicate similarity scoring |
| `discover_relationships` | Auto-discover entity connections |
| `mega_search` | Full-text + semantic unified search |
| `generate_insights` | Derive trends/anomalies |

---

## 🦑 EDGE FUNCTIONS (52 Total)

### Autonomous Data Engine
| Function | Purpose | Status |
|----------|---------|--------|
| **`vacuum-all`** | ⚛️ THE ATOMIC BOMB — hits all 7 federal sources, auto-paginates, auto-enriches | ✅ Deployed, never run |
| `data-flood` | Multi-state USASpending orchestrator | ✅ Deployed |
| `usaspending-bulk-load` | Single-state contract/grant loader | ✅ Deployed |
| `sam-opportunities-load` | SAM.gov opportunity fetcher | ✅ Deployed |
| `load-sbir` | SBIR/STTR award loader (single agency/year) | ✅ Deployed |
| `load-sam-entities` | SAM entity registration loader (single state) | ✅ Deployed |
| `load-sam-exclusions` | SAM exclusion/debarment loader | ✅ Deployed |
| `load-nsf` | NSF research award loader (single keyword) | ✅ Deployed |
| `load-fpds` | FPDS detailed procurement loader | ✅ Deployed |
| `scheduled-refresh` | Cron-triggered refresh | ✅ Deployed |

### `vacuum-all` Modes
| Mode | Sources Hit | Expected Records |
|------|------------|-----------------|
| `full` | All 7 sources, all 50 states, 3 years SBIR, 12 NSF keywords | ~47,000+ |
| `quick` | Top 5 states, 1 year SBIR, 90 days opps | ~5,000+ |
| `contracts-only` | USASpending contracts only | ~15,000 |
| `sbir-only` | SBIR.gov all agencies | ~20,000 |
| `opportunities-only` | SAM.gov opportunities only | ~1,000 |

### `vacuum-all` Data Sources
| # | Source | API | Auth | Auto-Paginate |
|---|--------|-----|------|--------------|
| 1 | USASpending Contracts | `api.usaspending.gov/v2/search/spending_by_award/` | Free | 3 pages × 50 states |
| 2 | USASpending Subawards | Same endpoint, `subawards: true` | Free | 2 pages × 10 states |
| 3 | SAM.gov Opportunities | `api.sam.gov/opportunities/v2/search` | SAM_API_KEY | 10 pages × 100 |
| 4 | SBIR/STTR Awards | `api.www.sbir.gov/public/api/awards` | Free | All results per agency/year |
| 5 | SAM.gov Entities | `api.sam.gov/entity-information/v3/entities` | SAM_API_KEY | 5 pages × 10 states |
| 6 | SAM.gov Exclusions | `api.sam.gov/entity-information/v2/exclusions` | SAM_API_KEY | 10 pages |
| 7 | NSF Awards | `api.nsf.gov/services/v1/awards.json` | Free | 3 pages × 12 keywords |

### Enrichment (runs automatically after vacuum)
- Links unlinked contracts to `core_entities` by UEI then fuzzy name
- Creates new entities for unknown recipients
- Creates `core_relationships` from subaward prime→sub pairs

### Other Edge Functions
| Category | Functions |
|----------|-----------|
| Intelligence | `omniscient`, `omniscient-ai`, `mega-search`, `nl-query`, `entity-resolver` |
| Core Processing | `core-extract-facts`, `core-generate-insights`, `core-scorer`, `core-learning` |
| Kraken Engine | `kraken`, `kraken-hunters`, `kraken-crawlers`, `kraken-ingest` |
| Pipeline | `ocean-controller`, `flywheel-ultimate`, `flywheel-scheduler`, `mega-ingest` |
| Data Fill | `data-filler`, `data-filler-v2`, `gap-fixer`, `ingest-data`, `enrich` |
| Integrations | `developer-api`, `public-api`, `export`, `webhook-dispatcher`, `zapier-trigger`, `slack-integration`, `vote` |
| System | `health-check`, `scheduled-runner`, `test-pipeline`, `backfill-entity-resolution` |
| AI | `ai-chat`, `unified-intelligence`, `infinite-algorithm` |

---

## 🖥️ FRONTEND ARCHITECTURE

### Tech Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack React Query v5
- **Routing:** React Router v6 (lazy-loaded pages)
- **Charts:** Recharts
- **Maps:** Leaflet + Mapbox GL
- **Animation:** Framer Motion
- **Backend:** Supabase (Lovable Cloud)

### Route Map (18 pages)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Showcase | Landing page with hero stats, search, data coverage grid |
| `/explore` | MarketExplorer | Market discovery with filters |
| `/entities` | EntitiesList | Entity directory |
| `/entity/:id` | EntityIntelligenceHub | 360° entity dossier (7 tabs) |
| `/opportunities` | OpportunityCommandCenter | Active federal opportunities |
| `/analytics` | AnalyticsCommandCenter | Analytics & reporting |
| `/intelligence` | IntelligenceDashboard | 5-section computed intelligence |
| `/sbir` | SbirExplorer | SBIR/STTR innovation explorer |
| `/saved-searches` | SavedSearches | User saved search management |
| `/agency/:agencyName` | AgencyDeepDive | Per-agency analysis |
| `/compare` | EntityCompare | Side-by-side entity comparison |
| `/healthcare` | Healthcare | Healthcare vertical |
| `/education` | Education | Education vertical |
| `/ocean` | OceanDashboard | System health monitor |
| `/health` | Health | Health checks |
| `/dashboard` | Dashboard | Admin dashboard (Data Flood Panel) |
| `/pricing` | Pricing | Pricing page |
| `/api-docs` | ApiDocs | Developer API documentation |

### Navigation
**Primary:** Dashboard, Explore, Entities, Opportunities, Intelligence, SBIR, Analytics
**Secondary:** Saved, Compare
**User Menu:** Dashboard, Saved Searches, API Docs, Sign Out

### Key Components

#### MarketIntelligenceSearch (`hero` + `full` variants)
- Parses natural language queries (state, NAICS, set-aside, entity name)
- Runs 7 parallel queries: contracts, entities, opportunities, HHI, recompetes, SBIR, subawards
- Displays: Total Addressable Value, Active Contractors, Market Concentration (HHI), Top Players bar chart, Recompete Pipeline, SBIR Innovation card, Teaming Intelligence card
- Entity results link to `/entity/:id`

#### EntityIntelligenceHub (7 tabs)
| Tab | Data Source |
|-----|------------|
| Contracts | `contracts` table (paginated, expandable rows) |
| Grants | `grants` table |
| Competitors | `core_relationships` (same-NAICS, same-agency) |
| Relationships | `core_relationships` (all types) |
| Timeline | `core_facts` (chronological) |
| Intelligence | `get_cross_source_profile` RPC (SBIR+SAM+exclusions) |
| Risk | `compute_entity_risk` RPC |

**Hero section:** Entity name, type, location, UEI, CAGE, NAICS badges, health score gauge
**Actions:** Compare, Watch, Export CSV
**Cross-Source Profile card:** Contract portfolio, SBIR count, SAM status, exclusion status, teaming network, diversity flags

#### DataFloodPanel (Admin)
- **Big Button:** `vacuum-all` with Full/Quick modes
- **Live Inventory:** 11 table counts (contracts, opportunities, SBIR, SAM entities, exclusions, NSF, subawards, grants, FPDS, entities, relationships)
- **Run History:** Last 10 vacuum runs with status, duration, error count
- **Advanced (collapsible):** 25+ individual source buttons grouped by category

#### Showcase (Landing Page)
- Animated hero stats: Contract Value, Organizations, Total Records, Data Sources
- Data Coverage grid: 8 source cards with live counts
- Feature cards: Competitive Intelligence, Market Discovery, Entity Deep Dives
- MarketIntelligenceSearch in hero variant

#### IntelligenceDashboard (5 sections)
1. **Market Concentration Scanner** — HHI with filters (NAICS/agency/state), top contractors chart
2. **Recompete Radar** — Expiring contracts with urgency badges (CRITICAL/HIGH/MEDIUM/LOW)
3. **Agency Buying Patterns** — Fiscal quarter spending bars with Q4 insight
4. **Velocity Signals** — Hypergrowth/New Entrant/Declining contractor detection
5. **Set-Aside Analysis** — Small business program breakdown

#### SbirExplorer
- Filters: Agency, State, Phase
- Summary: Total Awards, Total Value, Avg Award, % Woman-Owned, % HUBZone
- Charts: Agency bar chart, Phase pie chart
- Table: Top firms with location, phases, award count, total value

### React Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useAllSourceCounts` | `useNewSources.ts` | Live counts from all 10+ tables |
| `useSbirAwards` | `useNewSources.ts` | SBIR data with filters |
| `useSamEntities` | `useNewSources.ts` | SAM entity data with filters |
| `useExclusions` | `useNewSources.ts` | SAM exclusion data |
| `useNsfAwards` | `useNewSources.ts` | NSF award data with filters |
| `useFpdsAwards` | `useNewSources.ts` | FPDS data with filters |
| `useSubawards` | `useNewSources.ts` | Subaward/teaming data |
| `useVacuumRuns` | `useNewSources.ts` | Vacuum run history |
| `useOmniscient` | `useOmniscient.ts` | AI-powered search |
| `useMasterDataset` | `useMasterDataset.ts` | Core data stats |
| `useFlywheelHealth` | `useFlywheelHealth.ts` | Pipeline health |
| `useSearchHistory` | `useSearchHistory.ts` | Query history |
| `useLastRefresh` | `useLastRefresh.ts` | Last data refresh timestamp |

---

## 🔐 SECRETS & AUTH

### Configured Secrets
| Secret | Used By | Required For |
|--------|---------|-------------|
| `SUPABASE_URL` | All edge functions | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions | Admin database access |
| `SAM_API_KEY` / `DATA_GOV_KEY` | vacuum-all, sam-opportunities-load, load-sam-entities, load-sam-exclusions | SAM.gov & FPDS APIs |

### RLS Policy Pattern
All data tables use permissive RLS:
- **SELECT:** Public read (`USING (true)`)
- **INSERT/UPDATE/DELETE:** Service role write (`USING (true) WITH CHECK (true)`)

This means: anyone can read, only edge functions (service role) can write.

---

## 🚨 CRITICAL STATUS & NEXT ACTIONS

### What's Built But Empty
All infrastructure is in place. The new tables, edge functions, SQL intelligence functions, and UI components are deployed. **The data is waiting to be loaded.**

### To Populate Everything
```bash
# Option 1: One-click from Admin Panel
# Go to /dashboard → Data Flood Controls → VACUUM ALL DATA → RUN FULL

# Option 2: Direct API call
curl -X POST 'https://ttzogrpnqpjtkttpupgs.supabase.co/functions/v1/vacuum-all' \
  -H 'Authorization: Bearer ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"mode":"full","trigger":"manual"}'

# Option 3: Quick test first
curl -X POST '...' -d '{"mode":"quick"}'
```

### Expected After Full Vacuum Run
| Source | Expected Records |
|--------|-----------------|
| USASpending Contracts | ~15,000 (50 states × 3 pages × 100) |
| USASpending Subawards | ~2,000 (10 states × 2 pages × 100) |
| SBIR Awards | ~20,000 (11 agencies × 3 years) |
| SAM Opportunities | ~1,000 (90 days of postings) |
| SAM Entities | ~5,000 (10 states × 5 pages × 100) |
| SAM Exclusions | ~1,000 (all active) |
| NSF Awards | ~3,000 (12 keywords × 75 results) |
| **Total** | **~47,000+** |

### Automation Setup (Post-First-Run)
Set up cron at `cron-job.org`:
- **Daily 2AM EST:** `{"mode":"quick","trigger":"cron"}`
- **Weekly Sunday:** `{"mode":"full","trigger":"cron"}`

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FEDERAL DATA SOURCES                             │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│USASpend  │ SAM.gov  │ SBIR.gov │ NSF API  │ FPDS     │ More...      │
│(Free)    │(API Key) │ (Free)   │ (Free)   │(API Key) │              │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    vacuum-all (THE ATOMIC BOMB)                       │
│  Modes: full | quick | contracts-only | sbir-only | opportunities    │
│  Auto-paginate → Upsert → Entity-link → Log to vacuum_runs          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SOURCE TABLES                                │
│  contracts(945) │ sbir_awards(0) │ sam_entities(0) │ subawards(0)    │
│  grants(838)    │ opportunities(0)│ sam_exclusions(0)│ nsf_awards(0) │
│  fpds_awards(0) │ vacuum_runs(0) │                  │                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ENTITY RESOLUTION LAYER                           │
│  smart_resolve_entity() → ml_duplicate_score() → auto_merge()       │
│  UEI matching → Fuzzy name matching → Entity creation               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ENTITY GRAPH                               │
│  core_entities (1,220) ←→ core_relationships (11,697)                │
│  core_facts (~767K)    ←→ core_derived_insights                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER (SQL RPCs)                      │
│  compute_market_concentration │ get_recompete_pipeline               │
│  get_velocity_signals         │ get_agency_buying_patterns           │
│  get_teaming_network          │ get_cross_source_profile             │
│  compute_entity_risk          │ compute_market_opportunity           │
│  detect_teaming_pairs         │ get_competition_intelligence         │
│  get_sbir_landscape           │ get_set_aside_analysis               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Showcase  │ │ Intelligence │ │ Entity Hub   │ │ SBIR Explorer│   │
│  │ (Landing) │ │ Dashboard    │ │ (360° View)  │ │ (Innovation) │   │
│  └──────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Market   │ │ Opportunity  │ │ Agency Deep  │ │ Admin/Flood  │   │
│  │ Explorer │ │ Command Ctr  │ │ Dive         │ │ Panel        │   │
│  └──────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 FILE STRUCTURE (Key Files)

```
src/
├── App.tsx                              — Route definitions (18 pages, lazy-loaded)
├── pages/
│   ├── Showcase.tsx                     — Landing page + hero stats + data coverage
│   ├── EntityIntelligenceHub.tsx        — 360° entity dossier (945 lines, 7 tabs)
│   ├── IntelligenceDashboard.tsx        — 5-section SQL analytics (524 lines)
│   ├── SbirExplorer.tsx                 — SBIR filter/chart/table explorer
│   ├── MarketExplorer.tsx               — Market discovery
│   ├── OpportunityCommandCenter.tsx     — Opportunity tracking
│   ├── EntitiesList.tsx                 — Entity directory
│   ├── AgencyDeepDive.tsx               — Per-agency analysis
│   ├── EntityCompare.tsx                — Side-by-side comparison
│   ├── Dashboard.tsx                    — Admin (hosts DataFloodPanel)
│   └── ...
├── components/
│   ├── admin/DataFloodPanel.tsx         — Vacuum controls + live counts + run history
│   ├── search/MarketIntelligenceSearch.tsx — Cross-source market search
│   ├── layout/GlobalLayout.tsx          — Nav + search + footer
│   └── ui/                              — shadcn/ui component library
├── hooks/
│   ├── useNewSources.ts                 — All new table hooks + counts
│   └── ...                              — 20+ hooks
└── integrations/supabase/
    ├── client.ts                        — Supabase client (auto-generated)
    └── types.ts                         — Database types (auto-generated)

supabase/functions/
├── vacuum-all/index.ts                  — THE AUTONOMOUS VACUUM ENGINE (418 lines)
├── load-sbir/index.ts                   — SBIR loader
├── load-sam-entities/index.ts           — SAM entity loader
├── load-sam-exclusions/index.ts         — SAM exclusion loader
├── load-nsf/index.ts                    — NSF award loader
├── load-fpds/index.ts                   — FPDS loader
├── usaspending-bulk-load/index.ts       — Contract/grant loader
├── sam-opportunities-load/index.ts      — Opportunity loader
├── data-flood/index.ts                  — Multi-state orchestrator
└── ... (42 more edge functions)

docs/
├── AS-BUILT-REVIEW.md                   — THIS FILE
└── INFRASTRUCTURE-RUNDOWN.md            — Previous technical blueprint
```

---

## 💡 BRAINSTORM AREAS FOR CLAUDE

### Data Population (Immediate)
1. **Run the vacuum** — All infrastructure is built. One `vacuum-all` call populates everything. Should we run it now?
2. **SAM_API_KEY permissions** — Some SAM endpoints (entities, exclusions) require elevated API key tier. Worth checking key permissions.
3. **Error handling** — vacuum-all logs errors per-source. After first run, review `vacuum_runs.errors` to fix any API issues.

### Intelligence Gaps (After Data Loads)
4. **Subaward teaming** — Once subawards load, `get_teaming_network` reveals actual prime→sub relationships (not just co-occurrence inference).
5. **Cross-source enrichment** — An entity appearing in contracts + SBIR + SAM gives a complete profile no competitor has.
6. **Risk scoring** — `compute_entity_risk` crosses exclusions + SAM status + concentration. Unique value prop.

### Scale Path
7. **SBIR scale:** 11 agencies × 10 years = 110 API calls = ~50K awards
8. **SAM entities:** 50 states = 50 API calls = ~100K+ registrations
9. **NSF:** 20 keywords = ~10K+ research awards
10. **USASpending historical:** Extend `time_period` to 2015-2025 = millions of records

### Product Questions
11. **Search UX** — MarketIntelligenceSearch runs 7 parallel queries. Should it show progressive results or wait for all?
12. **Entity profiles** — CrossSourceProfile card shows SBIR/SAM/exclusion data. Worth adding a "data freshness" indicator?
13. **Alerting** — `vacuum_runs` table + cron enables daily alerts. What triggers are most valuable? (new exclusions, new large contracts, recompete deadlines)
14. **API monetization** — `developer-api` exists. What tier structure makes sense given the data uniqueness?

### Technical Debt
15. **EntityIntelligenceHub.tsx** is 945 lines — should be split into sub-components
16. **IntelligenceDashboard.tsx** is 524 lines — same
17. **Some hooks reference tables that may have different column names** (e.g., `opportunities.is_active` vs `opportunities.active`)
18. **core_facts count query times out** — table may need partitioning or the count should use an estimate

---

*This document represents the complete as-built state of Based Data as of February 23, 2026.*
