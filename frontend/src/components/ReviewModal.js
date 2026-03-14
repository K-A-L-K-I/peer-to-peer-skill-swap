import React, { useState } from 'react';
import api from '../services/api';
import './ReviewModal.css';

const ReviewModal = ({ swapRequest, reviewedUser, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post('/reviews', {
                swapRequestId: swapRequest._id,
                reviewedUser: reviewedUser._id,
                rating,
                comment
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit review');
            setLoading(false);
        }
    };

    return (
        <div className="review-modal-overlay">
            <div className="review-modal-content">
                <button className="review-modal-close" onClick={onClose} disabled={loading}>
                    &times;
                </button>
                <h2 className="review-modal-title">Rate your experience</h2>
                <p className="review-modal-subtitle">How was your skill swap with {reviewedUser.name}?</p>

                {error && <div className="review-modal-error">{error}</div>}

                <form onSubmit={handleSubmit} className="review-modal-form">
                    <div className="star-rating-container">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                                key={star}
                                className={`star-icon ${(hoverRating || rating) >= star ? 'filled' : ''}`}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        ))}
                    </div>

                    <div className="form-group">
                        <label htmlFor="review-comment">Leave a review (optional)</label>
                        <textarea
                            id="review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What did you learn? How was their teaching style?"
                            disabled={loading}
                            rows="4"
                        />
                    </div>

                    <div className="review-modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || rating === 0}>
                            {loading ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
