## PRIORITY: Upgrade Omniscient AI Assistant to Production Quality

Our AI assistant (Omniscient) needs to be the smartest government contracting analyst in the room. It should be able to answer questions about our actual data.

### Chat Interface Redesign
- Persistent chat panel accessible from a floating button on every page (bottom-right corner)
- Opens as a slide-out panel (right side, 400px wide) — NOT a full-page takeover
- Chat history persisted per user session
- Suggested starter questions:
  - "Who are the top defense contractors in Maryland?"
  - "What opportunities are closing this week?"
  - "Show me the biggest healthcare contracts from last year"
  - "Which companies compete most with [entity name]?"
  - "What's the average GSA labor rate for a Senior Developer?"

### AI Capabilities (connect to existing edge functions)

**Natural Language Queries** (via `nl-query` edge function):
- User asks a question in plain English
- System converts to SQL via the nl-query function
- Returns results in a formatted table or chart within the chat
- Example: "Show me all contracts over $10M awarded in 2025" → generates SQL → returns table

**Entity Intelligence** (via `omniscient-ai`):
- "Tell me about [entity name]" → returns entity summary with key stats
- "Compare [entity A] vs [entity B]" → returns side-by-side comparison
- "Who works with [entity name]?" → returns relationship data

**Market Analysis** (via `unified-intelligence`):
- "What's the market size for cybersecurity contracts?" → aggregates from contracts by NAICS
- "Which agencies spend the most on cloud services?" → analyzes by keyword/NAICS
- "What trends do you see in AI contracting?" → pulls insights from core_derived_insights

**Opportunity Matching** (via `opportunity-intel`):
- "Find opportunities for a small business in Maryland doing cybersecurity" → filters and ranks
- "What's coming up for HUBZone companies?" → filters by set-aside

### Response Format
- AI responses should include:
  - Clear text answers
  - Inline data tables when returning structured results (use a mini DataGrid component)
  - Inline mini-charts when showing trends (use small Recharts components)
  - Clickable entity names that navigate to entity profiles
  - "Sources" footer showing which tables/data were used to generate the answer
- Typing indicator while AI is processing
- Error handling: "I couldn't find data for that query. Try rephrasing or check if the data source is loaded."

### Context Awareness
- When user is viewing an entity page, the AI should know which entity they're looking at
- When user is on the opportunities page, AI defaults to opportunity-related queries
- Pass current page context to the AI edge functions

### Rate Limiting
- Free users: 10 AI queries per day
- Pro users: 100 AI queries per day
- Track via existing api_keys rate limiting infrastructure
