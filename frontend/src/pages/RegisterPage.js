// src/pages/RegisterPage.js
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { requestOTP, verifyOTPAndRegister, resendOTP } from '../services/api';

const AUTHORIZED_DOMAINS = ['gmail.com', 'googlemail.com', 'edu', 'ac.in', 'ac.uk'];

const isAuthorizedEmail = (email) => {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return AUTHORIZED_DOMAINS.some(auth => domain === auth || domain.endsWith('.' + auth));
};

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [otp, setOtp] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [resending, setResending] = useState(false);
  const fileInputRef = useRef(null);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (error) setError('');

    if (name === 'email') {
      if (value && !isAuthorizedEmail(value)) {
        setEmailError('Please use a Gmail or academic email address');
      } else {
        setEmailError('');
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      setProfilePicture(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setProfilePicture(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!isAuthorizedEmail(form.email)) {
      setError('Please use a Gmail or academic email address');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      await requestOTP({ email: form.email, name: form.name });
      setStep(2);
      setMessage('Verification code sent! Check your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await verifyOTPAndRegister({
        email: form.email,
        otp: otp,
        name: form.name,
        password: form.password,
        profilePicture: profilePicture
      });

      setStep(3);
      setMessage('Account created successfully!');

      login(response.data.token, response.data.user);

      setTimeout(() => navigate('/profile'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');
    try {
      await resendOTP({ email: form.email, name: form.name });
      setMessage('New code sent! Check your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3].map((num) => (
        <div key={num} className={`step ${step >= num ? 'active' : ''} ${step > num ? 'completed' : ''}`}>
          <div className="step-circle">
            {step > num ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              num
            )}
          </div>
          <span className="step-label">
            {num === 1 ? 'Account' : num === 2 ? 'Verify' : 'Done'}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="auth-split-page">
        {/* LEFT: Hero Branding Side */}
        <div className="auth-split-left">
          <div className="hero-content">
            <img src="/1000078980-removebg-preview.png" alt="SkillSwap" className="hero-logo" />
            <h1>Join the Network</h1>
            <p>Exchange knowledge, grow together, and build your professional network with experts around the globe.</p>
          </div>
          <div className="register-background">
            <div className="bg-pattern"></div>
          </div>
        </div>

        {/* RIGHT: Form Side */}
        <div className="auth-split-right">
          <div className="register-card">
            {renderStepIndicator()}

            {step === 1 && (
              <>
                <div className="register-header">
                  <h1>Create Account</h1>
                  <p>Join our community of skill swappers</p>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOTP} className="register-form">
                  <div className="avatar-upload">
                    <div
                      className="avatar-preview"
                      onClick={() => fileInputRef.current?.click()}
                      style={previewImage ? { backgroundImage: `url(${previewImage})` } : {}}
                    >
                      {!previewImage && <span className="avatar-initials">{getInitials(form.name)}</span>}
                      <div className="avatar-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      hidden
                    />
                    {previewImage && (
                      <button type="button" className="btn-remove" onClick={handleRemoveImage}>
                        Remove Photo
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="input-group">
                      <label>Full Name <span className="required">*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label>
                        Email <span className="required">*</span>
                        <span className="hint">Gmail or academic only</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@university.edu"
                        className={emailError ? 'error' : ''}
                        required
                      />
                      {emailError && <span className="error-text">{emailError}</span>}
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password <span className="required">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      minLength="6"
                      required
                    />
                  </div>



                  <button
                    type="submit"
                    className={`btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
                    disabled={loading || emailError}
                  >
                    {loading ? <span className="spinner"></span> : 'Continue'}
                  </button>
                </form>

                <div className="register-footer">
                  <p>Already have an account? <button className="btn-link" onClick={() => navigate('/login')}>Sign in</button></p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="register-header">
                  <h1>Verify Email</h1>
                  <p>Enter the 6-digit code sent to <strong>{form.email}</strong></p>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {message && (
                  <div className="alert alert-success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>{message}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} className="otp-form">
                  <div className="otp-input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="otp-input"
                      autoFocus
                    />
                  </div>
                  <p className="otp-hint">Code expires in 10 minutes</p>

                  <button
                    type="submit"
                    className={`btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? <span className="spinner"></span> : 'Verify & Create Account'}
                  </button>

                  <div className="resend-section">
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={handleResendOTP}
                      disabled={resending}
                    >
                      {resending ? 'Sending...' : "Didn't receive it? Resend"}
                    </button>
                  </div>
                </form>

                <button className="btn btn-back" onClick={() => setStep(1)}>
                  ← Back
                </button>
              </>
            )}

            {step === 3 && (
              <div className="success-state">
                <div className="success-animation">
                  <div className="checkmark-circle">
                    <svg viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="25" fill="none" />
                      <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                  </div>
                </div>
                <h1>Welcome Aboard!</h1>
                <p>Your account has been created successfully.</p>
                <div className="loading-dots">
                  <span>Redirecting</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </div>
              </div>
            )}
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
        .register-container {
          width: 100%;
        }

        .register-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          opacity: 0.3;
          pointer-events: none;
        }

        .bg-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.4) 0%, transparent 50%);
          animation: patternMove 20s linear infinite;
        }

        @keyframes patternMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .register-card {
          width: 100%;
          max-width: 600px;
          padding: 1rem;
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.5;
          transition: all 0.3s;
        }

        .step.active {
          opacity: 1;
        }

        .step.completed {
          opacity: 1;
        }

        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #6b7280;
          transition: all 0.3s;
        }

        .step.active .step-circle {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
        }

        .step.completed .step-circle {
          background: #10b981;
          color: white;
        }

        .step-circle svg {
          width: 20px;
          height: 20px;
        }

        .step-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .step.active .step-label {
          color: #667eea;
        }

        .register-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .register-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .register-header p {
          color: #6b7280;
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
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .avatar-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar-preview {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          transition: transform 0.3s;
        }

        .avatar-preview:hover {
          transform: scale(1.05);
        }

        .avatar-initials {
          font-size: 3rem;
          font-weight: 700;
          color: white;
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .avatar-overlay svg {
          width: 32px;
          height: 32px;
          color: white;
        }

        .avatar-preview:hover .avatar-overlay {
          opacity: 1;
        }

        .btn-remove {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .required {
          color: #ef4444;
        }

        .hint {
          font-weight: 400;
          color: #6b7280;
          font-size: 0.75rem;
          margin-left: auto;
        }

        .input-group input {
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

        .input-group input.error {
          border-color: #ef4444;
        }

        .error-text {
          font-size: 0.875rem;
          color: #ef4444;
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
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-lg {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.loading {
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

        .register-footer {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .register-footer p {
          color: #6b7280;
          margin: 0;
        }

        .btn-link {
          background: none;
          border: none;
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          padding: 0;
          font-size: 1rem;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .otp-form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .otp-input-group {
          width: 100%;
          max-width: 280px;
        }

        .otp-input {
          width: 100%;
          padding: 1rem;
          font-size: 2rem;
          text-align: center;
          letter-spacing: 0.5em;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          font-weight: 700;
          color: #1f2937;
          transition: all 0.2s;
        }

        .otp-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .otp-hint {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        .resend-section {
          text-align: center;
        }

        .btn-text {
          background: none;
          border: none;
          color: #667eea;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .btn-back {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          margin-top: 1rem;
        }

        .success-state {
          text-align: center;
          padding: 2rem;
        }

        .success-animation {
          margin-bottom: 2rem;
        }

        .checkmark-circle {
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .checkmark-circle circle {
          stroke: #10b981;
          stroke-width: 3;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }

        .checkmark-circle path {
          stroke: #10b981;
          stroke-width: 3;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
        }

        @keyframes stroke {
          100% { stroke-dashoffset: 0; }
        }

        .success-state h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .success-state p {
          color: #6b7280;
          margin: 0 0 2rem 0;
        }

        .loading-dots {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .dot {
          animation: dots 1.4s infinite;
          opacity: 0;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dots {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default RegisterPage;
