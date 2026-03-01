## PRIORITY: Upgrade Entity Intelligence Hub to World-Class 360° Profiles

The `/entity/:id` page (EntityIntelligenceHub) needs to be the most valuable page in our entire app. Every entity should feel like opening a Bloomberg terminal dossier. Here's what we need:

### Entity Profile Header (redesign)
- Large entity name with entity_type badge (Company, Agency, University, etc.)
- Key stats row: Total Contract Value, Total Grants, Active Opportunities, Risk Score
- Quick action buttons: "Track This Entity", "Export Profile", "Compare With..."
- Entity health indicator (data completeness score — how many data sources we have for this entity)

### Tab System (upgrade existing, add new tabs)

**Tab 1: Overview**
- Executive summary paragraph (AI-generated from core_derived_insights for this entity)
- Key financial metrics cards: Total awarded, YoY trend, average deal size, largest single contract
- NAICS code breakdown with spending by category
- Timeline chart showing contract/grant activity by quarter (Recharts area chart)
- Recent activity feed (last 10 contracts, grants, or opportunities involving this entity)

**Tab 2: Contracts** (upgrade existing)
- Sortable/filterable table with: contract_title, awarding_agency, amount, start_date, end_date, status
- Add a "days remaining" column for active contracts with color-coded badges (green >180d, yellow 90-180d, orange 30-90d, red <30d)
- Contract value distribution chart (bar chart by agency)
- Add pagination — some entities will have 100+ contracts

**Tab 3: Grants** (upgrade existing)
- Same treatment as Contracts tab but for grants
- Include funding agency, cfda_number, grant_amount, period_of_performance
- Award trend over time

**Tab 4: Opportunities** (new)
- Active SAM.gov opportunities where this entity is eligible or has historically competed
- Show: opportunity_title, agency, posted_date, response_deadline, estimated_value, set_aside_type
- Countdown timer for response deadlines
- "Match Score" — how well this opportunity matches the entity's historical work

**Tab 5: Relationships** (upgrade existing)
- Interactive network graph (use existing NetworkGraph component) showing:
  - Prime/sub relationships from subawards table
  - Agency relationships from contracts
  - Competitor relationships from entities competing for same NAICS codes
- Relationship type filter (Prime, Sub, Agency, Competitor, Partner)
- List view alternative showing all relationships with context

**Tab 6: Competitive Intelligence** (new)
- Competitors: entities with overlapping NAICS codes and same agency customers
- Win rate comparison (if data available)
- Market share within shared NAICS categories
- Side-by-side comparison quick-launch

**Tab 7: Risk & Compliance** (new)
- SAM exclusion status (from sam_exclusions)
- Contract expiration timeline
- Audit findings (from federal_audits when populated)
- SEC filing alerts (from sec_filings)
- Overall risk score with breakdown

**Tab 8: Documents** (new)
- All SEC filings linked to this entity
- Patent filings from uspto_patents
- Lobbying disclosures
- Clinical trial registrations
- Each document type as a collapsible section with direct links

### Data Quality Indicator
- Show a "Profile Completeness" meter (0-100%)
- List which data sources are populated vs missing for this entity
- "Enrich This Entity" button that triggers the enrich edge function for just this entity

### Make the Entity Hub the default landing when clicking any entity anywhere in the app
- Every entity name in every table, chart, map, and search result should link to `/entity/:id`
- Breadcrumb navigation: Home > Entities > [Entity Name]
