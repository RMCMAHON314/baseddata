# 🏗️ BASEDDATA INFRASTRUCTURE RUNDOWN
> **Complete technical blueprint for Claude brainstorming session**
> Generated: January 24, 2026

---

## 📊 CURRENT DATA STATE

| Metric | Count | Notes |
|--------|-------|-------|
| **Entities** | 1,220 | canonical organizations/universities/agencies |
| **Contracts** | 37 | $28.1B total value |
| **Grants** | 0 | ❌ EMPTY - schema mapping was broken |
| **Opportunities** | 0 | ❌ EMPTY - needs SAM API key |
| **Facts** | 767,504 | temporal entity attributes |
| **Relationships** | 11,697 | entity connections |
| **Insights** | 220 | derived intelligence |
| **Queue Pending** | 62 | stalled ingestion jobs |

---

## 🗄️ DATABASE ARCHITECTURE

### Core Entity Graph (THE HEART)
```sql
core_entities (1,220 rows)
├── canonical_name, entity_type, state, city
├── uei, duns, cage_code, ein (identifiers)
├── naics_codes[], psc_codes[], business_types[]
├── total_contract_value, contract_count, grant_count
├── opportunity_score, risk_score, health_score
├── source_records JSONB (provenance)
└── search_vector tsvector (full-text search)

core_facts (767,504 rows)
├── entity_id → core_entities.id
├── fact_type, fact_value JSONB
├── fact_date, fact_period
├── confidence, source_name
└── (e.g., "award_received", "leadership_change")

core_relationships (11,697 rows)
├── from_entity_id → core_entities.id
├── to_entity_id → core_entities.id
├── relationship_type (subcontractor, competitor, partner, geographic_cluster)
├── confidence, strength, is_active
└── evidence JSONB

core_derived_insights (220 rows)
├── insight_type (trend, anomaly, opportunity, risk)
├── scope_type, scope_value
├── title, description, supporting_data JSONB
├── confidence, severity
└── related_entities[]
```

### Transaction Tables
```sql
contracts (37 rows)
├── award_id (unique), recipient_entity_id → core_entities
├── recipient_name, recipient_uei, recipient_duns
├── award_amount, awarding_agency, awarding_sub_agency
├── description, naics_code, psc_code
├── start_date, end_date, pop_state, pop_city
└── source (usaspending, maryland_open_data, etc.)

grants (0 rows) ⚠️ EMPTY
├── grant_id (unique), recipient_entity_id
├── recipient_name, recipient_state, recipient_city  ← NOTE: uses recipient_* not pop_*
├── award_amount, awarding_agency, funding_agency
├── project_title, cfda_number
└── source (nih_reporter, nsf_awards)

opportunities (0 rows) ⚠️ EMPTY
├── notice_id (unique), solicitation_number
├── title, description, department
├── naics_code, set_aside, award_ceiling/floor
├── posted_date, response_deadline
├── is_active, source (sam_gov, grants_gov)
└── search_vector tsvector
```

### Pipeline & Telemetry Tables
```sql
ingestion_queue (62 pending)           -- jobs waiting to process
ingestion_sources (185 active)         -- configured data sources
source_discoveries (114)               -- auto-discovered endpoints
flywheel_metrics (6,010)               -- per-run metrics
flywheel_discovery_queue (2,955)       -- expansion targets
flywheel_crawl_log (1,118)             -- crawler activity
health_checks (558)                    -- system health history
api_circuit_breakers (29)              -- rate limit protection
discovery_dead_letter (10)             -- failed items for retry
```

### User & Platform Tables
```sql
profiles, datasets, queries, records
api_keys, api_usage, api_usage_logs
scheduled_pipelines, pipeline_runs
subscription_plans, credit_transactions
```

---

## ⚙️ SQL FUNCTIONS (80+ Total)

### Entity Resolution
```sql
smart_resolve_entity(p_name, p_type, p_city, p_state, p_uei, p_duns, p_source)
  → Returns entity_id, creates if new, merges duplicates

ml_duplicate_score(name1, name2, city1, city2, state1, state2, uei1, uei2)
  → Returns 0-100 similarity score using trigrams + identifier matching

find_potential_duplicates(threshold DEFAULT 75)
  → Returns pairs of likely-duplicate entities

auto_merge_duplicates(threshold DEFAULT 85)
  → Automatically merges high-confidence duplicates
```

