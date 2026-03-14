import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socketService';
import NotificationDropdown from './NotificationDropdown';
import useAuthStore from '../store/authStore';
import {
    User,
    Compass,
    Inbox,
    MessageSquare,
    Settings,
    Bell,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ user, onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const activePage = location.pathname.substring(1) || 'profile';
    const updateUser = useAuthStore(state => state.updateUser);
    const refreshedRef = useRef(false);

    // Refresh user role ONCE on mount only — prevents infinite render loop
    useEffect(() => {
        if (refreshedRef.current || !user) return;
        refreshedRef.current = true;

        const refreshUser = async () => {
            try {
                const { data } = await api.get('/auth/profile');
                if (data.user) updateUser(data.user);
            } catch (_) { /* silently ignore */ }
        };
        refreshUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Notification badge — only depends on user (not updateUser)
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

    const navItems = [
        { key: 'profile', label: 'Profile', icon: <User size={24} /> },
        { key: 'search', label: 'Discover', icon: <Compass size={24} /> },
        { key: 'requests', label: 'Requests', icon: <Inbox size={24} /> },
        { key: 'chat', label: 'Messages', icon: <MessageSquare size={24} /> },
    ];

    if (user?.role === 'admin') {
        navItems.push({ key: 'admin', label: 'Admin', icon: <Settings size={24} /> });
    }

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand" onClick={() => navigate('/profile')}>
                    <div className="sidebar-logo">
                        <img src="/1000078980-removebg-preview.png" alt="SkillSwap" />
                    </div>
                    {!isCollapsed && <span className="sidebar-title">SkillSwap</span>}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.key}
                        className={`sidebar-item ${activePage === item.key ? 'active' : ''}`}
                        onClick={() => navigate(`/${item.key}`)}
                        title={isCollapsed ? item.label : ''}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-notifications-wrapper">
                    <button
                        className={`sidebar-bell ${showNotifications ? 'active' : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        <Bell size={24} />
                        {unreadCount > 0 && (
                            <span className="sidebar-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="sidebar-dropdown-container">
                            <NotificationDropdown
                                onClose={() => setShowNotifications(false)}
                                onUpdateCount={setUnreadCount}
                            />
                        </div>
                    )}
                </div>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} />
                        ) : (
                            <div className="sidebar-avatar-fallback">
                                {getInitials(user?.name)}
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="sidebar-user-details">
                            <span className="sidebar-user-name">{user?.name}</span>
                            <span className="sidebar-user-role">{user?.role === 'admin' ? 'Admin' : 'Member'}</span>
                        </div>
                    )}
                </div>

                <button
                    className="sidebar-logout"
                    onClick={onLogout}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <span className="sidebar-icon"><LogOut size={24} /></span>
                    {!isCollapsed && <span className="sidebar-label">Log Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
