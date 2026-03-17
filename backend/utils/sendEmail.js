const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const brevoApiKey = process.env.BREVO_API_KEY;

  // --- Use Brevo REST API (Cloud/Render) — no TCP ports, just HTTPS ---
  if (brevoApiKey) {
    const emailFrom = process.env.EMAIL_FROM || 'skillswap@brevo.com';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: { name: 'Skill Swap', email: emailFrom },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || text.replace(/\n/g, '<br>')
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API email failed:', data);
      throw new Error(`Failed to send email: ${data.message || JSON.stringify(data)}`);
    }

    console.log('📧 Email sent via Brevo API:', data.messageId);
    return { success: true, messageId: data.messageId };
  }

  // --- Fallback: SMTP via Nodemailer (Local Development) ---
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    throw new Error('No email provider configured. Set BREVO_API_KEY or SMTP_USER/SMTP_PASS in .env');
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
