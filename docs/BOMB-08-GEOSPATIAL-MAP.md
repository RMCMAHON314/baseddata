## PRIORITY: Upgrade Market Explorer Map to Full Geospatial Intelligence

The `/explore` (MarketExplorer) map page needs to become an interactive geospatial intelligence tool. Use the existing Mapbox GL + Leaflet components.

### Map View Modes (toggle buttons)
1. **Entity Map**: Plot all entities with geocoded addresses as markers
   - Marker size = total contract value
   - Marker color = entity type (Company=blue, Agency=red, University=green, Non-profit=yellow)
   - Cluster markers when zoomed out, expand on zoom in
   - Click marker → popup with entity name, type, total value, "View Profile" link

2. **Spending Heatmap**: Choropleth map showing spending intensity by state/county
   - Color gradient from light to dark based on total contract + grant value
   - Toggle between: All spending, Defense only, Healthcare only, IT only
   - Hover state/county → tooltip with total value, top entities, top agencies

3. **Opportunity Map**: Plot active opportunities by place of performance
   - Marker color = urgency (red <7 days, yellow <30 days, green >30 days)
   - Click marker → opportunity details popup with "Track" button

4. **Relationship Network**: Show entity connections geospatially
   - Lines connecting prime contractors to subcontractors across the map
   - Line thickness = relationship value
   - Great for visualizing supply chain geography

### Map Controls
- Layer toggle panel (top-right) for switching between views
- Search box on map (top-left) that geocodes and zooms to location
- Filter panel (left sidebar, collapsible):
  - Entity type filter
  - Agency filter
  - NAICS filter
  - Value range
  - Date range
- Legend (bottom-left) showing what colors/sizes mean for current view

### Data Panel (right sidebar, collapsible)
- When a region is selected (by clicking or drawing a boundary):
  - Total entities in region
  - Total contract value in region
  - Top entities list
  - Top agencies list
  - Trending NAICS codes
- Export visible data as CSV

### Default View
- Center on Maryland/DC/Virginia (lat: 38.9, lng: -77.0, zoom: 7)
- Show entity markers by default
- Pre-load MD, VA, DC, DE, PA data

### Performance
- Use Mapbox GL for rendering (better performance for large datasets)
- Load marker data lazily as the user pans/zooms
- Use vector tiles for choropleth data
- Max 1,000 markers visible at once (cluster the rest)
