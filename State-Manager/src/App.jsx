import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {
  LuBell,
  LuCircleUserRound,
  LuLayoutDashboard,
  LuList,
  LuLogOut,
  LuUsers,
  LuUser,
  LuMenu,
  LuX,
} from "react-icons/lu";
import logo from "./assets/maven-logo.svg";
import Dashboard from "./pages/Dashboard";
import AddLead from "./pages/AddLead";
import LeadgenQueue from "./pages/LeadgenQueue";
import FsePipeline from "./pages/FsePipeline";
import TeamManagement from "./pages/TeamManagement";
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

  const user = session?.user;
  const displayName = user?.fullName || user?.name || user?.email || "State Manager";
  const displayRole = user?.role || "Sales Manager";
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
                    to="/leadgen-queue"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuList />
                    Leadgen Queue
                  </NavLink>

                  <NavLink
                    to="/fse-pipeline"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuList />
                    FSE Onboard Clients
                  </NavLink>

                  <NavLink
                    to="/team-management"
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  >
                    <LuUsers />
                    Team Control
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
                  <Route path="/leadgen-queue" element={<LeadgenQueue />} />
                  <Route path="/fse-pipeline" element={<FsePipeline />} />
                  <Route path="/team-management" element={<TeamManagement />} />
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
