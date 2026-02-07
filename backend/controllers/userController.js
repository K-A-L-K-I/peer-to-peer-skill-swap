const User = require('../models/User');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchUsersBySkill = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();

    if (!keyword) {
      return res.status(400).json({ message: 'keyword query parameter is required' });
    }

    const regex = new RegExp(escapeRegex(keyword), 'i');

    const users = await User.find({
      isBlocked: false,
      $or: [{ skillsOffered: regex }, { skillsWanted: regex }]
    }).select('-password');

    return res.status(200).json({
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  searchUsersBySkill
};
