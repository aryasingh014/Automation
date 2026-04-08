// ============================================
// API Service — Axios instance + API functions
// ============================================

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with defaults
export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth APIs ────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ── Grant APIs ───────────────────────────────────
export const grantAPI = {
  getAll: () => api.get('/grants'),
  getOne: (id) => api.get(`/grants/${id}`),
  create: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/grants', data, config);
  },
  update: (id, data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.put(`/grants/${id}`, data, config);
  },
  delete: (id) => api.delete(`/grants/${id}`),
};

// ── Fund APIs ────────────────────────────────────
export const fundAPI = {
  getByGrant: (grantId) => api.get(`/funds/${grantId}`),
  create: (data) => api.post('/funds', data),
  update: (id, data) => api.put(`/funds/${id}`, data),
};

// ── Expense APIs ─────────────────────────────────
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  submit: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/expenses', data, config);
  },
  review: (id, data) => api.patch(`/expenses/${id}`, data),
};

// ── Dashboard APIs ───────────────────────────────
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
};

// ── Notification APIs ────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ── User APIs (Admin) ────────────────────────────
export const userAPI = {
  getAll: () => api.get('/users'),
  assignToGrant: (grantId, userId, action) =>
    api.put(`/users/${grantId}/assign`, { userId, action }),
};

export const scraperAPI = {
  sync: () => api.post('/scraper/sync'),
};

// ── Chatbot APIs ─────────────────────────────────
export const chatbotAPI = {
  ask: (message, history) => api.post('/chatbot/ask', { message, history }),
  health: () => api.get('/chatbot/health'),
};

// ── AI Grant Writing APIs ────────────────────────
export const aiAPI = {
  suggestGrants: (messages) => api.post('/ai/suggest', { messages }),
  suggestContextual: (data) => api.post('/ai/suggest-contextual', data),
  saveProposal: (data) => api.post('/ai/save-proposal', data),
  getProposals: () => api.get('/ai/proposals'),
  generateFullProposal: (data) => api.post('/ai/generate-full', data),
  analyzeCompliance: (data) => api.post('/ai/analyze-compliance', data),
};

// ── Compliance & Vendor APIs ─────────────────────
export const complianceAPI = {
  getVendors: () => api.get('/compliance/vendors'),
  createVendor: (data) => api.post('/compliance/vendors', data),
  getCheckpoints: (grantId) => api.get(`/compliance/checkpoints/${grantId}`),
  createCheckpoint: (data) => api.post('/compliance/checkpoints', data),
  getDocuments: (grantId) => api.get(`/compliance/documents/${grantId}`),
  requestDocument: (data) => api.post('/compliance/documents/request', data),
  reviewDocument: (id, data) => api.patch(`/compliance/documents/${id}`, data),
};

export default api;
