import { useState } from 'react';
import api from '../services/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || 'Reset link sent to your email');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    }
  };

  return (
    <section className="panel">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input
          type="email"
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default ForgotPasswordPage;