### Discovery & Relationships
```sql
discover_relationships()         -- finds subcontractor/competitor links
discover_competitors()           -- same-agency same-NAICS bidders
discover_geographic_clusters()   -- entities in same city/state
discover_industry_clusters()     -- NAICS-based groupings
discover_transitive_relationships() -- A→B→C implies A→C
```

### Search & Query
```sql
mega_search(query_text, filters JSONB)
  → Full-text + semantic search across all tables

semantx_search(query, limit, filters)
  → Semantic similarity search with embeddings

analyze_query_intent(natural_language_query)
  → Extracts entities, filters, intent from NL
```

### Intelligence Generation
```sql
generate_insights()              -- derives trends/anomalies
generate_intelligence_alerts()   -- high-priority notifications
detect_anomalies()               -- statistical outlier detection
calculate_opportunity_scores()   -- entity scoring
```

### Health & Stats
```sql
capture_health_snapshot()        -- records system health point-in-time
get_system_health()              -- current health metrics
sync_all_entity_stats()          -- recalculates entity aggregates
get_flywheel_health()            -- pipeline health summary
```

---

## 🦑 EDGE FUNCTIONS (40 Total)

### Ingestion Layer
| Function | Purpose | Trigger |
|----------|---------|---------|
| `data-filler` | Bulk parallel ingestion from all sources | Manual/Cron |
| `ocean-controller` | Orchestrates full data cycle | Manual/Cron |
| `kraken-rage` | Parallel multi-state USASpending pull | Manual |
| `mega-ingest` | Process ingestion queue | Cron/Queue |
| `ingest-data` | Single-source targeted ingestion | API call |

### Kraken Engine (Auto-Expansion)
| Function | Purpose |
|----------|---------|
| `kraken` | Main coordinator |
| `kraken-hunters` | Finds new data sources |
| `kraken-crawlers` | Crawls discovered sources |
| `kraken-ingest` | Ingests crawled data |

### Intelligence Layer
| Function | Purpose |
|----------|---------|
| `omniscient` | AI-powered research assistant |
| `omniscient-ai` | LLM-powered query processing |
| `entity-resolver` | Resolves names to entities |
| `mega-search` | Unified search endpoint |
| `nl-query` | Natural language to SQL |

### Core Processing
| Function | Purpose |
|----------|---------|
| `core-extract-facts` | Extracts facts from records |
| `core-generate-insights` | Derives insights |
| `core-scorer` | Scores entities |
| `core-learning` | Learns from user feedback |

### Scheduling & Health
| Function | Purpose |
|----------|---------|
| `flywheel-ultimate` | Self-healing autonomous loop |
| `flywheel-scheduler` | Cron trigger for flywheel |
| `scheduled-runner` | Runs scheduled pipelines |
| `health-check` | Returns system health |
| `gap-fixer` | Fills data gaps |

### Integrations
| Function | Purpose |
|----------|---------|
| `developer-api` | External REST API |
| `export` | Data export (CSV/JSON/XLSX) |
| `webhook-dispatcher` | Sends webhooks |
| `zapier-trigger` | Zapier integration |
| `slack-integration` | Slack notifications |
| `vote` | User voting on data quality |

---

## 🔄 DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DATA SOURCES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  USASpending.gov   SAM.gov   Grants.gov   NIH Reporter   NSF Awards         │
│  Maryland Open     Virginia eVA    DC Open Data    FEMA    CMS    FDA       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │  data-filler  │  │ocean-controller│  │  kraken-rage  │  │ mega-ingest  │  │
│  │ (parallel all)│  │  (orchestrate) │  │ (bulk states) │  │  (queue)     │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RESOLUTION                                  │
│  smart_resolve_entity() → ml_duplicate_score() → auto_merge_duplicates()    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE DATABASE                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │ core_entities  │  │   core_facts   │  │core_relationships│               │
│  │   (1,220)      │◄─│   (767,504)    │─►│    (11,697)      │               │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│         │                    │                    │                          │
│         ▼                    ▼                    ▼                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │   contracts    │  │     grants     │  │  opportunities │                 │
│  │     (37)       │  │      (0)       │  │      (0)       │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTELLIGENCE LAYER                                 │
│  discover_relationships() → generate_insights() → calculate_scores()        │
│                    ↓                                                         │
│  ┌─────────────────────────────────────┐                                    │
│  │      core_derived_insights (220)     │                                    │
│  └─────────────────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SEARCH & API LAYER                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │   mega-search  │  │   omniscient   │  │  developer-api │                 │
│  │ (unified query)│  │   (AI assist)  │  │  (REST API)    │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │   Showcase     │  │   SemanTX      │  │  OceanDashboard│                 │
│  │  (live stats)  │  │ (semantic srch)│  │ (health monitor)│               │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │   Omniscient   │  │  EntityProfile │  │  Architecture  │                 │
│  │  (AI research) │  │  (entity 360)  │  │  (system viz)  │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 REACT HOOKS (Frontend Data Consumption)

