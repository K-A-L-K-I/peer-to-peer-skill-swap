import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socketService';
import NotificationDropdown from './NotificationDropdown';
import {
  User,
  Compass,
  Inbox,
  MessageSquare,
  Settings,
  Bell,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import './Navigation.css';

const Navigation = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.substring(1) || 'profile';

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications');
        const count = data.notifications.filter(n => !n.isRead).length;
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to fetch notifications for badge:', err);
      }
    };
    fetchUnread();

    const unsubNotification = socketService.on('new-notification', () => {
      setUnreadCount(prev => prev + 1);
    });

    return () => unsubNotification();
  }, [user]);

  const navItems = [
    { key: 'profile', label: 'Profile', icon: <User size={20} /> },
    { key: 'search', label: 'Discover', icon: <Compass size={20} /> },
    { key: 'requests', label: 'Requests', icon: <Inbox size={20} /> },
    { key: 'chat', label: 'Messages', icon: <MessageSquare size={20} /> },
  ];

  if (user?.role === 'admin') {
    navItems.push({ key: 'admin-dashboard', label: 'Admin', icon: <Settings size={20} /> });
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
          <div style={{ position: 'relative', marginRight: '16px', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem',
                padding: '8px', borderRadius: '50%', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <Bell size={24} />
            </button>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '4px', right: '4px', background: '#ef4444',
                color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px',
                borderRadius: '99px', border: '2px solid white'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {showNotifications && (
              <NotificationDropdown
                onClose={() => {
                  setShowNotifications(false);
                  // Quick refresh of count after dropdown closes (it might have marked some as read)
                  api.get('/notifications').then(res => {
                    setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
                  }).catch(() => { });
                }}
              />
            )}
          </div>

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
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
            <span className="nav-mobile-icon"><LogOut size={20} /></span>
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
