import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/design-system.css';
import './App.css';
import { setAuthToken, initializeSocket, registerSocket } from './services/api';
import useAuthStore from './store/authStore';

import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import SkillSearchPage from './pages/SkillSearchPage';
import RequestsPage from './pages/RequestsPage';
import ChatPage from './pages/ChatPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

// Auth Route Wrapper (redirects away if already logged in)
const AuthRoute = ({ children }) => {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};


function AppLayout({ children }) {
  const { token, user, logout } = useAuthStore();

  // Set auth token in API headers when token changes
  useEffect(() => {
    setAuthToken(token || null);
  }, [token]);

  // Initialize socket when user logs in
  useEffect(() => {
    if (token && user) {
      const socket = initializeSocket(token);

      if (socket) {
        const checkAndRegister = () => {
          if (socket.connected) {
            registerSocket(user._id, user.name);
          } else {
            setTimeout(checkAndRegister, 500);
          }
        };
        setTimeout(checkAndRegister, 1000);
      }
    }
  }, [token, user]);

  return (
    <div className="app-modern">
      {token && <Navigation user={user} onLogout={logout} />}

      <main className={`main-content ${token ? 'main-with-nav' : ''}`}>
        <div className="page-container animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          <AuthRoute>
            <AppLayout><LoginPage /></AppLayout>
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <AppLayout><RegisterPage /></AppLayout>
          </AuthRoute>
        } />
        <Route path="/forgot-password" element={
          <AuthRoute>
            <AppLayout><ForgotPasswordPage /></AppLayout>
          </AuthRoute>
        } />
        <Route path="/reset-password/:token" element={
          <AuthRoute>
            <AppLayout><ResetPasswordPage /></AppLayout>
          </AuthRoute>
        } />
        <Route path="/verify-email/:token" element={
          <AuthRoute>
            <AppLayout><VerifyEmailPage /></AppLayout>
          </AuthRoute>
        } />

        {/* Protected Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout><ProfilePage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <AppLayout><SkillSearchPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/requests" element={
          <ProtectedRoute>
            <AppLayout><RequestsPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <AppLayout><ChatPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout><AdminDashboardPage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Default / Fallback Route */}
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

