const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { reportUser } = require('../controllers/reportController');

const router = express.Router();

router.post('/user', protect, reportUser);

module.exports = router;
