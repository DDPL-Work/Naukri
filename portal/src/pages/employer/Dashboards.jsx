import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
    FiBriefcase, FiUsers, FiEye, FiTrendingUp, FiBarChart2,
    FiBell, FiSearch, FiPlus, FiChevronRight, FiArrowUp,
    FiArrowDown, FiCheckCircle, FiClock, FiMapPin, FiStar,
    FiSettings, FiLogOut, FiMenu, FiX, FiMail, FiPhone,
    FiZap, FiTarget, FiCalendar, FiAward, FiActivity,
    FiEdit2, FiExternalLink, FiMoreVertical, FiMessageSquare,
    FiPieChart, FiDollarSign, FiGlobe, FiLinkedin, FiTwitter,
    FiSend, FiPaperclip, FiSmile, FiChevronDown, FiFilter,
    FiDownload, FiShare2, FiBookmark, FiHome, FiGrid,
    FiUserCheck, FiAlertCircle, FiInfo, FiLayers, FiShield,
    FiCpu, FiTool, FiFileText, FiLink, FiImage, FiVideo,
    FiMic, FiCamera, FiAtSign, FiHash, FiRefreshCw,
    FiArrowLeft, FiMaximize2, FiMinimize2, FiUser,
    FiSliders, FiPercent, FiCreditCard, FiHeart
} from "react-icons/fi";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";
import authService from "../../services/authService";
import { buildRtcConfig as buildWebRtcConfig, createPeerConnection as createRtcPeerConnection, flushIceCandidates, stopMediaStream } from "../../utils/webrtc";

/* ── Tokens ─────────────────────────────────────────────── */
const C = {
    navy: "#002366", navyD: "#001540", navyM: "#1a3a6e",
    green: "#10b981", greenD: "#059669",
    indigo: "#6366f1", amber: "#f59e0b", sky: "#0ea5e9",
    red: "#ef4444", purple: "#8b5cf6", emerald: "#10b981",
    white: "#fff",
    s50: "#f8fafc", s100: "#f1f5f9", s200: "#e2e8f0",
    s300: "#cbd5e1", s400: "#94a3b8", s500: "#64748b",
    s600: "#475569", s700: "#334155", s800: "#1e293b", s900: "#0f172a",
    fd: "'Bricolage Grotesque',sans-serif",
    dm: "'DM Sans',sans-serif",
};

/* ── Mock Data ───────────────────────────────────────────── */
const CONVERSATION_COLORS = [C.navy, "#0D9488", C.purple, "#DC2626", C.indigo, C.amber, C.sky, C.greenD];

const getInitialsFromName = (name = "Candidate") =>
    String(name || "Candidate")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase() || "C";

const ANALYTICS_DATA = {
    profileViews: [320, 410, 380, 520, 490, 610, 580, 720, 680, 840, 800, 960],
    applications: [40, 62, 55, 78, 70, 95, 88, 112, 105, 130, 122, 148],
    hireRate: [8, 9, 7, 11, 10, 13, 12, 14, 13, 16, 15, 17],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    topSources: [
        { label: "LinkedIn", pct: 42, color: C.navy },
        { label: "Direct Apply", pct: 28, color: C.green },
        { label: "Referrals", pct: 16, color: C.indigo },
        { label: "Job Boards", pct: 14, color: C.amber },
    ],
    funnelData: [
        { stage: "Profile Views", val: 8420, color: C.sky },
        { stage: "Job Views", val: 3240, color: C.indigo },
        { stage: "Applications", val: 1284, color: C.navy },
        { stage: "Screened", val: 487, color: C.purple },
        { stage: "Shortlisted", val: 142, color: C.amber },
        { stage: "Offers Sent", val: 12, color: C.green },
    ],
};

/* ── Tiny helpers ────────────────────────────────────────── */
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + "K" : n;
const formatCompactNumber = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "0";
    if (num >= 1000) {
        return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
    }
    return `${num}`;
};
const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
const getTrailingMonths = (count = 12) => {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
        return {
            key: getMonthKey(date),
            label: date.toLocaleString("en-US", { month: "short" }),
        };
    });
};
const buildMonthlySeries = (items, accessor) => {
    const months = getTrailingMonths();
    const monthIndex = new Map(months.map((month, index) => [month.key, index]));
    const values = Array(months.length).fill(0);

    items.forEach((item) => {
        const rawDate = accessor(item);
        const date = rawDate ? new Date(rawDate) : null;
        if (!date || Number.isNaN(date.getTime())) return;
        const idx = monthIndex.get(getMonthKey(date));
        if (idx === undefined) return;
        values[idx] += 1;
    });

    return {
        labels: months.map((month) => month.label),
        values,
    };
};
const buildStatusCounts = (applications) => {
    const statuses = ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED"];
    const counts = statuses.map((status) => applications.filter((application) => application.status === status).length);
    return { statuses, counts };
};
const buildSourceBreakdown = (applications) => {
    const sourceCounts = {
        "QR Campaign": 0,
        "Job Share": 0,
        "Direct Apply": 0,
        "Other": 0,
    };

    applications.forEach((application) => {
        if (application.sourceQrToken) {
            sourceCounts["QR Campaign"] += 1;
            return;
        }

        if (application.sourceJobId) {
            sourceCounts["Job Share"] += 1;
            return;
        }

        sourceCounts["Direct Apply"] += 1;
    });

    const total = Object.values(sourceCounts).reduce((sum, value) => sum + value, 0);
    const palette = [
        { label: "QR Campaign", color: C.navy },
        { label: "Job Share", color: C.green },
        { label: "Direct Apply", color: C.indigo },
        { label: "Other", color: C.amber },
    ];

    if (total === 0) {
        return [{ label: "Direct Apply", pct: 100, color: C.indigo }];
    }

    return palette.map((entry) => ({
        ...entry,
        pct: Math.max(0, Math.round((sourceCounts[entry.label] / total) * 100)),
    })).filter((entry) => entry.pct > 0);
};

function Avatar({ initials, color, size = 38, radius = 12, fontSize = 13 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: radius, background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: C.fd, fontSize, fontWeight: 800, color: "#fff", flexShrink: 0
        }}>
            {initials}
        </div>
    );
}

function Tag({ children, color = C.navy }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", padding: "4px 12px",
            borderRadius: 100, background: color + "14", border: `1px solid ${color}28`,
            fontSize: 12, fontWeight: 700, color, fontFamily: C.fd, whiteSpace: "nowrap"
        }}>
            {children}
        </span>
    );
}

function Btn({ onClick, children, variant = "ghost", style = {} }) {
    const base = {
        display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px",
        borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
        fontFamily: C.fd, transition: "all .18s", border: "none", ...style
    };
    const variants = {
        primary: { background: C.navy, color: "#fff" },
        green: { background: C.green, color: "#fff" },
        ghost: { background: "transparent", color: C.s600, border: `1.5px solid ${C.s200}` },
        danger: { background: "transparent", color: "#ef4444", border: `1.5px solid #fecaca` },
    };
    return (
        <button onClick={onClick} style={{ ...base, ...variants[variant] }}
            onMouseEnter={e => {
                if (variant === "primary") { e.currentTarget.style.background = C.navyD; e.currentTarget.style.boxShadow = `0 6px 18px rgba(0,35,102,.28)`; }
                if (variant === "green") { e.currentTarget.style.background = C.greenD; }
                if (variant === "ghost") { e.currentTarget.style.borderColor = "rgba(0,35,102,.3)"; e.currentTarget.style.color = C.navy; e.currentTarget.style.background = "rgba(0,35,102,.04)"; }
                if (variant === "danger") { e.currentTarget.style.background = "#fef2f2"; }
                e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
                Object.assign(e.currentTarget.style, variants[variant]);
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
            }}>
            {children}
        </button>
    );
}

/* ── Line Chart SVG ──────────────────────────────────────── */
function LineChart({ data, color, label, height = 120, showGrid = true }) {
    const W = 440, H = height, PAD = 30;
    const max = Math.max(...data), min = Math.min(...data) * 0.85;
    const pts = data.map((v, i) => ({
        x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
        y: H - PAD - ((v - min) / (max - min)) * (H - PAD * 2),
    }));
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD} Z`;
    const gridLines = showGrid ? [0, .25, .5, .75, 1] : [];
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
            <defs>
                <linearGradient id={`lc${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity=".2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {gridLines.map((g, i) => {
                const y = H - PAD - (g * (H - PAD * 2));
                return <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={C.s100} strokeWidth="1" />;
            })}
            <path d={area} fill={`url(#lc${color.replace("#", "")})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
            ))}
        </svg>
    );
}

/* ── Bar Chart SVG ───────────────────────────────────────── */
function BarChart({ data, colors, labels, height = 120 }) {
    const W = 440, H = height, PAD = 30;
    const max = Math.max(...data);
    const bw = (W - PAD * 2) / data.length * 0.55;
    const gap = (W - PAD * 2) / data.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
            {data.map((v, i) => {
                const x = PAD + i * gap + gap * 0.225;
                const bh = ((v / max) * (H - PAD * 2));
                const y = H - PAD - bh;
                const col = Array.isArray(colors) ? colors[i % colors.length] : colors;
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={bw} height={bh} fill={col} rx="4" opacity=".85" />
                        <text x={x + bw / 2} y={H - PAD + 13} textAnchor="middle" fill={C.s400} fontSize="9" fontFamily={C.dm}>{labels[i]}</text>
                        <text x={x + bw / 2} y={y - 5} textAnchor="middle" fill={col} fontSize="9.5" fontWeight="700" fontFamily={C.fd}>{fmt(v)}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/* ── Funnel Chart ────────────────────────────────────────── */
function FunnelChart({ data }) {
    const max = Math.max(data[0]?.val || 0, 1);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 90, fontSize: 11.5, fontWeight: 600, color: C.s600, textAlign: "right", flexShrink: 0 }}>{d.stage}</div>
                    <div style={{ flex: 1, height: 24, borderRadius: 6, background: C.s100, overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", borderRadius: 6, background: d.color, width: `${(d.val / max) * 100}%`, transition: "width 1s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", fontFamily: C.fd }}>{fmt(d.val)}</span>
                        </div>
                    </div>
                    <div style={{ width: 36, fontSize: 11, color: C.s400, fontWeight: 600, flexShrink: 0 }}>
                        {i === 0 ? "100%" : `${((d.val / max) * 100).toFixed(1)}%`}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Modal Shell ─────────────────────────────────────────── */
function Modal({ open, onClose, title, width = 680, children, noPad = false }) {
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);
    if (!open) return null;
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
                backdropFilter: "blur(4px)", animation: "fadeIn .18s ease"
            }}>
            <div style={{
                background: "#fff", borderRadius: 20, width: "100%", maxWidth: width,
                maxHeight: "90vh", display: "flex", flexDirection: "column",
                boxShadow: "0 32px 80px rgba(0,35,102,.18)", animation: "slideUp .22s ease"
            }}>
                {/* Modal header */}
                <div style={{
                    padding: "18px 24px", borderBottom: `1px solid ${C.s100}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0
                }}>
                    <div style={{ fontFamily: C.fd, fontSize: 17, fontWeight: 800, color: C.s900 }}>{title}</div>
                    <button onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 9, background: C.s50, border: `1px solid ${C.s200}`,
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            color: C.s500, transition: "all .16s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.s100; e.currentTarget.style.color = C.s900; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.s50; e.currentTarget.style.color = C.s500; }}>
                        <FiX size={15} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", ...(noPad ? {} : { padding: "24px" }) }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── Card wrapper ────────────────────────────────────────── */
function Card({ children, style = {}, className = "" }) {
    return (
        <div className={className}
            style={{
                background: "#fff", border: `1px solid ${C.s200}`, borderRadius: 16,
                overflow: "hidden", ...style
            }}>
            {children}
        </div>
    );
}

/* ── Section head ────────────────────────────────────────── */
function SectionHead({ title, action }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: `1px solid ${C.s100}`
        }}>
            <div style={{ fontFamily: C.fd, fontSize: 16, fontWeight: 800, color: C.s900 }}>{title}</div>
            {action}
        </div>
    );
}

