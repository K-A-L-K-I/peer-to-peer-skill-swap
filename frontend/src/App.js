import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { setAuthToken } from './services/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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

  useEffect(() => {
    setAuthToken(token || null);
  }, [token]);

  const menu = useMemo(() => {
    if (!token) {
      return [
        { key: 'login', label: 'Login' },
        { key: 'register', label: 'Register' }
      ];
    }

    const list = [
      { key: 'profile', label: 'Profile' },
      { key: 'search', label: 'Skill Search' },
      { key: 'requests', label: 'Requests' },
      { key: 'chat', label: 'Chat' }
    ];

    if (user?.role === 'admin') {
      list.push({ key: 'admin', label: 'Admin Dashboard' });
    }

    return list;
  }, [token, user]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Skill Swap Frontend</h1>
        {token && (
          <div className="user-area">
            <span>{user?.name || user?.email}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>

      <nav className="tabs">
        {menu.map((item) => (
          <button
            key={item.key}
            type="button"
            className={page === item.key ? 'tab active' : 'tab'}
            onClick={() => setPage(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="content">
        {page === 'login' && <LoginPage onLogin={handleLogin} />}
        {page === 'register' && <RegisterPage />}
        {token && page === 'profile' && <ProfilePage />}
        {token && page === 'search' && <SkillSearchPage />}
        {token && page === 'requests' && <RequestsPage />}
        {token && page === 'chat' && <ChatPage />}
        {token && page === 'admin' && user?.role === 'admin' && <AdminDashboardPage />}
      </div>
    </main>
  );
}

export default App;
