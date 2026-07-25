import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { INTERVIEW_MODES } from "../utils/modeConfig.js";

const getProvider = () => process.env.AI_PROVIDER || "openai";
const QUESTION_COUNT_DEFAULT = 10;
const QUESTION_COUNT_MIN = 3;
const QUESTION_COUNT_MAX = 20;

const QUESTION_BLUEPRINTS = {
  hr: [
    "self introduction",
    "strengths and weaknesses",
    "conflict handling",
    "teamwork",
    "motivation"
  ],
  dsa: [
    "arrays",
    "strings",
    "time and space complexity",
    "recursion",
    "problem-solving explanation"
  ],
  resume: [
    "resume background",
    "projects",
    "skills",
    "internship experience",
    "measurable impact"
  ],
  google: [
    "DSA",
    "problem solving",
    "system thinking",
    "trade-offs",
    "optimization"
  ],
  amazon: [
    "ownership",
    "customer obsession",
    "conflict",
    "failure story",
    "leadership principles"
  ],
  meta: [
    "collaboration",
    "product thinking",
    "fast execution",
    "technical depth",
    "handling ambiguity"
  ]
};

const parseJson = (text, fallback) => {
  try {
    const normalized = text.replace(/```json|```/g, "").trim();
    return JSON.parse(normalized);
  } catch (_error) {
    return fallback;
  }
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash"
  });
};

const getQuestionTopics = (mode) => QUESTION_BLUEPRINTS[mode] || QUESTION_BLUEPRINTS.hr;

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

const getResumeSnippet = (resumeText = "") => {
  if (!resumeText?.trim()) {
    return "";
  }

  return resumeText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
};

const buildFallbackQuestionText = ({ mode, topic, difficulty, resumeText, index }) => {
  const resumeSnippet = getResumeSnippet(resumeText);

  const fallbackTemplates = {
    hr: [
      "Tell me about yourself and how your background has prepared you for this role.",
      "What would you say is one of your biggest strengths and one weakness you are actively improving?",
      "Describe a time you faced conflict at work or in a team and how you handled it.",
      "Tell me about a time you worked closely with a team to achieve a shared goal.",
      "What motivates you professionally, and why are you interested in this opportunity?"
    ],
    dsa: [
      "How would you solve an array-based problem where you need to find an efficient pattern instead of using brute force?",
      "Describe your approach for solving a string manipulation problem and how you would validate edge cases.",
      "When comparing two solutions, how do you evaluate time and space complexity and decide which one is better?",
      "Explain a problem where recursion is a natural fit, and describe how you would avoid common recursion pitfalls.",
      "Walk me through how you would explain your problem-solving approach clearly during a coding interview."
    ],
    resume: [
      "Walk me through your resume and highlight the experience that best represents your current strengths.",
      "Tell me about one project from your resume, the problem it solved, and your specific contribution.",
      "Which skills on your resume are your strongest, and where have you applied them in real work?",
      "Describe an internship or practical experience from your resume and what you learned from it.",
      "Tell me about a result from your resume that had measurable impact, and how you achieved it."
    ],
    google: [
      "Solve a DSA-style problem and explain how you would move from brute force to an optimized solution.",
      "Describe how you break down an unfamiliar problem into smaller parts during an interview.",
      "If a feature starts failing at scale, how would you use system thinking to reason about the possible causes?",
      "Tell me about a technical decision where you had to balance trade-offs between speed, simplicity, and reliability.",
      "How would you optimize a working solution after getting the first correct version?"
    ],
    amazon: [
      "Tell me about a time you took ownership of a problem beyond your formal responsibilities.",
      "Describe a situation where you made a decision by focusing deeply on customer impact.",
      "Tell me about a conflict with a teammate or stakeholder and how you resolved it.",
      "Describe a failure or setback, what caused it, and what you changed afterward.",
      "Which Amazon leadership principle best reflects your working style, and can you give an example?"
    ],
    meta: [
      "Tell me about a time you collaborated across teams to deliver a result.",
      "Describe a situation where product thinking changed the technical solution you were building.",
      "How have you executed quickly under pressure while still maintaining quality?",
      "Tell me about a technically deep problem you solved and how you approached it.",
      "Describe a time you had to make progress despite unclear requirements or ambiguity."
    ]
  };

  const modeTemplates = fallbackTemplates[mode] || fallbackTemplates.hr;
  const questionText = modeTemplates[index] || `Explain your approach to ${topic} in a ${difficulty} interview setting.`;

  if (mode === "resume" && resumeSnippet) {
    return `${questionText} Use examples from this resume context when relevant: ${resumeSnippet}`;
  }

  return questionText;
};

