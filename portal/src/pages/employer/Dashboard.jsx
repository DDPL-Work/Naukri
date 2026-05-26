import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiBriefcase, FiUsers, FiEye, FiTrendingUp, FiBarChart2,
    FiBell, FiSearch, FiPlus, FiChevronRight, FiArrowUp,
    FiArrowDown, FiCheckCircle, FiClock, FiMapPin, FiStar,
    FiFilter, FiDownload, FiRefreshCw, FiSettings, FiLogOut,
    FiMenu, FiX, FiMail, FiPhone, FiZap, FiTarget,
    FiCalendar, FiAward, FiActivity, FiPieChart, FiLayers,
    FiChevronDown, FiMoreVertical, FiEdit2, FiTrash2, FiExternalLink
} from "react-icons/fi";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";
import authService from "../../services/authService";

/* ─── Employer Dashboard Helpers ─────────────────────────────────────────── */
const NAV_ITEMS = [
    { icon: <FiActivity size={18} />, label: "Dashboard", id: "dashboard" },
    { icon: <FiBriefcase size={18} />, label: "Jobs", id: "jobs" },
    { icon: <FiUsers size={18} />, label: "Candidates", id: "candidates" },
    { icon: <FiCalendar size={18} />, label: "Interviews", id: "interviews" },
    { icon: <FiBarChart2 size={18} />, label: "Analytics", id: "analytics" },
    { icon: <FiMail size={18} />, label: "Messages", id: "messages", badge: 5 },
    { icon: <FiSettings size={18} />, label: "Settings", id: "settings" },
];

function DonutChart({ breakdown = [], activeJobs = 0 }) {
    const R = 48;
    const stroke = 11;
    const circ = 2 * Math.PI * R;
    let offset = 0;
    const slices = breakdown.length
        ? breakdown
        : [{ pct: 100, color: "#cbd5e1", label: "No jobs yet", count: 0 }];

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                    {slices.map((s, i) => {
                        const dash = (s.pct / 100) * circ;
                        const el = (
                            <circle
                                key={i}
                                cx="70"
                                cy="70"
                                r={R}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={stroke}
                                strokeLinecap="round"
                                strokeDasharray={`${Math.max(dash - 1, 0)} ${Math.max(circ - dash + 1, 0)}`}
                                strokeDashoffset={-offset * circ / 100}
                            />
                        );
                        offset += s.pct;
                        return el;
                    })}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{activeJobs}</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Active Jobs</div>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", width: "100%" }}>
                {slices.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: s.color + "0d", border: `1px solid ${s.color}22` }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.color, fontFamily: "'Bricolage Grotesque',sans-serif", flexShrink: 0 }}>{s.pct}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Sparkline ─────────────────────────────────────────── */
