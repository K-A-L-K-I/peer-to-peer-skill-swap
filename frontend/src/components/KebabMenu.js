import React, { useState, useRef, useEffect } from 'react';
import './KebabMenu.css';

const KebabMenu = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close the menu if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleActionClick = (e, onClick) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        onClick();
    };

    return (
        <div className="kebab-menu-container" ref={menuRef}>
            <button
                className={`kebab-trigger ${isOpen ? 'active' : ''}`}
                onClick={toggleMenu}
                aria-label="More options"
            >
                &#8942;
            </button>

            {isOpen && (
                <div className="kebab-dropdown">
                    <ul className="kebab-list">
                        {actions.map((action, index) => (
                            <li key={index} className="kebab-item">
                                <button
                                    className={`kebab-action-btn ${action.destructive ? 'destructive' : ''}`}
                                    onClick={(e) => handleActionClick(e, action.onClick)}
                                >
                                    {action.icon && <span className="kebab-icon">{action.icon}</span>}
                                    {action.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default KebabMenu;
