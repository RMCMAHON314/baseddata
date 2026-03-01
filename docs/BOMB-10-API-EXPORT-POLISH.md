## PRIORITY: Complete Developer API Docs, Export System, and Final Quality Pass

### API Documentation Page (/api-docs) — Full Interactive Docs

Build a proper API documentation page using our existing `developer-api` and `public-api` edge functions.

**Layout:** Two-column (like Stripe or Anthropic docs)
- Left column: Navigation tree with endpoints
- Right column: Endpoint details

**Endpoints to Document:**

1. **GET /api/entities** — Search entities
   - Params: q (search query), type (entity_type), state, limit, offset
   - Response: Array of entity objects with name, type, total_value, naics_codes

2. **GET /api/entities/:id** — Get entity profile
   - Response: Full entity object with contracts, grants, relationships, insights

3. **GET /api/contracts** — Search contracts
   - Params: q, agency, min_value, max_value, start_date, end_date, naics, limit, offset
   - Response: Array of contract objects

4. **GET /api/grants** — Search grants
   - Params: q, agency, min_value, max_value, cfda, limit, offset

5. **GET /api/opportunities** — Active opportunities
   - Params: q, agency, naics, set_aside, deadline_before, deadline_after, state

6. **GET /api/insights** — AI-derived insights
   - Params: entity_id, insight_type, limit

7. **GET /api/labor-rates** — GSA labor rates
   - Params: category, min_rate, max_rate, location

8. **GET /api/stats** — Platform statistics
   - Response: Counts and totals for all data tables

**For each endpoint show:**
- Description
- Authentication (API key in header: `Authorization: Bearer {api_key}`)
- Parameters table with type, required/optional, description
- Example request (curl)
- Example response (JSON with syntax highlighting)
- Rate limits (100/minute for Pro, 1000/minute for Enterprise)

**API Key Management Section:**
- "Get Your API Key" button (requires auth)
- Shows current key (masked) with copy button
- Usage stats: requests today, requests this month, rate limit status
- Regenerate key option

### Export System — Upgrade

Our existing `export` edge function and `useExportData` hook need to support:
- **CSV export** from any data table or search result
- **JSON export** for developers
- **XLSX export** using existing xlsx integration — formatted with headers, auto-width columns, and a cover sheet with export metadata
- **PDF export** for reports — generate a formatted summary PDF for entity profiles and analytics dashboards

Add export buttons to:
- Every data table (entities list, contracts, grants, opportunities, SBIR)
- Entity profile page (full profile export)
- Analytics dashboard (full dashboard as PDF/PNG)
- Search results
- Map data panel

### Final Quality Pass

Go through the entire app and fix:

1. **Loading states**: Every page and component that fetches data should show:
   - Skeleton loaders (not spinners) matching the layout of the content
   - Never show "undefined" or "null" in the UI

2. **Error states**: Every API call should have:
   - Retry button
   - Helpful error message
   - Fallback content

3. **Empty states**: Every page that could be empty should show:
   - Illustration or icon
   - Explanation of what would be here
   - Action button to populate (e.g., "Run Data Loader" for admin, "Expand Search" for users)

4. **Navigation consistency**:
   - Breadcrumbs on every interior page
   - Active state highlighting in sidebar/nav
   - Back buttons where appropriate
   - Consistent header across all pages

5. **Responsive design**: Ensure all pages work on:
   - Desktop (1440px+)
   - Tablet (768px-1439px)
   - Mobile (320px-767px)
   - The map page can show a simplified view on mobile

6. **Performance**:
   - All routes already lazy-loaded ✅
   - Add React.memo() to heavy components (DataGrid, charts)
   - Add suspense boundaries around each route
   - Debounce all search inputs (already have useDebounce hook)

7. **Accessibility**:
   - All interactive elements should be keyboard accessible
   - ARIA labels on icon-only buttons
   - Color contrast meets WCAG AA
   - Screen reader support for data tables

8. **SEO**: Add meta tags to all public pages:
   - Title, description, og:image for social sharing
   - Structured data (JSON-LD) for the landing page
