// App Configuration
(function () {
  const supabaseUrl = window.SUPABASE_URL || "https://your-project.supabase.co";
  const supabaseKey = window.SUPABASE_ANON_KEY || "";
  const apiBaseUrl = window.location.origin + "/api";

  window.APP_CONFIG = {
    supabaseUrl,
    supabaseKey,
    apiBaseUrl,
    tokenKey: "uc_connect_token",
    userKey: "uc_connect_user",
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  };
})();
