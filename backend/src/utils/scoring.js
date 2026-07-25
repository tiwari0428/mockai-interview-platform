const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const computeVoiceMetrics = (answerText, durationSeconds = 0) => {
  const normalized = answerText.toLowerCase();
  const fillerDictionary = ["um", "uh", "like", "basically", "actually"];
  const fillerWords = fillerDictionary.filter((filler) =>
    new RegExp(`\\b${filler}\\b`, "i").test(normalized)
  );
  const fillerCount = fillerDictionary.reduce((count, filler) => {
    const matches = normalized.match(new RegExp(`\\b${filler}\\b`, "gi"));
    return count + (matches?.length || 0);
  }, 0);

  const words = answerText
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const answerWordCount = words.length;
  const speakingSpeedWpm =
    durationSeconds > 0 ? Math.round((answerWordCount / durationSeconds) * 60) : 0;

  const pauseMatches = answerText.match(/(\.\.\.|—|--)/g);
  const longPauseCount = pauseMatches?.length || 0;

  const clarityPenalty = fillerCount * 4 + longPauseCount * 5;
  const clarityScore = clamp(85 - clarityPenalty + Math.min(answerWordCount, 160) * 0.05);

  return {
    speakingSpeedWpm,
    fillerCount,
    fillerWords,
    longPauseCount,
    answerWordCount,
    clarityScore: Math.round(clarityScore)
  };
};

export const scoreConfidence = ({ speakingSpeedWpm, fillerCount, longPauseCount, answerWordCount }) => {
  const speedScore =
    speakingSpeedWpm >= 110 && speakingSpeedWpm <= 170
      ? 90
      : speakingSpeedWpm === 0
        ? 40
        : 70 - Math.abs(140 - speakingSpeedWpm) * 0.35;

  const fillerPenalty = fillerCount * 5;
  const pausePenalty = longPauseCount * 6;
  const completionBonus = answerWordCount >= 60 ? 8 : answerWordCount >= 30 ? 4 : -4;

  return clamp(Math.round(speedScore - fillerPenalty - pausePenalty + completionBonus));
};

export const scoreCommunication = ({ clarityScore, fillerCount, answerWordCount }) => {
  const structureBonus = answerWordCount >= 70 ? 8 : answerWordCount >= 35 ? 4 : 0;
  const fillerPenalty = fillerCount * 3;
  return clamp(Math.round(clarityScore + structureBonus - fillerPenalty));
};

export const scoreTechnical = (mode, aiTechnicalScore, answerCount) => {
  const base = typeof aiTechnicalScore === "number" ? aiTechnicalScore : 68;
  const modeBoost = ["dsa", "google"].includes(mode) ? 2 : 0;
  return clamp(Math.round(base + modeBoost + Math.min(answerCount, 8)));
};

export const scoreOverall = ({ confidence, communication, technical }) =>
  clamp(Math.round(confidence * 0.3 + communication * 0.3 + technical * 0.4));
