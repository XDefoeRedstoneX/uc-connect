import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

// Returns a short-lived signed URL for a vendor's (private) KTM document.
// vendor.ktm_url stores the object PATH within the vendor-documents bucket.
export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ req, res }) => {
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

      if (error) return sendInternalServerError(res, "Gagal memuat vendor", error);
      if (!vendor?.ktm_url) return res.status(404).json({ error: "KTM tidak ada" });

      // Resolve the storage object path. Newer rows store the bare path; legacy
      // rows stored a full public URL. The bucket is now private, so extract the
      // object path and sign that instead of handing back a dead public link.
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

      if (signErr || !signed) return sendInternalServerError(res, "Gagal membuat tautan KTM", signErr);
      return res.status(200).json({ url: signed.signedUrl });
    },
  }),
});
