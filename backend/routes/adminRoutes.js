const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAllUsers, blockUser, unblockUser } = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:userId/block', protect, adminOnly, blockUser);
router.patch('/users/:userId/unblock', protect, adminOnly, unblockUser);

module.exports = router;
