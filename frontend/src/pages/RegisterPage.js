import { useState, useRef } from 'react';
import api from '../services/api';

function RegisterPage({ onNavigate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    skillsOffered: '',
    skillsWanted: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, or GIF)');
      return;
    }

    // Validate file size (2MB)
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const parseSkills = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await api.post('/auth/register', {
        ...form,
        skillsOffered: parseSkills(form.skillsOffered),
        skillsWanted: parseSkills(form.skillsWanted),
        profilePicture: profilePicture
      });
      setMessage('Account created successfully! You can now sign in.');
      setForm({
        name: '',
        email: '',
        password: '',
        skillsOffered: '',
        skillsWanted: ''
      });
      setPreviewImage(null);
      setProfilePicture(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join the skill swapping community</p>
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

        <form onSubmit={handleSubmit}>
          {/* Profile Picture Upload */}
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label className="form-label">Profile Picture (Optional)</label>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Profile Preview" 
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                />
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '3px dashed var(--primary)'
                  }}
                >
                  {form.name ? getInitials(form.name) : '📷'}
                </div>
              )}
              
              {/* Camera icon overlay */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontSize: '12px'
                }}
              >
                📷
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? 'Change' : 'Upload'}
              </button>
              {previewImage && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm"
                  onClick={handleRemoveImage}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="form-hint" style={{ marginTop: '0.25rem' }}>
              Max 2MB. JPG, PNG, or GIF.
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

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
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
              minLength="6"
            />
            <p className="form-hint">Must be at least 6 characters long</p>
          </div>

          <div className="form-group">
            <label className="form-label">Skills You Can Teach</label>
            <input
              type="text"
              name="skillsOffered"
              className="form-input"
              placeholder="e.g., Python, Guitar, Photography (comma separated)"
              value={form.skillsOffered}
              onChange={handleChange}
            />
            <p className="form-hint">Separate multiple skills with commas</p>
          </div>

          <div className="form-group">
            <label className="form-label">Skills You Want to Learn</label>
            <input
              type="text"
              name="skillsWanted"
              className="form-input"
              placeholder="e.g., Spanish, Cooking, React (comma separated)"
              value={form.skillsWanted}
              onChange={handleChange}
            />
            <p className="form-hint">Separate multiple skills with commas</p>
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="auth-link"
              onClick={() => onNavigate('login')}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
