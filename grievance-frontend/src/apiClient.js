import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// ✅ attach token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Token ${token}`;
  }
  return config;
});
export default apiClient;
