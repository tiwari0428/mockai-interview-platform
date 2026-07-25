import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const initialForm = { name: "", email: "", password: "" };

const AuthPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to continue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-300">Interview Ready</p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white">Build calm, polished answers with practice.</h1>
          <p className="mt-4 text-slate-300">
            Sign in to launch mock interviews, upload your resume, and track your progress over time.
          </p>
        </div>

        <div className="panel p-8">
          <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1">
            {["login", "register"].map((tab) => (
              <button
                key={tab}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold capitalize ${
                  mode === tab ? "bg-brand-500 text-white" : "text-slate-400"
                }`}
                onClick={() => setMode(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" ? (
              <div>
                <label className="mb-2 block text-sm text-slate-300">Full name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Aarav Sharma"
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button className="button-primary w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
