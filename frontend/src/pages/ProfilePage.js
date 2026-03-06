// src/pages/ProfilePage.js
import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import SkillPicker from '../components/SkillPicker';

function ProfilePage() {
  const { updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
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

  const parseSkills = (value) => {
    if (!value || typeof value !== 'string') return [];
    return value.split(',').map(item => item.trim()).filter(Boolean);
  };

  const stringifySkills = (skillsArray) => {
    if (!Array.isArray(skillsArray)) return '';
    return skillsArray.join(', ');
  };

  const loadProfile = useCallback(async () => {
    try {
      setFetchLoading(true);
      const { data } = await api.get('/auth/profile');
      const user = data.user;
      setUserData(user);
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        skillsOffered: stringifySkills(user.skillsOffered),
        skillsWanted: stringifySkills(user.skillsWanted),
        profilePicture: user.profilePicture || null
      });
      setPreviewImage(user.profilePicture);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleEdit = () => {
    setIsEditing(true);
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    if (userData) {
      setForm({
        name: userData.name || '',
        email: userData.email || '',
        password: '',
        skillsOffered: stringifySkills(userData.skillsOffered),
        skillsWanted: stringifySkills(userData.skillsWanted),
        profilePicture: userData.profilePicture || null
      });
      setPreviewImage(userData.profilePicture);
    }
    setIsEditing(false);
    setError('');
    setMessage('');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
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
      setForm(prev => ({ ...prev, profilePicture: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setForm(prev => ({ ...prev, profilePicture: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      setForm(prev => ({ ...prev, password: '' }));
      setUserData(data.user);

      // Update global user state
      updateUser(data.user);

      setTimeout(() => {
        setIsEditing(false);
        setMessage('');
      }, 1500);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (fetchLoading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p>Failed to load profile. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="profile-container-vibrant">
      {/* Animated Background */}
      <div className="ambient-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="profile-wrapper-vibrant">
        {error && <div className="toast toast-error">{error}</div>}
        {message && <div className="toast toast-success">{message}</div>}

        <div className="profile-card-main">

          {/* Header & Avatar Overlay */}
          <div className="profile-hero-section">
            <div className="avatar-container">
              <div
                className="avatar-circle"
                style={previewImage ? { backgroundImage: `url(${previewImage})` } : {}}
              >
                {!previewImage && <span className="avatar-initials">{getInitials(userData.name)}</span>}
                {isEditing && (
                  <div className="avatar-hover-edit" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              {isEditing && previewImage && (
                <button className="btn-text-danger" onClick={handleRemoveImage}>
                  Remove
                </button>
              )}
            </div>

            <div className="hero-actions">
              {!isEditing ? (
                <button className="btn-vibrant-primary" onClick={handleEdit}>
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions-top">
                  <button className="btn-vibrant-ghost" onClick={handleCancel} disabled={loading}>Cancel</button>
                  <button className="btn-vibrant-primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-body-grid">

            {/* Left Column: Info */}
            <div className="profile-info-column">
              {isEditing ? (
                <div className="animated-edit-form">
                  <h3 className="section-heading">Personal Details</h3>
                  <div className="vibrant-input-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="vibrant-input-group">
                    <label>Email Address</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required />
                  </div>
                  <div className="vibrant-input-group">
                    <label>New Password <span className="optional-text">(Optional)</span></label>
                    <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
                  </div>
                </div>
              ) : (
                <div className="user-identity">
                  <h1 className="display-name">{userData.name}</h1>
                  <p className="display-email">{userData.email}</p>
                  <div className="user-badges">
                    <span className={`status-badge ${userData.role}`}>
                      {userData.role === 'admin' ? '✨ Admin' : '👋 Member'}
                    </span>
                    <span className="date-badge">
                      Joined {formatDate(userData.createdAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Stats Block embedded in left column for standard viewing */}
              {!isEditing && (
                <div className="stats-row">
                  <div className="stat-brick">
                    <span className="stat-num">{userData.skillsOffered?.length || 0}</span>
                    <span className="stat-lbl">Teaching</span>
                  </div>
                  <div className="stat-brick">
                    <span className="stat-num">{userData.skillsWanted?.length || 0}</span>
                    <span className="stat-lbl">Learning</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Skills */}
            <div className={`profile-skills-column ${isEditing ? 'skills-edit-grid' : ''}`}>
              <div className="skills-block teach-block">
                <div className="block-header">
                  <div className="icon-wrap teach-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                  </div>
                  <h3 className="section-heading">Skills I Can Teach</h3>
                </div>
                {isEditing ? (
                  <div className="picker-wrapper">
                    <SkillPicker
                      selectedSkills={parseSkills(form.skillsOffered)}
                      onChange={(skills) => setForm({ ...form, skillsOffered: skills.join(', ') })}
                      mode="offer"
                    />
                  </div>
                ) : (
                  <div className="skills-cloud">
                    {userData.skillsOffered?.length > 0 ? (
                      userData.skillsOffered.map((skill, idx) => (
                        <span key={`offer-${idx}`} className="skill-bubble bubble-teach">{skill}</span>
                      ))
                    ) : (
                      <p className="no-skills">No skills added yet.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="skills-block learn-block">
                <div className="block-header">
                  <div className="icon-wrap learn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="section-heading">Skills I Want to Learn</h3>
                </div>
                {isEditing ? (
                  <div className="picker-wrapper">
                    <SkillPicker
                      selectedSkills={parseSkills(form.skillsWanted)}
                      onChange={(skills) => setForm({ ...form, skillsWanted: skills.join(', ') })}
                      mode="want"
                    />
                  </div>
                ) : (
                  <div className="skills-cloud">
                    {userData.skillsWanted?.length > 0 ? (
                      userData.skillsWanted.map((skill, idx) => (
                        <span key={`want-${idx}`} className="skill-bubble bubble-learn">{skill}</span>
                      ))
                    ) : (
                      <p className="no-skills">No skills requested yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* Vibrant, Premium, Modern Aesthetic */
        .profile-container-vibrant {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding-bottom: 6rem;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient Background */
        .ambient-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 20s infinite ease-in-out;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          top: -200px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          bottom: -100px;
          right: -50px;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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

        .profile-wrapper-vibrant {
          position: relative;
          z-index: 10;
          max-width: 1400px;
          width: 95%;
          margin: 0 auto;
          padding: 160px 2rem 0;
        }

        /* Toasts */
        .toast {
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-weight: 600;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .toast-error { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        .toast-success { background: #dcfce7; color: #166534; border-left: 4px solid #22c55e; }

        /* Main Card Layout */
        .profile-card-main {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 50px -10px rgba(17, 24, 39, 0.08);
          padding: 2.5rem;
          position: relative;
        }

        .profile-hero-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: -80px; /* Pulls avatar up into banner */
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .avatar-circle {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: #ffffff;
          border: 6px solid #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          position: relative;
          overflow: hidden;
        }

        .avatar-initials {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .avatar-hover-edit {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: all 0.3s;
          cursor: pointer;
        }

        .avatar-circle:hover .avatar-hover-edit {
          opacity: 1;
        }

        .avatar-hover-edit svg {
          width: 32px;
          height: 32px;
        }

        .btn-text-danger {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .btn-text-danger:hover { text-decoration: underline; }

        .hero-actions {
          margin-bottom: 1rem;
        }

        .edit-actions-top {
          display: flex;
          gap: 1rem;
        }

        .btn-vibrant-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 0.8rem 1.75rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-vibrant-primary:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 15px 25px -5px rgba(99, 102, 241, 0.5);
        }

        .btn-vibrant-ghost {
          background: #f3f4f6;
          color: #4b5563;
          border: none;
          padding: 0.8rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-vibrant-ghost:hover {
          background: #e5e7eb;
          color: #111827;
        }

        /* Body Grid */
        .profile-body-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 4rem;
        }

        @media (max-width: 900px) {
          .profile-body-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .profile-hero-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }

        /* Left Column Content */
        .user-identity {
          margin-bottom: 2rem;
        }

        .display-name {
          font-size: 2.5rem;
          font-weight: 900;
          color: #111827;
          margin: 0 0 0.25rem 0;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .display-email {
          font-size: 1.15rem;
          color: #6b7280;
          margin: 0 0 1.5rem 0;
        }

        .user-badges {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.admin {
          background: #fef3c7;
          color: #d97706;
          box-shadow: 0 0 0 1px #fde68a inset;
        }

        .status-badge.member, .status-badge.user {
          background: #eff6ff;
          color: #2563eb;
          box-shadow: 0 0 0 1px #bfdbfe inset;
        }

        .date-badge {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Stats Bricks */
        .stats-row {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .stat-brick {
          flex: 1;
          background: #fafafa;
          border: 1px solid #f3f4f6;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-brick:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05);
          border-color: #e5e7eb;
        }

        .stat-num {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-lbl {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Edit Form Elements */
        .section-heading {
          font-size: 1.2rem;
          font-weight: 800;
          color: #111827;
          margin: 0 0 1.5rem 0;
        }

        .animated-edit-form {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .vibrant-input-group {
          margin-bottom: 1.5rem;
        }

        .vibrant-input-group label {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .optional-text {
          font-weight: 400;
          color: #9ca3af;
          margin-left: 0.5rem;
        }

        .vibrant-input-group input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          color: #111827;
          font-weight: 500;
          transition: all 0.2s;
        }

        .vibrant-input-group input:focus {
          outline: none;
          background: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        /* Skills Right Column */
        .skills-edit-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .skills-edit-grid {
            grid-template-columns: 1fr;
          }
        }

        .profile-skills-column {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .block-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .block-header .section-heading {
          margin: 0;
        }

        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-wrap svg {
          width: 24px;
          height: 24px;
          color: white;
        }

        .teach-icon {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 8px 15px -3px rgba(16, 185, 129, 0.3);
        }

        .learn-icon {
          background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
          box-shadow: 0 8px 15px -3px rgba(244, 63, 94, 0.3);
        }

        .skills-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .skill-bubble {
          padding: 0.6rem 1.2rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }

        .skill-bubble:hover {
          transform: translateY(-2px);
        }

        .bubble-teach {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .bubble-teach:hover {
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
        }

        .bubble-learn {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .bubble-learn:hover {
          box-shadow: 0 4px 10px rgba(244, 63, 94, 0.15);
        }

        .no-skills {
          color: #9ca3af;
          font-style: italic;
          background: #f9fafb;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          width: 100%;
        }

        .picker-wrapper {
          background: #fafafa;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid #f3f4f6;
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;
