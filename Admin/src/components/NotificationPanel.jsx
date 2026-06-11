import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuX, LuCheckCheck, LuBell, LuUserPlus, LuShield, LuTriangleAlert, LuInfo, LuSettings, LuExternalLink } from "react-icons/lu";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../services/adminApi";

const SEVERITY_ICONS = {
  CRITICAL: { icon: LuTriangleAlert, color: "#ef4444", bg: "#fef2f2" },
  HIGH: { icon: LuTriangleAlert, color: "#f97316", bg: "#fff7ed" },
  MEDIUM: { icon: LuInfo, color: "#3b82f6", bg: "#eff6ff" },
  INFO: { icon: LuBell, color: "#6b7280", bg: "#f9fafb" },
};

const TYPE_ICONS = {
  USER: LuUserPlus,
  ROLE: LuShield,
  SYSTEM: LuSettings,
  SECTION: LuInfo,
  ALERT: LuTriangleAlert,
};

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationPanel({ isOpen, onClose }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    setIsLoading(true);
    try {
      const res = await getNotifications(pageNum, 15);
      if (res?.success) {
        const items = res.data.notifications || [];
        setNotifications(prev => append ? [...prev, ...items] : items);
        setUnreadCount(res.data.unreadCount || 0);
        setHasMore(pageNum < (res.data.pagination?.pages || 1));
        setPage(pageNum);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1);
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: "READ" } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: "READ" })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.status === "UNREAD") {
      handleMarkRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 md:pt-20">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-slide-up"
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >
        <style>{`
          @keyframes slide-up { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .animate-slide-up { animation: slide-up 0.2s ease-out; }
          .notification-item { transition: background 0.15s ease; }
          .notification-item:hover { background: #f8fafc; }
        `}</style>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <LuBell size={20} className="text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-lime-300 hover:bg-lime-50 hover:text-[#163060]"
              >
                <LuCheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <LuX size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-lime-500" />
              <p className="text-sm font-medium text-slate-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                <LuBell size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Notifications from admin actions will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const severityMeta = SEVERITY_ICONS[n.severity] || SEVERITY_ICONS.INFO;
                  const TypeIcon = TYPE_ICONS[n.type] || LuBell;
                  const isUnread = n.status === "UNREAD";

                  return (
                    <div
                      key={n.id}
                      className={`notification-item cursor-pointer px-5 py-3.5 ${isUnread ? "bg-blue-50/40" : ""}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: severityMeta.bg, color: severityMeta.color }}
                        >
                          <TypeIcon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-400">
                              {n.relativeTime}
                            </span>
                            {n.actionUrl && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600">
                                View <LuExternalLink size={10} />
                              </span>
                            )}
                            {isUnread && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                                className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="border-t border-slate-100 px-5 py-3 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="w-full rounded-xl py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                  >
                    {isLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-2.5 text-center">
          <p className="text-[11px] text-slate-400">
            Notifications are automatically generated from admin actions
          </p>
        </div>
      </div>
    </div>
  );
}
