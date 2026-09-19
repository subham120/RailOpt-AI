import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// JWT & Active Zone interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeZone = localStorage.getItem('activeZone');
  if (activeZone && activeZone !== 'ALL') {
    config.headers['X-Rail-Zone'] = activeZone;
    if (!config.params) config.params = {};
    if (!config.params.zone) {
      config.params.zone = activeZone;
    }
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

// ─── Auth ───────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  register:       (data) => api.post('/auth/register', data),
  getMe:          ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Tasks ──────────────────────────────────────────────
export const taskAPI = {
  getAll:     (params) => api.get('/tasks', { params }),
  getById:    (id)     => api.get(`/tasks/${id}`),
  explain:    (id)     => api.get(`/tasks/${id}/explain`),
  getStats:   ()       => api.get('/tasks/stats/summary'),
  create:     (data)   => api.post('/tasks', data),
  update:     (id, data) => api.put(`/tasks/${id}`, data),
  delete:     (id)     => api.delete(`/tasks/${id}`),
  prioritize: (data)   => api.post('/tasks/prioritize', data || {}, { params: data?.zone ? { zone: data.zone } : {} }),
};

// ─── Corridors ──────────────────────────────────────────
export const corridorAPI = {
  getAll:      (params)            => api.get('/corridors', { params }),
  getById:     (sectionId)         => api.get(`/corridors/${sectionId}`),
  getTraffic:  (sectionId, params) => api.get(`/corridors/${sectionId}/traffic`, { params }),
  getAllWindows: ()                 => api.get('/corridors/windows/all'),
};

// ─── Schedules ──────────────────────────────────────────
export const scheduleAPI = {
  getAll:         (params)   => api.get('/schedules', { params }),
  getStats:       ()         => api.get('/schedules/stats'),
  generate:       (data = {}) => {
    const activeZone = localStorage.getItem('activeZone');
    const payload = { ...data };
    if (activeZone && activeZone !== 'ALL' && !payload.zone) {
      payload.zone = activeZone;
    }
    return api.post('/schedules/generate', payload);
  },
  approve:        (id)       => api.put(`/schedules/${id}/approve`),
  partialApprove: (id, data) => api.put(`/schedules/${id}/partial-approve`, data),
  reject:         (id, data) => api.put(`/schedules/${id}/reject`, data),
  override:       (id, data) => api.put(`/schedules/${id}/override`, data),
};

// ─── Timetable ──────────────────────────────────────────
export const timetableAPI = {
  getAll:         (params)   => api.get('/timetable', { params }),
  getBlocked:     (sectionId, dayOfWeek) =>
    api.get(`/timetable/${sectionId}/blocked`, { params: { dayOfWeek } }),
  checkConflict:  (params)   => api.post('/timetable/check-conflict', null, { params }),
  importCSV:      (formData) => api.post('/timetable/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ─── Reports ────────────────────────────────────────────
export const reportAPI = {
  getDashboardStats: (params) => api.get('/reports/dashboard-stats', { params }),
  getDowntime:       (params) => api.get('/reports/downtime', { params }),
  getUtilization:    (params) => api.get('/reports/utilization', { params }),
  getAuditLog:       (params) => api.get('/reports/audit-log', { params }),
  exportReport:      (params) => api.get('/reports/export', {
    params,
    responseType: params?.format === 'xlsx' ? 'blob' : 'json',
  }),
};

// ─── Alerts ─────────────────────────────────────────────
export const alertAPI = {
  getAll:      (params) => api.get('/alerts', { params }),
  markRead:    (id)     => api.put(`/alerts/${id}/read`),
  markAllRead: (params) => api.put('/alerts/read-all', null, { params }),
  delete:      (id)     => api.delete(`/alerts/${id}`),
  scan:        ()       => api.post('/alerts/scan'),
};

// ─── LLM Assistant ──────────────────────────────────────
export const assistantAPI = {
  chat: (data = {}) => {
    const activeZone = localStorage.getItem('activeZone');
    const payload = { ...data };
    if (activeZone && activeZone !== 'ALL' && !payload.zone) {
      payload.zone = activeZone;
    }
    return api.post('/assistant/chat', payload);
  },
  getSuggestions: (params) => api.get('/assistant/suggestions', { params }),
};

// ─── Data Ingest ────────────────────────────────────────
export const ingestAPI = {
  uploadCSV:        (formData)    => api.post('/ingest/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadTemplate: (source)      => api.get(`/ingest/template/${source}`, { responseType: 'blob' }),
  seed:             ()            => api.post('/ingest/seed'),
};

export default api;
