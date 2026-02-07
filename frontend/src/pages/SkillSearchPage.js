import { useState } from 'react';
import api from '../services/api';

function SkillSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.get(`/users/search?keyword=${encodeURIComponent(keyword)}`);
      setUsers(data.users || []);
    } catch (err) {
      setUsers([]);
      setError(err.response?.data?.message || 'Search failed');
    }
  };

  return (
    <section className="panel">
      <h2>Skill Search</h2>
      <form onSubmit={handleSearch} className="inline-form">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by skill keyword"
          required
        />
        <button type="submit">Search</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="list-wrap">
        {users.map((user) => (
          <article key={user._id} className="card">
            <h4>{user.name}</h4>
            <p>{user.email}</p>
            <p><strong>Offers:</strong> {(user.skillsOffered || []).join(', ') || 'N/A'}</p>
            <p><strong>Wants:</strong> {(user.skillsWanted || []).join(', ') || 'N/A'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SkillSearchPage;
