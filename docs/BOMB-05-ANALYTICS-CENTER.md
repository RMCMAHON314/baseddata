## PRIORITY: Build a Premium Analytics Command Center

The `/analytics` page needs to be our showpiece — the page we demo to investors and customers. Think Bloomberg Terminal meets Palantir. Real data only — pull everything from our actual database.

### Top-Level KPI Dashboard (hero section)
Large cards showing live database metrics:
- Total Contract Value: $2.44T (pull from contracts table sum)
- Total Entities Tracked: 3,398 (count from core_entities)
- Active Opportunities: 1,393 (count from opportunities)
- Grants Indexed: 2,570 (count from grants)
- Insights Generated: 3,950 (count from core_derived_insights)
- Data Sources Active: count of non-empty tables
Each card should have a sparkline showing growth trend and a % change indicator vs last month.

### Section 1: Spending Analysis
- **Agency Spending Treemap**: Using Recharts Treemap, show top 20 agencies by total contract value. Color intensity = spending volume. Clickable — drills down to agency page.
- **Spending Over Time**: Area chart showing total contract obligations by fiscal year (group by signed_date year). Overlay grants as a separate series.
- **Top Contractors**: Horizontal bar chart of top 20 entities by total contract value.
- **Geographic Distribution**: Map (Mapbox) showing contract spending by state. Bubble size = total value. Color = number of contracts. Use the existing map components.

### Section 2: Market Intelligence
- **NAICS Sector Breakdown**: Donut chart showing spending by top-level NAICS sectors (first 2 digits). Click to expand to 4-digit breakdown.
- **Set-Aside Analysis**: Stacked bar chart showing how much spending goes to each socioeconomic category (8(a), HUBZone, WOSB, SDVOSB, Small Business, Full & Open).
- **Contract Type Mix**: Pie chart of Fixed Price vs Cost Reimbursement vs T&M vs other.
- **Average Deal Size Trends**: Line chart showing average contract value by quarter.

### Section 3: Competitive Landscape
- **Market Concentration**: Show Herfindahl-Hirschman Index (HHI) by NAICS code — which markets are monopolized vs competitive.
- **New Entrant Tracker**: Entities that won their first contract in the last 12 months.
- **Incumbent Analysis**: Which contractors have held the same agency relationships for 5+ years.

### Section 4: Grant Intelligence
- **Grant Funding by Agency**: Bar chart of top grant-awarding agencies.
- **Grant vs Contract Ratio**: By agency, show what % of spending is grants vs contracts.
- **Research Funding Trends**: NSF + NIH grants over time (from nsf_awards table).

### Section 5: Labor Rate Intelligence
- **GSA Labor Rate Distribution**: Box plot or violin chart showing rate ranges by labor category (from gsa_labor_rates table, 2,267 records).
- **Rate Comparison by Region**: Compare DC metro rates vs national average.
- **Top-Paid Categories**: Ranked list of highest average hourly rates.

### Interactive Controls
- Global date range picker that filters ALL charts simultaneously
- Agency filter dropdown
- State filter
- NAICS filter
- Export entire dashboard as PDF or PNG
- "Share Dashboard" link with current filter state encoded in URL params

### Design Requirements
- Use our existing design system (METATRON Quantum Edition theme)
- Smooth Framer Motion animations on all chart transitions
- Loading skeletons while data fetches
- All charts must pull from REAL data in our Supabase tables — no mock data, no hardcoded numbers
- Responsive — works on desktop and tablet
