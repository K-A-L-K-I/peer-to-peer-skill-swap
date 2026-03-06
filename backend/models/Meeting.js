const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Requester is required']
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required']
        },
        swapRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SkillSwapRequest',
            required: [true, 'Swap Request reference is required']
        },
        scheduledAt: {
            type: Date,
            required: [true, 'Scheduled time is required']
        },
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled'],
            default: 'scheduled'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Meeting', meetingSchema);
