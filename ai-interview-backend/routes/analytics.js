const express = require("express");
const passport = require("passport");
const Answer = require("../models/Answer");
const Interview = require("../models/Interview");

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Returns overall stats: avg score, answered count, completed interviews
 */
router.get(
  "/summary",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const answers = await Answer.find({ user: req.user._id });

      if (!answers.length) {
        return res.json({
          avgScore: 0,
          totalAnswers: 0,
          completedInterviews: 0
        });
      }

      const totalScore = answers.reduce((acc, a) => acc + (a.score || 0), 0);
      const avgScore = (totalScore / answers.length).toFixed(2);

      const completedInterviews = await Interview.countDocuments({
        user: req.user._id,
        status: "completed"
      });

      res.json({
        avgScore,
        totalAnswers: answers.length,
        completedInterviews
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/topic
 * Returns average score per topic
 */
router.get(
  "/topic",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const data = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $lookup: {
            from: "questions",
            localField: "question",
            foreignField: "_id",
            as: "questionData"
          }
        },
        { $unwind: "$questionData" },
        {
          $group: {
            _id: "$questionData.topic",
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({ topics: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/difficulty
 * Returns average score per difficulty
 */
router.get(
  "/difficulty",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const data = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $lookup: {
            from: "questions",
            localField: "question",
            foreignField: "_id",
            as: "questionData"
          }
        },
        { $unwind: "$questionData" },
        {
          $group: {
            _id: "$questionData.difficulty",
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({ difficulties: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/progress
 * Returns performance trend over time (weekly & monthly)
 */
router.get(
  "/progress",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      // Weekly trend
      const weekly = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: { week: { $isoWeek: "$createdAt" }, year: { $year: "$createdAt" } },
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ]);

      // Monthly trend
      const monthly = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      res.json({ progress: { weekly, monthly } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/full
 * Returns summary + topic + difficulty + progress (weekly & monthly) in one response
 */
router.get(
  "/full",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      // --- Summary ---
      const answers = await Answer.find({ user: req.user._id });
      let summary = {
        avgScore: 0,
        totalAnswers: 0,
        completedInterviews: 0
      };

      if (answers.length) {
        const totalScore = answers.reduce((acc, a) => acc + (a.score || 0), 0);
        summary.avgScore = (totalScore / answers.length).toFixed(2);
        summary.totalAnswers = answers.length;
        summary.completedInterviews = await Interview.countDocuments({
          user: req.user._id,
          status: "completed"
        });
      }

      // --- Topic Breakdown ---
      const topics = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $lookup: {
            from: "questions",
            localField: "question",
            foreignField: "_id",
            as: "questionData"
          }
        },
        { $unwind: "$questionData" },
        {
          $group: {
            _id: "$questionData.topic",
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        }
      ]);

      // --- Difficulty Breakdown ---
      const difficulties = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $lookup: {
            from: "questions",
            localField: "question",
            foreignField: "_id",
            as: "questionData"
          }
        },
        { $unwind: "$questionData" },
        {
          $group: {
            _id: "$questionData.difficulty",
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        }
      ]);

      // --- Progress (Weekly & Monthly) ---
      const weekly = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: { week: { $isoWeek: "$createdAt" }, year: { $year: "$createdAt" } },
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ]);

      const monthly = await Answer.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            avgScore: { $avg: "$score" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      res.json({
        summary,
        topics,
        difficulties,
        progress: { weekly, monthly }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