const buildExpandedFallbackQuestionText = ({ mode, difficulty, resumeText, topic, index, variant }) => {
  const resumeSnippet = getResumeSnippet(resumeText);
  const promptStyles = [
    `Walk me through how you would approach ${topic} in a ${difficulty} interview.`,
    `Give me a concrete example that demonstrates your ability in ${topic}.`,
    `What trade-offs, mistakes, or lessons would you highlight when discussing ${topic}?`,
    `How would you explain ${topic} clearly to an interviewer while showing strong judgment?`
  ];

  let questionText = promptStyles[variant % promptStyles.length];

  if (mode === "resume" && resumeSnippet) {
    questionText = `${questionText} Base your answer on this resume context when relevant: ${resumeSnippet}`;
  }

  return questionText;
};

const fallbackQuestions = (mode, difficulty, resumeText = "", questionCount = QUESTION_COUNT_DEFAULT) => {
  const modeConfig = INTERVIEW_MODES[mode] || INTERVIEW_MODES.hr;
  const topics = getQuestionTopics(mode);

  return Array.from({ length: questionCount }, (_, index) => {
    const topic = topics[index % topics.length];
    const variant = Math.floor(index / topics.length);
    const text =
      variant === 0
        ? buildFallbackQuestionText({
            mode,
            topic,
            difficulty,
            resumeText,
            index: index % topics.length
          })
        : buildExpandedFallbackQuestionText({
            mode,
            difficulty,
            resumeText,
            topic,
            index,
            variant
          });

    return {
      index,
      text,
      category: mode,
      expectedFocus: [topic, ...modeConfig.focus].slice(0, 5)
    };
  });
};

const normalizeQuestions = (questions, mode, difficulty, resumeText, questionCount) => {
  if (!Array.isArray(questions)) {
    return fallbackQuestions(mode, difficulty, resumeText, questionCount);
  }

  const topics = getQuestionTopics(mode);
  const cleaned = questions
    .slice(0, questionCount)
    .map((question, index) => {
      const text = typeof question?.text === "string" ? question.text.trim() : "";
      if (!text) {
        return null;
      }

      const expectedFocus = Array.isArray(question.expectedFocus)
        ? question.expectedFocus.filter((item) => typeof item === "string" && item.trim())
        : [];

      return {
        index,
        text,
        category: mode,
        expectedFocus: expectedFocus.length
          ? expectedFocus.slice(0, 5)
          : [topics[index], ...(INTERVIEW_MODES[mode]?.focus || [])].slice(0, 5)
        };
    })
    .filter(Boolean);

  if (cleaned.length === questionCount) {
    return cleaned;
  }

  const fallback = fallbackQuestions(mode, difficulty, resumeText, questionCount);
  return fallback.map((question, index) => cleaned[index] || question);
};

export const generateInterviewQuestions = async ({ mode, difficulty, resumeText, questionCount }) => {
  const modeLabel = INTERVIEW_MODES[mode]?.label || "Interview";
  const topics = getQuestionTopics(mode);
  const finalQuestionCount = resolveQuestionCount(questionCount);
  const prompt = `
Generate exactly ${finalQuestionCount} interview questions for a ${difficulty} ${modeLabel}.
The questions must match these required topic slots in order:
${Array.from({ length: finalQuestionCount }, (_, index) => `${index + 1}. ${topics[index % topics.length]}`).join("\n")}

Additional mode focus: ${INTERVIEW_MODES[mode]?.focus?.join(", ") || "general interview"}.
Resume context: ${resumeText ? resumeText.slice(0, 1800) : "No resume provided"}.

Rules:
- Return exactly ${finalQuestionCount} questions.
- Make the questions realistic and interview-ready.
- If mode is Resume-based Interview, ask directly from the resume context, including projects, skills, internship, and measurable impact.
- If more than 5 questions are requested, expand the topic coverage with varied wording and deeper follow-ups instead of repeating the exact same question.
- Do not include markdown or extra explanation.

Return strict JSON in this format:
{
  "questions": [
    {
      "index": 0,
      "text": "question",
      "category": "${mode}",
      "expectedFocus": ["skill", "skill"]
    }
  ]
}`.trim();

  try {
    if (getProvider() === "gemini") {
      const model = getGeminiModel();
      if (!model) {
        return fallbackQuestions(mode, difficulty, resumeText, finalQuestionCount);
      }
      const result = await model.generateContent(prompt);
      const parsed = parseJson(result.response.text(), { questions: [] });
      return normalizeQuestions(parsed.questions, mode, difficulty, resumeText, finalQuestionCount);
    }

    const client = getOpenAIClient();
    if (!client) {
      return fallbackQuestions(mode, difficulty, resumeText, finalQuestionCount);
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });
    const parsed = parseJson(completion.choices[0].message.content || "", { questions: [] });
    return normalizeQuestions(parsed.questions, mode, difficulty, resumeText, finalQuestionCount);
  } catch (error) {
    console.error("[aiService] AI call failed, using fallback:", error?.message || error);
    return fallbackQuestions(mode, difficulty, resumeText, finalQuestionCount);
  }
};

