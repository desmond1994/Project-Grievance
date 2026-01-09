import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import AdminDashboard from '../components/AdminDashboard';
import TriageDashboard from '../components/TriageDashboard';
import UnifiedUserDashboard from '../components/UnifiedUserDashboard';  // Now resolves

export default function DashboardRouter() {
  const { user } = useContext(AuthContext);  // Hook at TOP - unconditional
  const [roleComponent, setRoleComponent] = useState(null);

  useEffect(() => {
    if (!user?.groups) return;

    const groups = user.groups || [];
    let component;

    if (groups.includes('TRIAGE_USER')) {
      component = <TriageDashboard />;
    } else if (groups.includes('DEPARTMENT_ADMIN') || groups.includes('TOP_AUTHORITY')) {
      component = <AdminDashboard />;
    } else {
      component = <UnifiedUserDashboard />;
    }

    setRoleComponent(component);
  }, [user]);

  if (!roleComponent) {
    return <div>Loading dashboard...</div>;
  }

  return roleComponent;
}
