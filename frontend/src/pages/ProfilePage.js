// src/pages/ProfilePage.js
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MapPin, Globe, Github, Linkedin, Star, CheckCircle2,
  Calendar, Zap, BookOpen, GraduationCap, Trophy, Camera, Edit3,
  Clock, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import SkillPicker from '../components/SkillPicker';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseSkills = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
};

const stringifySkills = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

const StarRow = ({ rating, size = 18 }) =>
  [1, 2, 3, 4, 5].map(s => (
    <Star key={s} size={size}
      fill={s <= Math.round(rating) ? '#f59e0b' : 'none'}
      color={s <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
      strokeWidth={1.5} />
  ));

// Profile completion percentage
const computeCompletion = (u) => {
  if (!u) return 0;
  const fields = [
    u.name, u.bio, u.location, u.profilePicture,
    u.skillsOffered?.length, u.skillsWanted?.length,
    u.socialLinks?.github || u.socialLinks?.linkedin || u.socialLinks?.portfolio
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

// Achievement badges based on data
const getBadges = (u, reviews) => {
  const badges = [];
  if (reviews?.totalReviews >= 1) badges.push({ icon: <Trophy size={13} />, label: 'Reviewed', color: '#f59e0b', bg: '#fef9c3' });
  if (reviews?.averageRating >= 4.5) badges.push({ icon: <Star size={13} fill="#a855f7" color="#a855f7" />, label: '5-Star Rated', color: '#a855f7', bg: '#f5f3ff' });
  if ((u?.skillsOffered?.length || 0) >= 3) badges.push({ icon: <GraduationCap size={13} />, label: 'Top Teacher', color: '#10b981', bg: '#d1fae5' });
  if (u?.availableForSwap) badges.push({ icon: <Zap size={13} />, label: 'Available', color: '#3b82f6', bg: '#dbeafe' });
  return badges;
};

// ─── Main Component ────────────────────────────────────────────────────────────
function ProfilePage() {
  const { updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    bio: '', location: '', timezone: '',
    availableForSwap: true,
    skillsOffered: '', skillsWanted: '',
    profilePicture: null, coverImage: null,
    socialLinks: { github: '', linkedin: '', portfolio: '' }
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('skills');
  const [reviewsData, setReviewsData] = useState({ totalReviews: 0, averageRating: 0, reviews: [] });
  const [reviewsLoading, setReviewsLoading] = useState(false);

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
        bio: user.bio || '',
        location: user.location || '',
        timezone: user.timezone || '',
        availableForSwap: user.availableForSwap ?? true,
        skillsOffered: stringifySkills(user.skillsOffered),
        skillsWanted: stringifySkills(user.skillsWanted),
        profilePicture: user.profilePicture || null,
        coverImage: user.coverImage || null,
        socialLinks: user.socialLinks || { github: '', linkedin: '', portfolio: '' }
      });
      setPreviewImage(user.profilePicture);
      setPreviewCover(user.coverImage);

      try {
        setReviewsLoading(true);
        const r = await api.get(`/reviews/user/${user._id}`);
        setReviewsData(r.data);
      } catch (_) { }
      finally { setReviewsLoading(false); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleImageFile = (e, isCover) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select a valid image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image size must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result;
      if (isCover) { setPreviewCover(b64); setForm(p => ({ ...p, coverImage: b64 })); }
      else { setPreviewImage(b64); setForm(p => ({ ...p, profilePicture: b64 })); }
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('social_')) {
      const key = name.replace('social_', '');
      setForm(p => ({ ...p, socialLinks: { ...p.socialLinks, [key]: value } }));
    } else {
      setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(''); setError('');
    try {
      const { data } = await api.put('/auth/profile', {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        bio: form.bio,
        location: form.location,
        timezone: form.timezone,
        availableForSwap: form.availableForSwap,
        skillsOffered: parseSkills(form.skillsOffered),
        skillsWanted: parseSkills(form.skillsWanted),
        profilePicture: form.profilePicture,
        coverImage: form.coverImage,
        socialLinks: form.socialLinks
      });
      setMessage('Profile updated!');
      setForm(p => ({ ...p, password: '' }));
      setUserData(data.user);
      updateUser(data.user);
      setTimeout(() => { setIsEditing(false); setMessage(''); }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setForm({
        name: userData.name || '', email: userData.email || '', password: '',
        bio: userData.bio || '', location: userData.location || '',
        timezone: userData.timezone || '',
        availableForSwap: userData.availableForSwap ?? true,
        skillsOffered: stringifySkills(userData.skillsOffered),
        skillsWanted: stringifySkills(userData.skillsWanted),
        profilePicture: userData.profilePicture || null,
        coverImage: userData.coverImage || null,
        socialLinks: userData.socialLinks || { github: '', linkedin: '', portfolio: '' }
      });
      setPreviewImage(userData.profilePicture);
      setPreviewCover(userData.coverImage);
    }
    setIsEditing(false); setError(''); setMessage('');
  };

  const getInitials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (fetchLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: '#6b7280' }}>Loading your profile…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!userData) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
        <AlertTriangle size={32} />
      </div>
      Failed to load profile. Please refresh.
    </div>
  );

  const completion = computeCompletion(userData);
  const badges = getBadges(userData, reviewsData);

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', paddingBottom: '6rem', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Toasts */}
      {error && <div style={{ ...toastBase, background: '#fee2e2', color: '#991b1b', borderLeft: '4px solid #ef4444' }}>{error}</div>}
      {message && <div style={{ ...toastBase, background: '#dcfce7', color: '#166534', borderLeft: '4px solid #22c55e' }}>{message}</div>}

      {/* ── Cover Banner ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 220, background: previewCover ? `url(${previewCover}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100)', overflow: 'hidden' }}>
        {/* Overlay for no-cover case */}
        {!previewCover && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />
        )}
        {/* Cover upload button (edit mode) */}
        {isEditing && (
          <button
            onClick={() => coverInputRef.current?.click()}
            style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', color: '#374151', backdropFilter: 'blur(8px)' }}
          >
            <Camera size={14} /> Change Cover
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFile(e, true)} />
      </div>

      {/* ── Main Card ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0 0 24px 24px', boxShadow: '0 20px 50px -10px rgba(17,24,39,0.1)', padding: '0 2.5rem 2.5rem' }}>

          {/* Avatar row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -60, paddingBottom: '1.75rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem' }}>
              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 120, height: 120, borderRadius: '50%',
                    border: '5px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                    background: previewImage ? `url(${previewImage}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.2rem', fontWeight: 800, color: 'white', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {!previewImage && getInitials(userData.name)}
                  {isEditing && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <Edit3 size={24} color="white" />
                    </div>
                  )}
                </div>
                {/* Availability dot */}
                {!isEditing && (
                  <span style={{
                    position: 'absolute', bottom: 4, right: 4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: userData.availableForSwap ? '#10b981' : '#9ca3af',
                    border: '2.5px solid white'
                  }} title={userData.availableForSwap ? 'Available for swaps' : 'Not available'} />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFile(e, false)} />

              {/* Name + quick meta under avatar */}
              {!isEditing && (
                <div style={{ paddingBottom: '0.5rem' }}>
                  <h1 style={{ margin: '0 0 0.2rem', fontSize: '1.85rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }}>
                    {userData.name}
                  </h1>
                  <p style={{ margin: '0 0 0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>{userData.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ ...pill, background: userData.role === 'admin' ? '#fef9c3' : '#eff6ff', color: userData.role === 'admin' ? '#d97706' : '#2563eb', border: `1px solid ${userData.role === 'admin' ? '#fde68a' : '#bfdbfe'}` }}>
                      {userData.role === 'admin' ? (
                        <><Star size={12} fill="currentColor" style={{ marginRight: 4, verticalAlign: 'middle' }} /> Admin</>
                      ) : (
                        <><CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Member</>
                      )}
                    </span>
                    <span style={{ ...pill, background: '#f3f4f6', color: '#6b7280' }}>
                      <Calendar size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      Joined {formatDate(userData.createdAt)}
                    </span>
                    {userData.location && (
                      <span style={{ ...pill, background: '#f3f4f6', color: '#6b7280' }}>
                        <MapPin size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {userData.location}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Edit / Save buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingBottom: '0.5rem' }}>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} style={btnPrimary}>
                  <Edit3 size={15} style={{ marginRight: 6 }} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── Body Grid ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '3rem', paddingTop: '2rem' }}>

            {/* Left Column */}
            <div>
              {isEditing ? (
                /* ── Edit Form ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '8rem' }}>

                  {/* CARD 1: Essential Info */}
                  <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <SectionTitle style={{ color: '#f8fafc' }}>Essential Info</SectionTitle>
                    <InputGroup label="Full Name"><input name="name" value={form.name} onChange={handleChange} style={inputStyle} /></InputGroup>
                    <InputGroup label="Bio (max 300 chars)">
                      <textarea name="bio" value={form.bio} onChange={handleChange} maxLength={300} rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell people about yourself…" />
                    </InputGroup>
                    <InputGroup label="Location">
                      <input name="location" value={form.location} onChange={handleChange} style={inputStyle} placeholder="e.g. Bangalore, India" />
                    </InputGroup>
                  </div>

                  {/* CARD 2: Social Links */}
                  <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <SectionTitle style={{ color: '#f8fafc' }}>Social & Links</SectionTitle>
                    <InputGroup label={<><Github size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />GitHub (Optional)</>}>
                      <input name="social_github" value={form.socialLinks?.github || ''} onChange={handleChange} style={inputStyle} placeholder="github.com/username" />
                    </InputGroup>
                    <InputGroup label={<><Linkedin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />LinkedIn (Optional)</>}>
                      <input name="social_linkedin" value={form.socialLinks?.linkedin || ''} onChange={handleChange} style={inputStyle} placeholder="linkedin.com/in/username" />
                    </InputGroup>
                    <InputGroup label={<><Globe size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Portfolio/Website (Optional)</>}>
                      <input name="social_portfolio" value={form.socialLinks?.portfolio || ''} onChange={handleChange} style={inputStyle} placeholder="yourwebsite.com" />
                    </InputGroup>
                  </div>

                  {/* CARD 3: Security & Preferences */}
                  <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <SectionTitle style={{ color: '#f8fafc' }}>Security & Preferences</SectionTitle>
                    <InputGroup label="Email Address"><input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} /></InputGroup>
                    <InputGroup label={<>Reset Password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></>}>
                      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" style={inputStyle} />
                    </InputGroup>
                    <InputGroup label="Timezone">
                      <input name="timezone" value={form.timezone} onChange={handleChange} style={inputStyle} placeholder="e.g. IST (UTC+5:30)" />
                    </InputGroup>

                    <div style={{ marginTop: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '1rem', borderRadius: '12px', border: '1px solid #334155', background: form.availableForSwap ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)' }}>
                        <div
                          onClick={() => setForm(p => ({ ...p, availableForSwap: !p.availableForSwap }))}
                          style={{
                            width: 42, height: 24, borderRadius: '9999px', cursor: 'pointer',
                            background: form.availableForSwap ? '#10b981' : '#475569',
                            transition: 'background 0.2s', position: 'relative', flexShrink: 0
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3, left: form.availableForSwap ? 21 : 3,
                            width: 18, height: 18, borderRadius: '50%', background: 'white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s'
                          }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: form.availableForSwap ? '#34d399' : '#94a3b8' }}>
                          {form.availableForSwap ? 'Available for swaps' : 'Not available right now'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── View mode left column ── */
                <div>
                  {/* Bio */}
                  {userData.bio && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, fontSize: '0.95rem' }}>{userData.bio}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.75rem' }}>
                    {[
                      { n: userData.skillsOffered?.length || 0, l: 'Teaching', icon: <GraduationCap size={18} color="#10b981" />, color: '#10b981' },
                      { n: userData.skillsWanted?.length || 0, l: 'Learning', icon: <BookOpen size={18} color="#f43f5e" />, color: '#f43f5e' },
                      { n: reviewsData.totalReviews, l: 'Reviews', icon: <Star size={18} color="#f59e0b" fill="#f59e0b" />, color: '#f59e0b' },
                      { n: reviewsData.averageRating.toFixed(1), l: 'Avg Rating', icon: <Trophy size={18} color="#8b5cf6" />, color: '#8b5cf6' }
                    ].map(s => (
                      <div key={s.l} style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ marginBottom: '0.3rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.n}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Availability */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.65rem 1rem', borderRadius: '10px', background: userData.availableForSwap ? '#f0fdf4' : '#f9fafb', border: `1px solid ${userData.availableForSwap ? '#bbf7d0' : '#e5e7eb'}`, marginBottom: '1.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: userData.availableForSwap ? '#10b981' : '#9ca3af', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: userData.availableForSwap ? '#059669' : '#6b7280' }}>
                      {userData.availableForSwap ? 'Available for swaps' : 'Not available right now'}
                    </span>
                  </div>

                  {/* Timezone */}
                  {userData.timezone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <Clock size={16} /> <span>{userData.timezone}</span>
                    </div>
                  )}

                  {/* Social Links */}
                  {(userData.socialLinks?.github || userData.socialLinks?.linkedin || userData.socialLinks?.portfolio) && (
                    <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
                      {userData.socialLinks.github && (
                        <a href={`https://${userData.socialLinks.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={socialLink}>
                          <Github size={14} /> GitHub
                        </a>
                      )}
                      {userData.socialLinks.linkedin && (
                        <a href={`https://${userData.socialLinks.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ ...socialLink, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          <Linkedin size={14} /> LinkedIn
                        </a>
                      )}
                      {userData.socialLinks.portfolio && (
                        <a href={`https://${userData.socialLinks.portfolio.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ ...socialLink, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #c4b5fd' }}>
                          <Globe size={14} /> Portfolio
                        </a>
                      )}
                    </div>
                  )}

                  {/* Achievement Badges */}
                  {badges.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 0.625rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Achievements</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {badges.map((b, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', background: b.bg, color: b.color, fontSize: '0.77rem', fontWeight: 700 }}>
                            {b.icon} {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Profile completion */}
                  <div style={{ marginTop: '1.75rem', padding: '1rem', background: '#f9fafb', borderRadius: '14px', border: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Profile Completion</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: completion >= 80 ? '#10b981' : '#f59e0b' }}>{completion}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: '9999px', background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '9999px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        width: `${completion}%`,
                        background: completion >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : completion >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                      }} />
                    </div>
                    {completion < 100 && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {completion < 50 ? 'Add a bio and social links to stand out!' : completion < 80 ? 'Almost there — add a profile photo!' : 'Great profile! Just a few fields left.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column — Skills & Reviews */}
            <div>
              {/* Tabs */}
              {!isEditing && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                  {[['skills', 'Skills Set'], ['reviews', `Reviews (${reviewsData.totalReviews})`]].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                      background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                      fontSize: '1rem', fontWeight: 700, marginBottom: '-9px',
                      color: activeTab === key ? '#6366f1' : '#9ca3af',
                      borderBottom: activeTab === key ? '3px solid #6366f1' : '3px solid transparent',
                      transition: 'color 0.2s'
                    }}>{label}</button>
                  ))}
                </div>
              )}

              {/* Skills Tab */}
              {(activeTab === 'skills' || isEditing) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Teach block */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '11px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 12px rgba(16,185,129,0.25)' }}>
                        <GraduationCap size={20} color="white" />
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>Skills I Can Teach</h3>
                    </div>
                    {isEditing ? (
                      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '1.5rem', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <SkillPicker selectedSkills={parseSkills(form.skillsOffered)} onChange={s => setForm(p => ({ ...p, skillsOffered: s.join(', ') }))} mode="offer" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                        {(userData.skillsOffered?.length > 0) ? userData.skillsOffered.map((s, i) => (
                          <span key={i} style={{ padding: '0.45rem 1rem', borderRadius: '9999px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600, fontSize: '0.9rem' }}>{s}</span>
                        )) : <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No skills added yet.</p>}
                      </div>
                    )}
                  </div>

                  {/* Learn block */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '11px', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 12px rgba(244,63,94,0.25)' }}>
                        <BookOpen size={20} color="white" />
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>Skills I Want to Learn</h3>
                    </div>
                    {isEditing ? (
                      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '1.5rem', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <SkillPicker selectedSkills={parseSkills(form.skillsWanted)} onChange={s => setForm(p => ({ ...p, skillsWanted: s.join(', ') }))} mode="want" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                        {(userData.skillsWanted?.length > 0) ? userData.skillsWanted.map((s, i) => (
                          <span key={i} style={{ padding: '0.45rem 1rem', borderRadius: '9999px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontWeight: 600, fontSize: '0.9rem' }}>{s}</span>
                        )) : <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No skills requested yet.</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && !isEditing && (
                <div>
                  {/* Rating summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: '#fafafa', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                      {reviewsData.averageRating.toFixed(1)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '0.25rem' }}>
                        <StarRow rating={reviewsData.averageRating} size={20} />
                      </div>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                        Based on {reviewsData.totalReviews} review{reviewsData.totalReviews !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {reviewsLoading ? <p style={{ color: '#9ca3af' }}>Loading reviews…</p>
                    : reviewsData.reviews.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reviewsData.reviews.map(r => (
                          <div key={r._id} style={{ padding: '1.25rem', background: 'white', border: '1px solid #f3f4f6', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: '#111827' }}>{r.reviewer?.name || 'Anonymous'}</span>
                              <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{formatDate(r.createdAt)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '2px', marginBottom: '0.625rem' }}>
                              <StarRow rating={r.rating} size={15} />
                            </div>
                            {r.comment && <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic' }}>"{r.comment}"</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>No reviews received yet.</p>
                    )
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>      {isEditing && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid #334155',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 50,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button onClick={handleCancel} disabled={loading} style={{ ...btnGhost, background: 'transparent', color: '#94a3b8', border: '1px solid #334155' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading} style={{ ...btnPrimary, padding: '0.75rem 2.5rem', fontSize: '1rem' }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )
      }

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div >
  );
}

// ─── Small Inline Components ───────────────────────────────────────────────────
const SectionTitle = ({ children, style }) => (
  <h3 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', ...style }}>
    {children}
  </h3>
);

const InputGroup = ({ label, children }) => (
  <div style={{ marginBottom: '1.1rem' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>{label}</label>
    {children}
  </div>
);

// ─── Shared Styles ─────────────────────────────────────────────────────────────
const toastBase = { position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.12)', animation: 'slideDown 0.3s ease' };

const pill = { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600 };

const inputStyle = { width: '100%', padding: '0.7rem 0.875rem', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.9rem', color: '#111827', fontWeight: 500, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' };

const btnPrimary = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 8px 20px rgba(99,102,241,0.35)', transition: 'all 0.2s' };

const btnGhost = { background: '#f3f4f6', color: '#4b5563', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' };

const socialLink = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '9999px', background: '#f4f4f5', color: '#374151', border: '1px solid #e4e4e7', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' };

export default ProfilePage;
