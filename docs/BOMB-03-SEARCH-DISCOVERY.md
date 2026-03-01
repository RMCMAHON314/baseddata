## PRIORITY: Build a World-Class Search Experience

Our `/search` page needs to be the command center of BasedData. Think Google for government spending data.

### Unified Search Bar (redesign)
- Large, centered search input with auto-suggest
- As the user types, show live suggestions grouped by type:
  - 🏢 Entities (matching by name)
  - 📄 Contracts (matching by title or description)
  - 💰 Grants (matching by title)
  - 📢 Opportunities (matching by title)
  - 🔬 SBIR Awards (matching by firm or title)
  - 📊 NAICS Codes (matching by code or description)
- Each suggestion shows the category icon, name, and a key metric (e.g., entity total value, contract amount)
- Enter or click a suggestion navigates to the detail page
- Support natural language queries via the `nl-query` edge function (e.g., "companies in Maryland with more than $10M in defense contracts")

### Search Results Page
When user submits search, show results in a tabbed layout:
- **All** tab: Mixed results, ranked by relevance, showing top 5 from each category
- **Entities** tab: Full entity results with key metrics
- **Contracts** tab: Contract results with amounts and agencies
- **Grants** tab: Grant results
- **Opportunities** tab: Active opportunities matching the query
- **SBIR/STTR** tab: Small business innovation awards

Each result card should show:
- Category badge (color-coded by type)
- Title/name (clickable, goes to detail page)
- Key metric (dollar value, date, agency)
- Relevance score indicator
- "Quick Preview" button that shows a summary popover without navigating away

### Advanced Filters Panel (collapsible sidebar)
- **Date Range**: Start/end date picker
- **Value Range**: Min/max dollar amount slider
- **Entity Type**: Checkbox list (Company, Agency, University, Non-profit, etc.)
- **Agency**: Searchable dropdown of all agencies
- **State**: Multi-select (pre-selected: MD, VA, DC, DE, PA)
- **NAICS Code**: Searchable multi-select
- **Set-Aside Type**: Small Business, 8(a), HUBZone, WOSB, SDVOSB, etc.
- **Status**: Active, Expired, Upcoming
- **Data Source**: Which tables to search (contracts, grants, opportunities, etc.)

### Search History & Saved Searches
- Show recent searches below the search bar when empty
- "Save This Search" button on results page
- Saved searches get periodic re-runs and notifications when new results match
- Connect to the existing `useSearchHistory` hook and `/saved-searches` page

### Quick Stats Bar
Above search results, show real-time stats for the current query:
- "X entities found | $Y in contracts | Z active opportunities"
- Update dynamically as filters change

### Empty State
When no results found:
- Suggest related searches
- Show trending searches
- Offer to expand search to all states (if state filter is active)
