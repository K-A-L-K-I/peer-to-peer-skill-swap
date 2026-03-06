// src/pages/RequestsPage.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

// Animated counter hook
const useAnimatedNumber = (target, duration = 600) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return value;
};

// Skill badge component
const SkillBadge = ({ skill, type, size = 'md' }) => {
  const colors = type === 'offer'
    ? { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
    : { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' };

  const sizes = {
    sm: { padding: '4px 10px', fontSize: '0.75rem' },
    md: { padding: '6px 14px', fontSize: '0.875rem' },
    lg: { padding: '8px 16px', fontSize: '1rem' }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: '9999px',
      fontWeight: 600,
      ...sizes[size]
    }}>
      {type === 'offer' ? '📤' : '📥'} {skill}
    </span>
  );
};

// Status badge with animation
const StatusBadge = ({ status }) => {
  const configs = {
    pending: { color: '#f59e0b', bg: '#fffbeb', icon: '⏳', label: 'Pending' },
    accepted: { color: '#10b981', bg: '#ecfdf5', icon: '✅', label: 'Accepted' },
    rejected: { color: '#ef4444', bg: '#fef2f2', icon: '❌', label: 'Declined' },
    completed: { color: '#8b5cf6', bg: '#f5f3ff', icon: '🎉', label: 'Completed' }
  };

  const config = configs[status] || configs.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '9999px',
      background: config.bg,
      color: config.color,
      fontSize: '0.875rem',
      fontWeight: 600,
      border: `1px solid ${config.color}20`,
      animation: 'slideIn 0.3s ease'
    }}>
      <span style={{ fontSize: '1rem' }}>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Empty state illustration
const EmptyState = ({ icon, title, subtitle, action }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    animation: 'fadeInUp 0.5s ease'
  }}>
    <div style={{
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '3rem',
      marginBottom: '1.5rem',
      boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem 0' }}>
      {title}
    </h3>
    <p style={{ color: '#6b7280', margin: '0 0 1.5rem 0', maxWidth: '300px' }}>
      {subtitle}
    </p>
    {action}
  </div>
);

// Request card component
const RequestCard = ({ request, type, onAction, actionLoading }) => {
  const isReceived = type === 'received';
  const otherUser = isReceived ? request.fromUser : request.toUser;
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (request.status === 'accepted') {
      navigate('/chat', { state: { swapRequestId: request._id } });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'white',
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        border: '1px solid #f3f4f6',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: request.status === 'accepted' ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideIn 0.4s ease backwards'
      }}
      onMouseEnter={(e) => {
        if (request.status === 'accepted') {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
      }}
    >
      {/* Status indicator line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: request.status === 'pending' ? '#f59e0b' :
          request.status === 'accepted' ? '#10b981' :
            request.status === 'rejected' ? '#ef4444' : '#8b5cf6'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: otherUser?.profilePicture
              ? `url(${otherUser.profilePicture}) center/cover`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            {!otherUser?.profilePicture && (otherUser?.name?.charAt(0) || '?')}
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
              {otherUser?.name || 'Unknown User'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              {isReceived ? 'Wants to swap with you' : 'Request sent'}
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Skill Exchange Visualization */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isReceived ? 'They offer' : 'You offer'}
            </span>
            <SkillBadge skill={request.offeredSkill} type="offer" />
          </div>

          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'white',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            ⇄
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isReceived ? 'They want' : 'You want'}
            </span>
            <SkillBadge skill={request.wantedSkill} type="want" />
          </div>
        </div>

        {request.message && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'white',
            borderRadius: '12px',
            borderLeft: '3px solid #667eea',
            fontSize: '0.875rem',
            color: '#4b5563',
            fontStyle: 'italic'
          }}>
            "{request.message}"
          </div>
        )}
      </div>

      {/* Actions */}
      {request.status === 'pending' && isReceived && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('accept', request._id); }}
            disabled={actionLoading[request._id]}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!actionLoading[request._id]) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
            }}
          >
            {actionLoading[request._id] ? (
              <span style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : '✅ Accept'}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onAction('reject', request._id); }}
            disabled={actionLoading[request._id]}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: '2px solid #ef4444',
              background: 'white',
              color: '#ef4444',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!actionLoading[request._id]) {
                e.target.style.background = '#fef2f2';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {actionLoading[request._id] ? (
              <span style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(239,68,68,0.3)',
                borderTopColor: '#ef4444',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : '❌ Decline'}
          </button>
        </div>
      )}

      {request.status === 'accepted' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          background: '#ecfdf5',
          borderRadius: '12px',
          color: '#059669',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          💬 Click to open chat
        </div>
      )}
    </div>
  );
};

