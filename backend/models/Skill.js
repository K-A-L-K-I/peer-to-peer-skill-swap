const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'programming',
        'design',
        'languages',
        'music',
        'sports',
        'academic',
        'arts_crafts',
        'business',
        'cooking',
        'other'
      ]
    },
    subcategory: {
      type: String,
      trim: true
    },
    aliases: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    icon: {
      type: String,
      default: '📚'
    },
    popularity: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for search
skillSchema.index({ name: 'text', aliases: 'text', displayName: 'text' });

module.exports = mongoose.model('Skill', skillSchema);
