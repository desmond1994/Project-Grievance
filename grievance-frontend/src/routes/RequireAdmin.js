import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const RequireAdmin = () => {
  const { isAuthenticated, isStaff } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default RequireAdmin;
