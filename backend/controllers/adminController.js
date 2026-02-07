const User = require('../models/User');

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

module.exports = {
  getAllUsers,
  blockUser,
  unblockUser
};
