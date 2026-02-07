import { useEffect, useState } from 'react';
import api from '../services/api';

function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    skillsOffered: '',
    skillsWanted: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const parseSkills = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        const user = data.user;
        setForm((prev) => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          skillsOffered: (user.skillsOffered || []).join(', '),
          skillsWanted: (user.skillsWanted || []).join(', ')
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.put('/auth/profile', {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        skillsOffered: parseSkills(form.skillsOffered),
        skillsWanted: parseSkills(form.skillsWanted)
      });
      setMessage('Profile updated successfully');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <section className="panel">
      <h2>Profile</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input
          name="password"
          placeholder="New password (optional)"
          value={form.password}
          onChange={handleChange}
          type="password"
        />
        <input
          name="skillsOffered"
          placeholder="Skills offered (comma separated)"
          value={form.skillsOffered}
          onChange={handleChange}
        />
        <input
          name="skillsWanted"
          placeholder="Skills wanted (comma separated)"
          value={form.skillsWanted}
          onChange={handleChange}
        />
        <button type="submit">Update Profile</button>
      </form>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default ProfilePage;
