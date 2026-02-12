import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { setAuthToken } from './services/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import SkillSearchPage from './pages/SkillSearchPage';
import RequestsPage from './pages/RequestsPage';
import ChatPage from './pages/ChatPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [page, setPage] = useState(token ? 'profile' : 'login');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    setAuthToken(token || null);
  }, [token]);

  useEffect(() => {
    const path = window.location.pathname;
    const prefix = '/reset-password/';

    if (path.startsWith(prefix)) {
      const tokenFromPath = path.slice(prefix.length);
      if (tokenFromPath) {
        setResetToken(tokenFromPath);
        setPage('resetPassword');
      }
    }
  }, []);

  // Listen for profile updates from ProfilePage
  useEffect(() => {
    const handleUserUpdate = () => {
      const cached = localStorage.getItem('user');
      if (cached) {
        setUser(JSON.parse(cached));
      }
    };
    
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  const navItems = useMemo(() => {
    if (!token) {
      return [
        { key: 'login', label: 'Sign In', icon: '→' },
        { key: 'register', label: 'Create Account', icon: '+' }
      ];
    }

    const items = [
      { key: 'profile', label: 'My Profile', icon: '👤' },
      { key: 'search', label: 'Find Skills', icon: '🔍' },
      { key: 'requests', label: 'Swap Requests', icon: '⇄' },
      { key: 'chat', label: 'Messages', icon: '💬' }
    ];

    if (user?.role === 'admin') {
      items.push({ key: 'admin', label: 'Admin', icon: '⚙' });
    }

    return items;
  }, [token, user]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setPage('profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setPage('login');
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAuthPage = ['login', 'register', 'forgotPassword', 'resetPassword'].includes(page);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">S</div>
            <h1>Skill Swap</h1>
          </div>
          
          {token && user && (
            <div className="user-nav">
              <div className="user-info">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border)'
                    }}
                  />
                ) : (
                  <div className="user-avatar">{getUserInitials(user.name)}</div>
                )}
                <span>{user.name}</span>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {token && !isAuthPage && (
        <nav className="app-nav">
          <div className="nav-content">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.key} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${page === item.key ? 'active' : ''}`}
                    onClick={() => setPage(item.key)}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      <main className="app-main">
        <div className="page-container">
          {page === 'login' && (
            <LoginPage 
              onLogin={handleLogin} 
              onNavigate={setPage}
            />
          )}
          {page === 'register' && (
            <RegisterPage 
              onNavigate={setPage}
            />
          )}
          {page === 'forgotPassword' && (
            <ForgotPasswordPage 
              onNavigate={setPage}
            />
          )}
          {page === 'resetPassword' && (
            <ResetPasswordPage resetToken={resetToken} />
          )}
          {token && page === 'profile' && <ProfilePage user={user} />}
          {token && page === 'search' && <SkillSearchPage />}
          {token && page === 'requests' && <RequestsPage />}
          {token && page === 'chat' && <ChatPage />}
          {token && page === 'admin' && user?.role === 'admin' && <AdminDashboardPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
