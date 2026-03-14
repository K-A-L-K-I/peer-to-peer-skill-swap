import { useState, useEffect, useCallback } from 'react';
import { Users, Ban, AlertTriangle, CheckCircle, RefreshCw, Shield, MessageSquare, X } from 'lucide-react';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import './AdminDashboard.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ACTION_LABELS = {
  block_user: { label: 'Blocked User', color: '#ef4444', bg: '#fee2e2' },
  unblock_user: { label: 'Unblocked User', color: '#10b981', bg: '#d1fae5' },
  resolve_report: { label: 'Resolved Report', color: '#8b5cf6', bg: '#ede9fe' },
  reject_report: { label: 'Rejected Report', color: '#6b7280', bg: '#f3f4f6' },
  review_report: { label: 'Marked In Review', color: '#f59e0b', bg: '#fef9c3' },
  delete_user: { label: 'Deleted User', color: '#dc2626', bg: '#fef2f2' },
};

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Component ───────────────────────────────────────────────────────────────
function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Report inline action
  const [reportActionData, setReportActionData] = useState({ id: null, status: 'resolved', note: '' });

  // Confirmation dialog state
  const [confirm, setConfirm] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', variant: 'danger', onConfirm: null
  });

  // Conversation viewer modal state
  const [convModal, setConvModal] = useState({ open: false, messages: [], loading: false, reporter: null, reported: null });

  const closeConfirm = () => setConfirm(c => ({ ...c, isOpen: false, onConfirm: null }));

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, reportsRes, auditRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/reports'),
        api.get('/admin/audit-logs?limit=50')
      ]);
      setUsers(usersRes.data.users || []);
      setReports(reportsRes.data.reports || []);
      setAuditLogs(auditRes.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setMessage(msg);
    setTimeout(() => { setError(''); setMessage(''); }, 3500);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleBlock = (userId, shouldBlock, userName) => {
    setConfirm({
      isOpen: true,
      title: shouldBlock ? `Block ${userName}?` : `Unblock ${userName}?`,
      message: shouldBlock
        ? `This will prevent ${userName} from logging in or using the platform. You can reverse this at any time.`
        : `${userName} will regain full access to the platform.`,
      confirmText: shouldBlock ? 'Yes, Block' : 'Yes, Unblock',
      variant: shouldBlock ? 'danger' : 'warning',
      onConfirm: async () => {
        closeConfirm();
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
          await api.patch(`/admin/users/${userId}/${shouldBlock ? 'block' : 'unblock'}`);
          showMsg(`User ${shouldBlock ? 'blocked' : 'unblocked'} successfully`);
          await fetchDashboardData();
        } catch (err) {
          showMsg(err.response?.data?.message || 'Failed to update user status', true);
        } finally {
          setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
      }
    });
  };

  const submitReportAction = async (reportId) => {
    const { status, note } = reportActionData;
    if (!status) return;
    setActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      await api.patch(`/admin/reports/${reportId}/action`, { status, resolutionNote: note });
      showMsg('Report updated successfully');
      setReportActionData({ id: null, status: 'resolved', note: '' });
      await fetchDashboardData();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update report', true);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const fetchConversation = async (report) => {
    const u1 = report.reportedBy?._id || report.reportedBy;
    const u2 = report.reportedUser?._id || report.reportedUser;
    if (!u1 || !u2) return;
    setConvModal({ open: true, messages: [], loading: true, reporter: report.reportedBy, reported: report.reportedUser });
    try {
      const { data } = await api.get(`/admin/conversation/${u1}/${u2}`);
      setConvModal(prev => ({ ...prev, loading: false, messages: data.messages || [] }));
    } catch (err) {
      setConvModal(prev => ({ ...prev, loading: false }));
      showMsg('Failed to load conversation', true);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    totalUsers: users.length,
    blockedUsers: users.filter(u => u.isBlocked).length,
    activeReports: reports.filter(r => r.status === 'pending' || r.status === 'in_review').length,
    resolvedReports: reports.filter(r => r.status === 'resolved').length,
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={22} />, cls: 'users' },
    { label: 'Blocked Users', value: stats.blockedUsers, icon: <Ban size={22} />, cls: 'blocked' },
    { label: 'Active Reports', value: stats.activeReports, icon: <AlertTriangle size={22} />, cls: 'warning' },
    { label: 'Resolved', value: stats.resolvedReports, icon: <CheckCircle size={22} />, cls: 'success' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard">
      {/* Confirmation modal */}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Platform overview and user moderation</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {message && <div className="admin-alert success">{message}</div>}

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-content">
              <h3>{s.label}</h3>
              <p className="stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin-content-card">
        <div className="admin-tabs">
          {[
            { key: 'users', label: 'Manage Users' },
            { key: 'reports', label: 'Reports' },
            { key: 'audit', label: 'Audit Log' },
          ].map(t => (
            <button
              key={t.key}
              className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key === 'audit' && auditLogs.length > 0 && (
                <span style={{
                  marginLeft: '6px', background: '#667eea', color: 'white',
                  fontSize: '0.7rem', borderRadius: '9999px', padding: '1px 7px', fontWeight: 700
                }}>
                  {auditLogs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Users Table ─────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">No users found.</td></tr>
                ) : users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="cell-user">
                        <div className="cell-avatar">{user.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="cell-name">{user.name}</div>
                          <div className="cell-sub">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                    <td className="cell-date">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill ${user.isBlocked ? 'blocked' : 'active'}`}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="text-right">
                      {user.role !== 'admin' && (
                        <button
                          className={`btn-action ${user.isBlocked ? 'unblock' : 'block'}`}
                          onClick={() => toggleBlock(user._id, !user.isBlocked, user.name)}
                          disabled={actionLoading[user._id]}
                        >
                          {actionLoading[user._id] ? 'Processing…' : (user.isBlocked ? 'Unblock' : 'Block')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Reports Table ─────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Target User</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">No reports found.</td></tr>
                ) : reports.map(report => (
                  <tr key={report._id}>
                    <td className="cell-id">#{report._id.slice(-6).toUpperCase()}</td>
                    <td>
                      <div className="cell-name">{report.reportedUser?.name || 'Unknown'}</div>
                      <div className="cell-sub">{report.reportedUser?.email}</div>
                    </td>
                    <td>
                      <div className="cell-reason">{report.reason}</div>
                      <div className="cell-sub">By: {report.reportedBy?.name || report.reportedBy?.email}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${report.status}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* View Chat button */}
                        <button
                          className="btn-action view-chat"
                          onClick={() => fetchConversation(report)}
                          title="View chat between reporter and reported user"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MessageSquare size={13} /> Chat
                        </button>

                        {reportActionData.id === report._id ? (
                          <div className="action-form-inline">
                            <select
                              value={reportActionData.status}
                              onChange={e => setReportActionData({ ...reportActionData, status: e.target.value })}
                            >
                              <option value="in_review">In Review</option>
                              <option value="resolved">Resolved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <button className="btn-action submit" onClick={() => submitReportAction(report._id)} disabled={actionLoading[report._id]}>Save</button>
                            <button className="btn-action cancel" onClick={() => setReportActionData({ id: null })}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            className="btn-action edit"
                            onClick={() => setReportActionData({ id: report._id, status: report.status, note: report.resolutionNote || '' })}
                          >
                            Moderate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Audit Log ────────────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '1rem' }}>No admin actions recorded yet.</p>
              </div>
            ) : (
              <div style={{ padding: '0.5rem 0' }}>
                {auditLogs.map((log, i) => {
                  const meta = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', bg: '#f3f4f6' };
                  return (
                    <div
                      key={log._id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '1rem 1.5rem',
                        borderBottom: i < auditLogs.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Action badge */}
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: meta.bg,
                        color: meta.color,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {meta.label}
                      </span>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                          <strong style={{ color: '#7c3aed' }}>{log.admin?.name || 'Admin'}</strong>
                          {log.targetUser && <> → <strong>{log.targetUser.name}</strong></>}
                        </div>
                        {log.note && (
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.note}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {timeAgo(log.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Conversation Viewer Modal ───────────────────────────────────────── */}
      {convModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setConvModal(m => ({ ...m, open: false }))}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '20px', width: '100%', maxWidth: 560,
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Chat Evidence Viewer</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                  {convModal.reporter?.name || 'Reporter'} ↔ {convModal.reported?.name || 'Reported'}
                </div>
              </div>
              <button onClick={() => setConvModal(m => ({ ...m, open: false }))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', background: '#f8fafc' }}>
              {convModal.loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
                  Loading messages…
                </div>
              ) : convModal.messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  <MessageSquare size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>No messages found between these users.</p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>They may have never had a conversation.</p>
                </div>
              ) : (
                convModal.messages.map((msg, idx) => {
                  const isReporter = msg.sender?._id === (convModal.reporter?._id || convModal.reporter);
                  const msgDate = new Date(msg.createdAt);
                  const msgDay = msgDate.toDateString();
                  const prevDay = idx > 0 ? new Date(convModal.messages[idx - 1].createdAt).toDateString() : null;
                  const showDateSep = msgDay !== prevDay;
                  const today = new Date().toDateString();
                  const yesterday = new Date(Date.now() - 86400000).toDateString();
                  const dateLabel = msgDay === today ? 'Today'
                    : msgDay === yesterday ? 'Yesterday'
                      : msgDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <div key={msg._id}>
                      {showDateSep && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', margin: '0.875rem 0' }}>
                          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', background: 'white', padding: '2px 10px', borderRadius: '9999px', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{dateLabel}</span>
                          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: isReporter ? 'row' : 'row-reverse', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, background: isReporter ? '#ede9fe' : '#fef9c3', color: isReporter ? '#7c3aed' : '#d97706' }}>
                          {(msg.sender?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ maxWidth: '72%' }}>
                          <div style={{ background: isReporter ? '#6366f1' : 'white', color: isReporter ? 'white' : '#111827', padding: '0.6rem 0.875rem', borderRadius: isReporter ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '0.875rem', lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: isReporter ? 'none' : '1px solid #f3f4f6' }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '3px', textAlign: isReporter ? 'left' : 'right', paddingInline: '4px' }}>
                            {msg.sender?.name} · {msgDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #f3f4f6', background: 'white', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6366f1', marginRight: 5, verticalAlign: 'middle' }} /><b style={{ color: '#374151' }}>{convModal.reporter?.name}</b> (Reporter)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#fef9c3', border: '1px solid #fde68a', marginRight: 5, verticalAlign: 'middle' }} /><b style={{ color: '#374151' }}>{convModal.reported?.name}</b> (Reported)</span>
              <span style={{ marginLeft: 'auto' }}>{convModal.messages.length} messages</span>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AdminDashboardPage;
