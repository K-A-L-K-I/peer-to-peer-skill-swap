const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const sendEmail = async ({ to, subject, text, html }) => {
  const resendApiKey = process.env.RESEND_API_KEY;

  // --- Use Resend API (Production / Render) ---
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const fromAddress = process.env.EMAIL_FROM_RESEND || 'Skill Swap <onboarding@resend.dev>';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });

    if (error) {
      console.error('❌ Resend email failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('📧 Email sent via Resend:', data.id);
    return { success: true, messageId: data.id };
  }

  // --- Fallback: SMTP via Nodemailer (Local Development) ---
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    throw new Error('No email provider configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS in .env');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection verified');
  } catch (err) {
    console.error('❌ SMTP Connection failed:', err.message);
    throw new Error('Failed to connect to email server');
  }

  const info = await transporter.sendMail({
    from: `"Skill Swap" <${emailFrom}>`,
    to, subject, text,
    html: html || text.replace(/\n/g, '<br>'),
  });

  console.log('📧 Email sent via SMTP:', info.messageId);
  return { success: true, messageId: info.messageId };
};

module.exports = sendEmail;
