const FILLER_PATTERNS = [
  "um",
  "uh",
  "like",
  "actually",
  "basically",
  "you know",
  "i think",
  "so",
  "means"
];

const STRUCTURE_WORDS = [
  "first",
  "firstly",
  "second",
  "secondly",
  "third",
  "because",
  "therefore",
  "for example",
  "for instance",
  "result",
  "finally",
  "conclusion"
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getWords = (answerText = "") =>
  answerText
    .toLowerCase()
    .match(/\b[\w']+\b/g)
    ?.filter(Boolean) || [];

const countCompleteSentences = (answerText = "") =>
  answerText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).filter(Boolean).length >= 3).length;

const detectFillerWords = (answerText = "") => {
  const normalized = answerText.toLowerCase();
  const matches = [];

  FILLER_PATTERNS.forEach((pattern) => {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const found = normalized.match(regex) || [];
    found.forEach(() => matches.push(pattern));
  });

  return matches;
};

const calculateSpeakingSpeed = (wordCount, durationSeconds) => {
  if (durationSeconds > 60 && wordCount < 30) {
    return wordCount > 0 ? 130 : 0;
  }

  if (durationSeconds > 0) {
    return Math.round((wordCount / durationSeconds) * 60);
  }

  return wordCount > 0 ? 130 : 0;
};

const calculateClarityScore = ({ words, fillerWordCount, answerText }) => {
  const sentences = answerText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const averageSentenceLength = sentences.length
    ? words.length / sentences.length
    : words.length;
  const repeatedWordCount = words.reduce((count, word, index) => {
    if (index === 0) {
      return count;
    }

    return count + (word === words[index - 1] ? 1 : 0);
  }, 0);

  let score = 100;
  score -= Math.min(fillerWordCount * 5, 25);

  if (averageSentenceLength > 24) {
    score -= 15;
  } else if (averageSentenceLength > 18) {
    score -= 8;
  }

  if (averageSentenceLength < 5 && sentences.length > 0) {
    score -= 10;
  }

  score -= Math.min(repeatedWordCount * 6, 18);

  return clamp(Math.round(score), 0, 100);
};

const calculateStructureScore = (answerText = "") => {
  const normalized = answerText.toLowerCase();
  let score = 45;

  STRUCTURE_WORDS.forEach((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(normalized)) {
      score += word.includes(" ") ? 10 : 8;
    }
  });

  return clamp(score, 0, 100);
};

export const analyzeAnswer = ({ answerText = "", durationSeconds = 0, usedMicrophone = false }) => {
  const trimmedAnswer = answerText.trim();
  const words = getWords(trimmedAnswer);
  const wordCount = words.length;
  const fillerWords = detectFillerWords(trimmedAnswer);
  const fillerWordCount = fillerWords.length;
  const speakingSpeed = calculateSpeakingSpeed(wordCount, durationSeconds);
  const sentenceCount = countCompleteSentences(trimmedAnswer);
  const hasExplanation =
    /\b(because|so that|therefore|which helped|this meant|for example|for instance)\b/i.test(
      trimmedAnswer
    ) || wordCount >= 30;

  let confidenceScore = 100;
  confidenceScore -= Math.min(fillerWordCount * 5, 25);
  if (wordCount < 20) {
    confidenceScore -= 20;
  }
  if (speakingSpeed > 0 && speakingSpeed < 90) {
    confidenceScore -= 10;
  }
  if (speakingSpeed > 180) {
    confidenceScore -= 10;
  }
  if (!usedMicrophone) {
    confidenceScore -= 10;
  }
  confidenceScore = clamp(confidenceScore, 0, 100);

  let communicationScore = 100;
  communicationScore -= Math.min(fillerWordCount * 4, 20);
  if (wordCount < 20) {
    communicationScore -= 20;
  }
  if (!hasExplanation) {
    communicationScore -= 10;
  }
  if (sentenceCount < 2) {
    communicationScore -= 10;
  }
  communicationScore = clamp(communicationScore, 0, 100);

  const clarityScore = calculateClarityScore({
    words,
    fillerWordCount,
    answerText: trimmedAnswer
  });

  const structureScore = calculateStructureScore(trimmedAnswer);

  let strength = "Answer contains useful explanation.";
  if (structureScore >= 75) {
    strength = "Well-structured response.";
  } else if (speakingSpeed >= 90 && speakingSpeed <= 160) {
    strength = "Good speaking pace.";
  } else if (clarityScore >= 80) {
    strength = "Clear answer with easy-to-follow phrasing.";
  }

  let weakness = "Response lacks structure.";
  if (wordCount < 20) {
    weakness = "Answer is too short.";
  } else if (fillerWordCount >= 3) {
    weakness = "Too many filler words.";
  } else if (structureScore < 60) {
    weakness = "Response lacks structure.";
  } else if (!hasExplanation) {
    weakness = "Answer needs more explanation.";
  }

  let improvementTip = "Use Situation → Action → Result format.";
  if (wordCount < 20) {
    improvementTip = "Expand your answer with more details.";
  } else if (fillerWordCount >= 2) {
    improvementTip = "Reduce filler words.";
  } else if (!hasExplanation) {
    improvementTip = "Provide a concrete example.";
  } else if (structureScore < 65) {
    improvementTip = "Use Situation → Action → Result format.";
  }

  return {
    wordCount,
    fillerWords,
    fillerWordCount,
    speakingSpeed,
    confidenceScore,
    communicationScore,
    clarityScore,
    structureScore,
    improvementTip,
    strength,
    weakness
  };
};
