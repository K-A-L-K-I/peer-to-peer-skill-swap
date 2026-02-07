const User = require('../models/User');
const Report = require('../models/Report');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin users cannot be blocked' });
    }

    user.isBlocked = true;
    await user.save();

    return res.status(200).json({
      message: 'User blocked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = false;
    await user.save();

    return res.status(200).json({
      message: 'User unblocked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { status, targetType } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email role')
      .populate('reportedUser', 'name email role isBlocked')
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: reports.length,
      reports
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const takeActionOnReport = async (req, res) => {
  try {
    const { status, resolutionNote, blockReportedUser } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const allowedStatuses = ['in_review', 'resolved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Allowed values: in_review, resolved, rejected'
      });
    }

    const report = await Report.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    report.resolutionNote = resolutionNote ? resolutionNote.trim() : report.resolutionNote;
    report.resolvedBy = req.user._id;
    report.resolvedAt = status === 'resolved' || status === 'rejected' ? new Date() : null;

    if (status === 'in_review') {
      report.resolvedAt = null;
    }

    if (status === 'resolved' && blockReportedUser === true) {
      const user = await User.findById(report.reportedUser);
      if (user && user.role !== 'admin') {
        user.isBlocked = true;
        await user.save();
      }
    }

    await report.save();

    const updatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email role')
      .populate('reportedUser', 'name email role isBlocked')
      .populate('resolvedBy', 'name email role');

    return res.status(200).json({
      message: 'Report action updated successfully',
      report: updatedReport
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  blockUser,
  unblockUser,
  getAllReports,
  takeActionOnReport
};
