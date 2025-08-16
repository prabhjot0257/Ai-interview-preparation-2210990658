const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  topic: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'], default: 'Easy' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  status: { type: String, enum: ['ongoing','completed'], default: 'ongoing' }
});

module.exports = mongoose.model('Interview', InterviewSchema);
