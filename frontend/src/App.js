import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './styles/design-system.css';
import './App.css';
import { setAuthToken, initializeSocket, registerSocket, socketService } from './services/api';
import useAuthStore from './store/authStore';
import { ToastProvider } from './context/ToastContext';

import Sidebar from './components/Sidebar';
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

// ─── Global Incoming Call Popup ───────────────────────────────────────────────
const GlobalIncomingCallPopup = ({ callData, onAccept, onReject }) => {
  if (!callData) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      minWidth: '300px',
      maxWidth: '380px',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      borderLeft: '4px solid #667eea'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(102,126,234,0.5); }
          70%  { transform: scale(1.06); box-shadow: 0 0 0 14px rgba(102,126,234,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(102,126,234,0); }
        }
      `}</style>

      {/* Avatar with ring animation */}
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.5rem',
        fontWeight: 700,
        flexShrink: 0,
        animation: 'ringPulse 2s ease-in-out infinite'
      }}>
        {callData.callerName?.charAt(0).toUpperCase() || '?'}
      </div>

      {/* Call info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {callData.callerName}
        </h4>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          Incoming {callData.callType === 'audio' ? 'Voice' : 'Video'} Call...
        </p>
      </div>

      {/* Reject button */}
      <button
        onClick={onReject}
        title="Reject"
        style={{
          width: '44px', height: '44px', borderRadius: '50%', border: 'none',
          background: '#fee2e2', color: '#ef4444', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {/* Hang-up icon */}
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
          <line x1="23" y1="1" x2="1" y2="23" />
        </svg>
      </button>

      {/* Accept button */}
      <button
        onClick={onAccept}
        title="Accept"
        style={{
          width: '44px', height: '44px', borderRadius: '50%', border: 'none',
          background: '#dcfce7', color: '#22c55e', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {/* Answer icon */}
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>
    </div>
  );
};


function AppLayout({ children }) {
  const { token, user, logout } = useAuthStore();
  const setOnlineUsers = useAuthStore(state => state.setOnlineUsers);
  const addOnlineUser = useAuthStore(state => state.addOnlineUser);
  const removeOnlineUser = useAuthStore(state => state.removeOnlineUser);
  const navigate = useNavigate();

  const [incomingCallData, setIncomingCallData] = useState(null);

  // Set auth token in API headers when token changes
  useEffect(() => {
    setAuthToken(token || null);
  }, [token]);

  // Initialize socket when user logs in
  useEffect(() => {
    if (token && user) {
      initializeSocket(token);

      const checkAndRegister = () => {
        if (socketService.isConnected()) {
          registerSocket(user._id, user.name);
          socketService.emit('get-online-users'); // request initial presence
        } else {
          setTimeout(checkAndRegister, 500);
        }
      };
      setTimeout(checkAndRegister, 1000);

      const unsubOnlineList = socketService.on('online-users-list', (userIds) => setOnlineUsers(userIds.map(id => String(id))));
      const unsubUserOnline = socketService.on('user-online', ({ userId }) => addOnlineUser(userId));
      const unsubUserOffline = socketService.on('user-offline', (userId) => removeOnlineUser(userId));

      // ── Global incoming call listener ──────────────────────────────
      const unsubIncomingCall = socketService.on('incoming-call', (data) => {
        console.log('🌐 [AppLayout] Global incoming call:', data);
        setIncomingCallData(data);
      });

      // Auto-dismiss if caller cancels
      const unsubCallCancelled = socketService.on('call-cancelled', (data) => {
        setIncomingCallData(prev =>
          prev && prev.callId === data.callId ? null : prev
        );
      });

      // Setup a re-fetch interval just in case
      const intervalId = setInterval(() => {
        if (socketService.isConnected()) socketService.emit('get-online-users');
      }, 30000);

      return () => {
        unsubOnlineList();
        unsubUserOnline();
        unsubUserOffline();
        unsubIncomingCall();
        unsubCallCancelled();
        clearInterval(intervalId);
      };
    }
  }, [token, user, setOnlineUsers, addOnlineUser, removeOnlineUser]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCallData) return;
    const callSnapshot = incomingCallData;
    setIncomingCallData(null);

    // Explicitly end any existing WebRTC calls to free up camera/mic before answering the new one
    import('./services/webrtcService').then(module => {
      module.default.endCall();
    }).catch(err => console.error(err));

    // Navigate to chat and pass the incoming call data so ChatPage auto-opens VideoCall
    navigate('/chat', { state: { incomingCall: callSnapshot } });
  }, [incomingCallData, navigate]);

  const handleRejectCall = useCallback(() => {
    if (!incomingCallData) return;
    socketService.emit('reject-call', { callId: incomingCallData.callId, reason: 'rejected' });
    setIncomingCallData(null);
  }, [incomingCallData]);

  return (
    <div className="app-modern layout-sidebar">
      {token && <Sidebar user={user} onLogout={logout} />}

      <main className={`main-content ${token ? 'main-with-sidebar' : ''}`}>
        <div className="page-container animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* ── Global Incoming Call Popup (works on any page) ── */}
      {token && (
        <GlobalIncomingCallPopup
          callData={incomingCallData}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
}

function App() {
  const { token } = useAuthStore();

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
        <Route path="*" element={
          token ? <Navigate to="/profile" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

const AppWrapper = () => (
  <ToastProvider>
    <App />
  </ToastProvider>
);

export default AppWrapper;
