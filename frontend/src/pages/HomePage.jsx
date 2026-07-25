import { Link } from "react-router-dom";

const featureGroups = [
  "Live AI-generated HR, DSA, resume, and company-mode questions",
  "Speech transcript, filler-word, pause, and confidence analysis",
  "Webcam readiness, eye-contact, and emotion-ready architecture",
  "Session reports with strengths, weaknesses, and improvement roadmap"
];

const HomePage = () => (
  <div className="shell py-16 sm:py-24">
    <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
          AI Interview Simulator
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Practice like the real interview is already on your calendar.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          MockAI helps students rehearse technical and behavioral interviews with AI questions,
          live transcripts, voice analysis, webcam-based presence checks, and detailed coaching reports.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/auth" className="button-primary">
            Start practicing
          </Link>
          <Link to="/dashboard" className="button-secondary">
            Explore dashboard
          </Link>
        </div>
      </div>

      <div className="panel overflow-hidden p-6 shadow-glow">
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Live Session Snapshot</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">Google Mode</h2>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">
              In Progress
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Confidence", "82/100"],
              ["Communication", "78/100"],
              ["Eye Contact", "74%"],
              ["Filler Words", "3"]
            ].map(([label, value]) => (
              <div key={label} className="panel-soft p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {featureGroups.map((feature) => (
        <div key={feature} className="panel p-6">
          <div className="mb-4 h-10 w-10 rounded-2xl bg-brand-500/15" />
          <p className="text-base leading-7 text-slate-200">{feature}</p>
        </div>
      ))}
    </section>
  </div>
);

export default HomePage;
