import { useAuth } from "../context/AuthContext.jsx";
import PageHero from "../components/PageHero.jsx";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="shell py-12">
      <PageHero
        eyebrow="Profile"
        title="Your interview practice identity."
        description="A simple profile snapshot showing the account currently tied to session history and reports."
      />

      <div className="panel max-w-3xl p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ["Name", user?.name],
            ["Email", user?.email],
            ["Role", user?.role],
            ["Resume Stored", user?.latestResumeText ? "Yes" : "No"]
          ].map(([label, value]) => (
            <div key={label} className="panel-soft p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{value || "--"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
