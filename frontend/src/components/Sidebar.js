import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import {
    User,
    Compass,
    Inbox,
    MessageSquare,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ user }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
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

    const navItems = [
        { key: 'profile', label: 'Profile', icon: <User size={24} /> },
        { key: 'search', label: 'Discover', icon: <Compass size={24} /> },
        { key: 'requests', label: 'Requests', icon: <Inbox size={24} /> },
        { key: 'chat', label: 'Messages', icon: <MessageSquare size={24} /> },
    ];

    if (user?.role === 'admin') {
        navItems.push({ key: 'admin', label: 'Admin', icon: <Settings size={24} /> });
    }

    return (
        <aside className={`sidebar enterprise-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-toggle-container">
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
        </aside>
    );
};

export default Sidebar;
