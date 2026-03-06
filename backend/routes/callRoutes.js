const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const CallHistory = require('../models/CallHistory');

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

module.exports = router;
