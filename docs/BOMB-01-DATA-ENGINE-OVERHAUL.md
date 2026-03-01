## PRIORITY: Fix Data Ingestion Engine — Populate All Empty Tables + Automate

We have 7 tables that are completely empty despite having edge function loaders deployed for most of them. The loaders exist but have never been triggered, or they fail silently. We also have only 3 total vacuum runs — we need 24/7 automated data collection.

### TASK 1: Fix and trigger all existing loaders

These tables are at 0 rows and need data NOW:

1. **sbir_awards** — We have a `load-sbir` edge function. Fix it to pull from the SBIR/STTR API (https://www.sbir.gov/api/awards.json) with params: keyword=cybersecurity,artificial+intelligence,cloud,data&rows=500. Store: agency, firm, award_title, award_amount, award_year, phase, solicitation_number, firm_url, hubzone_owned, woman_owned, socially_disadvantaged. After loading, run entity resolution to link firms to core_entities.

2. **fpds_awards** — We have a `load-fpds` edge function. Fix it to pull from FPDS Atom feed (https://www.fpds.gov/ezsearch/LATEST?q=CONTRACTING_AGENCY_NAME%3A%22DEPT+OF+DEFENSE%22+OR+CONTRACTING_AGENCY_NAME%3A%22DEPT+OF+HOMELAND+SECURITY%22&s=SIGNED_DATE&desc=Y&num=100). Parse the Atom XML, extract: contract_number, vendor_name, agency, signed_date, amount, description, naics_code, psc_code, place_of_performance_state. Run entity resolution after.

3. **sam_entities** — We have `load-sam-entities`. It needs the SAM_API_KEY secret (already configured). Pull from https://api.sam.gov/entity-information/v3/entities with params: samRegistered=Yes&registrationStatus=Active&physicalAddressStateCode=MD,VA,DC,DE,PA&api_key={SAM_API_KEY}&includeSections=All&page=0&size=100. Paginate through results. Store: uei, legal_business_name, dba_name, cage_code, entity_type, physical_address, naics_codes, socioeconomic_categories, registration_status, expiration_date.

4. **sam_exclusions** — We have `load-sam-exclusions`. Pull from https://api.sam.gov/entity-information/v2/exclusions?api_key={SAM_API_KEY}&excludingAgencyCode=ALL&limit=100. Store: entity_name, exclusion_type, agency, activation_date, termination_date, sam_number.

5. **gsa_contracts** — Create a new loader edge function `load-gsa-contracts`. Pull from GSA eBuy/GWAC APIs or scrape GSA Advantage (https://www.gsaadvantage.gov). Focus on IT Schedule 70 and MAS contracts. Store: contract_number, contractor_name, schedule, sin_number, contract_start, contract_end, pricing_type.

6. **lobbying_disclosures** — Create a `load-lobbying` edge function. Pull from OpenSecrets API or Senate Lobbying Disclosure (https://lda.senate.gov/api/v1/filings/?filing_type=Q&page_size=25). Store: registrant_name, client_name, filing_type, amount, filing_date, specific_issues.

7. **uspto_patents** — Create a `load-patents` edge function. Pull from USPTO PatentsView API (https://api.patentsview.org/patents/query) with query: {"_or":[{"_text_any":{"patent_title":"artificial intelligence"}},{"_text_any":{"patent_title":"cybersecurity"}},{"_text_any":{"patent_title":"cloud computing"}}]}. Store: patent_number, patent_title, patent_date, patent_type, inventor_names, assignee_organization, cpc_codes.

### TASK 2: Boost low-population tables

8. **clinical_trials** (only 8 rows) — Update the existing ingestion to pull from ClinicalTrials.gov API v2 (https://clinicaltrials.gov/api/v2/studies?query.term=artificial+intelligence+OR+cybersecurity+OR+health+IT&pageSize=100). We need at least 200+ trials.

9. **sec_filings** (only 100 rows) — Expand EDGAR loader to pull 10-K and 10-Q filings for ALL entities in our core_entities table that have entity_type = 'company'. Use https://efts.sec.gov/LATEST/search-index?q={company_name}&dateRange=custom&startdt=2023-01-01&enddt=2026-03-01&forms=10-K,10-Q.

### TASK 3: Set up automated scheduling

Create or update the `flywheel-scheduler` edge function to be our master cron coordinator:

- Every 2 hours: Run `mega-ingest` to process any pending queue items
- Every 4 hours: Run `data-filler-v2` for contracts, grants, opportunities refresh
- Every 6 hours: Run `ocean-controller` full cycle (ingest → resolve → enrich → derive insights)
- Every 8 hours: Run `flywheel-ultimate` self-healing check
- Every 12 hours: Run `vacuum-all` comprehensive data pull
- Every 24 hours: Run entity resolution backfill + insight regeneration
- Weekly: Run `kraken-rage` for multi-state expansion

Each scheduled run should:
- Log start/end times and row counts to a new `scheduler_runs` table
- Track success/failure with error messages
- Respect circuit breakers (check `api_circuit_breakers` before calling external APIs)
- Update the `vacuum_runs` table

Also create a **Scheduler Dashboard** component on the `/ocean` page showing:
- Last run time for each scheduled task
- Next scheduled run
- Success/failure status with row counts
- Manual "Run Now" buttons for each task
- A master "Run All" button

### TASK 4: After all loaders run, update entity resolution

Run `entity-resolver` and `backfill-entity-resolution` to link all newly loaded records (SBIR firms, SAM entities, FPDS vendors, patent assignees) to core_entities. Update `core_relationships` with new connections found.

After entity resolution, run `core-generate-insights` to derive new insights from the expanded dataset.
