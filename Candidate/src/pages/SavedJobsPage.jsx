import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBookmark, FiArrowLeft, FiTrash2, FiSearch, FiMapPin, FiBriefcase, FiClock, FiTrendingUp } from "react-icons/fi";
import { getSavedJobs, toggleSavedJob } from "../services/candidateApi";
import {
  Badge,
  EmptyState,
  PageState,
  PanelCard,
  SectionHeading,
} from "../components/Ui";

export default function SavedJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await getSavedJobs();
        if (!isMounted) return;
        const data = Array.isArray(result?.data) ? result.data : [];
        const normalized = data.map((job) => ({
          id: job._id || job.id,
          title: job.title || job.role || "Untitled Role",
          company: job.companyId?.name || job.companyName || job.company || "Company",
          location: job.location || job.companyId?.city || "India",
          salary: job.salary || formatSalary(job),
          type: job.workplaceType || "Full-time",
          match: job.matchScore || Math.round(70 + Math.random() * 25),
          tags: job.tags?.length ? job.tags : [job.department || "General"],
          posted: job.postedAt ? new Date(job.postedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recently",
          logo: (job.companyId?.name || "MJ").charAt(0).toUpperCase(),
          logoColor: "#002366",
        }));
        setJobs(normalized);
      } catch (err) {
        if (isMounted) setError(err?.message || "Failed to load saved jobs.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  const handleUnsave = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovingId(jobId);
    try {
      await toggleSavedJob(jobId, false);
      setJobs((prev) => prev.filter((j) => String(j.id) !== String(jobId)));
    } catch {
      // keep item on failure
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
  });

  const avgMatch = jobs.length ? Math.round(jobs.reduce((a, b) => a + b.match, 0) / jobs.length) : 0;

  if (loading) {
    return <PageState title="Loading saved jobs" description="Fetching your bookmarked roles." />;
  }

  if (error) {
    return (
      <PageState
        title="Unable to load saved jobs"
        description={error}
        error
        action={
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "10px 22px", borderRadius: 10, border: "none", background: "#002366", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <SectionHeading
        title="Saved Jobs"
        subtitle={`${jobs.length} role${jobs.length !== 1 ? "s" : ""} saved · Review and apply before they expire`}
        breadcrumbs={[
          { label: "Profile", onClick: () => navigate("/candidate/profile") },
          { label: "Saved Jobs" },
        ]}
        actions={
          <button
            onClick={() => navigate("/candidate/jobs")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, border: "1.5px solid #C7D7FF", background: "#EEF2FF", color: "#002366", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
          >
            <FiSearch size={14} /> Find jobs
          </button>
        }
      />

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, marginBottom: 24 }}>
        <Badge label="Saved" value={jobs.length} icon={<FiBookmark size={16} />} accent="#002366" bg="#EEF2FF" />
        <Badge label="Avg Match" value={`${avgMatch}%`} icon={<FiTrendingUp size={16} />} accent="#059669" bg="#ECFDF5" />
      </div>

      {/* Search */}
      <PanelCard style={{ marginBottom: 20, padding: "12px 16px" }}>
        <div style={{ position: "relative" }}>
          <FiSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved jobs by title or company…"
            style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none", color: "#0F172A", background: "#F8FAFC" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#002366")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
        </div>
      </PanelCard>

      {/* Job list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FiBookmark size={36} />}
          title={search ? "No results" : "No saved jobs yet"}
          description={search ? "No jobs match your search." : "Jobs you save will appear here for quick access."}
          action={
            !search
              ? { label: "Browse jobs", onClick: () => navigate("/candidate/jobs") }
              : undefined
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((job) => (
            <PanelCard
              key={job.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                cursor: "pointer",
                padding: "16px 20px",
                transition: "box-shadow 0.18s, border-color 0.18s",
              }}
              onClick={() => navigate(`/job/${job.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#C7D7FF";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,35,102,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 46, height: 46, borderRadius: 12, background: job.logoColor || "#002366",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 18, flexShrink: 0,
                }}
              >
                {job.logo}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job.title}
                  </span>
                  {job.match >= 80 && (
                    <Badge label={`${job.match}%`} size="sm" accent={job.match >= 90 ? "#059669" : "#002366"} bg={job.match >= 90 ? "#ECFDF5" : "#EEF2FF"} />
                  )}
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#475569", fontWeight: 500 }}>{job.company}</p>
                <div style={{ marginTop: 5, display: "flex", gap: 14, fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                  {job.location && <span><FiMapPin size={11} /> {job.location}</span>}
                  <span><FiBriefcase size={11} /> {job.type}</span>
                  <span><FiClock size={11} /> {job.posted}</span>
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#002366" }}>{job.salary}</span>
                <button
                  onClick={(e) => handleUnsave(e, job.id)}
                  disabled={removingId === job.id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 8, border: "1px solid #FECDD3",
                    background: "#FFF1F2", color: "#E11D48", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FECDD3")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF1F2")}
                >
                  <FiTrash2 size={12} /> {removingId === job.id ? "…" : "Remove"}
                </button>
              </div>
            </PanelCard>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSalary(job) {
  const min = job.salaryMin || 0;
  const max = job.salaryMax || 0;
  if (min && max) return `₹${(min / 100000).toFixed(0)}–${(max / 100000).toFixed(0)} LPA`;
  return "Competitive";
}
