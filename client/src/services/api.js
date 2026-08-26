import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — redirect on 401 only if not on login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Tasks ───
export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats/summary'),
  prioritize: () => api.post('/tasks/prioritize'),
};

// ─── Corridors ───
export const corridorAPI = {
  getAll: () => api.get('/corridors'),
  getById: (sectionId) => api.get(`/corridors/${sectionId}`),
  getTraffic: (sectionId, params) => api.get(`/corridors/${sectionId}/traffic`, { params }),
  getAllWindows: () => api.get('/corridors/windows/all'),
};

// ─── Schedules ───
export const scheduleAPI = {
  getAll: (params) => api.get('/schedules', { params }),
  generate: (data) => api.post('/schedules/generate', data),
  approve: (id) => api.put(`/schedules/${id}/approve`),
  reject: (id, data) => api.put(`/schedules/${id}/reject`, data),
  override: (id, data) => api.put(`/schedules/${id}/override`, data),
  getStats: () => api.get('/schedules/stats'),
};

// ─── Reports ───
export const reportAPI = {
  getDashboardStats: () => api.get('/reports/dashboard-stats'),
  getDowntime: () => api.get('/reports/downtime'),
  getUtilization: () => api.get('/reports/utilization'),
  getAuditLog: (params) => api.get('/reports/audit-log', { params }),
  exportReport: (params) => api.get('/reports/export', { params, responseType: params?.format === 'xlsx' ? 'blob' : 'json' }),
};

// ─── Mock Data ───
export const mockAPI = {
  seed: (data) => api.post('/mock/seed', data),
  ingest: (data) => api.post('/mock/ingest', data),
};

export default api;
