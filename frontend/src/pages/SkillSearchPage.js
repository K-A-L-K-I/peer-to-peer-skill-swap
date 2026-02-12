import { useState } from 'react';
import api from '../services/api';

function SkillSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const { data } = await api.get(`/users/search?keyword=${encodeURIComponent(keyword)}`);
      setUsers(data.users || []);
    } catch (err) {
      setUsers([]);
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Find Skills</h1>
        <p className="page-subtitle">Search for students by skill to start swapping</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search for a skill (e.g., 'Python', 'Guitar', 'Spanish')"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || !keyword.trim()}
              >
                {loading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span>
          {error}
        </div>
      )}

      {searched && !loading && users.length === 0 && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No students found</h3>
            <p>Try searching with a different skill keyword</p>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="list-grid">
          {users.map((user) => (
            <div key={user._id} className="card">
              <div className="card-body">
                <div className="user-card">
                  <div className="user-card-header">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div className="user-card-avatar">{getInitials(user.name)}</div>
                    )}
                    <div className="user-card-info">
                      <h4>{user.name}</h4>
                      <p>{user.email}</p>
                    </div>
                  </div>

                  <div className="user-card-body">
                    {user.skillsOffered && user.skillsOffered.length > 0 && (
                      <div className="user-card-section">
                        <span className="user-card-label">Can Teach</span>
                        <div className="skill-tags">
                          {user.skillsOffered.map((skill, idx) => (
                            <span key={idx} className="skill-tag skill-tag-offered">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.skillsWanted && user.skillsWanted.length > 0 && (
                      <div className="user-card-section">
                        <span className="user-card-label">Wants to Learn</span>
                        <div className="skill-tags">
                          {user.skillsWanted.map((skill, idx) => (
                            <span key={idx} className="skill-tag skill-tag-wanted">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    alert(`To request a swap with ${user.name}, go to the Requests page and use their ID: ${user._id}`);
                  }}
                >
                  Request Swap
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillSearchPage;
