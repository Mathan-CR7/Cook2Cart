import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const videoService = {
  search: (query) => api.get('/video/search', { params: { query } }),
  process: (url) => api.post('/video/process', { url }),
};

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/users/profile'),
  googleLoginUrl: () => `${API_BASE}/oauth2/authorization/google`,
};

export const addressService = {
  getAddresses: () => api.get('/address'),
  addManual: (data) => api.post('/address/manual', data),
  addLocation: (data) => api.post('/address/current-location', data),
};

export default api;
