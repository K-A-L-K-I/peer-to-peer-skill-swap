import { useState, useEffect } from 'react';
import api from '../services/api';

function RequestsPage() {
  const [activeTab, setActiveTab] = useState('send');
  const [sendForm, setSendForm] = useState({
    toUser: '',
    offeredSkill: '',
    wantedSkill: '',
    message: ''
  });
  const [requestId, setRequestId] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setError('');

    try {
      const { data } = await api.post('/swap-requests', sendForm);
      setResult(`Request sent successfully! ID: ${data.request?._id || 'created'}`);
      setSendForm({ toUser: '', offeredSkill: '', wantedSkill: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!requestId.trim()) {
      setError('Please enter a Request ID');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');

    try {
      const { data } = await api.patch(`/swap-requests/${requestId}/${action}`);
      setResult(data.message || `Request ${action}ed successfully`);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Skill Swap Requests</h1>
        <p className="page-subtitle">Send new requests or manage existing ones</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '1px' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setActiveTab('send')}
          style={{
            borderBottom: activeTab === 'send' ? '2px solid var(--primary)' : 'none',
            marginBottom: '-2px',
            borderRadius: 0,
            color: activeTab === 'send' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          Send Request
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setActiveTab('manage')}
          style={{
            borderBottom: activeTab === 'manage' ? '2px solid var(--primary)' : 'none',
            marginBottom: '-2px',
            borderRadius: 0,
            color: activeTab === 'manage' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          Accept / Reject
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span>
          {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success">
          <span>✓</span>
          {result}
        </div>
      )}

      {activeTab === 'send' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Send New Request</h3>
            <p className="card-subtitle">Propose a skill exchange with another student</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label form-label-required">Recipient User ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste the User ID from search results"
                  value={sendForm.toUser}
                  onChange={(e) => setSendForm({ ...sendForm, toUser: e.target.value })}
                  required
                />
                <p className="form-hint">Find this ID in the Skill Search page when viewing a user's profile</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label form-label-required">Skill You Offer</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Python Programming"
                    value={sendForm.offeredSkill}
                    onChange={(e) => setSendForm({ ...sendForm, offeredSkill: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label form-label-required">Skill You Want</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Spanish Language"
                    value={sendForm.wantedSkill}
                    onChange={(e) => setSendForm({ ...sendForm, wantedSkill: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Personal Message (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Introduce yourself and explain why you'd like this skill swap..."
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Respond to Request</h3>
            <p className="card-subtitle">Accept or reject incoming skill swap requests</p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label form-label-required">Request ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter the request ID you received"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
              />
              <p className="form-hint">You'll receive this ID via notification when someone sends you a request</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={() => handleAction('accept')}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : (
                  'Accept Request'
                )}
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => handleAction('reject')}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : (
                  'Reject Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestsPage;
