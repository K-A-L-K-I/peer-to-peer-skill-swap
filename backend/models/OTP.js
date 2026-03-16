const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        // MongoDB TTL index: automatically deletes the document when expiresAt is reached
        index: { expires: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);
