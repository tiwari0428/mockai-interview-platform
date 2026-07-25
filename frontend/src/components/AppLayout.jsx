import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/start-interview", label: "Start Interview" },
  { to: "/resume", label: "Resume" },
  { to: "/sessions", label: "Sessions" },
  { to: "/profile", label: "Profile" }
];

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="shell flex items-center justify-between gap-6 py-4">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-white">
            MockAI
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {user &&
              navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm transition ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-slate-300 sm:inline">{user.name}</span>
                <button
                  className="button-secondary px-4 py-2"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="button-primary px-4 py-2">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
