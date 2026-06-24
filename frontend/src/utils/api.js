import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getApiErrorMessage = (error, fallback = 'Something went wrong.') => {
  const data = error?.response?.data;

  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error === 'string') return data.error;
  if (typeof error?.message === 'string') return error.message;

  return fallback;
};

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
  suggestions: (prefix) => api.get('/video/suggestions', { params: { prefix } }),
};

export const videoCatalogService = {
  saveVideo: (data) => api.post('/api/videos', data),
  getVideos: () => api.get('/api/videos'),
  saveProcessedVideo: (data) => api.post('/api/videos/processed', data),
  getProcessedVideosByUser: (userId) => api.get(`/api/videos/processed/user/${userId}`),
  saveUserAction: (data) => api.post('/api/videos/actions', data),
  getUserActions: (userId, actionType) => api.get(`/api/videos/actions/user/${userId}`, { params: { actionType } }),
  deleteUserAction: (userId, videoId, actionType) => api.delete('/api/videos/actions', { params: { userId, videoId, actionType } }),
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
  processAudio: (formData, videoId) => api.post('/api/ai/recipe/process', formData, {
    params: videoId ? { videoId } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  extractDescription: (videoId) => api.post('/api/ai/recipe/extract-description', null, {
    params: { videoId }
  }),
  processWorkflow: (params) => api.post('/api/ai/recipe/process-workflow', null, { params }),
};

export const recipeCatalogService = {
  createRecipe: async (data) => {
    const response = await api.post('/api/recipes', data);
    if (data?.userId) {
      sessionStorage.removeItem(`recipes:user:${data.userId}`);
    }
    return response;
  },
  getRecipesByUser: (userId) => api.get(`/api/recipes/user/${userId}`),
  getLatestRecipeByVideo: (videoId) => api.get(`/api/recipes/video/${videoId}`),
  checkByYoutubeId: (youtubeVideoId) => api.get(`/api/recipes/check/${youtubeVideoId}`),
  getRecipeIngredients: (recipeId) => api.get(`/api/recipes/${recipeId}/ingredients`),
};

export const productService = {
  generateSuggestions: (recipeId) => api.post(`/products/generate/${recipeId}`),
  getSuggestionsByRecipe: (recipeId) => api.get(`/products/recipe/${recipeId}`),
};

export const cartService = {
  initialize: (ingredients, servings, recipeName) => api.post('/api/cart/initialize', ingredients, { params: { servings, recipeName } }),
  scale: (cart, targetServings) => api.post('/api/cart/scale', cart, { params: { targetServings } }),
  updateItem: (cart, index, params) => api.put(`/api/cart/items/${index}`, cart, { params }),
  removeItem: (cart, index) => api.delete(`/api/cart/items/${index}`, { data: cart }),
};

export const cartCatalogService = {
  createCart: (data) => api.post('/api/carts', data),
  getCart: (cartId) => api.get(`/api/carts/${cartId}`),
  getCartsByUser: (userId) => api.get(`/api/carts/user/${userId}`),
  updateStatus: (cartId, status) => api.patch(`/api/carts/${cartId}/status`, null, { params: { status } }),
  saveProduct: (data) => api.post('/api/carts/products', data),
};

export default api;
