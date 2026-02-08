import { useState } from 'react';
import api from '../services/api';

function LoginPage({ onLogin, onForgotPassword = () => {} }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          type="email"
          required
        />
        <input
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          type="password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <button type="button" className="text-button" onClick={onForgotPassword}>
        Forgot password?
      </button>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default LoginPage;
