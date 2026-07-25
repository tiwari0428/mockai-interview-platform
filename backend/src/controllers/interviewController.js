import { body } from "express-validator";
import InterviewSession from "../models/InterviewSession.js";
import InterviewAnswer from "../models/InterviewAnswer.js";
import InterviewReport from "../models/InterviewReport.js";
import Resume from "../models/Resume.js";
import { generateInterviewQuestions, generateInterviewFeedback } from "../services/aiService.js";
import {
  computeVoiceMetrics,
  scoreCommunication,
  scoreConfidence,
  scoreOverall,
  scoreTechnical
} from "../utils/scoring.js";
import { INTERVIEW_MODES } from "../utils/modeConfig.js";

const QUESTION_COUNT_MIN = 3;
const QUESTION_COUNT_MAX = 20;
const QUESTION_COUNT_DEFAULT = 10;

export const generateQuestionsValidation = [
  body("mode").isIn(Object.keys(INTERVIEW_MODES)),
  body("difficulty").isIn(["easy", "medium", "hard"]),
  body("resumeText").optional().isString(),
  body("questionCount").optional().isInt({ min: QUESTION_COUNT_MIN, max: QUESTION_COUNT_MAX })
];

export const startInterviewValidation = [
  body("mode").isIn(Object.keys(INTERVIEW_MODES)),
  body("difficulty").isIn(["easy", "medium", "hard"]),
  body("useResume").optional().isBoolean(),
  body("questionCount").optional().isInt({ min: QUESTION_COUNT_MIN, max: QUESTION_COUNT_MAX })
];

export const saveAnswerValidation = [
  body("sessionId").isMongoId(),
  body("questionIndex").isInt({ min: 0 }),
  body("question").trim().notEmpty(),
  body("answer").trim().notEmpty(),
  body("durationSeconds").optional().isNumeric()
];

export const finishInterviewValidation = [body("sessionId").isMongoId()];

const resolveQuestionCount = (questionCount) => {
  if (questionCount === undefined || questionCount === null || questionCount === "") {
    return QUESTION_COUNT_DEFAULT;
  }

  const parsed = Number(questionCount);
  if (!Number.isFinite(parsed)) {
    return QUESTION_COUNT_DEFAULT;
  }

  return Math.min(QUESTION_COUNT_MAX, Math.max(QUESTION_COUNT_MIN, Math.trunc(parsed)));
};

export const generateQuestions = async (req, res) => {
  const { mode, difficulty, resumeText, questionCount } = req.body;
  const questions = await generateInterviewQuestions({
    mode,
    difficulty,
    resumeText,
    questionCount: resolveQuestionCount(questionCount)
  });
  res.json({ questions });
};

export const startInterview = async (req, res) => {
  const { mode, difficulty, useResume, questionCount } = req.body;
  const latestResume = useResume
    ? await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 })
    : null;

  const questions = await generateInterviewQuestions({
    mode,
    difficulty,
    resumeText: latestResume?.text || "",
    questionCount: resolveQuestionCount(questionCount)
  });

  const session = await InterviewSession.create({
    user: req.user._id,
    mode,
    difficulty,
    resumeUsed: Boolean(useResume && latestResume),
    resumeTextSnapshot: latestResume?.text || "",
    questions
  });

  res.status(201).json({
    session: {
      id: session._id,
      mode: session.mode,
      difficulty: session.difficulty,
      status: session.status,
      questions: session.questions,
      startedAt: session.startedAt
    }
  });
};

