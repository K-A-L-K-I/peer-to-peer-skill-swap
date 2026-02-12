import { useState } from 'react';
import api from '../services/api';

function ResetPasswordPage({ resetToken }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { data } = await api.put(`/auth/reset-password/${resetToken}`, { password });
      setMessage(data.message || 'Password reset successful! You can now sign in with your new password.');
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="auth-header">
          <h2>Create New Password</h2>
          <p>Enter your new password below</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            <span>✓</span>
            {message}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label form-label-required">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="form-hint" style={{ color: 'var(--error)' }}>Passwords do not match</p>
              )}
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
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}

        {success && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Go to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
