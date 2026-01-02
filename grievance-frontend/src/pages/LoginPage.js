import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

      // ✅ Your login response includes is_staff
      const isStaff = response.data.user?.is_staff === true;

      if (isStaff) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        </div>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      <p><a href="/register">Register new account</a></p>
    </div>
  );
};

export default LoginPage;
