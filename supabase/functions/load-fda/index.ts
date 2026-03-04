// BASED DATA — FDA openFDA Data Loader
// Ingests 510(k) clearances and warning letters from openFDA API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENFDA_BASE = "https://api.fda.gov";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const mode = body.mode || "all"; // "510k" | "warnings" | "all"
  const limit = body.limit || 100;
  const results: Record<string, number> = {};

  try {
    // ═══════ 510(k) Clearances ═══════
    if (mode === "all" || mode === "510k") {
      console.log("Loading FDA 510(k) clearances...");
      const url = `${OPENFDA_BASE}/device/510k.json?limit=${limit}&sort=decision_date:desc`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const records = (data.results || []).map((r: any) => ({
          k_number: r.k_number,
          applicant: r.applicant,
          contact: r.contact,
          decision_date: r.decision_date ? `${r.decision_date.slice(0, 4)}-${r.decision_date.slice(4, 6)}-${r.decision_date.slice(6, 8)}` : null,
          decision_description: r.decision_description,
          device_name: r.device_name,
          product_code: r.product_code,
          statement_or_summary: r.statement_or_summary,
          review_advisory_committee: r.review_advisory_committee,
          third_party_flag: r.third_party_flag,
          expedited_review_flag: r.expedited_review_flag,
          raw_data: r,
        }));

        if (records.length > 0) {
          const { error } = await supabase.from("fda_510k").upsert(records, { onConflict: "k_number" });
          if (error) console.error("510k upsert error:", error.message);
          else results["fda_510k"] = records.length;
        }
      } else {
        console.error("510k API error:", resp.status);
      }
    }

    // ═══════ Warning Letters (enforcement) ═══════
    if (mode === "all" || mode === "warnings") {
      console.log("Loading FDA warning letters via enforcement...");
      const url = `${OPENFDA_BASE}/drug/enforcement.json?limit=${limit}&sort=report_date:desc`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const records = (data.results || []).map((r: any) => ({
          case_number: r.event_id || r.recall_number || crypto.randomUUID(),
          company_name: r.recalling_firm || "Unknown",
          subject: r.reason_for_recall || r.product_description,
          issuing_office: r.city + (r.state ? `, ${r.state}` : ""),
          issue_date: r.report_date ? `${r.report_date.slice(0, 4)}-${r.report_date.slice(4, 6)}-${r.report_date.slice(6, 8)}` : null,
          letter_url: null,
          raw_data: r,
        }));

        if (records.length > 0) {
          // Use insert with conflict ignore since case_number might not be unique
          const { error } = await supabase.from("fda_warning_letters").insert(records);
          if (error && !error.message.includes("duplicate")) console.error("Warning letters insert error:", error.message);
          results["fda_warnings"] = records.length;
        }
      } else {
        console.error("Enforcement API error:", resp.status);
      }
    }

    // ═══════ Entity Linking ═══════
    console.log("Linking FDA records to entities...");
    // Link 510k applicants
    const { data: unlinked510k } = await supabase
      .from("fda_510k")
      .select("id, applicant")
      .is("linked_entity_id", null)
      .not("applicant", "is", null)
      .limit(50);

    let linked = 0;
    for (const rec of unlinked510k || []) {
      const { data: entity } = await supabase
        .from("core_entities")
        .select("id")
        .ilike("canonical_name", `%${rec.applicant!.split(",")[0].trim()}%`)
        .limit(1)
        .maybeSingle();
      if (entity) {
        await supabase.from("fda_510k").update({ linked_entity_id: entity.id }).eq("id", rec.id);
        linked++;
      }
    }
    results["entities_linked"] = linked;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("FDA loader error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
