const MetricCard = ({ label, value, hint }) => (
  <div className="panel p-5">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
    <p className="mt-2 text-sm text-slate-400">{hint}</p>
  </div>
);

export default MetricCard;
