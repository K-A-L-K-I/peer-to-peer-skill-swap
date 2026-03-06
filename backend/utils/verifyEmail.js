const crypto = require('crypto');

// List of authorized domains (add more if needed)
const AUTHORIZED_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'edu', // Any .edu domain
  'ac.in', // Academic India
  'ac.uk', // Academic UK
];

// List of specific authorized emails (for admin/testing)
const AUTHORIZED_EMAILS = [
  // Add specific emails here if needed
];

const isAuthorizedEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const lowerEmail = email.toLowerCase().trim();
  
  // Check specific authorized emails first
  if (AUTHORIZED_EMAILS.includes(lowerEmail)) {
    return { valid: true, reason: 'specifically authorized' };
  }
  
  // Extract domain
  const domain = lowerEmail.split('@')[1];
  
  if (!domain) {
    return { valid: false, reason: 'invalid email format' };
  }
  
  // Check exact domain matches
  if (AUTHORIZED_DOMAINS.includes(domain)) {
    return { valid: true, reason: 'authorized domain' };
  }
  
  // Check if domain ends with authorized TLDs (like .edu, .ac.in, etc.)
  for (const authDomain of AUTHORIZED_DOMAINS) {
    if (domain.endsWith('.' + authDomain) || domain === authDomain) {
      return { valid: true, reason: 'authorized domain' };
    }
  }
  
  return { 
    valid: false, 
    reason: 'unauthorized domain. Only Gmail and academic emails are allowed' 
  };
};

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

module.exports = {
  isAuthorizedEmail,
  generateVerificationToken,
  hashToken,
  AUTHORIZED_DOMAINS
};