function HelpDeskChatForm() {
    const [issue, setIssue] = useState("");
    const [desc, setDesc] = useState("");
    const [urgency, setUrgency] = useState("");
    const [file, setFile] = useState(null);
    const [email, setEmail] = useState("");
    const [contactMethod, setContactMethod] = useState("");
    const [chatStarted, setChatStarted] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { from: "system", text: "Welcome to the Help Desk Center! How can we assist you today?" }
    ]);
    const [chatInput, setChatInput] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        if (contactMethod === "Chat") {
            setChatStarted(true);
            setChatMessages((msgs) => [...msgs, { from: "user", text: desc }]);
        } else {
            alert("Your request has been submitted. Our team will contact you soon.");
        }
    }

    function handleChatSend(e) {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages((msgs) => [...msgs, { from: "user", text: chatInput }]);
        setChatInput("");
        setTimeout(() => {
            setChatMessages((msgs) => [...msgs, { from: "system", text: "Thank you for your message. We will connect with you in a short time!" }]);
        }, 800);
    }

    if (contactMethod === "Chat" && chatStarted) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: 400 }}>
                <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 12, border: "1px solid #e2e8f0" }}>
                    {chatMessages.map((msg, i) => (
                        <div key={i} style={{ textAlign: msg.from === "user" ? "right" : "left", margin: "8px 0" }}>
                            <span style={{ display: "inline-block", background: msg.from === "user" ? "#002366" : "#e2e8f0", color: msg.from === "user" ? "#fff" : "#222", borderRadius: 16, padding: "8px 16px", maxWidth: 320, fontSize: 15 }}>{msg.text}</span>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleChatSend} style={{ display: "flex", gap: 8 }}>
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your message..." style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15 }} />
                    <button type="submit" style={{ background: "#002366", color: "#fff", border: "none", borderRadius: 8, padding: "0 18px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                        <FiSend />
                    </button>
                </form>
                <div style={{ marginTop: 10, color: "#10b981", fontWeight: 600, textAlign: "center" }}>We will connect with you in a short time!</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>How can we help you?</h2>
            <form style={{ display: "flex", flexDirection: "column", gap: 18 }} onSubmit={handleSubmit}>
                <label style={{ fontWeight: 600 }}>
                    What issue are you facing?
                    <select required value={issue} onChange={(e) => setIssue(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", width: "100%" }}>
                        <option value="">Select an issue</option>
                        <option>Job Posting</option>
                        <option>Application</option>
                        <option>Shortlisting</option>
                        <option>Offers</option>
                        <option>Other</option>
                    </select>
                </label>
                <label style={{ fontWeight: 600 }}>
                    Please describe your issue in detail
                    <textarea required rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", width: "100%" }} placeholder="Describe your problem..." />
                </label>
                <label style={{ fontWeight: 600 }}>
                    How urgent is your issue?
                    <select required value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", width: "100%" }}>
                        <option value="">Select urgency</option>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                    </select>
                </label>
                <label style={{ fontWeight: 600 }}>
                    Attach any relevant files/screenshots
                    <input type="file" style={{ marginTop: 6 }} onChange={(e) => setFile(e.target.files[0])} />
                </label>
                <label style={{ fontWeight: 600 }}>
                    Your contact email
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", width: "100%" }} placeholder="you@company.com" />
                </label>
                <label style={{ fontWeight: 600 }}>
                    Preferred contact method
                    <select required value={contactMethod} onChange={(e) => setContactMethod(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", width: "100%" }}>
                        <option value="">Select method</option>
                        <option>Email</option>
                        <option>Phone</option>
                        <option>Chat</option>
                    </select>
                </label>
                <button type="submit" style={{ marginTop: 10, padding: "10px 0", borderRadius: 8, background: "#002366", color: "#fff", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer" }}>
                    {contactMethod === "Chat" ? "Start Chat" : "Submit Request"}
                </button>
            </form>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function EmployerProfile() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [topNavTab, setTopNavTab] = useState("home");
    const [activeTab, setActiveTab] = useState("Overview");
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [mediaLoading, setMediaLoading] = useState({ logo: false, cover: false });
    const logoInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const [showMsg, setShowMsg] = useState(false);
    const [showAna, setShowAna] = useState(false);
    const [showHelpDesk, setShowHelpDesk] = useState(false);
    const [showPro, setShowPro] = useState(false);
    const [showPost, setShowPost] = useState(false);
    const [activeConv, setActiveConv] = useState(0);
    const [msgInput, setMsgInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [liked, setLiked] = useState({});
    const [following, setFollowing] = useState(false);
    const [jobFilter, setJobFilter] = useState("all");
    const [anaTab, setAnaTab] = useState("overview");
    const [showNotifications, setShowNotifications] = useState(false);
    const [showViewJob, setShowViewJob] = useState(false);
    const [showEditJob, setShowEditJob] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [reviewPage, setReviewPage] = useState(0);
    const [showAboutEditor, setShowAboutEditor] = useState(false);
    const [aboutDraft, setAboutDraft] = useState({ about: "", website: "", companySize: "", industry: "" });
    const [savingAbout, setSavingAbout] = useState(false);
    const [likedReviews, setLikedReviews] = useState({}); // Stores the selected reaction type
    const [showReactionFor, setShowReactionFor] = useState(null);
    const [shareMessage, setShareMessage] = useState("");
    const [showCall, setShowCall] = useState(false);
    const [callMode, setCallMode] = useState("AUDIO");
    const [callStatus, setCallStatus] = useState("idle");
    const [localCallStream, setLocalCallStream] = useState(null);
    const [remoteCallStream, setRemoteCallStream] = useState(null);
    const callPreviewRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localCallStreamRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);
    const rtcConfig = useMemo(() => buildWebRtcConfig(), []);
    const chatEndRef = useRef(null);
    const chatSocketRef = useRef(null);
    const activeConversationIdRef = useRef("");
    const employerSession = useRef(null);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", fn, { passive: true });
        return () => window.removeEventListener("scroll", fn);
    }, []);

    useEffect(() => {
        if (!dashboard?.company) return;
        setAboutDraft({
            about: dashboard.company.about || "",
            website: dashboard.company.website || "",
            companySize: dashboard.company.companySize || dashboard.company.size || "",
            industry: dashboard.company.industry || "",
        });
    }, [dashboard?.company]);

    useEffect(() => {
        setMessages([]);
        setActiveConv(0);
    }, []);

    const activeConversation = useMemo(
        () => messages[activeConv] || messages[0] || null,
        [messages, activeConv],
    );

    useEffect(() => {
        activeConversationIdRef.current = activeConversation?.id || "";
    }, [activeConversation?.id]);

    useEffect(() => {
        if (!showMsg) {
            return;
        }

        const hydrateThreads = async () => {
            try {
                const response = await authService.getEmployerChats();
                const backendThreads = response?.data?.threads || [];
                if (!backendThreads.length) {
                    return;
                }

                setMessages((current) => {
                    const currentById = new Map(current.map((conversation) => [String(conversation.id), conversation]));
                    return backendThreads.map((thread, index) => {
                        const previous = currentById.get(String(thread.id));
                        const color = previous?.color || CONVERSATION_COLORS[index % CONVERSATION_COLORS.length];
                        const avatar = thread.candidateAvatar || previous?.avatar || getInitialsFromName(thread.candidateName);
                        return {
                            ...previous,
                            ...thread,
                            avatar,
                            color,
                            from: thread.candidateName || previous?.from || "Candidate",
                            role: thread.candidateTitle || previous?.role || thread.jobTitle || "Candidate",
                            preview: previous?.preview || thread.lastMessageText || "No messages yet",
                            time: thread.time || previous?.time || "Just now",
                            messages: previous?.messages || [],
                        };
                    });
                });
            } catch {
                // Keep the locally derived list when the chat endpoint is unavailable.
            }
        };

        hydrateThreads();
    }, [showMsg]);

    useEffect(() => {
        let active = true;

        const loadDashboard = async () => {
            const savedSession = (() => {
                try {
                    return JSON.parse(localStorage.getItem("employerUser") || "null");
                } catch {
                    return null;
                }
            })();

            employerSession.current = savedSession;

            if (!localStorage.getItem("employerToken")) {
                if (active) setDashboardLoading(false);
                return;
            }

            try {
                const response = await authService.getEmployerDashboard();
                if (!active) return;
                let dashboardData = response?.data || null;

                // If the dashboard doesn't include recent applications, fetch them separately
                try {
                    const hasApps = (dashboardData && Array.isArray(dashboardData.applications) && dashboardData.applications.length > 0);
                    if (!hasApps) {
                        const appsResp = await authService.getEmployerApplications();
                        const apps = appsResp?.data || appsResp?.applications || [];
                        dashboardData = { ...(dashboardData || {}), applications: apps };
                    }
                } catch (err) {
                    // ignore; keep whatever dashboard data we already have
                }

                setDashboard(dashboardData || null);

                const nextSession = {
                    ...(savedSession || {}),
                    companyName: response?.data?.company?.name || savedSession?.companyName || "",
                    companyId: response?.data?.company?.id || savedSession?.companyId || "",
                };
                employerSession.current = nextSession;
                localStorage.setItem("employerUser", JSON.stringify(nextSession));
            } catch (error) {
                if (active) {
                    setDashboard(null);
                }
                if ((error?.statusCode || error?.response?.status) === 401) {
                    localStorage.removeItem("employerToken");
                    localStorage.removeItem("employerUser");
                }
            } finally {
                if (active) setDashboardLoading(false);
            }
        };

        loadDashboard();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (showMsg) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, [showMsg, activeConv]);

    useEffect(() => {
        if (!showMsg) {
            return;
        }

        const token = localStorage.getItem("employerToken");
        if (!token) {
            return;
        }

        const socketUrl = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5000")
            .replace(/\/api\/v\d+$/, "");

        if (chatSocketRef.current) {
            return;
        }

        const socket = io(socketUrl, {
            auth: { token },
            transports: ["websocket", "polling"],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            timeout: 20000,
            pingInterval: 25000,
            pingTimeout: 60000,
        });

        const createEmployerPeerConnection = (threadId) => {
            const pc = createRtcPeerConnection({
                rtcConfig,
                localStream: localCallStreamRef.current,
                onIceCandidate: (candidate) => {
                    if (candidate && chatSocketRef.current?.connected) {
                        chatSocketRef.current.emit("call:ice-candidate", { threadId, candidate });
                    }
                },
                onTrack: (event) => {
                    setRemoteCallStream(event.streams?.[0] || event.stream);
                },
                onConnectionStateChange: (state) => {
                    console.debug("Employer RTCPeerConnection state", state);
                    if (state === "failed") {
                        setCallStatus("failed");
                    }
                },
                onIceConnectionStateChange: (iceState) => {
                    console.debug("Employer ICE connection state", iceState);
                },
                onSignalingStateChange: (signalingState) => {
                    console.debug("Employer signaling state", signalingState);
                },
            });

            pendingIceCandidatesRef.current = [];
            return pc;
        };

        socket.on("connect", () => {
            if (activeConversationIdRef.current) {
                socket.emit("thread:join", { threadId: activeConversationIdRef.current });
            }
        });

        socket.on("chat:message", ({ threadId, message, thread }) => {
            setMessages((current) => current.map((conversation) => {
                if (String(conversation.id) !== String(threadId)) {
                    return conversation;
                }

                const nextMessages = Array.isArray(conversation.messages) ? [...conversation.messages] : [];
                const isFromMe = message.senderRole === "COMPANY";
                if (isFromMe) {
                    const lastMsg = nextMessages[nextMessages.length - 1];
                    if (lastMsg && lastMsg.from === "me" && lastMsg.text === message.text && lastMsg.time === "Just now") {
                        nextMessages[nextMessages.length - 1] = {
                            from: "me",
                            text: message.text || "",
                            time: message.lastUpdated || "Just now",
                        };
                        return { ...conversation, ...thread, messages: nextMessages, preview: message.text || conversation.preview, time: thread?.time || conversation.time, unread: false };
                    }
                }

                nextMessages.push({
                    from: isFromMe ? "me" : "them",
                    text: message.text || "",
                    time: message.lastUpdated || "Just now",
                });

                return {
                    ...conversation,
                    ...thread,
                    messages: nextMessages,
                    preview: message.text || conversation.preview,
                    time: thread?.time || conversation.time,
                    unread: !isFromMe,
                };
            }));
        });

            socket.on("call:state", async ({ threadId, activeCall }) => {
                setMessages((current) => current.map((conversation) => (
                    String(conversation.id) === String(threadId)
                        ? { ...conversation, activeCall }
                        : conversation
                )));
                if (String(activeConversationIdRef.current || "") === String(threadId || "")) {
                    setCallStatus(activeCall?.state === "IN_CALL" ? "in-call" : activeCall?.state === "RINGING" ? "ringing" : "idle");
                    
                    if (activeCall?.state === "IN_CALL" && activeCall?.initiatedBy === "COMPANY") {
                        if (peerConnectionRef.current) return;

                        peerConnectionRef.current = createEmployerPeerConnection(threadId);
                        try {
                            const offer = await peerConnectionRef.current.createOffer();
                            await peerConnectionRef.current.setLocalDescription(offer);
                            socket.emit("call:offer", { threadId, offer });
                        } catch (err) {
                            console.error("Error creating WebRTC offer", err);
                            setCallStatus("failed");
                        }
                    }
                }
            });

            socket.on("call:offer", async ({ threadId, offer, from }) => {
                if (String(activeConversationIdRef.current || "") !== String(threadId || "")) return;
                
                if (!peerConnectionRef.current) {
                    peerConnectionRef.current = createEmployerPeerConnection(threadId);
                }

                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                    await flushIceCandidates(peerConnectionRef.current, pendingIceCandidatesRef.current);
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    socket.emit("call:answer", { threadId, answer });
                } catch (err) {
                    console.error("Error handling WebRTC offer", err);
                    setCallStatus("failed");
                }
            });

            socket.on("call:answer", async ({ threadId, answer, from }) => {
                if (String(activeConversationIdRef.current || "") !== String(threadId || "")) return;
                if (!peerConnectionRef.current) return;
                
                if (answer && answer.type === "answer") {
                    try {
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                        await flushIceCandidates(peerConnectionRef.current, pendingIceCandidatesRef.current);
                    } catch (err) {
                        console.error("Error setting remote description from answer", err);
                        setCallStatus("failed");
                    }
                }
            });

            socket.on("call:ice-candidate", async ({ threadId, candidate, from }) => {
                if (String(activeConversationIdRef.current || "") !== String(threadId || "")) return;
                if (!candidate) return;
                
                if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
                    pendingIceCandidatesRef.current.push(candidate);
                    return;
                }
                
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding ice candidate", err);
                }
            });

            socket.on("call:end", ({ threadId }) => {
                if (String(activeConversationIdRef.current || "") === String(threadId || "")) {
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.close();
                        peerConnectionRef.current = null;
                    }
                    pendingIceCandidatesRef.current = [];
                    setRemoteCallStream(null);
                    setLocalCallStream(currentStream => {
                        if (currentStream) currentStream.getTracks().forEach(t => t.stop());
                        return null;
                    });
                    localCallStreamRef.current = null;
                    setShowCall(false);
                    setCallStatus("idle");
                }
            });

        socket.on("disconnect", () => {
            chatSocketRef.current = null;
        });

        chatSocketRef.current = socket;

        return () => {
            socket.disconnect();
            chatSocketRef.current = null;
        };
    }, [showMsg]);

    useEffect(() => {
        if (!showMsg || !activeConversation?.id) {
            return;
        }

        chatSocketRef.current.emit("thread:join", { threadId: activeConversation.id });
    }, [showMsg, activeConversation?.id, activeConversation?.isSynthetic]);

    useEffect(() => {
        if (callPreviewRef.current && localCallStream) {
            callPreviewRef.current.srcObject = localCallStream;
        }

        return () => {
            if (callPreviewRef.current) {
                callPreviewRef.current.srcObject = null;
            }
        };
    }, [localCallStream, showCall]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteCallStream) {
            const remoteVideo = remoteVideoRef.current;
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.srcObject = remoteCallStream;
            const playPromise = remoteVideo.play();
            if (playPromise?.catch) {
                playPromise.catch((err) => console.warn("Remote call video autoplay failed", err));
            }
        }
    }, [remoteCallStream, showCall]);

    useEffect(() => {
        if (!showMsg || !activeConversation?.id) {
            return;
        }

        const loadThreadMessages = async () => {
            try {
                const response = await authService.getEmployerChatMessages(activeConversation.id);
                const threadMessages = response?.data?.messages || [];
                setMessages((current) => current.map((conversation) => {
                    if (String(conversation.id) !== String(activeConversation.id)) {
                        return conversation;
                    }

                    return {
                        ...conversation,
                        ...response?.data?.thread,
                        avatar: response?.data?.thread?.candidateAvatar || conversation.avatar,
                        from: response?.data?.thread?.candidateName || conversation.from,
                        role: response?.data?.thread?.candidateTitle || conversation.role,
                        messages: threadMessages.map((message) => ({
                            from: message.senderRole === "COMPANY" ? "me" : "them",
                            text: message.text || "",
                            time: message.lastUpdated || "Just now",
                        })),
                        unread: false,
                    };
                }));
                await authService.markEmployerChatRead(activeConversation.id);
            } catch {
                // Fall back to locally generated thread content if the chat endpoint is not available yet.
            }
        };

        loadThreadMessages();
    }, [activeConversation?.id, showMsg]);

    useEffect(() => {
        if (activeConv >= messages.length) {
            setActiveConv(0);
        }
    }, [activeConv, messages.length]);

    /* GSAP: dynamically load via script tag to avoid module import side-effects */
    useEffect(() => {
        const loadScript = (src) => new Promise((resolve, reject) => {
            if (typeof window === 'undefined') return resolve();
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            document.head.appendChild(s);
        });

        (async () => {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
                const { gsap } = window;
                const { ScrollTrigger } = window || {};
                if (!gsap) return;
                try { gsap.registerPlugin && gsap.registerPlugin(ScrollTrigger); } catch { /* ignore */ }
                gsap.fromTo(".ep-cover", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .6, ease: "power3.out" });
                gsap.fromTo(".ep-card", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .55, stagger: .07, ease: "power3.out", delay: .2 });
            } catch (err) {
                // Loading animation failed — silently ignore to avoid breaking the UI
            }
        })();
    }, []);

    const sendMessage = async () => {
        if (!msgInput.trim() || !activeConversation?.id) return;
        const outgoing = msgInput.trim();
        setMsgInput("");

        setMessages((current) => current.map((conversation, index) => {
            if (index !== activeConv) return conversation;
            return {
                ...conversation,
                messages: [
                    ...(conversation.messages || []),
                    { from: "me", text: outgoing, time: "Just now" }
                ],
                preview: outgoing,
                unread: false,
            };
        }));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

        try {
            await authService.sendEmployerChatMessage(activeConversation.id, { text: outgoing });
        } catch {
            // Silently ignore or implement retry
        }
    };

    const startCall = useCallback(async (mode) => {
        if (!activeConversation?.id) {
            return;
        }

        const callType = String(mode || "AUDIO").toUpperCase() === "VIDEO" ? "VIDEO" : "AUDIO";
        setCallMode(callType);
        setCallStatus("connecting");

        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Media devices are not available in this browser");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: callType === "VIDEO",
            });

            setLocalCallStream(stream);
            localCallStreamRef.current = stream;
            setShowCall(true);

            const socket = chatSocketRef.current;
            if (socket?.connected) {
                socket.emit("call:join", { threadId: activeConversation.id, mediaType: callType }, (ack) => {
                    if (ack?.ok) {
                        setCallStatus("ringing");
                        return;
                    }
                    setCallStatus("failed");
                });
            } else {
                setCallStatus("waiting");
            }
        } catch (error) {
            setShowCall(false);
            setCallStatus("failed");
            alert(error?.message || "Unable to start the call");
        }
    }, [activeConversation?.id]);

    const acceptIncomingCall = useCallback(async () => {
        if (!activeConversation?.id) {
            return;
        }

        const callType = activeConversation?.activeCall?.mediaType || callMode || "AUDIO";
        setCallMode(callType);
        setCallStatus("connecting");

        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Media devices are not available in this browser");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: callType === "VIDEO",
            });

            setLocalCallStream(stream);
            localCallStreamRef.current = stream;
            setShowCall(true);

            const socket = chatSocketRef.current;
            if (socket?.connected) {
                socket.emit("call:answer", { threadId: activeConversation.id, answer: { accepted: true } }, (ack) => {
                    setCallStatus(ack?.ok ? "in-call" : "failed");
                });
            } else {
                setCallStatus("waiting");
            }
        } catch (error) {
            setShowCall(false);
            setCallStatus("failed");
            alert(error?.message || "Unable to accept the call");
        }
    }, [activeConversation, callMode]);

    const endCall = useCallback(() => {
        const socket = chatSocketRef.current;
        if (socket?.connected && activeConversation?.id) {
            socket.emit("call:end", { threadId: activeConversation.id });
        }

        if (localCallStream) {
            localCallStream.getTracks().forEach((track) => track.stop());
        }

        setLocalCallStream(null);
        setShowCall(false);
        setCallStatus("idle");
    }, [activeConversation?.id, localCallStream]);

    const normalizedJobs = Array.isArray(dashboard?.jobs) ? dashboard.jobs : (dashboard?.jobs?.data || []);
    const normalizedApplications = Array.isArray(dashboard?.applications) ? dashboard.applications : (dashboard?.applications?.data || []);
    const jobs = normalizedJobs;
    const filteredJobs = jobs.filter(
        (j) =>
            jobFilter === "all" ||
            (jobFilter === "urgent" && j.requiresPackageOverride) ||
            (j.department || "").toLowerCase() === jobFilter,
    );

    const NAV_TABS = ["Overview", "Jobs", "People", "Updates", "Analytics"];
    const company = {
        name: dashboard?.company?.name || employerSession.current?.companyName || "",
        tagline: dashboard?.company?.tagline || "",
        location: dashboard?.company?.location?.city
            ? [dashboard.company.location.city, dashboard.company.location.region, dashboard.company.location.zone]
                  .filter(Boolean)
                  .join(", ")
            : "",
        website: dashboard?.company?.website || "",
        about: dashboard?.company?.about || "",
        type: dashboard?.company?.type || "",
        followers: dashboard?.company?.followers || "",
        connections: dashboard?.company?.connections || "",
        plan: dashboard?.company?.packageType || "",
        logoUrl: dashboard?.company?.logoUrl || "",
        coverImageUrl: dashboard?.company?.coverImageUrl || "",
        industry: dashboard?.company?.industry || "",
        size: dashboard?.company?.companySize || "",
        founded: dashboard?.company?.foundedYear || "",
        specialties: dashboard?.company?.specialties || [],
    };
    const companyReviews = dashboard?.reviews || [];
    const reviewPageSize = 5;
    const totalReviewPages = Math.max(1, Math.ceil(companyReviews.length / reviewPageSize));

    const handleReviewShare = async (review) => {
        const reviewId = review?.id || review?.reviewId || review?._id || `review-${Date.now()}`;
        const shareToken = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const shareUrl = `${window.location.origin}/review/${reviewId}?share=${shareToken}`;

        const reviewSnapshot = {
            ...review,
            reviewId,
            companyName: dashboard?.company?.name || "MavenJobs Company",
            sharedAt: new Date().toISOString(),
            helpfulCount: Math.max(1, Number(review?.helpfulCount || review?.likes || Math.round((review?.rating || 0) * 17 + 5))),
        };

        try {
            localStorage.setItem(`maven-review-share:${reviewId}:${shareToken}`, JSON.stringify(reviewSnapshot));
            localStorage.setItem(`maven-review-share:${reviewId}`, JSON.stringify(reviewSnapshot));

            if (navigator.share) {
                await navigator.share({
                    title: "Candidate Review",
                    text: `Read this verified review from ${reviewSnapshot.candidateName || "a candidate"} for ${reviewSnapshot.companyName}.`,
                    url: shareUrl,
                });
                setShareMessage("Unique review link shared successfully.");
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                setShareMessage("Unique review link copied to clipboard.");
            } else {
                window.prompt("Copy this unique review link", shareUrl);
                setShareMessage("Review link ready to copy.");
            }
        } catch (error) {
            console.error("Share failed:", error);
            setShareMessage("Unable to share this review right now.");
        }
        window.setTimeout(() => setShareMessage(""), 2400);
    };

    const tracking = dashboard?.tracking || {};
    const overviewCards = [
        { label: "Active Jobs", val: Number(tracking.activeApprovedJobs ?? dashboard?.company?.activeJobCount ?? 0), icon: FiBriefcase, color: C.navy },
        { label: "Applications", val: Number(tracking.totalApplications ?? normalizedApplications.length ?? 0), icon: FiUsers, color: C.green },
        { label: "Shortlisted", val: Number(normalizedApplications.filter((application) => application.status === "SHORTLISTED").length || 0), icon: FiTarget, color: C.indigo },
        { label: "Offers Sent", val: Number(normalizedApplications.filter((application) => application.status === "OFFERED").length || 0), icon: FiAward, color: C.amber },
    ];
    const uniqueCandidateApplications = useMemo(() => {
        const seen = new Set();
        return normalizedApplications.filter((application) => {
            const candidateKey = String(application.candidateId || application.candidateEmail || application.candidateName || application.id || "");
            if (!candidateKey || seen.has(candidateKey)) return false;
            seen.add(candidateKey);
            return true;
        });
    }, [normalizedApplications]);

    const candidateMatchScore = (status = "") => {
        const normalized = String(status || "").toUpperCase();
        if (normalized === "OFFERED") return 98;
        if (normalized === "SHORTLISTED") return 94;
        if (normalized === "INTERVIEW") return 90;
        if (normalized === "SCREENING") return 86;
        return 80;
    };

    const topMatches = useMemo(
        () => {
            const mapped = uniqueCandidateApplications.map((application, index) => ({
                id: String(application.candidateId || application.id || index),
                name: application.candidateName || "Candidate",
                role: application.candidateCurrentTitle || application.jobTitle || "Candidate",
                match: candidateMatchScore(application.status),
                avatar: getInitialsFromName(application.candidateName),
                color: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
            }));

            const fallbackRoles = [
                "Fullstack MERN Developer",
                "Frontend React Developer",
                "Backend Node.js Developer",
                "UI Engineer",
                "Product Designer",
            ];

            while (mapped.length < 5) {
                const index = mapped.length;
                const label = `Candidate ${index + 1}`;
                mapped.push({
                    id: `recommended-${index}`,
                    name: label,
                    role: fallbackRoles[index % fallbackRoles.length],
                    match: Math.max(72, 88 - index * 3),
                    avatar: getInitialsFromName(label),
                    color: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
                    isPlaceholder: true,
                });
            }

            return mapped.slice(0, 5);
        },
        [uniqueCandidateApplications],
    );

    const people = uniqueCandidateApplications.slice(0, 5).map((application, index) => ({
        id: String(application.candidateId || application.id || index),
        name: application.candidateName || "Candidate",
        role: application.candidateCurrentTitle || application.jobTitle || "Candidate",
        location: application.candidateCity || "",
        avatar: getInitialsFromName(application.candidateName),
        color: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
    }));

    const analytics = useMemo(() => {
        const jobs = normalizedJobs;
        const applications = normalizedApplications;
        const jobSeries = buildMonthlySeries(jobs, (job) => job.createdAt || job.updatedAt);
        const applicationSeries = buildMonthlySeries(applications, (application) => application.appliedAt || application.updatedAt);
        const statusCounts = buildStatusCounts(applications);
        const sourceBreakdown = buildSourceBreakdown(applications);
        const totalApplications = Number(tracking.totalApplications ?? applications.length ?? 0);
        const activeJobs = Number(tracking.activeApprovedJobs ?? dashboard?.company?.activeJobCount ?? 0);
        const shortlisted = applications.filter((application) => application.status === "SHORTLISTED").length;
        const offersSent = applications.filter((application) => application.status === "OFFERED").length;

        return {
            monthLabels: applicationSeries.labels,
            monthlyJobs: jobSeries.values,
            monthlyApplications: applicationSeries.values,
            sourceBreakdown,
            funnelData: [
                { stage: "Applied", val: statusCounts.counts[0] || 0, color: C.navy },
                { stage: "Screening", val: statusCounts.counts[1] || 0, color: C.sky },
                { stage: "Shortlisted", val: statusCounts.counts[2] || 0, color: C.amber },
                { stage: "Interview", val: statusCounts.counts[3] || 0, color: C.indigo },
                { stage: "Offered", val: statusCounts.counts[4] || 0, color: C.green },
                { stage: "Hired", val: statusCounts.counts[5] || 0, color: C.greenD },
            ],
            kpis: [
                { label: "Active Jobs", val: activeJobs, change: `${activeJobs} live`, up: true, color: C.navy },
                { label: "Applications", val: totalApplications, change: `${totalApplications} total`, up: true, color: C.green },
                { label: "Shortlisted", val: shortlisted, change: `${shortlisted} shortlisted`, up: shortlisted > 0, color: C.amber },
                { label: "Offers Sent", val: offersSent, change: `${offersSent} offers`, up: offersSent > 0, color: C.indigo },
            ],
        };
    }, [dashboard, tracking]);

    const handleGoHome = useCallback(() => {
        if (localStorage.getItem("employerToken")) {
            window.location.assign("https://company.mavenjobs.in/");
            return;
        }
        navigate("/employer-login");
    }, [navigate]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("employerToken");
        localStorage.removeItem("employerUser");
        navigate("/employer-login");
    }, [navigate]);

    const handleMediaUpload = useCallback(async (kind, file) => {
        if (!file) {
            return;
        }

        setMediaLoading((current) => ({ ...current, [kind]: true }));
        try {
            const response = await authService.uploadEmployerMedia(kind, file);
            const nextCompany = response?.data?.company || {};
            setDashboard((current) => ({
                ...(current || {}),
                company: {
                    ...(current?.company || {}),
                    ...nextCompany,
                },
            }));

            const savedSession = (() => {
                try {
                    return JSON.parse(localStorage.getItem("employerUser") || "null");
                } catch {
                    return null;
                }
            })();

            localStorage.setItem("employerUser", JSON.stringify({
                ...(savedSession || {}),
                companyName: nextCompany.name || savedSession?.companyName || "",
                companyId: nextCompany.id || savedSession?.companyId || "",
                logoUrl: nextCompany.logoUrl || savedSession?.logoUrl || "",
                coverImageUrl: nextCompany.coverImageUrl || savedSession?.coverImageUrl || "",
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setMediaLoading((current) => ({ ...current, [kind]: false }));
        }
    }, []);

    const handleSaveAbout = useCallback(async () => {
        setSavingAbout(true);
        try {
            const response = await authService.updateEmployerProfile({
                about: aboutDraft.about,
                website: aboutDraft.website,
                companySize: aboutDraft.companySize,
                industry: aboutDraft.industry,
            });
            const nextCompany = response?.data?.company || {};
            setDashboard((current) => ({
                ...(current || {}),
                company: {
                    ...(current?.company || {}),
                    ...nextCompany,
                },
            }));
            setShowAboutEditor(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSavingAbout(false);
        }
    }, [aboutDraft]);

    /* ═══ RENDER ═══ */
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#f0f4fb;font-family:'DM Sans',system-ui,sans-serif;color:${C.s800}}
        .pd-notif-overlay { position: fixed; inset: 0; background: rgba(0, 35, 102, 0.35); backdrop-filter: blur(4px); z-index: 10000; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .pd-notif-overlay.show { opacity: 1; visibility: visible; }
        .pd-notif-sidebar { position: fixed; top: 0; right: -400px; width: 400px; height: 100vh; background: white; z-index: 10001; box-shadow: -12px 0 40px rgba(0, 35, 102, 0.1); display: flex; flex-direction: column; transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .pd-notif-sidebar.show { right: 0; }
        .pd-notif-head { padding: 22px 24px; border-bottom: 1px solid ${C.s200}; display: flex; align-items: center; justify-content: space-between; }
        .pd-notif-head h3 { font-family: ${C.fd}; font-size: 18px; font-weight: 800; color: ${C.navy}; margin:0;}
        .pd-notif-close { background: ${C.s100}; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${C.s500}; cursor: pointer; transition: all 0.2s; }
        .pd-notif-close:hover { background: #FEE2E2; color: #ef4444; transform: rotate(90deg); }
        .pd-notif-body { flex: 1; overflow-y: auto; padding: 16px 0; }
        .pd-notif-date { padding: 0 24px 10px; font-size: 11.5px; font-weight: 800; color: ${C.s400}; letter-spacing: 0.08em; text-transform: uppercase; }
        .pd-notif-item { display: flex; gap: 14px; padding: 16px 24px; border-bottom: 1px solid ${C.s100}; cursor: pointer; transition: background 0.15s; }
        .pd-notif-item:hover { background: ${C.s50}; }
        .pd-notif-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .pd-notif-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .pd-notif-title { font-size: 14px; font-weight: 600; line-height: 1.4; color: ${C.s800}; }
        .pd-notif-desc { font-size: 12.5px; color: ${C.s500}; }
        .pd-notif-cta { align-self: flex-start; margin-top: 6px; background: white; color: ${C.indigo}; border: 1.5px solid ${C.indigo}; padding: 5px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: ${C.fd}; }
        .pd-notif-cta:hover { background: ${C.indigo}; color: white; }
        .pd-notif-time { font-size: 11.5px; color: ${C.s400}; margin-top: 2px; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.s200};border-radius:8px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes popIn{from{opacity:0;transform:scale(0.9) translateY(5px)}to{opacity:1;transform:scale(1) translateY(0)}}
        input,textarea{outline:none;font-family:'DM Sans',sans-serif}
        button{outline:none;font-family:'DM Sans',sans-serif}
        .ep-nav-link{
          padding:18px 14px;font-size:13px;font-weight:600;color:${C.s500};
          cursor:pointer;border:none;background:none;border-bottom:2.5px solid transparent;
          transition:all .16s;white-space:nowrap;font-family:'DM Sans',sans-serif;
          display:inline-flex;align-items:center;gap:6px;
        }
        .ep-nav-link:hover{color:${C.navy}}
        .ep-nav-link.active{color:${C.navy};border-bottom-color:${C.navy};font-weight:700}
        .ep-job-row{
          padding:16px 20px;border-bottom:1px solid ${C.s100};
          transition:background .14s;cursor:pointer;
        }
        .ep-job-row:last-child{border-bottom:none}
        .ep-job-row:hover{background:${C.s50}}
        .ep-msg-row{
          display:flex;gap:12px;padding:14px 18px;cursor:pointer;
          border-bottom:1px solid ${C.s50};transition:background .14s;
        }
        .ep-msg-row:hover{background:${C.s50}}
        .ep-msg-row.active{background:#EEF2FF}
        .ep-update{padding:18px 20px;border-bottom:1px solid ${C.s100}}
        .ep-update:last-child{border-bottom:none}
        .ep-tag-hover:hover{border-color:${C.navy}!important;color:${C.navy}!important;background:rgba(0,35,102,.04)!important;cursor:pointer}
        .notif-pulse{position:absolute;top:7px;right:7px;width:8px;height:8px;
          border-radius:50%;background:#ef4444;border:2px solid #fff}
        .notif-pulse::after{content:'';position:absolute;inset:-2px;border-radius:50%;
          background:#ef4444;animation:ping 1.8s ease-in-out infinite}
        .ep-ana-tab{
          padding:8px 16px;border-radius:9px;font-size:12.5px;font-weight:700;
          cursor:pointer;border:1.5px solid ${C.s200};background:#fff;color:${C.s500};
          font-family:'Bricolage Grotesque',sans-serif;transition:all .16s;
        }
        .ep-ana-tab.active{background:${C.navy};color:#fff;border-color:${C.navy}}
      `}</style>

            <div style={{ minHeight: "100vh", background: "#f0f4fb" }}>

                {/* ══ TOP NAVIGATION BAR ══════════════════════════════ */}
                <header style={{
                    position: "sticky", top: 0, zIndex: 200, background: "#fff",
                    borderBottom: `1px solid ${C.s200}`,
                    boxShadow: scrolled ? "0 4px 24px rgba(0,35,102,.08)" : "none",
                    transition: "box-shadow .25s"
                }}>
                    <div style={{
                        maxWidth: 1160, margin: "0 auto", padding: "0 20px",
                        display: "flex", alignItems: "center", gap: 0, height: 58
                    }}>

                        {/* Logo */}
                        <button
                            type="button"
                            onClick={() => navigate("/employer-login")}
                            aria-label="Go to employer login"
                            style={{
                                display: "flex", alignItems: "center", marginRight: 28, flexShrink: 0,
                                border: "none", background: "transparent", padding: 0, cursor: "pointer"
                            }}
                        >
                            <img src={mavenLogo} alt="MavenJobs" style={{ height: 26, width: "auto" }} />
                        </button>

                        {/* Nav links */}
                        <nav style={{ display: "flex", alignItems: "stretch", flex: 1, paddingLeft: 12, height: 58, overflowX: "auto" }}>
                            {[
                                { id: "home", icon: FiHome, label: "Home" },
                                { id: "jobs", icon: FiBriefcase, label: "Post a Job" },
                                { id: "report", icon: FiBarChart2, label: "Report" },
                            ].map(n => (
                                <button key={n.id} className={`ep-nav-link${topNavTab === n.id ? " active" : ""}`}
                                    onClick={() => {
                                        if (n.id === "home") {
                                            setTopNavTab("home");
                                            handleGoHome();
                                            return;
                                        }
                                        setTopNavTab(n.id);
                                        if (n.id === "jobs") {
                                            navigate("/post-job");
                                            return;
                                        }
                                        if (n.id === "report") {
                                            setShowHelpDesk(true);
                                            return;
                                        }
                                    }} style={{ flexDirection: "column", gap: 2, fontSize: 11, padding: "8px 14px" }}>
                                    <n.icon size={17} />
                                    {n.label}
                                </button>
                            ))}
                            {/* ════════════════════════════════════════════════════
                                MODAL: HELP DESK CENTER
                            ════════════════════════════════════════════════════ */}
                            <Modal open={showHelpDesk} onClose={() => setShowHelpDesk(false)} title="Help Desk Center" width={600}>
                                <HelpDeskChatForm />
                            </Modal>
                        </nav>

                        {/* Right action buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            {/* Search */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8, background: C.s50,
                                border: `1.5px solid ${C.s200}`, borderRadius: 10, padding: "7px 13px", width: 200,
                                marginRight: 4
                            }}>
                                <FiSearch size={14} color={C.s400} />
                                <input style={{
                                    background: "none", border: "none", outline: "none", fontSize: 13, color: C.s900,
                                    width: "100%", fontFamily: C.dm
                                }} placeholder="Search…" />
                            </div>

                            {/* Messages */}
                            <button onClick={() => setShowMsg(true)}
                                style={{
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                                    padding: "6px 12px", borderRadius: 10, background: "transparent",
                                    border: "none", cursor: "pointer", color: C.s500, position: "relative",
                                    transition: "all .16s", fontSize: 11, fontWeight: 600
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.s50; e.currentTarget.style.color = C.navy; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.s500; }}>
                                <div style={{ position: "relative" }}>
                                    <FiMessageSquare size={17} />
                                    <div className="notif-pulse" />
                                </div>
                                Messages
                            </button>

                        <div style={{ width: 1, height: 30, background: C.s200 }} />

                        {/* Bell */}
                        <button style={{
                            width: 36, height: 36, borderRadius: 9, background: C.s50,
                            border: `1px solid ${C.s200}`, display: "flex", alignItems: "center",
                            justifyContent: "center", cursor: "pointer", color: C.s500,
                            position: "relative", transition: "all .16s"
                        }}
                            onClick={() => setShowNotifications(true)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,35,102,.2)"; e.currentTarget.style.color = C.navy; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.s200; e.currentTarget.style.color = C.s500; }}>
                            <FiBell size={16} />
                            <div className="notif-pulse" />
                        </button>

                        {/* Logout */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 12px", borderRadius: 10,
                                border: `1px solid ${C.s200}`, background: C.s50,
                                color: C.s700, cursor: "pointer", fontSize: 12,
                                fontWeight: 700, fontFamily: C.dm,
                                transition: "all .16s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.borderColor = "#fecdd3"; e.currentTarget.style.color = "#b91c1c"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.s50; e.currentTarget.style.borderColor = C.s200; e.currentTarget.style.color = C.s700; }}
                        >
                            <FiLogOut size={14} />
                            Logout
                        </button>

                        {/* Avatar */}
                        <Avatar initials="HR" color={`linear-gradient(135deg,${C.navy},${C.green})`}
                            size={34} radius={9} fontSize={12} />
                    </div>
            </div>
        </header>

            {/* ══ PAGE BODY ════════════════════════════════════════ */}
            <main style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 20px 60px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* ── LEFT COLUMN ────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ─ Profile Header Card ─ */}
            <Card className="ep-card ep-cover">
                {/* Cover */}
                <div style={{
                    height: 140,
                    background: company.coverImageUrl
                        ? `url("${company.coverImageUrl}") center/cover no-repeat`
                        : "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #020617 100%)",
                    position: "relative", overflow: "hidden"
                }}>
                    <div style={{
                        position: "absolute", inset: 0, opacity: .4,
                        background: "linear-gradient(to top, rgba(0,35,102,0.8), transparent)"
                    }} />
                    {/* Edit cover */}
                    <button style={{
                        position: "absolute", top: 12, right: 12, width: 32, height: 32,
                        borderRadius: 8, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#fff", backdropFilter: "blur(8px)"
                    }} onClick={() => coverInputRef.current?.click()} disabled={mediaLoading.cover}>
                        <FiEdit2 size={13} />
                    </button>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleMediaUpload("cover", file);
                            event.target.value = "";
                        }}
                    />
                </div>

                {/* Profile info */}
                <div style={{ padding: "0 24px 20px", position: "relative" }}>
                    {/* Logo bubble */}
                    <div style={{
                        width: 88, height: 88, borderRadius: 18,
                        background: company.logoUrl
                            ? `url("${company.logoUrl}") center/cover no-repeat`
                            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                        border: "4px solid #fff", display: "flex", alignItems: "center",
                        justifyContent: "center", marginTop: -44, marginBottom: 12,
                        boxShadow: "0 4px 16px rgba(0,35,102,.2)"
                    }}>
                        {!company.logoUrl && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: C.s400 }}>
                                <FiUser size={18} />
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Empty profile</span>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={mediaLoading.logo}
                        style={{
                            position: "absolute",
                            top: -28,
                            left: 94,
                            border: `1px solid ${C.s200}`,
                            borderRadius: 999,
                            background: "#fff",
                            color: C.s600,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "6px 10px",
                            cursor: "pointer",
                            boxShadow: "0 6px 16px rgba(15,23,42,.08)"
                        }}
                    >
                        {mediaLoading.logo ? "Uploading..." : "Change logo"}
                    </button>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleMediaUpload("logo", file);
                            event.target.value = "";
                        }}
                    />

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                            <h1 style={{
                                fontFamily: C.fd, fontSize: 22, fontWeight: 800,
                                color: C.s900, letterSpacing: "-0.01em", margin: "0 0 4px"
                            }}>
                                {company.name}
                            </h1>
                            <p style={{ fontSize: 14, color: C.s600, fontWeight: 500, margin: "0 0 8px" }}>{company.tagline}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.s500 }}>
                                    <FiMapPin size={12} />{company.location}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.sky }}>
                                    <FiGlobe size={12} />{company.website}
                                </span>
                                <span style={{ fontSize: 12.5, color: C.s500, fontWeight: 600 }}>
                                    {company.followers} followers · {company.connections}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn variant="primary" onClick={() => navigate("/post-job")}><FiPlus size={13} /> Post a Job</Btn>
                            <Btn variant="ghost"><FiShare2 size={13} /> Share</Btn>
                            <Btn variant="ghost" style={{ padding: "8px 10px" }}><FiMoreVertical size={14} /></Btn>
                        </div>
                    </div>

                    {/* Quick chips */}
                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        {[
                            { icon: FiBriefcase, label: `${company.industry}`, color: C.navy },
                            { icon: FiUsers, label: company.size, color: C.indigo },
                            { icon: FiCalendar, label: `Founded ${company.founded}`, color: C.green },
                            { icon: FiAward, label: company.plan, color: C.amber },
                        ].map((chip, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "5px 12px", borderRadius: 100, background: chip.color + "10",
                                border: `1px solid ${chip.color}22`, fontSize: 12, fontWeight: 700, color: chip.color
                            }}>
                                <chip.icon size={11} />{chip.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inner nav tabs */}
                <div style={{
                    borderTop: `1px solid ${C.s100}`, display: "flex",
                    paddingLeft: 16, overflowX: "auto"
                }}>
                    {NAV_TABS.map(t => (
                        <button key={t} className={`ep-nav-link${activeTab === t ? " active" : ""}`}
                            onClick={() => setActiveTab(t)}
                            style={{ textTransform: "none" }}>
                            {t}
                        </button>
                    ))}
                </div>
            </Card>

            {/* ─ About ─ */}
            {activeTab === "Overview" && (
            <Card className="ep-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontFamily: C.fd, fontSize: 16, fontWeight: 800, color: C.s900 }}>About</div>
                    <button
                        onClick={() => setShowAboutEditor(true)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.s400, padding: 4, borderRadius: 7, display: "flex" }}
                    >
                        <FiEdit2 size={15} />
                    </button>
                </div>
                <div style={{ fontSize: 14, color: C.s700, lineHeight: 1.75, whiteSpace: "pre-line" }}>{company.about}</div>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                        { icon: FiGlobe, label: "Website", val: company.website, color: C.sky },
                        { icon: FiUsers, label: "Company size", val: company.size, color: C.indigo },
                        { icon: FiBriefcase, label: "Industry", val: company.industry, color: C.navy },
                        { icon: FiLayers, label: "Type", val: company.type, color: C.green },
                    ].map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: 8, background: r.color + "12",
                                display: "flex", alignItems: "center", justifyContent: "center", color: r.color, flexShrink: 0
                            }}>
                                <r.icon size={13} />
                            </div>
                            <span style={{ fontSize: 12.5, color: C.s500, fontWeight: 600, width: 100, flexShrink: 0 }}>{r.label}</span>
                            <span style={{ fontSize: 13, color: C.s700, fontWeight: 600 }}>{r.val}</span>
                        </div>
                    ))}
                </div>
                {/* Specialties */}
                <div style={{ marginTop: 16 }}>
                    <div style={{
                        fontSize: 12, fontWeight: 800, color: C.s400, letterSpacing: ".1em",
                        textTransform: "uppercase", marginBottom: 10
                    }}>Specialties</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {company.specialties.map((s, i) => (
                            <Tag key={i} color={[C.navy, C.green, C.indigo, C.amber, C.sky, C.purple, C.green, C.navy][i % 8]}>{s}</Tag>
                        ))}
                    </div>
                </div>
            </Card>

            )}

            {activeTab === "People" && (
                <Card className="ep-card" style={{ padding: "18px" }}>
                    <div style={{ fontFamily: C.fd, fontSize: 16, fontWeight: 800, color: C.s900, marginBottom: 14 }}>People</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                        {people.length > 0 ? (
                            people.map((person) => (
                                <div key={person.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, background: C.s50, border: `1px solid ${C.s100}` }}>
                                    <Avatar initials={person.avatar} color={person.color} size={42} radius={12} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: C.fd, fontSize: 13.5, fontWeight: 800, color: C.s900 }}>{person.name}</div>
                                        <div style={{ fontSize: 12, color: C.s500 }}>{person.role}{person.location ? ` · ${person.location}` : ""}</div>
                                    </div>
                                    <button onClick={() => setShowMsg(true)} style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "#EEF2FF", color: C.navy, cursor: "pointer", flexShrink: 0 }}>
                                        <FiMail size={13} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: C.s500, fontSize: 13 }}>No candidate conversations are available yet. Once applications arrive, they’ll appear here.</div>
                        )}
                    </div>
                </Card>
            )}

            {activeTab === "Analytics" && (
                <Card className="ep-card" style={{ padding: "18px" }}>
                    <div style={{ fontFamily: C.fd, fontSize: 16, fontWeight: 800, color: C.s900, marginBottom: 14 }}>Analytics Snapshot</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
                        {analytics.kpis.map((item, index) => (
                            <div key={index} style={{ padding: 14, borderRadius: 12, background: item.color + "08", border: `1px solid ${item.color}18` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: item.color, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{item.label}</div>
                                <div style={{ fontFamily: C.fd, fontSize: 24, fontWeight: 800, color: C.s900 }}>{formatCompactNumber(item.val)}</div>
                            </div>
                        ))}
                    </div>
                    <Btn variant="ghost" onClick={() => setShowAna(true)} style={{ width: "100%", justifyContent: "center" }}>
                        <FiBarChart2 size={13} /> Open analytics dashboard
                    </Btn>
                </Card>
            )}

            {activeTab === "Jobs" && (
            <Card className="ep-card">
                <SectionHead title="Open Roles"
                    action={
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                                {["all", "urgent", "design", "engineering"].map(f => (
                                    <button key={f} onClick={() => setJobFilter(f)}
                                        style={{
                                            padding: "5px 12px", borderRadius: 100, fontSize: 11.5, fontWeight: 700,
                                            cursor: "pointer", border: `1.5px solid ${jobFilter === f ? C.navy : C.s200}`,
                                            background: jobFilter === f ? C.navy : "#fff",
                                            color: jobFilter === f ? "#fff" : C.s500,
                                            fontFamily: C.fd, transition: "all .14s"
                                        }}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <Btn variant="primary" onClick={() => navigate("/post-job")} style={{ padding: "7px 13px", fontSize: 12 }}>
                                <FiPlus size={12} /> Post
                            </Btn>
                        </div>
                    } />
                {filteredJobs.map((j, i) => (
                    <div key={j.id} className="ep-job-row">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 10,
                                        background: [C.navy, C.green, C.indigo, C.amber, C.sky][i % 5] + "14",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: [C.navy, C.green, C.indigo, C.amber, C.sky][i % 5], flexShrink: 0
                                    }}>
                                        <FiBriefcase size={15} />
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: C.fd, fontSize: 14.5, fontWeight: 800, color: C.s900 }}>{j.title}</div>
                                        <div style={{ fontSize: 12, color: C.s500, marginTop: 1 }}>
                                            {j.dept} · {j.loc} · {j.type}
                                        </div>
                                    </div>
                                    {j.urgent && (
                                        <span style={{
                                            display: "inline-flex", alignItems: "center", gap: 4,
                                            height: 20, padding: "0 8px", borderRadius: 100,
                                            background: "#fef2f2", fontSize: 10, fontWeight: 800,
                                            color: "#dc2626", fontFamily: C.fd
                                        }}>
                                            <FiAlertCircle size={9} /> Urgent
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingLeft: 42 }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.s500 }}><FiCalendar size={12} /> Posted {j.posted}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.s500 }}><FiUsers size={12} /> {j.apps} applicants</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.green, fontWeight: 700 }}><FiDollarSign size={12} /> {j.salary}</span>
                                </div>
                            </div>
                             <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                <Btn variant="ghost" onClick={() => { setSelectedJob(j); setShowViewJob(true); }} style={{ padding: "6px 12px", fontSize: 12 }}>
                                    <FiEye size={12} /> View
                                </Btn>
                                <Btn variant="ghost" onClick={() => { setSelectedJob(j); setShowEditJob(true); }} style={{ padding: "6px 10px", fontSize: 12 }}>
                                    <FiEdit2 size={12} />
                                </Btn>
                            </div>
                        </div>
                    </div>
                ))}
                <div style={{
                    padding: "12px 20px", borderTop: `1px solid ${C.s100}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <span style={{ fontSize: 12, color: C.s400, fontWeight: 600 }}>Showing {filteredJobs.length} of {jobs.length} open roles</span>
                    <Btn variant="ghost" onClick={() => navigate("/jobs")} style={{ fontSize: 12, padding: "6px 13px" }}>View all jobs <FiChevronRight size={12} /></Btn>
                </div>
            </Card>
            )}

            {/* ─ Reviews ─ */}
            {activeTab === "Updates" && (
            <Card className="ep-card">
                <SectionHead title="Reviews by Candidates" />
                {companyReviews.slice(reviewPage * reviewPageSize, (reviewPage + 1) * reviewPageSize).map((u, i) => {
                    const isLiked = likedReviews[u.id];
                    const reviewerName = u.candidateName || u.name || u.userName || "Verified Candidate";
                    const reviewerTitle = u.candidateTitle || u.title || u.role || "Candidate";
                    return (
                        <div key={u.id} className="ep-update" style={{ borderRadius: 14, background: "#fff", border: `1px solid ${C.s100}`, boxShadow: "0 14px 26px rgba(15,23,42,0.04)" }}>
                            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
                                <Avatar initials={reviewerName.slice(0, 2).toUpperCase()} color={[C.navy, C.green, C.indigo, C.amber, C.purple][i % 5]} size={42} radius={12} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: C.fd, fontSize: 13.8, fontWeight: 800, color: C.s900 }}>{reviewerName}</div>
                                    <div style={{ fontSize: 12, color: C.s400 }}>{reviewerTitle}</div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 999, padding: "6px 10px" }}>{(u.rating || 0)}/5 rating</span>
                            </div>
                            <p style={{ fontSize: 14, color: C.s700, lineHeight: 1.7, marginBottom: 14 }}>"{u.review}"</p>
                            {/* Engagement bar */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                paddingTop: 12, borderTop: `1px solid ${C.s100}`
                            }}>
                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    {[{icon: FiSmile, color: C.amber}, {icon: FiHeart, color: C.red}, {icon: FiAward, color: C.indigo}, {icon: FiStar, color: C.purple}].map((e, ei) => (
                                        <span key={ei} style={{ fontSize: 13, color: e.color, display: "flex", alignItems: "center" }}><e.icon size={13} /></span>
                                    ))}
                                    <span style={{ fontSize: 12.5, color: C.s400, marginLeft: 6 }}>{Math.round((u.rating || 0) * 17) + (isLiked ? 1 : 0)} helpful</span>
                                </div>
                                <div style={{ display: "flex", gap: 8, position: "relative" }}>
                                    {/* Reaction Picker Popover */}
                                    {showReactionFor === u.id && (
                                        <div className="reaction-picker" style={{
                                            position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
                                            background: "#fff", borderRadius: 100, padding: "6px 12px",
                                            boxShadow: "0 10px 25px rgba(0,0,0,.15)", display: "flex", gap: 10,
                                            border: `1px solid ${C.s100}`, zIndex: 10, animation: "popIn .2s ease"
                                        }}>
                                            {[
                                                { id: 'helpful', icon: FiSmile, color: C.amber, label: "Helpful" },
                                                { id: 'love', icon: FiHeart, color: C.red, label: "Love" },
                                                { id: 'great', icon: FiAward, color: C.indigo, label: "Great" },
                                                { id: 'insight', icon: FiStar, color: C.purple, label: "Insight" }
                                            ].map((re) => (
                                                <button key={re.id} 
                                                    onClick={() => {
                                                        setLikedReviews(prev => ({ ...prev, [u.id]: re.id }));
                                                        setShowReactionFor(null);
                                                    }}
                                                    title={re.label}
                                                    style={{
                                                        background: "none", border: "none", cursor: "pointer", 
                                                        padding: 6, borderRadius: "50%", display: "flex",
                                                        transition: "all .15s", color: re.color
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = C.s50; e.currentTarget.style.transform = "scale(1.2)"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "scale(1)"; }}>
                                                    <re.icon size={18} />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <button onClick={() => setShowReactionFor(showReactionFor === u.id ? null : u.id)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                                            borderRadius: 9, background: isLiked ? "#EEF2FF" : "transparent",
                                            border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                                            color: isLiked ? C.navy : C.s500, transition: "all .15s"
                                        }}>
                                        {(() => {
                                            const active = [{ id: 'helpful', icon: FiSmile, color: C.amber }, { id: 'love', icon: FiHeart, color: C.red }, { id: 'great', icon: FiAward, color: C.indigo }, { id: 'insight', icon: FiStar, color: C.purple }].find(x => x.id === isLiked);
                                            return active ? <active.icon size={13} color={active.color} /> : <FiSmile size={13} />;
                                        })()}
                                        {isLiked ? (isLiked.charAt(0).toUpperCase() + isLiked.slice(1)) : "Helpful"}
                                    </button>
                                    <button
                                        onClick={() => handleReviewShare(u)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                                            borderRadius: 9, background: "transparent", border: "none",
                                            cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.s500
                                        }}
                                    >
                                        <FiShare2 size={13} /> Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {/* Pagination & Footer */}
                <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.s100}`, background: C.s50 + "50" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 12.5, color: C.s500, fontWeight: 600 }}>
                            Showing page {reviewPage + 1} of {totalReviewPages} · {companyReviews.length} total reviews
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Btn variant="ghost" onClick={() => setReviewPage(p => Math.max(0, p - 1))} disabled={reviewPage === 0} style={{ padding: "5px 10px", opacity: reviewPage === 0 ? 0.5 : 1 }}>
                                <FiChevronDown style={{ transform: "rotate(90deg)" }} size={14} />
                            </Btn>
                            <Btn variant="ghost" onClick={() => setReviewPage(p => Math.min(totalReviewPages - 1, p + 1))} disabled={reviewPage >= totalReviewPages - 1} style={{ padding: "5px 10px", opacity: reviewPage >= totalReviewPages - 1 ? 0.5 : 1 }}>
                                <FiChevronDown style={{ transform: "rotate(-90deg)" }} size={14} />
                            </Btn>
                        </div>
                    </div>
                    <div style={{ 
                        padding: "10px 14px", borderRadius: 10, background: "#fff", border: `1px solid ${C.s200}`,
                        display: "flex", alignItems: "center", gap: 8
                    }}>
                        <FiInfo size={14} color={C.navy} />
                        <div style={{ fontSize: 12, color: C.s600, fontWeight: 500 }}>
                            For more queries regarding comments or reviews, please contact us at <a href="mailto:rohan@mavenjobs.in" style={{ color: C.navy, fontWeight: 700, textDecoration: "none" }}>rohan@mavenjobs.in</a>
                        </div>
                    </div>
                </div>
                {shareMessage && (
                    <div style={{ margin: "0 20px 16px", padding: "10px 12px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 12.5, fontWeight: 700 }}>
                        {shareMessage}
                    </div>
                )}
            </Card>
            )}
        </div>

        {/* ── RIGHT SIDEBAR ───────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ─ Quick Stats ─ */}
            <Card className="ep-card" style={{ padding: "18px 18px 14px" }}>
                <div style={{ fontFamily: C.fd, fontSize: 15, fontWeight: 800, color: C.s900, marginBottom: 14 }}>Hiring Overview</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {overviewCards.map((s, i) => (
                        <div key={i} style={{
                            padding: "12px 14px", borderRadius: 12, background: s.color + "08",
                            border: `1px solid ${s.color}18`
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                <s.icon size={13} color={s.color} />
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: C.fd }}>{s.label}</span>
                            </div>
                            <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.s900, lineHeight: 1 }}>{formatCompactNumber(s.val)}</div>
                        </div>
                    ))}
                </div>
                <Btn variant="ghost" onClick={() => setShowAna(true)} style={{ width: "100%", justifyContent: "center", fontSize: 12.5 }}>
                    <FiBarChart2 size={13} /> View Full Analytics
                </Btn>
            </Card>

            {/* ─ Suggested Candidates ─ */}
            <Card className="ep-card" style={{ padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontFamily: C.fd, fontSize: 15, fontWeight: 800, color: C.s900 }}>Top Matches</div>
                    <span style={{
                        fontSize: 11, color: C.green, fontWeight: 700, background: "#ecfdf5",
                        padding: "3px 9px", borderRadius: 100, fontFamily: C.fd
                    }}>AI-Ranked</span>
                </div>
                {(topMatches.length ? topMatches : []).slice(0, 5).map((c, i) => (
                    <div key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                        borderBottom: i < (Math.min(topMatches.length, 5) - 1) ? `1px solid ${C.s100}` : "none"
                    }}>
                        <Avatar initials={c.avatar} color={c.color} size={44} radius={12} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                    <div style={{ fontSize: 12, color: C.s500, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{c.match}%</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                <div style={{ flex: 1, height: 6, borderRadius: 999, background: C.s100 }}>
                                    <div style={{ height: "100%", borderRadius: 999, background: C.green, width: `${c.match}%` }} />
                                </div>
                                <div style={{ fontSize: 12, color: C.s500 }}>{/* optional metadata */}</div>
                            </div>
                        </div>
                        <button onClick={() => setShowMsg(true)}
                            aria-label={`Message ${c.name}`}
                            title={`Message ${c.name}`}
                            style={{
                                width: 36, height: 36, borderRadius: 10, background: "#EEF2FF",
                                border: "none", display: "flex", alignItems: "center",
                                justifyContent: "center", cursor: "pointer", color: C.navy, flexShrink: 0
                            }}>
                            <FiMail size={15} />
                        </button>
                    </div>
                ))}
                {topMatches.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: "center" }}>
                        <button onClick={() => navigate('/resume-database')} style={{
                            flex: "0 0 auto", padding: '8px 12px', borderRadius: 10, border: '1px solid #D8E1EF',
                            background: '#fff', color: C.navy, fontWeight: 800, cursor: 'pointer',
                            fontSize: 12.5, lineHeight: 1.2, fontFamily: C.fd
                        }}>
                            View all candidates
                        </button>
                        <button onClick={() => setShowMsg(true)} style={{
                            flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', background: C.green, color: '#fff',
                            fontWeight: 800, cursor: 'pointer', fontSize: 12.5, lineHeight: 1.2, fontFamily: C.fd,
                            boxShadow: "0 8px 18px rgba(16,185,129,.22)"
                        }}>
                            Message top match
                        </button>
                    </div>
                )}
            </Card>

            {/* ─ Premium X Promo ─ */}
            <Card className="ep-card" style={{ padding: "18px", background: `linear-gradient(135deg,#fffbeb,#fef3c7)`, border: `1px solid #fde68a` }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, background: C.amber,
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <FiZap size={17} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: "#78350f" }}>Premium X</div>
                        <div style={{ fontSize: 11.5, color: "#92400e" }}>Supercharge your hiring</div>
                    </div>
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {["Unlimited candidate outreach", "Priority job placement", "AI candidate scoring", "Advanced analytics"].map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#78350f", fontWeight: 600 }}>
                            <FiCheckCircle size={13} color={C.amber} />{f}
                        </li>
                    ))}
                </ul>
                <Btn variant="ghost" onClick={() => setShowPro(true)}
                    style={{
                        width: "100%", justifyContent: "center", background: C.amber,
                        color: "#fff", border: "none", fontSize: 13, padding: "10px"
                    }}>
                    <FiZap size={13} /> Upgrade to Premium X
                </Btn>
            </Card>

            {/* ─ Company Info snippet ─ */}
            <Card className="ep-card" style={{ padding: "18px" }}>
                <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900, marginBottom: 12 }}>Company Information</div>
                {[
                    { label: "Founded", val: company.founded || "N/A" },
                    { label: "Size", val: company.size || "N/A" },
                    { label: "Type", val: company.type || "N/A" },
                    { label: "Industry", val: company.industry || "N/A" },
                ].map((r, i) => (
                    <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "8px 0", borderBottom: i < 3 ? `1px solid ${C.s100}` : "none"
                    }}>
                        <span style={{ fontSize: 12.5, color: C.s500, fontWeight: 600 }}>{r.label}</span>
                        <span style={{ fontSize: 12.5, color: C.s700, fontWeight: 700, textAlign: "right", maxWidth: "60%" }}>{r.val}</span>
                    </div>
                ))}
            </Card>

        </div>{/* end right sidebar */}
    </div>
        </main >

        <Modal open={showAboutEditor} onClose={() => setShowAboutEditor(false)} title="Edit About Section" width={640}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>About</label>
                    <textarea
                        value={aboutDraft.about}
                        onChange={(e) => setAboutDraft((current) => ({ ...current, about: e.target.value }))}
                        rows={5}
                        style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: `1.5px solid ${C.s200}`,
                            fontSize: 13.5,
                            color: C.s900,
                            fontFamily: C.dm,
                            resize: "vertical",
                        }}
                    />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Website</label>
                        <input
                            value={aboutDraft.website}
                            onChange={(e) => setAboutDraft((current) => ({ ...current, website: e.target.value }))}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}` }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Company Size</label>
                        <input
                            value={aboutDraft.companySize}
                            onChange={(e) => setAboutDraft((current) => ({ ...current, companySize: e.target.value }))}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}` }}
                        />
                    </div>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Industry</label>
                    <input
                        value={aboutDraft.industry}
                        onChange={(e) => setAboutDraft((current) => ({ ...current, industry: e.target.value }))}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}` }}
                    />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <Btn variant="ghost" onClick={() => setShowAboutEditor(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleSaveAbout} disabled={savingAbout}>
                        {savingAbout ? "Saving..." : "Save Changes"}
                    </Btn>
                </div>
            </div>
        </Modal>

{/* ════════════════════════════════════════════════════
            MODAL: MESSAGES
        ════════════════════════════════════════════════════ */}
    <Modal open={showMsg} onClose={() => setShowMsg(false)} title="Messages" width={780} noPad>
        <div style={{ display: "flex", height: 520 }}>
            {/* Conv list */}
            <div style={{ width: 260, borderRight: `1px solid ${C.s100}`, overflowY: "auto", flexShrink: 0 }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.s100}` }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, background: C.s50,
                        border: `1px solid ${C.s200}`, borderRadius: 9, padding: "7px 12px"
                    }}>
                        <FiSearch size={13} color={C.s400} />
                        <input style={{ background: "none", border: "none", fontSize: 12.5, color: C.s900, width: "100%", fontFamily: C.dm }} placeholder="Search messages…" />
                    </div>
                </div>
                {messages.map((conv, i) => (
                    <div key={conv.id} className={`ep-msg-row${i === activeConv ? " active" : ""}`}
                        onClick={() => {
                            setActiveConv(i);
                            setMessages((current) => current.map((conversation, index) => (
                                index === i ? { ...conversation, unread: false } : conversation
                            )));
                            if (chatSocketRef.current?.connected) {
                                chatSocketRef.current.emit("thread:join", { threadId: conv.id });
                            }
                            authService.markEmployerChatRead(conv.id).catch(() => {});
                        }}>
                        <div style={{ position: "relative" }}>
                            <Avatar initials={conv.avatar} color={conv.color} size={40} radius={12} />
                            {conv.unread && (
                                <div style={{
                                    position: "absolute", top: 0, right: 0, width: 10, height: 10,
                                    borderRadius: "50%", background: C.navy, border: "2px solid #fff"
                                }} />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                <span style={{ fontFamily: C.fd, fontSize: 13, fontWeight: 800, color: C.s900 }}>{conv.from}</span>
                                <span style={{ fontSize: 11, color: C.s400 }}>{conv.time}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: C.s500, marginBottom: 2 }}>{conv.role}</div>
                            <div style={{
                                fontSize: 12, color: conv.unread ? C.s700 : C.s400, fontWeight: conv.unread ? 600 : 400,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                            }}>{conv.preview}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat window */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Chat header */}
                <div style={{
                    padding: "14px 18px", borderBottom: `1px solid ${C.s100}`,
                    display: "flex", alignItems: "center", gap: 12
                }}>
                    <Avatar initials={activeConversation?.avatar || "C"} color={activeConversation?.color || C.navy} size={38} radius={11} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900 }}>{activeConversation?.from || "Conversation"}</div>
                        <div style={{ fontSize: 12, color: C.s400 }}>{activeConversation?.role || "Candidate"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startCall("AUDIO")} style={{ width: 32, height: 32, borderRadius: 8, background: C.s50, border: `1px solid ${C.s200}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.s500 }}><FiPhone size={13} /></button>
                        <button onClick={() => startCall("VIDEO")} style={{ width: 32, height: 32, borderRadius: 8, background: C.s50, border: `1px solid ${C.s200}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.s500 }}><FiVideo size={13} /></button>
                        <button style={{ width: 32, height: 32, borderRadius: 8, background: C.s50, border: `1px solid ${C.s200}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.s500 }}><FiMoreVertical size={13} /></button>
                    </div>
                </div>

                {activeConversation?.activeCall?.state === "RINGING" && activeConversation?.activeCall?.initiatedBy === "CANDIDATE" && (
                    <div style={{
                        margin: "12px 16px 0",
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "#fff",
                        border: `1px solid ${C.s200}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: C.fd, fontWeight: 800, color: C.s900, fontSize: 13.5 }}>
                                {activeConversation?.from || "Candidate"} is calling
                            </div>
                            <div style={{ color: C.s500, fontSize: 12 }}>
                                {activeConversation?.activeCall?.mediaType === "VIDEO" ? "Video call" : "Audio call"}
                            </div>
                        </div>
                        <Btn variant="green" onClick={acceptIncomingCall}>Accept</Btn>
                        <Btn variant="danger" onClick={endCall}>Reject</Btn>
                    </div>
                )}

                {/* Messages area */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, background: C.s50 }}>
                    {(activeConversation?.messages || []).length === 0 ? (
                        <div style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                            color: C.s400, fontSize: 13.5, fontWeight: 600
                        }}>
                            No messages yet. Start the conversation here.
                        </div>
                    ) : (
                        (activeConversation?.messages || []).map((m, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                                <div style={{
                                    maxWidth: "72%", padding: "10px 14px", borderRadius: 14,
                                    background: m.from === "me" ? C.navy : "#fff",
                                    border: m.from === "me" ? "none" : `1px solid ${C.s200}`,
                                    borderBottomRightRadius: m.from === "me" ? 4 : 14,
                                    borderBottomLeftRadius: m.from === "me" ? 14 : 4
                                }}>
                                    <div style={{ fontSize: 13.5, color: m.from === "me" ? "#fff" : C.s800, lineHeight: 1.55 }}>{m.text}</div>
                                    <div style={{ fontSize: 10.5, color: m.from === "me" ? "rgba(255,255,255,.55)" : C.s400, marginTop: 4, textAlign: "right" }}>{m.time}</div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.s100}`, background: "#fff" }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, background: C.s50,
                        border: `1.5px solid ${C.s200}`, borderRadius: 12, padding: "8px 14px"
                    }}>
                        <input
                            style={{
                                flex: 1, background: "none", border: "none", outline: "none", fontSize: 13.5,
                                color: C.s900, fontFamily: C.dm
                            }}
                            placeholder="Write a message…"
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                            {[FiPaperclip, FiSmile].map((Icon, i) => (
                                <button key={i} style={{
                                    width: 28, height: 28, borderRadius: 7, background: "transparent",
                                    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", color: C.s400
                                }}>
                                    <Icon size={14} />
                                </button>
                            ))}
                            <button onClick={sendMessage}
                                style={{
                                    width: 32, height: 32, borderRadius: 9, background: C.navy, border: "none",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", color: "#fff"
                                }}>
                                <FiSend size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </Modal>
        <Modal open={showCall} onClose={endCall} title={`${callMode === "VIDEO" ? "Video" : "Audio"} Call`} width={560} noPad>
            <div style={{ padding: 20, display: "grid", gap: 16 }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderRadius: 14, background: C.s50, border: `1px solid ${C.s200}`
                }}>
                    <div>
                        <div style={{ fontFamily: C.fd, fontWeight: 800, color: C.s900, marginBottom: 4 }}>
                            {activeConversation?.from || "Candidate"}
                        </div>
                        <div style={{ fontSize: 12.5, color: C.s500 }}>
                            {callStatus === "ringing" ? "Waiting for the candidate to join" : callStatus === "connecting" ? "Connecting secure call session" : "Call ready"}
                        </div>
                    </div>
                    <Tag color={callMode === "VIDEO" ? C.indigo : C.green}>{callMode}</Tag>
                </div>

                <div style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#0f172a",
                    minHeight: 220,
                    position: "relative",
                    border: `1px solid ${C.s200}`,
                }}>
                    {callMode === "VIDEO" ? (
                        <div style={{ position: "relative", width: "100%", height: 320, background: "#111827" }}>
                            {remoteCallStream && (
                                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                            <video ref={callPreviewRef} autoPlay muted playsInline style={{ position: "absolute", bottom: 16, right: 16, width: 100, height: 140, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(255,255,255,0.2)", background: "#000", zIndex: 10, display: localCallStream ? "block" : "none" }} />
                            {!remoteCallStream && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexDirection: "column", gap: 10 }}>
                                    <Avatar initials={activeConversation?.avatar || "C"} color={activeConversation?.color || C.navy} size={50} radius={16} fontSize={16} />
                                    Connecting secure video stream...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            minHeight: 220,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            flexDirection: "column",
                            gap: 10,
                            padding: 20,
                            textAlign: "center",
                        }}>
                            <Avatar initials={activeConversation?.avatar || "C"} color={activeConversation?.color || C.navy} size={64} radius={20} fontSize={20} />
                            <div style={{ fontFamily: C.fd, fontSize: 18, fontWeight: 800 }}>{activeConversation?.from || "Candidate"}</div>
                            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 13 }}>
                                Secure audio call in progress
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12.5, color: C.s500 }}>
                        The call is negotiated through Socket.IO signaling and browser media permissions.
                    </div>
                    <Btn variant="danger" onClick={endCall}>
                        <FiPhone size={13} /> End Call
                    </Btn>
                </div>
            </div>
        </Modal>

{/* ════════════════════════════════════════════════════
            MODAL: ANALYTICS
        ════════════════════════════════════════════════════ */}
    <Modal open={showAna} onClose={() => setShowAna(false)} title="Analytics Dashboard" width={860}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {
            ["overview", "traffic", "pipeline", "sources"].map(t => (
                <button key={t} className={`ep-ana-tab${anaTab === t ? " active" : ""}`}
                    onClick={() => setAnaTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
            ))
        }
            <div style={{ marginLeft: "auto" }}>
                <Btn variant="ghost" style={{ fontSize: 12, padding: "7px 13px" }}><FiDownload size={12} /> Export CSV</Btn>
            </div>
          </div>

    {/* KPI row */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
    {
        [
        { label: "Active Jobs", val: analytics.kpis[0].val, change: analytics.kpis[0].change, up: analytics.kpis[0].up, color: C.navy },
        { label: "Applications", val: analytics.kpis[1].val, change: analytics.kpis[1].change, up: analytics.kpis[1].up, color: C.green },
        { label: "Shortlisted", val: analytics.kpis[2].val, change: analytics.kpis[2].change, up: analytics.kpis[2].up, color: C.amber },
        { label: "Offers Sent", val: analytics.kpis[3].val, change: analytics.kpis[3].change, up: analytics.kpis[3].up, color: C.indigo },
            ].map((k, i) => (
            <div key={i} style={{
                padding: "14px 16px", borderRadius: 13,
                background: k.color + "08", border: `1px solid ${k.color}18`
            }}>
                <div style={{
                    fontSize: 11, fontWeight: 800, color: k.color, textTransform: "uppercase",
                    letterSpacing: ".1em", fontFamily: C.fd, marginBottom: 6
                }}>{k.label}</div>
                <div style={{
                    fontFamily: C.fd, fontSize: 24, fontWeight: 800, color: C.s900,
                    letterSpacing: "-0.03em", marginBottom: 4
                }}>{k.val}</div>
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 800, color: k.up ? "#059669" : "#dc2626",
                    background: k.up ? "#ecfdf5" : "#fef2f2", padding: "2px 8px", borderRadius: 100
                }}>
                    {k.up ? <FiArrowUp size={9} /> : <FiArrowDown size={9} />}{k.change} this month
                </div>
            </div>
        ))
    }
          </div >

    {(anaTab === "overview" || anaTab === "traffic") && (
        <>
            {/* Line charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[
                    { label: "Job Posts by Month", data: analytics.monthlyJobs, color: C.navy },
                    { label: "Applications by Month", data: analytics.monthlyApplications, color: C.green },
                ].map((chart, i) => (
                    <div key={i} style={{ padding: "16px", borderRadius: 14, border: `1px solid ${C.s200}`, background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900 }}>{chart.label}</div>
                            <div style={{ display: "flex", gap: 6 }}>
                                {["7d", "30d", "90d"].map(r => (
                                    <button key={r} style={{
                                        padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                        background: r === "30d" ? chart.color + "14" : "transparent",
                                        color: r === "30d" ? chart.color : C.s400, border: "none", cursor: "pointer", fontFamily: C.fd
                                    }}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <LineChart data={chart.data} color={chart.color} height={130} />
                        {/* Month labels */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            {analytics.monthLabels.map((m, mi) => (
                                <span key={mi} style={{ fontSize: 9.5, color: C.s400, fontFamily: C.dm }}>{m}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bar chart - Hire rate */}
            <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${C.s200}`, background: "#fff", marginBottom: 24 }}>
                <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900, marginBottom: 12 }}>Monthly Applications</div>
                <BarChart
                    data={analytics.monthlyApplications}
                    colors={analytics.monthLabels.map((_, i) => i === analytics.monthLabels.length - 1 ? C.green : C.navy + "99")}
                    labels={analytics.monthLabels}
                    height={130} />
            </div>
        </>
    )}

