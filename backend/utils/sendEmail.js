

const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  // Validate config
  if (!smtpUser || !smtpPass) {
    throw new Error('Gmail SMTP credentials missing. Set SMTP_USER and SMTP_PASS in .env');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false // Sometimes needed for Gmail
    }
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP Connection verified');
  } catch (err) {
    console.error('❌ SMTP Connection failed:', err.message);
    throw new Error('Failed to connect to email server');
  }

  const mailOptions = {
    from: `"Skill Swap" <${emailFrom}>`,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, '<br>'), // Convert newlines to HTML if no HTML provided
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email sent:', info.messageId);
  
  return { success: true, messageId: info.messageId };
};

module.exports = sendEmail;
