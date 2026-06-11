import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookmark,
  FiArrowLeft,
  FiTrash2,
  FiSearch,
  FiBriefcase,
  FiMapPin,
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiX,
  FiExternalLink,
} from "react-icons/fi";
import { gsap } from "gsap";
import { useAuth } from "../../AuthContext";
import authService from "../../services/authService";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";

const MATCH_COLORS = {
  high: { bg: "#ECFDF5", color: "#065F46", ring: "#10B98130" },
  mid: { bg: "#EFF6FF", color: "#1E40AF", ring: "#3B82F630" },
  low: { bg: "#FFFBEB", color: "#92400E", ring: "#F59E0B30" },
};

function getMatchColor(score) {
  if (score >= 90) return { ...MATCH_COLORS.high, label: "Excellent" };
  if (score >= 80) return { ...MATCH_COLORS.mid, label: "Good" };
  return { ...MATCH_COLORS.low, label: "Fair" };
}

function formatSalary(job) {
  if (job.salary) return job.salary;
  const min = job.salaryMin || 0;
  const max = job.salaryMax || 0;
  if (min && max) return `₹${(min / 100000).toFixed(0)}–${(max / 100000).toFixed(0)} LPA`;
  return "Competitive";
}

export default function SavedJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [search, setSearch] = useState("");

  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const headerRef = useRef(null);

  const fetchSavedJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authService.getSavedJobs();
      // API returns { success, data: [...] }
      const data = Array.isArray(res?.data) ? res.data : [];
      const normalized = data.map((j) => ({
        id: j._id || j.id,
        _id: j._id || j.id,
        title: j.title || j.role || "Untitled Role",
        company: j.companyId?.name || j.companyName || j.company || "Company",
        location: j.location || j.companyId?.city || "India",
        salary: formatSalary(j),
        type: j.workplaceType || "Full-time",
        match: j.matchScore || Math.round(70 + Math.random() * 25),
        tags: j.tags?.length ? j.tags : [j.department || "General"],
        posted: j.postedAt ? new Date(j.postedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "",
        logo: (j.companyId?.name || "MJ").charAt(0).toUpperCase(),
        logoColor: "#002366",
      }));
      setJobs(normalized);
    } catch (err) {
      setError(err?.message || "Failed to load saved jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5 }
      );
      tl.fromTo(cardsRef.current.filter(Boolean),
        { opacity: 0, y: 28, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.2)" },
        "-=0.2"
      );
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  const handleUnsave = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovingId(jobId);

    try {
      await authService.toggleSavedJob(jobId, false);
      setJobs((prev) => prev.filter((j) => String(j.id) !== String(jobId)));
    } catch {
      // keep item on failure
    } finally {
      setRemovingId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
  });

  const avgMatch = jobs.length
    ? Math.round(jobs.reduce((a, b) => a + b.match, 0) / jobs.length)
    : 0;

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", background: "#F1F4F9", fontFamily: "'DM Sans','Inter',system-ui,sans-serif" }}>
      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 12px rgba(0,35,102,0.06)"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link to="/">
              <img src={mavenLogo} alt="MavenJobs" style={{ height: 34, display: "block" }} />
            </Link>
            <div style={{ width: 1, height: 28, background: "#E2E8F0" }} />
            <button
              onClick={() => navigate("/profile")}
              style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 10, transition: "all 0.18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#002366"; e.currentTarget.style.background = "#EEF2FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "none"; }}
            >
              <FiArrowLeft size={15} /> Back to Profile
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/jobs" style={{ fontSize: 13.5, fontWeight: 700, color: "#002366", background: "#EEF2FF", border: "1.5px solid #C7D7FF", padding: "9px 20px", borderRadius: 12, textDecoration: "none", transition: "all 0.18s", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FiSearch size={14} /> Find more jobs
            </Link>
            {user && (
              <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="Profile" onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: "50%", border: "2.5px solid #E2E8F0", objectFit: "cover", cursor: "pointer", transition: "border-color 0.18s" }} onMouseEnter={(e) => e.currentTarget.style.borderColor = "#002366"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "#E2E8F0"} />
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px 80px" }}>
        {/* Hero */}
        <div ref={headerRef} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,#001a50,#002fa0)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,35,102,0.24)" }}>
                <FiBookmark size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Saved Jobs</h1>
                <p style={{ margin: "6px 0 0", fontSize: 14.5, color: "#64748B", fontWeight: 500 }}>
                  {jobs.length} role{jobs.length !== 1 ? "s" : ""} saved · Review and apply before they expire
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Saved", value: jobs.length, bg: "#EEF2FF", color: "#002366", icon: <FiBookmark size={16} /> },
                { label: "Avg Match", value: `${avgMatch}%`, bg: "#ECFDF5", color: "#059669", icon: <FiTrendingUp size={16} /> },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: s.bg, color: s.color, padding: "10px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
                  {s.icon}
                  <div>
                    <div style={{ fontSize: 18, lineHeight: 1.1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search + filter bar */}
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
              <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved jobs..."
                style={{ width: "100%", padding: "11px 14px 11px 40px", border: "1px solid #E2E8F0", borderRadius: 12, background: "#fff", fontSize: 14, outline: "none", color: "#0F172A", transition: "border-color 0.18s" }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#002366"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#002366", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Loading your saved jobs…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <FiX style={{ color: "#E11D48", flexShrink: 0 }} size={20} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#9F1239" }}>Unable to load saved jobs</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9F1239", opacity: 0.8 }}>{error}</p>
            </div>
            <button onClick={fetchSavedJobs} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #FECDD3", background: "#fff", color: "#E11D48", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Job cards */}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredJobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
                <FiBookmark style={{ margin: "0 auto 16px", display: "block", opacity: 0.35 }} size={40} />
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#334155" }}>No saved jobs yet</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94A3B8" }}>
                  {search ? "No results match your search." : "Start saving jobs you like and they'll appear here."}
                </p>
              </div>
            )}

            {filteredJobs.map((job, idx) => {
              const mc = getMatchColor(job.match);
              return (
                <div
                  key={job.id || job._id}
                  ref={(el) => (cardsRef.current[idx] = el)}
                  style={{
                    background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0",
                    padding: "18px 22px", display: "flex", alignItems: "center", gap: 18,
                    cursor: "pointer", transition: "box-shadow 0.18s, border-color 0.18s, transform 0.18s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D7FF"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,35,102,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  onClick={() => navigate(`/job/${job.id || job._id}`)}
                >
                  {/* Logo */}
                  <div style={{
                    width: 50, height: 50, borderRadius: 14, background: job.logoColor || "#002366",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 20, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
                  }}>
                    {job.logo}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</h3>
                      <span style={{ padding: "2px 10px", borderRadius: 999, background: mc.bg, color: mc.color, fontSize: 11, fontWeight: 700 }}>{job.match}% match</span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "#475569", fontWeight: 500 }}>{job.company}</p>
                    <div style={{ marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                      {job.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FiMapPin size={12} />{job.location}</span>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FiBriefcase size={12} />{job.type}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FiClock size={12} />{job.posted || "Recently"}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {job.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} style={{ padding: "2px 10px", borderRadius: 999, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 11, color: "#475569", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#002366", whiteSpace: "nowrap" }}>{job.salary}</span>
                    <button
                      onClick={(e) => handleUnsave(e, job.id || job._id)}
                      disabled={removingId === (job.id || job._id)}
                      title="Remove from saved"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 10,
                        border: "1px solid #FECDD3", background: "#FFF1F2",
                        color: "#E11D48", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FECDD3"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFF1F2"; }}
                    >
                      {removingId === (job.id || job._id) ? "Removing…" : <><FiTrash2 size={13} /> Remove</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
