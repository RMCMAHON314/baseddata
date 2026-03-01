## 🚢 FINAL SHIP-IT PASS — Production Hardening, QA, and Launch Readiness

This is the FINAL prompt before we ship BasedData to real users. Every instruction below fixes a real, known issue or gap. Do NOT skip anything. Do NOT use mock data. Do NOT add placeholder content. Everything must pull from our live Supabase database.

---

### SECTION 1: KILL ALL HARDCODED / MOCK / PLACEHOLDER DATA

Audit the ENTIRE codebase and find every instance of:
- Hardcoded numbers (counts, dollar amounts, percentages) that should come from the database
- Mock data arrays or sample data objects used as fallbacks
- Placeholder strings like "Lorem ipsum", "Coming soon", "TBD", "N/A" where real data should exist
- Demo entity names or fake company names
- Static stats on the landing page / showcase that don't update from the database

**For every instance found:**
- Replace with a live Supabase query using the appropriate hook (useUnifiedData, useMarketData, useMasterDataset, useEntityData)
- If the data source is empty or the query fails, show a proper empty state (icon + explanation + action button) — NEVER show "0" or "undefined" or stale hardcoded numbers
- The Showcase/landing page MUST pull live counts from the database: total entities from core_entities, total contracts + sum of contract values from contracts, total grants from grants, total opportunities from opportunities, total insights from core_derived_insights. Use the existing useMasterDataset hook or create a lightweight RPC function `get_platform_stats` that returns all counts in one call.

**Specific known hardcoded items to fix:**
- Landing page hero stats (if showing static "5 Agencies · 19 States" or similar — query actual distinct counts)
- Any "Last updated" timestamps that are hardcoded instead of pulled from vacuum_runs or scheduler_runs
- Agency logos/names list if not dynamically generated from the data
- NAICS code lists if hardcoded instead of queried from contracts/entities

---

### SECTION 2: NAVIGATION — EXPOSE ALL 26 ROUTES

Our app has 26 routes but users can only see a fraction of them. Fix the navigation to expose everything that has real functionality:

**Primary Navigation (top nav or sidebar — always visible):**
- Explore (map) → /explore
- Search → /search
- Entities → /entities
- Opportunities → /opportunities
- Analytics → /analytics
- Intelligence → /intelligence

**Secondary Navigation (dropdown or expandable section):**
- SBIR Explorer → /sbir
- Healthcare → /healthcare
- Education → /education
- Labor Rates → /labor-rates
- Compare → /compare
- Saved Searches → /saved-searches

**User Menu (avatar/profile dropdown):**
- Dashboard → /dashboard
- Saved Searches → /saved-searches
- API Keys → /api-docs
- Install App (PWA) → /install
- Settings

**Admin Menu (only visible to admin role users — check user_roles):**
- Admin Panel → /admin
- Ocean (Pipeline) → /ocean
- Health → /health
- Diagnostic → /diagnostic
- Gap Fixer → /gap-fixer

**Footer Links:**
- Pricing → /pricing
- API Docs → /api-docs
- System Health → /health

**Navigation Requirements:**
- Active route highlighting on the current page
- Breadcrumbs on every interior page (Home > Section > Page)
- Mobile: hamburger menu that expands to show all primary + secondary nav
- Badge indicators: show count of active opportunities on the Opportunities nav item, show alert dot on Intelligence if new insights exist

---

### SECTION 3: DATA FRESHNESS & PIPELINE HEALTH INDICATOR

Add a global "Data Freshness" indicator visible on every page (subtle, in the footer bar or top nav):
- Show: "Data updated X minutes/hours ago" based on the most recent entry in vacuum_runs or scheduler_runs
- Color code: Green if <4 hours old, Yellow if 4-12 hours, Red if >12 hours
- Clicking it opens a popover showing:
  - Last vacuum run timestamp and result
  - Last scheduler run timestamps per task
  - Total records by table (quick health check)
  - Link to /ocean for admins

If vacuum_runs has only 3 entries and no recent automated runs, show a yellow warning: "Automated data collection is initializing. Data updates every 4 hours once active."

---

### SECTION 4: ERROR HANDLING & EDGE CASES — BULLETPROOF EVERYTHING

