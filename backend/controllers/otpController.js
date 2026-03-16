const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');
const { isAuthorizedEmail } = require('../utils/verifyEmail');

const generateOTP = () => {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const requestRegistrationOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    if (!name.trim()) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }

    // Validate email domain
    const emailCheck = isAuthorizedEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: `Email not authorized: ${emailCheck.reason}` });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate OTP and hash it
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Upsert OTP record in DB (replace if already exists for this email)
    await OTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        email: email.toLowerCase(),
        otp: hashedOTP,
        name: name.trim(),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      },
      { upsert: true, new: true }
    );

    // Send OTP email
    const message = `Hello ${name},\n\nYour Skill Swap verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nSkill Swap Team`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Skill Swap verification code is:</p>
        <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 0.9em;">
          This code will expire in 10 minutes.<br>
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Skill Swap - Your Verification Code',
      text: message,
      html: htmlMessage
    });

    return res.status(200).json({
      message: 'Verification code sent to your email',
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('OTP request error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp, name, password, skillsOffered, skillsWanted, profilePicture } = req.body;

    if (!email || !otp || !name || !password) {
      return res.status(400).json({ message: 'Email, OTP, name, and password are required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Find OTP record from DB
    const otpRecord = await OTP.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new code.' });
    }

    // TTL index handles expiry automatically, but double-check just in case
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'OTP expired. Please request a new code.' });
    }

    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    const isValidOTP = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValidOTP) {
      // Increment attempts in DB
      await OTP.updateOne({ email: normalizedEmail }, { $inc: { attempts: 1 } });
      const remainingAttempts = 3 - (otpRecord.attempts + 1);
      return res.status(400).json({ message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` });
    }

    // Validate profile picture size
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (profilePicture && profilePicture.length > MAX_FILE_SIZE * 1.4) {
      return res.status(400).json({ message: 'Profile picture too large. Max 2MB.' });
    }

    // Check user doesn't already exist (race-condition guard)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      await OTP.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      profilePicture: profilePicture || null,
      skillsOffered: Array.isArray(skillsOffered) ? skillsOffered : [],
      skillsWanted: Array.isArray(skillsWanted) ? skillsWanted : [],
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpire: null
    });

    // Clean up OTP record
    await OTP.deleteOne({ email: normalizedEmail });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT_SECRET not configured' });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
        profilePicture: user.profilePicture,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);

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

const resendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // Delete old OTP record before requesting a new one
    await OTP.deleteOne({ email: email.toLowerCase() });

    // Delegate to the standard request flow
    return requestRegistrationOTP(req, res);
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  requestRegistrationOTP,
  verifyOTPAndRegister,
  resendOTP
};
