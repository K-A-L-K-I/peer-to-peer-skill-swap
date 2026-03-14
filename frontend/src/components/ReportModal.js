import React, { useState } from 'react';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';
import './ReportModal.css';

const ReportModal = ({ reportedUser, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const REASON_OPTIONS = [
        { value: '', label: 'Select a reason...' },
        { value: 'Harassment or Abuse', label: 'Harassment or Abuse' },
        { value: 'Inappropriate Content', label: 'Inappropriate Content' },
        { value: 'Spam or Scam', label: 'Spam or Scam' },
        { value: 'Fake Profile', label: 'Fake Profile' },
        { value: 'Other', label: 'Other' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            setError('Please select a reason');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post('/reports/user', {
                reportedUser: reportedUser._id || reportedUser.id,
                reason,
                details
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit report');
            setLoading(false);
        }
    };

    return (
        <div className="report-modal-overlay">
            <div className="report-modal-content">
                <button className="report-modal-close" onClick={onClose} disabled={loading}>
                    &times;
                </button>
                <div className="report-modal-header">
                    <div className="report-icon"><AlertTriangle size={32} color="#ef4444" /></div>
                    <div>
                        <h2 className="report-modal-title">Report User</h2>
                        <p className="report-modal-subtitle">Reporting {reportedUser.name}</p>
                    </div>
                </div>

                {error && <div className="report-modal-error">{error}</div>}

                <form onSubmit={handleSubmit} className="report-modal-form">
                    <div className="form-group">
                        <label htmlFor="report-reason">Reason for reporting</label>
                        <select
                            id="report-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={loading}
                            className="report-select"
                        >
                            {REASON_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="report-details">Additional details (Optional)</label>
                        <textarea
                            id="report-details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Please provide any additional context or details..."
                            disabled={loading}
                            rows="4"
                            className="report-textarea"
                        />
                    </div>

                    <div className="report-modal-warning">
                        Your report is anonymous. If you are in immediate danger, please contact local authorities.
                    </div>

                    <div className="report-modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-danger" disabled={loading || !reason}>
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
