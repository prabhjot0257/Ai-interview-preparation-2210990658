const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  questionText: { type: String, required: true },
  generatedBy: { type: String, enum: ['AI','human'], default: 'AI' },
  topic: { type: String },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'] },
  idealAnswer: { type: String }, // AI-generated ideal/solution
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);
