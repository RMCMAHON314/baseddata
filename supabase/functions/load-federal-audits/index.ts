// BASED DATA — Federal Audit Clearinghouse Data Loader
// Ingests single audit findings from FAC API (api.fac.gov)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAC_BASE = "https://api.fac.gov/general";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const auditYear = body.audit_year || new Date().getFullYear() - 1;
  const limit = body.limit || 100;
  const results: Record<string, number> = {};

  try {
    // Pull general audit data from FAC
    console.log(`Loading federal audits for year ${auditYear}...`);
    
    // FAC API uses OData-style queries
    const url = `${FAC_BASE}?audit_year=eq.${auditYear}&order=total_amount_expended.desc&limit=${limit}`;
    
    const resp = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!resp.ok) {
      // Fallback: try alternate endpoint format
      console.log("Primary FAC endpoint failed, trying alternate...");
      const altUrl = `https://api.fac.gov/general?$filter=audit_year eq '${auditYear}'&$top=${limit}&$orderby=total_amount_expended desc`;
      const altResp = await fetch(altUrl, { headers: { "Accept": "application/json" } });
      
      if (!altResp.ok) {
        console.error("FAC API not available:", altResp.status, await altResp.text().catch(() => ""));
        return new Response(JSON.stringify({ 
          success: false, 
          error: `FAC API returned ${resp.status}. The Federal Audit Clearinghouse API may require registration.`,
          results: {} 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let data: any[];
    try {
      const json = await resp.json();
      data = Array.isArray(json) ? json : json.value || json.results || [];
    } catch {
      data = [];
    }

    console.log(`Got ${data.length} audit records`);

    const records = data.map((r: any) => ({
      audit_year: Number(r.audit_year) || auditYear,
      dbkey: r.dbkey || r.report_id,
      auditee_name: r.auditee_name || r.entity_name || "Unknown",
      auditee_ein: r.auditee_ein || r.ein,
      auditee_uei: r.auditee_uei || r.uei,
      auditee_state: r.auditee_state || r.state,
      auditee_city: r.auditee_city || r.city,
      cognizant_agency: r.cognizant_agency || r.cog_over,
      type_of_entity: r.type_of_entity || r.entity_type,
      total_federal_expenditures: Number(r.total_amount_expended) || null,
      material_weakness: r.material_weakness || r.is_material_weakness,
      significant_deficiency: r.significant_deficiency || r.is_significant_deficiency,
      questioned_costs: Number(r.questioned_costs) || null,
      raw_data: r,
    }));

    if (records.length > 0) {
      const { error } = await supabase.from("federal_audit_findings").insert(records);
      if (error && !error.message.includes("duplicate")) {
        console.error("Audit insert error:", error.message);
      }
      results["audit_findings"] = records.length;
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
      // Try UEI first, then name match
      let entity: any = null;
      if (rec.auditee_uei) {
        const { data: e } = await supabase
          .from("core_entities")
          .select("id")
          .eq("uei", rec.auditee_uei)
          .limit(1)
          .maybeSingle();
        entity = e;
      }
      if (!entity && rec.auditee_name) {
        const { data: e } = await supabase
          .from("core_entities")
          .select("id")
          .ilike("canonical_name", `%${rec.auditee_name.split(" ").slice(0, 3).join(" ")}%`)
          .limit(1)
          .maybeSingle();
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
