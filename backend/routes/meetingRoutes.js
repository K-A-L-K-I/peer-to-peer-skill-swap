const express = require('express');
const { scheduleMeeting, getMeetingsForChat } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.post('/', scheduleMeeting);
router.get('/chat/:swapRequestId', getMeetingsForChat);

module.exports = router;