function Sparkline({ data, color }) {
    const max = Math.max(...data), min = Math.min(...data);
    const W = 80, H = 32;
    const pts = data.map((v, i) => ({
        x: (i / (data.length - 1)) * W,
        y: H - ((v - min) / (max - min || 1)) * (H - 4) - 2
    }));
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return (
        <svg width={W} height={H} style={{ display: "block" }}>
            <defs>
                <linearGradient id={`sg${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity=".25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#sg${color.replace("#", "")})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
        </svg>
    );
}

/* ─── DonutChart ─────────────────────────────────────────── */
function DonutChart() {
    const slices = [
        { pct: 38, color: "#002366", label: "Engineering" },
        { pct: 28, color: "#10b981", label: "Design" },
        { pct: 20, color: "#6366f1", label: "Product" },
        { pct: 14, color: "#f59e0b", label: "Analytics" },
    ];
    const R = 48, stroke = 11, circ = 2 * Math.PI * R;
    let offset = 0;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* Centered Donut */}
            <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                    {slices.map((s, i) => {
                        const dash = (s.pct / 100) * circ;
                        const el = (
                            <circle key={i} cx="70" cy="70" r={R} fill="none"
                                stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
                                strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
                                strokeDashoffset={-offset * circ / 100} />
                        );
                        offset += s.pct;
                        return el;
                    })}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>24</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Active Jobs</div>
                </div>
            </div>
            {/* 2-col legend grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", width: "100%" }}>
                {slices.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: s.color + "0d", border: `1px solid ${s.color}22` }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.color, fontFamily: "'Bricolage Grotesque',sans-serif", flexShrink: 0 }}>{s.pct}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Main Dashboard ─────────────────────────────────────── */
export default function EmployerDashboard() {
    const [activeNav, setActiveNav] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifOpen, setNotifOpen] = useState(false);
    const [jobFilter, setJobFilter] = useState("all");
    const [searchVal, setSearchVal] = useState("");
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const mainRef = useRef(null);
    const headerRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            await Promise.all([
                import("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"),
                import("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"),
            ]);
            const { gsap, ScrollTrigger } = window;
            if (!gsap) return;
            gsap.registerPlugin(ScrollTrigger);

            /* Sidebar slide-in */
            gsap.fromTo(".db-sidebar", { x: -280, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: "power3.out" });

            /* Header slide down */
            gsap.fromTo(".db-header", { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out", delay: 0.15 });

            /* Staggered stat cards */
            gsap.fromTo(".db-stat", { opacity: 0, y: 36, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.3)", delay: 0.35 });

            /* Content sections */
            gsap.fromTo(".db-section", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.12, ease: "power3.out", delay: 0.55 });

            /* Candidate cards */
            gsap.fromTo(".db-cand", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.75 });

            /* Pipeline bars */
            gsap.fromTo(".db-pipe-fill", { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.1, ease: "power3.out", delay: 0.9, transformOrigin: "left center" });

            /* Number counters */
            document.querySelectorAll(".db-counter").forEach(el => {
                const target = parseInt(el.dataset.val, 10);
                gsap.fromTo({ val: 0 }, {
                    val: target, duration: 1.8, ease: "power2.out", delay: 0.5,
                    onUpdate: function () { el.textContent = Math.round(this.targets()[0].val).toLocaleString(); }
                });
            });
        };
        load();
    }, []);

    useEffect(() => {
        let active = true;
        const loadDashboard = async () => {
            if (!localStorage.getItem("employerToken")) {
                if (active) setDashboardLoading(false);
                return;
            }

            try {
                const response = await authService.getEmployerDashboard();
                if (!active) return;
                setDashboard(response?.data || null);
            } catch (error) {
                if (active) setDashboard(null);
            } finally {
                if (active) setDashboardLoading(false);
            }
        };

        loadDashboard();
        return () => { active = false; };
    }, []);

    const jobs = dashboard?.jobs || [];
    const applications = dashboard?.applications || [];
    const uniqueCandidates = useMemo(() => {
        const seen = new Set();
        return applications.filter((application) => {
            const key = String(application.candidateId || application.candidateEmail || application.candidateName || application.id || "");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [applications]);

    const filteredJobs = jobs.filter((j) => {
        if (jobFilter === "all") return true;
        if (jobFilter === "active") return Boolean(j.isActive);
        if (jobFilter === "paused") return !j.isActive && j.approvalStatus === "APPROVED";
        if (jobFilter === "closed") return !j.isActive && j.approvalStatus !== "APPROVED";
        return true;
    }).filter((j) => {
        const term = searchVal.trim().toLowerCase();
        if (!term) return true;
        return String(j.title || "").toLowerCase().includes(term) || String(j.department || j.dept || "").toLowerCase().includes(term) || String(j.location || "").toLowerCase().includes(term);
    });

    const tracking = dashboard?.tracking || {};
    const urgentJobCount = jobs.filter((job) => Boolean(job.requiresPackageOverride)).length;
    const interviewsToday = applications.filter((application) => String(application.status).toUpperCase() === "INTERVIEW").length;

    const dashboardStats = useMemo(() => [
        { label: "Active Jobs", val: Number(tracking.activeApprovedJobs ?? dashboard?.company?.activeJobCount ?? jobs.length), change: "+0", up: true, icon: <FiBriefcase size={20} />, color: "#002366", bg: "#EEF2FF", sparkline: [] },
        { label: "Total Applications", val: Number(tracking.totalApplications ?? applications.length), change: "+0", up: true, icon: <FiUsers size={20} />, color: "#10b981", bg: "#ecfdf5", sparkline: [] },
        { label: "Profile Views", val: Number(tracking.profileViews ?? 0), change: "+0%", up: true, icon: <FiEye size={20} />, color: "#6366f1", bg: "#f5f3ff", sparkline: [] },
        { label: "Shortlisted", val: Number(applications.filter((application) => application.status === "SHORTLISTED").length), change: "-0", up: false, icon: <FiTarget size={20} />, color: "#f59e0b", bg: "#fffbeb", sparkline: [] },
    ], [applications.length, jobs.length, tracking, dashboard]);

    const departmentBreakdown = useMemo(() => {
        const bucket = new Map();
        jobs.forEach((job) => {
            const label = String(job.department || job.dept || "Other") || "Other";
            bucket.set(label, (bucket.get(label) || 0) + 1);
        });
        const total = Array.from(bucket.values()).reduce((sum, count) => sum + count, 0);
        const palette = ["#002366", "#10b981", "#6366f1", "#f59e0b", "#dc2626", "#8b5cf6", "#0ea5e9"];
        return Array.from(bucket.entries()).map(([label, count], index) => ({
            label,
            count,
            pct: total ? Math.max(2, Math.round((count / total) * 100)) : 0,
            color: palette[index % palette.length],
        }));
    }, [jobs]);

    const pipelineData = useMemo(() => {
        const total = applications.length;
        const stages = [
            { stage: "Applied", status: "APPLIED", color: "#6366f1" },
            { stage: "Screened", status: "SCREENING", color: "#0ea5e9" },
            { stage: "Shortlisted", status: "SHORTLISTED", color: "#002366" },
            { stage: "Interview", status: "INTERVIEW", color: "#f59e0b" },
            { stage: "Offer", status: "OFFERED", color: "#10b981" },
        ];
        return stages.map((item) => {
            const count = applications.filter((application) => application.status === item.status).length;
            return {
                ...item,
                count,
                pct: total ? Math.max(4, Math.round((count / total) * 100)) : 0,
            };
        });
    }, [applications]);

    const activityFeed = useMemo(() => {
        const events = [
            ...applications.map((application) => ({
                id: `app-${application.id}`,
                icon: <FiUsers size={14} />,
                text: `${application.candidateName || "Candidate"} moved to ${application.statusLabel || application.status || "Applied"} for ${application.jobTitle || "a role"}`,
                time: application.lastUpdated || "Just now",
                color: application.status === "OFFERED" ? "#f59e0b" : application.status === "SHORTLISTED" ? "#10b981" : application.status === "INTERVIEW" ? "#6366f1" : "#002366",
                bg: application.status === "OFFERED" ? "#fffbeb" : application.status === "SHORTLISTED" ? "#ecfdf5" : application.status === "INTERVIEW" ? "#f5f3ff" : "#eef2ff",
                order: new Date(application.updatedAt || application.appliedAt || application.createdAt || Date.now()).getTime(),
            })),
            ...jobs.map((job) => ({
                id: `job-${job.id}`,
                icon: <FiBriefcase size={14} />,
                text: `Job posted: ${job.title}`,
                time: job.lastUpdated || "Just now",
                color: "#10b981",
                bg: "#ecfdf5",
                order: new Date(job.updatedAt || job.createdAt || Date.now()).getTime(),
            })),
        ];
        return events.sort((a, b) => b.order - a.order).slice(0, 6);
    }, [applications, jobs]);

    const candidateCards = useMemo(() => uniqueCandidates.slice(0, 5).map((application, index) => {
        const name = application.candidateName || application.candidateEmail || "Candidate";
        const role = application.candidateCurrentTitle || application.jobTitle || "Candidate";
        const exp = application.candidateExperience || application.experience || application.experienceYears || "N/A";
        const loc = application.candidateCity || application.candidateLocation || "";
        const stage = application.status === "SHORTLISTED" ? "Shortlisted"
            : application.status === "OFFERED" ? "Offer Sent"
            : application.status === "INTERVIEW" ? "Interview"
            : application.status === "SCREENING" ? "Screening"
            : "Applied";
        const match = Number(application.matchScore ?? application.match ?? 86);
        const rating = Math.min(5, Math.max(3.6, Math.round((match / 20) * 10) / 10));
        return {
            id: application.candidateId || application.id || index,
            name,
            role,
            exp: typeof exp === "string" ? exp : `${exp} yrs`,
            loc,
            stage,
            rating,
            match,
            color: ["#002366", "#0D9488", "#7C3AED", "#DC2626", "#B45309"][index % 5],
            avatar: String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "C",
        };
    }), [uniqueCandidates]);

    const statusColor = (status) => {
        if (String(status).toUpperCase() === "APPROVED") return "#10b981";
        if (String(status).toUpperCase() === "PENDING") return "#f59e0b";
        if (String(status).toUpperCase() === "REJECTED") return "#94a3b8";
        return "#94a3b8";
    };
    const statusBg = (status) => {
        if (String(status).toUpperCase() === "APPROVED") return "#ecfdf5";
        if (String(status).toUpperCase() === "PENDING") return "#fffbeb";
        if (String(status).toUpperCase() === "REJECTED") return "#f1f5f9";
        return "#f1f5f9";
    };
    const stageColor = (s) => ({
        "Interview": "#002366", "Shortlisted": "#10b981", "Assessment": "#6366f1", "Offer Sent": "#f59e0b"
    })[s] || "#94a3b8";
    const stageBg = (s) => ({
        "Interview": "#EEF2FF", "Shortlisted": "#ecfdf5", "Assessment": "#f5f3ff", "Offer Sent": "#fffbeb"
    })[s] || "#f1f5f9";

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#002366;--green:#10b981;--gd:#0da371;
          --s50:#f8fafc;--s100:#f1f5f9;--s200:#e2e8f0;
          --s400:#94a3b8;--s500:#64748b;--s600:#475569;--s900:#0f172a;
          --fd:'Bricolage Grotesque',sans-serif;
        }
        html,body{height:100%;overflow:hidden}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

        .db-nav-item{
          display:flex;align-items:center;gap:11px;
          padding:10px 14px;border-radius:12px;cursor:pointer;
          font-size:13.5px;font-weight:600;color:var(--s500);
          transition:all .2s;text-decoration:none;
          font-family:'DM Sans',sans-serif;
        }
        .db-nav-item:hover{background:rgba(0,35,102,.06);color:var(--navy)}
        .db-nav-item.active{background:linear-gradient(135deg,rgba(0,35,102,.1),rgba(0,35,102,.05));color:var(--navy);font-weight:700}
        .db-nav-item.active .db-nav-icon{color:var(--navy)}

        .db-stat{background:#fff;border:1.5px solid var(--s200);border-radius:20px;padding:22px 24px;cursor:default;transition:all .25s}
        .db-stat:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,35,102,.09);border-color:rgba(0,35,102,.15)}

        .db-card{background:#fff;border:1.5px solid var(--s200);border-radius:20px;overflow:hidden;transition:box-shadow .25s}

        .db-job-row{display:grid;grid-template-columns:2.4fr 1fr 1fr 80px 80px 100px 90px;gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid var(--s100);transition:background .18s;cursor:pointer}
        .db-job-row:hover{background:var(--s50)}
        .db-job-row:last-child{border-bottom:none}

        .db-cand{background:#fff;border:1.5px solid var(--s200);border-radius:16px;padding:16px;transition:all .22s;cursor:pointer}
        .db-cand:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,35,102,.08);border-color:rgba(0,35,102,.15)}

        .db-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:var(--navy);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--fd);transition:all .2s}
        .db-btn-primary:hover{background:#001540;transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,35,102,.3)}

        .db-btn-green{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:var(--green);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--fd);transition:all .2s}
        .db-btn-green:hover{background:var(--gd);transform:translateY(-1px);box-shadow:0 6px 18px rgba(16,185,129,.35)}

        .db-btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:transparent;color:var(--s600);border:1.5px solid var(--s200);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
        .db-btn-ghost:hover{border-color:rgba(0,35,102,.25);color:var(--navy);background:rgba(0,35,102,.04)}

        .db-filter-tab{padding:7px 16px;border-radius:100px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .18s;border:1.5px solid var(--s200);background:#fff;color:var(--s500);font-family:var(--fd)}
        .db-filter-tab.active{background:var(--navy);color:#fff;border-color:var(--navy)}
        .db-filter-tab:not(.active):hover{border-color:rgba(0,35,102,.2);color:var(--navy)}

        .db-badge{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:4px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-family:var(--fd)}

        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}

        .notif-dot{position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;background:#ef4444;border:2px solid #fff}
        .notif-dot::after{content:'';position:absolute;inset:-2px;border-radius:50%;background:#ef4444;animation:ping 1.5s ease-in-out infinite}
      `}</style>

            <div style={{ display: "flex", height: "100vh", background: "#f0f4fb", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#1e293b", overflow: "hidden" }}>

                {/* ══════ SIDEBAR ══════ */}
                <aside className="db-sidebar" style={{ width: sidebarOpen ? 248 : 72, flexShrink: 0, background: "#fff", borderRight: "1.5px solid #e2e8f0", display: "flex", flexDirection: "column", transition: "width .3s cubic-bezier(.4,0,.2,1)", overflow: "hidden", zIndex: 50 }}>

                    {/* Logo */}
                    <div style={{ padding: "22px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", whiteSpace: "nowrap" }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#002366,#003da8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <img src={mavenLogo} alt="Maven" style={{ height: 20, filter: "invert(1) brightness(2)" }} />
                            </div>
                            {sidebarOpen && (
                                <div>
                                    <div style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>MavenJobs</div>
                                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: ".06em" }}>Employer Portal</div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, borderRadius: 8, display: "flex", alignItems: "center", transition: "color .2s", flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = "#002366"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>
                            {sidebarOpen ? <FiX size={16} /> : <FiMenu size={16} />}
                        </button>
                    </div>

                    {/* Nav */}
                    <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto", overflowX: "hidden" }}>
                        {sidebarOpen && (
                            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#94a3b8", padding: "4px 10px 10px", fontFamily: "var(--fd)" }}>Main Menu</div>
                        )}
                        {NAV_ITEMS.map(item => (
                            <div key={item.id} className={`db-nav-item${activeNav === item.id ? " active" : ""}`} onClick={() => setActiveNav(item.id)}
                                title={!sidebarOpen ? item.label : ""} style={{ justifyContent: sidebarOpen ? "flex-start" : "center", position: "relative", overflow: sidebarOpen ? "visible" : "visible" }}>
                                <span className="db-nav-icon" style={{ flexShrink: 0, color: activeNav === item.id ? "var(--navy)" : "var(--s400)" }}>{item.icon}</span>
                                {sidebarOpen && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                                {item.badge && sidebarOpen && (
                                    <span style={{ marginLeft: "auto", minWidth: 20, height: 20, borderRadius: 100, background: "#002366", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", fontFamily: "var(--fd)" }}>{item.badge}</span>
                                )}
                                {item.badge && !sidebarOpen && (
                                    <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Company card */}
                    <div style={{ padding: "14px 10px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "linear-gradient(135deg,rgba(0,35,102,.06),rgba(0,35,102,.03))", border: "1px solid rgba(0,35,102,.08)", overflow: "hidden" }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#002366,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>TC</div>
                            {sidebarOpen && (
                                <div style={{ overflow: "hidden" }}>
                                    <div style={{ fontFamily: "var(--fd)", fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dashboard?.company?.name || "Your Company"}</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{dashboard?.company?.packageType || "Pro Plan"} · Active</div>
                                </div>
                            )}
                        </div>
                        {sidebarOpen && (
                            <button style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 8, padding: "9px 12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, fontWeight: 600, borderRadius: 10, transition: "all .2s", fontFamily: "'DM Sans',sans-serif" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94a3b8" }}>
                                <FiLogOut size={14} /> Sign Out
                            </button>
                        )}
                    </div>
                </aside>

                {/* ══════ MAIN AREA ══════ */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

                    {/* ── HEADER ── */}
                    <header className="db-header" style={{ background: "#fff", borderBottom: "1.5px solid #e2e8f0", height: 64, display: "flex", alignItems: "center", padding: "0 28px", gap: 16, flexShrink: 0, zIndex: 40 }}>
                        {/* Breadcrumb */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                                {NAV_ITEMS.find(n => n.id === activeNav)?.label || "Dashboard"}
                            </div>
                            <FiChevronRight size={14} color="#cbd5e1" />
                            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Overview</span>
                        </div>

                        {/* Search */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "8px 14px", width: 260, transition: "all .2s" }}
                            onFocus={e => e.currentTarget.style.borderColor = "rgba(0,35,102,.3)"}
                            onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                            <FiSearch size={15} color="#94a3b8" />
                            <input style={{ background: "none", border: "none", outline: "none", fontSize: 13.5, fontWeight: 500, color: "#0f172a", width: "100%", fontFamily: "'DM Sans',sans-serif" }} placeholder="Search jobs, candidates…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                        </div>

                        {/* Actions */}
                        <button className="db-btn-primary">
                            <FiPlus size={15} /> Post a Job
                        </button>

                        {/* Notifications */}
                        <div style={{ position: "relative" }}>
                            <button onClick={() => setNotifOpen(p => !p)} style={{ width: 40, height: 40, borderRadius: 12, background: "#f8fafc", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all .2s", position: "relative" }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,35,102,.2)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                                <FiBell size={17} />
                                <div className="notif-dot" />
                            </button>
                            {notifOpen && (
                                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 18, boxShadow: "0 20px 56px rgba(0,35,102,.14)", zIndex: 200, overflow: "hidden" }}>
                                    <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Notifications</div>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", cursor: "pointer" }}>Mark all read</span>
                                    </div>
                                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                        {activityFeed.slice(0, 5).map((a, i) => (
                                            <div key={a.id} style={{ display: "flex", gap: 11, padding: "13px 18px", borderBottom: i < activityFeed.slice(0, 5).length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer", transition: "background .15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                                <div style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0, marginTop: 1 }}>{a.icon}</div>
                                                <div>
                                                    <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5, fontWeight: 500 }}>{a.text}</div>
                                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{a.time}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: "12px 18px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#002366", cursor: "pointer" }}>View all notifications →</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Avatar */}
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#002366,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer" }}>HR</div>
                    </header>

                    {/* ── SCROLLABLE BODY ── */}
                    <main ref={mainRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

                        {/* Welcome bar */}
                        <div style={{ background: "linear-gradient(135deg,#050e24 0%,#002366 60%,#063785 100%)", borderRadius: 22, padding: "28px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, position: "relative", overflow: "hidden", minHeight: 110 }}>
                            {/* Dot grid texture */}
                            <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "radial-gradient(#fff 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
                            {/* Glow orb */}
                            <div style={{ position: "absolute", top: "-60%", right: "8%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 65%)", pointerEvents: "none" }} />
                            <div style={{ position: "absolute", bottom: "-50%", left: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)", pointerEvents: "none" }} />

                            {/* Left: greeting */}
                            <div style={{ position: "relative", zIndex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#10b981", fontFamily: "var(--fd)" }}>Employer Dashboard</span>
                                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.3)" }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>Wednesday, May 14</span>
                                </div>
                                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8 }}>Good morning, {dashboard?.company?.name || "there"}! 👋</div>
                                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", fontWeight: 500, lineHeight: 1.5 }}>
                                    You have{" "}
                                    <span style={{ color: "#34d399", fontWeight: 700, background: "rgba(52,211,153,.12)", padding: "1px 7px", borderRadius: 5 }}>{applications.length} new applications</span>
                                    {" "}and{" "}
                                    <span style={{ color: "#818cf8", fontWeight: 700, background: "rgba(129,140,248,.12)", padding: "1px 7px", borderRadius: 5 }}>{applications.filter((application) => application.status === "INTERVIEW").length} interviews</span>
                                    {" "}scheduled today.
                                </div>
                            </div>

                            {/* Right: chips + CTA */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1, flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 12, fontSize: 12.5, fontWeight: 700, color: "#fff", backdropFilter: "blur(12px)" }}>
                                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}><FiCalendar size={13} /></span>
                                    {interviewsToday} Interviews Today
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 12, fontSize: 12.5, fontWeight: 700, color: "#fff", backdropFilter: "blur(12px)" }}>
                                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}><FiZap size={13} /></span>
                                    {urgentJobCount} Urgent Jobs
                                </div>
                                <button className="db-btn-green" style={{ borderRadius: 12, padding: "11px 20px", fontSize: 13, boxShadow: "0 4px 18px rgba(16,185,129,.35)" }}>Quick Actions</button>
                            </div>
                        </div>

                        {/* ── STAT CARDS ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                            {dashboardStats.map((s, i) => (
                                <div key={i} className="db-stat">
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 13, background: s.bg, border: `1px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: s.up ? "#ecfdf5" : "#fef2f2", fontSize: 11, fontWeight: 800, color: s.up ? "#059669" : "#dc2626" }}>
                                            {s.up ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />}{s.change}
                                        </div>
                                    </div>
                                    <div className="db-counter" data-val={s.val} style={{ fontFamily: "var(--fd)", fontSize: "clamp(24px,2.5vw,32px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
                                        {s.val.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600, marginBottom: 12 }}>{s.label}</div>
                                    <Sparkline data={s.sparkline} color={s.color} />
                                </div>
                            ))}
                        </div>

                        {/* ── MID ROW: Jobs + Pipeline ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>

                            {/* Jobs Table */}
                            <div className="db-section db-card">
                                {/* Card header */}
                                <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                    <div>
                                        <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Active Job Postings</div>
                                        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{filteredJobs.length} jobs · sorted by recent</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                        {["all", "active", "paused", "closed"].map(f => (
                                            <button key={f} className={`db-filter-tab${jobFilter === f ? " active" : ""}`} onClick={() => setJobFilter(f)}>
                                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                            </button>
                                        ))}
                                        <button className="db-btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}><FiPlus size={13} /> Post Job</button>
                                    </div>
                                </div>

                                {/* Column headers */}
                                <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr 80px 80px 100px 90px", gap: 12, padding: "8px 20px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                                    {["Job Title", "Department", "Location", "Apps", "Views", "Status", "Actions"].map(h => (
                                        <div key={h} style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".1em" }}>{h}</div>
                                    ))}
                                </div>

                                {/* Rows */}
                                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                                    {filteredJobs.map((j, i) => (
                                        <div key={j.id} className="db-job-row">
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontFamily: "var(--fd)", fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>{j.title}</span>
                                                    {Boolean(j.requiresPackageOverride) && <span className="db-badge" style={{ background: "#fef2f2", color: "#dc2626" }}>Urgent</span>}
                                                </div>
                                                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>Updated {j.lastUpdated || j.createdAt || "recently"}</div>
                                            </div>
                                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{j.department || j.dept || "Other"}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#475569" }}><FiMapPin size={11} color="#94a3b8" />{j.location || "Remote"}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#0f172a" }}><FiUsers size={12} color="#94a3b8" />{j.applicantCount ?? 0}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#0f172a" }}><FiEye size={12} color="#94a3b8" />{j.viewCount ?? "-"}</div>
                                            <div>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 10px", borderRadius: 100, background: statusBg(j.approvalStatus), fontSize: 11.5, fontWeight: 800, color: statusColor(j.approvalStatus), fontFamily: "var(--fd)" }}>
                                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor(j.approvalStatus) }} />
                                                    {String(j.approvalStatus || "Pending").charAt(0).toUpperCase() + String(j.approvalStatus || "Pending").slice(1).toLowerCase()}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button style={{ width: 28, height: 28, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all .18s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#002366" }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#64748b" }}>
                                                    <FiEdit2 size={12} />
                                                </button>
                                                <button style={{ width: 28, height: 28, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all .18s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.color = "#0ea5e9" }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#64748b" }}>
                                                    <FiExternalLink size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 600 }}>Showing {filteredJobs.length} of {jobs.length} jobs</span>
                                    <button className="db-btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }}>View All Jobs <FiChevronRight size={13} /></button>
                                </div>
                            </div>

                            {/* Hiring Pipeline */}
                            <div className="db-section db-card">
                                <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
                                    <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Hiring Pipeline</div>
                                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>All active jobs combined</div>
                                </div>
                                <div style={{ padding: "20px" }}>
                                    {pipelineData.map((p, i) => (
                                        <div key={i} style={{ marginBottom: 16 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{p.stage}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{p.count.toLocaleString()}</span>
                                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.pct}%</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 8, borderRadius: 100, background: "#f1f5f9", overflow: "hidden" }}>
                                                <div className="db-pipe-fill" style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg,${p.color},${p.color}cc)`, width: `${p.pct}%`, minWidth: p.pct > 0 ? 8 : 0 }} />
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ marginTop: 20, padding: "14px 16px", background: "linear-gradient(135deg,rgba(0,35,102,.04),rgba(16,185,129,.04))", border: "1px solid rgba(0,35,102,.08)", borderRadius: 14 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>Conversion Rate</div>
                                                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{applications.length ? `${Math.round((applications.filter((application) => application.status === "OFFERED").length / applications.length) * 10000) / 100}%` : "0%"}</div>
                                            </div>
                                            <div style={{ width: 54, height: 54, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform: "rotate(-90deg)" }}>
                                                    <circle cx="27" cy="27" r="22" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                                                    <circle cx="27" cy="27" r="22" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                                                        strokeDasharray={`${0.0093 * 138} ${138}`} />
                                                </svg>
                                                <div style={{ position: "absolute", fontSize: 10, fontWeight: 800, color: "#10b981" }}>1%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── BOTTOM ROW: Candidates + Donut + Activity ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 260px", gap: 18 }}>

                            {/* Candidates */}
                            <div className="db-section db-card">
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Top Candidates</div>
                                        <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600, marginTop: 1 }}>Ranked by AI match score</div>
                                    </div>
                                    <button className="db-btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }}>View All</button>
                                </div>
                                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                    {candidateCards.map((c, i) => (
                                        <div key={c.id} className="db-cand">
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                {/* Avatar */}
                                                <div style={{ width: 42, height: 42, borderRadius: 13, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.avatar}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                                        <span style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{c.name}</span>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                            {[0, 1, 2, 3, 4].map(s => <div key={s} style={{ width: 8, height: 8, background: s < Math.floor(c.rating) ? "#f59e0b" : "#e2e8f0", borderRadius: 2, clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />)}
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginLeft: 3 }}>{c.rating}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span>{c.role}</span>
                                                        <span style={{ color: "#e2e8f0" }}>·</span>
                                                        <span>{c.exp}</span>
                                                        <span style={{ color: "#e2e8f0" }}>·</span>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><FiMapPin size={10} />{c.loc}</span>
                                                    </div>
                                                </div>
                                                {/* Match + Stage */}
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--fd)", fontSize: 14, fontWeight: 800, color: "#10b981" }}>
                                                        <FiZap size={12} fill="#10b981" />{c.match}%
                                                    </div>
                                                    <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 8px", borderRadius: 4, background: stageBg(c.stage), color: stageColor(c.stage), fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "var(--fd)" }}>{c.stage}</span>
                                                </div>
                                                {/* Actions */}
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button style={{ width: 30, height: 30, borderRadius: 9, background: "#EEF2FF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#002366", transition: "all .18s" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "#002366" || (e.currentTarget.style.color = "#fff")}
                                                        onMouseLeave={e => e.currentTarget.style.background = "#EEF2FF" || (e.currentTarget.style.color = "#002366")}>
                                                        <FiMail size={13} />
                                                    </button>
                                                    <button style={{ width: 30, height: 30, borderRadius: 9, background: "#ecfdf5", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#10b981", transition: "all .18s" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "#10b981" || (e.currentTarget.style.color = "#fff")}
                                                        onMouseLeave={e => e.currentTarget.style.background = "#ecfdf5" || (e.currentTarget.style.color = "#10b981")}>
                                                        <FiPhone size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dept Donut */}
                            <div className="db-section db-card">
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Jobs by Department</div>
                                        <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{jobs.length} active postings</div>
                                    </div>
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 100, background: "#EEF2FF", fontSize: 11, fontWeight: 800, color: "#002366", fontFamily: "var(--fd)" }}>
                                        <FiBarChart2 size={11} /> Live
                                    </div>
                                </div>
                                <div style={{ padding: "20px 18px" }}>
                                    <DonutChart breakdown={departmentBreakdown} activeJobs={jobs.length} />
                                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 7, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                                        {[
                                            { label: "Most competitive", val: "Engineering", color: "#002366", icon: <FiTarget size={12} /> },
                                            { label: "Fastest to fill", val: "Design", color: "#10b981", icon: <FiZap size={12} /> },
                                            { label: "Avg. time to hire", val: "18 days", color: "#6366f1", icon: <FiClock size={12} /> },
                                        ].map((kv, i) => (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "#f8fafc", borderRadius: 10, borderLeft: `3px solid ${kv.color}` }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>
                                                    <span style={{ color: kv.color }}>{kv.icon}</span>{kv.label}
                                                </span>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: kv.color, fontFamily: "var(--fd)" }}>{kv.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="db-section db-card">
                                <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Activity Feed</div>
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 18, padding: "0 8px", borderRadius: 100, background: "#ecfdf5", fontSize: 10, fontWeight: 800, color: "#10b981", fontFamily: "var(--fd)" }}>
                                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} /> Live
                                    </div>
                                </div>
                                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 0, maxHeight: 420, overflowY: "auto" }}>
                                    {activityFeed.map((a, i) => (
                                        <div key={a.id} style={{ display: "flex", gap: 11, padding: "10px 4px", borderBottom: i < activityFeed.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer", transition: "background .15s", borderRadius: 10 }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <div style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0, marginTop: 1 }}>{a.icon}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.55, fontWeight: 500 }}>{a.text}</div>
                                                <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{a.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                                    <button className="db-btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>View Full Log</button>
                                </div>
                            </div>
                        </div>

                        {/* ── QUICK INSIGHTS ── */}
                        <div className="db-section" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                            {[
                                { label: "Response Rate", val: "68%", sub: "vs 52% industry avg", icon: <FiActivity size={16} />, color: "#002366", bg: "#EEF2FF", up: true },
                                { label: "Avg. Time to Hire", val: "18d", sub: "↓ 4d from last month", icon: <FiClock size={16} />, color: "#10b981", bg: "#ecfdf5", up: true },
                                { label: "Offer Acceptance", val: "84%", sub: "↑ 6% this quarter", icon: <FiCheckCircle size={16} />, color: "#6366f1", bg: "#f5f3ff", up: true },
                                { label: "Cost per Hire", val: "₹12K", sub: "↓ 18% optimization", icon: <FiTrendingUp size={16} />, color: "#f59e0b", bg: "#fffbeb", up: true },
                            ].map((kpi, i) => (
                                <div key={i} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "default", transition: "all .25s" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,35,102,.08)"; e.currentTarget.style.borderColor = "rgba(0,35,102,.15)" }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "#e2e8f0" }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 13, background: kpi.bg, border: `1px solid ${kpi.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color, flexShrink: 0 }}>{kpi.icon}</div>
                                    <div>
                                        <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 3 }}>{kpi.val}</div>
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>{kpi.label}</div>
                                        <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginTop: 2 }}>{kpi.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── FOOTER SPACING ── */}
                        <div style={{ height: 8 }} />
                    </main>
                </div>
            </div>
        </>
    );
}