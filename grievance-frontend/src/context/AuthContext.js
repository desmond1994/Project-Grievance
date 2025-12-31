import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../apiClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    return token ? { token, user } : null;
  });

  useEffect(() => {
    if (auth && auth.token) {
      localStorage.setItem('token', auth.token);
      if (auth.user) {
        localStorage.setItem('user', JSON.stringify(auth.user));
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [auth]);

  const fetchUserInfo = async () => {
    try {
      const res = await apiClient.get('me/');
      setAuth((prev) => ({
        token: prev?.token || null,
        user: res.data,
      }));
    } catch (e) {
      console.error('fetchUserInfo error', e);
      setAuth(null);
    }
  };

    const login = async (data) => {
    const token = data.token || data.key;

    // store token so interceptor sees it
    localStorage.setItem('token', token);

    setAuth({ token, user: null });
    await fetchUserInfo();
  };



  const logout = () => {
    setAuth(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const userGroups = auth?.user?.groups || [];
  const department = auth?.user?.department || null;

  return (
    <AuthContext.Provider
      value={{
        authToken: auth?.token || null,
        user: auth?.user || null,
        userGroups,
        department,
        isStaff: auth?.user?.is_staff === true,
        isAuthenticated: !!auth?.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
