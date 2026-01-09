import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('auth/login/', { username, password });

      const token = response.data.token || response.data.key;
      if (!token) {
        setError('Login failed: No token received');
        return;
      }

      localStorage.setItem('authToken', token);

      // Load /me/ into context (still useful)
      await login(response.data);

      // ✅ NEW: Role-based using groups + is_staff (TRIAGE_USER → /triage)
      const userData = response.data.user;
      const groups = userData.groups || [];
      
      console.log("Login Debug - Groups:", groups.map(g => g.name), "is_staff:", userData.is_staff);

      if (groups.some(g => g.name === 'TRIAGE_USER')) {
        navigate('/triage', { replace: true });
        setTimeout(() => window.location.href = '/triage', 100);
      } else if (userData.is_staff === true || groups.some(g => g.name === 'TOP_AUTHORITY' || g.name === 'DEPARTMENT_ADMIN')) {
        navigate('/admin', { replace: true });
        setTimeout(() => window.location.href = '/admin', 100);
      } else {
        navigate('/', { replace: true });
        setTimeout(() => window.location.href = '/', 100);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Grievance account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="input-field"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈 Hide' : '👁 Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              'Sign In'
            )}
          </button>

          {error && <div className="error-message">{error}</div>}
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/register" className="register-link">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
