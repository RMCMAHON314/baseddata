// BASED DATA — Federal Audit Clearinghouse Data Loader V2
// Uses api.fac.gov with DATA_GOV_KEY authentication
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
  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "DATA_GOV_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const auditYear = body.audit_year || 2023;
  const limit = body.limit || 100;
  const results: Record<string, number> = {};

  try {
    // FAC API uses PostgREST-style queries with api.data.gov key
    const url = `https://api.fac.gov/general?audit_year=eq.${auditYear}&order=total_amount_expended.desc.nullslast&limit=${limit}`;
    console.log(`Loading federal audits for FY${auditYear} from FAC API...`);

    const resp = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`FAC API error: ${resp.status} - ${errText}`);
      return new Response(JSON.stringify({
        success: false,
        error: `FAC API returned ${resp.status}`,
        results: {},
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const records = (Array.isArray(data) ? data : []).filter((r: any) => r.auditee_name);
    console.log(`Got ${records.length} audit records`);

    const mappedRecords = records.map((r: any) => ({
      audit_year: Number(r.audit_year) || auditYear,
      dbkey: r.report_id || r.dbkey,
      auditee_name: r.auditee_name || "Unknown",
      auditee_ein: r.auditee_ein,
      auditee_uei: r.auditee_uei,
      auditee_state: r.auditee_state,
      auditee_city: r.auditee_city,
      cognizant_agency: r.cognizant_agency || r.oversight_agency,
      type_of_entity: r.entity_type,
      total_federal_expenditures: Number(r.total_amount_expended) || null,
      material_weakness: r.is_going_concern_included === true ? 'Y' : 'N',
      significant_deficiency: r.is_significant_deficiency === true ? 'Y' : 'N',
      questioned_costs: Number(r.dollar_threshold) || null,
      raw_data: r,
    }));

    if (mappedRecords.length > 0) {
      // Insert in batches to avoid payload limits
      const batchSize = 50;
      let inserted = 0;
      for (let i = 0; i < mappedRecords.length; i += batchSize) {
        const batch = mappedRecords.slice(i, i + batchSize);
        const { error } = await supabase.from("federal_audit_findings").insert(batch);
        if (error && !error.message.includes("duplicate")) {
          console.error("Batch insert error:", error.message);
        } else {
          inserted += batch.length;
        }
      }
      results["audit_findings"] = inserted;
    }

    // Entity linking
    console.log("Linking audit records to entities...");
    const { data: unlinked } = await supabase
      .from("federal_audit_findings")
      .select("id, auditee_name, auditee_uei")
      .is("linked_entity_id", null)
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
        await supabase.from("federal_audit_findings").update({ linked_entity_id: entity.id }).eq("id", rec.id);
        linked++;
      }
    }
    results["entities_linked"] = linked;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Federal audit loader error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
