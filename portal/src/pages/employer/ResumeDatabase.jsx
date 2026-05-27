import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FiSearch, FiZap, FiMail, FiRefreshCw, FiBarChart2,
    FiShield, FiMapPin, FiBriefcase, FiCheckCircle,
    FiClock, FiUsers, FiTrendingUp, FiArrowRight, FiStar
} from "react-icons/fi";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";
import authService from "../../services/authService";
import CandidateResumeModal from "../../components/CandidateResumeModal";
import UnlockDatabaseModal from "../../components/UnlockDatabaseModal";

const FILTERS = ["Location", "Experience", "Skills", "Salary", "Availability", "Education"];
const SKILLS = ["React.js", "Node.js", "Python", "Data Science", "UI/UX", "DevOps", "Java", "SQL", "Machine Learning", "Figma", "AWS", "Product Management", "TypeScript", "Flutter", "Go", "Kotlin"];
const TALENT = [
    { name: "Kavya Sharma", role: "Senior Product Designer", loc: "Bengaluru", exp: "7 yrs", avail: "Immediately", skills: ["Figma", "Prototyping", "UX Research"], match: 97, initials: "KS", color: "#002366" },
    { name: "Arjun Mehta", role: "Full Stack Engineer", loc: "Mumbai", exp: "5 yrs", avail: "2 weeks", skills: ["React", "Node.js", "AWS"], match: 93, initials: "AM", color: "#0D9488" },
    { name: "Sneha Pillai", role: "Data Scientist", loc: "Hyderabad", exp: "4 yrs", avail: "1 month", skills: ["Python", "ML", "SQL"], match: 89, initials: "SP", color: "#7C3AED" },
    { name: "Rohit Nair", role: "DevOps Engineer", loc: "Pune", exp: "6 yrs", avail: "Immediately", skills: ["AWS", "Docker", "K8s"], match: 85, initials: "RN", color: "#DC2626" },
    { name: "Priya Anand", role: "Product Manager", loc: "Delhi NCR", exp: "8 yrs", avail: "3 weeks", skills: ["Agile", "Roadmapping", "Analytics"], match: 91, initials: "PA", color: "#B45309" },
    { name: "Kiran Rao", role: "iOS Developer", loc: "Chennai", exp: "3 yrs", avail: "Immediately", skills: ["Swift", "Xcode", "CoreData"], match: 78, initials: "KR", color: "#065F46" },
];
const FEATURES = [
    { icon: <FiZap size={22} />, title: "AI-Powered Matching", desc: "Proprietary AI scores each profile against your job requirements, surfacing the top 5% instantly.", color: "#002366", bg: "#EEF2FF" },
    { icon: <FiSearch size={22} />, title: "250+ Search Filters", desc: "Filter by skills, location, salary, notice period, education, and 240+ more parameters.", color: "#10b981", bg: "#ecfdf5" },
    { icon: <FiMail size={22} />, title: "Direct Outreach", desc: "Message candidates directly without revealing your company — maintain confidentiality throughout hiring.", color: "#6366f1", bg: "#f5f3ff" },
    { icon: <FiRefreshCw size={22} />, title: "Real-time Updates", desc: "Profiles updated daily. You see candidates actively looking right now, not 6 months ago.", color: "#f59e0b", bg: "#fffbeb" },
    { icon: <FiBarChart2 size={22} />, title: "Talent Analytics", desc: "Benchmark compensation, understand skill availability in your city, and plan hiring quarters ahead.", color: "#0ea5e9", bg: "#f0f9ff" },
    { icon: <FiShield size={22} />, title: "Verified Profiles", desc: "Every candidate is email + phone verified. Employment history cross-checked via our partner network.", color: "#10b981", bg: "#ecfdf5" },
];
const STATS = [
    { val: "10Cr+", label: "Verified Profiles", icon: <FiUsers size={20} /> },
    { val: "250+", label: "Search Filters", icon: <FiSearch size={20} /> },
    { val: "72h", label: "Avg. Time to Shortlist", icon: <FiClock size={20} /> },
    { val: "3.2M", label: "Profiles Updated Weekly", icon: <FiRefreshCw size={20} /> },
];
const BIZ_TYPES = [
    { title: "Large Enterprises", sub: "End-to-end talent strategy", feats: ["Fill any role — bulk to leadership", "AI-powered candidate scoring", "Custom employer brand campaigns", "Dedicated account management"], color: "#002366", bg: "#EEF2FF" },
    { title: "SMBs & Startups", sub: "Lean hiring, big results", feats: ["Find local candidates across India", "Hire for relevant experience fast", "Affordable, scalable plans", "Self-serve dashboard"], color: "#10b981", bg: "#ecfdf5", popular: true },
    { title: "Consultants & Agencies", sub: "Scale your placements", feats: ["Speed up hiring with faster turnaround", "Multi-client management dashboard", "Instantly connect with candidates", "Performance analytics"], color: "#6366f1", bg: "#f5f3ff" },
];

