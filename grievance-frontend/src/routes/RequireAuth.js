import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const RequireAuth = () => {
  const { isAuthenticated } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default RequireAuth;