Go through EVERY page and EVERY component that makes a Supabase query and ensure:

**Loading States:**
- Every data-fetching component shows skeleton loaders (NOT spinners) that match the shape of the content they're replacing
- Use Framer Motion fade-in when data arrives
- Never show a blank white page while data loads

**Error States:**
- Every Supabase query has a .catch() or error boundary
- On error, show: error icon + "Unable to load [data type]. Please try again." + Retry button
- Log errors to console with the specific table/function that failed
- Never show raw error messages, stack traces, or "undefined" to users

**Empty States (per page):**
- /entities with 0 results: "No entities found. Try adjusting your search filters or expanding your state selection."
- /opportunities with 0 results: "No matching opportunities. Broaden your filters or check back — new opportunities are ingested every 4 hours."
- /sbir with empty sbir_awards: "SBIR data is being collected. Check back soon or contact us to prioritize this data source." + link to admin for admins
- /healthcare with few clinical_trials: "Healthcare data is actively growing. Currently tracking [X] clinical trials with more being added daily."
- Entity profile with no contracts: Show the tab but with "No contracts found for this entity yet. As our data coverage expands, new records will appear automatically."
- Every empty table/chart/list should have a purposeful empty state — NEVER show an empty white box

**Null/Undefined Guards:**
- Every entity name display: `entity.name || 'Unknown Entity'`
- Every dollar amount: format with `$` and commas, show `$0` if null (never "undefined" or "NaN")
- Every date: format as readable date, show "Date unavailable" if null
- Every count: show `0` if null, never "undefined"
- Array.map() calls: always check for null/undefined array first with `(data || []).map()`

---

### SECTION 5: PERFORMANCE & LOADING OPTIMIZATION

**Critical Performance Fixes:**
1. All 26 routes are already lazy-loaded ✅ — verify this is still true, no routes accidentally imported eagerly
2. Add `React.memo()` wrapper to these heavy components: DataGrid, NetworkGraph, all Recharts chart components, MapView
3. Add `useMemo()` for any expensive data transformations (sorting, filtering, aggregating large arrays)
4. Add `useCallback()` for event handlers passed as props to memoized children
5. Debounce ALL search inputs using the existing useDebounce hook — 300ms minimum
6. For entity list and contract list pages: implement virtual scrolling (react-window or similar) if the list can exceed 100 items, OR use proper pagination with limit/offset queries
7. Images: add loading="lazy" to any images below the fold
8. Supabase queries: add `.limit()` to ALL list queries — never fetch unbounded result sets. Default to 50 rows, paginate for more.

**Suspense Boundaries:**
- Wrap each lazy-loaded route in its own `<Suspense fallback={<PageSkeleton />}>` where PageSkeleton is a generic full-page skeleton loader
- This prevents the entire app from showing a loading state when navigating between pages

---

### SECTION 6: RESPONSIVE DESIGN — MOBILE & TABLET

Test and fix every page for three breakpoints:
- **Desktop**: 1440px+ (primary design target)
- **Tablet**: 768px–1439px
- **Mobile**: 320px–767px

**Specific fixes needed:**
1. **Data tables** (entities list, contracts, grants, opportunities): On mobile, switch to a card-based layout instead of wide tables. Each card shows the key fields stacked vertically. On tablet, allow horizontal scroll on tables with a visible scroll indicator.
2. **Analytics charts**: Stack charts vertically on mobile (1 column). On tablet, use 2 columns. On desktop, use the designed grid.
3. **Map page**: On mobile, make the map full-width with filter panel as a bottom sheet (swipe up to reveal filters). On tablet, use a narrower sidebar.
4. **Navigation**: Mobile hamburger menu. Tablet can use a collapsed sidebar with icons only, expanding on hover.
5. **Entity profile tabs**: On mobile, switch from horizontal tabs to a dropdown selector or vertical accordion.
6. **Search filters panel**: On mobile, filters should be behind a "Filters" button that opens a full-screen modal. On tablet, collapsible sidebar.
7. **Pricing page**: Stack the 3 pricing columns vertically on mobile with the "Most Popular" tier first.
8. **All buttons and touch targets**: Minimum 44px height on mobile (iOS Human Interface Guidelines).
9. **Font sizes**: Body text minimum 16px on mobile to prevent iOS zoom-on-focus behavior in inputs.
10. **Modals and popovers**: On mobile, convert to full-screen overlays instead of small popover boxes.