export const saveAnswer = async (req, res) => {
  const { sessionId, questionIndex, question, answer, durationSeconds, voiceAnalysis, webcamAnalysis } =
    req.body;

  const session = await InterviewSession.findOne({ _id: sessionId, user: req.user._id });
  if (!session) {
    return res.status(404).json({ message: "Interview session not found" });
  }

  const derivedVoiceMetrics = {
    ...computeVoiceMetrics(answer, durationSeconds),
    ...(voiceAnalysis || {})
  };

  const savedAnswer = await InterviewAnswer.findOneAndUpdate(
    { session: sessionId, questionIndex },
    {
      session: sessionId,
      user: req.user._id,
      questionIndex,
      question,
      answer,
      durationSeconds: durationSeconds || 0,
      voiceAnalysis: derivedVoiceMetrics,
      webcamAnalysis: {
        faceVisible: webcamAnalysis?.faceVisible ?? true,
        eyeContactScore: webcamAnalysis?.eyeContactScore ?? 65,
        emotionLabel: webcamAnalysis?.emotionLabel || "focused",
        postureStatus: webcamAnalysis?.postureStatus || "upright"
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  res.json({
    message: "Answer saved",
    answer: savedAnswer
  });
};

export const finishInterview = async (req, res) => {
  const { sessionId } = req.body;
  const session = await InterviewSession.findOne({ _id: sessionId, user: req.user._id });

  if (!session) {
    return res.status(404).json({ message: "Interview session not found" });
  }

  if (session.status === "completed") {
    const existingReport = await InterviewReport.findOne({ session: session._id });
    return res.json({
      message: "Interview already completed",
      reportId: existingReport?._id,
      scores: existingReport?.scores
    });
  }

  const answers = await InterviewAnswer.find({ session: sessionId }).sort({ questionIndex: 1 });
  if (!answers.length) {
    return res.status(400).json({ message: "Add at least one answer before finishing" });
  }

  const aggregate = answers.reduce(
    (acc, answer) => {
      acc.speed += answer.voiceAnalysis?.speakingSpeedWpm || 0;
      acc.filler += answer.voiceAnalysis?.fillerCount || 0;
      acc.pause += answer.voiceAnalysis?.longPauseCount || 0;
      acc.words += answer.voiceAnalysis?.answerWordCount || 0;
      acc.clarity += answer.voiceAnalysis?.clarityScore || 0;
      return acc;
    },
    { speed: 0, filler: 0, pause: 0, words: 0, clarity: 0 }
  );

  const averageMetrics = {
    speakingSpeedWpm: Math.round(aggregate.speed / answers.length),
    fillerCount: Math.round(aggregate.filler / answers.length),
    longPauseCount: Math.round(aggregate.pause / answers.length),
    answerWordCount: Math.round(aggregate.words / answers.length),
    clarityScore: Math.round(aggregate.clarity / answers.length)
  };

  const confidence = scoreConfidence(averageMetrics);
  const communication = scoreCommunication(averageMetrics);
  const provisionalOverall = scoreOverall({
    confidence,
    communication,
    technical: 70
  });

  const aiFeedback = await generateInterviewFeedback({
    session,
    answers,
    computedScores: {
      confidence,
      communication,
      overall: provisionalOverall
    }
  });

  const technical = scoreTechnical(session.mode, aiFeedback.technicalScore, answers.length);
  const overall = scoreOverall({ confidence, communication, technical });

  const report = await InterviewReport.findOneAndUpdate(
    { session: session._id },
    {
      user: req.user._id,
      session: session._id,
      scores: {
        overall,
        confidence,
        communication,
        technical
      },
      strengths: aiFeedback.strengths || [],
      weaknesses: aiFeedback.weaknesses || [],
      improvedAnswerSuggestions: aiFeedback.improvedAnswerSuggestions || [],
      improvementRoadmap: aiFeedback.improvementRoadmap || [],
      summary: aiFeedback.summary || "",
      answerInsights: aiFeedback.answerInsights || []
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  session.status = "completed";
  session.finishedAt = new Date();
  await session.save();

  res.json({
    message: "Interview completed",
    reportId: report._id,
    scores: report.scores
  });
};

export const getInterviewHistory = async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  const reports = await InterviewReport.find({
    session: { $in: sessions.map((session) => session._id) }
  }).lean();

  const reportMap = new Map(reports.map((report) => [String(report.session), report]));

  const history = sessions.map((session) => ({
    id: session._id,
    mode: session.mode,
    difficulty: session.difficulty,
    status: session.status,
    questionCount: session.questions.length,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    scores: reportMap.get(String(session._id))?.scores || null
  }));

  res.json({ history });
};

export const getInterviewSession = async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    user: req.user._id
  }).lean();

  if (!session) {
    return res.status(404).json({ message: "Interview session not found" });
  }

  const answers = await InterviewAnswer.find({ session: session._id }).sort({ questionIndex: 1 }).lean();

  res.json({
    session,
    answers
  });
};

export const getInterviewReport = async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    user: req.user._id
  }).lean();

  if (!session) {
    return res.status(404).json({ message: "Interview session not found" });
  }

  const answers = await InterviewAnswer.find({ session: session._id }).sort({ questionIndex: 1 }).lean();
  const report = await InterviewReport.findOne({ session: session._id }).lean();

  if (!report) {
    return res.status(404).json({ message: "Interview report not found" });
  }

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    },
    session,
    answers,
    report
  });
};
