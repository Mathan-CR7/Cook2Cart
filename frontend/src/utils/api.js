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

export const aiService = {
  processAudio: (formData) => api.post('/api/ai/recipe/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const cartService = {
  initialize: (ingredients, servings) => api.post('/api/cart/initialize', ingredients, { params: { servings } }),
  scale: (cart, targetServings) => api.post('/api/cart/scale', cart, { params: { targetServings } }),
  updateItem: (cart, index, params) => api.put(`/api/cart/items/${index}`, cart, { params }),
  removeItem: (cart, index) => api.delete(`/api/cart/items/${index}`, { data: cart }),
};

export default api;
