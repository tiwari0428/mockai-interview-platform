import mongoose from "mongoose";

const interviewAnswerSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    questionIndex: {
      type: Number,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      default: ""
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    voiceAnalysis: {
      speakingSpeedWpm: Number,
      fillerCount: Number,
      fillerWords: [String],
      longPauseCount: Number,
      answerWordCount: Number,
      clarityScore: Number
    },
    webcamAnalysis: {
      faceVisible: Boolean,
      eyeContactScore: Number,
      emotionLabel: String,
      postureStatus: String
    }
  },
  {
    timestamps: true
  }
);

interviewAnswerSchema.index({ session: 1, questionIndex: 1 }, { unique: true });

export default mongoose.model("InterviewAnswer", interviewAnswerSchema);
