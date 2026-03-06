const Meeting = require('../models/Meeting');

// @desc    Schedule a new meeting
// @route   POST /api/meetings
// @access  Private
exports.scheduleMeeting = async (req, res) => {
    try {
        const { recipientId, swapRequestId, scheduledAt } = req.body;

        // Validate inputs
        if (!recipientId || !swapRequestId || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'Please provide recipientId, swapRequestId, and scheduledAt'
            });
        }

        const meeting = await Meeting.create({
            requester: req.user.id,
            recipient: recipientId,
            swapRequest: swapRequestId,
            scheduledAt
        });

        res.status(201).json({
            success: true,
            data: meeting
        });
    } catch (error) {
        console.error('Error scheduling meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get meetings for a specific swap request
// @route   GET /api/meetings/chat/:swapRequestId
// @access  Private
exports.getMeetingsForChat = async (req, res) => {
    try {
        const meetings = await Meeting.find({
            swapRequest: req.params.swapRequestId,
            status: 'scheduled'
        }).sort({ scheduledAt: 1 });

        res.status(200).json({
            success: true,
            count: meetings.length,
            data: meetings
        });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
