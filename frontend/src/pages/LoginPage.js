import { useState } from 'react';
import api from '../services/api';

function LoginPage({ onLogin, onNavigate }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue swapping skills</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label form-label-required">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="you@university.edu"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('forgotPassword')}
            >
              Forgot your password?
            </button>
          </p>
          <p style={{ marginTop: '1rem' }}>
            Don't have an account?{' '}
            <button 
              type="button" 
              className="auth-link"
              onClick={() => onNavigate('register')}
            >
              Create one now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
