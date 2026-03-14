// src/pages/ChatPage.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socketService';
import useAuthStore from '../store/authStore';
import VideoCall from '../components/VideoCall';
import ReportModal from '../components/ReportModal';
import KebabMenu from '../components/KebabMenu';
import { Calendar, Phone, Video, AlertTriangle, ArrowLeft, MessageSquarePlus, MessageCircle } from 'lucide-react';

// ==================== UTILITY COMPONENTS ====================

// Animated typing indicator
const TypingIndicator = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    background: '#f3f4f6',
    borderRadius: '20px',
    width: 'fit-content',
    marginBottom: '12px'
  }}>
    <span style={{
      width: '12px',
      height: '12px',
      background: '#9ca3af',
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite ease-in-out both',
      animationDelay: '0s'
    }} />
    <span style={{
      width: '12px',
      height: '12px',
      background: '#9ca3af',
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite ease-in-out both',
      animationDelay: '0.16s'
    }} />
    <span style={{
      width: '12px',
      height: '12px',
      background: '#9ca3af',
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite ease-in-out both',
      animationDelay: '0.32s'
    }} />
    <style>{`
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `}</style>
  </div>
);

// Message status indicator
const MessageStatus = ({ status, isRead }) => {
  if (isRead) return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L6 12L14 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8L10 12L18 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4, 0)" />
    </svg>
  );
  if (status === 'delivered') return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L6 12L14 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8L10 12L18 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4, 0)" />
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L6 12L14 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Avatar component with online status
const Avatar = ({ user, size = 'md', showStatus = false, isOnline = false }) => {
  const sizes = {
    sm: { width: '44px', height: '44px', fontSize: '1.25rem' },
    md: { width: '56px', height: '56px', fontSize: '1.5rem' },
    lg: { width: '72px', height: '72px', fontSize: '2rem' }
  };
  const s = sizes[size];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: s.width,
        height: s.height,
        borderRadius: '50%',
        background: user?.profilePicture
          ? `url(${user.profilePicture}) center/cover`
          : `linear-gradient(135deg, ${stringToColor(user?.name || '?')} 0%, ${stringToColor((user?.name || '?') + '1')} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: s.fontSize,
        flexShrink: 0
      }}>
        {!user?.profilePicture && (user?.name?.charAt(0) || '?').toUpperCase()}
      </div>
      {showStatus && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: size === 'sm' ? '14px' : '18px',
          height: size === 'sm' ? '14px' : '18px',
          borderRadius: '50%',
          background: isOnline ? '#10b981' : '#9ca3af',
          border: '3px solid white',
          boxShadow: isOnline ? '0 0 0 3px #d1fae5' : 'none'
        }} />
      )}
    </div>
  );
};

// Message bubble component
const MessageBubble = ({ message, isMe, isFirstInGroup, isLastInGroup, showAvatar, otherUser }) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isPending = message.isPending;
  const isFailed = message.isFailed;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '12px',
      marginBottom: isLastInGroup ? '16px' : '6px',
      animation: 'messageSlide 0.3s ease'
    }}>
      {/* Avatar - only show on last message in group */}
      {!isMe && showAvatar && (
        <div style={{ width: '44px', flexShrink: 0 }}>
          {isLastInGroup ? <Avatar user={otherUser} size="sm" /> : <div style={{ width: '44px' }} />}
        </div>
      )}
      {isMe && <div style={{ width: '44px', flexShrink: 0 }} />}

      {/* Message content */}
      <div style={{
        maxWidth: '75%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start'
      }}>
        <div style={{
          padding: '16px 20px',
          borderRadius: isMe
            ? (isFirstInGroup && isLastInGroup ? '24px 24px 4px 24px' :
              isFirstInGroup ? '24px 24px 4px 24px' :
                isLastInGroup ? '24px 4px 24px 24px' : '24px 4px 4px 24px')
            : (isFirstInGroup && isLastInGroup ? '24px 24px 24px 4px' :
              isFirstInGroup ? '24px 24px 24px 4px' :
                isLastInGroup ? '4px 24px 24px 24px' : '4px 24px 24px 4px'),
          background: isMe
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : '#f3f4f6',
          color: isMe ? 'white' : '#1f2937',
          boxShadow: isMe
            ? '0 4px 14px rgba(102, 126, 234, 0.3)'
            : '0 2px 8px rgba(0,0,0,0.05)',
          position: 'relative',
          wordBreak: 'break-word'
        }}>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '1.25rem' }}>
            {message.content.includes('Click to Join') ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  // Emit custom event caught by ChatPage to launch video
                  document.dispatchEvent(new CustomEvent('initiate-scheduled-call'));
                }}
                style={{
                  background: 'none', border: 'none', color: 'inherit',
                  padding: 0, margin: 0, font: 'inherit', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: '4px'
                }}
              >
                {message.content}
              </button>
            ) : message.content}
          </p>

          {/* Time and status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            gap: '6px',
            marginTop: '8px',
            opacity: 0.85
          }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
              {time}
            </span>
            {isMe && !isPending && (
              <MessageStatus status={isFailed ? 'failed' : 'delivered'} isRead={false} />
            )}
            {isPending && (
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                display: 'inline-block'
              }} />
            )}
            {isFailed && (
              <span style={{ color: '#fecaca', fontSize: '0.9375rem', fontWeight: 600 }}>Failed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat list item
const ChatListItem = ({ chat, isActive, onClick, currentUserId }) => {
  const otherUser = chat.fromUser?._id === currentUserId ? chat.toUser : chat.fromUser;
  const lastMessage = chat.lastMessage || { content: 'No messages yet', createdAt: chat.createdAt };
  const unreadCount = chat.unreadCount || 0;
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  const isUserOnline = onlineUsers.includes(String(otherUser?._id));

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: isActive ? '#eff6ff' : 'transparent',
        border: isActive ? '1px solid #bfdbfe' : '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = '#f9fafb';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Avatar user={otherUser} size="md" showStatus={true} isOnline={isUserOnline} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h4 style={{
            margin: 0,
            fontSize: '1.375rem',
            fontWeight: 600,
            color: '#1f2937',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {otherUser?.name || 'Unknown'}
          </h4>
          <span style={{ fontSize: '1rem', color: unreadCount > 0 ? '#667eea' : '#9ca3af', fontWeight: unreadCount > 0 ? 600 : 400 }}>
            {new Date(lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{
            margin: 0,
            fontSize: '1.125rem',
            color: unreadCount > 0 ? '#1f2937' : '#6b7280',
            fontWeight: unreadCount > 0 ? 500 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '85%'
          }}>
            {lastMessage.content}
          </p>

          {unreadCount > 0 && (
            <span style={{
              minWidth: '28px',
              height: '28px',
              padding: '0 8px',
              borderRadius: '14px',
              background: '#667eea',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeChatId, setActiveChatId] = useState(location.state?.swapRequestId || null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState('video');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  // incomingCallForVideoCall: set when user accepts from the global popup (via location.state)
  const [incomingCallForVideoCall, setIncomingCallForVideoCall] = useState(null);

  const onlineUsers = useAuthStore(state => state.onlineUsers);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = String(currentUser._id || '');

  // Get active chat details
  const activeChat = useMemo(() =>
    chats.find(c => c._id === activeChatId),
    [chats, activeChatId]);

  const otherUser = useMemo(() => {
    if (!activeChat) return null;
    return activeChat.fromUser?._id === currentUserId
      ? activeChat.toUser
      : activeChat.fromUser;
  }, [activeChat, currentUserId]);

  // Load chats list
  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get('/swap-requests/my-requests');
      const accepted = [
        ...data.received.filter(r => r.status === 'accepted'),
        ...data.sent.filter(r => r.status === 'accepted')
      ].map(chat => ({
        ...chat,
        lastMessage: null,
        unreadCount: 0,
        isOnline: false
      }));
      setChats(accepted);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for active chat
  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const { data } = await api.get(`/messages/${chatId}`);
      setMessages(data.messages || []);
      // Mark as read
      setChats(prev => prev.map(c =>
        c._id === chatId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  // Handle incoming call passed via navigation state (from global AppLayout popup)
  useEffect(() => {
    const incoming = location.state?.incomingCall;
    if (incoming && !showVideoCall && chats.length > 0) {
      console.log('📱 [ChatPage] Incoming call from navigation state:', incoming);
      setIncomingCallForVideoCall(incoming);
      setCallType(incoming.callType || 'video');
      setShowVideoCall(true);

      // Switch to the chat with the caller so targetUser is correct
      const chatWithCaller = chats.find(c => {
        const reqId = typeof c.requester === 'object' ? c.requester._id : c.requester;
        const provId = typeof c.provider === 'object' ? c.provider._id : c.provider;
        return String(reqId) === String(incoming.from) || String(provId) === String(incoming.from);
      });

      if (chatWithCaller) {
        setActiveChatId(chatWithCaller._id);
        navigate('/chat', { replace: true, state: { swapRequestId: chatWithCaller._id } });
      } else {
        // Clear from location state
        navigate('/chat', { replace: true, state: { swapRequestId: activeChatId } });
      }
    }
  }, [location.state?.incomingCall, showVideoCall, chats, activeChatId, navigate]);

  // Socket setup
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    const unsubNewMessage = socketService.on('new-message', (message) => {
      const senderId = String(message.sender?._id || message.sender);
      const msgSwapReqId = String(message.swapRequest?._id || message.swapRequest);

      // Update messages if in active chat
      if (msgSwapReqId === String(activeChatId)) {
        if (senderId === currentUserId) {
          // Our own message confirmed
          setMessages(prev => prev.map(m =>
            m.tempId === message.tempId ? { ...message, isPending: false } : m
          ));
        } else {
          // New message from other
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, { ...message, isPending: false }];
          });
          // Mark chat as having new message
          setChats(prev => prev.map(c =>
            String(c._id) === msgSwapReqId && String(c._id) !== String(activeChatId)
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: message }
              : String(c._id) === msgSwapReqId ? { ...c, lastMessage: message } : c
          ));
        }
      } else if (senderId !== currentUserId) {
        // Notification for other chat
        setChats(prev => prev.map(c =>
          String(c._id) === msgSwapReqId
            ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: message }
            : c
        ));
      }
    });

    const unsubTyping = socketService.on('user-typing', ({ swapRequestId, isTyping: typing, userId }) => {
      if (swapRequestId === activeChatId && userId !== currentUserId) {
        setOtherUserTyping(typing);
      }
    });

    const unsubConnect = socketService.on('connect', () => {
      setIsConnected(true);
      if (activeChatId) socketService.joinChat(activeChatId);
    });

    const unsubDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
    });

    // Check initial connection
    setIsConnected(socketService.isConnected());

    const handleScheduledCall = () => {
      handleCall('video');
    };

    document.addEventListener('initiate-scheduled-call', handleScheduledCall);

    return () => {
      unsubNewMessage();
      unsubTyping();
      unsubConnect();
      unsubDisconnect();
      document.removeEventListener('initiate-scheduled-call', handleScheduledCall);
    };
  }, [activeChatId, currentUserId]);

  // Load initial data
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Load messages when chat changes
  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
      socketService.joinChat(activeChatId);
      // On mobile, hide sidebar when chat selected
      if (window.innerWidth < 768) setShowSidebar(false);
    }
    return () => {
      if (activeChatId) socketService.leaveChat(activeChatId);
    };
  }, [activeChatId, loadMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (activeChatId && !isTyping) {
      setIsTyping(true);
      socketService.sendTyping(activeChatId, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.sendTyping(activeChatId, false);
    }, 2000);
  };

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId) return;

    const content = inputValue.trim();
    const tempId = Date.now();

    // Optimistic add
    const tempMessage = {
      _id: `temp-${tempId}`,
      content,
      sender: { _id: currentUserId, name: currentUser.name },
      createdAt: new Date().toISOString(),
      tempId,
      isPending: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputValue('');
    setIsTyping(false);
    socketService.sendTyping(activeChatId, false);

    // API call
    try {
      await api.post('/messages', {
        swapRequestId: activeChatId,
        content,
        tempId
      });
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.tempId === tempId ? { ...m, isPending: false, isFailed: true } : m
      ));
    }
  };

  // Group messages for display
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = [];

    messages.forEach((msg, index) => {
      const prevMsg = messages[index - 1];
      const isSameSender = prevMsg && String(prevMsg.sender?._id || prevMsg.sender) === String(msg.sender?._id || msg.sender);
      const timeDiff = prevMsg ? new Date(msg.createdAt) - new Date(prevMsg.createdAt) : 0;
      const isWithin5Min = timeDiff < 5 * 60 * 1000;

      if (!isSameSender || !isWithin5Min) {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push({ ...msg, index });
    });

    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  }, [messages]);

  // Start video/audio call
  const handleCall = (type) => {
    if (type === 'schedule') {
      setShowScheduleModal(true);
      return;
    }
    setCallType(type);
    setShowVideoCall(true);
  };

  // Schedule a meeting
  const handleScheduleMeeting = async () => {
    if (!scheduleDate || !scheduleTime) return;

    setIsScheduling(true);
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      // Save meeting to backend
      await api.post('/meetings', {
        recipientId: otherUser._id,
        swapRequestId: activeChatId,
        scheduledAt: scheduledDateTime.toISOString()
      });

      // Send a system-like message to the chat
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
      }).format(scheduledDateTime);

      const content = `📅 Video Call Scheduled for ${formattedDate} - Click to Join`;
      const tempId = Date.now();

      const tempMessage = {
        _id: `temp-${tempId}`,
        content,
        sender: { _id: currentUserId, name: currentUser.name },
        createdAt: new Date().toISOString(),
        tempId,
        isPending: true
      };

      setMessages(prev => [...prev, tempMessage]);
      socketService.sendTyping(activeChatId, false);

      await api.post('/messages', {
        swapRequestId: activeChatId,
        content,
        tempId
      });

      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('');
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
      alert('Failed to schedule meeting. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Mobile back button
  const handleBack = () => {
    setActiveChatId(null);
    setShowSidebar(true);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '1.5rem', color: '#6b7280', fontWeight: 500 }}>Loading...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 72px)',
      background: '#f9fafb',
      overflow: 'hidden'
    }}>
      {/* ==================== SIDEBAR ==================== */}
      <div style={{
        width: showSidebar ? '420px' : '0',
        minWidth: showSidebar ? '420px' : '0',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '28px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1f2937' }}>
            Messages
          </h2>
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444',
            boxShadow: isConnected ? '0 0 0 4px #d1fae5' : '0 0 0 4px #fee2e2'
          }} />
        </div>

        {/* Chat List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}>
          {chats.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              textAlign: 'center'
            }}>
              <svg width="180" height="180" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" fill="url(#paint0_linear)" stroke="url(#paint1_linear)" strokeWidth="0.5" />
                <path d="M8 12C8 12.5523 7.55228 13 7 13C6.44772 13 6 12.5523 6 12C6 11.4477 6.44772 11 7 11C7.55228 11 8 11.4477 8 12Z" fill="white" />
                <path d="M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12Z" fill="white" />
                <path d="M18 12C18 12.5523 17.5523 13 17 13C16.4477 13 16 12.5523 16 12C16 11.4477 16.4477 11 17 11C17.5523 11 18 11.4477 18 12Z" fill="white" />
                <defs>
                  <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#667eea" />
                    <stop offset="1" stopColor="#764ba2" />
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#667eea" />
                    <stop offset="1" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
              </svg>
              <p style={{ color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 500 }}>
                No active conversations
              </p>
              <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>
                Accept a skill swap to start chatting!
              </p>
              <button
                onClick={() => navigate('/requests')}
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#667eea',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1.25rem'
                }}
              >
                View Requests
              </button>
            </div>
          ) : (
            chats.map(chat => (
              <ChatListItem
                key={chat._id}
                chat={chat}
                isActive={chat._id === activeChatId}
                onClick={() => setActiveChatId(chat._id)}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </div>

      {/* ==================== MAIN CHAT AREA ==================== */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        position: 'relative'
      }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Mobile back button */}
                <button
                  onClick={handleBack}
                  style={{
                    display: window.innerWidth < 768 ? 'flex' : 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.75rem'
                  }}
                >
                  <ArrowLeft size={24} color="#4b5563" />
                </button>

                <Avatar user={otherUser} size="md" showStatus={true} isOnline={onlineUsers.includes(String(otherUser?._id))} />

                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
                    {otherUser?.name || 'Unknown'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '1.125rem', color: otherUserTyping ? '#667eea' : '#6b7280', fontWeight: otherUserTyping ? 600 : 400, display: 'flex', alignItems: 'center' }}>
                    {otherUserTyping ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        typing
                        <span style={{ animation: 'bounceText 1.4s infinite ease-in-out both', animationDelay: '0s', display: 'inline-block', marginLeft: '1px' }}>.</span>
                        <span style={{ animation: 'bounceText 1.4s infinite ease-in-out both', animationDelay: '0.16s', display: 'inline-block', marginLeft: '1px' }}>.</span>
                        <span style={{ animation: 'bounceText 1.4s infinite ease-in-out both', animationDelay: '0.32s', display: 'inline-block', marginLeft: '1px' }}>.</span>
                        <style>{`
                          @keyframes bounceText {
                            0%, 80%, 100% { transform: translateY(0); }
                            40% { transform: translateY(-3px); }
                          }
                        `}</style>
                      </span>
                    ) : (onlineUsers.includes(String(otherUser?._id)) ? 'Online' : 'Offline')}
                  </p>
                </div>
              </div>

              {/* Call and Report buttons */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => handleCall('schedule')}
                  title="Schedule Call"
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fef3c7';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <Calendar size={22} color="#4b5563" />
                </button>
                <button
                  onClick={() => handleCall('audio')}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dbeafe';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <Phone size={22} color="#4b5563" />
                </button>
                <button
                  onClick={() => handleCall('video')}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dbeafe';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <Video size={22} color="#4b5563" />
                </button>
                <KebabMenu
                  actions={[
                    {
                      label: 'Report User',
                      icon: <AlertTriangle size={16} />,
                      destructive: true,
                      onClick: () => setShowReportModal(otherUser)
                    }
                  ]}
                />
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)'
            }}>
              <style>{`
                @keyframes messageSlide {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {messages.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '5rem',
                    marginBottom: '2rem'
                  }}>
                    <MessageSquarePlus size={64} color="#667eea" />
                  </div>
                  <h3 style={{ margin: '0 0 0.75rem 0', color: '#1f2937', fontSize: '2rem', fontWeight: 700 }}>
                    Start the conversation
                  </h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '1.375rem' }}>
                    Say hello to {otherUser?.name?.split(' ')[0]} and discuss your skill swap!
                  </p>
                </div>
              ) : (
                groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex} style={{ marginBottom: '12px' }}>
                    {group.map((msg, msgIndex) => {
                      const isMe = String(msg.sender?._id || msg.sender) === currentUserId;
                      const isFirst = msgIndex === 0;
                      const isLast = msgIndex === group.length - 1;

                      return (
                        <MessageBubble
                          key={msg._id || msg.tempId}
                          message={msg}
                          isMe={isMe}
                          isFirstInGroup={isFirst}
                          isLastInGroup={isLast}
                          showAvatar={isLast}
                          otherUser={otherUser}
                        />
                      );
                    })}
                  </div>
                ))
              )}

              {otherUserTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '24px 28px',
                borderTop: '1px solid #f3f4f6',
                background: 'white'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: '#f3f4f6',
                borderRadius: '32px',
                padding: '8px 8px 8px 24px',
                border: '1px solid transparent',
                transition: 'all 0.2s'
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={isConnected ? "Type a message..." : "Reconnecting..."}
                  disabled={!isConnected}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    padding: '16px 0',
                    fontSize: '1.25rem',
                    outline: 'none',
                    color: '#1f2937'
                  }}
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || !isConnected}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: 'none',
                    background: inputValue.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db',
                    color: 'white',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    transform: inputValue.trim() ? 'scale(1)' : 'scale(0.9)',
                    boxShadow: inputValue.trim() ? '0 4px 14px rgba(102, 126, 234, 0.4)' : 'none'
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </form>

            {/* Video Call Overlay */}
            {showVideoCall && (
              <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50
              }}>
                <VideoCall
                  socket={socketService.getSocket()}
                  currentUser={currentUser}
                  targetUser={otherUser}
                  callType={callType}
                  onClose={() => {
                    setShowVideoCall(false);
                    setIncomingCallForVideoCall(null);
                  }}
                  incomingCall={incomingCallForVideoCall}
                />
              </div>
            )}
          </>
        ) : (
          /* Empty State - No Chat Selected */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
          }}>
            <div style={{
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '7rem',
              marginBottom: '3rem',
              animation: 'float 6s ease-in-out infinite'
            }}>
              <MessageCircle size={96} color="#9ca3af" strokeWidth={1} />
            </div>
            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
              }
            `}</style>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '3rem', fontWeight: 800, color: '#1f2937' }}>
              Select a conversation
            </h2>
            <p style={{ margin: 0, color: '#6b7280', maxWidth: '400px', fontSize: '1.5rem', lineHeight: '1.6' }}>
              Choose a chat from the sidebar to start messaging with your skill swap partners
            </p>
          </div>
        )
        }
      </div >

      {/* Schedule Meeting Modal */}
      {
        showReportModal && otherUser && (
          <ReportModal
            reportedUser={otherUser}
            onClose={() => setShowReportModal(false)}
            onSuccess={() => {
              setShowReportModal(false);
              setReportSuccess('User reported successfully.');
              setTimeout(() => setReportSuccess(''), 3000);
            }}
          />
        )
      }

      {
        reportSuccess && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#10b981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            zIndex: 9999,
            fontWeight: 600,
            animation: 'slideUp 0.3s ease'
          }}>
            {reportSuccess}
          </div>
        )
      }

      {
        showScheduleModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              background: 'white', borderRadius: '24px', padding: '32px',
              width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
                Schedule Video Call
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Propose a time to swap skills with {otherUser?.name}.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Date</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1d5db',
                  fontSize: '1rem', outline: 'none', appearance: 'none', background: '#f9fafb'
                }} />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Time</label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #d1d5db',
                  fontSize: '1rem', outline: 'none', appearance: 'none', background: '#f9fafb'
                }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  disabled={isScheduling}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: '#f3f4f6', color: '#4b5563', fontWeight: 600, cursor: 'pointer'
                  }}
                >Cancel</button>
                <button
                  onClick={handleScheduleMeeting}
                  disabled={isScheduling || !scheduleDate || !scheduleTime}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: (!scheduleDate || !scheduleTime) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white', fontWeight: 600, cursor: (!scheduleDate || !scheduleTime) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

// Helper: Generate consistent color from string
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export default ChatPage;