export default function ResumeDatabase() {
    const [activeSkill, setActiveSkill] = useState(null);
    const [searchVal, setSearchVal] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isUnlockOpen, setIsUnlockOpen] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    const filteredTalent = TALENT.filter(t => {
        const query = searchVal.trim().toLowerCase();
        const matchesSearch = !query || [t.name, t.role, t.loc, t.exp, t.avail].some(val => val.toLowerCase().includes(query)) || t.skills.some(sk => sk.toLowerCase().includes(query));
        const matchesSkill = !activeSkill || t.skills.includes(activeSkill);
        return matchesSearch && matchesSkill;
    });

    useEffect(() => {
        const load = async () => {
            if (typeof window.gsap !== "undefined") return;
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

            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
                const { gsap } = window;
                const { ScrollTrigger } = window || {};
                if (!gsap) return;
                try { gsap.registerPlugin && gsap.registerPlugin(ScrollTrigger); } catch { }

                gsap.timeline({ defaults: { ease: "power3.out" } })
                    .from(".rd-tag", { opacity: 0, y: 20, duration: 0.6 })
                    .from(".rd-word", { opacity: 0, y: 55, stagger: 0.07, duration: 0.85 }, "-=0.2")
                    .from(".rd-sub", { opacity: 0, y: 20, duration: 0.6 }, "-=0.3")
                    .from(".rd-sbox", { opacity: 0, y: 28, scale: 0.97, duration: 0.65 }, "-=0.25")
                    .from(".rd-fpill", { opacity: 0, y: 16, stagger: 0.06, duration: 0.45 }, "-=0.2")
                    .from(".rd-skill", { opacity: 0, scale: 0.88, stagger: 0.03, duration: 0.4 }, "-=0.1");

                gsap.from(".rd-stat", { scrollTrigger: { trigger: ".rd-stats", start: "top 80%" }, opacity: 0, y: 36, stagger: 0.12, duration: 0.7 });
                gsap.from(".rd-fc", { scrollTrigger: { trigger: ".rd-feats", start: "top 78%" }, opacity: 0, y: 44, stagger: 0.1, duration: 0.7, ease: "back.out(1.2)" });
                gsap.from(".rd-tc", { scrollTrigger: { trigger: ".rd-talent", start: "top 78%" }, opacity: 0, x: -28, stagger: 0.09, duration: 0.6 });
                gsap.from(".rd-biz", { scrollTrigger: { trigger: ".rd-biz-grid", start: "top 78%" }, opacity: 0, y: 40, stagger: 0.12, duration: 0.7 });
            } catch (err) {
                // ignore
            }
        };
        load();
    }, []);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--navy:#002366;--green:#10b981;--fd:'Bricolage Grotesque',sans-serif}
        body{font-family:'DM Sans',system-ui,sans-serif}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes ping{75%,100%{transform:scale(2);opacity:0}}
        .rd-skill-pill{padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .18s;border:1px solid transparent}
        .rd-tc:hover{transform:translateY(-4px)!important;box-shadow:0 16px 40px rgba(0,35,102,.12)!important;border-color:rgba(0,35,102,.2)!important}
        .rd-fc:hover{transform:translateY(-4px)!important;box-shadow:0 14px 36px rgba(0,35,102,.08)!important;border-color:rgba(0,35,102,.15)!important}
        .rd-biz:hover{transform:translateY(-5px)!important;box-shadow:0 18px 44px rgba(0,35,102,.1)!important}
        .cta-green{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;background:#10b981;color:#fff;font-weight:800;font-size:14px;border-radius:100px;border:none;cursor:pointer;font-family:var(--fd);box-shadow:0 8px 24px rgba(16,185,129,.35);transition:all .25s}
        .cta-green:hover{background:#0da371;transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,185,129,.45)}
        .cta-navy{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background:transparent;color:#002366;font-weight:800;font-size:14px;border-radius:100px;border:2px solid #002366;cursor:pointer;font-family:var(--fd);transition:all .25s}
        .cta-navy:hover{background:#002366;color:#fff}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}
      `}</style>

            <div style={{ background: "#f8fafc", color: "#1e293b", overflowX: "hidden" }}>

                {/* ── NAV ── */}
                <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: 66, background: scrolled ? "rgba(255,255,255,.97)" : "transparent", borderBottom: scrolled ? "1px solid #e2e8f0" : "1px solid transparent", backdropFilter: scrolled ? "blur(20px)" : "none", display: "flex", alignItems: "center", padding: "0 44px", transition: "all .35s" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Link to="/"><img src={mavenLogo} alt="MavenJobs" style={{ height: 28, filter: scrolled ? "none" : "invert(1) brightness(2)" }} /></Link>
                        <div style={{ display: "flex", gap: 28 }}>
                            {["Our Offerings", "Solutions", "How It Works", "Resources"].map(l => (
                                <a key={l} href="#" style={{ fontSize: 13.5, fontWeight: 700, color: scrolled ? "#64748b" : "rgba(255,255,255,.75)", textDecoration: "none", fontFamily: "var(--fd)", transition: "color .2s" }}
                                    onMouseEnter={e => e.target.style.color = scrolled ? "#002366" : "#fff"}
                                    onMouseLeave={e => e.target.style.color = scrolled ? "#64748b" : "rgba(255,255,255,.75)"}>{l}</a>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${scrolled ? "#002366" : "rgba(255,255,255,.3)"}`, background: "transparent", color: scrolled ? "#002366" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--fd)", transition: "all .2s" }}>Buy Online</button>
                            <button style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#002366", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--fd)" }}>Post a Job</button>
                        </div>
                    </div>
                </nav>

                {/* ── HERO ── */}
                <section style={{ background: "linear-gradient(135deg,#050e24 0%,#002366 58%,#1a0a4a 100%)", minHeight: "100vh", display: "flex", alignItems: "center", padding: "0 44px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, opacity: .05, backgroundImage: "radial-gradient(#fff 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
                    <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: "-18%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,.16) 0%,transparent 65%)", pointerEvents: "none" }} />

                    <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "110px 0 80px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 2 }}>
                        <div className="rd-tag" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.28)", color: "#6ee7b7", fontSize: 10.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", padding: "6px 16px", borderRadius: 100, marginBottom: 26, fontFamily: "var(--fd)", backdropFilter: "blur(8px)" }}>
                            <div style={{ position: "relative" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /><div style={{ position: "absolute", inset: -1, borderRadius: "50%", background: "#10b981", animation: "ping 1.5s infinite" }} /></div>
                            India's Largest Verified Resume Database
                        </div>

                        <h1 style={{ fontFamily: "var(--fd)", fontSize: "clamp(40px,5.5vw,72px)", fontWeight: 800, color: "#fff", lineHeight: 1.04, letterSpacing: "-0.04em", marginBottom: 22, maxWidth: 860 }}>
                            {["Find", "the", "right", "talent,"].map(w => <span key={w} className="rd-word" style={{ display: "inline-block", marginRight: "0.18em" }}>{w}</span>)}
                            <br />
                            <span className="rd-word" style={{ display: "inline-block", color: "#10b981", marginRight: "0.18em" }}>before</span>
                            <span className="rd-word" style={{ display: "inline-block", marginRight: "0.18em" }}>they</span>
                            <span className="rd-word" style={{ display: "inline-block" }}>apply.</span>
                        </h1>

                        <p className="rd-sub" style={{ fontSize: 17, color: "rgba(255,255,255,.55)", lineHeight: 1.78, marginBottom: 44, maxWidth: 560 }}>
                            Access 10 crore+ verified, actively-looking professionals across every role, city, and skill set in India.
                        </p>

                        {/* Search box */}
                        <div className="rd-sbox" style={{ background: "rgba(255,255,255,.07)", backdropFilter: "blur(16px)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "10px 10px 10px 22px", display: "flex", alignItems: "center", gap: 12, maxWidth: 680, width: "100%", marginBottom: 22 }}>
                            <FiSearch color="rgba(255,255,255,.4)" size={18} />
                            <input style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15.5, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }} placeholder="Search by role, skill, or company…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                            <button style={{ padding: "12px 26px", borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "var(--fd)", boxShadow: "0 6px 18px rgba(16,185,129,.35)", whiteSpace: "nowrap" }}>Search Talent</button>
                        </div>

                        {/* Filter pills */}
                        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", marginBottom: 30 }}>
                            {FILTERS.map(f => (
                                <div key={f} className="rd-fpill" style={{ padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>{f} ▾</div>
                            ))}
                        </div>

                        {/* Skills cloud */}
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 760 }}>
                            {SKILLS.map(s => (
                                <span key={s} className="rd-skill rd-skill-pill"
                                    style={{ background: activeSkill === s ? "#10b981" : "rgba(255,255,255,.07)", color: activeSkill === s ? "#fff" : "rgba(255,255,255,.6)", borderColor: activeSkill === s ? "#10b981" : "rgba(255,255,255,.12)" }}
                                    onMouseEnter={() => setActiveSkill(s)} onMouseLeave={() => setActiveSkill(null)}>{s}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── STATS ── */}
                <div className="rd-stats" style={{ background: "linear-gradient(135deg,#050e24,#002366)", padding: "60px 44px" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 28 }}>
                        {STATS.map((s, i) => (
                            <div key={i} className="rd-stat" style={{ textAlign: "center", padding: "24px 20px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", margin: "0 auto 14px" }}>{s.icon}</div>
                                <div style={{ fontFamily: "var(--fd)", fontSize: "clamp(36px,4vw,52px)", fontWeight: 800, color: "#10b981", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>{s.val}</div>
                                <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── FEATURES ── */}
                <section className="rd-feats" style={{ background: "#fff", padding: "96px 44px" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                        <div style={{ textAlign: "center", marginBottom: 56 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#10b981", marginBottom: 12, fontFamily: "var(--fd)" }}>✦ What You Get</div>
                            <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 12 }}>Everything you need to find<br />and win top talent</h2>
                            <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#002366,#10b981)", borderRadius: 3, margin: "0 auto 16px" }} />
                            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>Tools built for speed, precision, and confidentiality — because great candidates don't wait.</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
                            {FEATURES.map((f, i) => (
                                <div key={i} className="rd-fc" style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 22, padding: "32px 28px", transition: "all .25s" }}>
                                    <div style={{ width: 50, height: 50, borderRadius: 14, background: f.bg, border: `1px solid ${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, marginBottom: 20 }}>{f.icon}</div>
                                    <h3 style={{ fontFamily: "var(--fd)", fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{f.title}</h3>
                                    <p style={{ fontSize: 14.5, color: "#64748b", lineHeight: 1.72 }}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── LIVE DATABASE ── */}
                <section className="rd-talent" style={{ background: "linear-gradient(135deg,#050e24,#001a52)", padding: "96px 44px" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                        <div style={{ marginBottom: 48 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#10b981", marginBottom: 12, fontFamily: "var(--fd)", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.22)", padding: "5px 14px", borderRadius: 100 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} /> Live Database Preview
                            </div>
                            <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 12 }}>Profiles actively<br />searching right now</h2>
                            <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#10b981,#6ee7b7)", borderRadius: 3, marginBottom: 14 }} />
                            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", maxWidth: 520, lineHeight: 1.75 }}>A live snapshot of talent available today. Unlock full access to contact details and connect directly.</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 40 }}>
                            {filteredTalent.slice(0, 6).map((t, i) => (
                                <div key={t.id} className="rd-tc" style={{ background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "24px 22px", cursor: "pointer", transition: "all .25s" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 14, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{t.initials}</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", marginBottom: 2 }}>{t.name}</div>
                                            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>{t.role}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                                        {[[<FiMapPin size={12} />, t.loc], [<FiBriefcase size={12} />, t.exp], [<FiCheckCircle size={12} />, t.avail]].map(([ic, txt], j) => (
                                            <span key={j} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,.45)", fontWeight: 500 }}>{ic}{txt}</span>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                        {t.skills.map((sk) => <span key={sk} style={{ fontSize: 11.5, fontWeight: 700, background: "rgba(16,185,129,.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,.2)", borderRadius: 6, padding: "3px 9px" }}>{sk}</span>)}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: "#10b981" }}><FiZap size={12} fill="#10b981" />{t.match}% match</span>
                                        <button style={{ fontSize: 12.5, fontWeight: 700, background: "rgba(0,35,102,.5)", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontFamily: "var(--fd)", transition: "all .2s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "#002366"; e.currentTarget.style.borderColor = "#002366" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,35,102,.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)" }}
                                            onClick={() => setSelectedCandidate(t)}>
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <button style={{ padding: "14px 34px", borderRadius: 100, border: "1.5px solid rgba(16,185,129,.4)", background: "transparent", color: "#10b981", fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "var(--fd)", transition: "all .2s" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,.1)" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                                onClick={() => setIsUnlockOpen(true)}>
                                Unlock Full Database Access <FiArrowRight size={15} style={{ display: "inline", verticalAlign: "middle", marginLeft: 6 }} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── BUSINESS TYPES ── */}
                <section style={{ background: "#fff", padding: "96px 44px" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                        <div style={{ textAlign: "center", marginBottom: 56 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#10b981", marginBottom: 12, fontFamily: "var(--fd)" }}>✦ Business Focus</div>
                            <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 12 }}>Built for every kind of business</h2>
                            <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#002366,#10b981)", borderRadius: 3, margin: "0 auto 16px" }} />
                            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>Scale your hiring with the right tools for your unique needs.</p>
                        </div>
                        <div className="rd-biz-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
                            {BIZ_TYPES.map((b, i) => (
                                <div key={i} className="rd-biz" style={{ position: "relative", background: b.popular ? "linear-gradient(135deg,#002366,#003da8)" : "#f8fafc", border: b.popular ? "none" : "1.5px solid #e2e8f0", borderRadius: 24, padding: "36px 30px", transition: "all .28s", overflow: "hidden" }}>
                                    {b.popular && <div style={{ position: "absolute", top: 16, right: 16, background: "#10b981", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "var(--fd)" }}>Most Popular</div>}
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${b.color},${b.popular ? "#6ee7b7" : "#10b981"})` }} />
                                    <div style={{ width: 48, height: 48, borderRadius: 14, background: b.popular ? "rgba(255,255,255,.15)" : b.bg, display: "flex", alignItems: "center", justifyContent: "center", color: b.popular ? "#fff" : b.color, marginBottom: 20, fontSize: 20 }}>
                                        {i === 0 ? "🏢" : i === 1 ? "⚡" : "💬"}
                                    </div>
                                    <h3 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, color: b.popular ? "#fff" : "#0f172a", marginBottom: 5 }}>{b.title}</h3>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: b.popular ? "rgba(255,255,255,.55)" : b.color, marginBottom: 20, textTransform: "uppercase", letterSpacing: ".07em" }}>{b.sub}</div>
                                    <div style={{ height: 1, background: b.popular ? "rgba(255,255,255,.1)" : "#e2e8f0", marginBottom: 20 }} />
                                    {b.feats.map((f, j) => (
                                        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, fontSize: 13.5, color: b.popular ? "rgba(255,255,255,.78)" : "#475569", fontWeight: 500 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: 6, background: b.popular ? "rgba(16,185,129,.2)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                                <FiCheckCircle size={11} color="#10b981" />
                                            </div>
                                            {f}
                                        </div>
                                    ))}
                                    <button style={{ marginTop: 20, width: "100%", padding: "12px", background: b.popular ? "#fff" : "transparent", color: b.popular ? "#002366" : b.color, border: b.popular ? "none" : `2px solid ${b.color}`, borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: "var(--fd)", transition: "all .2s" }}
                                        onMouseEnter={e => { if (!b.popular) { e.currentTarget.style.background = b.color; e.currentTarget.style.color = "#fff" } }}
                                        onMouseLeave={e => { if (!b.popular) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = b.color } }}
                                        onClick={() => setIsUnlockOpen(true)}>
                                        Get Started
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section style={{ background: "linear-gradient(135deg,#f0f4fb,#e8f0fe)", padding: "48px 44px 88px" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                        <div style={{ background: "linear-gradient(135deg,#050e24,#002366)", borderRadius: 28, padding: "72px 64px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
                            <div style={{ position: "absolute", inset: 0, opacity: .05, backgroundImage: "radial-gradient(#fff 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
                            <div style={{ position: "absolute", top: "50%", left: "10%", transform: "translateY(-50%)", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
                            <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
                                <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 14, lineHeight: 1.1 }}>
                                    Stop waiting for<br /><span style={{ color: "#10b981" }}>candidates to find you.</span>
                                </h2>
                                <p style={{ fontSize: 16, color: "rgba(255,255,255,.55)", lineHeight: 1.72 }}>Access India's freshest talent pool. Start searching with a free trial — no credit card needed.</p>
                            </div>
                            <button style={{ position: "relative", zIndex: 1, padding: "16px 38px", borderRadius: 100, border: "none", background: "#10b981", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "var(--fd)", boxShadow: "0 8px 28px rgba(16,185,129,.35)", transition: "all .25s", flexShrink: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#0da371"; e.currentTarget.style.transform = "translateY(-2px)" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.transform = "" }}
                                onClick={() => setIsUnlockOpen(true)}>
                                Start Free Access Now <FiArrowRight size={15} style={{ display: "inline", verticalAlign: "middle", marginLeft: 6 }} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer style={{ background: "#050e24", borderTop: "1px solid rgba(255,255,255,.05)", padding: "28px 44px" }}>
                    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                        <img src={mavenLogo} alt="MavenJobs" style={{ height: 24, filter: "invert(1) brightness(2)", opacity: .6 }} />
                        <div style={{ display: "flex", gap: 24 }}>
                            {["Privacy", "Terms", "Support", "Sitemap"].map(l => <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.35)", textDecoration: "none", fontWeight: 600, transition: "color .2s" }} onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.35)"}>{l}</a>)}
                        </div>
                        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.25)" }}>© 2026 MavenJobs Private Limited. All rights reserved.</p>
                    </div>
                </footer>
            </div>
            <CandidateResumeModal 
                isOpen={!!selectedCandidate} 
                onClose={() => setSelectedCandidate(null)} 
                candidate={selectedCandidate} 
            />
            <UnlockDatabaseModal
                isOpen={isUnlockOpen}
                onClose={() => setIsUnlockOpen(false)}
            />
        </>
    );
}