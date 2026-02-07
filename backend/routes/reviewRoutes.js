const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createReview, getUserReviews } = require('../controllers/reviewController');

const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', getUserReviews);

module.exports = router;
