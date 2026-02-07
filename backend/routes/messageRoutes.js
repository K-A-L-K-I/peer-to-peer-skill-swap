const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  sendMessage,
  getMessagesBySwapRequest
} = require('../controllers/messageController');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:swapRequestId', protect, getMessagesBySwapRequest);

module.exports = router;