---

### SECTION 7: AUTH, SECURITY & ROLE GATING

**Authentication Flow:**
- Verify the AuthModal works end-to-end: email signup → email verification → login → redirect to dashboard
- After login, store user profile in AuthContext and make it available app-wide
- Protected routes (/dashboard, /saved-searches, /admin, /ocean, /diagnostic, /gap-fixer) must redirect to login if no session
- Public routes (/, /showcase, /explore, /search, /entities, /pricing, /api-docs) should work without auth but show "Sign in for full access" prompts where applicable

**Role Gating:**
- Admin-only pages (/admin, /ocean, /diagnostic, /gap-fixer): check `has_role('admin')` server-side via the existing SQL function. If not admin, show "Access Denied" page with link back to dashboard.
- The admin nav section should ONLY render for admin users — don't even show the menu items to regular users.

**Rate Limiting UI:**
- If a user hits API rate limits (from api_keys table: requests_this_minute, requests_today), show a friendly "You've reached your usage limit. Upgrade to Pro for more." message with link to /pricing
- For AI queries (Omniscient), track and display remaining queries: "You have X AI queries remaining today"

**Session Handling:**
- Handle expired sessions gracefully — if a Supabase query returns 401, redirect to login with a "Session expired, please sign in again" message
- Don't lose the user's current page — after re-login, redirect back to where they were

---

### SECTION 8: SEO, META TAGS & SOCIAL SHARING

Add proper meta tags to all public-facing pages:

**Landing/Showcase page:**
```
<title>BasedData — Government Spending Intelligence Platform</title>
<meta name="description" content="Track $2.44 trillion in federal contracts, grants, and opportunities. The most comprehensive government spending intelligence platform for tech, defense, healthcare, and education.">
<meta property="og:title" content="BasedData — Government Spending Intelligence">
<meta property="og:description" content="Track federal contracts, grants, and opportunities. Find your next win before your competitors.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://baseddata.app">
<meta name="twitter:card" content="summary_large_image">
```

**Entity pages** (dynamic):
```
<title>{entity.name} — BasedData Intelligence Profile</title>
<meta name="description" content="Government contracting profile for {entity.name}. View contracts, grants, relationships, and competitive intelligence.">
```

**Pricing page:**
```
<title>Pricing — BasedData</title>
<meta name="description" content="Start free. Pro at $99/month. Enterprise with API access and team seats.">
```

Use react-helmet-async or a similar library to manage dynamic head tags per route.

**Structured Data (JSON-LD) on landing page:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BasedData",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Government spending intelligence platform",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

---

### SECTION 9: PWA & INSTALL EXPERIENCE

