## PRIORITY: Build Out Industry Vertical Pages with Real Data

We have three vertical pages that need to become fully functional with real data from our database.

### 1. SBIR Explorer (/sbir) — Rebuild Completely

This page should be the go-to resource for small business innovation research in tech/defense/health.

**Data source**: `sbir_awards` table (should now be populated from Prompt Bomb 1) + `nsf_awards` table (829 rows)

**Layout:**
- Hero stats: Total SBIR Awards indexed, Total funding, Number of unique firms, Avg award size
- Search bar to search by firm name, topic, or keyword
- Filter bar: Agency, Phase (I, II, III), Year range, State, Award amount range
- Results as cards showing: Firm name, Award title, Agency, Phase, Amount, Year, Woman-owned/HUBZone badges
- Each firm name links to its entity profile page
- Charts section:
  - Awards by agency (bar chart)
  - Phase I vs II vs III distribution (donut)
  - Top firms by total SBIR funding (horizontal bar)
  - Awards over time by year (line chart)
  - State geographic distribution (map)

### 2. Healthcare Vertical (/healthcare) — Expand Significantly

**Data sources**: `clinical_trials` table (should now be 200+ from expanded ingestion) + healthcare-related contracts and grants filtered by NAICS codes (621xxx, 622xxx, 623xxx, 624xxx) and keywords.

**Layout:**
- Hero stats: Healthcare contracts total, Clinical trials tracked, Healthcare grants, Healthcare entities
- Three sub-sections:

**Healthcare Contracting:**
- Top healthcare agencies (HHS, VA, DoD Health, CDC, NIH)
- Largest healthcare contracts
- Healthcare spending trends over time

**Clinical Trials Intelligence:**
- Searchable/filterable table of clinical trials
- Filters: Status, Phase, Condition, Intervention type, Sponsor
- Trial detail cards showing: Title, Status, Phase, Conditions, Sponsor, Start date, Locations
- Trials by phase chart, Trials by status chart

**Healthcare Grants:**
- Filter grants by healthcare-related CFDA numbers
- NIH and CDC grant trends
- Top healthcare grant recipients

### 3. Education Vertical (/education) — Build Out for SLED

**Data sources**: Education-related contracts and grants filtered by NAICS codes (611xxx) and agency names containing "education", "school", "university".

**Layout:**
- Hero stats: Education spending total, Education entities tracked, Active education opportunities, Education grants
- Sub-sections:

**K-12 Intelligence:**
- State education department spending
- Largest K-12 technology contracts
- Ed-tech vendor rankings

**Higher Education:**
- University research grants (from NSF awards + grants filtered to universities)
- University contract awards
- Top universities by total federal funding

**Education Opportunities:**
- Filter opportunities for education-related NAICS and agencies
- Upcoming education contract deadlines

### For ALL verticals:
- Every entity name links to entity profile
- Real data only — query from actual database tables
- Loading skeletons while data loads
- Export buttons for key data views
