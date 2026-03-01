## PRIORITY: Build the Ultimate Opportunity Command Center

The `/opportunities` page is where customers will decide to pay us money. This needs to be the best opportunity tracking experience in government contracting — better than GovWin, better than Bloomberg Government.

### Opportunity Feed (main view)
- Card-based feed of active opportunities, sorted by response deadline (nearest first)
- Each card shows:
  - 🔴/🟡/🟢 Urgency indicator based on days until deadline
  - Opportunity title (large, clickable)
  - Agency name with agency logo/icon
  - Posted date → Response deadline with countdown ("3 days left", "2 weeks left")
  - Estimated value range
  - Set-aside type badges (Small Business, 8(a), HUBZone, WOSB, etc.)
  - NAICS code with description
  - Place of performance
  - "Match Score" — how well this matches the user's tracked entities and interests
  - Quick actions: "Track", "Share", "Export", "View on SAM.gov"
- Infinite scroll or pagination for the full 1,393+ opportunities

### Filters Bar (horizontal, always visible)
- Agency dropdown
- Set-aside type multi-select
- NAICS code search
- Value range slider
- Deadline range (Next 7 days, Next 30 days, Next 90 days, All)
- State/location filter
- Status: Active, Forecast, Award, Closed
- "My Matches Only" toggle (based on tracked entities)

### Opportunity Detail View (modal or dedicated page)
When clicking an opportunity:
- Full description with key terms highlighted
- Complete timeline: Posted → Q&A Period → Response Due → Expected Award
- List of likely competitors (entities with matching NAICS + past agency work)
- Similar past awards (completed contracts with same agency + NAICS)
- Average award value for similar contracts
- Teaming partner suggestions (entities that complement the user's tracked entities)
- "Add to Pipeline" button to track this opportunity through the bid process

### Pipeline Board (new view toggle)
- Kanban-style board with columns: Identified → Evaluating → Pursuing → Submitted → Won/Lost
- Drag-and-drop opportunities between stages
- Pipeline value totals per stage
- This state can be stored in localStorage or a new `user_opportunity_pipeline` table

### Analytics Panel (sidebar or separate tab)
- Opportunities by agency (bar chart)
- Opportunities by NAICS (treemap)
- Average value by set-aside type
- Response deadline calendar (monthly view showing clusters of deadlines)
- Trend: opportunities posted per week over last 6 months

### Alert Configuration
- "Set Alert" button to create notifications for:
  - New opportunities matching specific NAICS codes
  - New opportunities from specific agencies
  - Opportunities above a dollar threshold
  - Connect to the existing `alert-engine` edge function
