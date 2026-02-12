import { useEffect, useState, useRef } from 'react';
import api from '../services/api';

function ProfilePage({ user: currentUser }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    skillsOffered: '',
    skillsWanted: '',
    profilePicture: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const parseSkills = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setFetchLoading(true);
        const { data } = await api.get('/auth/profile');
        const user = data.user;
        setForm({
          name: user.name || '',
          email: user.email || '',
          password: '',
          skillsOffered: (user.skillsOffered || []).join(', '),
          skillsWanted: (user.skillsWanted || []).join(', '),
          profilePicture: user.profilePicture || null
        });
        setPreviewImage(user.profilePicture);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setFetchLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (message || error) {
      setMessage('');
      setError('');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
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
      setForm(prev => ({ ...prev, profilePicture: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setForm(prev => ({ ...prev, profilePicture: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { data } = await api.put('/auth/profile', {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        skillsOffered: parseSkills(form.skillsOffered),
        skillsWanted: parseSkills(form.skillsWanted),
        profilePicture: form.profilePicture
      });
      
      setMessage('Profile updated successfully');
      setForm((prev) => ({ ...prev, password: '' }));
      
      // Update local storage user data to reflect new profile picture
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        name: data.user.name,
        profilePicture: data.user.profilePicture
      }));
      
      // Dispatch event to notify App.js to update header
      window.dispatchEvent(new Event('userUpdated'));
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (fetchLoading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account and skills</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Personal Information</h3>
          <p className="card-subtitle">Update your details, photo, and skills</p>
        </div>

        <div className="card-body">
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
            {/* Profile Picture Section */}
            <div className="form-group" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <label className="form-label">Profile Picture</label>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Profile" 
                    style={{
                      width: '120px',
                      height: '120px',
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
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: '3px dashed var(--primary)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)'
                    }}
                  >
                    {getInitials(form.name)}
                  </div>
                )}
                
                {/* Camera icon overlay */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    fontSize: '14px'
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
              
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImage ? 'Change Photo' : 'Upload Photo'}
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
              <p className="form-hint" style={{ marginTop: '0.5rem' }}>
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
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password (leave blank to keep current)</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Enter new password"
                value={form.password}
                onChange={handleChange}
              />
              {form.password && (
                <p className="form-hint">Password will be updated when you save</p>
              )}
            </div>

            <hr className="section-divider" />

            <div className="form-group">
              <label className="form-label">Skills You Can Teach</label>
              <input
                type="text"
                name="skillsOffered"
                className="form-input"
                placeholder="e.g., Python, Guitar, Photography"
                value={form.skillsOffered}
                onChange={handleChange}
              />
              <p className="form-hint">These skills will be visible to other students looking to learn</p>
              
              {form.skillsOffered && (
                <div className="skill-tags" style={{ marginTop: '0.75rem' }}>
                  {parseSkills(form.skillsOffered).map((skill, idx) => (
                    <span key={idx} className="skill-tag skill-tag-offered">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Skills You Want to Learn</label>
              <input
                type="text"
                name="skillsWanted"
                className="form-input"
                placeholder="e.g., Spanish, Cooking, React"
                value={form.skillsWanted}
                onChange={handleChange}
              />
              <p className="form-hint">We'll help you find students who can teach these skills</p>
              
              {form.skillsWanted && (
                <div className="skill-tags" style={{ marginTop: '0.75rem' }}>
                  {parseSkills(form.skillsWanted).map((skill, idx) => (
                    <span key={idx} className="skill-tag skill-tag-wanted">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
