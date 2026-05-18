import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

type HourInput = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  notes: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) return sendServiceUnavailable(res);
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }
  const { supabase, userId } = authContext;

  // Resolve vendor id
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  if (req.method === "GET") {
    const { data: hours, error } = await supabase
      .from("vendor_hours")
      .select("id,day_of_week,opens_at,closes_at,is_closed,notes")
      .eq("vendor_id", vendor.id)
      .order("day_of_week", { ascending: true });

    if (error) return sendInternalServerError(res, "Failed to load hours");
    return res.status(200).json({ hours: hours ?? [] });
  }

  if (req.method === "PUT") {
    const { hours } = req.body as { hours: HourInput[] };

    if (!Array.isArray(hours) || hours.length === 0) {
      return res.status(400).json({ error: "Hours data required" });
    }

    // Upsert all 7 days at once using day_of_week as conflict key
    const upsertPayload = hours.map((h) => ({
      vendor_id: vendor.id,
      day_of_week: h.day_of_week,
      opens_at: h.is_closed ? null : (h.opens_at || null),
      closes_at: h.is_closed ? null : (h.closes_at || null),
      is_closed: h.is_closed,
      notes: h.notes?.trim() || null,
    }));

    const { error } = await supabase
      .from("vendor_hours")
      .upsert(upsertPayload, { onConflict: "vendor_id,day_of_week" });

    if (error) {
      console.error("[api/vendor/hours PUT]", error);
      return sendInternalServerError(res, "Failed to save hours");
    }

    const { data: updated } = await supabase
      .from("vendor_hours")
      .select("id,day_of_week,opens_at,closes_at,is_closed,notes")
      .eq("vendor_id", vendor.id)
      .order("day_of_week", { ascending: true });

    return res.status(200).json({ hours: updated ?? [] });
  }

  return sendMethodNotAllowed(res, "GET, PUT");
}
