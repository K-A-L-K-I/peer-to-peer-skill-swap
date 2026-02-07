import { useState } from 'react';
import api from '../services/api';

function ChatPage() {
  const [swapRequestId, setSwapRequestId] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  const loadMessages = async () => {
    setError('');
    try {
      const { data } = await api.get(`/messages/${swapRequestId}`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/messages', { swapRequestId, content });
      setContent('');
      loadMessages();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  return (
    <section className="panel">
      <h2>Chat</h2>

      <div className="inline-form">
        <input
          placeholder="Accepted Swap Request ID"
          value={swapRequestId}
          onChange={(e) => setSwapRequestId(e.target.value)}
        />
        <button type="button" onClick={loadMessages}>
          Load Messages
        </button>
      </div>

      <form onSubmit={sendMessage} className="inline-form">
        <input
          placeholder="Write a message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit">Send</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="list-wrap">
        {messages.map((msg) => (
          <article key={msg._id} className="card">
            <p><strong>{msg.sender?.name || 'User'}:</strong> {msg.content}</p>
            <small>{new Date(msg.createdAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ChatPage;
