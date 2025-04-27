'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/api/apiClient';
import { setAuthToken, removeAuthToken, getAuthToken, getRefreshTime } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTimeout, setRefreshTimeout] = useState(null);
  const router = useRouter();
  
  // Token-Erneuerung einrichten
  const setupTokenRefresh = (token) => {
    // Bestehenden Timeout löschen
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    
    // Zeit bis zur Erneuerung berechnen
    const refreshTime = getRefreshTime(token);
    
    // Nur Timeout setzen, wenn Erneuerung noch aussteht
    if (refreshTime > 0) {
      const timeout = setTimeout(async () => {
        try {
          const response = await apiClient.post('/auth/token/refresh');
          const { access_token } = response.data;
          setAuthToken(access_token);
          setupTokenRefresh(access_token);
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Bei Fehler nichts tun - nächster API-Call wird 401 auslösen
        }
      }, refreshTime);
      
      setRefreshTimeout(timeout);
    }
  };
  
  // Benutzerinformationen laden
  const loadUserInfo = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load user info:', error);
      setUser(null);
      return null;
    }
  };
  
  // Beim Laden prüfen, ob Benutzer eingeloggt ist
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      
      const token = getAuthToken();
      if (token) {
        const userData = await loadUserInfo();
        if (userData) {
          setupTokenRefresh(token);
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
    
    // Cleanup beim Unmount
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);
  
  // Login-Funktion
  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/token', 
        new URLSearchParams({ username, password }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const { access_token } = response.data;
      setAuthToken(access_token);
      
      const userData = await loadUserInfo();
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
  
  // Logout-Funktion
  const logout = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    removeAuthToken();
    setUser(null);
    router.push('/login');
  };
  
  return { user, loading, login, logout };
}