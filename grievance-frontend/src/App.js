import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import GrievanceForm from './components/GrievanceForm';
import UserGrievanceDetail from './components/UserGrievanceDetail';
import TriageDashboard from './components/TriageDashboard';
import HealthDashboard from './components/HealthDashboard';
import EngineeringDashboard from './components/EngineeringDashboard';
import './App.css';

// ProtectedRoute: Ensures user is authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

// RoleBasedRoute: Ensures user has required role(s)
function RoleBasedRoute({ children, allowedRoles }) {
  const { userGroups } = useContext(AuthContext);
  const hasAccess = allowedRoles.some((role) => userGroups?.includes(role));
  return hasAccess ? children : <Navigate to="/" />;
}

// Admin routes
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminPage />} />
      <Route path="/health" element={<HealthDashboard />} />
      <Route path="/engineering" element={<EngineeringDashboard />} />
    </Routes>
  );
}

// Triage route
function TriageRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TriageDashboard />} />
    </Routes>
  );
}

function AppContent() {
  const { isAuthenticated, logout } = useContext(AuthContext);

  return (
    <div className="App">
      <nav className="main-app-nav">
  <div className="nav-left">
    <span className="nav-title">Grievance App</span>
  </div>

  <div className="nav-right">
    {isAuthenticated && (
      <>
        {/* {isCitizen && (
          <Link to="/">Home</Link>
        )}
        {isAdmin && (
          <Link to="/admin" className="nav-admin-link">Admin</Link>
        )}
        {isTriage && (
          <Link to="/triage" className="nav-triage-link">
            Triage Dashboard
          </Link>
        )} */}
        <button onClick={logout}>Logout</button>
      </>
    )}
  </div>
</nav>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Citizen routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit-grievance"
          element={
            <ProtectedRoute>
              <GrievanceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/grievances/:id"
          element={
            <ProtectedRoute>
              <UserGrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['DEPARTMENT_ADMIN', 'TOP_AUTHORITY']}>
                <AdminRoutes />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Triage route */}
        <Route
          path="/triage/*"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['TRIAGE_USER']}>
                <TriageRoutes />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
