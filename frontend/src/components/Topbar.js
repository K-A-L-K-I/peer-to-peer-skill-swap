import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socketService';
import NotificationDropdown from './NotificationDropdown';
import { Bell, LogOut } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ user, onLogout }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    // Notification badge
    useEffect(() => {
        if (!user) return;

        const fetchUnread = async () => {
            try {
                const { data } = await api.get('/notifications');
                const count = data.notifications.filter(n => !n.isRead).length;
                setUnreadCount(count);
            } catch (err) {
                console.error('Failed to fetch notifications for badge:', err);
            }
        };
        fetchUnread();

        const unsubNotification = socketService.on('new-notification', () => {
            setUnreadCount(prev => prev + 1);
        });

        return () => unsubNotification();
    }, [user]);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <header className="topbar">
            {/* Logo Section */}
            <div className="topbar-brand" onClick={() => navigate('/profile')}>
                <div className="topbar-logo">
                    <img src="/1000078980-removebg-preview.png" alt="SkillSwap" />
                </div>
                <span className="topbar-title">SkillSwap</span>
            </div>


            {/* Right Section (User Actions) */}
            <div className="topbar-actions">
                <div className="topbar-notifications-wrapper">
                    <button
                        className={`topbar-btn ${showNotifications ? 'active' : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        <Bell size={22} />
                        {unreadCount > 0 && (
                            <span className="topbar-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="topbar-dropdown-container">
                            <NotificationDropdown
                                onClose={() => setShowNotifications(false)}
                                onUpdateCount={setUnreadCount}
                            />
                        </div>
                    )}
                </div>

                <div className="topbar-divider"></div>

                <div className="topbar-user" onClick={() => navigate('/profile')}>
                    <div className="topbar-avatar">
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user?.name} />
                        ) : (
                            <div className="topbar-avatar-fallback">
                                {getInitials(user?.name)}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    className="topbar-logout"
                    onClick={onLogout}
                    title="Log Out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
