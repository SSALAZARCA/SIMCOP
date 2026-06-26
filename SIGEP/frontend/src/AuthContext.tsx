import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  username: string;
  role: string;
  token: string;
  simcopToken?: string;
  assignedUnitId?: string;
  unitId?: string; // Add unitId for compatibility with components using user.unitId
}

interface AuthContextType {
  user: User | null;
  login: (token: string, simcopToken: string, username: string, role: string, assignedUnitId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

// Helper to check if a JWT token is expired
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      const expirationDate = payload.exp * 1000;
      return Date.now() > expirationDate;
    }
  } catch (e) {
    return true;
  }
  return false;
};

// Global interceptors setup
const setupInterceptors = (onExpired: () => void) => {
  // Axios response interceptor
  const axiosInterceptor = axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        const token = localStorage.getItem('token');
        if (token && isTokenExpired(token)) {
          console.warn("Session expired (Axios Interceptor). Logging out...");
          onExpired();
        }
      }
      return Promise.reject(error);
    }
  );

  // Fetch response interceptor
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
      const token = localStorage.getItem('token');
      // Skip auth login endpoint to allow normal bad credentials responses
      const isLoginRequest = typeof args[0] === 'string' && args[0].includes('/auth/login');
      if (token && !isLoginRequest && isTokenExpired(token)) {
        console.warn("Session expired (Fetch Interceptor). Logging out...");
        onExpired();
      }
    }
    return response;
  };

  return () => {
    axios.interceptors.response.eject(axiosInterceptor);
    window.fetch = originalFetch;
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('simcopToken');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('assignedUnitId');
    setUser(null);
    window.location.reload();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const simcopToken = localStorage.getItem('simcopToken') || undefined;
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const assignedUnitId = localStorage.getItem('assignedUnitId') || undefined;

    if (token) {
      if (isTokenExpired(token)) {
        console.warn("Stored token is expired. Clearing session...");
        localStorage.removeItem('token');
        localStorage.removeItem('simcopToken');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        localStorage.removeItem('assignedUnitId');
        setUser(null);
      } else if (role && username) {
        setUser({ token, simcopToken, role, username, assignedUnitId, unitId: assignedUnitId });
      }
    }
  }, []);

  useEffect(() => {
    const cleanup = setupInterceptors(clearSession);
    return cleanup;
  }, []);

  const login = (token: string, simcopToken: string, username: string, role: string, assignedUnitId: string) => {
    localStorage.setItem('token', token);
    if (simcopToken) localStorage.setItem('simcopToken', simcopToken);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
    localStorage.setItem('assignedUnitId', assignedUnitId);
    setUser({ token, simcopToken, role, username, assignedUnitId, unitId: assignedUnitId });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('simcopToken');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('assignedUnitId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
