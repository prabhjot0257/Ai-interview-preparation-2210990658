const express = require('express');
const passport = require('passport');
const router = express.Router();

const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Interview = require('../models/Interview');
const { gradeAnswer, generateQuestion } = require('../utils/openai');

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

      // Grade answer via AI
      try {
        const grade = await gradeAnswer(question.questionText, question.idealAnswer || '', userResponse);
        if (grade && typeof grade.score === 'number') {
          answerDoc.score = grade.score;
          answerDoc.feedback = grade.feedback;
        } else {
          answerDoc.feedback = grade.feedback || '';
        }
      } catch (aiErr) {
        console.warn('⚠️ AI grading failed:', aiErr.message);
      }

      await answerDoc.save();

      // Check interview progress
      const interview = await Interview.findById(interviewId).populate('questions');

      const answeredCount = await Answer.countDocuments({ interview: interviewId, user: req.user._id });

      let nextQuestion = null;

      if (answeredCount < 5) {
        // Generate a unique next question
        const previousQuestionsText = interview.questions.map(q => q.questionText).join('\n');
        const { questionText, idealAnswer } = await generateQuestion(interview.topic, interview.difficulty, previousQuestionsText);

        const q = new Question({
          interview: interview._id,
          questionText,
          generatedBy: 'AI',
          topic: interview.topic,
          difficulty: interview.difficulty,
          idealAnswer
        });

        await q.save();
        interview.questions.push(q._id);
        await interview.save();

        nextQuestion = q;
      }

      if (answeredCount >= 5) {
        interview.status = 'completed';
        await interview.save();
      }

      res.json({
        answer: answerDoc,
        interviewStatus: interview.status,
        nextQuestion
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/answers/user
 * Get all answers of the logged-in user
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
