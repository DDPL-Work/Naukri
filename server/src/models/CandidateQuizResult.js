const mongoose = require("mongoose");

const candidateQuizResultSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quizKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    xpEarned: {
      type: Number,
      required: true,
      min: 0,
    },
    answers: {
      type: [
        {
          questionId: String,
          selectedIndex: Number,
          isCorrect: Boolean,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

candidateQuizResultSchema.index({ candidateId: 1, quizKey: 1 }, { unique: true });
candidateQuizResultSchema.index({ xpEarned: -1, createdAt: 1 });

module.exports = mongoose.model("CandidateQuizResult", candidateQuizResultSchema);
