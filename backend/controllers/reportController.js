const Report = require('../models/Report');
const User = require('../models/User');

const reportUser = async (req, res) => {
  try {
    const { reportedUser, reason, details } = req.body;

    if (!reportedUser || !reason || !reason.trim()) {
      return res.status(400).json({
        message: 'reportedUser and reason are required'
      });
    }

    if (String(reportedUser) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot report yourself' });
    }

    const userToReport = await User.findById(reportedUser);

    if (!userToReport) {
      return res.status(404).json({ message: 'User to report not found' });
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      reportedUser,
      targetType: 'user',
      targetId: reportedUser,
      reason: reason.trim(),
      details: details ? details.trim() : ''
    });

    const populatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email role')
      .populate('reportedUser', 'name email role');

    return res.status(201).json({
      message: 'User reported successfully',
      report: populatedReport
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  reportUser
};
