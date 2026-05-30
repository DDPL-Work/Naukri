import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FiCopy, FiHeart, FiSmile, FiAward, FiStar, FiShare2 } from "react-icons/fi";

const C = {
  navy: "#002366",
  green: "#10b981",
  indigo: "#6366f1",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  white: "#fff",
  s50: "#f8fafc",
  s100: "#f1f5f9",
  s200: "#e2e8f0",
  s400: "#94a3b8",
  s500: "#64748b",
  s600: "#475569",
  s700: "#334155",
  s800: "#1e293b",
  s900: "#0f172a",
  fd: "'Bricolage Grotesque',sans-serif",
  dm: "'DM Sans',sans-serif",
};

const reactionPalette = [
  { key: "helpful", icon: FiSmile, color: C.amber, label: "Helpful" },
  { key: "love", icon: FiHeart, color: C.red, label: "Love" },
  { key: "great", icon: FiAward, color: C.indigo, label: "Great" },
  { key: "insight", icon: FiStar, color: C.purple, label: "Insight" },
];

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReviewSharePage() {
  const { reviewId } = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get("share") || "shared";
  const [review, setReview] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`maven-review-share:${reviewId}:${shareToken}`);
      if (raw) {
        setReview(JSON.parse(raw));
        return;
      }
      const fallback = localStorage.getItem(`maven-review-share:${reviewId}`);
      if (fallback) {
        setReview(JSON.parse(fallback));
      }
    } catch (error) {
      console.error("Unable to load shared review", error);
    }
  }, [reviewId, shareToken]);

  const reviewerName = useMemo(() => review?.candidateName || review?.name || review?.userName || "Verified Candidate", [review]);
  const reviewerRole = useMemo(() => review?.candidateTitle || review?.title || review?.role || "Candidate", [review]);
  const helpfulCount = useMemo(() => Number(review?.helpfulCount || review?.likes || 0), [review]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this review link", window.location.href);
    }
  };

  if (!review) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #eff6ff, #f8fafc)", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "white", borderRadius: 24, border: `1px solid ${C.s200}`, boxShadow: "0 28px 80px rgba(0,35,102,0.12)", padding: 28 }}>
          <div style={{ fontFamily: C.fd, fontSize: 22, fontWeight: 800, color: C.s900, marginBottom: 8 }}>Shared review unavailable</div>
          <div style={{ color: C.s600, lineHeight: 1.6, fontSize: 14 }}>This link may have expired or the review snapshot was not found. Please request a fresh share link from the employer dashboard.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #ffffff 100%)", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.navy }}>MavenJobs • Shared Review</div>
            <h1 style={{ fontFamily: C.fd, fontSize: 30, lineHeight: 1.15, color: C.s900, marginTop: 8, marginBottom: 6 }}>Candidate review snapshot</h1>
            <p style={{ color: C.s600, fontSize: 14, maxWidth: 700, lineHeight: 1.6 }}>This page shows the exact review, the candidate who shared it, and engagement details for a professional, production-ready handoff.</p>
          </div>
          <button onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 14px", border: `1px solid ${C.s200}`, background: C.white, color: C.navy, cursor: "pointer", fontWeight: 700, boxShadow: "0 10px 24px rgba(0,35,102,0.08)" }}>
            <FiCopy size={14} /> {copied ? "Copied" : "Copy share link"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
          <article style={{ background: C.white, border: `1px solid ${C.s200}`, borderRadius: 24, boxShadow: "0 20px 48px rgba(15,23,42,0.08)", padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #002366, #1e3a8a)", color: C.white, fontFamily: C.fd, fontWeight: 800, fontSize: 15 }}>{(reviewerName || "C").slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontFamily: C.fd, fontSize: 18, fontWeight: 800, color: C.s900 }}>{reviewerName}</div>
                <div style={{ fontSize: 13, color: C.s500 }}>{reviewerRole}</div>
              </div>
              <div style={{ marginLeft: "auto", borderRadius: 999, padding: "7px 10px", background: "#fff7ed", border: "1px solid #fed7aa", color: C.amber, fontWeight: 800, fontSize: 12 }}>{(review?.rating || 0)}/5 rating</div>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 18, background: C.s50, border: `1px solid ${C.s200}`, color: C.s700, lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              “{review?.review || review?.comment || "This candidate left a thoughtful review for the employer."}”
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", color: C.s500, fontSize: 12.5 }}>
              <span style={{ padding: "6px 10px", borderRadius: 999, background: C.s50, border: `1px solid ${C.s200}` }}>Shared on {formatDate(review?.sharedAt || review?.createdAt || new Date())}</span>
              <span style={{ padding: "6px 10px", borderRadius: 999, background: C.s50, border: `1px solid ${C.s200}` }}>{review?.companyName || "Company"}</span>
              <span style={{ padding: "6px 10px", borderRadius: 999, background: C.s50, border: `1px solid ${C.s200}` }}>{helpfulCount} reactions</span>
            </div>
          </article>

          <aside style={{ background: C.white, border: `1px solid ${C.s200}`, borderRadius: 24, boxShadow: "0 20px 48px rgba(15,23,42,0.08)", padding: 22, display: "grid", gap: 14, alignContent: "start" }}>
            <div style={{ fontFamily: C.fd, fontSize: 18, fontWeight: 800, color: C.s900 }}>Engagement & visibility</div>
            <div style={{ display: "grid", gap: 10 }}>
              {reactionPalette.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.s200}`, borderRadius: 16, padding: "10px 12px", background: C.s50 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.s700, fontSize: 13, fontWeight: 700 }}><Icon size={14} color={item.color} /> {item.label}</span>
                    <span style={{ color: C.s700, fontWeight: 800, fontSize: 13 }}>{review?.[`${item.key}Count`] || (item.key === "helpful" ? helpfulCount : 0)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderRadius: 18, background: "linear-gradient(135deg, #eef2ff, #f8fafc)", border: `1px solid ${C.s200}`, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.navy, fontWeight: 800, fontSize: 13 }}><FiShare2 size={14} /> Share-ready URL</div>
              <div style={{ marginTop: 8, color: C.s700, fontSize: 12.5, lineHeight: 1.6, wordBreak: "break-all" }}>{window.location.href}</div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
