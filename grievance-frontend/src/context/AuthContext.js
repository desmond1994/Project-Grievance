import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../apiClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    return token ? { token, user } : null;
  });

  useEffect(() => {
    if (auth && auth.token) {
      localStorage.setItem('authToken', auth.token);
      if (auth.user) {
        localStorage.setItem('user', JSON.stringify(auth.user));
      }
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }, [auth]);

  const fetchUserInfo = async () => {
  const res = await apiClient.get('me/');
  setAuth((prev) => ({
    token: prev?.token || null,
    user: res.data,
  }));
  return res.data; // ✅ return user
};

const login = async (data) => {
  const token = data.token || data.key;

  localStorage.setItem('authToken', token);
  setAuth({ token, user: null });

  const user = await fetchUserInfo();
  return user; // ✅ return user to caller
};



  const logout = () => {
    setAuth(null);
    localStorage.removeItem('authToken');
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
