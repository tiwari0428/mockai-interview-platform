import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import {
  analyzeResumeText,
  extractResumeText,
  generateResumeInterviewQuestions
} from "../utils/resumeIntelligence.js";

const RESUME_KEY = "mockai_resume";
const RESUME_QUESTIONS_KEY = "mockai_resume_questions";
const SELECTED_INTERVIEW_TYPE_KEY = "mockai_selected_interview_type";

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const hasEmptyAnalysis = (resume) => {
  if (!resume?.extractedText) {
    return false;
  }

  const fields = [
    resume.skills,
    resume.technologies,
    resume.projects,
    resume.experience,
    resume.education,
    resume.certifications
  ];

  return fields.some((field) => !Array.isArray(field) || field.length === 0);
};

const logResumeAnalysis = (analysis) => {
  console.log("[Resume Parser] extractedText length:", analysis.extractedText?.length ?? 0);
  console.log("[Resume Parser] skills:", analysis.skills);
  console.log("[Resume Parser] technologies:", analysis.technologies);
  console.log("[Resume Parser] experience:", analysis.experience);
  console.log("[Resume Parser] education:", analysis.education);
  console.log("[Resume Parser] certifications:", analysis.certifications);
  console.log("[Resume Parser] projects:", analysis.projects);
};

const formatResumeItem = (item) => {
  if (typeof item === "string") {
    return item;
  }

  if (item && typeof item === "object") {
    return [item.name, item.techStack ? `Tech Stack: ${item.techStack}` : "", item.summary].filter(Boolean).join("\n");
  }

  return "";
};

const CollapsibleTextBlock = ({ title, text, previewLines = 4, maxHeight = "max-h-64" }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
        <button className="button-secondary px-4 py-2" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show Less" : "Show More"}
        </button>
      </div>
      <div
        className={`mt-5 overflow-auto rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-7 text-slate-300 ${
          expanded ? maxHeight : ""
        }`}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: previewLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }
        }
      >
        {text}
      </div>
    </section>
  );
};

