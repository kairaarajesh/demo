import axios from 'axios';

const API_BASE_URL = `/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("salon_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('salon_token');
        localStorage.removeItem('salon_user');
        window.location.reload();
      } 
    }
    return Promise.reject(error);
  }
);

export default api;

export async function apiCall(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: unknown) {
  const response = await api({ method, url: path, data });
  return response.data;
}