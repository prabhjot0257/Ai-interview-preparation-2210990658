const express = require('express');
const passport = require('passport');
const router = express.Router();
const { generateQuestion } = require('../utils/openai');
const Question = require('../models/Question');
const Interview = require('../models/Interview');

/**
 * POST /api/ai/generate-question
 * body: { topic, difficulty, interviewId? }
 * Protected
 */
router.post(
  '/generate-question',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { topic, difficulty, interviewId } = req.body;
      const { questionText, idealAnswer } = await generateQuestion(topic, difficulty);
      const q = new Question({
        interview: interviewId || null,
        questionText,
        generatedBy: 'AI',
        topic,
        difficulty,
        idealAnswer
      });
      await q.save();

      if (interviewId) {
        const interview = await Interview.findById(interviewId);
        if (interview) {
          interview.questions.push(q._id);
          await interview.save();
        }
      }

      res.json({ question: q });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
