const Notification = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((item) => !item.isRead).length;

    return res.status(200).json({
      unreadCount,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (String(notification.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this notification' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const now = new Date();

    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: now } }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
