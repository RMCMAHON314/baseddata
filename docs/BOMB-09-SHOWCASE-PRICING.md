## PRIORITY: Polish Showcase Landing, Pricing, and Onboarding for Launch

We're preparing to ship. The public-facing pages need to convert visitors into paying users.

### Showcase / Landing Page (/) — Complete Redesign

**Above the fold:**
- Bold headline: "Government Spending Intelligence, Decoded."
- Subheadline: "Track $2.44 trillion in federal contracts, grants, and opportunities. Find your next win before your competitors."
- Two CTAs: "Explore Free" (goes to /explore) and "Start Free Trial" (goes to /onboarding)
- Live counter showing real database stats animated counting up:
  - "3,398+ Entities Tracked"
  - "4,677 Contracts Indexed"
  - "$2.44T in Spending Data"
  - "1,393 Active Opportunities"
  (Pull these from the database in real-time via the existing useMasterDataset hook)

**Social proof section:**
- "Trusted by government contractors, policy analysts, and business development professionals"
- Logos placeholder row (we'll add real logos later — for now use a subtle "Join 50+ organizations" text)

**Feature showcase (3-column grid):**
- **Contract Intelligence**: "Track every federal contract with real-time alerts on expirations, renewals, and new awards."
- **Opportunity Radar**: "Never miss a bid. 1,393+ active opportunities with deadline tracking and match scoring."
- **Competitive Analysis**: "Know who's winning, who's teaming, and where the money flows."
Each feature card should have a subtle screenshot/mockup of the relevant page.

**Data coverage section:**
- Visual showing all data sources: USASpending, SAM.gov, FPDS, SBIR, NSF, SEC EDGAR, GSA CALC+, ClinicalTrials.gov, USPTO
- "Updated every 4 hours" badge
- Map preview showing geographic coverage

**CTA section:**
- "Ready to win more contracts?"
- Email signup + "Start Free" button
- "No credit card required. 14-day free trial."

### Pricing Page (/pricing) — Clear Tiers

**Free Tier:**
- 100 entity views/month
- Basic search
- 10 AI queries/day
- Single user
- Price: $0

**Pro Tier:**
- Unlimited entity views
- Advanced search + saved searches
- 100 AI queries/day
- Contract expiration alerts
- Opportunity matching
- Data export (CSV, JSON, XLSX)
- Price: $99/month or $990/year (save $198)
- "Most Popular" badge

**Enterprise Tier:**
- Everything in Pro
- API access (developer-api)
- Custom alerts + webhooks
- Dedicated account support
- Team seats (5 included)
- Custom data coverage requests
- Price: "Contact Sales"

**Pricing page design:**
- Classic 3-column pricing table
- Feature comparison matrix below
- FAQ section at bottom
- "Start Free Trial" buttons on Free and Pro
- "Contact Sales" on Enterprise

### Onboarding Flow (/onboarding) — 3-step guided setup

**Step 1: Profile**
- Company name
- Your role (BD, Capture, Exec, Analyst, Policy)
- Company size
- Primary market (Defense, Health, IT, Education, Other)

**Step 2: Interests**
- Select NAICS codes you operate in (searchable multi-select)
- Select agencies you work with (top 20 as checkboxes)
- Select states of interest (default: MD, VA, DC)

**Step 3: First Wins**
- Show 5 matching opportunities based on their selections
- Show 5 matching entities (potential competitors or partners)
- "Track All" button
- "Go to Dashboard" CTA

### Footer (global)
- Links: About, Pricing, API Docs, Health Status, Contact
- Legal: Privacy Policy, Terms of Service
- "Built in Baltimore, MD 🦀" tagline
- Social links placeholder
