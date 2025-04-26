'use client';

import { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/api/apiClient';

const AuthContext = createContext({});

// Prüfen der Token-Ablaufzeit
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiryTimeout, setTokenExpiryTimeout] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Token erneuern
  const refreshToken = async () => {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // Setup des nächsten Token-Refresh
      setupTokenRefresh(access_token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };
  
  // Setup des Token-Refresh-Timers
  const setupTokenRefresh = (token) => {
    if (tokenExpiryTimeout) {
      clearTimeout(tokenExpiryTimeout);
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const timeUntilExpiry = expiryTime - Date.now();
      
      // Refresh 5 Minuten vor Ablauf
      const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
      
      if (refreshTime > 0) {
        const timeout = setTimeout(refreshToken, refreshTime);
        setTokenExpiryTimeout(timeout);
      } else {
        // Sofort erneuern wenn weniger als 5 Minuten übrig
        refreshToken();
      }
    } catch (e) {
      console.error('Error setting up token refresh:', e);
    }
  };

  // Beim ersten Laden und bei Routenänderungen
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        if (!token || isTokenExpired(token)) {
          // Wenn Token abgelaufen, versuche zu erneuern
          if (token && await refreshToken()) {
            // Erfolgreich erneuert, hole Benutzerdaten
            const response = await apiClient.get('/auth/me');
            setUser(response.data);
          } else if (pathname !== '/login' && !pathname.includes('/register')) {
            // Redirect nur wenn nicht bereits auf Login/Register-Seiten
            router.push('/login');
            setUser(null);
          }
        } else {
          // Token gültig, hole Benutzerdaten
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          setupTokenRefresh(token);
        }
      } catch (error) {
        // Bei API-Fehler (ungültiger Token etc.)
        localStorage.removeItem('token');
        if (pathname !== '/login' && !pathname.includes('/register')) {
          router.push('/login');
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
    
    // Cleanup beim Unmount
    return () => {
      if (tokenExpiryTimeout) {
        clearTimeout(tokenExpiryTimeout);
      }
    };
  }, [pathname]);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/token', 
        new URLSearchParams({
          username,
          password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // Benutzerinfo abrufen
      const userResponse = await apiClient.get('/auth/me');
      setUser(userResponse.data);
      
      // Token-Refresh einrichten
      setupTokenRefresh(access_token);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Login fehlgeschlagen' 
      };
    }
  };

  const logout = () => {
    if (tokenExpiryTimeout) {
      clearTimeout(tokenExpiryTimeout);
    }
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);