// Main component
function RequestsPage() {
  const navigate = useNavigate();
  const location = useLocation();


  // State
  const [view, setView] = useState('list'); // 'list' | 'send'
  const [userSkills, setUserSkills] = useState({ offered: [], wanted: [] });
  const [sendForm, setSendForm] = useState({
    toUser: '',
    offeredSkill: '',
    wantedSkill: '',
    message: ''
  });
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Animated stats
  const pendingCount = useAnimatedNumber(
    requests.received.filter(r => r.status === 'pending').length
  );
  const totalActive = useAnimatedNumber(
    [...requests.received, ...requests.sent].filter(r => r.status === 'accepted').length
  );

  // Load user skills
  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile');
      const offered = data.user.skillsOffered?.map(s => ({ value: s.toLowerCase(), label: s })) || [];
      const wanted = data.user.skillsWanted?.map(s => ({ value: s.toLowerCase(), label: s })) || [];
      setUserSkills({ offered, wanted });
      setSendForm(prev => ({
        ...prev,
        offeredSkill: offered[0]?.value || '',
        wantedSkill: wanted[0]?.value || ''
      }));
      setProfileLoaded(true);
    } catch (err) {
      setError('Please complete your profile skills first');
    }
  }, []);

  // Load requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/swap-requests/my-requests');
      setRequests({
        received: data.received || [],
        sent: data.sent || []
      });
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadRequests();

    // Check for prefill from search page
    const prefill = location.state?.prefill || JSON.parse(localStorage.getItem('swapRequestPrefill') || 'null');
    if (prefill) {
      setSendForm(prev => ({ ...prev, toUser: prefill.toUser || '' }));
      setView('send');
      localStorage.removeItem('swapRequestPrefill');
    }
  }, [loadProfile, loadRequests, location.state]);

  // Send request
  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const offeredLabel = userSkills.offered.find(s => s.value === sendForm.offeredSkill)?.label;
    const wantedLabel = userSkills.wanted.find(s => s.value === sendForm.wantedSkill)?.label;

    setActionLoading({ send: true });
    try {
      await api.post('/swap-requests', {
        toUser: sendForm.toUser,
        offeredSkill: offeredLabel,
        wantedSkill: wantedLabel,
        message: sendForm.message
      });
      setSuccess('Request sent successfully! 🎉');
      setSendForm(prev => ({ ...prev, toUser: '', message: '' }));
      loadRequests();
      setTimeout(() => setView('list'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading({ send: false });
    }
  };

  // Handle accept/reject
  const handleAction = async (action, id) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/swap-requests/${id}/${action}`);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Filter and sort requests
  const sortedRequests = useMemo(() => {
    const all = [
      ...requests.received.map(r => ({ ...r, type: 'received' })),
      ...requests.sent.map(r => ({ ...r, type: 'sent' }))
    ];
    return all.sort((a, b) => {
      // Pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      // Then by date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [requests]);

  const canSend = userSkills.offered.length > 0 && userSkills.wanted.length > 0;

  if (!profileLoaded && !error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>Loading your skills...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1f2937', margin: '0 0 0.5rem 0' }}>
            Skill Swaps
          </h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '1.125rem' }}>
            Manage your exchanges and connect with learners
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Stats pills */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0.5rem',
            background: '#f3f4f6',
            borderRadius: '16px'
          }}>
            <div style={{
              padding: '0.5rem 1rem',
              background: pendingCount > 0 ? '#fef3c7' : 'transparent',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              color: pendingCount > 0 ? '#92400e' : '#6b7280',
              fontSize: '0.875rem'
            }}>
              ⏳ {pendingCount} pending
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              background: totalActive > 0 ? '#d1fae5' : 'transparent',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              color: totalActive > 0 ? '#065f46' : '#6b7280',
              fontSize: '0.875rem'
            }}>
              ✅ {totalActive} active
            </div>
          </div>

          <button
            onClick={() => setView(view === 'list' ? 'send' : 'list')}
            style={{
              padding: '0.875rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              background: view === 'send' ? '#f3f4f6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: view === 'send' ? '#374151' : 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              boxShadow: view === 'send' ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)'
            }}
          >
            {view === 'list' ? '+ New Request' : '← Back to List'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          color: '#991b1b',
          marginBottom: '1.5rem',
          animation: 'slideIn 0.3s ease'
        }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      )}

      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          color: '#166534',
          marginBottom: '1.5rem',
          animation: 'slideIn 0.3s ease'
        }}>
          <span>✅</span>
          <span style={{ flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      )}

      {/* VIEW: Send Request Form */}
      {view === 'send' && (
        <div style={{ animation: 'fadeInUp 0.4s ease' }}>
          {!canSend ? (
            <EmptyState
              icon="🔒"
              title="Complete Your Profile"
              subtitle="Add skills you can teach and want to learn to start swapping"
              action={
                <button
                  onClick={() => navigate('/profile')}
                  style={{
                    padding: '0.875rem 2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Go to Profile →
                </button>
              }
            />
          ) : (
            <div style={{
              maxWidth: '600px',
              margin: '0 auto',
              background: 'white',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  margin: '0 auto 1rem'
                }}>
                  🤝
                </div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.875rem', color: '#1f2937' }}>
                  Propose a Skill Swap
                </h2>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  Create a mutual exchange with another learner
                </p>
              </div>

              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Recipient - Simplified */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Who do you want to swap with?
                  </label>
                  <input
                    type="text"
                    value={sendForm.toUser}
                    onChange={(e) => setSendForm({ ...sendForm, toUser: e.target.value })}
                    placeholder="Enter User ID (from Search page)"
                    required
                    pattern="[a-f0-9]{24}"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                    💡 Tip: Find users in the Search page and click "Send Request"
                  </p>
                </div>

                {/* Skill Exchange Preview */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '20px',
                  padding: '2rem',
                  border: '2px dashed #e5e7eb'
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Exchange Preview
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        You Teach
                      </label>
                      <select
                        value={sendForm.offeredSkill}
                        onChange={(e) => setSendForm({ ...sendForm, offeredSkill: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: '2px solid #93c5fd',
                          borderRadius: '12px',
                          background: 'white',
                          fontSize: '1rem',
                          color: '#1e40af',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {userSkills.offered.map(skill => (
                          <option key={skill.value} value={skill.value}>{skill.label}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      ⇄
                    </div>

                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        You Learn
                      </label>
                      <select
                        value={sendForm.wantedSkill}
                        onChange={(e) => setSendForm({ ...sendForm, wantedSkill: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: '2px solid #f9a8d4',
                          borderRadius: '12px',
                          background: 'white',
                          fontSize: '1rem',
                          color: '#9d174d',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {userSkills.wanted.map(skill => (
                          <option key={skill.value} value={skill.value}>{skill.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={sendForm.message}
                    onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                    placeholder="Hi! I'd love to learn from you..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={actionLoading.send}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                    marginTop: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading.send) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  {actionLoading.send ? (
                    <span style={{
                      width: '24px',
                      height: '24px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : '🚀 Send Request'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* VIEW: List */}
      {view === 'list' && (
        <div style={{ animation: 'fadeInUp 0.4s ease' }}>
          {sortedRequests.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No Requests Yet"
              subtitle="Start by finding users to swap skills with in the Search page"
              action={
                <button
                  onClick={() => navigate('/search')}
                  style={{
                    padding: '0.875rem 2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🔍 Find Users
                </button>
              }
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '1.5rem'
            }}>
              {sortedRequests.map((request, index) => (
                <RequestCard
                  key={request._id}
                  request={request}
                  type={request.type}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RequestsPage;