{
    (anaTab === "sources") && (
        <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${C.s200}`, background: "#fff", marginBottom: 24 }}>
            <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900, marginBottom: 16 }}>Application Sources</div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                {/* Donut */}
                <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
                    <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="80" cy="80" r="62" fill="none" stroke={C.s100} strokeWidth="14" />
                        {(() => {
                            const circ = 2 * Math.PI * 62; let off = 0;
                            return analytics.sourceBreakdown.map((s, i) => {
                                const dash = (s.pct / 100) * circ;
                                const el = <circle key={i} cx="80" cy="80" r="62" fill="none"
                                    stroke={s.color} strokeWidth="14" strokeLinecap="butt"
                                    strokeDasharray={`${dash - 1.5} ${circ - dash + 1.5}`}
                                    strokeDashoffset={-off * circ / 100} />;
                                off += s.pct; return el;
                            });
                        })()}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.s900 }}>{formatCompactNumber(tracking.totalApplications ?? normalizedApplications.length ?? 0)}</div>
                        <div style={{ fontSize: 10, color: C.s400, fontWeight: 700, textTransform: "uppercase" }}>Total</div>
                    </div>
                </div>
                {/* Legend + bars */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                    {analytics.sourceBreakdown.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.s700, width: 100, flexShrink: 0 }}>{s.label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 100, background: C.s100 }}>
                                <div style={{ height: "100%", borderRadius: 100, background: s.color, width: `${s.pct}%` }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: s.color, fontFamily: C.fd, width: 36, textAlign: "right" }}>{s.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

{
    (anaTab === "pipeline") && (
        <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${C.s200}`, background: "#fff", marginBottom: 24 }}>
            <div style={{ fontFamily: C.fd, fontSize: 14, fontWeight: 800, color: C.s900, marginBottom: 16 }}>Hiring Funnel</div>
            <FunnelChart data={analytics.funnelData} />
            <div style={{
                marginTop: 20, padding: "14px 16px", borderRadius: 12,
                background: `linear-gradient(135deg,rgba(0,35,102,.04),rgba(16,185,129,.04))`,
                border: `1px solid rgba(0,35,102,.08)`, display: "flex", gap: 24, flexWrap: "wrap"
            }}>
                <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: C.s400, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>Offer Conversion</div>
                    <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.s900 }}>0.93%</div>
                </div>
                <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: C.s400, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>Avg. Time to Hire</div>
                    <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.s900 }}>18 days</div>
                </div>
                <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: C.s400, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>Offer Acceptance</div>
                    <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.green }}>84%</div>
                </div>
            </div>
        </div>
    )
}
        </Modal >

