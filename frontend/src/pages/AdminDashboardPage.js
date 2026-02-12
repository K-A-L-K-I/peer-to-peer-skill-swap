import { useState } from 'react';
import api from '../services/api';

function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState('users');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportForm, setReportForm] = useState({ reportId: '', status: 'in_review', resolutionNote: '' });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
      setActiveSection('users');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.get('/admin/reports');
      setReports(data.reports || []);
      setActiveSection('reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (userId, shouldBlock) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setMessage('');
    setError('');

    try {
      await api.patch(`/admin/users/${userId}/${shouldBlock ? 'block' : 'unblock'}`);
      setMessage(`User ${shouldBlock ? 'blocked' : 'unblocked'} successfully`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleReportAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await api.patch(`/admin/reports/${reportForm.reportId}/action`, {
        status: reportForm.status,
        resolutionNote: reportForm.resolutionNote
      });
      setMessage('Report action submitted successfully');
      setReportForm({ reportId: '', status: 'in_review', resolutionNote: '' });
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'in_review': 'status-pending',
      'resolved': 'status-accepted',
      'rejected': 'status-rejected',
      'active': 'status-accepted',
      'blocked': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage users and moderate reports</p>
      </div>

      {/* Action Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={`btn ${activeSection === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={loadUsers}
            disabled={loading}
          >
            {loading && activeSection !== 'users' ? (
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
            ) : (
              '👥 Manage Users'
            )}
          </button>
          <button 
            type="button" 
            className={`btn ${activeSection === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={loadReports}
            disabled={loading}
          >
            {loading && activeSection !== 'reports' ? (
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
            ) : (
              '📋 View Reports'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span>
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success">
          <span>✓</span>
          {message}
        </div>
      )}

      {/* Users Section */}
      {activeSection === 'users' && (
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
            All Users ({users.length})
          </h3>
          
          {users.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3>No users loaded</h3>
                <p>Click "Manage Users" to load the user list</p>
              </div>
            </div>
          ) : (
            <div className="list-grid">
              {users.map((user) => (
                <div key={user._id} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0' }}>{user.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                      </div>
                      <span className={`status-badge ${user.isBlocked ? 'status-rejected' : 'status-accepted'}`}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Role: <strong>{user.role}</strong> • Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </div>

                    {user.role !== 'admin' && (
                      <button
                        type="button"
                        className={`btn btn-sm ${user.isBlocked ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => toggleBlock(user._id, !user.isBlocked)}
                        disabled={actionLoading[user._id]}
                        style={{ width: '100%' }}
                      >
                        {actionLoading[user._id] ? (
                          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                        ) : (
                          user.isBlocked ? 'Unblock User' : 'Block User'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Section */}
      {activeSection === 'reports' && (
        <div>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Reports List */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                Reports ({reports.length})
              </h3>
              
              {reports.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No reports loaded</h3>
                    <p>Click "View Reports" to load the reports list</p>
                  </div>
                </div>
              ) : (
                <div className="list-grid">
                  {reports.map((report) => (
                    <div key={report._id} className="card">
                      <div className="card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            #{report._id.slice(-8)}
                          </span>
                          <span className={`status-badge ${getStatusBadge(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                        
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                          <strong>Reason:</strong> {report.reason}
                        </p>
                        
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Reported: {report.reportedUser?.email || 'Unknown'}
                        </p>
                        
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          By: {report.reportedBy?.email || 'Unknown'} • {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Form */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                Take Action
              </h3>
              
              <div className="card">
                <div className="card-body">
                  <form onSubmit={handleReportAction}>
                    <div className="form-group">
                      <label className="form-label form-label-required">Report ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter report ID"
                        value={reportForm.reportId}
                        onChange={(e) => setReportForm({ ...reportForm, reportId: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label form-label-required">New Status</label>
                      <select
                        className="form-select"
                        value={reportForm.status}
                        onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })}
                        required
                      >
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Resolution Note</label>
                      <textarea
                        className="form-textarea"
                        rows="3"
                        placeholder="Add notes about the resolution..."
                        value={reportForm.resolutionNote}
                        onChange={(e) => setReportForm({ ...reportForm, resolutionNote: e.target.value })}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ width: '100%' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                          Processing...
                        </>
                      ) : (
                        'Submit Action'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
