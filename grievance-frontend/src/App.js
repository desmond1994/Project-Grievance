import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';

import GrievanceForm from './components/GrievanceForm';
import UserGrievanceDetail from './components/UserGrievanceDetail';

import TriageDashboard from './components/TriageDashboard';
import TriageGrievanceDetail from './components/TriageGrievanceDetail';

import HealthDashboard from './components/HealthDashboard';
import EngineeringDashboard from './components/EngineeringDashboard';

import RequireAuth from './routes/RequireAuth';
import RequireAdmin from './routes/RequireAdmin';

import './App.css';

function AppContent() {
  const { isAuthenticated, logout } = useContext(AuthContext);

  return (
    <div className="App">
      <nav className="main-app-nav">
        <div className="nav-left">
          <span className="nav-title">Grievance App</span>
        </div>

        <div className="nav-right">
          {isAuthenticated && <button onClick={logout}>Logout</button>}
        </div>
      </nav>

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Citizen (any logged-in user, but your HomePage redirects staff away) */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit-grievance" element={<GrievanceForm />} />
          <Route path="/user/grievances/:id" element={<UserGrievanceDetail />} />
        </Route>

        {/* Admin (staff only) */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/health" element={<HealthDashboard />} />
          <Route path="/admin/engineering" element={<EngineeringDashboard />} />
        </Route>

        {/* Triage (optional later) */}
        <Route element={<RequireAuth />}>
          <Route path="/triage" element={<TriageDashboard />} />
          <Route path="/triage/grievances/:id" element={<TriageGrievanceDetail />} />
        </Route>
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
