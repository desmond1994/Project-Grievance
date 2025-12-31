// In src/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', // Your backend's base URL
});

// Add a request interceptor
api.interceptors.request.use(config => {
  // Get the token from localStorage
  const token = localStorage.getItem('token');
  
  // If the token exists, add it to the Authorization header
  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;
