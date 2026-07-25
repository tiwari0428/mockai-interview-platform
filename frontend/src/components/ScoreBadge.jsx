const toneMap = {
  great: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  good: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  low: "bg-rose-500/15 text-rose-300 ring-rose-400/20"
};

const getTone = (score) => {
  if (score >= 85) return "great";
  if (score >= 70) return "good";
  if (score >= 55) return "medium";
  return "low";
};

const ScoreBadge = ({ score }) => (
  <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${toneMap[getTone(score || 0)]}`}>
    {score ?? "--"}/100
  </span>
);

export default ScoreBadge;