{/* ════════════════════════════════════════════════════
            MODAL: PREMIUM X
        ════════════════════════════════════════════════════ */}
    <Modal open={showPro} onClose={() => setShowPro(false)} title="Premium X — Supercharge Hiring" width={680}>
        {/* Hero */}
        <div style={{
            background: `linear-gradient(135deg,#fffbeb,#fef3c7)`,
                border: `1px solid #fde68a`, borderRadius: 14, padding: "20px 22px", marginBottom: 24,
                    display: "flex", gap: 16, alignItems: "center"
}}>
            <div style={{ width:52, height:52, borderRadius:14, background:C.amber,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <FiZap size={24} color="#fff"/>
            </div>
            <div>
              <div style={{ fontFamily:C.fd, fontSize:18, fontWeight:800, color:"#78350f", marginBottom:4 }}>Premium X Plan</div>
              <div style={{ fontSize:13.5, color:"#92400e", lineHeight:1.6 }}>
                The most powerful hiring suite for growing teams. Get unlimited access to candidate insights, AI-powered matching, and priority placement.
              </div>
            </div>
          </div>

    {/* Plans */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
    {
        [
        { name: "Starter", price: "₹4,999", period: "/mo", features: ["5 active jobs", "50 candidate views", "Basic analytics", "Email support"], color: C.sky, best: false },
        { name: "Pro", price: "₹12,999", period: "/mo", features: ["Unlimited jobs", "500 candidate views", "Full analytics", "AI match scoring", "Priority support"], color: C.navy, best: true },
        { name: "Enterprise", price: "Custom", period: "", features: ["Everything in Pro", "Dedicated ATS", "Custom integrations", "SLA guarantee", "Account manager"], color: C.purple, best: false },
            ].map((plan, i) => (
            <div key={i} style={{
                borderRadius: 14, border: `2px solid ${plan.best ? plan.color : C.s200}`,
                padding: "18px 16px", position: "relative",
                background: plan.best ? `linear-gradient(135deg,${plan.color}08,${plan.color}04)` : "#fff",
                transition: "all .2s", cursor: "pointer"
            }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = plan.color; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${plan.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = plan.best ? plan.color : C.s200; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                {plan.best && (
                    <div style={{
                        position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                        background: C.navy, color: "#fff", fontSize: 10.5, fontWeight: 800,
                        padding: "3px 12px", borderRadius: 100, fontFamily: C.fd, whiteSpace: "nowrap"
                    }}>
                        Most Popular
                    </div>
                )}
                <div style={{ fontFamily: C.fd, fontSize: 15, fontWeight: 800, color: plan.color, marginBottom: 6 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 14 }}>
                    <span style={{ fontFamily: C.fd, fontSize: 26, fontWeight: 800, color: C.s900 }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: C.s400 }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                    {plan.features.map((f, fi) => (
                        <li key={fi} style={{
                            display: "flex", alignItems: "center", gap: 7,
                            fontSize: 12.5, color: C.s700, fontWeight: 500
                        }}>
                            <FiCheckCircle size={13} color={plan.color} />{f}
                        </li>
                    ))}
                </ul>
                <Btn variant={plan.best ? "primary" : "ghost"}
                    style={{
                        width: "100%", justifyContent: "center", fontSize: 12.5,
                        ...(plan.best ? { background: plan.color } : {})
                    }}>
                    {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </Btn>
            </div>
        ))
    }
          </div >

    {/* Feature grid */}
    <div style={{ borderTop: `1px solid ${C.s100}`, paddingTop: 20 }}>
            <div style={{ fontFamily:C.fd, fontSize:14, fontWeight:800, color:C.s900, marginBottom:14 }}>What's included in all plans</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { icon:FiUserCheck, label:"AI Candidate Matching",    desc:"Smart recommendations based on JD analysis" },
                { icon:FiBarChart2, label:"Hiring Analytics",         desc:"Deep funnel and conversion insights" },
                { icon:FiMessageSquare, label:"Candidate Messaging",  desc:"Integrated inbox with templates" },
                { icon:FiShield,    label:"Data Security",            desc:"SOC 2 Type II certified infrastructure" },
                { icon:FiCpu,       label:"ATS Integration",          desc:"Works with 50+ ATS platforms" },
                { icon:FiAward,     label:"Employer Branding",        desc:"Customisable company profile pages" },
              ].map((f,i)=>(
                <div key={i} style={{ display:"flex", gap:10, padding:"12px 14px",
                  borderRadius:11, background:C.s50, border:`1px solid ${C.s200}` }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:C.navy+"10",
                    display:"flex", alignItems:"center", justifyContent:"center", color:C.navy, flexShrink:0 }}>
                    <f.icon size={14}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:800, color:C.s900, marginBottom:2 }}>{f.label}</div>
                    <div style={{ fontSize:11.5, color:C.s500 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>

{/* ════════════════════════════════════════════════════
            MODAL: POST A JOB
        ════════════════════════════════════════════════════ */}
    <Modal open={showPost} onClose={() => setShowPost(false)} title="Post a New Job" width={620}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
                { label: "Job Title", placeholder: "e.g. Senior Product Designer", type: "text" },
                { label: "Department", placeholder: "e.g. Design, Engineering, Product", type: "text" },
                { label: "Location", placeholder: "e.g. Bengaluru · Hybrid", type: "text" },
                { label: "Salary Range", placeholder: "e.g. ₹18–26 LPA", type: "text" },
            ].map((f, i) => (
                <div key={i}>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                        style={{
                            width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                            fontSize: 13.5, color: C.s900, background: "#fff", fontFamily: C.dm, transition: "border-color .16s"
                        }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.s200} />
                </div>
            ))}
            <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Job Description</label>
                <textarea placeholder="Describe the role, responsibilities, and requirements…" rows={5}
                    style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                        fontSize: 13.5, color: C.s900, background: "#fff", fontFamily: C.dm, resize: "vertical", transition: "border-color .16s"
                    }}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = C.s200} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Job Type</label>
                    <select style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                        fontSize: 13.5, color: C.s700, background: "#fff", fontFamily: C.dm, cursor: "pointer"
                    }}>
                        <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Experience Level</label>
                    <select style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                        fontSize: 13.5, color: C.s700, background: "#fff", fontFamily: C.dm, cursor: "pointer"
                    }}>
                        <option>Mid-level (3–5 yrs)</option><option>Entry level</option><option>Senior (5–8 yrs)</option><option>Lead / Principal</option>
                    </select>
                </div>
            </div>
            {/* Urgency toggle */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 11, background: "#fff8f0", border: "1px solid #fed7aa"
            }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Mark as Urgent</div>
                    <div style={{ fontSize: 12, color: "#b45309" }}>Urgent jobs get a badge and higher visibility</div>
                </div>
                <div style={{
                    width: 44, height: 24, borderRadius: 100, background: C.amber, cursor: "pointer",
                    display: "flex", alignItems: "center", paddingLeft: 22, transition: "all .2s"
                }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
                </div>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <Btn variant="ghost" onClick={() => setShowPost(false)} style={{ flex: 1, justifyContent: "center" }}>Save Draft</Btn>
                <Btn variant="primary" style={{ flex: 2, justifyContent: "center", fontSize: 14 }}><FiBriefcase size={14} /> Publish Job</Btn>
            </div>
        </div>
        </Modal >

    {/* ─── View Job Modal ─── */}
    <Modal open={showViewJob} onClose={() => setShowViewJob(false)} title="Job Details" width={550}>
        {selectedJob && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", background: C.s50, borderRadius: 12, border: `1px solid ${C.s100}` }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.navy + "10", display: "flex", alignItems: "center", justifyContent: "center", color: C.navy }}>
                        <FiBriefcase size={22} />
                    </div>
                    <div>
                        <div style={{ fontFamily: C.fd, fontSize: 18, fontWeight: 800, color: C.s900 }}>{selectedJob.title}</div>
                        <div style={{ fontSize: 13, color: C.s500 }}>{selectedJob.dept} · {selectedJob.loc}</div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                        { icon: FiClock, label: "Posted", val: selectedJob.posted },
                        { icon: FiUsers, label: "Applicants", val: selectedJob.apps },
                        { icon: FiDollarSign, label: "Salary", val: selectedJob.salary },
                        { icon: FiLayers, label: "Job Type", val: selectedJob.type },
                    ].map((item, idx) => (
                        <div key={idx} style={{ padding: "12px", borderRadius: 10, background: "#fff", border: `1px solid ${C.s200}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: C.s400 }}>
                                <item.icon size={13} />
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{item.label}</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.s800 }}>{item.val}</div>
                        </div>
                    ))}
                </div>

                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.s900, marginBottom: 8 }}>Role Description</div>
                    <div style={{ fontSize: 13.5, color: C.s600, lineHeight: 1.6, background: C.s50, padding: 14, borderRadius: 10 }}>
                        We are looking for a highly skilled {selectedJob.title} to join our {selectedJob.dept} team. 
                        The ideal candidate will have strong experience in their field and a passion for building world-class products.
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, paddingTop: 10 }}>
                    <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowViewJob(false); setShowEditJob(true); }}><FiEdit2 size={14} /> Edit Listing</Btn>
                    <Btn variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowViewJob(false)}>Close</Btn>
                </div>
            </div>
        )}
    </Modal>

    {/* ─── Edit Job Modal ─── */}
    <Modal open={showEditJob} onClose={() => setShowEditJob(false)} title="Edit Job Listing" width={620}>
        {selectedJob && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                    { label: "Job Title", val: selectedJob.title, type: "text" },
                    { label: "Department", val: selectedJob.dept, type: "text" },
                    { label: "Location", val: selectedJob.loc, type: "text" },
                    { label: "Salary Range", val: selectedJob.salary, type: "text" },
                ].map((f, i) => (
                    <div key={i}>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>{f.label}</label>
                        <input type={f.type} defaultValue={f.val}
                            style={{
                                width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                                fontSize: 13.5, color: C.s900, background: "#fff", fontFamily: C.dm, transition: "border-color .16s"
                            }}
                            onFocus={e => e.target.style.borderColor = C.navy}
                            onBlur={e => e.target.style.borderColor = C.s200} />
                    </div>
                ))}
                <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Job Description</label>
                    <textarea defaultValue={`We are looking for a highly skilled ${selectedJob.title} to join our ${selectedJob.dept} team. The ideal candidate will have strong experience in their field and a passion for building world-class products.`} rows={5}
                        style={{
                            width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                            fontSize: 13.5, color: C.s900, background: "#fff", fontFamily: C.dm, resize: "vertical", transition: "border-color .16s"
                        }}
                        onFocus={e => e.target.style.borderColor = C.navy}
                        onBlur={e => e.target.style.borderColor = C.s200} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Job Type</label>
                        <select defaultValue={selectedJob.type} style={{
                            width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                            fontSize: 13.5, color: C.s700, background: "#fff", fontFamily: C.dm, cursor: "pointer"
                        }}>
                            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.s700, marginBottom: 6 }}>Status</label>
                        <select style={{
                            width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.s200}`,
                            fontSize: 13.5, color: C.s700, background: "#fff", fontFamily: C.dm, cursor: "pointer"
                        }}>
                            <option>Active</option><option>Paused</option><option>Closed</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                    <Btn variant="ghost" onClick={() => setShowEditJob(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
                    <Btn variant="primary" style={{ flex: 2, justifyContent: "center", fontSize: 14 }} onClick={() => setShowEditJob(false)}><FiCheckCircle size={14} /> Update Job</Btn>
                </div>
            </div>
        )}
    </Modal>

      {/* ─── Notification Sidebar ─── */}
      <div className={`pd-notif-overlay ${showNotifications ? 'show' : ''}`} onClick={() => setShowNotifications(false)} />
      <div className={`pd-notif-sidebar ${showNotifications ? 'show' : ''}`}>
        <div className="pd-notif-head">
          <h3>Notifications</h3>
          <button className="pd-notif-close" onClick={() => setShowNotifications(false)}><FiX size={18} /></button>
        </div>
        <div className="pd-notif-body">
          <div className="pd-notif-date">Today</div>
          {[
            { icon: <FiAward />, color: '#7C3AED', bg: '#F5F3FF', title: <><FiTarget size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4, color: '#7C3AED' }} /> Practice 4 interview questions for your Fortified Infotech application</>, desc: 'Get instant feedback to ace your interview', time: '2h ago', cta: 'Practice Now' },
            { icon: <FiFileText />, color: '#D97706', bg: '#FFFBEB', title: 'Your resume was viewed by a recruiter', desc: 'Application History', time: '3h ago' },
            { icon: <FiUsers />, color: '#2563EB', bg: '#EFF6FF', title: 'Let AI help you ace your next job interview', desc: 'Unlock Your Interview Success!', time: '3h ago', cta: 'Practice Now' },
            { icon: <FiCheckCircle />, color: '#059669', bg: '#ECFDF5', title: 'Apply by 11:10 AM for a job posted by Infrrd', desc: 'Neo-AI Job Agent', time: '4h ago' },
            { icon: <FiX />, color: '#DC2626', bg: '#FEF2F2', title: 'Your application was not shortlisted', desc: 'Application History', time: '5h ago' },
            { icon: <FiZap />, color: '#7C3AED', bg: '#F5F3FF', title: 'AI wrote interview Q&A from your resume', desc: <><FiStar size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4, color: '#7C3AED' }} /> Personalized for you</>, time: '6h ago' },
          ].map((n, i) => (
            <div className="pd-notif-item" key={i}>
              <div className="pd-notif-icon" style={{ background: n.bg, color: n.color }}>{n.icon}</div>
              <div className="pd-notif-content">
                <div className="pd-notif-title">{n.title}</div>
                <div className="pd-notif-desc">{n.desc}</div>
                {n.cta && <button className="pd-notif-cta">{n.cta}</button>}
                <div className="pd-notif-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div >
    </>
  );
}
