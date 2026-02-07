const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  sendSkillSwapRequest,
  acceptSkillSwapRequest,
  rejectSkillSwapRequest
} = require('../controllers/swapRequestController');

const router = express.Router();

router.post('/', protect, sendSkillSwapRequest);
router.patch('/:id/accept', protect, acceptSkillSwapRequest);
router.patch('/:id/reject', protect, rejectSkillSwapRequest);

module.exports = router;
