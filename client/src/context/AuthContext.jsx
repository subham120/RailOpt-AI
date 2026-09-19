import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // F2: loading starts true — prevents flash redirect to /login before auth check
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZoneState] = useState(
    localStorage.getItem('activeZone') || 'ALL'
  );

  const setActiveZone = (zoneCode) => {
    setActiveZoneState(zoneCode);
    localStorage.setItem('activeZone', zoneCode);
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');

      if (savedToken) {
        try {
          setToken(savedToken);
          // F1: Don't store full user object in localStorage — derive from /me call
          // This prevents XSS from reading user role, email, department
          const res = await authAPI.getMe();
          setUser(res.data.data);
        } catch {
          // Token expired or invalid — log out cleanly
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const payload = res.data?.data || res.data;
    const userData = payload?.user || res.data?.user;
    const authToken = payload?.token || res.data?.token;
    setUser(userData);
    setToken(authToken);
    // F1: Only store the JWT — never store user object with role/email in localStorage
    localStorage.setItem('token', authToken);
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    // F1: Removed localStorage.removeItem('user') — user is no longer stored
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    activeZone,
    setActiveZone,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    // F4: Removed phantom 'control_office' role — only valid roles in DB enum
    isControlOffice: user?.role === 'section_controller',
    canApprove: ['admin', 'section_controller'].includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
