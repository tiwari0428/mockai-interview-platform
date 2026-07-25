import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const SESSIONS_KEY = "mockai_interview_sessions";
const SELECTED_SESSION_KEY = "mockai_selected_session";

const formatDuration = (durationSeconds = 0) => {
  const minutes = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const seconds = String(durationSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getResultBadge = (overallScore) => {
  if (overallScore >= 90) return "Excellent";
  if (overallScore >= 75) return "Good";
  if (overallScore >= 60) return "Average";
  return "Needs Improvement";
};

const getResultClasses = (result) => {
  if (result === "Excellent") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  if (result === "Good") return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  if (result === "Average") return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
};

const readSessions = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_error) {
    return [];
  }
};

const SessionsPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(readSessions());
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [sessions]
  );

  const handleViewReport = (sessionId) => {
    localStorage.setItem(SELECTED_SESSION_KEY, sessionId);
    navigate("/report");
  };

  const handleDeleteSession = (sessionId) => {
    const confirmed = window.confirm("Are you sure you want to delete this interview session?");
    if (!confirmed) {
      return;
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(nextSessions));
    setSessions(nextSessions);
  };

  if (!sortedSessions.length) {
    return (
      <div className="shell py-16">
        <div className="panel mx-auto flex min-h-[24rem] max-w-2xl flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Sessions</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">No Interview Sessions Yet</h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Complete your first mock interview to start tracking progress.
          </p>
          <button className="button-primary mt-6" onClick={() => navigate("/start-interview")}>
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Interview Sessions</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">Interview Sessions</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Review previous mock interviews and track your improvement over time.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sortedSessions.map((session) => {
          const result = getResultBadge(session.overallScore || 0);

          return (
            <div key={session.id} className="panel p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-bold text-white">{session.mode}</p>
                  <p className="mt-2 text-sm capitalize text-slate-400">{session.difficulty}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getResultClasses(result)}`}
                >
                  {result}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Date", new Date(session.createdAt).toLocaleString()],
                  ["Overall Score", `${session.overallScore}/100`],
                  ["Question Count", String(session.interview?.questionCount || session.interview?.questions?.length || 0)],
                  ["Duration", formatDuration(session.interview?.durationSeconds || 0)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="button-primary" onClick={() => handleViewReport(session.id)}>
                  View Report
                </button>
                <button className="button-secondary" onClick={() => handleDeleteSession(session.id)}>
                  Delete Session
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionsPage;
