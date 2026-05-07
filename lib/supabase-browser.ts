import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: any = null;

export function getSupabaseBrowserClient() {
  const supabaseKey = supabaseAnonKey ?? supabasePublishableKey;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