const CompactListCard = ({ title, items, emptyMessage, collapsible = false, itemLineClamp = 2 }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = collapsible && items.length > 2;

  return (
    <section className="panel h-full p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
        {shouldCollapse ? (
          <button className="button-secondary px-4 py-2" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show Less" : "Show More"}
          </button>
        ) : null}
      </div>

      <div className="mt-5 max-h-[260px] overflow-auto rounded-3xl border border-white/10 bg-slate-950/50 p-4">
        {items.length ? (
          <div className="space-y-3">
            {(shouldCollapse && !expanded ? items.slice(0, 3) : items).map((item, index) => (
              <div
                key={typeof item === "string" ? item : item?.name || `item-${index}`}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: itemLineClamp,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
                title={formatResumeItem(item)}
              >
                <span className="whitespace-pre-line">{formatResumeItem(item)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
};

const ResumePage = () => {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [resumeQuestions, setResumeQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const storedResume = readJson(RESUME_KEY, null);
    const storedQuestions = readJson(RESUME_QUESTIONS_KEY, []);

    setResume(storedResume);
    setResumeQuestions(storedQuestions);

    if (storedResume?.extractedText && hasEmptyAnalysis(storedResume)) {
      try {
        const analysis = analyzeResumeText(storedResume.extractedText);
        logResumeAnalysis(analysis);

        const refreshedResume = {
          ...storedResume,
          extractedText: storedResume.extractedText,
          skills: analysis.skills,
          projects: analysis.projects,
          education: analysis.education,
          experience: analysis.experience,
          certifications: analysis.certifications,
          technologies: analysis.technologies,
          score: analysis.score,
          weakAreas: analysis.weakAreas,
          suggestions: analysis.suggestions
        };
        const refreshedQuestions = generateResumeInterviewQuestions(refreshedResume, 20);

        localStorage.setItem(RESUME_KEY, JSON.stringify(refreshedResume));
        localStorage.setItem(RESUME_QUESTIONS_KEY, JSON.stringify(refreshedQuestions));
        setResume(refreshedResume);
        setResumeQuestions(refreshedQuestions);
        setMessage("Resume re-analyzed with the latest extraction rules.");
      } catch (error) {
        console.error("[Resume] auto re-analysis failed", error);
      }
    }
  }, []);

  const applyAnalysis = (baseResume, extractedText) => {
    const analysis = analyzeResumeText(extractedText);
    logResumeAnalysis(analysis);

    const nextResume = {
      ...baseResume,
      extractedText,
      skills: analysis.skills,
      projects: analysis.projects,
      education: analysis.education,
      experience: analysis.experience,
      certifications: analysis.certifications,
      technologies: analysis.technologies,
      score: analysis.score,
      weakAreas: analysis.weakAreas,
      suggestions: analysis.suggestions
    };
    const nextQuestions = generateResumeInterviewQuestions(nextResume, 20);

    localStorage.setItem(RESUME_KEY, JSON.stringify(nextResume));
    localStorage.setItem(RESUME_QUESTIONS_KEY, JSON.stringify(nextQuestions));
    setResume(nextResume);
    setResumeQuestions(nextQuestions);

    return { nextResume, nextQuestions };
  };

  const resumeStats = useMemo(() => {
    if (!resume) {
      return null;
    }

    return [
      ["File Name", resume.fileName],
      ["Upload Date", new Date(resume.uploadedAt).toLocaleString()],
      ["Resume Strength", `${resume.score}/100`],
      ["Skills Count", String(resume.skills.length)],
      ["Projects Count", String(resume.projects.length)],
      ["Experience Count", String(resume.experience.length)],
      ["Certifications Count", String(resume.certifications.length)],
      ["Question Count", String(resumeQuestions.length)]
    ];
  }, [resume, resumeQuestions]);

  const processFile = async (file) => {
    if (!file) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx"].includes(extension)) {
        throw new Error("Only PDF and DOCX files are supported.");
      }

      const extractedText = await extractResumeText(file);
      const baseResume = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        extractedText
      };
      applyAnalysis(baseResume, extractedText);
      setMessage("Resume uploaded and analyzed successfully.");
    } catch (error) {
      setMessage(error.message || "Could not process the resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (event) => {
    const file = event.target.files?.[0];
    await processFile(file);
    event.target.value = "";
  };

  const handleRemoveResume = () => {
    const confirmed = window.confirm("Are you sure you want to remove this resume?");
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(RESUME_KEY);
    localStorage.removeItem(RESUME_QUESTIONS_KEY);
    localStorage.removeItem(SELECTED_INTERVIEW_TYPE_KEY);
    setResume(null);
    setResumeQuestions([]);
    setMessage("Resume removed.");
  };

  const handleStartResumeInterview = () => {
    localStorage.setItem(SELECTED_INTERVIEW_TYPE_KEY, "resume");
    navigate("/start-interview");
  };

  const handleReanalyzeResume = () => {
    if (!resume?.extractedText) {
      setMessage("No extracted resume text found to re-analyze.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      applyAnalysis(resume, resume.extractedText);
      setMessage("Resume re-analyzed successfully.");
    } catch (error) {
      console.error("[Resume] manual re-analysis failed", error);
      setMessage(error.message || "Could not re-analyze the resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell py-12">
      <PageHero
        eyebrow="Resume Intelligence"
        title="Upload your resume to unlock personalized interview preparation."
        description="Extract key resume details, detect strengths and weak areas, and generate tailored interview questions that feel closer to real recruiter conversations."
      />

      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <section className="panel p-6">
              <h2 className="font-display text-2xl font-bold text-white">Resume Upload</h2>
              <label
                className={`mt-6 block rounded-3xl border border-dashed p-8 text-center transition ${
                  dragActive ? "border-brand-400 bg-brand-500/10" : "border-white/15 bg-slate-950/50"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  processFile(event.dataTransfer.files?.[0] || null);
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <p className="font-display text-2xl font-bold text-white">Drag & Drop Resume Here</p>
                <p className="mt-3 text-sm text-slate-300">Upload Resume (PDF or DOCX, max 5 MB)</p>
                <span className="button-secondary mt-6 inline-flex px-4 py-2">Choose File</span>
              </label>

              {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
              {loading ? <p className="mt-3 text-sm text-brand-200">Analyzing resume...</p> : null}

              {!resume ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center">
                  <h3 className="font-display text-xl font-bold text-white">No Resume Uploaded</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Upload your resume to unlock personalized interview questions.
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="button-primary" onClick={handleStartResumeInterview}>
                    Start Resume Interview
                  </button>
                  <button className="button-secondary" onClick={handleReanalyzeResume}>
                    Re-analyze Resume
                  </button>
                  <button className="button-secondary" onClick={handleRemoveResume}>
                    Remove Resume
                  </button>
                </div>
              )}
            </section>

            {resumeStats ? (
              <section className="panel p-6">
                <h2 className="font-display text-2xl font-bold text-white">Resume Preview</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {resumeStats.map(([label, value]) => (
                    <div key={label} className="panel-soft p-4">
                      <p className="text-sm text-slate-400">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            {resume ? (
              <>
                <section className="panel p-6">
                  <h2 className="font-display text-2xl font-bold text-white">Resume Strength</h2>
                  <div className="mt-5 rounded-3xl border border-cyan-400/15 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-100">Resume Strength Score</p>
                    <p className="mt-3 font-display text-5xl font-bold text-white">{resume.score}</p>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${resume.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl border border-amber-400/10 bg-amber-500/10 p-4">
                      <h3 className="font-semibold text-white">Weak Areas</h3>
                      <div className="mt-3 space-y-2 text-sm text-amber-100">
                        {resume.weakAreas.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <h3 className="font-semibold text-white">Suggestions</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-200">
                        {resume.suggestions.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="panel p-6">
                  <h2 className="font-display text-2xl font-bold text-white">Skills</h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {resume.skills.length ? (
                      resume.skills.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-200"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No skills detected.</p>
                    )}
                  </div>
                </section>

                <section className="panel p-6">
                  <h2 className="font-display text-2xl font-bold text-white">Technologies</h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {resume.technologies.length ? (
                      resume.technologies.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No technologies detected.</p>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </section>

        {resume ? (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              <CompactListCard
                title="Projects"
                items={resume.projects}
                emptyMessage="No projects detected."
                collapsible={false}
                itemLineClamp={5}
              />

              <CompactListCard
                title="Experience"
                items={resume.experience}
                emptyMessage="No experience detected."
                collapsible
              />

              <CompactListCard
                title="Education"
                items={resume.education}
                emptyMessage="No education detected."
                collapsible
              />

              <CompactListCard
                title="Certifications"
                items={resume.certifications}
                emptyMessage="No certifications detected."
                collapsible
              />
            </section>

            <section>
              <CollapsibleQuestions questions={resumeQuestions} />
            </section>

            <section>
              <CollapsibleTextBlock
                title="Extracted Resume Text"
                text={resume.extractedText}
                previewLines={4}
                maxHeight="max-h-[260px]"
              />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

const CollapsibleQuestions = ({ questions }) => {
  const [expanded, setExpanded] = useState(false);
  const visibleQuestions = expanded ? questions : questions.slice(0, 5);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">Personalized Resume Questions</h2>
        {questions.length > 5 ? (
          <button className="button-secondary px-4 py-2" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show Less" : "Show All Questions"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-3">
        {visibleQuestions.map((question) => (
          <div key={question.index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
            {question.text}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ResumePage;
