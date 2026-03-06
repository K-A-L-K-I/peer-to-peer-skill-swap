const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { isAuthorizedEmail } = require('../utils/verifyEmail');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

const generateOTP = () => {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const requestRegistrationOTP = async (req, res) => {
  try {
    console.log('📥 OTP Request received:', req.body);
    
    const { email, name } = req.body;

    if (!email || !name) {
      console.log('❌ Missing email or name');
      return res.status(400).json({
        message: 'Email and name are required'
      });
    }

    // Validate email domain
    const emailCheck = isAuthorizedEmail(email);
    console.log('Email check result:', emailCheck);
    
    if (!emailCheck.valid) {
      console.log('❌ Email not authorized');
      return res.status(400).json({ 
        message: `Email not authorized: ${emailCheck.reason}` 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    console.log('Existing user check:', existingUser ? 'Found' : 'Not found');
    
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log('Generated OTP:', otp);
    
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    // Store OTP with expiration (10 minutes)
    otpStore.set(email.toLowerCase(), {
      otp: hashedOTP,
      expires: Date.now() + 10 * 60 * 1000,
      name: name.trim(),
      attempts: 0
    });
    
    console.log('OTP stored in memory');

    // Send OTP email
    const message = `Hello ${name},

Your Skill Swap verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Skill Swap Team`;

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

    console.log('📧 Attempting to send email to:', email);

    await sendEmail({
      to: email,
      subject: 'Skill Swap - Your Verification Code',
      text: message,
      html: htmlMessage
    });

    console.log('✅ Email sent successfully');

    return res.status(200).json({
      message: 'Verification code sent to your email',
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('❌ OTP request error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

const verifyOTPAndRegister = async (req, res) => {
  try {
    console.log('📥 OTP Verification received:', { ...req.body, otp: '***' });
    
    const { email, otp, name, password, skillsOffered, skillsWanted, profilePicture } = req.body;

    if (!email || !otp || !name || !password) {
      return res.status(400).json({
        message: 'Email, OTP, name, and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      console.log('❌ OTP not found in store');
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new code.' });
    }

    if (otpData.expires < Date.now()) {
      otpStore.delete(normalizedEmail);
      console.log('❌ OTP expired');
      return res.status(400).json({ message: 'OTP expired. Please request a new code.' });
    }

    if (otpData.attempts >= 3) {
      otpStore.delete(normalizedEmail);
      console.log('❌ Too many attempts');
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    const isValidOTP = await bcrypt.compare(otp, otpData.otp);
    
    if (!isValidOTP) {
      otpData.attempts += 1;
      console.log('❌ Invalid OTP, attempt:', otpData.attempts);
      return res.status(400).json({ 
        message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.` 
      });
    }

    console.log('✅ OTP verified');

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (profilePicture && profilePicture.length > MAX_FILE_SIZE * 1.4) {
      return res.status(400).json({ message: 'Profile picture too large. Max 2MB.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'User already exists' });
    }

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

    console.log('✅ User created:', user._id);

    otpStore.delete(normalizedEmail);

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
    console.error('❌ OTP verification error:', error);

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
      return res.status(400).json({
        message: 'Email and name are required'
      });
    }

    otpStore.delete(email.toLowerCase());
    return requestRegistrationOTP(req, res);
  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  requestRegistrationOTP,
  verifyOTPAndRegister,
  resendOTP
};
