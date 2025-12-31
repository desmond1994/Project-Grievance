import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient'; // Use consistent client naming

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

 const registrationData = {
  username,
  email,
  password1: password,
  password2: passwordConfirm,
};


    try {
      await apiClient.post('auth/registration/', registrationData);
      alert('Registration Successful! Please log in.');
      navigate('/login');
    } catch (err) {
      if (err.response && err.response.data) {
        setError('Registration failed: ' + JSON.stringify(err.response.data));
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="Confirm Password"
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: '10px' }}>
        <a href="/login">Already have an account?</a>
      </p>
    </div>
    
  );
}

export default RegisterPage;