const fallbackFeedback = ({ session, answers, computedScores }) => {
  const strengths = [];
  const weaknesses = [];
  const improvedAnswerSuggestions = [];

  if (computedScores.confidence >= 70) {
    strengths.push("Maintained a reasonably steady pace and answer flow.");
  } else {
    weaknesses.push("Confidence dropped because of pauses, short answers, or filler words.");
  }

  if (computedScores.communication >= 72) {
    strengths.push("Answers were structured and understandable.");
  } else {
    weaknesses.push("Communication can be improved with clearer structure and crisper openings.");
  }

  if (computedScores.technical >= 72) {
    strengths.push("Responses showed decent topic understanding for the chosen mode.");
  } else {
    weaknesses.push(`More depth is needed for ${session.mode} interview expectations.`);
  }

  answers.forEach((answer, index) => {
    improvedAnswerSuggestions.push(
      `Q${index + 1}: Start with a direct answer, add one example, and end with a measurable outcome.`
    );
  });

  return {
    summary: `This ${session.mode} interview showed a ${computedScores.overall >= 75 ? "strong" : "developing"} performance with the biggest upside in consistency and clarity.`,
    strengths,
    weaknesses,
    improvedAnswerSuggestions,
    improvementRoadmap: [
      "Practice 2-minute structured responses using Situation, Action, Result.",
      "Reduce filler words by pausing silently before key points.",
      "Review domain fundamentals tied to your target interview mode.",
      "Record one mock session daily and compare pace, clarity, and confidence."
    ],
    answerInsights: answers.map((answer, index) => ({
      questionIndex: answer.questionIndex,
      feedback: `Your answer to question ${index + 1} covered the topic but can be made sharper with a stronger first sentence and a concrete example.`,
      improvementTip: "Use a headline sentence, then support it with one example and one takeaway."
    })),
    technicalScore: computedScores.technical
  };
};

export const generateInterviewFeedback = async ({ session, answers, computedScores }) => {
  const prompt = `
You are an expert interview coach.
Mode: ${session.mode}
Difficulty: ${session.difficulty}
Scores already computed:
- confidence: ${computedScores.confidence}
- communication: ${computedScores.communication}
- overall: ${computedScores.overall}

Questions and answers:
${answers
  .map(
    (answer, index) => `
Q${index + 1}: ${answer.question}
A${index + 1}: ${answer.answer}
Voice metrics: ${JSON.stringify(answer.voiceAnalysis || {})}
Webcam metrics: ${JSON.stringify(answer.webcamAnalysis || {})}
`
  )
  .join("\n")}

Return strict JSON:
{
  "summary": "short summary",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvedAnswerSuggestions": ["..."],
  "improvementRoadmap": ["..."],
  "answerInsights": [
    {
      "questionIndex": 0,
      "feedback": "...",
      "improvementTip": "..."
    }
  ],
  "technicalScore": 0
}`.trim();

  try {
    if (getProvider() === "gemini") {
      const model = getGeminiModel();
      if (!model) {
        return fallbackFeedback({ session, answers, computedScores });
      }
      const result = await model.generateContent(prompt);
      const parsed = parseJson(result.response.text(), null);
      return parsed || fallbackFeedback({ session, answers, computedScores });
    }

    const client = getOpenAIClient();
    if (!client) {
      return fallbackFeedback({ session, answers, computedScores });
    }
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });
    return (
      parseJson(completion.choices[0].message.content || "", null) ||
      fallbackFeedback({ session, answers, computedScores })
    );
  } catch (_error) {
    return fallbackFeedback({ session, answers, computedScores });
  }
};
