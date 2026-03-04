// BASED DATA — Census County Business Patterns Loader
// Pulls industry data by state/county for market sizing
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CENSUS_BASE = "https://api.census.gov/data";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const dataGovKey = Deno.env.get("DATA_GOV_KEY") || "";
  const body = await req.json().catch(() => ({}));
  const year = body.year || 2021; // Latest available CBP year
  const naicsCodes = body.naics_codes || ["5415", "5412", "5416", "5413", "3364", "5417", "5182", "5112"];
  const results: Record<string, number> = {};

  try {
    console.log(`[census-cbp] Loading CBP data for ${naicsCodes.length} NAICS codes, year ${year}`);

    for (const naics of naicsCodes) {
      try {
        await new Promise(r => setTimeout(r, 1000));

        // CBP API: get establishments, employees, payroll by state
        const url = `${CENSUS_BASE}/${year}/cbp?get=NAICS2017,NAICS2017_LABEL,ESTAB,EMP,PAYANN,STNAME&for=state:*&NAICS2017=${naics}&key=${dataGovKey}`;
        console.log(`[census-cbp] Fetching NAICS ${naics}...`);

        const resp = await fetch(url);
        if (!resp.ok) {
          console.error(`Census API error for ${naics}: ${resp.status}`);
          continue;
        }

        const data = await resp.json();
        if (!Array.isArray(data) || data.length < 2) continue;

        const headers = data[0];
        const rows = data.slice(1);

        const records = rows.map((row: string[]) => {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, i: number) => { obj[h] = row[i]; });
          return obj;
        });

        // Store as core_facts for market sizing
        const facts = records.map((r: any) => ({
          entity_id: null, // Not entity-specific, market-level data
          fact_type: "market_size_cbp",
          fact_value: {
            naics: r.NAICS2017,
            naics_label: r.NAICS2017_LABEL,
            state: r.STNAME,
            state_fips: r.state,
            establishments: Number(r.ESTAB) || 0,
            employees: Number(r.EMP) || 0,
            annual_payroll_thousands: Number(r.PAYANN) || 0,
            year,
          },
          source_name: "census_cbp",
          confidence: 1.0,
          fact_date: `${year}-01-01`,
        }));

        if (facts.length > 0) {
          const { error } = await supabase.from("core_facts").insert(facts);
          if (error && !error.message.includes("duplicate")) {
            console.error(`Insert error for NAICS ${naics}:`, error.message);
          } else {
            results[naics] = facts.length;
          }
        }
      } catch (e: any) {
        console.error(`Error for NAICS ${naics}:`, e.message);
      }
    }

    const totalRecords = Object.values(results).reduce((s, v) => s + v, 0);
    console.log(`[census-cbp] Done: ${totalRecords} records across ${Object.keys(results).length} NAICS codes`);

    return new Response(JSON.stringify({ success: true, total_records: totalRecords, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Census CBP loader error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
