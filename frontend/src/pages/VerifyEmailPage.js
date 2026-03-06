// src/pages/VerifyEmailPage.js
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function VerifyEmailPage() {
  const { token: verifyToken } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  const verifyEmail = useCallback(async () => {
    try {
      const { data } = await api.get(`/auth/verify-email/${verifyToken}`);
      setStatus('success');
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
    }
  }, [verifyToken, navigate]);

  useEffect(() => {
    if (verifyToken) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [verifyToken, verifyEmail]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setMessage('Verification email sent! Please check your inbox.');
      setStatus('resent');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <img src="/1000078980-removebg-preview.png" alt="SkillSwap Logo" style={{ width: '250px', height: 'auto', objectFit: 'contain' }} />
          </div>

          {status === 'verifying' && (
            <div className="status-container">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <h1>Verifying Email</h1>
              <p>Please wait while we verify your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-container success">
              <div className="success-icon">
                <svg viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="25" fill="none" />
                  <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <h1>Email Verified!</h1>
              <p>{message}</p>
              <div className="redirect-notice">
                <span>Redirecting to login</span>
                <span className="dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'resent') && (
            <div className="status-container error">
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1>Verification Failed</h1>
              <p>{message}</p>

              <form onSubmit={handleResend} className="resend-form">
                <div className="input-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={`btn btn-primary btn-full ${resending ? 'loading' : ''}`}
                  disabled={resending}
                >
                  {resending ? <span className="spinner"></span> : 'Resend Verification Email'}
                </button>
              </form>

              <button className="btn btn-text" onClick={() => navigate('/login')}>
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .auth-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
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
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: #4facfe;
          bottom: -50px;
          right: -50px;
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }

        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          padding: 2rem;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          text-align: center;
        }

        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .spinner-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #667eea;
          animation: spin 1s linear infinite;
        }

        .spinner-ring:nth-child(2) {
          inset: 10px;
          animation-duration: 1.5s;
          border-top-color: #764ba2;
        }

        .spinner-ring:nth-child(3) {
          inset: 20px;
          animation-duration: 2s;
          border-top-color: #f093fb;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-container h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .status-container p {
          color: #6b7280;
          margin: 0;
          max-width: 280px;
        }

        .success-icon {
          width: 80px;
          height: 80px;
        }

        .success-icon circle {
          stroke: #10b981;
          stroke-width: 3;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }

        .success-icon path {
          stroke: #10b981;
          stroke-width: 3;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
        }

        @keyframes stroke {
          100% { stroke-dashoffset: 0; }
        }

        .redirect-notice {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .dots span {
          animation: dots 1.4s infinite;
          opacity: 0;
        }

        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dots {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #fef2f2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-icon svg {
          width: 40px;
          height: 40px;
          color: #ef4444;
        }

        .resend-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .input-group input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
          width: 100%;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .btn-full {
          width: 100%;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.loading {
          color: transparent;
        }

        .btn .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .btn-text {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          margin-top: 1rem;
        }

        .btn-text:hover {
          color: #667eea;
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailPage;
