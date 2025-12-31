import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login} = useContext(AuthContext);  // <- make sure "user" is taken from context

      const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/auth/login/', {
        username,
        password,
      });

      console.log('Login response:', response.data);

      if (!response.data.token && !response.data.key) {
        setError('Login failed: invalid backend response.');
        setLoading(false);
        return;
      }

      // 1) Login (stores token, later /me/ will refresh user)
      await login(response.data);

      // 2) Use groups from login response for redirect
      const groups = response.data.user?.groups || [];

      if (groups.includes('DEPARTMENT_ADMIN') || groups.includes('TOP_AUTHORITY')) {
        navigate('/admin', { replace: true });
      } else if (groups.includes('TRIAGE_USER')) {
        navigate('/triage', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
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
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: '10px' }}>
        <a href="/register">Register a new account</a>
      </p>

    </div>
  );
};

export default LoginPage;
