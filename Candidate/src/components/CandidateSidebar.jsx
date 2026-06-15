import { NavLink } from "react-router-dom";
import logo from "../assets/maven-logo.svg";
import { candidateMenu } from "../config/candidateMenuConfig";
import { getStoredUser } from "../services/candidateApi";

export default function CandidateSidebar({
  isOpen,
  closeSidebar,
  shouldCloseOnNavigate = false,
}) {
  const cachedUser = getStoredUser();
  const candidateUser = cachedUser?.user || null;
  const candidateProfile = cachedUser?.profile || null;
  const displayName = candidateUser?.name || "Candidate Session";
  const displayRole =
    candidateProfile?.currentTitle ||
    candidateUser?.designation ||
    "Candidate Workspace";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/45 transition md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-[#163060] text-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 p-5">
          <img src={logo} alt="Maven" className="w-40" />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {candidateMenu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={shouldCloseOnNavigate ? closeSidebar : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "border-lime-300 bg-lime-400 text-slate-950 shadow-[0_12px_28px_rgba(132,204,22,0.28)]"
                      : "border-transparent text-white/85 hover:border-lime-300/20 hover:bg-lime-300/10 hover:text-white"
                  }`
                }
              >
                <Icon
                  size={18}
                  className="transition-transform duration-200 group-hover:scale-105"
                />
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/70">
              {displayRole}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
