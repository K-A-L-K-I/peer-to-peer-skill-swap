const Message = require('../models/Message');
const SkillSwapRequest = require('../models/SkillSwapRequest');

const getAcceptedSwapRequestForUser = async (swapRequestId, userId) => {
  const swapRequest = await SkillSwapRequest.findById(swapRequestId);

  if (!swapRequest) {
    return { error: { status: 404, message: 'Skill swap request not found' } };
  }

  const isParticipant =
    String(swapRequest.fromUser) === String(userId) ||
    String(swapRequest.toUser) === String(userId);

  if (!isParticipant) {
    return {
      error: { status: 403, message: 'You are not part of this skill swap request' }
    };
  }

  if (swapRequest.status !== 'accepted') {
    return {
      error: {
        status: 403,
        message: 'Messages are allowed only after the skill swap request is accepted'
      }
    };
  }

  return { swapRequest };
};

const sendMessage = async (req, res) => {
  try {
    const { swapRequestId, content } = req.body;

    if (!swapRequestId || !content || !content.trim()) {
      return res.status(400).json({
        message: 'swapRequestId and non-empty content are required'
      });
    }

    const result = await getAcceptedSwapRequestForUser(swapRequestId, req.user._id);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const { swapRequest } = result;

    const receiverId =
      String(swapRequest.fromUser) === String(req.user._id)
        ? swapRequest.toUser
        : swapRequest.fromUser;

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      swapRequest: swapRequest._id,
      content: content.trim()
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate('swapRequest', 'status offeredSkill wantedSkill');

    return res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getMessagesBySwapRequest = async (req, res) => {
  try {
    const { swapRequestId } = req.params;

    const result = await getAcceptedSwapRequestForUser(swapRequestId, req.user._id);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const messages = await Message.find({ swapRequest: swapRequestId })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: messages.length,
      messages
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getMessagesBySwapRequest
};
