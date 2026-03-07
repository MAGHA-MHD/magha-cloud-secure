import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string; mfa_code?: string }) =>
    api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  setupMFA: () => api.post('/api/auth/mfa/setup'),
  verifyMFA: (code: string) => api.post('/api/auth/mfa/verify', { code }),
  disableMFA: (code: string) => api.post('/api/auth/mfa/disable', { code }),
};

// Files API
export const filesAPI = {
  list: () => api.get('/api/files'),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: (fileId: number) =>
    api.get(`/api/files/${fileId}/download`, { responseType: 'blob' }),
  delete: (fileId: number) => api.delete(`/api/files/${fileId}`),
  share: (fileId: number, data: { shared_with_email?: string; permission?: string; expires_hours?: number }) =>
    api.post(`/api/files/${fileId}/share`, data),
  listShares: (fileId: number) => api.get(`/api/files/${fileId}/shares`),
  listSharedWithMe: () => api.get('/api/files/shared/with-me'),
  revokeShare: (shareId: number) => api.delete(`/api/files/shares/${shareId}`),
};

// Storage API
export const storageAPI = {
  getQuota: () => api.get('/api/storage/quota'),
  getPlans: () => api.get('/api/storage/plans'),
  upgrade: (plan: string) => api.post(`/api/storage/upgrade?plan=${plan}`),
};

export default api;
