import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios with auth token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await axios.get(`${API_URL}/api/auth/me`);
          setUser(response.data.user);
          setToken(storedToken);
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Axios interceptor for 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (email, password, name, company) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        name,
        company
      });
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    axios.post(`${API_URL}/api/auth/logout`).catch(() => {}); // Don't wait for response
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/api/auth/reset-password`, { email });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Password reset failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
