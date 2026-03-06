import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.substring(1) || 'profile';

  const navItems = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'search', label: 'Discover', icon: '🔍' },
    { key: 'requests', label: 'Requests', icon: '📨' },
    { key: 'chat', label: 'Messages', icon: '💬' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ key: 'admin-dashboard', label: 'Admin', icon: '⚙️' });
  }

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="nav-modern">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/profile')}>
          <div className="nav-logo">
            <img src="/1000078980-removebg-preview.png" alt="SkillSwap Logo" className="nav-logo-image" />
          </div>
        </div>

        <div className="nav-desktop">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? 'nav-item-active' : ''}`}
              onClick={() => navigate(`/${item.key}`)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {activePage === item.key && <span className="nav-indicator" />}
            </button>
          ))}
        </div>

        <div className="nav-user">
          <div className="nav-user-info">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="nav-avatar" />
            ) : (
              <div className="nav-avatar nav-avatar-placeholder">
                {getInitials(user?.name)}
              </div>
            )}
            <span className="nav-user-name">{user?.name}</span>
          </div>






<button className="nav-logout" onClick={onLogout} title="Sign out">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
</button>

        </div>

        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="nav-mobile-menu animate-fade-in">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-mobile-item ${activePage === item.key ? 'nav-mobile-item-active' : ''}`}
              onClick={() => {
                navigate(`/${item.key}`);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-mobile-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button className="nav-mobile-item nav-mobile-logout" onClick={onLogout}>
            <span className="nav-mobile-icon">🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
