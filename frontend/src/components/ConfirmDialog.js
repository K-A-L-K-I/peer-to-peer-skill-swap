import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog — a reusable confirmation modal for destructive admin actions.
 *
 * Props:
 *   isOpen      Boolean
 *   title       String
 *   message     String
 *   confirmText String  (default: "Confirm")
 *   cancelText  String  (default: "Cancel")
 *   variant     "danger" | "warning" | "info"  (default: "danger")
 *   onConfirm   () => void
 *   onCancel    () => void
 */
function ConfirmDialog({
    isOpen,
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}) {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const colors = {
        danger: { icon: '#ef4444', btn: '#ef4444', btnHover: '#dc2626', ring: 'rgba(239,68,68,0.15)' },
        warning: { icon: '#f59e0b', btn: '#f59e0b', btnHover: '#d97706', ring: 'rgba(245,158,11,0.15)' },
        info: { icon: '#3b82f6', btn: '#3b82f6', btnHover: '#2563eb', ring: 'rgba(59,130,246,0.15)' },
    }[variant];

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
                animation: 'fadeIn 0.15s ease'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                    animation: 'slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)'
                }}
            >
                {/* Top color strip */}
                <div style={{ height: '4px', background: colors.btn }} />

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {/* Close button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#9ca3af', padding: '4px', borderRadius: '6px',
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Icon */}
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: colors.ring,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1.25rem'
                    }}>
                        <AlertTriangle size={26} color={colors.icon} strokeWidth={2} />
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: '0 0 0.625rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                        {title}
                    </h3>

                    {/* Message */}
                    <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.6 }}>
                        {message}
                    </p>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1, padding: '0.75rem 1rem', borderRadius: '12px',
                                border: '1.5px solid #e5e7eb', background: 'white',
                                color: '#374151', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.9rem', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                flex: 1, padding: '0.75rem 1rem', borderRadius: '12px',
                                border: 'none', background: colors.btn,
                                color: 'white', fontWeight: 700, cursor: 'pointer',
                                fontSize: '0.9rem', transition: 'all 0.15s',
                                boxShadow: `0 4px 12px ${colors.ring}`
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = colors.btnHover}
                            onMouseLeave={e => e.currentTarget.style.background = colors.btn}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
        </div>
    );
}

export default ConfirmDialog;
