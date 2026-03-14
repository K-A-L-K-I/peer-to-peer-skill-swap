const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  blockUser,
  unblockUser,
  getAllReports,
  takeActionOnReport,
  getAuditLogs,
  getConversationBetween
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:userId/block', protect, adminOnly, blockUser);
router.patch('/users/:userId/unblock', protect, adminOnly, unblockUser);
router.get('/reports', protect, adminOnly, getAllReports);
router.patch('/reports/:reportId/action', protect, adminOnly, takeActionOnReport);
router.get('/audit-logs', protect, adminOnly, getAuditLogs);
router.get('/conversation/:user1Id/:user2Id', protect, adminOnly, getConversationBetween);

module.exports = router;
