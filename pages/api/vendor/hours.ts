import type { SupabaseClient } from "@supabase/supabase-js";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

type HourInput = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  notes: string | null;
};

const HOURS_COLUMNS = "id,day_of_week,opens_at,closes_at,is_closed,notes";

async function ownedVendorId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("vendors").select("id").eq("owner_id", userId).maybeSingle();
  return data?.id ?? null;
}

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const vendorId = await ownedVendorId(supabase, userId);
      if (!vendorId) return res.status(404).json({ error: "Vendor not found" });

      const { data: hours, error } = await supabase
        .from("vendor_hours")
        .select(HOURS_COLUMNS)
        .eq("vendor_id", vendorId)
        .order("day_of_week", { ascending: true });

      if (error) return sendInternalServerError(res, "Failed to load hours", error);
      return res.status(200).json({ hours: hours ?? [] });
    },
  }),

  PUT: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
      const vendorId = await ownedVendorId(supabase, userId);
      if (!vendorId) return res.status(404).json({ error: "Vendor not found" });

      const { hours } = (body ?? {}) as { hours?: HourInput[] };
      if (!Array.isArray(hours) || hours.length === 0) {
        return res.status(400).json({ error: "Hours data required" });
      }

      // Upsert all 7 days at once using day_of_week as conflict key.
      const upsertPayload = hours.map((h) => ({
        vendor_id: vendorId,
        day_of_week: h.day_of_week,
        opens_at: h.is_closed ? null : h.opens_at || null,
        closes_at: h.is_closed ? null : h.closes_at || null,
        is_closed: h.is_closed,
        notes: h.notes?.trim() || null,
      }));

      const { error } = await supabase
        .from("vendor_hours")
        .upsert(upsertPayload, { onConflict: "vendor_id,day_of_week" });

      if (error) return sendInternalServerError(res, "Failed to save hours", error);

      const { data: updated } = await supabase
        .from("vendor_hours")
        .select(HOURS_COLUMNS)
        .eq("vendor_id", vendorId)
        .order("day_of_week", { ascending: true });

      return res.status(200).json({ hours: updated ?? [] });
    },
  }),
});
