// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance
export const api = axios.create({
  baseURL: API_URL,
});

// Intercept requests to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatapp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chatapp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      localStorage.removeItem('chatapp_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    const { data } = await api.post('/auth/register', {
      username, email, password
    });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('chatapp_token', data.token);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('chatapp_token', data.token);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('chatapp_token');
    }
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      register, login, logout,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};