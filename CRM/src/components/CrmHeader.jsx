import { LuBell, LuLogOut, LuMenu } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import { getCrmPageMeta } from "../config/crmMenuConfig";
import { clearStoredSession } from "../services/crmApi";

export default function CrmHeader({ toggleSidebar }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageMeta = getCrmPageMeta(pathname);

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-2xl border border-slate-200 p-2.5 text-slate-700 transition-all duration-200 hover:border-lime-300 hover:bg-lime-50"
        >
          <LuMenu size={20} />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {pageMeta.panelLabel}
          </p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            {pageMeta.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-700 transition-all duration-200 hover:border-lime-300 hover:bg-lime-50 hover:text-[#163060]">
          <LuBell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        </button>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-lime-300 hover:bg-lime-50 hover:text-[#163060]"
        >
          <LuLogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}