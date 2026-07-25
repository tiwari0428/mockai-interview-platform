import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import PageHero from "../components/PageHero.jsx";
import { difficultyOptions, interviewModes } from "../utils/interview.js";

const RESUME_KEY = "mockai_resume";
const RESUME_QUESTIONS_KEY = "mockai_resume_questions";
const SELECTED_INTERVIEW_TYPE_KEY = "mockai_selected_interview_type";
const QUESTION_COUNT_PRESETS = [
  { key: "quick", label: "Quick Practice", count: 5 },
  { key: "standard", label: "Standard Mock", count: 10 },
  { key: "full", label: "Full Interview", count: 15 },
  { key: "custom", label: "Custom", count: 10 }
];

const StartInterviewPage = () => {
  const [mode, setMode] = useState("hr");
  const [difficulty, setDifficulty] = useState("medium");
  const [useResume, setUseResume] = useState(false);
  const [questionCountPreset, setQuestionCountPreset] = useState("standard");
  const [customQuestionCount, setCustomQuestionCount] = useState("10");
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeQuestions, setResumeQuestions] = useState([]);
  const [selectedInterviewType, setSelectedInterviewType] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedResume = JSON.parse(localStorage.getItem(RESUME_KEY) || "null");
      const storedResumeQuestions = JSON.parse(localStorage.getItem(RESUME_QUESTIONS_KEY) || "[]");
      const storedInterviewType = localStorage.getItem(SELECTED_INTERVIEW_TYPE_KEY) || "";

      setResumeAvailable(Boolean(storedResume?.extractedText));
      setResumeText(storedResume?.extractedText || "");
      setResumeQuestions(Array.isArray(storedResumeQuestions) ? storedResumeQuestions : []);
      setSelectedInterviewType(storedInterviewType);

      if (storedInterviewType === "resume") {
        setMode("resume");
        setUseResume(true);
      }
    } catch (_error) {
      setResumeAvailable(false);
      setResumeText("");
      setResumeQuestions([]);
      setSelectedInterviewType("");
    }
  }, []);

  const resolvedQuestionCount =
    questionCountPreset === "custom"
      ? Math.min(20, Math.max(3, Number(customQuestionCount) || 10))
      : QUESTION_COUNT_PRESETS.find((option) => option.key === questionCountPreset)?.count || 10;

  const handleStart = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      let questions = [];

      if (selectedInterviewType === "resume" && resumeQuestions.length) {
        questions = resumeQuestions.slice(0, resolvedQuestionCount).map((question, index) => ({
          ...question,
          index
        }));
      } else {
        const response = await api.post("/interview/generate-questions", {
          mode,
          difficulty,
          questionCount: resolvedQuestionCount,
          resumeText: useResume && resumeText ? resumeText : undefined
        });
        questions = response.data.questions || [];
      }

      const interviewPayload = {
        mode,
        difficulty,
        questionCount: resolvedQuestionCount,
        questions,
        startedAt: new Date().toISOString()
      };

      localStorage.setItem("mockai_current_interview", JSON.stringify(interviewPayload));
      localStorage.removeItem(SELECTED_INTERVIEW_TYPE_KEY);
      navigate("/interview-room");
    } catch (_error) {
      setErrorMessage("Could not generate interview questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell py-12">
      <PageHero
        eyebrow="Interview Setup"
        title="Choose a mode and launch a realistic practice room."
        description="Every session creates AI-generated questions and a full feedback report tied to your account."
      />

      {selectedInterviewType === "resume" && resumeAvailable ? (
        <div className="mb-6 rounded-3xl border border-cyan-400/15 bg-cyan-400/10 p-5 text-sm text-cyan-50">
          Resume interview mode is active. Stored resume intelligence questions will be used first for this session.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-5 md:grid-cols-2">
          {interviewModes.map((item) => (
            <button
              key={item.key}
              onClick={() => setMode(item.key)}
              className={`panel p-6 text-left transition ${
                mode === item.key ? "border-brand-400 bg-brand-500/10" : "hover:border-white/20"
              }`}
            >
              <h2 className="font-display text-xl font-bold text-white">{item.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
            </button>
          ))}
        </div>

        <div className="panel h-fit p-6">
          <h2 className="font-display text-2xl font-bold text-white">Session Preferences</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Difficulty</label>
              <select className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Question Count</label>
              <div className="grid gap-3">
                {QUESTION_COUNT_PRESETS.map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-2xl border p-4 transition ${
                      questionCountPreset === option.key
                        ? "border-brand-400 bg-brand-500/10"
                        : "border-white/10 bg-slate-950/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="questionCountPreset"
                        value={option.key}
                        checked={questionCountPreset === option.key}
                        onChange={(event) => setQuestionCountPreset(event.target.value)}
                      />
                      <span>
                        <span className="block font-semibold text-white">
                          {option.label}
                          {option.key !== "custom" ? ` - ${option.count} questions` : ""}
                        </span>
                        <span className="mt-1 block text-sm text-slate-400">
                          {option.key === "quick" && "Fast focused practice with fewer prompts."}
                          {option.key === "standard" && "Balanced mock interview with 10 questions."}
                          {option.key === "full" && "Longer interview flow for deeper practice."}
                          {option.key === "custom" && "Choose any count from 3 to 20 questions."}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {questionCountPreset === "custom" ? (
                <div className="mt-3">
                  <label className="mb-2 block text-sm text-slate-300">Custom question count</label>
                  <input
                    className="input"
                    type="number"
                    min="3"
                    max="20"
                    value={customQuestionCount}
                    onChange={(event) => setCustomQuestionCount(event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <input
                type="checkbox"
                checked={useResume}
                disabled={!resumeAvailable}
                onChange={(event) => setUseResume(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-white">Use latest resume</span>
                <span className="mt-1 block text-sm text-slate-400">
                  {resumeAvailable
                    ? "Include your uploaded resume to generate resume-aware questions."
                    : "Upload a resume first to enable resume-based personalization."}
                </span>
              </span>
            </label>

            <button className="button-primary w-full" onClick={handleStart} disabled={loading}>
              {loading ? "Launching..." : `Start Interview (${resolvedQuestionCount} Questions)`}
            </button>

           

            {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartInterviewPage;
