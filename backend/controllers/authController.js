const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { isAuthorizedEmail, generateVerificationToken, hashToken } = require('../utils/verifyEmail');

const MAX_FILE_SIZE = 2 * 1024 * 1024;

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

    const { name, email, password, skillsOffered, skillsWanted, profilePicture } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    // Validate email domain
    const emailCheck = isAuthorizedEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ 
        message: `Email not authorized: ${emailCheck.reason}` 
      });
    }

    // Validate profile picture size
    if (profilePicture && profilePicture.length > MAX_FILE_SIZE * 1.4) {
      return res.status(400).json({ message: 'Profile picture too large. Max 2MB.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const hashedToken = hashToken(verificationToken);

    const user = await User.create({
      name,
      email,
      password,
      profilePicture: profilePicture || null,
      skillsOffered: Array.isArray(skillsOffered) ? skillsOffered : [],
      skillsWanted: Array.isArray(skillsWanted) ? skillsWanted : [],
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send verification email
    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const verifyURL = `${clientURL}/verify-email/${verificationToken}`;

    const message = `Hello ${name},

Welcome to Skill Swap! Please verify your email address to complete registration.

Click the link below to verify:
${verifyURL}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
Skill Swap Team`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Skill Swap!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Please verify your email address to complete your registration.</p>
        <a href="${verifyURL}" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                  margin: 16px 0; font-weight: 600;">
          Verify Email Address
        </a>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #2563eb;">${verifyURL}</p>
        <p style="color: #6b7280; font-size: 0.9em;">
          This link will expire in 24 hours.<br>
          If you didn't create this account, please ignore this email.
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
        subject: 'Skill Swap - Verify Your Email',
        text: message,
        html: htmlMessage
      });

      return res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: false
        }
      });
    } catch (emailError) {
      // If email fails, still create user but mark for retry
      console.error('Verification email failed:', emailError);
      return res.status(201).json({
        message: 'Account created but verification email failed. Please request a new verification email.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: false
        }
      });
    }
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

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please request a new one.' 
      });
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully! You can now log in.',
      user: {
        _id: user._id,
        email: user.email,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new token
    const verificationToken = generateVerificationToken();
    const hashedToken = hashToken(verificationToken);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send email
    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const verifyURL = `${clientURL}/verify-email/${verificationToken}`;

    const message = `Hello ${user.name},

Please verify your email address for Skill Swap.

Click the link below:
${verifyURL}

This link will expire in 24 hours.

Best regards,
Skill Swap Team`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <a href="${verifyURL}" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                  margin: 16px 0; font-weight: 600;">
          Verify Email Address
        </a>
        <p style="color: #6b7280; font-size: 0.9em;">
          This link will expire in 24 hours.
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Skill Swap - Verify Your Email',
      text: message,
      html: htmlMessage
    });

    return res.status(200).json({
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
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

    // Check if email is verified
    if (!user.isEmailVerified) {
      const isLegacyUser = user.emailVerificationToken || user.emailVerificationExpire;
      
      if (isLegacyUser) {
        return res.status(403).json({ 
          message: 'Please verify your email before logging in. Check your inbox or request a new verification email.',
          needsVerification: true,
          verificationType: 'legacy',
          email: user.email
        });
      } else {
        return res.status(403).json({ 
          message: 'Account verification incomplete. Please contact support.',
          needsVerification: true,
          verificationType: 'unknown',
          email: user.email
        });
      }
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
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
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
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const hashedToken = hashToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetURL = `${clientURL}/reset-password/${resetToken}`;

    const message = `Hello ${user.name},

You requested a password reset for your Skill Swap account.

Click the link below to reset your password:
${resetURL}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
Skill Swap Team`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You requested a password reset for your Skill Swap account.</p>
        <a href="${resetURL}" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                  margin: 16px 0; font-weight: 600;">
          Reset Password
        </a>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #2563eb;">${resetURL}</p>
        <p style="color: #6b7280; font-size: 0.9em;">
          This link will expire in 1 hour.<br>
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Skill Swap - Password Reset',
      text: message,
      html: htmlMessage
    });

    return res.status(200).json({
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || token.length !== 64) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please request a new one.' 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successful! You can now log in with your new password.'
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
    const { name, email, password, skillsOffered, skillsWanted, profilePicture } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If changing email, verify new email is authorized
    if (email && email.toLowerCase() !== user.email) {
      const emailCheck = isAuthorizedEmail(email);
      if (!emailCheck.valid) {
        return res.status(400).json({ 
          message: `Email not authorized: ${emailCheck.reason}` 
        });
      }
      
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Reset verification for new email
      user.isEmailVerified = false;
    }

    // Validate profile picture size
    if (profilePicture && profilePicture.length > MAX_FILE_SIZE * 1.4) {
      return res.status(400).json({ message: 'Profile picture too large. Max 2MB.' });
    }

    user.name = name || user.name;
    user.email = email ? email.toLowerCase() : user.email;
    user.skillsOffered = Array.isArray(skillsOffered) ? skillsOffered : user.skillsOffered;
    user.skillsWanted = Array.isArray(skillsWanted) ? skillsWanted : user.skillsWanted;

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }

    if (password) {
      user.password = password;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isBlocked: updatedUser.isBlocked,
        isEmailVerified: updatedUser.isEmailVerified,
        profilePicture: updatedUser.profilePicture,
        skillsOffered: updatedUser.skillsOffered,
        skillsWanted: updatedUser.skillsWanted
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile
};
