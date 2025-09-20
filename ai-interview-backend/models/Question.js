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

// Virtual populate for answers
QuestionSchema.virtual('answers', {
  ref: 'Answer',         // model to populate
  localField: '_id',     // Question._id
  foreignField: 'question' // Answer.question
});

QuestionSchema.set('toObject', { virtuals: true });
QuestionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Question', QuestionSchema);
