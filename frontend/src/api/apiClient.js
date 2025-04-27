import axios from 'axios';
import { getAuthToken, setAuthToken } from '@/lib/auth';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request-Interceptor: Token in jeden Request einfügen
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response-Interceptor: Token-Erneuerung bei 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Nur bei 401 (Unauthorized) und wenn noch kein Retry versucht wurde
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Token erneuern
        const response = await axios.post(
          `${originalRequest.baseURL}/auth/token/refresh`,
          {},
          { 
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`
            }
          }
        );
        
        const { access_token } = response.data;
        setAuthToken(access_token);
        
        // Ursprüngliche Anfrage wiederholen
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Bei Fehler während Token-Erneuerung zur Login-Seite weiterleiten
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;