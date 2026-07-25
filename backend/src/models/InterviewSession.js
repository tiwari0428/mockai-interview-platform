import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    index: Number,
    text: String,
    category: String,
    expectedFocus: [String]
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    mode: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress"
    },
    resumeUsed: {
      type: Boolean,
      default: false
    },
    resumeTextSnapshot: {
      type: String,
      default: ""
    },
    questions: [questionSchema],
    startedAt: {
      type: Date,
      default: Date.now
    },
    finishedAt: Date
  },
  {
    timestamps: true
  }
);

export default mongoose.model("InterviewSession", interviewSessionSchema);
