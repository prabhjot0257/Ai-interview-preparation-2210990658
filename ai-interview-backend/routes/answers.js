const express = require('express');
const passport = require('passport');
const router = express.Router();

const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { gradeAnswer } = require('../utils/openai');

/**
 * POST /api/answers
 * body: { interviewId, questionId, userResponse }
 * Protected
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { interviewId, questionId, userResponse } = req.body;
      const question = await Question.findById(questionId);
      if (!question) return res.status(404).json({ message: 'Question not found' });

      const answerDoc = new Answer({
        user: req.user._id,
        interview: interviewId,
        question: questionId,
        userResponse
      });

      // Optionally grade via AI if API key present
      try {
        const grade = await gradeAnswer(question.questionText, question.idealAnswer || '', userResponse);
        if (grade && typeof grade.score === 'number') {
          answerDoc.score = grade.score;
          answerDoc.feedback = grade.feedback;
        } else {
          // if score missing, put feedback text
          answerDoc.feedback = grade.feedback || '';
        }
      } catch (aiErr) {
        // console.warn('AI grading failed:', aiErr.message);
      }

      await answerDoc.save();
      res.json({ answer: answerDoc });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/answers/user - returns user's answers
 */
router.get(
  '/user',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const answers = await Answer.find({ user: req.user._id }).populate('question');
      res.json({ answers });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
