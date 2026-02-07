import { useState } from 'react';
import api from '../services/api';

function RequestsPage() {
  const [sendForm, setSendForm] = useState({
    toUser: '',
    offeredSkill: '',
    wantedSkill: '',
    message: ''
  });
  const [requestId, setRequestId] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setResult('');
    setError('');

    try {
      const { data } = await api.post('/swap-requests', sendForm);
      setResult(`Request sent. ID: ${data.request?._id || 'created'}`);
      setSendForm({ toUser: '', offeredSkill: '', wantedSkill: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAction = async (action) => {
    setResult('');
    setError('');

    try {
      const { data } = await api.patch(`/swap-requests/${requestId}/${action}`);
      setResult(data.message || `Request ${action}ed`);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`);
    }
  };

  return (
    <section className="panel">
      <h2>Requests</h2>

      <h3>Send Request</h3>
      <form onSubmit={handleSend} className="form-grid">
        <input
          placeholder="Recipient User ID"
          value={sendForm.toUser}
          onChange={(e) => setSendForm({ ...sendForm, toUser: e.target.value })}
          required
        />
        <input
          placeholder="Offered Skill"
          value={sendForm.offeredSkill}
          onChange={(e) => setSendForm({ ...sendForm, offeredSkill: e.target.value })}
          required
        />
        <input
          placeholder="Wanted Skill"
          value={sendForm.wantedSkill}
          onChange={(e) => setSendForm({ ...sendForm, wantedSkill: e.target.value })}
          required
        />
        <input
          placeholder="Message (optional)"
          value={sendForm.message}
          onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
        />
        <button type="submit">Send Request</button>
      </form>

      <h3>Accept / Reject</h3>
      <div className="inline-form">
        <input
          placeholder="Request ID"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <button type="button" onClick={() => handleAction('accept')}>
          Accept
        </button>
        <button type="button" onClick={() => handleAction('reject')}>
          Reject
        </button>
      </div>

      {result && <p className="ok-text">{result}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default RequestsPage;
