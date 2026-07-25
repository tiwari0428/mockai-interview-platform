import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ScoreBadge from "../components/ScoreBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const COMPLETED_INTERVIEW_KEY = "mockai_last_completed_interview";
const LAST_REPORT_KEY = "mockai_last_report";
const SESSIONS_KEY = "mockai_interview_sessions";
const SELECTED_SESSION_KEY = "mockai_selected_session";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundScore = (value) => Math.round(clamp(value || 0, 0, 100));

const formatDuration = (durationSeconds = 0) => {
  const minutes = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const seconds = String(durationSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const formatMode = (mode = "") =>
  ({
    hr: "HR Interview",
    dsa: "DSA Interview",
    resume: "Resume-based Interview",
    google: "Google Mode",
    amazon: "Amazon Leadership Mode",
    meta: "Meta Behavioral Mode"
  })[mode] || mode;

const getInterpretation = (label, score) => {
  if (label === "Overall Score") {
    if (score >= 85) return "Excellent overall interview readiness.";
    if (score >= 70) return "Good performance with room to sharpen answers.";
    if (score >= 50) return "Needs practice to become more interview-ready.";
    return "Needs serious improvement before high-stakes interviews.";
  }

  if (label === "Confidence Score") {
    if (score >= 80) return "Confident delivery and stable speaking style.";
    if (score >= 65) return "Reasonably confident, but not always steady.";
    return "Confidence needs more practice and smoother delivery.";
  }

  if (label === "Communication Score") {
    if (score >= 80) return "Strong communication with useful detail.";
    if (score >= 65) return "Good communication, but answers need more depth.";
    return "Answers need more detail and clearer explanation.";
  }

  if (label === "Clarity Score") {
    if (score >= 80) return "Clear and easy-to-follow responses.";
    if (score >= 65) return "Mostly clear, with some room to tighten phrasing.";
    return "Clarity needs work to make answers easier to follow.";
  }

  if (label === "Structure Score") {
    if (score >= 80) return "Well-structured answers with strong flow.";
    if (score >= 65) return "Some structure is present, but it can be stronger.";
    return "Responses need more structure and sequencing.";
  }

  if (score >= 80) return "Strong technical-style explanation and organization.";
  if (score >= 65) return "Solid foundation, but more depth would help.";
  return "Technical explanation needs clearer structure and depth.";
};

const getResultBadge = (overallScore) => {
  if (overallScore >= 90) return "Excellent";
  if (overallScore >= 75) return "Good";
  if (overallScore >= 60) return "Average";
  return "Needs Improvement";
};

const getRecruiterVerdict = (overallScore) => {
  if (overallScore >= 85) {
    return {
      label: "Proceed to Next Round",
      tone: "green",
      description: "This candidate shows strong interview readiness and can be considered for the next evaluation stage."
    };
  }

  if (overallScore >= 70) {
    return {
      label: "Borderline Candidate",
      tone: "orange",
      description: "This candidate has useful strengths, but a recruiter would expect sharper examples and more consistent answers."
    };
  }

  return {
    label: "Needs More Practice",
    tone: "red",
    description: "This candidate should practice more before a high-stakes interview, especially on structure, depth, and delivery."
  };
};

const getVerdictBadgeClasses = (tone) =>
  ({
    green: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    orange: "border-orange-400/30 bg-orange-500/15 text-orange-100",
    red: "border-rose-400/30 bg-rose-500/15 text-rose-100"
  })[tone] || "border-white/10 bg-slate-950/60 text-slate-200";

const getScoreToneClass = (score) => {
  if (score >= 80) return "from-emerald-400 to-cyan-400";
  if (score >= 65) return "from-amber-300 to-orange-400";
  return "from-rose-400 to-orange-500";
};

const getWebcamFeedback = ({ eyeContactPercentage = 0, lookingAwayCount = 0, faceMissingCount = 0 } = {}) => {
  const feedback = [];

  if (eyeContactPercentage >= 85 && lookingAwayCount <= 2 && faceMissingCount === 0) {
    feedback.push("Excellent eye contact and camera presence.");
  } else if (eyeContactPercentage >= 70) {
    feedback.push("Good eye contact overall, with some room to stay more consistently centered.");
  } else if (eyeContactPercentage > 0) {
    feedback.push("Maintain eye contact longer during answers.");
  } else {
    feedback.push("Camera-based eye contact data was limited or unavailable.");
  }

  if (lookingAwayCount >= 5) {
    feedback.push("Frequently looked away from the camera.");
  } else if (lookingAwayCount >= 2) {
    feedback.push("A few looking-away moments were detected.");
  }

  if (faceMissingCount > 0) {
    feedback.push("Stay centered during answers so your face remains visible.");
  }

  return feedback;
};

const COMMUNICATION_FILLERS = [
  "um",
  "uh",
  "like",
  "actually",
  "basically",
  "you know",
  "kind of",
  "sort of"
];

const countTranscriptWords = (text = "") => text.match(/\b[\w']+\b/g)?.filter(Boolean).length || 0;

const countCommunicationFillers = (text = "") =>
  COMMUNICATION_FILLERS.reduce((counts, filler) => {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi")) || [];
    return {
      ...counts,
      [filler]: matches.length
    };
  }, {});

const getSpeakingPaceRating = (wordsPerMinute) => {
  if (wordsPerMinute < 100) return "Slow";
  if (wordsPerMinute <= 160) return "Good";
  if (wordsPerMinute <= 190) return "Fast";
  return "Too Fast";
};

const getCommunicationRating = (confidenceScore) => {
  if (confidenceScore >= 90) return "Excellent Speaker";
  if (confidenceScore >= 75) return "Good Speaker";
  if (confidenceScore >= 60) return "Average Speaker";
  return "Needs Improvement";
};

const buildCommunicationAnalysis = ({ answers = [], durationSeconds = 0, eyeContactPercentage = 0 }) => {
  const transcriptText = answers.map((answer) => answer.answerText || "").join(" ");
  const wordCount = countTranscriptWords(transcriptText);
  const durationMinutes = Math.max(durationSeconds / 60, 1 / 60);
  const wordsPerMinute = wordCount ? Math.round(wordCount / durationMinutes) : 0;
  const fillerWords = countCommunicationFillers(transcriptText);
  const fillerWordCount = Object.values(fillerWords).reduce((sum, count) => sum + count, 0);
  const paceRating = getSpeakingPaceRating(wordsPerMinute);
  const confidenceScore = roundScore(
    100 -
      fillerWordCount -
      (eyeContactPercentage < 80 ? 5 : 0) -
      (wordsPerMinute < 100 ? 5 : 0) -
      (wordsPerMinute > 190 ? 5 : 0)
  );

  return {
    wordCount,
    speakingPace: {
      wordsPerMinute,
      rating: paceRating
    },
    fillerWordCount,
    fillerWords,
    confidenceScore,
    communicationRating: getCommunicationRating(confidenceScore)
  };
};

const normalizeCommunicationAnalysis = (analysis, interview = {}) => {
  if (analysis) {
    return {
      wordCount: analysis.wordCount || 0,
      speakingPace:
        typeof analysis.speakingPace === "object"
          ? analysis.speakingPace
          : {
              wordsPerMinute: analysis.speakingPace || 0,
              rating: getSpeakingPaceRating(analysis.speakingPace || 0)
            },
      fillerWordCount: analysis.fillerWordCount || 0,
      fillerWords: analysis.fillerWords || countCommunicationFillers(""),
      confidenceScore: roundScore(analysis.confidenceScore || 0),
      communicationRating: analysis.communicationRating || getCommunicationRating(analysis.confidenceScore || 0)
    };
  }

  return buildCommunicationAnalysis({
    answers: interview.answers || [],
    durationSeconds: interview.durationSeconds || 0,
    eyeContactPercentage: interview.webcamAnalysis?.eyeContactPercentage || 0
  });
};

const formatSpeakingPace = (speakingPace) => {
  const wordsPerMinute =
    typeof speakingPace === "object" ? speakingPace.wordsPerMinute || 0 : speakingPace || 0;
  const rating = typeof speakingPace === "object" ? speakingPace.rating : getSpeakingPaceRating(wordsPerMinute);
  return `${wordsPerMinute} WPM (${rating})`;
};

const formatFillerWordCounts = (fillerWords = {}) => {
  const entries = Object.entries(fillerWords).filter(([, count]) => count > 0);
  return entries.length ? entries.map(([word, count]) => `${word}: ${count}`).join(", ") : "None detected";
};

const metricPattern =
  /\b\d+(?:\.\d+)?\s*%|\b\d+\s*(?:users?|ms|seconds?|minutes?|hours?|x|times|projects?|orders?)\b|\b(?:improved|reduced|increased|optimized|achieved|saved|faster|accuracy|performance|load time)\b/i;
const projectContextPattern = /\b(project|built|developed|implemented|platform|application|app|website|dashboard)\b/i;

const hasMeasurableProjectImpactGap = (answers = []) =>
  answers.some((answer) => {
    const combined = `${answer.question || ""} ${answer.answerText || ""}`;
    return projectContextPattern.test(combined) && !metricPattern.test(combined);
  });

const buildPerformanceBreakdown = ({ scores, webcamAnalysis }) => {
  const eyeContactPercentage = roundScore(webcamAnalysis?.eyeContactPercentage || 0);
  const professionalism = roundScore(
    (scores.clarityScore * 0.35 + scores.structureScore * 0.35 + eyeContactPercentage * 0.3)
  );
  const categories = [
    { label: "Communication", score: scores.communicationScore },
    { label: "Confidence", score: scores.confidenceScore },
    { label: "Technical Depth", score: scores.technicalScore },
    { label: "Professionalism", score: professionalism }
  ];
  const interviewReadiness = roundScore(
    categories.reduce((sum, category) => sum + category.score, 0) / Math.max(categories.length, 1)
  );

  return [...categories, { label: "Interview Readiness", score: interviewReadiness }];
};

const buildTopStrengths = ({ scores, performanceBreakdown, webcamAnalysis }) => {
  const candidates = [
    { score: scores.communicationScore, text: "Strong communication skills" },
    { score: scores.confidenceScore, text: "Good confidence level" },
    { score: scores.structureScore, text: "Clear answer structure" },
    { score: scores.clarityScore, text: "Clear and understandable delivery" },
    { score: scores.technicalScore, text: "Strong technical explanation" },
    {
      score: scores.averageFillerWordCount < 1 ? 88 : scores.averageFillerWordCount < 2 ? 78 : 45,
      text: "Low filler word usage"
    },
    {
      score:
        (webcamAnalysis?.eyeContactPercentage || 0) -
        Math.min((webcamAnalysis?.lookingAwayCount || 0) * 4, 20) -
        Math.min((webcamAnalysis?.faceMissingCount || 0) * 8, 24),
      text: "Good eye contact consistency"
    },
    {
      score: performanceBreakdown.find((item) => item.label === "Interview Readiness")?.score || 0,
      text: "Good overall interview readiness"
    }
  ];

  const highConfidenceStrengths = candidates
    .filter((candidate) => candidate.score >= 75)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => candidate.text);

  if (highConfidenceStrengths.length >= 3) {
    return highConfidenceStrengths;
  }

  return candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => candidate.text);
};

const buildTopImprovementAreas = ({ scores, performanceBreakdown, webcamAnalysis, answers }) => {
  const averageWordCount =
    answers.reduce((sum, answer) => sum + (answer.analysis?.wordCount || 0), 0) / Math.max(answers.length, 1);
  const projectImpactGap = hasMeasurableProjectImpactGap(answers);
  const candidates = [
    { severity: 100 - scores.technicalScore, text: "Add more technical depth" },
    { severity: scores.averageFillerWordCount >= 2 ? 82 : 35, text: "Reduce filler words" },
    { severity: 100 - scores.structureScore, text: "Improve answer structure" },
    {
      severity:
        100 -
        ((webcamAnalysis?.eyeContactPercentage || 0) -
          Math.min((webcamAnalysis?.lookingAwayCount || 0) * 4, 20) -
          Math.min((webcamAnalysis?.faceMissingCount || 0) * 8, 24)),
      text: "Maintain eye contact longer"
    },
    { severity: projectImpactGap ? 88 : 30, text: "Provide measurable project impact" },
    { severity: 100 - scores.confidenceScore, text: "Build steadier speaking confidence" },
    { severity: averageWordCount < 35 ? 80 : 35, text: "Expand short answers with examples" },
    {
      severity: 100 - (performanceBreakdown.find((item) => item.label === "Professionalism")?.score || 0),
      text: "Improve professional camera presence"
    }
  ];

  return candidates
    .sort((left, right) => right.severity - left.severity)
    .slice(0, 3)
    .map((candidate) => candidate.text);
};

const buildSuggestedBetterAnswer = (answer) => {
  const analysis = answer?.analysis || {};
  const answerText = answer?.answerText || "";
  const question = answer?.question || "this question";
  const snippet = answerText.length > 180 ? `${answerText.slice(0, 180).trim()}...` : answerText;

  if ((analysis.wordCount || 0) < 20) {
    return {
      format: "Expanded Answer",
      text:
        `A stronger answer would directly address "${question}", then add context, action, and result. ` +
        `For example: I would begin by explaining the situation, describe the specific steps I took, mention the tools or decisions involved, and close with the outcome. ` +
        `I would also add a measurable result such as improved performance, reduced time, better accuracy, or user impact.`
    };
  }

  if ((analysis.structureScore || 0) < 70) {
    return {
      format: "STAR Format",
      text:
        `Situation: Briefly explain the context behind "${question}".\n` +
        `Task: State what you were responsible for or what problem you needed to solve.\n` +
        `Action: Use your original point "${snippet}" and organize it into 2-3 concrete steps.\n` +
        `Result: End with the impact, preferably with a number, improvement, or clear learning.`
    };
  }

  return {
    format: "Sharper Version",
    text:
      `${answerText} To make this stronger, add one specific example, explain why your approach worked, and close with a measurable result or business/user impact.`
  };
};

const buildInterviewSummary = ({ scores, webcamAnalysis, topImprovementAreas }) => {
  const strongParts = [];
  const improvementParts = [];

  if (scores.communicationScore >= 80) strongParts.push("strong communication skills");
  if (scores.confidenceScore >= 80) strongParts.push("good confidence");
  if (scores.clarityScore >= 80) strongParts.push("clear delivery");
  if (scores.structureScore >= 80) strongParts.push("well-structured answers");
  if ((webcamAnalysis?.eyeContactPercentage || 0) >= 80) strongParts.push("consistent eye contact");

  if (scores.technicalScore < 80) improvementParts.push("deeper technical explanations");
  if (scores.structureScore < 80) improvementParts.push("more structured storytelling");
  if (scores.averageFillerWordCount >= 2) improvementParts.push("lower filler word usage");
  if ((webcamAnalysis?.eyeContactPercentage || 0) < 80) improvementParts.push("longer eye contact");
  if (topImprovementAreas.includes("Provide measurable project impact")) {
    improvementParts.push("measurable project impact");
  }

  const strengths = strongParts.length ? strongParts.join(", ") : "a foundation to build on";
  const improvements = improvementParts.length ? improvementParts.join(", ") : "continued consistency across answers";

  return `You demonstrated ${strengths} during the interview. Your overall performance shows ${
    scores.overallScore >= 85 ? "strong readiness for the next round" : scores.overallScore >= 70 ? "promising readiness with some gaps" : "clear room for practice"
  }. Focus next on ${improvements} to make your responses more recruiter-ready and easier to evaluate.`;
};

const buildImprovementStrategy = (answer) => {
  const analysis = answer.analysis || {};

  if ((analysis.wordCount || 0) < 20) {
    return "To improve this answer, explain the situation, your action, and the result. Add one concrete example.";
  }

  if ((analysis.fillerWordCount || 0) >= 3) {
    return "Rewrite the answer with fewer filler words and clearer structure.";
  }

  if ((analysis.structureScore || 0) < 70) {
    return "Reframe the answer using First, Then, Finally or STAR format so the interviewer can follow your logic easily.";
  }

  return "Strengthen this answer by adding one specific example and a measurable outcome.";
};

const buildSevenDayPlan = ({
  confidenceScore,
  communicationScore,
  structureScore,
  technicalScore,
  averageFillerWordCount,
  webcamAnalysis,
  projectImpactGap
}) => {
  const needsConfidence = confidenceScore < 70;
  const needsCommunication = communicationScore < 70;
  const needsStructure = structureScore < 70;
  const needsFillerReduction = averageFillerWordCount >= 2;
  const needsTechnicalDepth = technicalScore < 80;
  const needsEyeContact = (webcamAnalysis?.eyeContactPercentage || 0) < 80 || (webcamAnalysis?.lookingAwayCount || 0) >= 3;

  return [
    needsConfidence
      ? "Practice self-introduction answers aloud for 2 minutes to build confidence and smoother pacing."
      : "Practice one strong self-introduction and keep your pace steady.",
    projectImpactGap
      ? "Practice explaining one project with problem, tech stack, action, and measurable impact."
      : "Practice one project explanation and keep the outcome specific.",
    needsCommunication
      ? "Expand short answers by adding explanation, example, and outcome."
      : "Answer 5 behavioral questions with slightly more depth and detail.",
    needsStructure
      ? "Practice STAR format on behavioral answers: Situation, Task, Action, Result."
      : "Practice keeping strong answer structure with clear sequencing.",
    needsTechnicalDepth
      ? "Explain one technical topic with trade-offs, implementation details, and edge cases."
      : "Practice technical communication with one clean architecture or debugging explanation.",
    needsFillerReduction
      ? "Record yourself answering questions and remove filler words like um, actually, and I think."
      : "Record one mock answer and focus on smoother transitions between ideas.",
    needsEyeContact
      ? "Do one full mock interview while staying centered and maintaining camera contact."
      : "Do one full mock interview and review your weakest two answers."
  ];
};

const getAnswerCompositeScore = (answer) => {
  const analysis = answer.analysis || {};
  return (
    ((analysis.confidenceScore || 0) +
      (analysis.communicationScore || 0) +
      (analysis.clarityScore || 0) +
      (analysis.structureScore || 0)) /
    4
  );
};

const getAnswerAnalysisItems = (answers = []) =>
  answers.flatMap((answer) => {
    const items = answer.analysis
      ? [
          {
            question: answer.question,
            answerText: answer.answerText,
            analysis: answer.analysis,
            questionIndex: answer.questionIndex,
            isFollowUp: false
          }
        ]
      : [];

    if (answer.followUpQuestion && answer.followUpAnswer && answer.followUpAnalysis) {
      items.push({
        question: answer.followUpQuestion,
        answerText: answer.followUpAnswer,
        analysis: answer.followUpAnalysis,
        questionIndex: answer.questionIndex,
        isFollowUp: true
      });
    }

    return items;
  });

const getConversationCompositeScore = (answer) => {
  const analysisItems = getAnswerAnalysisItems([answer]);
  if (!analysisItems.length) {
    return 0;
  }

  return (
    analysisItems.reduce((sum, item) => sum + getAnswerCompositeScore(item), 0) /
    analysisItems.length
  );
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const normalizePdfText = (value = "") =>
  String(value)
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();

const escapePdfText = (value = "") =>
  normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapPdfLine = (text, maxLength = 86) => {
  const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
};

const createPdfBlob = (sections) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const lineHeight = 16;
  const pages = [[]];
  let y = pageHeight - margin;

  const addPage = () => {
    pages.push([]);
    y = pageHeight - margin;
  };

  const addLine = (text, { size = 11, bold = false, gap = 0 } = {}) => {
    if (y < margin + lineHeight) {
      addPage();
    }

    pages[pages.length - 1].push({
      text: escapePdfText(text),
      x: margin,
      y,
      size,
      bold
    });
    y -= lineHeight + gap;
  };

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      y -= 8;
    }
    addLine(section.title, { size: sectionIndex === 0 ? 18 : 14, bold: true, gap: 4 });
    section.lines.forEach((line) => {
      const wrappedLines = wrapPdfLine(line);
      wrappedLines.forEach((wrappedLine) => addLine(wrappedLine, { size: 10 }));
    });
  });

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogObject = addObject("");
  const pagesObject = addObject("");
  const regularFontObject = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontObject = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageObjectNumbers = [];

  pages.forEach((pageLines) => {
    const content = pageLines
      .map(
        (line) =>
          `BT /${line.bold ? "F2" : "F1"} ${line.size} Tf ${line.x} ${line.y} Td (${line.text}) Tj ET`
      )
      .join("\n");
    const contentObject = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageObject = addObject(
      `<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    pageObjectNumbers.push(pageObject);
  });

  objects[catalogObject - 1] = `<< /Type /Catalog /Pages ${pagesObject} 0 R >>`;
  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((objectNumber) => `${objectNumber} 0 R`)
    .join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const downloadPdfBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const buildPdfSections = ({ candidateName, interview, report }) => {
  const webcamAnalysis = report.webcamAnalysis || {};
  const communicationAnalysis = normalizeCommunicationAnalysis(report.communicationAnalysis, interview);
  const scores = report.scores || {};
  const recruiterVerdict = report.recruiterVerdict || getRecruiterVerdict(scores.overallScore || 0);
  const performanceBreakdown =
    report.performanceBreakdown || buildPerformanceBreakdown({ scores, webcamAnalysis });
  const topStrengths = report.topStrengths || report.strengths || [];
  const topImprovementAreas = report.topImprovementAreas || report.weakAreas || [];
  const webcamFeedback = report.webcamFeedback || getWebcamFeedback(webcamAnalysis);
  const betterAnswerCoaching =
    report.betterAnswerCoaching ||
    {
      question: report.weakestAnswer?.question || "",
      answerText: report.weakestAnswer?.answerText || "",
      suggestedAnswer: buildSuggestedBetterAnswer(report.weakestAnswer)
    };

  return [
    {
      title: "MockAI Interview Report",
      lines: [
        `Candidate Name: ${candidateName || "Candidate"}`,
        `Interview Mode: ${report.summary?.mode || formatMode(interview?.mode || "")}`,
        `Date: ${report.summary?.date ? new Date(report.summary.date).toLocaleString() : "Not available"}`,
        `Overall Score: ${scores.overallScore || 0}/100`,
        `Recruiter Verdict: ${recruiterVerdict.label}`
      ]
    },
    {
      title: "Performance Breakdown",
      lines: performanceBreakdown.map((item) => `${item.label}: ${item.score}/100`)
    },
    {
      title: "Top Strengths",
      lines: topStrengths.map((item) => `- ${item}`)
    },
    {
      title: "Top Improvement Areas",
      lines: topImprovementAreas.map((item) => `- ${item}`)
    },
    {
      title: "Communication Intelligence",
      lines: [
        `Word Count: ${communicationAnalysis.wordCount}`,
        `Speaking Pace: ${formatSpeakingPace(communicationAnalysis.speakingPace)}`,
        `Filler Words: ${communicationAnalysis.fillerWordCount}`,
        `Filler Details: ${formatFillerWordCounts(communicationAnalysis.fillerWords)}`,
        `Confidence Score: ${communicationAnalysis.confidenceScore}/100`,
        `Communication Rating: ${communicationAnalysis.communicationRating}`
      ]
    },
    {
      title: "Question and Follow-Up Conversations",
      lines: (report.questionFeedback || interview?.answers || []).flatMap((answer, index) => [
        `Question ${index + 1}: ${answer.question || "Not available"}`,
        `Answer: ${answer.answerText || "Not answered"}`,
        answer.followUpQuestion ? `Follow-Up Question: ${answer.followUpQuestion}` : "Follow-Up Question: Not available",
        answer.followUpAnswer ? `Follow-Up Answer: ${answer.followUpAnswer}` : "Follow-Up Answer: Not answered"
      ])
    },
    {
      title: "Interview Summary",
      lines: [
        report.interviewSummary ||
          buildInterviewSummary({
            scores,
            webcamAnalysis,
            topImprovementAreas
          })
      ]
    },
    {
      title: "Practice Plan",
      lines: (report.improvementPlan || []).map((item, index) => `Day ${index + 1}: ${item}`)
    },
    {
      title: "Webcam Analysis",
      lines: [
        `Eye Contact: ${webcamAnalysis.eyeContactPercentage || 0}%`,
        `Looking Away Count: ${webcamAnalysis.lookingAwayCount || 0}`,
        `Face Missing Count: ${webcamAnalysis.faceMissingCount || 0}`,
        ...webcamFeedback.map((item) => `- ${item}`)
      ]
    },
    {
      title: "Better Answer Coaching",
      lines: [
        `Question: ${betterAnswerCoaching.question || "Not available"}`,
        `Your Answer: ${betterAnswerCoaching.answerText || "Not available"}`,
        `Suggested Better Answer: ${betterAnswerCoaching.suggestedAnswer?.text || "Not available"}`
      ]
    }
  ].filter((section) => section.lines.length);
};

const buildReportFromInterview = (completedInterview) => {
  if (!completedInterview?.answers?.length) {
    return null;
  }

  const answers = completedInterview.answers;
  const answerCount = answers.length;
  const analysisItems = getAnswerAnalysisItems(answers);
  const analysisCount = analysisItems.length || answerCount;

  const average = (selector) =>
    roundScore(
      analysisItems.reduce((sum, answer) => sum + (selector(answer) || 0), 0) / Math.max(analysisCount, 1)
    );

  const confidenceScore = average((answer) => answer.analysis?.confidenceScore);
  const communicationScore = average((answer) => answer.analysis?.communicationScore);
  const clarityScore = average((answer) => answer.analysis?.clarityScore);
  const structureScore = average((answer) => answer.analysis?.structureScore);
  const technicalScore = roundScore((communicationScore + structureScore) / 2);
  const overallScore = roundScore(
    confidenceScore * 0.25 +
      communicationScore * 0.3 +
      clarityScore * 0.2 +
      structureScore * 0.15 +
      technicalScore * 0.1
  );
  const averageFillerWordCount =
    analysisItems.reduce((sum, answer) => sum + (answer.analysis?.fillerWordCount || 0), 0) /
    Math.max(analysisCount, 1);
  const webcamAnalysis = {
    eyeContactPercentage: roundScore(completedInterview.webcamAnalysis?.eyeContactPercentage || 0),
    lookingAwayCount: completedInterview.webcamAnalysis?.lookingAwayCount || 0,
    faceMissingCount: completedInterview.webcamAnalysis?.faceMissingCount || 0
  };
  const communicationAnalysis = normalizeCommunicationAnalysis(completedInterview.communicationAnalysis, completedInterview);

  const strengths = [];
  const weakAreas = [];

  if (confidenceScore >= 80) strengths.push("Strong speaking confidence");
  if (clarityScore >= 80) strengths.push("Clear and understandable answers");
  if (structureScore >= 75) strengths.push("Well-structured responses");
  if (averageFillerWordCount < 2) strengths.push("Low filler word usage");

  if (confidenceScore < 70) weakAreas.push("Improve confidence and speaking pace");
  if (communicationScore < 70) weakAreas.push("Give more detailed answers");
  if (structureScore < 70) weakAreas.push("Use STAR or First-Then-Finally structure");
  if (averageFillerWordCount >= 2) weakAreas.push("Reduce filler words");

  const sortedByScore = [...analysisItems].sort(
    (left, right) => getAnswerCompositeScore(right) - getAnswerCompositeScore(left)
  );
  const bestAnswer = sortedByScore[0];
  const weakestAnswer = sortedByScore[sortedByScore.length - 1];

  const summary = {
    mode: formatMode(completedInterview.mode),
    difficulty: completedInterview.difficulty,
    totalQuestions: completedInterview.questionCount || completedInterview.questions?.length || answerCount,
    duration: formatDuration(completedInterview.durationSeconds || 0),
    date: completedInterview.endedAt || completedInterview.startedAt,
    resultBadge: getResultBadge(overallScore)
  };

  const scoreCards = [
    ["Overall Score", overallScore],
    ["Confidence Score", confidenceScore],
    ["Communication Score", communicationScore],
    ["Clarity Score", clarityScore],
    ["Structure Score", structureScore],
    ["Technical Score", technicalScore]
  ].map(([label, score]) => ({
    label,
    score,
    interpretation: getInterpretation(label, score)
  }));

  const questionFeedback = answers.map((answer, index) => ({
    ...answer,
    displayIndex: index + 1,
    improvedStrategy: buildImprovementStrategy(answer)
  }));
  const scores = {
    overallScore,
    confidenceScore,
    communicationScore,
    clarityScore,
    structureScore,
    technicalScore,
    averageFillerWordCount
  };
  const performanceBreakdown = buildPerformanceBreakdown({ scores, webcamAnalysis });
  const topStrengths = buildTopStrengths({ scores, performanceBreakdown, webcamAnalysis });
  const topImprovementAreas = buildTopImprovementAreas({
    scores,
    performanceBreakdown,
    webcamAnalysis,
    answers
  });
  const betterAnswerCoaching = {
    question: weakestAnswer?.question || "",
    answerText: weakestAnswer?.answerText || "",
    suggestedAnswer: buildSuggestedBetterAnswer(weakestAnswer)
  };
  const webcamFeedback = getWebcamFeedback(webcamAnalysis);
  const projectImpactGap = hasMeasurableProjectImpactGap(answers);

  return {
    summary,
    scores,
    recruiterVerdict: getRecruiterVerdict(overallScore),
    performanceBreakdown,
    strengths,
    weakAreas,
    topStrengths,
    topImprovementAreas,
    bestAnswer,
    weakestAnswer,
    betterAnswerCoaching,
    interviewSummary: buildInterviewSummary({ scores, webcamAnalysis, topImprovementAreas }),
    webcamAnalysis,
    webcamFeedback,
    communicationAnalysis,
    scoreCards,
    questionFeedback,
    improvementPlan: buildSevenDayPlan({
      confidenceScore,
      communicationScore,
      structureScore,
      technicalScore,
      averageFillerWordCount,
      webcamAnalysis,
      projectImpactGap
    })
  };
};

const createSessionObject = (interview, report) => {
  const sessionTimestamp = new Date(interview.endedAt || interview.startedAt || Date.now()).getTime();

  return {
    id: `session_${sessionTimestamp}`,
    createdAt: interview.endedAt || interview.startedAt || new Date().toISOString(),
    mode: formatMode(interview.mode),
    difficulty: interview.difficulty,
    overallScore: report.scores.overallScore,
    report,
    interview
  };
};

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copyMessage, setCopyMessage] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const selectedSessionId = useMemo(() => localStorage.getItem(SELECTED_SESSION_KEY), []);
  const completedInterview = useMemo(() => readJson(COMPLETED_INTERVIEW_KEY, null), []);
  const storedSessions = useMemo(() => readJson(SESSIONS_KEY, []), []);

  const selectedSession = useMemo(
    () => storedSessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, storedSessions]
  );

  const reportBundle = useMemo(() => {
    if (selectedSession?.interview) {
      const rebuiltReport = buildReportFromInterview(selectedSession.interview);
      const nextReport = rebuiltReport || selectedSession.report;
      if (!nextReport) {
        return null;
      }
      return {
        source: "selected_session",
        sessionId: selectedSession.id,
        interview: selectedSession.interview,
        report: nextReport
      };
    }

    if (!completedInterview) {
      return null;
    }

    const report = buildReportFromInterview(completedInterview);
    if (!report) {
      return null;
    }

    return {
      source: "last_completed",
      sessionId: null,
      interview: completedInterview,
      report
    };
  }, [selectedSession, completedInterview]);

  useEffect(() => {
    if (!reportBundle) {
      return;
    }

    const payload = {
      source: reportBundle.source,
      generatedAt: new Date().toISOString(),
      summary: reportBundle.report.summary,
      scores: reportBundle.report.scores,
      strengths: reportBundle.report.strengths,
      weakAreas: reportBundle.report.weakAreas,
      recruiterVerdict: reportBundle.report.recruiterVerdict,
      performanceBreakdown: reportBundle.report.performanceBreakdown,
      topStrengths: reportBundle.report.topStrengths,
      topImprovementAreas: reportBundle.report.topImprovementAreas,
      interviewSummary: reportBundle.report.interviewSummary,
      webcamAnalysis: reportBundle.report.webcamAnalysis,
      communicationAnalysis: reportBundle.report.communicationAnalysis,
      improvementPlan: reportBundle.report.improvementPlan
    };

    localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(payload));
  }, [reportBundle]);

  useEffect(() => {
    if (!reportBundle || reportBundle.source !== "last_completed") {
      return;
    }

    const nextSession = createSessionObject(reportBundle.interview, reportBundle.report);
    const existingSessions = readJson(SESSIONS_KEY, []);
    const deduped = existingSessions.filter((session) => session.id !== nextSession.id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([nextSession, ...deduped]));
  }, [reportBundle]);

  const handleCopySummary = async () => {
    if (!reportBundle) {
      return;
    }

    const summaryText = [
      `Interview Mode: ${reportBundle.report.summary.mode}`,
      `Overall Score: ${reportBundle.report.scores.overallScore}/100`,
      `Strengths: ${reportBundle.report.strengths.join(", ") || "Keep building consistency"}`,
      `Weak Areas: ${reportBundle.report.weakAreas.join(", ") || "No major weak areas detected"}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyMessage("Summary copied.");
    } catch (_error) {
      setCopyMessage("Could not copy summary.");
    }
  };

  const handleDownloadPdf = () => {
    if (!reportBundle) {
      return;
    }

    try {
      const candidateName = user?.name || reportBundle.interview?.candidateName || "Candidate";
      const sections = buildPdfSections({
        candidateName,
        interview: reportBundle.interview,
        report: reportBundle.report
      });
      const blob = createPdfBlob(sections);
      downloadPdfBlob(blob, `mockai-interview-report-${Date.now()}.pdf`);
      setPdfMessage("PDF downloaded.");
    } catch (error) {
      console.log("[ReportPage] PDF export failed:", error);
      setPdfMessage("Could not generate PDF.");
    }
  };

  if (!reportBundle) {
    return (
      <div className="shell py-16">
        <div className="panel mx-auto flex min-h-[24rem] max-w-2xl flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Report</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">No completed interview found.</h1>
          <p className="mt-3 max-w-xl text-slate-300">Finish an interview first to generate your AI feedback report.</p>
          <Link to="/start-interview" className="button-primary mt-6">
            Start New Interview
          </Link>
        </div>
      </div>
    );
  }

  const { interview, report } = reportBundle;
  const {
    summary,
    scores,
    strengths,
    weakAreas,
    bestAnswer,
    weakestAnswer,
    scoreCards,
    questionFeedback,
    improvementPlan,
    recruiterVerdict,
    performanceBreakdown,
    topStrengths,
    topImprovementAreas,
    betterAnswerCoaching,
    interviewSummary,
    webcamAnalysis,
    webcamFeedback,
    communicationAnalysis
  } = report;
  const candidateName = user?.name || interview?.candidateName || "Candidate";
  const safeWebcamAnalysis = webcamAnalysis || { eyeContactPercentage: 0, lookingAwayCount: 0, faceMissingCount: 0 };
  const safeCommunicationAnalysis = normalizeCommunicationAnalysis(communicationAnalysis, interview);
  const safeRecruiterVerdict = recruiterVerdict || getRecruiterVerdict(scores.overallScore);
  const safePerformanceBreakdown =
    performanceBreakdown || buildPerformanceBreakdown({ scores, webcamAnalysis: safeWebcamAnalysis });
  const safeTopStrengths = topStrengths || strengths || [];
  const safeTopImprovementAreas = topImprovementAreas || weakAreas || [];
  const safeWebcamFeedback = webcamFeedback || getWebcamFeedback(safeWebcamAnalysis);
  const safeBetterAnswerCoaching =
    betterAnswerCoaching ||
    {
      question: weakestAnswer?.question || "",
      answerText: weakestAnswer?.answerText || "",
      suggestedAnswer: buildSuggestedBetterAnswer(weakestAnswer)
    };
  const safeInterviewSummary =
    interviewSummary ||
    buildInterviewSummary({
      scores,
      webcamAnalysis: safeWebcamAnalysis,
      topImprovementAreas: safeTopImprovementAreas
    });

  return (
    <div className="shell py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Report</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Your AI Interview Performance Report</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Review your scores, strengths, weak areas, and improvement plan.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button className="button-primary" onClick={handleDownloadPdf}>
            Download Interview Report
          </button>
          {pdfMessage ? <span className="text-sm text-slate-300">{pdfMessage}</span> : null}
        </div>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Recruiter Verdict</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white">{safeRecruiterVerdict.label}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{safeRecruiterVerdict.description}</p>
          </div>
          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${getVerdictBadgeClasses(
              safeRecruiterVerdict.tone
            )}`}
          >
            {safeRecruiterVerdict.label}
          </div>
        </div>
      </section>

      <div className="panel mt-8 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          {[
            ["Interview Mode", summary.mode],
            ["Candidate", candidateName],
            ["Difficulty", summary.difficulty],
            ["Total Questions", String(summary.totalQuestions)],
            ["Duration", summary.duration],
            ["Date", new Date(summary.date).toLocaleString()],
            ["Result", summary.resultBadge]
          ].map(([label, value]) => (
            <div key={label} className="panel-soft p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="panel mt-8 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
              Interview Performance Breakdown
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Recruiter Category Scores</h2>
          </div>
          <ScoreBadge score={safePerformanceBreakdown.find((item) => item.label === "Interview Readiness")?.score || 0} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {safePerformanceBreakdown.map((item) => (
            <div key={item.label} className="panel-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="font-semibold text-white">{item.score}/100</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getScoreToneClass(item.score)}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-8 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
              Communication Intelligence
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Transcript-Based Speaking Analysis</h2>
          </div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            {safeCommunicationAnalysis.communicationRating}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Speaking Pace", formatSpeakingPace(safeCommunicationAnalysis.speakingPace)],
            ["Filler Words", String(safeCommunicationAnalysis.fillerWordCount)],
            ["Confidence Score", `${safeCommunicationAnalysis.confidenceScore}/100`],
            ["Communication Rating", safeCommunicationAnalysis.communicationRating]
          ].map(([label, value]) => (
            <div key={label} className="panel-soft p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
          <p>
            <span className="font-semibold text-white">Total words:</span> {safeCommunicationAnalysis.wordCount}
          </p>
          <p>
            <span className="font-semibold text-white">Filler breakdown:</span>{" "}
            {formatFillerWordCounts(safeCommunicationAnalysis.fillerWords)}
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {scoreCards.map((card) => (
          <div key={card.label} className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{card.label}</p>
              <ScoreBadge score={card.score} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width: `${card.score}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{card.interpretation}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Top Strengths</h2>
          <div className="mt-4 space-y-3">
            {(safeTopStrengths.length ? safeTopStrengths : ["Keep building consistency across all answers."]).map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-400/10 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Top Improvement Areas</h2>
          <div className="mt-4 space-y-3">
            {(safeTopImprovementAreas.length
              ? safeTopImprovementAreas
              : ["No major weak areas detected. Focus on repetition and consistency."]).map((item) => (
              <div key={item} className="rounded-2xl border border-amber-400/10 bg-amber-500/10 p-4 text-sm text-amber-100">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Best Answer</h2>
          <p className="mt-4 text-sm text-slate-400">{bestAnswer?.question}</p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
            {bestAnswer?.answerText}
          </p>
          <p className="mt-4 text-sm text-emerald-100">
            Why it was strong: {bestAnswer?.analysis?.strength || "This response combined stronger communication and structure."}
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Weakest Answer</h2>
          <p className="mt-4 text-sm text-slate-400">{weakestAnswer?.question}</p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
            {weakestAnswer?.answerText}
          </p>
          <p className="mt-4 text-sm text-amber-100">
            What needs improvement: {weakestAnswer?.analysis?.weakness || "This answer needs stronger detail and clearer structure."}
          </p>
        </section>
      </div>

      <section className="panel mt-8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Better Answer Coaching</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Improve Your Weakest Response</h2>
          </div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            {safeBetterAnswerCoaching.suggestedAnswer?.format || "Coaching"}
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-400">{safeBetterAnswerCoaching.question}</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="font-semibold text-white">Your Answer</h3>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {safeBetterAnswerCoaching.answerText || "No answer text was available for this question."}
            </p>
          </div>
          <div className="rounded-3xl border border-cyan-400/10 bg-cyan-400/10 p-5">
            <h3 className="font-semibold text-cyan-50">Suggested Better Answer</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-cyan-50">
              {safeBetterAnswerCoaching.suggestedAnswer?.text}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Summary</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Recruiter-Style Summary</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">{safeInterviewSummary}</p>
        </section>

        <section className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Webcam Analysis</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Camera Presence</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["Eye Contact", `${safeWebcamAnalysis.eyeContactPercentage || 0}%`],
              ["Looking Away Count", String(safeWebcamAnalysis.lookingAwayCount || 0)],
              ["Face Missing Count", String(safeWebcamAnalysis.faceMissingCount || 0)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {safeWebcamFeedback.map((item) => (
              <div key={item} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-8 p-6">
        <h2 className="font-display text-2xl font-bold text-white">Question-wise Feedback</h2>
        <div className="mt-5 space-y-4">
          {questionFeedback.map((answer) => (
            <details key={`${answer.questionIndex}-${answer.question}`} className="panel-soft rounded-3xl p-5">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Question {answer.displayIndex}</p>
                    <p className="mt-1 font-semibold text-white">{answer.question}</p>
                  </div>
                  <ScoreBadge
                    score={roundScore(getConversationCompositeScore(answer))}
                  />
                </div>
              </summary>

              <div className="mt-5">
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                  {answer.answerText}
                </p>

                {answer.followUpQuestion ? (
                  <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-50">
                    <p className="font-semibold text-white">Follow-Up Question</p>
                    <p className="mt-2">{answer.followUpQuestion}</p>
                    <p className="mt-4 font-semibold text-white">Follow-Up Answer</p>
                    <p className="mt-2">{answer.followUpAnswer || "Not answered"}</p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Confidence", answer.analysis?.confidenceScore || 0],
                    ["Communication", answer.analysis?.communicationScore || 0],
                    ["Clarity", answer.analysis?.clarityScore || 0],
                    ["Structure", answer.analysis?.structureScore || 0]
                  ].map(([label, score]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-sm text-slate-400">{label}</p>
                      <p className="mt-2 font-semibold text-white">{score}/100</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                  <p>
                    <span className="font-semibold text-white">Filler words:</span>{" "}
                    {answer.analysis?.fillerWords?.length ? answer.analysis.fillerWords.join(", ") : "None"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Strength:</span> {answer.analysis?.strength}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Weakness:</span> {answer.analysis?.weakness}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Improvement tip:</span> {answer.analysis?.improvementTip}
                  </p>
                </div>

                {answer.followUpAnalysis ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                    <p className="font-semibold text-white">Follow-Up Analysis</p>
                    <p>
                      <span className="font-semibold text-white">Confidence:</span>{" "}
                      {answer.followUpAnalysis.confidenceScore || 0}/100
                    </p>
                    <p>
                      <span className="font-semibold text-white">Communication:</span>{" "}
                      {answer.followUpAnalysis.communicationScore || 0}/100
                    </p>
                    <p>
                      <span className="font-semibold text-white">Clarity:</span>{" "}
                      {answer.followUpAnalysis.clarityScore || 0}/100
                    </p>
                    <p>
                      <span className="font-semibold text-white">Structure:</span>{" "}
                      {answer.followUpAnalysis.structureScore || 0}/100
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-50">
                  <span className="font-semibold">Improved Answer Strategy:</span> {answer.improvedStrategy}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel mt-8 p-6">
        <h2 className="font-display text-2xl font-bold text-white">7-Day Practice Plan</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {improvementPlan.map((item, index) => (
            <div key={item} className="panel-soft p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Day {index + 1}</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          className="button-primary"
          onClick={() => {
            localStorage.removeItem(SELECTED_SESSION_KEY);
            navigate("/start-interview");
          }}
        >
          Start Another Interview
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            localStorage.removeItem(SELECTED_SESSION_KEY);
            navigate("/dashboard");
          }}
        >
          Go to Dashboard
        </button>
        <button className="button-secondary" onClick={handleCopySummary}>
          Copy Report Summary
        </button>
        <button className="button-secondary" onClick={handleDownloadPdf}>
          Download Interview Report
        </button>
        {copyMessage ? <span className="text-sm text-slate-300">{copyMessage}</span> : null}
        {pdfMessage ? <span className="text-sm text-slate-300">{pdfMessage}</span> : null}
      </div>
    </div>
  );
};

export default ReportPage;
