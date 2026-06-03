import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

// Returns a short-lived signed URL for a vendor's (private) KTM document.
// vendor.ktm_url stores the object PATH within the vendor-documents bucket.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  // createSignedUrl on the private vendor-documents bucket needs service role —
  // anon fallback would silently 404 the KTM and confuse admins doing verification.
  const supabase = getSupabaseServiceClient();
  if (!supabase) return sendServiceUnavailable(res);

  const vendorId = req.query.vendor_id as string;
  if (!vendorId) return res.status(400).json({ error: "vendor_id wajib" });

  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("ktm_url")
    .eq("id", vendorId)
    .maybeSingle();

  if (error) return sendInternalServerError(res, "Gagal memuat vendor");
  if (!vendor?.ktm_url) return res.status(404).json({ error: "KTM tidak ada" });

  // Resolve the storage object path. Newer rows store the bare path
  // ("<uid>/ktm.jpg"); legacy rows stored a full public URL. The
  // vendor-documents bucket is now private, so a legacy public URL would
  // 400/403 in the browser — extract the object path from it and sign that
  // instead of handing back the dead public link.
  let objectPath = vendor.ktm_url;
  if (objectPath.startsWith("http")) {
    const marker = "/vendor-documents/";
    const idx = objectPath.indexOf(marker);
    if (idx === -1) {
      // Not one of our storage URLs — nothing we can sign; return as-is.
      return res.status(200).json({ url: objectPath });
    }
    // Strip any ?query (e.g. a stale token) after the path.
    objectPath = decodeURIComponent(objectPath.slice(idx + marker.length).split("?")[0]);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("vendor-documents")
    .createSignedUrl(objectPath, 120);

  if (signErr || !signed) {
    console.error("[api/admin/vendors/ktm]", signErr);
    return sendInternalServerError(res, "Gagal membuat tautan KTM");
  }
  return res.status(200).json({ url: signed.signedUrl });
}
