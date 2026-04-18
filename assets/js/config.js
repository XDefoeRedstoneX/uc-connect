// Supabase Configuration
const SUPABASE_URL = import.meta ? 'YOUR_SUPABASE_URL' : window.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta ? 'YOUR_SUPABASE_ANON_KEY' : window.SUPABASE_ANON_KEY || '';

// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// App Configuration
const APP_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
  apiBaseUrl: API_BASE_URL,
  tokenKey: 'uc_connect_token',
  userKey: 'uc_connect_user',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
};

export default APP_CONFIG;
