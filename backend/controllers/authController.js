const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const registerUser = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const { name, email, password, skillsOffered, skillsWanted } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      skillsOffered: Array.isArray(skillsOffered) ? skillsOffered : [],
      skillsWanted: Array.isArray(skillsWanted) ? skillsWanted : []
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted
      }
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({ message: firstError?.message || 'Invalid input' });
    }

    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked' });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};




const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        message: 'If this email is registered, a reset link has been sent'
      });
    }

    // Generate raw reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage (SHA256 produces 64 hex chars)
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    console.log('Generated reset token (raw):', resetToken);
    console.log('Hashed token (stored in DB):', resetTokenHashed);

    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Create reset URL with RAW token (not hashed)
    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetURL = `${clientURL}/reset-password/${resetToken}`;

    console.log('Reset URL sent to user:', resetURL);

    const message = `Hello ${user.name},

You requested a password reset for your Skill Swap account.

Click the link below to reset your password:
${resetURL}

This link will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
Skill Swap Team`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You requested a password reset for your Skill Swap account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetURL}" 
           style="display: inline-block; background: #111827; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  margin: 16px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #2563eb;">${resetURL}</p>
        <p style="color: #6b7280; font-size: 0.9em;">
          This link will expire in 10 minutes.<br>
          If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 0.8em;">
          Skill Swap Team
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Skill Swap - Password Reset Request',
        text: message,
        html: htmlMessage
      });

      return res.status(200).json({ 
        message: 'Reset link sent to your email. Please check your inbox (and spam folder).' 
      });
    } catch (emailError) {
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;
      await user.save({ validateBeforeSave: false });
      
      console.error('Email send error:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params; // This is the raw token from URL

    console.log('Received raw token from URL:', token);
    console.log('Token length:', token?.length);

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (!token || token.length !== 64) {
      return res.status(400).json({ message: 'Invalid reset token format' });
    }

    // Hash the received token to match DB storage
    const tokenHashed = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('Hashed token for DB lookup:', tokenHashed);

    const user = await User.findOne({
      resetPasswordToken: tokenHashed,
      resetPasswordExpire: { $gt: Date.now() }
    });

    console.log('User found:', user ? 'Yes' : 'No');
    console.log('Current time:', new Date().toISOString());
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    console.log('Token expires at:', new Date(user.resetPasswordExpire).toISOString());

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    console.log('Password reset successful for user:', user.email);

    return res.status(200).json({ 
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    return res.status(200).json({
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, password, skillsOffered, skillsWanted } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    user.name = name || user.name;
    user.email = email ? email.toLowerCase() : user.email;
    user.skillsOffered = Array.isArray(skillsOffered)
      ? skillsOffered
      : user.skillsOffered;
    user.skillsWanted = Array.isArray(skillsWanted)
      ? skillsWanted
      : user.skillsWanted;

    if (password) {
      user.password = password;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isBlocked: updatedUser.isBlocked,
        skillsOffered: updatedUser.skillsOffered,
        skillsWanted: updatedUser.skillsWanted
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile
};
