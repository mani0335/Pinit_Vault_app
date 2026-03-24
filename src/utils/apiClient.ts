// API Client for BioVault Backend
const BASE_URL = 'https://pinit-backend.onrender.com';

const getToken = () => {
  try {
    return localStorage.getItem('pinit_token') || sessionStorage.getItem('pinit_token');
  } catch {
    return null;
  }
};

const request = async (method: string, endpoint: string, body: any = null, requiresAuth = true) => {
  const headers: any = { 'Content-Type': 'application/json' };
  
  if (requiresAuth) {
    const token = getToken();
    if (!token && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      throw new Error('Not authenticated');
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: any = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Request failed');
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'API request failed');
  }
};

// Auth API
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    request('POST', '/auth/register', { username, email, password }, false),
  login: (email: string, password: string) =>
    request('POST', '/auth/login', { email, password }, false),
  changePassword: (new_password: string) =>
    request('POST', '/auth/change-password', { new_password }),
  getMe: () => request('GET', '/auth/me'),
};

// Vault API
export const vaultAPI = {
  save: (data: any) => request('POST', '/vault/save', data),
  list: () => request('GET', '/vault/list'),
  getOne: (id: string) => request('GET', `/vault/${id}`),
  delete: (id: string) => request('DELETE', `/vault/${id}`),
  verifyByHash: (hash: string) => request('GET', `/vault/verify/${hash}`, null, false),
  search: (q: string) => request('GET', `/vault/search/query?q=${encodeURIComponent(q)}`),
};

// Certificates API
export const certAPI = {
  save: (data: any) => request('POST', '/certificates/save', data),
  list: () => request('GET', '/certificates/list'),
  delete: (id: string) => request('DELETE', `/certificates/${id}`),
};

// Comparison API
export const compareAPI = {
  save: (data: any) => request('POST', '/compare/save', data),
  getHistory: () => request('GET', '/compare/history'),
  getByAsset: (assetId: string) => request('GET', `/compare/${assetId}`),
  getPublic: (token: string) => request('GET', `/compare/public/${token}`, null, false),
};

// Admin API
export const adminAPI = {
  getUsers: () => request('GET', '/admin/users'),
  getAllVault: () => request('GET', '/admin/vault'),
  getAllReports: () => request('GET', '/admin/reports'),
  suspendUser: (id: string, reason: string) => request('PATCH', `/admin/users/${id}/suspend`, { reason }),
  activateUser: (id: string) => request('PATCH', `/admin/users/${id}/activate`),
  getAuditLog: () => request('GET', '/admin/audit-log'),
  getStats: () => request('GET', '/admin/stats'),
};
