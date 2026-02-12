import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function ChatPage() {
  const [swapRequestId, setSwapRequestId] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [chatLoaded, setChatLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!swapRequestId.trim()) {
      setError('Please enter a Swap Request ID');
      return;
    }

    setLoading(true);
    setError('');
    setChatLoaded(false);

    try {
      const { data } = await api.get(`/messages/${swapRequestId}`);
      setMessages(data.messages || []);
      setChatLoaded(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages. Make sure the swap request is accepted.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    setError('');

    try {
      await api.post('/messages', { swapRequestId, content: content.trim() });
      setContent('');
      await loadMessages();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Chat with your skill swap partners</p>
      </div>

      {!chatLoaded ? (
        <div className="card">
          <div className="card-body">
            <div className="form-group">
              <label className="form-label form-label-required">Swap Request ID</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter accepted swap request ID"
                  value={swapRequestId}
                  onChange={(e) => setSwapRequestId(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={loadMessages}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                  ) : (
                    'Load Chat'
                  )}
                </button>
              </div>
              <p className="form-hint">You can only chat after a swap request has been accepted</p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <span>⚠</span>
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="chat-container">
          <div className="chat-header">
            <div>
              <strong>Chat</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                Request #{swapRequestId.slice(-6)}
              </span>
            </div>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm"
              onClick={() => setChatLoaded(false)}
            >
              Change Chat
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message below</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg._id} 
                  className={`chat-message ${msg.sender?._id === localStorage.getItem('userId') ? 'sent' : 'received'}`}
                >
                  <div>{msg.content}</div>
                  <div className="chat-message-meta">
                    {msg.sender?.name || 'Unknown'} • {formatTime(msg.createdAt)}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={sendMessage}>
            <input
              type="text"
              className="form-input"
              placeholder="Type your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={sending}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={sending || !content.trim()}
            >
              {sending ? (
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
