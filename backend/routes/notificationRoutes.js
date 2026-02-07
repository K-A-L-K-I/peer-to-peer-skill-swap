const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.patch('/read-all', protect, markAllNotificationsAsRead);
router.patch('/:id/read', protect, markNotificationAsRead);

module.exports = router;
