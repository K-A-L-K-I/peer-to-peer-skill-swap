import { useState } from 'react';
import api from '../services/api';

function ResetPasswordPage({ resetToken }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.put(`/auth/reset-password/${resetToken}`, { password });
      setMessage(data.message || 'Password reset successful');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed');
    }
  };

  return (
    <section className="panel">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Reset Password</button>
      </form>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default ResetPasswordPage;
