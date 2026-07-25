import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ScoreBadge from "../components/ScoreBadge.jsx";

const SESSIONS_KEY = "mockai_interview_sessions";
const SELECTED_SESSION_KEY = "mockai_selected_session";
const CHART_WIDTH = 680;
const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 16, right: 20, bottom: 34, left: 42 };
const TREND_CHART_HEIGHT = 220;
const Y_AXIS_LABELS = [100, 80, 60, 40, 20, 0];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const formatDuration = (durationSeconds = 0) => {
  const minutes = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const seconds = String(durationSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const readSessions = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_error) {
    return [];
  }
};

const extractScores = (session) => {
  const report = session.report || {};
  const answers = session.interview?.answers || [];

  const averageFromAnswers = (field) => {
    const values = answers.map((answer) => answer.analysis?.[field]).filter((value) => typeof value === "number");
    if (!values.length) {
      return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const confidenceScore =
    report.scores?.confidenceScore ??
    report.confidenceScore ??
    averageFromAnswers("confidenceScore");
  const communicationScore =
    report.scores?.communicationScore ??
    report.communicationScore ??
    averageFromAnswers("communicationScore");
  const clarityScore =
    report.scores?.clarityScore ??
    report.clarityScore ??
    averageFromAnswers("clarityScore");
  const structureScore =
    report.scores?.structureScore ??
    report.structureScore ??
    averageFromAnswers("structureScore");
  const technicalScore =
    report.scores?.technicalScore ??
    report.technicalScore ??
    Math.round((communicationScore + structureScore) / 2);
  const overallScore =
    report.scores?.overallScore ??
    report.overallScore ??
    session.overallScore ??
    Math.round(
      confidenceScore * 0.25 +
        communicationScore * 0.3 +
        clarityScore * 0.2 +
        structureScore * 0.15 +
        technicalScore * 0.1
    );

  return {
    overallScore: clamp(overallScore, 0, 100),
    confidenceScore: clamp(confidenceScore, 0, 100),
    communicationScore: clamp(communicationScore, 0, 100),
    clarityScore: clamp(clarityScore, 0, 100),
    structureScore: clamp(structureScore, 0, 100),
    technicalScore: clamp(technicalScore, 0, 100)
  };
};

const getChartPoints = (values, height) => {
  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  return values.map((value, index) => {
    const x = CHART_PADDING.left + index * stepX;
    const y = CHART_PADDING.top + ((100 - clamp(value, 0, 100)) / 100) * innerHeight;
    return { x, y, value };
  });
};

const buildLinePath = (points) => {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
};

const renderYAxis = (height) => {
  const innerHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  return Y_AXIS_LABELS.map((label) => {
    const y = CHART_PADDING.top + ((100 - label) / 100) * innerHeight;
    return (
      <g key={label}>
        <line
          x1={CHART_PADDING.left}
          y1={y}
          x2={CHART_WIDTH - CHART_PADDING.right}
          y2={y}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <text x={CHART_PADDING.left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="12">
          {label}
        </text>
      </g>
    );
  });
};

const ImprovementCard = ({ improvementRate }) => {
  const positive = improvementRate > 0;
  const negative = improvementRate < 0;
  const value = `${positive ? "+" : ""}${improvementRate} ${positive ? "↑" : negative ? "↓" : "→"}`;
  const helperText = positive
    ? "Performance improving"
    : negative
      ? "Needs improvement"
      : "No significant change";
  const valueClass = positive
    ? "text-emerald-300"
    : negative
      ? "text-rose-300"
      : "text-slate-300";

  return <MetricCard label="Improvement Rate" value={<span className={valueClass}>{value}</span>} hint={helperText} />;
};

const ScoreTrendChart = ({ trendPoints, hoveredIndex, setHoveredIndex }) => {
  const points = getChartPoints(trendPoints.map((point) => point.overallScore), CHART_HEIGHT);
  const path = buildLinePath(points);
  const trendLabel =
    trendPoints[trendPoints.length - 1].overallScore > trendPoints[0].overallScore
      ? "Improving"
      : trendPoints[trendPoints.length - 1].overallScore < trendPoints[0].overallScore
        ? "Declining"
        : "Stable";
  const highestScore = Math.max(...trendPoints.map((point) => point.overallScore));
  const lowestScore = Math.min(...trendPoints.map((point) => point.overallScore));
  const tooltipPoint = hoveredIndex === null ? null : { ...trendPoints[hoveredIndex], ...points[hoveredIndex] };

  return (
    <section className="panel p-6">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold text-white">Interview Score Trend</h2>
        <p className="text-sm text-slate-400">Chronological score progression from oldest to newest.</p>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[720px]">
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-72 w-full">
            {renderYAxis(CHART_HEIGHT)}
            <line
              x1={CHART_PADDING.left}
              y1={CHART_HEIGHT - CHART_PADDING.bottom}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
              stroke="#475569"
              strokeWidth="1.2"
            />
            {path ? (
              <path d={path} fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {points.map((point, index) => (
              <g key={trendPoints[index].id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? 7 : 5}
                  fill="#38bdf8"
                  stroke="#0f172a"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <text
                  x={point.x}
                  y={CHART_HEIGHT - 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="12"
                >
                  {trendPoints[index].label}
                </text>
              </g>
            ))}
          </svg>

          {tooltipPoint ? (
            <div
              className="pointer-events-none absolute z-10 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl"
              style={{
                left: `${(tooltipPoint.x / CHART_WIDTH) * 100}%`,
                top: `${(tooltipPoint.y / CHART_HEIGHT) * 100}%`,
                transform: "translate(-50%, -120%)"
              }}
            >
              <p className="font-semibold text-white">{tooltipPoint.label.replace("S", "Session ")}</p>
              <p>Overall Score: {tooltipPoint.overallScore}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="panel-soft p-4">
          <p className="text-sm text-slate-400">Highest Score</p>
          <p className="mt-2 font-semibold text-white">{highestScore}/100</p>
        </div>
        <div className="panel-soft p-4">
          <p className="text-sm text-slate-400">Lowest Score</p>
          <p className="mt-2 font-semibold text-white">{lowestScore}/100</p>
        </div>
        <div className="panel-soft p-4">
          <p className="text-sm text-slate-400">Current Trend</p>
          <p className="mt-2 font-semibold text-white">{trendLabel}</p>
        </div>
      </div>
    </section>
  );
};

const CommunicationTrendChart = ({ trendPoints, hoveredIndex, setHoveredIndex }) => {
  const metrics = [
    { key: "confidenceScore", label: "Confidence", color: "#22d3ee" },
    { key: "communicationScore", label: "Communication", color: "#60a5fa" },
    { key: "clarityScore", label: "Clarity", color: "#34d399" },
    { key: "structureScore", label: "Structure", color: "#f59e0b" }
  ];

  const lineData = metrics.map((metric) => ({
    ...metric,
    points: getChartPoints(
      trendPoints.map((point) => point[metric.key]),
      TREND_CHART_HEIGHT
    )
  }));

  const tooltipPoint = hoveredIndex === null
    ? null
    : {
        ...trendPoints[hoveredIndex],
        x: lineData[0]?.points[hoveredIndex]?.x || 0,
        y:
          Math.min(
            ...lineData.map((metric) => metric.points[hoveredIndex]?.y ?? TREND_CHART_HEIGHT / 2)
          ) - 8
      };

  return (
    <section className="panel p-6">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold text-white">Communication Trends</h2>
        <p className="text-sm text-slate-400">Confidence, communication, clarity, and structure over time.</p>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[720px]">
          <svg viewBox={`0 0 ${CHART_WIDTH} ${TREND_CHART_HEIGHT}`} className="h-60 w-full">
            {renderYAxis(TREND_CHART_HEIGHT)}
            <line
              x1={CHART_PADDING.left}
              y1={TREND_CHART_HEIGHT - CHART_PADDING.bottom}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={TREND_CHART_HEIGHT - CHART_PADDING.bottom}
              stroke="#475569"
              strokeWidth="1.2"
            />

            {lineData.map((metric) => {
              const path = buildLinePath(metric.points);
              return path ? (
                <path
                  key={metric.key}
                  d={path}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null;
            })}

            {trendPoints.map((point, index) => (
              <g key={point.id}>
                {lineData.map((metric) => {
                  const metricPoint = metric.points[index];
                  return (
                    <circle
                      key={`${point.id}-${metric.key}`}
                      cx={metricPoint.x}
                      cy={metricPoint.y}
                      r={hoveredIndex === index ? 5.5 : 4}
                      fill={metric.color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
                <text
                  x={lineData[0].points[index].x}
                  y={TREND_CHART_HEIGHT - 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="12"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>

          {tooltipPoint ? (
            <div
              className="pointer-events-none absolute z-10 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl"
              style={{
                left: `${(tooltipPoint.x / CHART_WIDTH) * 100}%`,
                top: `${(tooltipPoint.y / TREND_CHART_HEIGHT) * 100}%`,
                transform: "translate(-50%, -120%)"
              }}
            >
              <p className="font-semibold text-white">{tooltipPoint.label.replace("S", "Session ")}</p>
              <p>Confidence: {tooltipPoint.confidenceScore}</p>
              <p>Communication: {tooltipPoint.communicationScore}</p>
              <p>Clarity: {tooltipPoint.clarityScore}</p>
              <p>Structure: {tooltipPoint.structureScore}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
        {metrics.map((metric) => (
          <span
            key={metric.key}
            className="rounded-full border px-3 py-1"
            style={{
              borderColor: `${metric.color}33`,
              backgroundColor: `${metric.color}1A`,
              color: metric.color
            }}
          >
            {metric.label}
          </span>
        ))}
      </div>
    </section>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [hoveredScoreIndex, setHoveredScoreIndex] = useState(null);
  const [hoveredCommunicationIndex, setHoveredCommunicationIndex] = useState(null);

  const analytics = useMemo(() => {
    const sessions = readSessions()
      .map((session) => ({
        ...session,
        scores: extractScores(session)
      }))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

    if (!sessions.length) {
      return null;
    }

    const totalInterviews = sessions.length;
    const overallScores = sessions.map((session) => session.scores.overallScore);
    const confidenceScores = sessions.map((session) => session.scores.confidenceScore);
    const communicationScores = sessions.map((session) => session.scores.communicationScore);
    const clarityScores = sessions.map((session) => session.scores.clarityScore);
    const structureScores = sessions.map((session) => session.scores.structureScore);
    const technicalScores = sessions.map((session) => session.scores.technicalScore);

    const averageOf = (values) =>
      values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

    const averageScore = averageOf(overallScores);
    const bestScore = overallScores.length ? Math.max(...overallScores) : 0;
    const latestScore = overallScores.length ? overallScores[overallScores.length - 1] : 0;
    const firstScore = overallScores.length ? overallScores[0] : 0;
    const improvementRate = latestScore - firstScore;

    const modeCounts = sessions.reduce((accumulator, session) => {
      accumulator[session.mode] = (accumulator[session.mode] || 0) + 1;
      return accumulator;
    }, {});

    const mostPracticedMode =
      Object.entries(modeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || "No data yet";

    const skillAverages = {
      confidence: averageOf(confidenceScores),
      communication: averageOf(communicationScores),
      clarity: averageOf(clarityScores),
      structure: averageOf(structureScores),
      technical: averageOf(technicalScores)
    };

    const weakestSkillEntry = Object.entries(skillAverages).sort((left, right) => left[1] - right[1])[0];

    const performanceInsights = [];
    if (improvementRate > 0) {
      performanceInsights.push(`Your overall score improved by ${improvementRate} points.`);
    } else if (improvementRate < 0) {
      performanceInsights.push(`Your latest score is ${Math.abs(improvementRate)} points lower than your first tracked session.`);
    } else {
      performanceInsights.push("Your overall score is steady. Keep practicing to push it higher.");
    }

    if (weakestSkillEntry?.[0] === "structure") {
      performanceInsights.push("Structure is your weakest skill. Use STAR or First-Then-Finally format.");
    }

    if (skillAverages.confidence >= 80) {
      performanceInsights.push("Confidence is one of your strongest areas.");
    }

    if (skillAverages.communication >= 80) {
      performanceInsights.push("Communication is consistently strong.");
    }

    if (skillAverages.technical < 70) {
      performanceInsights.push("Technical depth needs more practice.");
    }

    const trendPoints = sessions.map((session, index) => ({
      label: `S${index + 1}`,
      date: session.createdAt,
      mode: session.mode,
      difficulty: session.difficulty,
      duration: session.interview?.durationSeconds || 0,
      result: getResultBadge(session.scores.overallScore),
      ...session.scores,
      id: session.id
    }));

    const recentSessions = [...sessions]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5);

    return {
      totalInterviews,
      averageScore,
      bestScore,
      latestScore,
      improvementRate,
      mostPracticedMode,
      skillAverages,
      performanceInsights,
      trendPoints,
      recentSessions
    };
  }, []);

  const handleViewReport = (sessionId) => {
    localStorage.setItem(SELECTED_SESSION_KEY, sessionId);
    navigate("/report");
  };

  if (!analytics) {
    return (
      <div className="shell py-16">
        <div className="panel mx-auto flex min-h-[24rem] max-w-2xl flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Dashboard</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">No Analytics Yet</h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Complete interviews to unlock performance insights.
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
      <PageHero
        eyebrow="Dashboard"
        title="Performance Dashboard"
        description="Track your interview growth, strengths, weaknesses, and improvement trends."
        action={
          <button className="button-primary" onClick={() => navigate("/start-interview")}>
            New interview
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Interviews" value={analytics.totalInterviews} hint="Completed mock interviews" />
        <MetricCard label="Average Score" value={`${analytics.averageScore}/100`} hint="Average overall performance" />
        <MetricCard label="Best Score" value={`${analytics.bestScore}/100`} hint="Highest recorded score" />
        <MetricCard label="Latest Score" value={`${analytics.latestScore}/100`} hint="Most recent interview score" />
        <ImprovementCard improvementRate={analytics.improvementRate} />
        <MetricCard label="Most Practiced Mode" value={analytics.mostPracticedMode} hint="Most frequent interview mode" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ScoreTrendChart
          trendPoints={analytics.trendPoints}
          hoveredIndex={hoveredScoreIndex}
          setHoveredIndex={setHoveredScoreIndex}
        />

        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Recent Sessions</h2>
          <div className="mt-5 space-y-4">
            {analytics.recentSessions.map((session) => {
              const result = getResultBadge(session.scores.overallScore);

              return (
                <div key={session.id} className="panel-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{session.mode}</p>
                      <p className="mt-1 text-sm capitalize text-slate-400">
                        {new Date(session.createdAt).toLocaleDateString()} • {session.difficulty}
                      </p>
                    </div>
                    <ScoreBadge score={session.scores.overallScore} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getResultClasses(result)}`}>
                      {result}
                    </span>
                    <button className="button-secondary px-4 py-2" onClick={() => handleViewReport(session.id)}>
                      View Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CommunicationTrendChart
          trendPoints={analytics.trendPoints}
          hoveredIndex={hoveredCommunicationIndex}
          setHoveredIndex={setHoveredCommunicationIndex}
        />

        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold text-white">Performance Insights</h2>
          <div className="mt-5 space-y-3">
            {analytics.performanceInsights.map((insight) => (
              <div key={insight} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                {insight}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-8 p-6">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-white">Skills Breakdown</h2>
          <p className="text-sm text-slate-400">Average performance across your core interview skills.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Confidence Average", analytics.skillAverages.confidence],
            ["Communication Average", analytics.skillAverages.communication],
            ["Clarity Average", analytics.skillAverages.clarity],
            ["Structure Average", analytics.skillAverages.structure],
            ["Technical Average", analytics.skillAverages.technical]
          ].map(([label, score]) => (
            <div key={label} className="panel-soft p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 font-semibold text-white">{score}/100</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{ width: `${clamp(score, 0, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
