import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {
  LuBell,
  LuBuilding2,
  LuCircleUserRound,
  LuLayoutDashboard,
  LuList,
  LuLogOut,
  LuPlus,
  LuUser,
  LuMenu,
  LuX,
} from "react-icons/lu";
import logo from "./assets/maven-logo.svg";
import Dashboard from "./pages/Dashboard";
import AddLead from "./pages/AddLead";
import MyLeads from "./pages/MyLeads";
import Clients from "./pages/Clients";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import {
  clearStoredCrmSession,
  getStoredCrmSession,
  restoreCrmSession,
} from "./api/leadApi";

function getStoredSession() {
  return getStoredCrmSession();
}

function RequireAuth({ children }) {
  const [status, setStatus] = useState(() => (getStoredSession()?.token ? "authenticated" : "checking"));

  useEffect(() => {
    let isMounted = true;

    if (status !== "checking") {
      return () => {
        isMounted = false;
      };
    }

    restoreCrmSession()
      .then(() => {
        if (isMounted) {
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("unauthenticated");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  if (status === "checking") {
    return null;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(getStoredSession);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const syncSession = () => setSession(getStoredSession());
    window.addEventListener("crm-session-updated", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("crm-session-updated", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showAccountMenu) return;
    const handler = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAccountMenu]);

  const user = session?.user;
  const displayName = user?.fullName || user?.name || user?.email || "Lead Generator";
  const displayRole = user?.role || "Sales Team";
  const displayEmail = user?.email || displayName;
  const profileImage = user?.profileImage || "";

  const handleLogout = () => {
    clearStoredCrmSession();
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <div className={`panel-shell ${isSidebarOpen ? "" : "is-collapsed"} ${isSidebarOpen ? "is-mobile-open" : ""}`}>
              <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
              <aside className="sidebar">
                <div className="logo-card">
                  <img src={logo} alt="Maven Jobs" className="login-brand-logo" style={{ width: "120px" }} />
                  <button 
                    className="icon-btn lg-hide" 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'white' }}
                  >
                    <LuX size={20} />
                  </button>
                </div>

                <nav className="sidebar-nav">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuLayoutDashboard />
                    Dashboard
                  </NavLink>

                  <NavLink
                    to="/add-lead"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuPlus />
                    Add Lead
                  </NavLink>

                  <NavLink
                    to="/my-leads"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuList />
                    My Leads
                  </NavLink>

                  <NavLink
                    to="/clients"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuBuilding2 />
                    Clients
                  </NavLink>

                  <NavLink
                    to="/profile"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuUser />
                    Profile
                  </NavLink>
                </nav>

                <div className="sidebar-foot">
                  {profileImage ? (
                    <img src={profileImage} alt={displayName} className="sidebar-foot-avatar-img" />
                  ) : (
                    <span className="sidebar-foot-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sidebar-foot-title">{displayName}</p>
                    <p className="sidebar-foot-copy">{displayRole}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center",
                      padding: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <LuLogOut size={16} />
                  </button>
                </div>
              </aside>

              <main className="page-shell">
                <header className="top-bar">
                  <div className="top-bar-left">
                    <button 
                      type="button" 
                      className="icon-btn" 
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      aria-label="Toggle Sidebar"
                    >
                      <LuMenu />
                    </button>
                  </div>
                  <div className="top-bar-actions">
                    <button type="button" className="icon-btn" aria-label="Notifications">
                      <LuBell />
                    </button>

                    {/* ── Settings / Account Menu ── */}
                    <div ref={accountMenuRef} style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="icon-btn"
                        id="settings-btn"
                        aria-label="Account settings"
                        aria-haspopup="menu"
                        aria-expanded={showAccountMenu}
                        onClick={() => setShowAccountMenu((v) => !v)}
                        style={{
                          background: showAccountMenu ? "#f1f5f9" : "",
                          borderColor: showAccountMenu ? "#cbd5e1" : "",
                          color: showAccountMenu ? "#1a4a8f" : "",
                        }}
                      >
                        {/* Settings / Gear icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      {/* Account Menu Dropdown */}
                      {showAccountMenu && (
                        <>
                          {/* Inject keyframe once */}
                          <style>{`
                            @keyframes acctMenuIn {
                              from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                              to   { opacity: 1; transform: translateY(0)  scale(1); }
                            }
                            .acct-item {
                              display: flex; align-items: center; gap: 11px;
                              width: 100%; padding: 10px 18px;
                              background: none; border: none; text-align: left;
                              font-family: inherit; font-size: 0.875rem;
                              font-weight: 500; color: #334155;
                              cursor: pointer; transition: background 0.13s;
                              border-radius: 0;
                            }
                            .acct-item:hover { background: #f8fafc; }
                            .acct-item-danger { color: #ef4444 !important; }
                            .acct-item-danger:hover { background: #fff5f5 !important; }
                            .acct-item-icon {
                              display: flex; align-items: center; justify-content: center;
                              width: 28px; height: 28px; border-radius: 8px;
                              background: #f1f5f9; font-size: 0.95rem; flex-shrink: 0;
                            }
                          `}</style>

                          <div
                            role="menu"
                            aria-labelledby="settings-btn"
                            style={{
                              position: "absolute",
                              top: "calc(100% + 8px)",
                              right: 0,
                              minWidth: 248,
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "16px",
                              boxShadow: "0 12px 40px rgba(15,23,42,0.13), 0 2px 8px rgba(15,23,42,0.06)",
                              zIndex: 9999,
                              overflow: "hidden",
                              animation: "acctMenuIn 0.2s cubic-bezier(0.22,1,0.36,1) forwards",
                            }}
                          >
                            {/* Signed-in header */}
                            <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f1f5f9" }}>
                              <p style={{ margin: "0 0 3px", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8" }}>
                                Signed in as
                              </p>
                              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", wordBreak: "break-all", lineHeight: 1.4 }}>
                                {displayEmail}
                              </p>
                            </div>

                            {/* Section label */}
                            <div style={{ padding: "10px 18px 4px" }}>
                              <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8" }}>
                                Account menu
                              </p>
                            </div>

                            {/* Statement */}
                            <button
                              role="menuitem"
                              className="acct-item"
                              onClick={() => { setShowAccountMenu(false); navigate("/profile"); }}
                            >
                              <span className="acct-item-icon">📊</span>
                              Statement
                            </button>

                            {/* Start Tour */}
                            <button
                              role="menuitem"
                              className="acct-item"
                              onClick={() => setShowAccountMenu(false)}
                            >
                              <span className="acct-item-icon">🗺️</span>
                              Start Tour
                            </button>

                            {/* Change Password */}
                            <button
                              role="menuitem"
                              className="acct-item"
                              onClick={() => { setShowAccountMenu(false); navigate("/profile"); }}
                            >
                              <span className="acct-item-icon">🔑</span>
                              Change Password
                            </button>

                            {/* Divider */}
                            <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                            {/* Sign out */}
                            <button
                              role="menuitem"
                              className="acct-item acct-item-danger"
                              onClick={() => { setShowAccountMenu(false); handleLogout(); }}
                            >
                              <span className="acct-item-icon" style={{ background: "#fff5f5" }}>
                                <LuLogOut size={14} style={{ color: "#ef4444" }} />
                              </span>
                              Sign out
                            </button>

                            <div style={{ height: 8 }} />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="profile-chip">
                      <div className="profile-meta">
                        <strong>{displayName}</strong>
                        <span>{displayRole}</span>
                      </div>
                      {profileImage ? (
                        <img src={profileImage} alt={displayName} className="profile-avatar-img" />
                      ) : (
                        <span className="profile-avatar">
                          <LuCircleUserRound />
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="/add-lead" element={<AddLead />} />
                  <Route path="/my-leads" element={<MyLeads />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
