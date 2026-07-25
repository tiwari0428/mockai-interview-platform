import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import InterviewAnalysisPanel from "../components/interview/InterviewAnalysisPanel.jsx";
import WebcamFeed from "../components/interview/WebcamFeed.jsx";
import { analyzeAnswer } from "../utils/voiceAnalysis.js";
import { speak } from "../services/speechService.js";

const CURRENT_INTERVIEW_KEY = "mockai_current_interview";
const LAST_COMPLETED_INTERVIEW_KEY = "mockai_last_completed_interview";
const SELECTED_SESSION_KEY = "mockai_selected_session";

const formatTimer = (totalSeconds) => {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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

const clampScore = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

const countWords = (text = "") => text.match(/\b[\w']+\b/g)?.filter(Boolean).length || 0;

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

const getEyeContactStatus = (percentage) => {
  if (percentage === null) return "Waiting for data...";
  if (percentage >= 80) return "Good";
  if (percentage >= 50) return "Moderate";
  return "Needs Improvement";
};

const getConfidenceStatus = (score) => {
  if (score === null) return "Waiting for data...";
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
};

const getPaceScore = (status) =>
  ({
    Slow: 60,
    Good: 100,
    Fast: 78,
    "Too Fast": 55
  })[status] ?? null;

const getEyeContactScore = (percentage) => (percentage === null ? null : clampScore(percentage));

const getFillerScore = (count) => {
  if (count === null) return null;
  return clampScore(100 - count * 8);
};

const getFaceVisibilityScore = (faceDetected) => {
  if (faceDetected === null) return null;
  return faceDetected ? 100 : 35;
};

const calculateWeightedLiveScore = ({ eyeContactScore, paceScore, fillerScore, confidenceScore, faceVisibilityScore }) => {
  const weightedMetrics = [
    [eyeContactScore, 0.25],
    [paceScore, 0.2],
    [fillerScore, 0.2],
    [confidenceScore, 0.25],
    [faceVisibilityScore, 0.1]
  ];
  const availableMetrics = weightedMetrics.filter(([score]) => typeof score === "number");

  if (!availableMetrics.length) {
    return null;
  }

  const availableWeight = availableMetrics.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedScore = availableMetrics.reduce((sum, [score, weight]) => sum + score * weight, 0);
  return clampScore(weightedScore / availableWeight);
};

const buildLiveCoachingTips = ({ eyeContactStatus, paceStatus, fillerWordCount, confidenceStatus, faceVisible, wordCount }) => {
  const tips = [];

  if (!faceVisible) tips.push("Keep your face centered.");
  if (eyeContactStatus === "Needs Improvement") tips.push("Maintain eye contact with the camera.");
  if (fillerWordCount >= 3) tips.push("Try to reduce filler words.");
  if (paceStatus === "Slow") tips.push("Speak a little more steadily and avoid long pauses.");
  if (paceStatus === "Too Fast") tips.push("Slow down slightly so your answer is easier to follow.");
  if (wordCount >= 20 && confidenceStatus === "High" && paceStatus === "Good") tips.push("Your speaking pace is good.");
  if (wordCount >= 15 && tips.length < 2) tips.push("Add more structure to your answer.");

  return tips.slice(0, 2);
};

const buildCommunicationAnalysis = ({ answers = [], durationSeconds = 0, eyeContactPercentage = 0 }) => {
  const transcriptText = answers.map((answer) => answer.answerText || "").join(" ");
  const wordCount = countWords(transcriptText);
  const durationMinutes = Math.max(durationSeconds / 60, 1 / 60);
  const wordsPerMinute = wordCount ? Math.round(wordCount / durationMinutes) : 0;
  const paceRating = getSpeakingPaceRating(wordsPerMinute);
  const fillerWords = countCommunicationFillers(transcriptText);
  const fillerWordCount = Object.values(fillerWords).reduce((sum, count) => sum + count, 0);
  const paceTooSlow = wordsPerMinute < 100;
  const paceTooFast = wordsPerMinute > 190;
  const confidenceScore = clampScore(
    100 -
      fillerWordCount -
      (eyeContactPercentage < 80 ? 5 : 0) -
      (paceTooSlow ? 5 : 0) -
      (paceTooFast ? 5 : 0)
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

const FOLLOW_UP_TECH_KEYWORDS = [
  "Vapi AI",
  "Google Gemini",
  "Firebase",
  "Next.js",
  "React",
  "Redux",
  "Tailwind CSS",
  "Node.js",
  "Express",
  "MongoDB",
  "SQL",
  "REST API",
  "JavaScript",
  "TypeScript",
  "DSA"
];

const formatInterviewType = (mode = "") =>
  ({
    hr: "HR interview",
    dsa: "DSA interview",
    resume: "resume-based interview",
    google: "Google-style interview",
    amazon: "Amazon leadership interview",
    meta: "Meta behavioral interview"
  })[mode] || `${mode || "interview"} interview`;

const getMentionedTopic = (answerText = "") =>
  FOLLOW_UP_TECH_KEYWORDS.find((keyword) => new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(answerText));

const generateFollowUpQuestion = ({ question = "", answerText = "", mode = "", difficulty = "" }) => {
  const combined = `${question} ${answerText}`;
  const mentionedTopic = getMentionedTopic(combined);
  const interviewType = formatInterviewType(mode);
  const difficultyText = difficulty ? `${difficulty} ` : "";

  if (/dsa|algorithm|complexity|array|linked list|tree|graph|dynamic programming|recursion/i.test(combined)) {
    return "Can you explain the time and space complexity of your approach, and how you would optimize it further?";
  }

  if (mentionedTopic) {
    return `What was the biggest challenge while working with ${mentionedTopic}, and how did you solve it?`;
  }

  if (/project|platform|app|application|built|developed|implemented|created/i.test(combined)) {
    return "What was the most difficult technical decision in this project, and what impact did your solution create?";
  }

  if (/team|conflict|lead|collaborat|stakeholder|deadline|ownership/i.test(combined)) {
    return "Can you share a specific example of the result your action created in that situation?";
  }

  if (/strength|weakness|challenge|failure|improve|learn/i.test(combined)) {
    return "What did you learn from that experience, and how would you apply it in this role?";
  }

  return `For this ${difficultyText}${interviewType}, can you give one specific example or result that supports your answer?`;
};

const upsertAnswer = (answerList, nextAnswer) => {
  const existingIndex = answerList.findIndex((item) => item.questionIndex === nextAnswer.questionIndex);

  if (existingIndex === -1) {
    return [...answerList, nextAnswer].sort((left, right) => left.questionIndex - right.questionIndex);
  }

  const updated = [...answerList];
  updated[existingIndex] = nextAnswer;
  return updated.sort((left, right) => left.questionIndex - right.questionIndex);
};

const readStoredInterview = () => {
  try {
    const raw = localStorage.getItem(CURRENT_INTERVIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const InterviewRoomPage = () => {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
 const baseTranscriptRef = useRef("");
  const shouldKeepListeningRef = useRef(false);
  const timerRef = useRef(null);
  const recordingStartTimestampRef = useRef(null);
  const recordingStopTimestampRef = useRef(null);
  const promptStartedAtRef = useRef(Date.now());
  const answerStartedAtRef = useRef(null);
  const liveFeedbackDataRef = useRef({});
  const currentInterview = useMemo(() => readStoredInterview(), []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFollowUpPhase, setIsFollowUpPhase] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answers, setAnswers] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [faceMissingWarning, setFaceMissingWarning] = useState(false);
  const [faceMissingCount, setFaceMissingCount] = useState(0);
  const [eyeContactPercentage, setEyeContactPercentage] = useState(0);
  const [lookingAwayCount, setLookingAwayCount] = useState(0);
  const [lookingAtCamera, setLookingAtCamera] = useState(false);
  const [micStatus, setMicStatus] = useState("Ready");
  const [recordingStatus, setRecordingStatus] = useState("Idle");
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechSupportReason, setSpeechSupportReason] = useState("Speech recognition check not started.");
  const [speechErrorMessage, setSpeechErrorMessage] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [usedMicrophoneForCurrentAnswer, setUsedMicrophoneForCurrentAnswer] = useState(false);
  const [lastRecordingDurationSeconds, setLastRecordingDurationSeconds] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState({
    eyeContactPercentage: null,
    eyeContactStatus: "Waiting for data...",
    speakingPaceWpm: null,
    speakingPaceStatus: "Waiting for data...",
    fillerWordCount: null,
    fillerWords: [],
    confidenceScore: null,
    confidenceStatus: "Waiting for data...",
    faceVisible: null,
    currentPerformance: null,
    tips: ["Waiting for answer data..."]
  });

  const questions = currentInterview?.questions || [];
  const questionCount = currentInterview?.questionCount || questions.length || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionId = currentQuestion?.index ?? currentQuestionIndex;
  const currentQuestionText = currentQuestion?.text || currentQuestion?.question || "";
  const currentSavedAnswer = answers.find((item) => item.questionIndex === currentQuestionId);
  const activeQuestionText = isFollowUpPhase
    ? currentSavedAnswer?.followUpQuestion || "Follow-up question is being prepared..."
    : currentQuestionText;
  const activeQuestionLabel = isFollowUpPhase
    ? `Follow-up for question ${currentQuestionIndex + 1}`
    : `Question ${currentQuestionIndex + 1} of ${questionCount}`;

  useEffect(() => {
    if (!currentInterview?.startedAt) {
      return undefined;
    }

    const startedAt = new Date(currentInterview.startedAt).getTime();
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [currentInterview]);

  useEffect(() => {
    if (typeof window === "undefined") {
      const reason = "window is undefined during speech recognition detection.";
      console.log("[InterviewRoom] Speech recognition unsupported:", reason);
      setSpeechRecognitionSupported(false);
      setSpeechSupportReason(reason);
      setMicStatus("Unsupported");
      setSpeechErrorMessage(
        "Speech recognition is not supported in this browser. Please type your answer manually."
      );
      return undefined;
    }

    console.log("SpeechRecognition", window.SpeechRecognition);
    console.log("webkitSpeechRecognition", window.webkitSpeechRecognition);

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      const reason =
        "Neither window.SpeechRecognition nor window.webkitSpeechRecognition is available.";
      console.log("[InterviewRoom] Speech recognition unsupported:", reason);
      setSpeechRecognitionSupported(false);
      setSpeechSupportReason(reason);
      setMicStatus("Unsupported");
      setSpeechErrorMessage(
        "Speech recognition is not supported in this browser. Please type your answer manually."
      );
      return undefined;
    }

    console.log("[InterviewRoom] Speech recognition support detected.");
    setSpeechRecognitionSupported(true);
    setSpeechSupportReason("Speech recognition constructor detected successfully.");

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((result) => {
          console.log("[InterviewRoom] Microphone permission result:", result.state);
        })
        .catch((error) => {
          console.log("[InterviewRoom] Microphone permission query failed:", error);
        });
    } else {
      console.log("[InterviewRoom] Microphone permission API not available.");
    }

    let recognition;

    try {
      recognition = new SpeechRecognitionCtor();
      console.log("[InterviewRoom] Speech recognition object created successfully.");
    } catch (error) {
      const reason = `Recognition object creation failed: ${error?.message || "Unknown error"}`;
      console.log("[InterviewRoom] Speech recognition unsupported:", reason, error);
      setSpeechRecognitionSupported(false);
      setSpeechSupportReason(reason);
      setMicStatus("Unsupported");
      setSpeechErrorMessage(
        "Speech recognition is not supported in this browser. Please type your answer manually."
      );
      return undefined;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[InterviewRoom] Speech recognition start success.");
      recordingStartTimestampRef.current = Date.now();
      recordingStopTimestampRef.current = null;
      setLastRecordingDurationSeconds(0);
      setIsRecording(true);
      setMicStatus("Mic active");
      setRecordingStatus("Recording");
      setSpeechErrorMessage("");
    };

   recognition.onend = () => {
      console.log("[InterviewRoom] onend fired. shouldKeepListening:", shouldKeepListeningRef.current);

      setAnswerText((current) => {
        baseTranscriptRef.current = current;
        return current;
      });

      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current) {
            return;
          }
          try {
            recognition.start();
            console.log("[InterviewRoom] Restart succeeded.");
          } catch (error) {
            console.log("[InterviewRoom] Restart failed:", error?.name, error?.message);
            setIsRecording(false);
            setRecordingStatus("Stopped");
          }
        }, 300);
        return;
      }

      setIsRecording(false);
      setRecordingStatus("Stopped");
    };

    recognition.onresult = (event) => {
      console.log("[InterviewRoom] onresult fired, results count:", event.results.length);
      const sessionText = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      const combinedText = `${baseTranscriptRef.current} ${sessionText}`.trim();

      setTranscript(combinedText);
      setAnswerText(combinedText);
      setCurrentAnalysis(null);
    };

    recognition.onerror = (event) => {
      console.log("[InterviewRoom] Speech recognition error:", event.error, event);
      setIsRecording(false);
      setRecordingStatus("Error");

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicStatus("Permission denied");
        setSpeechErrorMessage("Microphone permission denied. Please type your answer manually.");
        return;
      }

      if (event.error === "no-speech") {
        setMicStatus("No speech detected");
        setSpeechErrorMessage("No speech was detected. You can try again or type your answer manually.");
        return;
      }

      if (event.error === "audio-capture") {
        setMicStatus("Mic unavailable");
        setSpeechErrorMessage("Microphone is not available. Please type your answer manually.");
        return;
      }

      setMicStatus("Unavailable");
      setSpeechErrorMessage("Speech recognition is unavailable right now. Please type your answer manually.");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    const savedAnswer = answers.find((item) => item.questionIndex === currentQuestionId);
    const savedText = isFollowUpPhase ? savedAnswer?.followUpAnswer || "" : savedAnswer?.answerText || "";
    const savedAnalysis = isFollowUpPhase ? savedAnswer?.followUpAnalysis || null : savedAnswer?.analysis || null;
    setTranscript(savedText);
    setAnswerText(savedText);
    setCurrentAnalysis(savedAnalysis);
    setUsedMicrophoneForCurrentAnswer(false);
    setLastRecordingDurationSeconds(0);
    recordingStartTimestampRef.current = null;
    recordingStopTimestampRef.current = null;
    setCompletionMessage("");
  }, [answers, currentQuestion, currentQuestionId, isFollowUpPhase]);

  useEffect(() => {
    promptStartedAtRef.current = Date.now();
    answerStartedAtRef.current = null;
    setLiveFeedback({
      eyeContactPercentage: cameraActive && cameraAvailable ? eyeContactPercentage : null,
      eyeContactStatus: cameraActive && cameraAvailable ? getEyeContactStatus(eyeContactPercentage) : "Waiting for data...",
      speakingPaceWpm: null,
      speakingPaceStatus: "Waiting for data...",
      fillerWordCount: null,
      fillerWords: [],
      confidenceScore: null,
      confidenceStatus: "Waiting for data...",
      faceVisible: cameraActive && cameraAvailable ? faceVisible : null,
      currentPerformance: null,
      tips: ["Waiting for answer data..."]
    });
  }, [currentQuestionIndex, isFollowUpPhase]);


useEffect(() => {
    if (!activeQuestionText) {
      return;
    }
    if (activeQuestionText.includes("being prepared")) {
      return;
    }
    speak(activeQuestionText);
  }, [activeQuestionText]);



  useEffect(() => {
    if (answerText.trim() && !answerStartedAtRef.current) {
      answerStartedAtRef.current = Date.now();
    }

    if (!answerText.trim()) {
      answerStartedAtRef.current = null;
    }
  }, [answerText]);

  useEffect(() => {
    const updateLiveFeedback = () => {
      const data = liveFeedbackDataRef.current;
      const liveText = (data.answerText || data.transcript || "").trim();
      const wordCount = countWords(liveText);
      const hasSpeechData = wordCount > 0;
      const fillerCounts = hasSpeechData ? countCommunicationFillers(liveText) : {};
      const fillerWords = Object.entries(fillerCounts)
        .filter(([, count]) => count > 0)
        .map(([word, count]) => `${word} (${count})`);
      const fillerWordCount = Object.values(fillerCounts).reduce((sum, count) => sum + count, 0);
      const now = Date.now();
      const durationStart =
        data.isRecording && data.recordingStartTimestamp
          ? data.recordingStartTimestamp
          : data.answerStartedAt || data.promptStartedAt || now;
      const liveDurationSeconds = Math.max((now - durationStart) / 1000, data.lastRecordingDurationSeconds || 0);
      const canEstimatePace = hasSpeechData && liveDurationSeconds >= 3;
      const speakingPaceWpm = canEstimatePace
        ? Math.round((wordCount / Math.max(liveDurationSeconds, 1)) * 60)
        : data.currentAnalysis?.speakingSpeed || null;
      const speakingPaceStatus = speakingPaceWpm ? getSpeakingPaceRating(speakingPaceWpm) : "Waiting for data...";
      const liveAnalysis = hasSpeechData
        ? analyzeAnswer({
            answerText: liveText,
            durationSeconds: canEstimatePace ? Math.round(liveDurationSeconds) : 0,
            usedMicrophone: data.isRecording || data.usedMicrophoneForCurrentAnswer
          })
        : null;
      const eyeContactAvailable = data.cameraActive && data.cameraAvailable;
      const liveEyeContactPercentage = eyeContactAvailable ? data.eyeContactPercentage || 0 : null;
      const faceVisibleValue = eyeContactAvailable ? Boolean(data.faceVisible) : null;
      const confidenceScore = hasSpeechData
        ? clampScore(
            (liveAnalysis?.confidenceScore ?? data.currentAnalysis?.confidenceScore ?? 70) -
              (liveEyeContactPercentage !== null && liveEyeContactPercentage < 80 ? 5 : 0)
          )
        : null;
      const eyeContactStatus = getEyeContactStatus(liveEyeContactPercentage);
      const confidenceStatus = getConfidenceStatus(confidenceScore);
      const eyeContactScore = getEyeContactScore(liveEyeContactPercentage);
      const paceScore = getPaceScore(speakingPaceStatus);
      const fillerScore = getFillerScore(hasSpeechData ? fillerWordCount : null);
      const faceVisibilityScore = getFaceVisibilityScore(faceVisibleValue);
      const currentPerformance = calculateWeightedLiveScore({
        eyeContactScore,
        paceScore,
        fillerScore,
        confidenceScore,
        faceVisibilityScore
      });
      const tips = buildLiveCoachingTips({
        eyeContactStatus,
        paceStatus: speakingPaceStatus,
        fillerWordCount,
        confidenceStatus,
        faceVisible: faceVisibleValue !== false,
        wordCount
      });

      setLiveFeedback({
        eyeContactPercentage: liveEyeContactPercentage,
        eyeContactStatus,
        speakingPaceWpm,
        speakingPaceStatus,
        fillerWordCount: hasSpeechData ? fillerWordCount : null,
        fillerWords,
        confidenceScore,
        confidenceStatus,
        faceVisible: faceVisibleValue,
        currentPerformance,
        tips: tips.length ? tips : ["Waiting for answer data..."]
      });
    };

    updateLiveFeedback();
    const intervalId = window.setInterval(updateLiveFeedback, 1500);
    return () => window.clearInterval(intervalId);
  }, []);

  const progressPercent = questionCount
    ? Math.round(((currentQuestionIndex + 1) / questionCount) * 100)
    : 0;
  const isFinalQuestion = currentQuestionIndex === questionCount - 1;
  const hasAnswer = Boolean(answerText.trim());

  liveFeedbackDataRef.current = {
    answerText,
    transcript,
    currentAnalysis,
    isRecording,
    usedMicrophoneForCurrentAnswer,
    lastRecordingDurationSeconds,
    cameraActive,
    cameraAvailable,
    faceVisible,
    eyeContactPercentage,
    recordingStartTimestamp: recordingStartTimestampRef.current,
    answerStartedAt: answerStartedAtRef.current,
    promptStartedAt: promptStartedAtRef.current
  };

  const handleEyeContactAnalysisChange = useCallback(
    ({ eyeContactPercentage: nextEyeContactPercentage, lookingAwayCount: nextLookingAwayCount, lookingAtCamera: nextLookingAtCamera }) => {
      setEyeContactPercentage(nextEyeContactPercentage);
      setLookingAwayCount(nextLookingAwayCount);
      setLookingAtCamera(nextLookingAtCamera);
    },
    []
  );

  const runAnalysis = ({ text, usedMicrophone }) => {
    const wordCount =
      text
        .trim()
        .match(/\b[\w']+\b/g)
        ?.filter(Boolean).length || 0;
    const durationSeconds = usedMicrophone ? lastRecordingDurationSeconds : 0;
    const analysis = analyzeAnswer({
      answerText: text,
      durationSeconds,
      usedMicrophone
    });

    console.log("[InterviewRoom] Voice analysis timing", {
      wordCount,
      recordingStartTimestamp: recordingStartTimestampRef.current,
      recordingStopTimestamp: recordingStopTimestampRef.current,
      durationSeconds,
      calculatedWPM: analysis.speakingSpeed
    });

    setCurrentAnalysis(analysis);
    return analysis;
  };

  const getCurrentAnalysis = () => {
    return (
      currentAnalysis ||
      runAnalysis({
        text: answerText.trim(),
        usedMicrophone: usedMicrophoneForCurrentAnswer
      })
    );
  };

  const persistMainAnswer = (followUpQuestionOverride) => {
    if (!currentQuestion || !answerText.trim()) {
      return null;
    }

    const existingAnswer = answers.find((item) => item.questionIndex === currentQuestionId);
    const analysis = getCurrentAnalysis();

    const nextAnswer = {
      ...existingAnswer,
      questionIndex: currentQuestionId,
      question: currentQuestionText,
      answerText: answerText.trim(),
      answeredAt: existingAnswer?.answeredAt || new Date().toISOString(),
      analysis,
      followUpQuestion: followUpQuestionOverride || existingAnswer?.followUpQuestion || ""
    };

    setAnswers((previous) => upsertAnswer(previous, nextAnswer));
    return nextAnswer;
  };

  const persistFollowUpAnswer = () => {
    if (!currentQuestion || !answerText.trim()) {
      return null;
    }

    const existingAnswer = answers.find((item) => item.questionIndex === currentQuestionId);
    const followUpQuestion =
      existingAnswer?.followUpQuestion ||
      generateFollowUpQuestion({
        question: currentQuestionText,
        answerText: existingAnswer?.answerText || "",
        mode: currentInterview.mode,
        difficulty: currentInterview.difficulty
      });
    const followUpAnalysis = getCurrentAnalysis();

    const nextAnswer = {
      ...existingAnswer,
      questionIndex: currentQuestionId,
      question: currentQuestionText,
      answerText: existingAnswer?.answerText || "",
      answeredAt: existingAnswer?.answeredAt || new Date().toISOString(),
      analysis: existingAnswer?.analysis || followUpAnalysis,
      followUpQuestion,
      followUpAnswer: answerText.trim(),
      followUpAnsweredAt: new Date().toISOString(),
      followUpAnalysis
    };

    setAnswers((previous) => upsertAnswer(previous, nextAnswer));
    return nextAnswer;
  };

  const stopRecording = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    recordingStopTimestampRef.current = Date.now();
    const durationSeconds =
      recordingStartTimestampRef.current && recordingStopTimestampRef.current
        ? Math.max(
            0,
            Math.round((recordingStopTimestampRef.current - recordingStartTimestampRef.current) / 1000)
          )
        : 0;
    setLastRecordingDurationSeconds(durationSeconds);
    setIsRecording(false);
    setRecordingStatus("Stopped");
    if (answerText.trim()) {
      runAnalysis({
        text: answerText.trim(),
        usedMicrophone: usedMicrophoneForCurrentAnswer
      });
    }
  };

  const startRecording = () => {
    setSpeechErrorMessage("");
    setUsedMicrophoneForCurrentAnswer(true);
    baseTranscriptRef.current = "";
    shouldKeepListeningRef.current = true;
    try {
      recognitionRef.current?.start();
      console.log("[InterviewRoom] Speech recognition start requested.");
    } catch (error) {
      console.log("[InterviewRoom] Speech recognition start failed:", error);
      setMicStatus("Unavailable");
      setSpeechErrorMessage("Speech recognition could not start. Please type your answer manually.");
    }
  };

  const handleNextQuestion = () => {
    if (!isFollowUpPhase) {
      const mainAnswer = persistMainAnswer();
      if (!mainAnswer) {
        return;
      }

      const followUpQuestion =
        mainAnswer.followUpQuestion ||
        generateFollowUpQuestion({
          question: currentQuestionText,
          answerText: mainAnswer.answerText,
          mode: currentInterview.mode,
          difficulty: currentInterview.difficulty
        });
      setAnswers((previous) => upsertAnswer(previous, { ...mainAnswer, followUpQuestion }));
      setIsFollowUpPhase(true);
      return;
    }

    const followUpAnswer = persistFollowUpAnswer();
    if (!followUpAnswer) {
      return;
    }

    setIsFollowUpPhase(false);
    setCurrentQuestionIndex((previous) => previous + 1);
  };

  const handleFinishInterview = () => {
    if (!isFollowUpPhase) {
      handleNextQuestion();
      return;
    }

    const finalFollowUpAnswer = persistFollowUpAnswer();
    if (!finalFollowUpAnswer) {
      return;
    }
    const finalAnswers = upsertAnswer(answers, finalFollowUpAnswer);

    const completedInterview = {
      mode: currentInterview.mode,
      difficulty: currentInterview.difficulty,
      questionCount: currentInterview.questionCount,
      questions: currentInterview.questions,
      answers: finalAnswers,
      startedAt: currentInterview.startedAt,
      endedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      webcamAnalysis: {
        eyeContactPercentage,
        lookingAwayCount,
        faceMissingCount
      },
      communicationAnalysis: buildCommunicationAnalysis({
        answers: finalAnswers,
        durationSeconds: elapsedSeconds,
        eyeContactPercentage
      })
    };

    localStorage.setItem(LAST_COMPLETED_INTERVIEW_KEY, JSON.stringify(completedInterview));
    localStorage.removeItem(CURRENT_INTERVIEW_KEY);
    localStorage.removeItem(SELECTED_SESSION_KEY);
    stopRecording();
    setAnswers(finalAnswers);
    setCompletionMessage("Interview completed successfully.");
    setIsCompleted(true);
    navigate("/report");
  };

  if (!currentInterview) {
    return (
      <div className="shell py-16">
        <div className="panel mx-auto flex min-h-[24rem] max-w-2xl flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Room</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">No interview found</h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Please start a new interview first.
          </p>
          <Link to="/start-interview" className="button-primary mt-6">
            Go to Start Interview
          </Link>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="shell py-16">
        <div className="panel mx-auto flex min-h-[24rem] max-w-2xl flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Room</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">No questions found</h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Please start a new interview again.
          </p>
          <Link to="/start-interview" className="button-primary mt-6">
            Go to Start Interview
          </Link>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="shell py-12">
        <div className="panel mx-auto max-w-3xl p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Live Interview</p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white">Interview Completed</h1>
          <p className="mt-3 text-slate-300">{completionMessage}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="panel-soft p-4">
              <p className="text-sm text-slate-400">Mode</p>
              <p className="mt-2 font-semibold text-white">{currentInterview.mode}</p>
            </div>
            <div className="panel-soft p-4">
              <p className="text-sm text-slate-400">Difficulty</p>
              <p className="mt-2 font-semibold capitalize text-white">{currentInterview.difficulty}</p>
            </div>
            <div className="panel-soft p-4">
              <p className="text-sm text-slate-400">Duration</p>
              <p className="mt-2 font-semibold text-white">{formatTimer(elapsedSeconds)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="button-primary" onClick={() => navigate("/sessions")}>
              Go to Sessions
            </button>
            <button className="button-secondary" onClick={() => navigate("/start-interview")}>
              Start Another Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-10">
      <div className="mb-8">
        <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-200">
          Live Interview
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold text-white">Mock Interview Room</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Answer each question using your voice or typed response.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Mode", currentInterview.mode],
          ["Difficulty", currentInterview.difficulty],
          ["Question Count", String(questionCount)],
          ["Timer", formatTimer(elapsedSeconds)]
        ].map(([label, value]) => (
          <div key={label} className="panel-soft rounded-2xl p-4">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 font-semibold capitalize text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-6">
          <WebcamFeed
            onCameraStatusChange={setCameraActive}
            onCameraAvailabilityChange={setCameraAvailable}
            onFaceVisibleChange={setFaceVisible}
            onFaceMissingWarningChange={setFaceMissingWarning}
            onFaceMissingCountChange={setFaceMissingCount}
            onEyeContactAnalysisChange={handleEyeContactAnalysisChange}
          />

          <InterviewAnalysisPanel
            cameraAvailable={cameraAvailable}
            cameraActive={cameraActive}
            faceVisible={faceVisible}
            faceMissingWarning={faceMissingWarning}
            detectedFaceMissingCount={faceMissingCount}
            detectedEyeContactPercentage={eyeContactPercentage}
            detectedLookingAwayCount={lookingAwayCount}
            lookingAtCamera={lookingAtCamera}
          />

          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-300">
                  Live Interview Feedback
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">Real-Time Coaching</h2>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-100">
                {liveFeedback.currentPerformance === null
                  ? "Waiting for data..."
                  : `${liveFeedback.currentPerformance}/100`}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Eye Contact",
                  liveFeedback.eyeContactPercentage === null
                    ? "Waiting for data..."
                    : `${liveFeedback.eyeContactPercentage}%`,
                  liveFeedback.eyeContactStatus
                ],
                [
                  "Speaking Pace",
                  liveFeedback.speakingPaceWpm === null
                    ? "Waiting for data..."
                    : `${liveFeedback.speakingPaceWpm} WPM`,
                  liveFeedback.speakingPaceStatus
                ],
                [
                  "Filler Words",
                  liveFeedback.fillerWordCount === null
                    ? "Waiting for data..."
                    : String(liveFeedback.fillerWordCount),
                  liveFeedback.fillerWords.length ? liveFeedback.fillerWords.join(", ") : "None detected"
                ],
                [
                  "Confidence",
                  liveFeedback.confidenceScore === null
                    ? "Waiting for data..."
                    : `${liveFeedback.confidenceScore}/100`,
                  liveFeedback.confidenceStatus
                ],
                [
                  "Face Status",
                  liveFeedback.faceVisible === null
                    ? "Waiting for data..."
                    : liveFeedback.faceVisible
                      ? "Face Detected"
                      : "Face Not Visible",
                  cameraActive ? "Camera status live" : "Camera off"
                ],
                [
                  "Current Performance",
                  liveFeedback.currentPerformance === null
                    ? "Waiting for data..."
                    : `${liveFeedback.currentPerformance}/100`,
                  "Guidance score only"
                ]
              ].map(([label, value, status]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{status}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {liveFeedback.tips.map((tip) => (
                <p
                  key={tip}
                  className="rounded-2xl border border-cyan-400/10 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50"
                >
                  {tip}
                </p>
              ))}
            </div>
          </section>

          <div className="panel p-5">
            <div className="flex flex-wrap gap-3">
              {[
                ["Mic Status", micStatus],
                ["Recording", recordingStatus],
                ["Progress", isFollowUpPhase ? `Follow-up ${currentQuestionIndex + 1} of ${questionCount}` : `Question ${currentQuestionIndex + 1} of ${questionCount}`]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200"
                >
                  <span className="text-slate-400">{label}:</span> {value}
                </div>
              ))}
            </div>

            {speechErrorMessage ? (
              <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {speechErrorMessage}
              </p>
            ) : null}
            {!speechRecognitionSupported ? (
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Detection reason: {speechSupportReason}
              </p>
            ) : null}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">{activeQuestionLabel}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">{activeQuestionText}</h2>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => speak(activeQuestionText)}
            >
              🔊 Replay Question
            </button>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-6 grid gap-5">
            <div className="panel-soft p-5">
              <label className="mb-3 block text-sm font-semibold text-slate-300">Live Transcript</label>
              <div className="min-h-40 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                {transcript || answerText || "Speech-to-text transcript will appear here."}
              </div>
            </div>

            {currentAnalysis ? (
              <div className="panel-soft p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-bold text-white">Communication Analysis</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["Confidence", currentAnalysis.confidenceScore],
                      ["Communication", currentAnalysis.communicationScore],
                      ["Clarity", currentAnalysis.clarityScore],
                      ["Structure", currentAnalysis.structureScore]
                    ].map(([label, value]) => (
                      <span
                        key={label}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100"
                      >
                        {label}: {value}/100
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">Word Count</p>
                    <p className="mt-2 font-semibold text-white">{currentAnalysis.wordCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">Speaking Speed</p>
                    <p className="mt-2 font-semibold text-white">{currentAnalysis.speakingSpeed} WPM</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">Filler Words</p>
                    <p className="mt-2 font-semibold text-white">{currentAnalysis.fillerWordCount}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Confidence", currentAnalysis.confidenceScore],
                    ["Communication", currentAnalysis.communicationScore],
                    ["Clarity", currentAnalysis.clarityScore],
                    ["Structure", currentAnalysis.structureScore]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-semibold text-white">{value}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-950/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                  <p>
                    <span className="font-semibold text-white">Strength:</span> {currentAnalysis.strength}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Weakness:</span> {currentAnalysis.weakness}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Tip:</span> {currentAnalysis.improvementTip}
                  </p>
                  {currentAnalysis.fillerWords.length ? (
                    <p>
                      <span className="font-semibold text-white">Detected fillers:</span>{" "}
                      {currentAnalysis.fillerWords.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="panel-soft p-5">
              <label htmlFor="manual-answer" className="mb-3 block text-sm font-semibold text-slate-300">
                Type your answer manually if needed
              </label>
              <textarea
                id="manual-answer"
                rows={8}
                value={answerText}
                onChange={(event) => {
                  setAnswerText(event.target.value);
                  setTranscript(event.target.value);
                  setCurrentAnalysis(null);
                }}
                placeholder="Write your answer here..."
                className="input min-h-48 resize-y"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            Voice-to-text works best with short, clear pauses between points. If your answer is
            long, we recommend typing it in the box above while speaking, so nothing gets lost.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="button-primary"
              onClick={startRecording}
              disabled={isRecording || !speechRecognitionSupported}
            >
              Start Recording
            </button>
            <button className="button-secondary" onClick={stopRecording} disabled={!isRecording}>
              Stop Recording
            </button>
            {!isFollowUpPhase ? (
              <button className="button-secondary" onClick={handleNextQuestion} disabled={!hasAnswer}>
                Generate Follow-Up
              </button>
            ) : null}
            {isFollowUpPhase && !isFinalQuestion ? (
              <button className="button-secondary" onClick={handleNextQuestion} disabled={!hasAnswer}>
                Next Main Question
              </button>
            ) : null}
            {isFollowUpPhase && isFinalQuestion ? (
              <button
                className="button-primary bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={handleFinishInterview}
                disabled={!hasAnswer}
              >
                Finish Interview
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoomPage;
