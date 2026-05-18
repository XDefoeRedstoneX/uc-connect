// Supabase client initialization
(function () {
  if (!window.supabase) {
    console.error("Supabase library not loaded. Ensure supabase.min.js is included.");
    window.supabaseClient = null;
    return;
  }

  const config = window.APP_CONFIG || {};
  const supabaseUrl = config.supabaseUrl || window.SUPABASE_URL;
  const supabaseKey = config.supabaseKey || window.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseKey === "your-anon-key") {
    console.error("Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
})();
