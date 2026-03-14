const User = require('../models/User');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

// Helper to create audit entries without blocking the response
const logAction = (adminId, action, opts = {}) => {
  AuditLog.create({ admin: adminId, action, ...opts }).catch(err =>
    console.error('AuditLog write failed:', err.message)
  );
};

// Helper to create a notification and emit it via socket
const sendNotification = async (app, userId, { type = 'report', title, body, relatedId }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      relatedModel: 'Report',
      relatedId
    });
    const io = app.get('io');
    if (io) {
      io.to(userId.toString()).emit('new-notification', notification);
    }
  } catch (err) {
    console.error('Notification send failed:', err.message);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Admin users cannot be blocked' });

    user.isBlocked = true;
    await user.save();

    logAction(req.user._id, 'block_user', {
      targetUser: user._id,
      note: `Blocked user ${user.name} (${user.email})`
    });

    return res.status(200).json({
      message: 'User blocked successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isBlocked: user.isBlocked }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = false;
    await user.save();

    logAction(req.user._id, 'unblock_user', {
      targetUser: user._id,
      note: `Unblocked user ${user.name} (${user.email})`
    });

    return res.status(200).json({
      message: 'User unblocked successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isBlocked: user.isBlocked }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { status, targetType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;

    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email role')
      .populate('reportedUser', 'name email role isBlocked')
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: reports.length, reports });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const takeActionOnReport = async (req, res) => {
  try {
    const { status, resolutionNote, blockReportedUser } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });

    const allowedStatuses = ['in_review', 'resolved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Allowed values: in_review, resolved, rejected' });
    }

    const report = await Report.findById(req.params.reportId)
      .populate('reportedBy', 'name email')
      .populate('reportedUser', 'name email role isBlocked');
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    report.resolutionNote = resolutionNote ? resolutionNote.trim() : report.resolutionNote;
    report.resolvedBy = req.user._id;
    report.resolvedAt = (status === 'resolved' || status === 'rejected') ? new Date() : null;
    if (status === 'in_review') report.resolvedAt = null;

    let reportedUserBlocked = false;
    if (status === 'resolved' && blockReportedUser === true) {
      const user = await User.findById(report.reportedUser._id || report.reportedUser);
      if (user && user.role !== 'admin') {
        user.isBlocked = true;
        await user.save();
        reportedUserBlocked = true;
        logAction(req.user._id, 'block_user', {
          targetUser: user._id,
          targetReport: report._id,
          note: `Blocked via report resolution: ${user.name}`
        });
      }
    }

    await report.save();

    const actionMap = { resolved: 'resolve_report', rejected: 'reject_report', in_review: 'review_report' };
    logAction(req.user._id, actionMap[status], {
      targetReport: report._id,
      targetUser: report.reportedUser._id || report.reportedUser,
      note: resolutionNote || `Changed report status to ${status}`
    });

    // ── Send Notifications ─────────────────────────────────────────────────────
    const reportedName = report.reportedUser?.name || 'the user';

    if (status === 'resolved') {
      // Notify reporter: action was taken
      if (report.reportedBy) {
        sendNotification(req.app, report.reportedBy._id || report.reportedBy, {
          title: '✅ Report Resolved',
          body: `Your report against ${reportedName} has been reviewed and action has been taken. Thank you for keeping the community safe.`,
          relatedId: report._id
        });
      }
      // Notify reported user if they were blocked
      if (reportedUserBlocked && report.reportedUser) {
        sendNotification(req.app, report.reportedUser._id || report.reportedUser, {
          title: '🚫 Account Suspended',
          body: 'Your account has been suspended due to a violation of our community guidelines. Contact support if you believe this is a mistake.',
          relatedId: report._id
        });
      }
    } else if (status === 'rejected') {
      // Notify reporter: no violation found
      if (report.reportedBy) {
        sendNotification(req.app, report.reportedBy._id || report.reportedBy, {
          title: 'ℹ️ Report Reviewed',
          body: `Your report against ${reportedName} was reviewed. We did not find a policy violation at this time. Thank you for your concern.`,
          relatedId: report._id
        });
      }
    } else if (status === 'in_review') {
      // Notify reporter: under review
      if (report.reportedBy) {
        sendNotification(req.app, report.reportedBy._id || report.reportedBy, {
          title: '🔍 Report Under Review',
          body: `Your report against ${reportedName} is now being actively reviewed by our moderation team.`,
          relatedId: report._id
        });
      }
    }

    const updatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email role')
      .populate('reportedUser', 'name email role isBlocked')
      .populate('resolvedBy', 'name email role');

    return res.status(200).json({ message: 'Report action updated successfully', report: updatedReport });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await AuditLog.find()
      .populate('admin', 'name email')
      .populate('targetUser', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({ count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getConversationBetween = async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    })
      .populate('sender', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .sort({ createdAt: 1 })
      .limit(200);

    return res.status(200).json({ count: messages.length, messages });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  blockUser,
  unblockUser,
  getAllReports,
  takeActionOnReport,
  getAuditLogs,
  getConversationBetween
};
