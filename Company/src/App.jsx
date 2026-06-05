import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  LuBell,
  LuBuilding2,
  LuBriefcaseBusiness,
  LuFileText,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuSettings,
  LuX,
  LuChevronRight,
} from "react-icons/lu";
import logo from "./assets/maven-logo.svg";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateJob from "./pages/CreateJob";
import Profile from "./pages/Profile";
import Applies from "./pages/Applies";
import {
  clearStoredCompanySession,
  getStoredCompanySession,
  restoreCompanySession,
} from "./api/companyApi";

const parseSession = () => {
  return getStoredCompanySession();
};

function RequireAuth({ children }) {
  const [status, setStatus] = useState(() => (parseSession()?.token ? "authenticated" : "checking"));

  useEffect(() => {
    let isMounted = true;

    if (status !== "checking") {
      return () => {
        isMounted = false;
      };
    }

    restoreCompanySession()
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

const navItems = [
  { path: "/", label: "Dashboard", icon: LuLayoutDashboard },
  { path: "/create-job", label: "Create Job", icon: LuBriefcaseBusiness },
  { path: "/applies", label: "Applies", icon: LuFileText },
  { path: "/profile", label: "Profile", icon: LuSettings },
];

const pageMeta = (pathname, companyName) => {
  const base = { panelLabel: "Dashboard" };

  if (pathname.startsWith("/create-job")) {
    return { ...base, title: "Create Job" };
  }

  if (pathname.startsWith("/profile")) {
    return { ...base, title: "Profile" };
  }

  if (pathname.startsWith("/applies")) {
    return { ...base, title: "Applies" };
  }

  return { ...base, title: companyName || "Dashboard" };
};

function PanelLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(parseSession);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const displayUser = useMemo(() => {
    const user = session?.user || {};
    const company = session?.company || {};

    return {
      username: user.username || "Client User",
      email: user.email || "",
      companyName: user.companyName || company.name || "Company",
      packageType: company.packageType || "STANDARD",
    };
  }, [session]);

  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  const syncSession = () => setSession(parseSession());

  const handleLogout = () => {
    clearStoredCompanySession();
    syncSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`company-shell ${isSidebarOpen ? "" : "is-collapsed"} ${isSidebarOpen ? "is-mobile-open" : ""}`}>
      <div
        className="company-sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className="company-sidebar">
        <div className="company-sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={logo} alt="Maven Jobs" className="company-sidebar-logo" />
          <button 
            className="company-menu-btn lg-hide" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ border: 'none', background: 'transparent', color: 'white' }}
          >
            <LuX size={18} />
          </button>
        </div>

        <div className="company-sidebar-user">
          <p className="company-user-name">{displayUser.companyName}</p>
          <p className="company-user-role">{displayUser.packageType} package</p>
          <p className="company-user-email">{displayUser.email || "No email linked"}</p>
        </div>

        <nav className="company-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => `company-nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="company-sidebar-foot-spacer" />
      </aside>

      <div className="company-main-wrap">
        <header className="company-header">
          <div className="company-header-left">
            <button
              type="button"
              className="company-menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <LuMenu size={20} />
            </button>
            <div>
              <p className="company-panel-label">{pageMeta(pathname, displayUser.companyName).panelLabel}</p>
              <h1 className="company-page-title">{pageMeta(pathname, displayUser.companyName).title}</h1>
            </div>
          </div>

          <div className="company-header-actions">
            <button type="button" className="company-icon-btn" aria-label="Notifications">
              <LuBell size={18} />
              <span className="company-dot" />
            </button>
            <button type="button" className="company-header-logout" onClick={handleLogout}>
              <LuLogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <main className="company-main">
          <section className="company-panel-context">
            <span className={`plan-badge plan-badge-${displayUser.packageType.toLowerCase()}`}>
              {displayUser.packageType} package
            </span>
          </section>

          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/create-job" element={<CreateJob onSessionRefresh={syncSession} />} />
            <Route path="/applies" element={<Applies />} />
            <Route path="/profile" element={<Profile onSessionRefresh={syncSession} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <PanelLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
