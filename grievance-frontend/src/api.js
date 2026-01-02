// In src/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', // Your backend's base URL
});

// Add a request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
