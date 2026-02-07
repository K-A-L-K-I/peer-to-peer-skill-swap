const Review = require('../models/Review');
const SkillSwapRequest = require('../models/SkillSwapRequest');

const createReview = async (req, res) => {
  try {
    const { swapRequestId, reviewedUser, rating, comment } = req.body;

    if (!swapRequestId || !reviewedUser || rating === undefined) {
      return res.status(400).json({
        message: 'swapRequestId, reviewedUser, and rating are required'
      });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    const swapRequest = await SkillSwapRequest.findById(swapRequestId);

    if (!swapRequest) {
      return res.status(404).json({ message: 'Skill swap request not found' });
    }

    const isParticipant =
      String(swapRequest.fromUser) === String(req.user._id) ||
      String(swapRequest.toUser) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this skill swap request' });
    }

    if (swapRequest.status !== 'completed') {
      return res.status(403).json({
        message: 'Reviews are allowed only after the skill swap session is completed'
      });
    }

    const oppositeUserId =
      String(swapRequest.fromUser) === String(req.user._id)
        ? String(swapRequest.toUser)
        : String(swapRequest.fromUser);

    if (String(reviewedUser) !== oppositeUserId) {
      return res.status(400).json({
        message: 'You can only review the other participant of this swap request'
      });
    }

    const existingReview = await Review.findOne({
      reviewer: req.user._id,
      swapRequest: swapRequestId
    });

    if (existingReview) {
      return res.status(400).json({
        message: 'You have already submitted a review for this swap request'
      });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      reviewedUser,
      swapRequest: swapRequestId,
      rating: numericRating,
      comment: comment ? comment.trim() : ''
    });

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name email')
      .populate('reviewedUser', 'name email')
      .populate('swapRequest', 'offeredSkill wantedSkill status');

    return res.status(201).json({
      message: 'Review submitted successfully',
      review: populatedReview
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUser: userId })
      .populate('reviewer', 'name email')
      .populate('swapRequest', 'offeredSkill wantedSkill status')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews === 0
        ? 0
        : reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

    return res.status(200).json({
      totalReviews,
      averageRating: Number(avgRating.toFixed(2)),
      reviews
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  createReview,
  getUserReviews
};
