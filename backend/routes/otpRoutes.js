const express = require('express');
const {
  requestRegistrationOTP,
  verifyOTPAndRegister,
  resendOTP
} = require('../controllers/otpController');

const router = express.Router();

router.post('/request', requestRegistrationOTP);
router.post('/verify', verifyOTPAndRegister);
router.post('/resend', resendOTP);

module.exports = router;
