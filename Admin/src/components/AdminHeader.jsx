import { LuBell, LuLogOut, LuMenu } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { getAdminPageMeta } from "../config/adminMenuConfig";
import { clearStoredSession, getNotifications } from "../services/adminApi";
import NotificationPanel from "./NotificationPanel";

export default function AdminHeader({ toggleSidebar }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageMeta = getAdminPageMeta(pathname);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getNotifications(1, 1);
      if (res?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleSessionUpdate = () => {
      fetchUnreadCount();
    };
    window.addEventListener("admin-session-updated", handleSessionUpdate);
    return () => window.removeEventListener("admin-session-updated", handleSessionUpdate);
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login", { replace: true });
  };

  return (
    <>
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
          <button
            onClick={() => setShowNotifications(true)}
            className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-700 transition-all duration-200 hover:border-lime-300 hover:bg-lime-50 hover:text-[#163060]"
          >
            <LuBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
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

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount();
        }}
      />
    </>
  );
}
