// Authentication Helper Functions
class AuthManager {
  constructor() {
    this.userKey = 'uc_connect_user';
    this.tokenKey = 'uc_connect_token';
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

  logout() {
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenKey);
    window.location.href = '/auth/login';
  }

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  }

  isAdmin() {
    const user = this.getUser();
    return user && (user.role === 'admin' || user.role === 'super_admin');
  }

  isVendor() {
    const user = this.getUser();
    return user && user.role === 'vendor';
  }

  isCustomer() {
    const user = this.getUser();
    return user && user.role === 'customer';
  }

  requireAuth(redirectUrl = '/auth/login') {
    if (!this.isAuthenticated()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  requireRole(requiredRole) {
    const user = this.getUser();
    if (!user || user.role !== requiredRole) {
      window.location.href = '/';
      return false;
    }
    return true;
  }
}

// Create global instance
window.authManager = new AuthManager();

export default AuthManager;
