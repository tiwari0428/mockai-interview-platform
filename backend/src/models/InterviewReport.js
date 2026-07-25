import mongoose from "mongoose";

const reportScoreSchema = new mongoose.Schema(
  {
    overall: Number,
    confidence: Number,
    communication: Number,
    technical: Number
  },
  { _id: false }
);

const interviewReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      unique: true
    },
    scores: reportScoreSchema,
    strengths: [String],
    weaknesses: [String],
    improvedAnswerSuggestions: [String],
    improvementRoadmap: [String],
    summary: String,
    answerInsights: [
      {
        questionIndex: Number,
        feedback: String,
        improvementTip: String
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("InterviewReport", interviewReportSchema);
