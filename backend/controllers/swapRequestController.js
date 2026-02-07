const User = require('../models/User');
const SkillSwapRequest = require('../models/SkillSwapRequest');

const sendSkillSwapRequest = async (req, res) => {
  try {
    const { toUser, offeredSkill, wantedSkill, message } = req.body;

    if (!toUser || !offeredSkill || !wantedSkill) {
      return res.status(400).json({
        message: 'toUser, offeredSkill, and wantedSkill are required'
      });
    }

    if (toUser === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot send a request to yourself' });
    }

    const receiver = await User.findById(toUser);

    if (!receiver) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    if (receiver.isBlocked) {
      return res.status(403).json({ message: 'Cannot send request to a blocked user' });
    }

    const existingPending = await SkillSwapRequest.findOne({
      fromUser: req.user._id,
      toUser,
      offeredSkill: offeredSkill.trim(),
      wantedSkill: wantedSkill.trim(),
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        message: 'A pending request with these skills already exists for this user'
      });
    }

    const swapRequest = await SkillSwapRequest.create({
      fromUser: req.user._id,
      toUser,
      offeredSkill: offeredSkill.trim(),
      wantedSkill: wantedSkill.trim(),
      message: message ? message.trim() : ''
    });

    const populatedRequest = await SkillSwapRequest.findById(swapRequest._id)
      .populate('fromUser', 'name email skillsOffered skillsWanted role isBlocked')
      .populate('toUser', 'name email skillsOffered skillsWanted role isBlocked');

    return res.status(201).json({
      message: 'Skill swap request sent successfully',
      request: populatedRequest
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const respondToSkillSwapRequest = async (req, res, newStatus) => {
  const swapRequest = await SkillSwapRequest.findById(req.params.id);

  if (!swapRequest) {
    return res.status(404).json({ message: 'Skill swap request not found' });
  }

  if (String(swapRequest.toUser) !== String(req.user._id)) {
    return res
      .status(403)
      .json({ message: 'Only the recipient can respond to this request' });
  }

  if (swapRequest.status !== 'pending') {
    return res
      .status(400)
      .json({ message: `Request already ${swapRequest.status}` });
  }

  swapRequest.status = newStatus;
  swapRequest.respondedAt = new Date();

  await swapRequest.save();

  const populatedRequest = await SkillSwapRequest.findById(swapRequest._id)
    .populate('fromUser', 'name email skillsOffered skillsWanted role isBlocked')
    .populate('toUser', 'name email skillsOffered skillsWanted role isBlocked');

  return res.status(200).json({
    message: `Skill swap request ${newStatus}`,
    request: populatedRequest
  });
};

const acceptSkillSwapRequest = async (req, res) => {
  try {
    return respondToSkillSwapRequest(req, res, 'accepted');
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const rejectSkillSwapRequest = async (req, res) => {
  try {
    return respondToSkillSwapRequest(req, res, 'rejected');
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  sendSkillSwapRequest,
  acceptSkillSwapRequest,
  rejectSkillSwapRequest
};
