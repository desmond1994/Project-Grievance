import axios from 'axios';

// Set baseURL for API requests
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// Request interceptor: Attach Authorization header if token exists
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 errors (unauthorized) globally
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('apiClient request to', config.url, 'with token', token); // TEMP debug
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


export default apiClient;
