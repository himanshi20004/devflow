const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    repoUrl: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['idle', 'building', 'success', 'failed'],
      default: 'idle',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
