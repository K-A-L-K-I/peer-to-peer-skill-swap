import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socketService';
import { Inbox, Handshake, Star, MessageCircle } from 'lucide-react';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // Listen for new real-time notifications
        const unsubNotification = socketService.on('new-notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
        });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            unsubNotification();
        };
    }, [onClose]);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            handleMarkAsRead(notif._id, { stopPropagation: () => { } });
        }

        onClose();

        if (notif.type === 'swap_request') {
            navigate('/requests');
        } else if (notif.type === 'review_received') {
            navigate('/profile');
        } else if (
            notif.type === 'message' ||
            notif.type === 'new_message' ||
            notif.relatedModel === 'SkillSwapRequest'
        ) {
            // Navigate to chat and highlight the specific conversation
            navigate('/chat', { state: { swapRequestId: notif.relatedId } });
        } else if (notif.relatedId) {
            // Fallback: any notification with a related entity goes to chat
            navigate('/chat', { state: { swapRequestId: notif.relatedId } });
        }
    };

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="notification-dropdown" ref={dropdownRef}>
            <div className="notification-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                    <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                        Mark all read
                    </button>
                )}
            </div>

            <div className="notification-list">
                {loading ? (
                    <div className="notification-loading">
                        <span className="spinner-small" /> Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                        <div className="empty-icon"><Inbox size={48} strokeWidth={1} color="#9ca3af" /></div>
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif._id}
                            className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                        >
                            <div className="notification-icon">
                                {notif.type === 'swap_request' ? <Handshake size={20} color="#4f46e5" /> :
                                    notif.type === 'review_received' ? <Star size={20} color="#eab308" /> :
                                        <MessageCircle size={20} color="#10b981" />}
                            </div>
                            <div className="notification-content">
                                <h4>{notif.title}</h4>
                                <p>{notif.body}</p>
                                <span className="notification-time">{formatTimeAgo(notif.createdAt)}</span>
                            </div>
                            {!notif.isRead && (
                                <div className="unread-dot-indicator" title="Mark as read" onClick={(e) => handleMarkAsRead(notif._id, e)} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="notification-footer" onClick={onClose}>
                    <button onClick={() => navigate('/requests')}>View All Activity</button>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
