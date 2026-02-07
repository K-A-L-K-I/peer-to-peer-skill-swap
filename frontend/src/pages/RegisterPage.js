import { useState } from 'react';
import api from '../services/api';

function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    skillsOffered: '',
    skillsWanted: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const parseSkills = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/auth/register', {
        ...form,
        skillsOffered: parseSkills(form.skillsOffered),
        skillsWanted: parseSkills(form.skillsWanted)
      });
      setMessage('Registration successful. You can login now.');
      setForm({
        name: '',
        email: '',
        password: '',
        skillsOffered: '',
        skillsWanted: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <section className="panel">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          type="email"
          required
        />
        <input
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          type="password"
          required
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
        <button type="submit">Register</button>
      </form>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default RegisterPage;
