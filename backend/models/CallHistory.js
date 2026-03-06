const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true
  },
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected', 'cancelled'],
    default: 'completed'
  },
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  }
}, {
  timestamps: true
});

// Index for faster queries
callHistorySchema.index({ caller: 1, createdAt: -1 });
callHistorySchema.index({ callee: 1, createdAt: -1 });

module.exports = mongoose.model('CallHistory', callHistorySchema);