Verify the PWA configuration (vite-plugin-pwa) is working:
- Service worker registers and caches static assets
- App is installable on Chrome, Edge, Safari (shows install prompt)
- Manifest.json has: name "BasedData", short_name "BasedData", theme_color matching our primary blue (#3B82F6), proper icons at 192x192 and 512x512
- Offline fallback page: "You're offline. BasedData requires an internet connection to access live government data. Please check your connection."
- The /install page should detect if the app is already installed and show appropriate messaging

---

### SECTION 10: FINAL VISUAL POLISH & CONSISTENCY

**Design System Compliance — audit every page against our METATRON Quantum Edition theme:**
- Primary Blue: #3B82F6 (all primary buttons, links, active states)
- Cyan accent: #06B6D4 (secondary highlights)
- Success: Emerald green for positive metrics, money values, growth indicators
- Warning: Amber for caution states, approaching deadlines
- Error: Rose for errors, expired items, negative trends
- Fonts: Inter for UI text, JetBrains Mono for data/code/numbers
- Dark mode: Verify EVERY page renders correctly in dark mode with proper HSL token swaps. No white text on white backgrounds. No invisible elements.

**Consistency Fixes:**
- Every page should use the same GlobalLayout wrapper (consistent header, nav, footer)
- Card components should have consistent border-radius, padding, and shadow across all pages
- Button styles: Primary (filled blue), Secondary (outlined), Destructive (red), Ghost (transparent) — use the same shadcn/ui button variants everywhere
- Table styles: Use the same DataGrid or shadcn Table component everywhere, not a mix of custom tables
- Spacing: Use Tailwind's spacing scale consistently (p-4, p-6, gap-4, gap-6 — no random px values)

**Animations (Framer Motion):**
- Page transitions: Subtle fade-in (opacity 0→1, 200ms) when navigating between routes
- Card hover: Scale 1.01 + subtle shadow increase
- Chart appear: Stagger children fade-in when charts load
- Do NOT over-animate — keep it professional and fast. No bouncing, no spinning, no delays >300ms.

**Typography Hierarchy:**
- Page titles: text-3xl font-bold (Inter)
- Section headers: text-xl font-semibold
- Card titles: text-lg font-medium
- Body text: text-sm or text-base
- Data/numbers: JetBrains Mono, tabular-nums for proper alignment in tables
- Muted/secondary text: text-muted-foreground

---

### SECTION 11: ACCESSIBILITY (WCAG AA MINIMUM)

- All interactive elements (buttons, links, inputs) must be keyboard accessible (Tab navigation + Enter/Space to activate)
- Focus indicators: Visible focus ring (ring-2 ring-blue-500) on all focusable elements
- ARIA labels on all icon-only buttons (e.g., the map zoom buttons, close buttons, filter toggles)
- Alt text on all images (or role="presentation" for decorative images)
- Color contrast: All text meets WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text)
- Data tables: Use proper <thead>, <tbody>, <th scope="col"> semantics
- Screen reader support: Chart components should have aria-label describing the data trend (e.g., "Bar chart showing contract spending by agency, Department of Defense leads at $X")
- Skip-to-content link: Add a hidden "Skip to main content" link that appears on keyboard focus

---

### SECTION 12: PRE-LAUNCH CHECKLIST VERIFICATION PAGE

Create a new admin-only page at `/admin/launch-checklist` that programmatically verifies ship readiness:

**Data Health Checks (auto-run on page load):**
- [ ] core_entities count > 3,000 → query and show actual count with ✅ or ❌
- [ ] contracts count > 4,000 → query and show
- [ ] grants count > 2,000 → query and show
- [ ] opportunities count > 1,000 → query and show
- [ ] core_relationships count > 10,000 → query and show
- [ ] core_derived_insights count > 3,000 → query and show
- [ ] gsa_labor_rates count > 2,000 → query and show
- [ ] subawards count > 3,000 → query and show
- [ ] nsf_awards count > 500 → query and show
- [ ] vacuum_runs count > 3 → query and show (flag if still only 3)
- [ ] For each previously-empty table (sbir_awards, sam_entities, sam_exclusions, fpds_awards, gsa_contracts, lobbying_disclosures, uspto_patents): show count with ✅ if >0, ❌ if still 0

**Route Health Checks:**
- For each of the 26 routes: attempt to load the component and verify it renders without error
- Show ✅ for routes that load successfully, ❌ for routes that throw errors

**Feature Checks:**
- [ ] Auth flow works (login/signup/logout)
- [ ] Search returns results
- [ ] Entity profile loads with tabs
- [ ] Map renders with markers
- [ ] Export generates a file
- [ ] AI chat returns a response

**Edge Function Health:**
- Ping each critical edge function (health-check, mega-search, omniscient) and verify 200 response
- Show response time for each

**Overall Score:**
- Calculate total checks passed / total checks
- Show as a large percentage with color: Green >90%, Yellow 70-90%, Red <70%
- "READY TO SHIP" banner if >90%

---

### FINAL INSTRUCTION

After implementing ALL of the above, do a complete build (`npm run build`) and verify:
- Zero TypeScript errors
- Zero build warnings related to missing imports or unused variables
- Bundle size is reasonable (main chunk <500KB, total <2MB)
- All lazy-loaded chunks generate properly

This is the last prompt before we launch. Make it bulletproof. Make it beautiful. Make it SHIP-READY.
