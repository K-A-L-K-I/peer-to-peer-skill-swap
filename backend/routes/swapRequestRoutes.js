const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  sendSkillSwapRequest,
  acceptSkillSwapRequest,
  rejectSkillSwapRequest
} = require('../controllers/swapRequestController');
const SkillSwapRequest = require('../models/SkillSwapRequest');

const router = express.Router();

// NEW: Get my requests (sent and received)
router.get('/my-requests', protect, async (req, res) => {
  try {
    const received = await SkillSwapRequest.find({ toUser: req.user._id })
      .populate('fromUser', 'name email profilePicture skillsOffered skillsWanted')
      .populate('toUser', 'name email profilePicture')
      .sort({ createdAt: -1 });
      
    const sent = await SkillSwapRequest.find({ fromUser: req.user._id })
      .populate('fromUser', 'name email profilePicture')
      .populate('toUser', 'name email profilePicture skillsOffered skillsWanted')
      .sort({ createdAt: -1 });
    
    res.json({ received, sent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// NEW: Get single request by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await SkillSwapRequest.findById(req.params.id)
      .populate('fromUser', 'name email profilePicture skillsOffered skillsWanted')
      .populate('toUser', 'name email profilePicture skillsOffered skillsWanted');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Verify user is part of this request
    if (String(request.fromUser._id) !== String(req.user._id) && 
        String(request.toUser._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this request' });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch request', error: error.message });
  }
});

router.post('/', protect, sendSkillSwapRequest);
router.patch('/:id/accept', protect, acceptSkillSwapRequest);
router.patch('/:id/reject', protect, rejectSkillSwapRequest);

module.exports = router;
