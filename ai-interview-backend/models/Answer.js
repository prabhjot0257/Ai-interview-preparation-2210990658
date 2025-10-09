const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  userResponse: { type: String, required: true },
  score: { type: Number, default: null }, // 0-10 (optional)
  feedback: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', AnswerSchema);


