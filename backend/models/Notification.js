const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    type: {
      type: String,
      enum: ['swap_request', 'message', 'review', 'report', 'system'],
      required: [true, 'Notification type is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true
    },
    relatedModel: {
      type: String,
      enum: ['SkillSwapRequest', 'Message', 'Review', 'Report', 'User'],
      default: null
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
