export const interviewModes = [
  {
    key: "hr",
    name: "HR Interview",
    description: "Communication, self-introduction, conflict handling, motivation."
  },
  {
    key: "dsa",
    name: "DSA Interview",
    description: "Algorithms, complexity, trade-offs, problem solving."
  },
  {
    key: "resume",
    name: "Resume-based Interview",
    description: "Project depth, impact, metrics, ownership."
  },
  {
    key: "google",
    name: "Google Mode",
    description: "DSA, structured reasoning, and system thinking."
  },
  {
    key: "amazon",
    name: "Amazon Leadership Mode",
    description: "Behavioral questions around leadership principles."
  },
  {
    key: "meta",
    name: "Meta Behavioral Mode",
    description: "Collaboration, product thinking, and technical depth."
  }
];

export const difficultyOptions = ["easy", "medium", "hard"];

export const countFillerWords = (text) => {
  const fillerWords = ["um", "uh", "like", "basically", "actually"];
  return fillerWords.reduce((count, word) => {
    const matches = text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g"));
    return count + (matches?.length || 0);
  }, 0);
};

export const estimateVoiceAnalysis = (text, durationSeconds) => {
  const words = text.split(/\s+/).filter(Boolean);
  const fillerCount = countFillerWords(text);
  const pauseCount = (text.match(/(\.\.\.|--)/g) || []).length;
  return {
    speakingSpeedWpm: durationSeconds ? Math.round((words.length / durationSeconds) * 60) : 0,
    fillerCount,
    fillerWords: ["um", "uh", "like", "basically", "actually"].filter((word) =>
      text.toLowerCase().includes(word)
    ),
    longPauseCount: pauseCount,
    answerWordCount: words.length,
    clarityScore: Math.max(40, Math.min(95, 88 - fillerCount * 5 - pauseCount * 4))
  };
};

export const downloadReportFile = (payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `interview-report-${payload.session?._id || "session"}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
