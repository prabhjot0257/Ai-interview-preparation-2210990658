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
 * Creates interview and generates first question via OpenAI (if API key present)
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

      // Generate initial AI question (best-effort)
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
        interview.questions.push(q._id);
        await interview.save();
      } catch (aiErr) {
        console.warn('AI generation failed:', aiErr.message);
      }

      res.json({ interview });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/interviews
 * Protected: user - returns user's interviews
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
 */
router.get(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const interview = await Interview.findById(req.params.id).populate('questions');
      if (!interview) return res.status(404).json({ message: 'Not found' });
      if (String(interview.user) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
      res.json({ interview });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
