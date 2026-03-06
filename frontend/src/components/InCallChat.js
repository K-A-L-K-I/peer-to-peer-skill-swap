import React, { useState, useEffect, useRef } from 'react';
import './InCallChat.css';

const InCallChat = ({ socket, callId, currentUser, targetUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Format current time
    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        // Add welcome message
        setMessages([{
            id: 'system-1',
            sender: 'system',
            text: `Chat with ${targetUser?.name || 'User'} started`,
            time: formatTime(new Date())
        }]);
    }, [targetUser]);

    useEffect(() => {
        if (!socket || !callId) return;

        const handleCallMessage = (data) => {
            // Validate this message belongs to the current active call
            if (data.callId === callId) {
                setMessages(prev => [...prev, {
                    id: Date.now() + Math.random().toString(),
                    sender: data.from === currentUser?.id ? 'me' : 'them',
                    text: data.message,
                    time: formatTime(new Date(data.timestamp || Date.now()))
                }]);
            }
        };

        socket.on('call-message', handleCallMessage);

        return () => {
            socket.off('call-message', handleCallMessage);
        };
    }, [socket, callId, currentUser]);

    // Auto-scroll to newest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !callId) return;

        const messageData = {
            message: newMessage,
            callId,
            to: targetUser._id, // Send to the specific user's socket active in the call
            timestamp: Date.now()
        };

        // Emit via socket
        socket.emit('call-message', messageData);

        // Optimistically add to UI immediately
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'me',
            text: newMessage,
            time: formatTime(new Date())
        }]);

        setNewMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    return (
        <div className="incall-chat-container">
            <div className="chat-header">
                <h3>In-Call Messages</h3>
                <button className="close-btn" onClick={onClose} title="Close Chat">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="messages-area">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                        {msg.sender === 'system' ? (
                            <div className="system-message">{msg.text}</div>
                        ) : (
                            <div className={`chat-bubble ${msg.sender}`}>
                                <div className="msg-text">{msg.text}</div>
                                <div className="msg-time">{msg.time}</div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows="1"
                />
                <button type="submit" disabled={!newMessage.trim()} className="send-btn" title="Send (Enter)">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default InCallChat;
