// BASED DATA — Federal Audit Clearinghouse Data Loader V3
// Uses api.fac.gov with proper accept-profile header and DATA_GOV_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = Deno.env.get("DATA_GOV_KEY");
  const body = await req.json().catch(() => ({}));
  const auditYear = body.audit_year || 2023;
  const limit = body.limit || 100;
  const offset = body.offset || 0;
  const results: Record<string, number> = {};

  try {
    // FAC API requires accept-profile header and X-Api-Key
    const url = `https://api.fac.gov/general?audit_year=eq.${auditYear}&order=total_amount_expended.desc.nullslast&limit=${limit}&offset=${offset}`;
    console.log(`[load-federal-audits] FY${auditYear} limit=${limit} offset=${offset}`);

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "accept-profile": "api_v1_1_0",
    };
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }

    const resp = await fetch(url, { headers });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[load-federal-audits] FAC API ${resp.status}: ${errText.substring(0, 200)}`);
      
      // If 403 without key, try without auth (some endpoints are public)
      if (resp.status === 403 && apiKey) {
        console.log("[load-federal-audits] Retrying without API key...");
        const retryResp = await fetch(url, {
          headers: { "Accept": "application/json", "accept-profile": "api_v1_1_0" },
        });
        if (!retryResp.ok) {
          return new Response(JSON.stringify({
            success: false, error: `FAC API returned ${retryResp.status} on retry`,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const retryData = await retryResp.json();
        return await processAudits(supabase, retryData, auditYear, results, corsHeaders);
      }

      return new Response(JSON.stringify({
        success: false, error: `FAC API returned ${resp.status}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    return await processAudits(supabase, data, auditYear, results, corsHeaders);
  } catch (error) {
    console.error("[load-federal-audits] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processAudits(supabase: any, data: any, auditYear: number, results: Record<string, number>, corsHeaders: any) {
  const records = (Array.isArray(data) ? data : []).filter((r: any) => r.auditee_name);
  console.log(`[load-federal-audits] Processing ${records.length} audit records`);

  if (records.length === 0) {
    return new Response(JSON.stringify({ success: true, results: { loaded: 0 } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Map to federal_audits table (not federal_audit_findings)
  const mappedRecords = records.map((r: any) => ({
    audit_year: Number(r.audit_year) || auditYear,
    dbkey: r.report_id || r.dbkey || `fac-${auditYear}-${Math.random().toString(36).slice(2, 10)}`,
    auditee_name: r.auditee_name || "Unknown",
    auditee_ein: r.auditee_ein,
    auditee_uei: r.auditee_uei,
    auditee_state: r.auditee_state,
    auditee_city: r.auditee_city,
    auditee_zip: r.auditee_zip,
    auditor_name: r.auditor_firm_name,
    audit_type: r.audit_type || r.type_report_special_purpose_framework,
    total_federal_expenditures: parseFloat(r.total_amount_expended || '0') || null,
    findings_count: parseInt(r.number_months || '0') || 0,
    material_weakness: r.is_going_concern_included === true || r.is_material_weakness === true,
    cognizant_agency: r.cognizant_agency || r.oversight_agency,
    source: 'fac_gov',
  }));

  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < mappedRecords.length; i += batchSize) {
    const batch = mappedRecords.slice(i, i + batchSize);
    const { error } = await supabase.from("federal_audits").upsert(batch, {
      onConflict: "audit_year,dbkey",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("[load-federal-audits] Upsert error:", error.message);
      // Try insert as fallback
      const { error: ie } = await supabase.from("federal_audits").insert(batch);
      if (!ie) inserted += batch.length;
    } else {
      inserted += batch.length;
    }
  }
  results["loaded"] = inserted;

  // Entity linking
  const { data: unlinked } = await supabase
    .from("federal_audits")
    .select("id, auditee_name, auditee_uei")
    .is("entity_id", null)
    .limit(50);

  let linked = 0;
  for (const rec of unlinked || []) {
    let entity: any = null;
    if (rec.auditee_uei) {
      const { data: e } = await supabase
        .from("core_entities").select("id").eq("uei", rec.auditee_uei).limit(1).maybeSingle();
      entity = e;
    }
    if (!entity && rec.auditee_name) {
      const { data: e } = await supabase
        .from("core_entities").select("id")
        .ilike("canonical_name", `%${rec.auditee_name.split(" ").slice(0, 3).join(" ")}%`)
        .limit(1).maybeSingle();
      entity = e;
    }
    if (entity) {
      await supabase.from("federal_audits").update({ entity_id: entity.id }).eq("id", rec.id);
      linked++;
    }
  }
  results["entities_linked"] = linked;

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
