const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const CallHistory = require('../models/CallHistory');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');

const router = express.Router();

// Get call history for current user
router.get('/history', protect, async (req, res) => {
  try {
    const calls = await CallHistory.find({
      $or: [{ caller: req.user._id }, { callee: req.user._id }]
    })
      .populate('caller', 'name email profilePicture')
      .populate('callee', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: calls.length,
      calls: calls.map(call => ({
        ...call.toObject(),
        isOutgoing: call.caller._id.toString() === req.user._id.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch call history', error: error.message });
  }
});

// Get call statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await CallHistory.aggregate([
      {
        $match: {
          $or: [
            { caller: req.user._id },
            { callee: req.user._id }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// ── Report a call (in-call report button) ─────────────────────────────────────
router.post('/:callId/report', protect, async (req, res) => {
  try {
    const { reason = 'Harassment or Abuse', details = '', reportedUserId } = req.body;

    // Try to find the CallHistory — it may not exist yet if the call is still active
    const call = await CallHistory.findOne({ callId: req.params.callId })
      .populate('caller', 'name email')
      .populate('callee', 'name email');

    let reportedUser = null;
    let reportedName = 'Unknown user';

    if (call) {
      // Mark call as reported in DB
      call.reportedDuringCall = true;
      call.reportNote = details || reason;
      await call.save();

      const isCallerReporter = call.caller._id.toString() === req.user._id.toString();
      reportedUser = isCallerReporter ? call.callee._id : call.caller._id;
      reportedName = isCallerReporter ? call.callee.name : call.caller.name;
    } else if (reportedUserId) {
      // Call still active — use the userId sent from the frontend
      const ru = await User.findById(reportedUserId).select('name');
      reportedUser = reportedUserId;
      reportedName = ru?.name || 'the other user';
    } else {
      return res.status(400).json({ message: 'Could not identify reported user. Please try again.' });
    }

    // Create the Report so it shows in admin panel
    const report = await Report.create({
      reportedBy: req.user._id,
      reportedUser,
      targetType: 'user',
      targetId: reportedUser,
      reason,
      details: `[Video Call] ${details || reason}. Call ID: ${req.params.callId}.`,
      status: 'pending'
    });

    // Notify all admins in real-time
    const admins = await User.find({ role: 'admin' }).select('_id');
    const io = req.app.get('io');
    for (const admin of admins) {
      const notif = await Notification.create({
        user: admin._id,
        type: 'report',
        title: '🚨 In-Call Report Filed',
        body: `${req.user.name} reported an incident during a video call with ${reportedName}.`,
        relatedModel: 'Report',
        relatedId: report._id
      });
      if (io) io.to(admin._id.toString()).emit('new-notification', notif);
    }

    return res.status(201).json({ message: 'Report submitted successfully', reportId: report._id });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ── Post-call feedback (thumbsUp / thumbsDown) ────────────────────────────────
router.post('/:callId/feedback', protect, async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!['thumbsUp', 'thumbsDown'].includes(feedback)) {
      return res.status(400).json({ message: 'feedback must be thumbsUp or thumbsDown' });
    }

    const call = await CallHistory.findOne({ callId: req.params.callId });
    if (!call) return res.status(404).json({ message: 'Call not found' });

    call.postCallFeedback = feedback;
    await call.save();

    return res.status(200).json({ message: 'Feedback recorded', feedback });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;
