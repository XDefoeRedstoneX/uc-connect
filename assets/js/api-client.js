// API Client for backend communication
class APIClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.token = this.getToken();
  }

  getToken() {
    return localStorage.getItem('uc_connect_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('uc_connect_token', token);
      this.token = token;
    }
  }

  clearToken() {
    localStorage.removeItem('uc_connect_token');
    localStorage.removeItem('uc_connect_user');
    this.token = null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/auth/login';
          throw new Error('Unauthorized - please login again');
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, password, name, role = 'customer') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  }

  async logout() {
    this.clearToken();
    return true;
  }

  // User endpoints
  async getUser() {
    return this.request('/users/me');
  }

  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Vendor endpoints
  async getVendors(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/vendors?${params}`);
  }

  async getVendor(id) {
    return this.request(`/vendors/${id}`);
  }

  async createVendor(data) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVendor(id, data) {
    return this.request(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin endpoints
  async getVendorsForVerification() {
    return this.request('/admin/vendors/pending');
  }

  async verifyVendor(vendorId, approved = true) {
    return this.request(`/admin/vendors/${vendorId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    });
  }

  async getForumPosts(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/forum/posts?${params}`);
  }

  async deleteForumPost(postId) {
    return this.request(`/forum/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/admin/users?${params}`);
  }

  async getAdminStats() {
    return this.request('/admin/stats');
  }
}

// Create global instance
window.apiClient = new APIClient();

export default APIClient;