| Hook | Purpose | Data Source |
|------|---------|-------------|
| `useOmniscient` | AI-powered search | `/omniscient` edge fn |
| `useMasterDataset` | Core data stats | `master_dataset_stats` |
| `useFlywheelHealth` | Pipeline health | `get_flywheel_health()` |
| `useSearchHistory` | Query history | `queries` table |
| `useDiscoveryEngine` | Source discovery | `discovered_sources` |
| `useAutoCrawlers` | Crawler management | `auto_crawlers` |
| `useNaturalQuery` | NL→SQL | `/nl-query` edge fn |
| `useScheduledPipelines` | Pipeline scheduling | `scheduled_pipelines` |
| `useApiKeys` | API key management | `api_keys` table |
| `useVoting` | Data quality voting | `/vote` edge fn |
| `useUltimateFlywheel` | Flywheel control | `/flywheel-ultimate` |
| `useFileExplorer` | File browser | `records` table |

---

## 🚨 CRITICAL ISSUES

### 1. Empty Tables (DATA GAP)
- **grants**: 0 rows - Fixed schema mapping (`recipient_state` vs `pop_state`)
- **opportunities**: 0 rows - Needs `SAM_API_KEY` secret configured

### 2. Stalled Queue
- 62 jobs stuck in `ingestion_queue` with status='pending'
- Need to run `mega-ingest` to clear

### 3. No Automation
- All ingestion is manual trigger only
- Need cron jobs for: `data-filler` (4h), `ocean-controller` (2h), `mega-ingest` (1h)

### 4. API Rate Limiting
- 29 circuit breakers active
- Some may be stale and blocking valid requests

---

## 🎯 EXECUTION PRIORITIES

### Phase 1: FILL THE DATA (Today)
```bash
# 1. Trigger data-filler with fixed schema
curl -X POST '.../data-filler' -d '{"contracts":true,"grants":true}'

# 2. Clear the queue
curl -X POST '.../mega-ingest' -d '{"process_queue":true}'

# 3. Run full cycle
curl -X POST '.../ocean-controller' -d '{"mode":"full_cycle"}'
```

### Phase 2: AUTOMATE (Today)
Set up cron-job.org or internal scheduler:
- `data-filler`: every 4 hours
- `ocean-controller`: every 2 hours
- `mega-ingest`: every 1 hour
- `flywheel-ultimate`: every 6 hours

### Phase 3: SCALE (This Week)
- Add more states to `kraken-rage`
- Historical backfill 2015-2022
- Add more federal sources (DOD, DOE, etc.)

---

## 📁 KEY FILE LOCATIONS

```
supabase/functions/
├── data-filler/index.ts      # Bulk parallel ingestion
├── ocean-controller/index.ts # Full cycle orchestrator
├── flywheel-ultimate/index.ts # Self-healing loop
├── kraken-rage/index.ts      # Multi-state bulk pull
├── mega-search/index.ts      # Unified search
├── omniscient/index.ts       # AI research
└── entity-resolver/index.ts  # Name→Entity resolution

src/hooks/
├── useOmniscient.ts          # AI search hook
├── useMasterDataset.ts       # Stats hook
├── useFlywheelHealth.ts      # Health hook
└── useScheduledPipelines.ts  # Pipeline management

src/pages/
├── Showcase.tsx              # Live data showcase
├── SemanTX.tsx               # Semantic search
├── OceanDashboard.tsx        # Health dashboard
├── Omniscient.tsx            # AI assistant
└── Architecture.tsx          # System visualization
```

---

## 💡 BRAINSTORM AREAS FOR CLAUDE

1. **Data Population Strategy** - How to maximize ingestion without timeouts?
2. **Entity Resolution ML** - Improve duplicate detection beyond trigrams?
3. **Real-time Updates** - Switch from polling to Supabase Realtime?
4. **External API Strategy** - Which new sources to prioritize?
5. **Monetization** - How to structure API access/credits?
6. **Scaling** - How to handle 1M+ entities efficiently?
7. **Search UX** - Natural language vs structured query balance?
8. **Alerting** - Real-time notifications for new opportunities?

---

*This document represents the complete state of BasedData's infrastructure as of January 24, 2026.*
