import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let hasWarnedAboutFallback = false;

export function getSupabaseServerClient() {
  const serverKey = supabaseServiceRole ?? supabaseAnonKey ?? supabasePublishableKey;
  if (!supabaseUrl || !serverKey) {
    return null;
  }

  if (!supabaseServiceRole && !hasWarnedAboutFallback) {
    console.warn("[supabase-server] SUPABASE_SERVICE_ROLE_KEY is missing, using public key fallback.");
    hasWarnedAboutFallback = true;
  }

  return createClient(supabaseUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
