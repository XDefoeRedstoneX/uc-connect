// Authentication Helper Functions
(function () {
  class AuthManager {
    constructor() {
      this.userKey = "uc_connect_user";
      this.tokenKey = "uc_connect_token";
    }

    setUser(user) {
      if (user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }
    }

    getUser() {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    }

    setToken(token) {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      }
    }

    getToken() {
      return localStorage.getItem(this.tokenKey);
    }

    clearSession() {
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tokenKey);
    }

    async syncSession() {
      if (!window.supabaseClient) return null;

      const { data, error } = await window.supabaseClient.auth.getSession();
      if (error) {
        console.error("Supabase session error:", error);
        return null;
      }

      if (data && data.session) {
        const { session } = data;
        this.setToken(session.access_token);
        this.setUser(this.normalizeSupabaseUser(session.user));
        return session;
      }

      return null;
    }

    normalizeSupabaseUser(user) {
      if (!user) return null;
      const role =
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        user.role ||
        "customer";

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        role,
        avatar_url: user.user_metadata?.avatar_url || null,
      };
    }

    async logout() {
      this.clearSession();

      if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }

      window.location.href = "/auth/login";
    }

    isAuthenticated() {
      return !!this.getToken() && !!this.getUser();
    }

    isAdmin() {
      const user = this.getUser();
      return user && (user.role === "admin" || user.role === "super_admin");
    }

    isVendor() {
      const user = this.getUser();
      return user && user.role === "vendor";
    }

    isCustomer() {
      const user = this.getUser();
      return user && user.role === "customer";
    }

    requireAuth(redirectUrl = "/auth/login") {
      if (!this.isAuthenticated()) {
        window.location.href = redirectUrl;
        return false;
      }
      return true;
    }

    requireRole(requiredRole) {
      const user = this.getUser();
      if (!user || user.role !== requiredRole) {
        window.location.href = "/";
        return false;
      }
      return true;
    }
  }

  // Create global instance
  window.authManager = new AuthManager();
})();
