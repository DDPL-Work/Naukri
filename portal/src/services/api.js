import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const candidateToken = localStorage.getItem('token');
    const employerToken = localStorage.getItem('employerToken');
    const isEmployerRoute = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/employer');
    const token = isEmployerRoute ? (employerToken || candidateToken) : (candidateToken || employerToken);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login or logout)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('employerToken');
      localStorage.removeItem('employerUser');
    }
    return Promise.reject(error);
  }
);

export default api;
