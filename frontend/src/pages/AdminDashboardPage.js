import { useState } from 'react';
import api from '../services/api';

function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportForm, setReportForm] = useState({ reportId: '', status: 'in_review', resolutionNote: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    }
  };

  const loadReports = async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/reports');
      setReports(data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    }
  };

  const toggleBlock = async (userId, shouldBlock) => {
    setMessage('');
    setError('');

    try {
      await api.patch(`/admin/users/${userId}/${shouldBlock ? 'block' : 'unblock'}`);
      setMessage(shouldBlock ? 'User blocked' : 'User unblocked');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleReportAction = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.patch(`/admin/reports/${reportForm.reportId}/action`, {
        status: reportForm.status,
        resolutionNote: reportForm.resolutionNote
      });
      setMessage('Report action submitted');
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
    }
  };

  return (
    <section className="panel">
      <h2>Admin Dashboard</h2>

      <div className="inline-form">
        <button type="button" onClick={loadUsers}>Load Users</button>
        <button type="button" onClick={loadReports}>Load Reports</button>
      </div>

      <h3>Users</h3>
      <div className="list-wrap">
        {users.map((user) => (
          <article key={user._id} className="card">
            <p><strong>{user.name}</strong> ({user.email})</p>
            <p>Role: {user.role} | Blocked: {String(user.isBlocked)}</p>
            {user.role !== 'admin' && (
              <button type="button" onClick={() => toggleBlock(user._id, !user.isBlocked)}>
                {user.isBlocked ? 'Unblock' : 'Block'}
              </button>
            )}
          </article>
        ))}
      </div>

      <h3>Reports</h3>
      <div className="list-wrap">
        {reports.map((report) => (
          <article key={report._id} className="card">
            <p><strong>Report ID:</strong> {report._id}</p>
            <p>Status: {report.status}</p>
            <p>Reason: {report.reason}</p>
            <p>Reported User: {report.reportedUser?.email || 'N/A'}</p>
          </article>
        ))}
      </div>

      <h3>Take Report Action</h3>
      <form onSubmit={handleReportAction} className="form-grid">
        <input
          placeholder="Report ID"
          value={reportForm.reportId}
          onChange={(e) => setReportForm({ ...reportForm, reportId: e.target.value })}
          required
        />
        <select
          value={reportForm.status}
          onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })}
        >
          <option value="in_review">in_review</option>
          <option value="resolved">resolved</option>
          <option value="rejected">rejected</option>
        </select>
        <input
          placeholder="Resolution note"
          value={reportForm.resolutionNote}
          onChange={(e) => setReportForm({ ...reportForm, resolutionNote: e.target.value })}
        />
        <button type="submit">Submit Action</button>
      </form>

      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default AdminDashboardPage;
