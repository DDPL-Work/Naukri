import { Suspense, lazy, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {
  LuBell,
  LuBuilding2,
  LuCircleUserRound,
  LuLayoutDashboard,
  LuList,
  LuLogOut,
  LuQrCode,
  LuUser,
  LuMenu,
  LuX,
  LuCalendarOff,
} from "react-icons/lu";
import logo from "./assets/maven-logo.svg";
import {
  clearStoredCrmSession,
  getStoredCrmSession,
  restoreCrmSession,
} from "./api/fseApi";
import {
  SkeletonDashboard,
  SkeletonTable,
  SkeletonForm,
  SkeletonCard,
  SkeletonAttend,
  SkeletonQR,
} from "./components/Skeleton";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyLeads = lazy(() => import("./pages/MyLeads"));
const Profile = lazy(() => import("./pages/Profile"));
const ClientAccounts = lazy(() => import("./pages/ClientAccounts"));
const QRManagement = lazy(() => import("./pages/QRManagement"));
const NonVisitDays = lazy(() => import("./pages/NonVisitDays"));

const getSession = () => getStoredCrmSession();

function RequireAuth({ children }) {
  const [status, setStatus] = useState(() => (getSession()?.token ? "authenticated" : "checking"));

  useEffect(() => {
    let mounted = true;
    if (status !== "checking") return () => { mounted = false; };

    restoreCrmSession()
      .then(() => { if (mounted) setStatus("authenticated"); })
      .catch(() => { if (mounted) setStatus("unauthenticated"); });

    return () => { mounted = false; };
  }, [status]);

  if (status === "checking") return null;
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(getSession);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => setSession(getSession());
    window.addEventListener("crm-session-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("crm-session-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const user = session?.user || {};
  const displayName = user.fullName || user.email || "Field Sales Executive";
  const displayRole = user.role || "FSE";
  const profileImage = user.profileImage || "";

  const handleLogout = () => {
    clearStoredCrmSession();
    window.dispatchEvent(new Event("crm-session-updated"));
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>Loading...</div>
        }>
          <Login />
        </Suspense>
      } />

      <Route path="/*" element={
        <RequireAuth>
          <div className={`panel-shell ${isSidebarOpen ? "" : "is-collapsed"} ${isSidebarOpen ? "is-mobile-open" : ""}`}>
            <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            <aside className="sidebar">
              <div className="logo-card">
                <img src={logo} alt="Maven Jobs" className="login-brand-logo" style={{ width: "120px" }} />
                <button
                  className="icon-btn lg-hide"
                  onClick={() => setIsSidebarOpen(false)}
                  style={{ marginLeft: "auto", background: "transparent", border: "none", color: "white" }}
                >
                  <LuX size={20} />
                </button>
              </div>

              <nav className="sidebar-nav">
                <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuLayoutDashboard /> Dashboard
                </NavLink>
                <NavLink to="/client-accounts" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuBuilding2 /> Client Accounts
                </NavLink>
                <NavLink to="/qr-management" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuQrCode /> QR Management
                </NavLink>
                <NavLink to="/my-leads" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuList /> Lead Management
                </NavLink>
                <NavLink to="/non-visit-days" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuCalendarOff /> Non-Visit Days
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                  <LuUser /> Profile
                </NavLink>
              </nav>

              <div className="sidebar-foot">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="sidebar-foot-avatar-img" />
                ) : (
                  <span className="sidebar-foot-avatar">{displayName.charAt(0).toUpperCase()}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="sidebar-foot-title">{displayName}</p>
                  <p className="sidebar-foot-copy">{user.zone ? `${user.zone} Zone` : "Field Team"}</p>
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
                  <button type="button" className="icon-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle Sidebar">
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
                      <span className="profile-avatar"><LuCircleUserRound /></span>
                    )}
                  </div>
                </div>
              </header>

              <Routes>
                <Route index element={
                  <Suspense fallback={<SkeletonDashboard />}><Dashboard /></Suspense>
                } />
                <Route path="/client-accounts" element={
                  <Suspense fallback={<SkeletonTable />}><ClientAccounts /></Suspense>
                } />
                <Route path="/qr-management" element={
                  <Suspense fallback={<SkeletonQR />}><QRManagement /></Suspense>
                } />
                <Route path="/my-leads" element={
                  <Suspense fallback={<SkeletonTable />}><MyLeads /></Suspense>
                } />
                <Route path="/profile" element={
                  <Suspense fallback={<SkeletonForm />}><Profile /></Suspense>
                } />
                <Route path="/non-visit-days" element={
                  <Suspense fallback={<SkeletonAttend />}><NonVisitDays /></Suspense>
                } />
              </Routes>
            </main>
          </div>
        </RequireAuth>
      } />
    </Routes>
  );
}
