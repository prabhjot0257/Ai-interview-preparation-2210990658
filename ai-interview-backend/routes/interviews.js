const express = require('express');
const passport = require('passport');
const router = express.Router();

const Interview = require('../models/Interview');
const Question = require('../models/Question');
const { generateQuestion } = require('../utils/openai');

/**
 * POST /api/interviews
 * body: { topic, difficulty }
 * Protected: user
 * Creates interview and generates first question via AI
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { topic, difficulty } = req.body;
      const interview = new Interview({
        user: req.user._id,
        topic,
        difficulty
      });
      await interview.save();

      // Generate the first question
      try {
        const { questionText, idealAnswer } = await generateQuestion(topic, difficulty);
        const q = new Question({
          interview: interview._id,
          questionText,
          generatedBy: 'AI',
          topic,
          difficulty,
          idealAnswer
        });
        await q.save();

        await Interview.updateOne(
          { _id: interview._id },
          { $push: { questions: q._id } }
        );
      } catch (aiErr) {
        console.warn('⚠️ AI generation failed:', aiErr.message);
      }

      const populatedInterview = await Interview.findById(interview._id).populate('questions');
      res.json({ interview: populatedInterview });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/interviews
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const interviews = await Interview.find({ user: req.user._id }).populate('questions');
      res.json({ interviews });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/interviews/:id
 * Protected: user
 * Returns interview with questions and their answers
 */
router.get(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const interview = await Interview.findById(req.params.id)
        .populate({
          path: 'questions',
          populate: {
            path: 'answers',            // populate answers for each question
            match: { user: req.user._id } // only current user’s answers
          }
        });

      if (!interview) return res.status(404).json({ message: 'Not found' });
      if (String(interview.user) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Optional: calculate performance summary
      const totalQuestions = interview.questions.length;
      const answeredCount = interview.questions.filter(q => q.answers.length > 0).length;
      const totalScore = interview.questions.reduce((acc, q) => {
        if (q.answers[0]?.score != null) return acc + q.answers[0].score;
        return acc;
      }, 0);

      const score = totalQuestions > 0 ? (totalScore / totalQuestions).toFixed(2) : null;

      res.json({ 
        interview, 
        performance: { totalQuestions, answeredCount, score } 
      });
    } catch (err) {
      next(err);
    }
  }
);



module.exports = router;
