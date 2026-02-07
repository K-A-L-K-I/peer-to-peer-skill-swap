const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { sendSkillSwapRequest } = require('../controllers/swapRequestController');

const router = express.Router();

router.post('/', protect, sendSkillSwapRequest);

module.exports = router;
