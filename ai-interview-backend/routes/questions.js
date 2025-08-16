const express = require('express');
const passport = require('passport');
const router = express.Router();
const Question = require('../models/Question');

/**
 * GET /api/questions/interview/:interviewId
 * Protected
 */
router.get(
  '/interview/:interviewId',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const questions = await Question.find({ interview: req.params.interviewId });
      res.json({ questions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/questions/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Not found' });
    res.json({ question: q });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
