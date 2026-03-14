// src/pages/LoginPage.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { Mail } from 'lucide-react';

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationType, setVerificationType] = useState(null);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
    if (needsVerification) {
      setNeedsVerification(false);
      setVerificationType(null);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      setError('Please enter your email first');
      return;
    }

    setResending(true);
    try {
      if (verificationType === 'legacy') {
        await api.post('/auth/resend-verification', { email: form.email });
        setError('');
        alert('Verification email sent! Please check your inbox.');
      } else {
        setError('Please register again with the new OTP system');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsVerification(false);
    setVerificationType(null);

    try {
      const { data } = await api.post('/auth/login', form);
      // login via Zustand
      login(data.token, data.user);
      navigate('/profile');
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password';
      setError(message);

      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        setVerificationType(err.response?.data?.verificationType || 'legacy');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-split-page">
        {/* LEFT: Hero Branding Side */}
        <div className="auth-split-left">
          <div className="hero-content">
            <img src="/1000078980-removebg-preview.png" alt="SkillSwap" className="hero-logo" />
            <h1>Master New Skills</h1>
            <p>Join the premier knowledge-exchange network. Connect with experts, share your talents, and grow together.</p>
          </div>
          <div className="auth-background">
            <div className="gradient-orb orb-1"></div>
            <div className="gradient-orb orb-2"></div>
            <div className="gradient-orb orb-3"></div>
          </div>
        </div>

        {/* RIGHT: Form Side */}
        <div className="auth-split-right">
          <div className="auth-card glass">
            <div className="auth-header">
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to continue your journey</p>
            </div>

            {error && (
              <div className="alert alert-error animate-shake">
                <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {needsVerification && verificationType === 'legacy' && (
              <div className="verify-banner animate-fade-in">
                <div className="banner-icon"><Mail size={24} color="#92400e" /></div>
                <div className="banner-content">
                  <p>Your email is not verified yet.</p>
                  <button
                    type="button"
                    className="btn btn-text"
                    onClick={handleResendVerification}
                    disabled={resending}
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">
                  <span className="label-text">Email Address</span>
                  <span className="label-required">*</span>
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">
                  <span className="label-text">Password</span>
                  <span className="label-required">*</span>
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    name="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-options">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className={`btn btn-primary btn-lg btn-full ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              <div className="divider">
                <span>Don't have an account?</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => navigate('/register')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .auth-split-page {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
        }

        .auth-split-left {
          flex: 1;
          position: relative;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 4rem;
          color: white;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 480px;
        }

        .hero-logo {
          width: 200px;
          margin-bottom: 2rem;
          filter: brightness(0) invert(1);
        }

        .hero-content h1 {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .hero-content p {
          font-size: 1.25rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        @media (max-width: 900px) {
          .auth-split-left {
            display: none;
          }
        }

        .auth-split-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Legacy class re-maps */
        .auth-container {
          width: 100%;
          max-width: 440px;
        }

        .auth-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: float 20s infinite ease-in-out;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: #f093fb;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: #4facfe;
          bottom: -50px;
          right: -50px;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: #43e97b;
          top: 50%;
          left: 50%;
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -50px) scale(1.1); }
          50% { transform: translate(-30px, 30px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }

        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          padding: 2rem;
        }

        .auth-card {
          background: transparent;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
          border: none;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .logo-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5); }
        }

        .logo-icon {
          color: white;
          font-size: 2rem;
          font-weight: 700;
        }

        .auth-title {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .auth-subtitle {
          color: #6b7280;
          font-size: 1rem;
          margin: 0;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .verify-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .banner-icon {
          font-size: 1.5rem;
        }

        .banner-content p {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #92400e;
        }

        .btn-text {
          background: none;
          border: none;
          color: #92400e;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 0.875rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .label-required {
          color: #ef4444;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          width: 20px;
          height: 20px;
          color: #9ca3af;
          pointer-events: none;
        }

        .input-field {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s;
          background: white;
        }

        .input-field:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-options {
          display: flex;
          justify-content: flex-end;
        }

        .btn-link {
          background: none;
          border: none;
          color: #667eea;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          color: white;
          border: none;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
          width: 100%;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 2px solid #e5e7eb;
        }

        .btn-secondary:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .btn-lg {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        .btn-full {
          width: 100%;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.loading {
          position: relative;
          color: transparent;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        .auth-footer {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .divider {
          position: relative;
          text-align: center;
          margin-bottom: 1rem;
          width: 100%;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e5e7eb;
        }

        .divider span {
          position: relative;
          background: white;
          padding: 0 1rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export default LoginPage;
